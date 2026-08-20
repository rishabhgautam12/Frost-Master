const Sale     = require("../models/Sale");
const Product  = require("../models/Product");
const Customer = require("../models/Customer");
const User     = require("../models/User");
const { createdChanges, logActivity, toChanges } = require("../utils/auditLogger");

const saleFields = ["invoiceNo", "customer", "customerName", "soldBy", "soldByName", "saleType", "paymentMode", "date", "items", "subtotal", "totalDiscount", "totalGST", "grandTotal", "amountPaid", "amountDue", "isInterState", "notes", "status"];
const purchaseFields = ["purchaseNo", "vendor", "invoiceNo", "date", "items", "subtotal", "billingSubtotal", "transportTotal", "totalGST", "grandTotal", "amountPaid", "payments", "paymentMode", "notes", "status"];

// ── helper: create a new product if newProduct data provided ──────────────
async function resolveProduct(item, fallbackVendorId) {
  // Case 1: existing product ID passed
  if (item.product) {
    const p = await Product.findById(item.product);
    if (!p) throw new Error(`Product not found: ${item.product}`);
    return p;
  }
  // Case 2: newProduct object passed — create it now
  if (item.newProduct) {
    const np = item.newProduct;
    if (!np.name || !np.modelNumber)
      throw new Error("New product requires name and model number.");
    // Check duplicate model number
    const existing = await Product.findOne({ modelNumber: np.modelNumber });
    if (existing) return existing; // already exists, just use it
    const created = await Product.create({
      name:          np.name,
      modelNumber:   np.modelNumber,
      brand:         np.brand || "",
      vendor:        np.vendor || fallbackVendorId || undefined,
      purchasePrice: +np.purchasePrice || 0,
      sellingPrice:  +np.sellingPrice  || 0,
      stock:         0,           // will be updated by purchase/sale flow
      minStockAlert: +np.minStockAlert || 5,
      gstRate:       +np.gstRate  || 18,
      description:   np.description || "",
    });
    return created;
  }
  return null;
}

function normalizeWarehouseName(name) {
  return String(name || "").trim() || "Main Warehouse";
}

function buildPurchaseItemPayload(item, product) {
  const qty = +item.qty || 0;
  const rate = +item.rate || 0;
  const billingRate = item.billingRate !== undefined && item.billingRate !== ""
    ? +item.billingRate || 0
    : rate;
  const gstRate = item.gstRate !== undefined ? +item.gstRate : (product?.gstRate || 18);
  const transportAmount = +item.transportAmount || 0;
  const transportGstRate = item.transportGstRate !== undefined ? +item.transportGstRate || 0 : 0;
  const total = rate * qty;
  const billingTotal = billingRate * qty;
  const gstAmount = (billingTotal * gstRate) / 100;
  const transportGstAmount = (transportAmount * transportGstRate) / 100;

  return {
    qty,
    rate,
    total,
    billingRate,
    billingTotal,
    gstRate,
    gstAmount,
    transportAmount,
    transportGstRate,
    transportGstAmount,
    warehouse: normalizeWarehouseName(item.warehouse),
  };
}

function currentWarehouseRows(product) {
  const rows = Array.isArray(product.warehouses) ? product.warehouses.map((row) => ({
    warehouse: row.warehouse,
    stock: +row.stock || 0,
  })) : [];

  if (rows.length === 0 && product.stock !== 0) {
    rows.push({ warehouse: "Main Warehouse", stock: +product.stock || 0 });
  }
  return rows;
}

async function addStockToWarehouse(productId, qty, warehouse) {
  const product = await Product.findById(productId);
  if (!product) return;
  const warehouseName = normalizeWarehouseName(warehouse);
  const rows = currentWarehouseRows(product);
  const existing = rows.find((row) => row.warehouse.toLowerCase() === warehouseName.toLowerCase());
  if (existing) existing.stock += +qty;
  else rows.push({ warehouse: warehouseName, stock: +qty });
  const clean = rows.filter((row) => row.warehouse && row.stock !== 0);
  await Product.findByIdAndUpdate(productId, {
    warehouses: clean,
    stock: clean.reduce((sum, row) => sum + (+row.stock || 0), 0),
  });
}

