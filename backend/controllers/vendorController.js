const Vendor       = require("../models/Vendor");
const VendorLedger = require("../models/VendorLedger");
const Product      = require("../models/Product");
const { createdChanges, logActivity, toChanges } = require("../utils/auditLogger");

const vendorFields = ["name", "company", "phone", "email", "city", "address", "gstin", "status", "totalPurchased", "totalPaid", "totalReceived", "notes"];
const ledgerFields = ["vendor", "type", "invoiceNo", "date", "amount", "paid", "notes", "status"];

exports.getVendors = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { name:    { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
      { phone:   { $regex: search, $options: "i" } },
    ];
    const vendors = await Vendor.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: vendors });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const products = await Product.find({ vendor: req.params.id });
    const ledger   = await VendorLedger.find({ vendor: req.params.id }).sort({ date: -1 }).limit(50);

    const totalPurchased = ledger.filter(l => l.type === "Purchase").reduce((s,l) => s+l.amount, 0);
    const totalPaid      = ledger.filter(l => l.type === "Payment").reduce((s,l) => s+l.amount, 0);
    const totalReturns   = ledger.filter(l => ["Debit Note","Credit Note","Return"].includes(l.type)).reduce((s,l) => s+l.amount, 0);

    res.json({
      success: true,
      data: {
        vendor, products, ledger,
        summary: { totalPurchased, totalPaid, totalReturns,
          amountPayable:    Math.max(0, totalPurchased - totalPaid - totalReturns),
          amountReceivable: totalReturns },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createVendor = async (req, res) => {
  try {
    const vendor = new Vendor(req.body);
    await vendor.save();
    await logActivity(req, {
      action: "created",
      entityType: "Vendor",
      entityId: vendor._id,
      entityLabel: vendor.company || vendor.name,
      summary: `Created vendor ${vendor.company || vendor.name}`,
      changes: createdChanges(vendor, vendorFields),
    });
    res.status(201).json({ success: true, data: vendor, message: "Vendor created" });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: "Vendor already exists" });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const before = await Vendor.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, message: "Vendor not found" });
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    const changes = toChanges(before, vendor, vendorFields);
    if (changes.length > 0) {
      await logActivity(req, {
        action: "updated",
        entityType: "Vendor",
        entityId: vendor._id,
        entityLabel: vendor.company || vendor.name,
        summary: `Updated vendor ${vendor.company || vendor.name}`,
        changes,
      });
    }
    res.json({ success: true, data: vendor, message: "Vendor updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.toggleVendorStatus = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    const beforeStatus = vendor.status;
    vendor.status = vendor.status === "Active" ? "Inactive" : "Active";
    await vendor.save();
    await logActivity(req, {
      action: "updated",
      entityType: "Vendor",
      entityId: vendor._id,
      entityLabel: vendor.company || vendor.name,
      summary: `Changed vendor status to ${vendor.status} for ${vendor.company || vendor.name}`,
      changes: [{ field: "status", before: beforeStatus, after: vendor.status }],
    });
    res.json({ success: true, data: vendor, message: `Vendor ${vendor.status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (vendor) {
      await logActivity(req, {
        action: "deleted",
        entityType: "Vendor",
        entityId: vendor._id,
        entityLabel: vendor.company || vendor.name,
        summary: `Deleted vendor ${vendor.company || vendor.name}`,
        changes: vendorFields.map((field) => ({ field, before: vendor[field], after: null })),
      });
    }
    res.json({ success: true, message: "Vendor deleted" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getVendorLedger = async (req, res) => {
  try {
    const { vendor, type, from, to } = req.query;
    const filter = {};
    if (vendor && vendor !== "all") filter.vendor = vendor;
    if (type && type !== "All")     filter.type   = type;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to + "T23:59:59");
    }
    const entries = await VendorLedger.find(filter)
      .populate("vendor", "name company")
      .sort({ date: -1 });
    res.json({ success: true, data: entries });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.addLedgerEntry = async (req, res) => {
  try {
    const entry = new VendorLedger(req.body);
    await entry.save();
    const vendor = await Vendor.findById(req.body.vendor);
    if (vendor) {
      if (entry.type === "Purchase") vendor.totalPurchased += entry.amount;
      if (entry.type === "Payment")  vendor.totalPaid      += entry.amount;
      if (["Debit Note","Credit Note","Return"].includes(entry.type)) vendor.totalReceived += entry.amount;
      await vendor.save();
    }
    await entry.populate("vendor", "name company");
    await logActivity(req, {
      action: "created",
      entityType: "Vendor Ledger",
      entityId: entry._id,
      entityLabel: entry.invoiceNo || entry._id.toString(),
      summary: `Added ${entry.type} ledger entry ${entry.invoiceNo || ""}`.trim(),
      changes: createdChanges(entry, ledgerFields),
    });
    res.status(201).json({ success: true, data: entry, message: "Ledger entry added" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PATCH /vendors/ledger/:id/pay  — apply payment to a specific Purchase entry
exports.payLedgerEntry = async (req, res) => {
  try {
    const { amount, method, ref, date, notes } = req.body;
    if (!amount || +amount <= 0)
      return res.status(400).json({ success: false, message: "Valid amount required" });

    const entry = await VendorLedger.findById(req.params.id);
    if (!entry)
      return res.status(404).json({ success: false, message: "Ledger entry not found" });
    if (entry.type !== "Purchase")
      return res.status(400).json({ success: false, message: "Can only pay against a Purchase entry" });

    const prevPaid   = entry.paid;
    const before = { paid: entry.paid, status: entry.status };
    const maxPayable = entry.amount - prevPaid;
    const paying     = Math.min(+amount, maxPayable); // cannot overpay

    // Update the Purchase entry's paid amount & status
    entry.paid = prevPaid + paying;
    // status auto-set by pre-save hook
    await entry.save();

    // Also create a corresponding Payment row in ledger for audit trail
    const paymentEntry = new VendorLedger({
      vendor:    entry.vendor,
      type:      "Payment",
      invoiceNo: ref || `PMT-${Date.now()}`,
      date:      date || new Date(),
      amount:    paying,
      paid:      paying,
      notes:     `Payment via ${method || "NEFT"} against ${entry.invoiceNo || entry._id}${notes ? " — " + notes : ""}`,
    });
    await paymentEntry.save();

    // Update vendor running totals
    const vendor = await Vendor.findById(entry.vendor);
    if (vendor) {
      vendor.totalPaid += paying;
      await vendor.save();
    }

    await logActivity(req, {
      action: "payment",
      entityType: "Vendor Ledger",
      entityId: entry._id,
      entityLabel: entry.invoiceNo || entry._id.toString(),
      summary: `Recorded vendor payment of ₹${paying.toLocaleString()} against ${entry.invoiceNo || "purchase"}`,
      changes: toChanges(before, entry, ["paid", "status"]),
      metadata: { amount: paying, method, ref, date, notes, paymentEntry: paymentEntry._id },
    });

    res.json({
      success:  true,
      message:  `Payment of ₹${paying.toLocaleString()} recorded. ${entry.status === "Settled" ? "Invoice fully settled." : `Balance remaining: ₹${(entry.amount - entry.paid).toLocaleString()}`}`,
      data: {
        entry,          // updated Purchase entry
        paymentEntry,   // new Payment audit row
        paying,
        remaining: Math.max(0, entry.amount - entry.paid),
        status:    entry.status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
