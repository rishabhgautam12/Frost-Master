const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const { createdChanges, logActivity, toChanges } = require("../utils/auditLogger");

const customerFields = ["name", "phone", "email", "address", "city", "gstin", "customerType", "status", "totalBilled", "totalReceived"];

// GET all customers
exports.getCustomers = async (req, res) => {
  try {
    const { status, customerType, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (customerType) filter.customerType = customerType;
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
    ];
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET customer with sales history
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    const sales = await Sale.find({ customer: req.params.id })
      .populate("items.product", "name modelNumber")
      .sort({ date: -1 });

    // Build product summary for this customer
    const productMap = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const pid = item.product?._id?.toString() || item.productName;
        if (!productMap[pid]) {
          productMap[pid] = {
            name: item.product?.name || item.productName,
            modelNumber: item.product?.modelNumber || "",
            totalQty: 0,
            totalAmount: 0,
            lastDate: sale.date,
          };
        }
        productMap[pid].totalQty += item.qty;
        productMap[pid].totalAmount += item.total;
        if (sale.date > productMap[pid].lastDate) productMap[pid].lastDate = sale.date;
      });
    });

    res.json({
      success: true,
      data: {
        customer,
        sales,
        productSummary: Object.values(productMap),
        stats: {
          totalOrders: sales.length,
          totalBilled: sales.reduce((s, o) => s + o.grandTotal, 0),
          totalReceived: sales.reduce((s, o) => s + o.amountPaid, 0),
          totalDue: sales.reduce((s, o) => s + o.amountDue, 0),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    await logActivity(req, {
      action: "created",
      entityType: "Customer",
      entityId: customer._id,
      entityLabel: customer.name,
      summary: `Added customer ${customer.name}`,
      changes: createdChanges(customer, customerFields),
    });
    res.status(201).json({ success: true, data: customer, message: "Customer added successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT update customer
exports.updateCustomer = async (req, res) => {
  try {
    const before = await Customer.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, message: "Customer not found" });
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    const changes = toChanges(before, customer, customerFields);
    if (changes.length > 0) {
      await logActivity(req, {
        action: "updated",
        entityType: "Customer",
        entityId: customer._id,
        entityLabel: customer.name,
        summary: `Updated customer ${customer.name}`,
        changes,
      });
    }
    res.json({ success: true, data: customer, message: "Customer updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (customer) {
      await logActivity(req, {
        action: "deleted",
        entityType: "Customer",
        entityId: customer._id,
        entityLabel: customer.name,
        summary: `Deleted customer ${customer.name}`,
        changes: customerFields.map((field) => ({ field, before: customer[field], after: null })),
      });
    }
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST record a payment received from customer
exports.recordPayment = async (req, res) => {
  try {
    const { saleId, amount } = req.body;
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
    const before = { amountPaid: sale.amountPaid, amountDue: sale.amountDue, status: sale.status };
    sale.amountPaid = Math.min(sale.grandTotal, sale.amountPaid + amount);
    sale.amountDue = Math.max(0, sale.grandTotal - sale.amountPaid);
    if (sale.amountDue === 0) sale.status = "Paid";
    else sale.status = "Partial";
    await sale.save();

    // Update customer ledger
    const customer = await Customer.findById(sale.customer);
    if (customer) {
      customer.totalReceived += amount;
      await customer.save();
    }
    await logActivity(req, {
      action: "payment",
      entityType: "Sale",
      entityId: sale._id,
      entityLabel: sale.invoiceNo || sale._id.toString(),
      summary: `Recorded customer payment of ₹${(+amount).toLocaleString()} for ${sale.invoiceNo || "sale"}`,
      changes: toChanges(before, sale, ["amountPaid", "amountDue", "status"]),
      metadata: { amount: +amount },
    });
    res.json({ success: true, data: sale, message: "Payment recorded" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /customers/sales/:saleId/pay  — receive payment against a specific sale invoice
exports.payForSale = async (req, res) => {
  try {
    const { amount, method, notes, date } = req.body;
    if (!amount || +amount <= 0)
      return res.status(400).json({ success: false, message: "Valid amount required." });

    const sale = await Sale.findById(req.params.saleId);
    if (!sale) return res.status(404).json({ success: false, message: "Sale not found." });
    if (sale.status === "Cancelled")
      return res.status(400).json({ success: false, message: "Cannot record payment on a cancelled sale." });

    const prevPaid   = sale.amountPaid;
    const before = { amountPaid: sale.amountPaid, amountDue: sale.amountDue, status: sale.status };
    const maxPayable = sale.grandTotal - prevPaid;
    if (maxPayable <= 0)
      return res.status(400).json({ success: false, message: "This invoice is already fully paid." });

    const paying = Math.min(+amount, maxPayable); // cannot overpay

    sale.amountPaid += paying;
    sale.amountDue   = Math.max(0, sale.grandTotal - sale.amountPaid);
    sale.status      = sale.amountDue === 0 ? "Paid" : "Partial";
    await sale.save();

    // Keep customer running totals in sync
    const customer = await Customer.findById(sale.customer);
    if (customer) {
      customer.totalReceived += paying;
      await customer.save();
    }

    const remaining = sale.amountDue;
    await logActivity(req, {
      action: "payment",
      entityType: "Sale",
      entityId: sale._id,
      entityLabel: sale.invoiceNo || sale._id.toString(),
      summary: `Recorded customer payment of ₹${paying.toLocaleString()} for ${sale.invoiceNo || "sale"}`,
      changes: toChanges(before, sale, ["amountPaid", "amountDue", "status"]),
      metadata: { amount: paying, method, notes, date },
    });
    res.json({
      success: true,
      message: remaining === 0
        ? `Payment of ₹${paying.toLocaleString()} recorded. Invoice fully settled.`
        : `Payment of ₹${paying.toLocaleString()} recorded. Balance remaining: ₹${remaining.toLocaleString()}`,
      data: {
        sale,
        paying,
        remaining,
        status: sale.status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