async function deductStockFromWarehouses(productId, qty, preferredWarehouse) {
  const product = await Product.findById(productId);
  if (!product) return "";
  const rows = currentWarehouseRows(product);
  const warehouseName = String(preferredWarehouse || "").trim();
  let remaining = +qty;
  const used = [];

  if (warehouseName) {
    let row = rows.find((r) => r.warehouse.toLowerCase() === warehouseName.toLowerCase());
    if (!row) {
      row = { warehouse: warehouseName, stock: 0 };
      rows.push(row);
    }
    row.stock -= remaining;
    used.push(warehouseName);
    remaining = 0;
  } else {
    for (const row of rows) {
      if (remaining <= 0) break;
      if (row.stock <= 0) continue;
      const take = Math.min(row.stock, remaining);
      row.stock -= take;
      remaining -= take;
      used.push(row.warehouse);
    }
    if (remaining > 0) {
      let row = rows.find((r) => r.warehouse === "Unassigned");
      if (!row) {
        row = { warehouse: "Unassigned", stock: 0 };
        rows.push(row);
      }
      row.stock -= remaining;
      used.push("Unassigned");
    }
  }

  const clean = rows.filter((row) => row.warehouse && row.stock !== 0);
  await Product.findByIdAndUpdate(productId, {
    warehouses: clean,
    stock: clean.reduce((sum, row) => sum + (+row.stock || 0), 0),
  });
  return used.join(", ");
}

