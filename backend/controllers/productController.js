const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const { createdChanges, logActivity, toChanges } = require("../utils/auditLogger");

const productFields = ["name", "modelNumber", "brand", "vendor", "purchasePrice", "sellingPrice", "stock", "warehouses", "minStockAlert", "gstRate", "description"];

function normalizeWarehouses(warehouses, fallbackStock) {
  const rows = Array.isArray(warehouses) ? warehouses : [];
  const merged = new Map();

  rows.forEach((row) => {
    const name = String(row.warehouse || row.name || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    const current = merged.get(key) || { warehouse: name, stock: 0 };
    current.stock += Number.isFinite(+row.stock) ? +row.stock : 0;
    merged.set(key, current);
  });

  const clean = Array.from(merged.values());
  if (clean.length === 0 && fallbackStock !== undefined && Number.isFinite(+fallbackStock) && +fallbackStock !== 0) {
    clean.push({ warehouse: "Main Warehouse", stock: +fallbackStock });
  }

  return clean;
}

function withWarehouseTotals(body) {
  const payload = { ...body };
  if (payload.warehouses !== undefined || payload.stock !== undefined) {
    payload.warehouses = normalizeWarehouses(payload.warehouses, payload.stock);
    payload.stock = payload.warehouses.reduce((sum, row) => sum + (+row.stock || 0), 0);
  }
  return payload;
}

exports.getProducts = async (req, res) => {
  try {
    const { vendor, search, lowStock } = req.query;
    const filter = {};
    if (vendor)   filter.vendor = vendor;
    if (search)   filter.$or = [
      { name:        { $regex: search, $options: "i" } },
      { modelNumber: { $regex: search, $options: "i" } },
      { brand:       { $regex: search, $options: "i" } },
    ];
    if (lowStock === "true") filter.$expr = { $lte: ["$stock", "$minStockAlert"] };

    const products = await Product.find(filter)
      .populate("vendor", "name company")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const productIds = products.map((p) => p._id);
    const latestCosts = await Purchase.aggregate([
      { $match: { "items.product": { $in: productIds } } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds }, "items.rate": { $gt: 0 } } },
      { $sort: { date: -1, createdAt: -1 } },
      { $group: { _id: "$items.product", rate: { $first: "$items.rate" } } },
    ]);
    const latestCostByProduct = new Map(latestCosts.map((row) => [String(row._id), row.rate]));
    const withStockValue = products.map((product) => {
      const purchasePrice = +product.purchasePrice || 0;
      const latestPurchaseRate = latestCostByProduct.get(String(product._id)) || 0;
      const valuationPrice = purchasePrice || latestPurchaseRate || (+product.sellingPrice || 0);
      return {
        ...product,
        effectivePurchasePrice: purchasePrice || latestPurchaseRate,
        valuationPrice,
        stockValue: Math.max(0, +product.stock || 0) * valuationPrice,
      };
    });
    res.json({ success: true, data: withStockValue });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("vendor", "name company city phone");
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createProduct = async (req, res) => {
  try {
    // Strip out category/hsnCode if accidentally sent
    const { category, hsnCode, ...rest } = req.body;
    const product = new Product(withWarehouseTotals(rest));
    await product.save();
    await product.populate("vendor", "name company");
    await logActivity(req, {
      action: "created",
      entityType: "Product",
      entityId: product._id,
      entityLabel: `${product.name} (${product.modelNumber})`,
      summary: `Added product ${product.name}`,
      changes: createdChanges(product, productFields),
    });
    res.status(201).json({ success: true, data: product, message: "Product added" });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: "Model number already exists" });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { category, hsnCode, ...rest } = req.body;
    const before = await Product.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, message: "Product not found" });
    const product = await Product.findByIdAndUpdate(req.params.id, withWarehouseTotals(rest), { new: true, runValidators: true })
      .populate("vendor", "name company");
    const changes = toChanges(before, product, productFields);
    if (changes.length > 0) {
      await logActivity(req, {
        action: "updated",
        entityType: "Product",
        entityId: product._id,
        entityLabel: `${product.name} (${product.modelNumber})`,
        summary: `Updated product ${product.name}`,
        changes,
      });
    }
    res.json({ success: true, data: product, message: "Product updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (product) {
      await logActivity(req, {
        action: "deleted",
        entityType: "Product",
        entityId: product._id,
        entityLabel: `${product.name} (${product.modelNumber})`,
        summary: `Deleted product ${product.name}`,
        changes: productFields.map((field) => ({ field, before: product[field], after: null })),
      });
    }
    res.json({ success: true, message: "Product deleted" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateStock = async (req, res) => {
  try {
    const { adjustment, warehouse } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const previousStock = product.stock;
    const qty = +adjustment;
    const warehouseName = String(warehouse || "").trim() || "Main Warehouse";

    if (!Array.isArray(product.warehouses) || product.warehouses.length === 0) {
      if (product.stock !== 0) product.warehouses = [{ warehouse: "Main Warehouse", stock: product.stock }];
      else product.warehouses = [];
    }

    const existing = product.warehouses.find((row) => row.warehouse.toLowerCase() === warehouseName.toLowerCase());
    if (existing) existing.stock += qty;
    else product.warehouses.push({ warehouse: warehouseName, stock: qty });

    product.warehouses = product.warehouses.filter((row) => row.warehouse && row.stock !== 0);
    product.stock = product.warehouses.reduce((sum, row) => sum + (+row.stock || 0), 0);
    await product.save();
    await logActivity(req, {
      action: "stock",
      entityType: "Product",
      entityId: product._id,
      entityLabel: `${product.name} (${product.modelNumber})`,
      summary: `Adjusted stock for ${product.name}`,
      changes: [{ field: "stock", before: previousStock, after: product.stock }],
      metadata: { adjustment: qty, warehouse: warehouseName },
    });
    res.json({ success: true, data: product, message: "Stock updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