// GET all sales
exports.getSales = async (req, res) => {
  try {
    const { from, to, status, saleType, customer, search } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (saleType) filter.saleType = saleType;
    if (customer) filter.customer = customer;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to + "T23:59:59");
    }
    if (search) filter.$or = [
      { invoiceNo:    { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
    ];

    const sales = await Sale.find(filter)
      .populate("customer", "name phone")
      .populate("soldBy", "name username role")
      .populate("items.product", "name modelNumber")
      .sort({ date: -1 });

    const summary = {
      totalSales:    sales.length,
      totalRevenue:  sales.reduce((s,o) => s + o.grandTotal,  0),
      totalReceived: sales.reduce((s,o) => s + o.amountPaid,  0),
      totalDue:      sales.reduce((s,o) => s + o.amountDue,   0),
      totalGST:      sales.reduce((s,o) => s + o.totalGST,    0),
    };
    res.json({ success:true, data:sales, summary });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// GET single sale
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("customer", "name phone address gstin city")
      .populate("soldBy", "name username role")
      .populate("items.product", "name modelNumber gstRate");
    if (!sale) return res.status(404).json({ success:false, message:"Sale not found" });
    res.json({ success:true, data:sale });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// POST create sale
exports.createSale = async (req, res) => {
  try {
    const { items, customer, amountPaid, ...rest } = req.body;

    const enrichedItems = [];
    for (const item of items) {
      let product;

      if (item.newProduct) {
        // Create new product first, then sell it
        product = await resolveProduct(item, null);
        // New product starts with 0 stock — selling will go negative unless we allow it
        // We skip the stock check for brand-new products on first sale
      } else {
        product = await resolveProduct(item, null);
        // Stock can go negative — sale is allowed even if stock is 0 or below
      }

      const rate = +item.rate;
      const qty = +item.qty;
      const discount = +(item.discount || 0);
      if (!Number.isFinite(discount) || discount < 0 || discount > 100)
        return res.status(400).json({ success: false, message: "Discount must be between 0% and 100%." });

      const gstRate = item.gstRate !== undefined ? +item.gstRate : (product.gstRate || 18);
      const grossAmount = rate * qty;
      const discountAmount = (grossAmount * discount) / 100;
      const itemTotal = grossAmount - discountAmount;
      const gstAmt    = (itemTotal * gstRate) / 100;

      enrichedItems.push({
        product:     product._id,
        productName: product.name,
        qty,
        rate,
        discount,
        discountAmount,
        total:       itemTotal,
        warehouse:   item.warehouse || undefined,
        gstRate,
        gstAmount:   gstAmt,
      });
    }

    const sale = new Sale({
      ...rest,
      customer:   customer || undefined,
      items:      enrichedItems,
      amountPaid: amountPaid || 0,
      soldBy:     req.user?._id,
      soldByName: req.user?.name || req.user?.username || "Staff",
    });
    await sale.save();

    // Deduct stock
    for (let idx = 0; idx < sale.items.length; idx += 1) {
      const item = sale.items[idx];
      const warehouse = await deductStockFromWarehouses(item.product, item.qty, item.warehouse);
      if (warehouse && !item.warehouse) sale.items[idx].warehouse = warehouse;
    }
    if (sale.items.some((item) => item.warehouse)) await sale.save();

    // Update customer ledger
    if (customer) {
      await Customer.findByIdAndUpdate(customer, {
        $inc: { totalBilled: sale.grandTotal, totalReceived: sale.amountPaid },
      });
    }

    await sale.populate("customer", "name phone");
    await sale.populate("soldBy", "name username role");
    await logActivity(req, {
      action: "created",
      entityType: "Sale",
      entityId: sale._id,
      entityLabel: sale.invoiceNo,
      summary: `Created sale ${sale.invoiceNo}`,
      changes: createdChanges(sale, saleFields),
    });
    res.status(201).json({ success:true, data:sale, message:"Sale created successfully" });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// PATCH update payment
exports.updateSalePayment = async (req, res) => {
  try {
    const { amountPaid } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success:false, message:"Sale not found" });
    const prevPaid  = sale.amountPaid;
    const before = { amountPaid: sale.amountPaid, amountDue: sale.amountDue, status: sale.status };
    sale.amountPaid = Math.min(sale.grandTotal, amountPaid);
    await sale.save();
    if (sale.customer) {
      const diff = sale.amountPaid - prevPaid;
      await Customer.findByIdAndUpdate(sale.customer, { $inc: { totalReceived: diff } });
    }
    await logActivity(req, {
      action: "payment",
      entityType: "Sale",
      entityId: sale._id,
      entityLabel: sale.invoiceNo,
      summary: `Updated payment for sale ${sale.invoiceNo}`,
      changes: toChanges(before, sale, ["amountPaid", "amountDue", "status"]),
      metadata: { previousAmountPaid: prevPaid, requestedAmountPaid: amountPaid },
    });
    res.json({ success:true, data:sale, message:"Payment updated" });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// PATCH cancel sale
exports.cancelSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success:false, message:"Sale not found" });
    if (sale.status === "Cancelled")
      return res.status(400).json({ success:false, message:"Already cancelled" });
    const beforeStatus = sale.status;
    for (const item of sale.items) {
      await addStockToWarehouse(item.product, item.qty, item.warehouse);
    }
    sale.status = "Cancelled";
    await sale.save();
    if (sale.customer) {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: { totalBilled: -sale.grandTotal, totalReceived: -sale.amountPaid },
      });
    }
    await logActivity(req, {
      action: "cancelled",
      entityType: "Sale",
      entityId: sale._id,
      entityLabel: sale.invoiceNo,
      summary: `Cancelled sale ${sale.invoiceNo}`,
      changes: [{ field: "status", before: beforeStatus, after: sale.status }],
      metadata: { restoredItems: sale.items },
    });
    res.json({ success:true, message:"Sale cancelled and stock restored" });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// GET GST report
exports.getGSTReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { status: { $ne: "Cancelled" } };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to + "T23:59:59");
    }
    const sales = await Sale.find(filter)
      .populate("customer", "name gstin")
      .select("invoiceNo date customer customerName grandTotal totalGST cgst sgst igst isInterState saleType");
    const summary = {
      totalTaxable: sales.reduce((s,o) => s + (o.grandTotal - o.totalGST), 0),
      totalCGST:    sales.reduce((s,o) => s + o.cgst, 0),
      totalSGST:    sales.reduce((s,o) => s + o.sgst, 0),
      totalIGST:    sales.reduce((s,o) => s + o.igst, 0),
      totalGST:     sales.reduce((s,o) => s + o.totalGST, 0),
    };
    res.json({ success:true, data:sales, summary });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── Purchases ─────────────────────────────────────────────────────────────
exports.getStaffSalesReport = async (req, res) => {
  try {
    const { from, to, staff, year } = req.query;
    const filter = { status: { $ne: "Cancelled" } };
    if (from || to || year) {
      filter.date = {};
      if (year && !from && !to) {
        filter.date.$gte = new Date(`${year}-01-01`);
        filter.date.$lte = new Date(`${year}-12-31T23:59:59`);
      } else {
        if (from) filter.date.$gte = new Date(from);
        if (to) filter.date.$lte = new Date(`${to}T23:59:59`);
      }
    }
    if (staff && staff !== "all" && staff !== "unassigned") filter.soldBy = staff;
    if (staff === "unassigned") filter.soldBy = { $exists: false };

    const sales = await Sale.find(filter)
      .populate("soldBy", "name username role")
      .populate("items.product", "name modelNumber")
      .sort({ date: -1 });
    const staffUsers = await User.find({ isActive: true }).select("name username role").sort({ role: 1, name: 1 });

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const memberMap = new Map();
    const monthlyMap = new Map();
    const productMap = new Map();
    const staffLabel = (sale) => {
      const id = sale.soldBy?._id ? String(sale.soldBy._id) : "unassigned";
      return {
        id,
        name: sale.soldBy?.name || sale.soldByName || "Unassigned",
        username: sale.soldBy?.username || "",
        role: sale.soldBy?.role || "",
      };
    };

    for (const sale of sales) {
      const member = staffLabel(sale);
      if (!memberMap.has(member.id)) {
        memberMap.set(member.id, { ...member, invoices: 0, qty: 0, revenue: 0, received: 0, due: 0 });
      }
      const memberRow = memberMap.get(member.id);
      memberRow.invoices += 1;
      memberRow.revenue += sale.grandTotal || 0;
      memberRow.received += sale.amountPaid || 0;
      memberRow.due += sale.amountDue || 0;

      const date = new Date(sale.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthlyKey = `${monthKey}:${member.id}`;
      if (!monthlyMap.has(monthlyKey)) {
        monthlyMap.set(monthlyKey, {
          monthKey,
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          staffId: member.id,
          staffName: member.name,
          invoices: 0,
          qty: 0,
          revenue: 0,
        });
      }
      const monthRow = monthlyMap.get(monthlyKey);
      monthRow.invoices += 1;
      monthRow.revenue += sale.grandTotal || 0;

      for (const item of sale.items || []) {
        const qty = +item.qty || 0;
        memberRow.qty += qty;
        monthRow.qty += qty;
        const productId = item.product?._id ? String(item.product._id) : item.productName || "unknown";
        const productKey = `${member.id}:${productId}`;
        if (!productMap.has(productKey)) {
          productMap.set(productKey, {
            staffId: member.id,
            staffName: member.name,
            productId,
            productName: item.productName || item.product?.name || "Item",
            modelNumber: item.product?.modelNumber || "",
            qty: 0,
            revenue: 0,
          });
        }
        const productRow = productMap.get(productKey);
        productRow.qty += qty;
        productRow.revenue += (item.total || 0) + (item.gstAmount || 0);
      }
    }

    const byMember = Array.from(memberMap.values()).sort((a, b) => b.revenue - a.revenue);
    const byMonth = Array.from(monthlyMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey) || b.revenue - a.revenue);
    const byProduct = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    const summary = byMember.reduce((acc, row) => ({
      invoices: acc.invoices + row.invoices,
      qty: acc.qty + row.qty,
      revenue: acc.revenue + row.revenue,
      received: acc.received + row.received,
      due: acc.due + row.due,
    }), { invoices: 0, qty: 0, revenue: 0, received: 0, due: 0 });

    res.json({ success: true, data: { summary, byMember, byMonth, byProduct, staff: staffUsers } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const Purchase = require("../models/Purchase");

exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("vendor", "name company")
      .populate("items.product", "name modelNumber")
      .sort({ date: -1 });
    res.json({ success:true, data:purchases });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.createPurchase = async (req, res) => {
  try {
    const { items, vendor, payments, amountPaid, paymentMode, ...rest } = req.body;

    const enrichedItems = [];
    for (const item of items) {
      let product = null;

      if (item.product) {
        // Existing product
        product = await Product.findById(item.product);
        if (product && !product.vendor && vendor) {
          product.vendor = vendor;
        }
        if (product && +item.rate > 0) {
          product.purchasePrice = +item.rate;
        }
        if (product && product.isModified()) {
          await product.save();
        }
      } else if (item.newProduct) {
        // Create brand new product, linked to this vendor
        const np = item.newProduct;
        if (!np.name || !np.modelNumber)
          throw new Error("New product requires name and model number.");
        const existing = await Product.findOne({ modelNumber: np.modelNumber });
        if (existing) {
          product = existing;
        } else {
          product = await Product.create({
            name:          np.name,
            modelNumber:   np.modelNumber,
            brand:         np.brand || "",
            vendor:        vendor,          // link to current vendor
            purchasePrice: +item.rate || 0, // use purchase rate as purchase price
            sellingPrice:  +np.sellingPrice || (+item.rate * 1.2) || 0, // default 20% margin
            stock:         0,
            minStockAlert: +np.minStockAlert || 5,
            gstRate:       +item.gstRate || 18,
            description:   np.description || "",
          });
        }
      }

      if (product) {
        const amounts = buildPurchaseItemPayload(item, product);
        enrichedItems.push({
          product:     product._id,
          productName: product.name,
          ...amounts,
        });
        // Add stock
        await addStockToWarehouse(product._id, item.qty, item.warehouse);
      } else {
        // Fallback: no product id, just record the name (no stock tracking)
        const amounts = buildPurchaseItemPayload(item, null);
        enrichedItems.push({
          productName: item.productName || "Unknown",
          ...amounts,
        });
      }
    }

    const cleanPayments = Array.isArray(payments)
      ? payments
          .map((payment) => ({
            amount: +payment.amount || 0,
            paymentMode: payment.paymentMode || "Cash",
            date: payment.date || new Date(),
            notes: payment.notes || "",
          }))
          .filter((payment) => payment.amount > 0)
      : [];
    const purchase = new Purchase({
      ...rest,
      vendor,
      items: enrichedItems,
      payments: cleanPayments,
      amountPaid: cleanPayments.length ? undefined : (+amountPaid || 0),
      paymentMode: cleanPayments.length ? undefined : (paymentMode || "Credit"),
    });
    await purchase.save();

    // Vendor ledger
    const VendorLedger = require("../models/VendorLedger");
    await new VendorLedger({
      vendor,
      type:      "Purchase",
      invoiceNo: purchase.purchaseNo,
      date:      purchase.date,
      amount:    purchase.grandTotal,
      paid:      purchase.amountPaid,
    }).save();

    const Vendor = require("../models/Vendor");
    await Vendor.findByIdAndUpdate(vendor, {
      $inc: { totalPurchased: purchase.grandTotal, totalPaid: purchase.amountPaid },
    });

    await purchase.populate("vendor", "name company");
    await logActivity(req, {
      action: "created",
      entityType: "Purchase",
      entityId: purchase._id,
      entityLabel: purchase.purchaseNo,
      summary: `Created purchase ${purchase.purchaseNo}`,
      changes: createdChanges(purchase, purchaseFields),
    });
    res.status(201).json({ success:true, data:purchase, message:"Purchase recorded successfully" });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// PATCH pay for sale — proper payment flow
exports.payForSale = async (req, res) => {
  try {
    const { amount, method, notes, date } = req.body;
    if (!amount || +amount <= 0)
      return res.status(400).json({ success:false, message:"Valid amount required." });
    const sale = await Sale.findById(req.params.saleId);
    if (!sale)
      return res.status(404).json({ success:false, message:"Sale not found." });
    if (sale.status === "Cancelled")
      return res.status(400).json({ success:false, message:"Cannot record payment on a cancelled sale." });
    const before = { amountPaid: sale.amountPaid, amountDue: sale.amountDue, status: sale.status };
    const maxPayable = sale.grandTotal - sale.amountPaid;
    if (maxPayable <= 0)
      return res.status(400).json({ success:false, message:"This invoice is already fully paid." });
    const paying    = Math.min(+amount, maxPayable);
    sale.amountPaid += paying;
    sale.amountDue   = Math.max(0, sale.grandTotal - sale.amountPaid);
    sale.status      = sale.amountDue === 0 ? "Paid" : "Partial";
    await sale.save();
    const customer = await Customer.findById(sale.customer);
    if (customer) { customer.totalReceived += paying; await customer.save(); }
    const remaining = sale.amountDue;
    await logActivity(req, {
      action: "payment",
      entityType: "Sale",
      entityId: sale._id,
      entityLabel: sale.invoiceNo,
      summary: `Recorded payment of ₹${paying.toLocaleString()} for sale ${sale.invoiceNo}`,
      changes: toChanges(before, sale, ["amountPaid", "amountDue", "status"]),
      metadata: { amount: paying, method, notes, date },
    });
    res.json({
      success: true,
      message: remaining === 0
        ? `Payment of ₹${paying.toLocaleString()} recorded. Invoice fully settled.`
        : `Payment of ₹${paying.toLocaleString()} recorded. Balance remaining: ₹${remaining.toLocaleString()}`,
      data: { sale, paying, remaining, status: sale.status },
    });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// PATCH update purchase payment amount
exports.updatePurchasePayment = async (req, res) => {
  try {
    const { amountPaid, paymentMode, notes } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: "Purchase not found" });

    const prevPaid     = purchase.amountPaid;
    const before = { amountPaid: purchase.amountPaid, paymentMode: purchase.paymentMode, notes: purchase.notes };
    const newPaid      = Math.min(purchase.grandTotal, Math.max(0, +amountPaid || 0));
    const diff         = newPaid - prevPaid;
    purchase.amountPaid  = newPaid;
    if (!purchase.payments?.length && newPaid > 0) {
      purchase.payments = [{
        amount: newPaid,
        paymentMode: paymentMode || purchase.paymentMode || "Cash",
        date: new Date(),
        notes: notes || "",
      }];
    }
    if (paymentMode) purchase.paymentMode = paymentMode;
    if (notes !== undefined) purchase.notes = notes;
    await purchase.save();

    // Sync vendor totals
    const Vendor = require("../models/Vendor");
    if (diff !== 0) {
      await Vendor.findByIdAndUpdate(purchase.vendor, { $inc: { totalPaid: diff } });
    }

    // Sync the matching Purchase ledger entry
    const VendorLedger = require("../models/VendorLedger");
    const ledgerEntry  = await VendorLedger.findOne({ vendor: purchase.vendor, invoiceNo: purchase.purchaseNo, type: "Purchase" });
    if (ledgerEntry) {
      ledgerEntry.paid = newPaid;
      await ledgerEntry.save();
    }

    await logActivity(req, {
      action: "payment",
      entityType: "Purchase",
      entityId: purchase._id,
      entityLabel: purchase.purchaseNo,
      summary: `Updated payment for purchase ${purchase.purchaseNo}`,
      changes: toChanges(before, purchase, ["amountPaid", "paymentMode", "notes"]),
      metadata: { previousAmountPaid: prevPaid, requestedAmountPaid: amountPaid },
    });
    res.json({ success: true, data: purchase, message: "Purchase payment updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PUT update purchase details and items
exports.updatePurchase = async (req, res) => {
  try {
    const { invoiceNo, date, notes, paymentMode, amountPaid, payments, items } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: "Purchase not found" });
    const before = purchase.toObject();
    const oldGrandTotal = purchase.grandTotal;
    const oldAmountPaid = purchase.amountPaid || 0;

    if (Array.isArray(items)) {
      for (const oldItem of purchase.items) {
        if (oldItem.product) await addStockToWarehouse(oldItem.product, -oldItem.qty, oldItem.warehouse);
      }

      const enrichedItems = [];
      for (const item of items) {
        const qty = +item.qty;
        const rate = +item.rate;
        if (qty <= 0 || rate < 0) {
          return res.status(400).json({ success: false, message: "Valid qty and rate are required." });
        }

        let product = null;
        if (item.product) {
          product = await Product.findById(item.product);
          if (!product) return res.status(400).json({ success: false, message: "Product not found in purchase item." });
          if (rate > 0) {
            product.purchasePrice = rate;
            await product.save();
          }
        }

        const amounts = buildPurchaseItemPayload(item, product);
        enrichedItems.push({
          product: product?._id,
          productName: product?.name || item.productName || "",
          ...amounts,
        });
      }

      purchase.items = enrichedItems;
    }

    if (invoiceNo !== undefined)  purchase.invoiceNo  = invoiceNo;
    if (date)                     purchase.date       = new Date(date);
    if (notes !== undefined)      purchase.notes      = notes;
    if (paymentMode)              purchase.paymentMode = paymentMode;
    if (amountPaid !== undefined) purchase.amountPaid = Math.max(0, +amountPaid || 0);
    if (Array.isArray(payments)) {
      purchase.payments = payments
        .map((payment) => ({
          amount: +payment.amount || 0,
          paymentMode: payment.paymentMode || "Cash",
          date: payment.date || new Date(),
          notes: payment.notes || "",
        }))
        .filter((payment) => payment.amount > 0);
    }
    await purchase.save();
    if (purchase.amountPaid > purchase.grandTotal) {
      purchase.amountPaid = purchase.grandTotal;
      await purchase.save();
    }

    if (Array.isArray(items)) {
      for (const item of purchase.items) {
        if (item.product) await addStockToWarehouse(item.product, item.qty, item.warehouse);
      }
    }

    const Vendor = require("../models/Vendor");
    const VendorLedger = require("../models/VendorLedger");
    const billedDiff = purchase.grandTotal - oldGrandTotal;
    const paidDiff = (purchase.amountPaid || 0) - oldAmountPaid;
    if (billedDiff !== 0 || paidDiff !== 0) {
      await Vendor.findByIdAndUpdate(purchase.vendor, {
        $inc: { totalPurchased: billedDiff, totalPaid: paidDiff },
      });
    }
    const ledgerEntry = await VendorLedger.findOne({ vendor: purchase.vendor, invoiceNo: purchase.purchaseNo, type: "Purchase" });
    if (ledgerEntry) {
      ledgerEntry.amount = purchase.grandTotal;
      ledgerEntry.paid = purchase.amountPaid || 0;
      ledgerEntry.date = purchase.date;
      await ledgerEntry.save();
    }

    await purchase.populate("vendor", "name company");
    await purchase.populate("items.product", "name modelNumber");
    const changes = toChanges(before, purchase, purchaseFields);
    if (changes.length > 0) {
      await logActivity(req, {
        action: "updated",
        entityType: "Purchase",
        entityId: purchase._id,
        entityLabel: purchase.purchaseNo,
        summary: `Updated purchase ${purchase.purchaseNo}`,
        changes,
      });
    }
    res.json({ success: true, data: purchase, message: "Purchase updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
// PUT update sale details
exports.updateSaleDetails = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
    const before = sale.toObject();

    const wasActive = sale.status !== "Cancelled";
    const oldCustomer = sale.customer;
    const oldBilled = wasActive ? sale.grandTotal : 0;
    const oldReceived = wasActive ? sale.amountPaid : 0;
    const itemsWereUpdated = Array.isArray(req.body.items);
    const requestedCancel = req.body.status === "Cancelled";

    if (wasActive && (itemsWereUpdated || requestedCancel)) {
      for (const item of sale.items) {
        await addStockToWarehouse(item.product, item.qty, item.warehouse);
      }
    }

    if (itemsWereUpdated) {
      const enrichedItems = [];
      for (const item of req.body.items) {
        const product = await resolveProduct(item, null);
        const rate = +item.rate;
        const qty = +item.qty;
        const discount = +(item.discount || 0);
        if (!product || qty <= 0 || rate < 0)
          return res.status(400).json({ success: false, message: "Valid product, qty and rate are required." });
        if (!Number.isFinite(discount) || discount < 0 || discount > 100)
          return res.status(400).json({ success: false, message: "Discount must be between 0% and 100%." });

        const gstRate = item.gstRate !== undefined ? +item.gstRate : (product.gstRate || 18);
        const grossAmount = rate * qty;
        const discountAmount = (grossAmount * discount) / 100;
        const itemTotal = grossAmount - discountAmount;
        const gstAmt = (itemTotal * gstRate) / 100;

        enrichedItems.push({
          product: product._id,
          productName: product.name,
          qty,
          rate,
          discount,
          discountAmount,
          total: itemTotal,
          warehouse: item.warehouse || undefined,
          gstRate,
          gstAmount: gstAmt,
        });
      }
      sale.items = enrichedItems;
    }

    const {
      customer,
      customerName,
      saleType,
      paymentMode,
      date,
      isInterState,
      amountPaid,
      notes,
      status,
    } = req.body;

    if (customer !== undefined) sale.customer = customer || undefined;
    if (customerName !== undefined) sale.customerName = customerName;
    if (saleType) sale.saleType = saleType;
    if (paymentMode) sale.paymentMode = paymentMode;
    if (date) sale.date = new Date(date);
    if (isInterState !== undefined) sale.isInterState = !!isInterState;
    if (amountPaid !== undefined) sale.amountPaid = Math.max(0, +amountPaid || 0);
    if (notes !== undefined) sale.notes = notes;
    if (status === "Cancelled") sale.status = "Cancelled";
    else if (status) sale.status = "Pending";

    await sale.save();

    if (status === "Paid" || sale.amountPaid > sale.grandTotal) {
      sale.amountPaid = sale.grandTotal;
      await sale.save();
    }

    if (sale.status !== "Cancelled" && (itemsWereUpdated || !wasActive)) {
      for (let idx = 0; idx < sale.items.length; idx += 1) {
        const item = sale.items[idx];
        const warehouse = await deductStockFromWarehouses(item.product, item.qty, item.warehouse);
        if (warehouse && !item.warehouse) sale.items[idx].warehouse = warehouse;
      }
      if (sale.items.some((item) => item.warehouse)) await sale.save();
    }

    if (oldCustomer) {
      await Customer.findByIdAndUpdate(oldCustomer, {
        $inc: { totalBilled: -oldBilled, totalReceived: -oldReceived },
      });
    }
    if (sale.customer && sale.status !== "Cancelled") {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: { totalBilled: sale.grandTotal, totalReceived: sale.amountPaid },
      });
    }

    await sale.populate("customer", "name phone");
    await sale.populate("soldBy", "name username role");
    await sale.populate("items.product", "name modelNumber gstRate");
    const changes = toChanges(before, sale, saleFields);
    if (changes.length > 0) {
      await logActivity(req, {
        action: status === "Cancelled" ? "cancelled" : "updated",
        entityType: "Sale",
        entityId: sale._id,
        entityLabel: sale.invoiceNo,
        summary: `Updated sale ${sale.invoiceNo}`,
        changes,
      });
    }
    res.json({ success: true, data: sale, message: "Sale updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
