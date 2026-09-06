const Complaint = require("../models/Complaint");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const { logActivity } = require("../utils/auditLogger");

function canManage(req) {
  return req.user?.role === "admin" || req.user?.permissions?.get?.("complaints_manage") === true;
}

const populatedComplaint = query => query
  .populate("product", "name modelNumber description")
  .populate("createdBy", "name username")
  .populate("resolvedBy", "name username");

exports.lookupInvoice = async (req, res) => {
  try {
    const type = req.query.type;
    const invoice = String(req.query.invoice || "").trim();
    if (!invoice || !["Sale", "Purchase"].includes(type))
      return res.status(400).json({ success: false, message: "Reference type and invoice number are required" });

    const Model = type === "Sale" ? Sale : Purchase;
    const filter = type === "Sale"
      ? { invoiceNo: { $regex: `^${invoice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }
      : { $or: [
          { purchaseNo: { $regex: `^${invoice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
          { invoiceNo: { $regex: `^${invoice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        ] };
    const record = await Model.findOne(filter)
      .populate(type === "Sale" ? "customer" : "vendor", "name company phone")
      .populate("items.product", "name modelNumber description");
    if (!record) return res.status(404).json({ success: false, message: `${type} invoice not found` });

    res.json({ success: true, data: {
      referenceId: record._id,
      invoiceNo: type === "Sale" ? record.invoiceNo : (record.purchaseNo || record.invoiceNo),
      secondaryInvoiceNo: type === "Purchase" ? record.invoiceNo : "",
      date: record.date,
      partyName: type === "Sale" ? (record.customer?.name || record.customerName || "Walk-in") : (record.vendor?.name || record.vendor?.company || "Vendor"),
      items: record.items.map(item => ({
        product: item.product?._id || item.product,
        productName: item.productName || item.product?.name || "Product",
        modelNumber: item.product?.modelNumber || "",
        description: item.description || item.product?.description || "",
        qty: item.qty,
      })),
    } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getComplaints = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const complaints = await populatedComplaint(Complaint.find(filter)).sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createComplaint = async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Complaint management permission required" });
    const { referenceType, referenceId, product, complaint } = req.body;
    if (!referenceId || !product || !complaint?.trim() || !["Sale", "Purchase"].includes(referenceType))
      return res.status(400).json({ success: false, message: "Invoice, product, and complaint details are required" });
    const Model = referenceType === "Sale" ? Sale : Purchase;
    const record = await Model.findById(referenceId).populate("items.product", "name modelNumber description").populate(referenceType === "Sale" ? "customer" : "vendor", "name company");
    if (!record) return res.status(404).json({ success: false, message: "Referenced invoice not found" });
    const item = record.items.find(row => String(row.product?._id || row.product) === String(product));
    if (!item) return res.status(400).json({ success: false, message: "Selected product does not belong to this invoice" });
    const saved = await Complaint.create({
      referenceType, referenceId: record._id,
      invoiceNo: referenceType === "Sale" ? record.invoiceNo : (record.purchaseNo || record.invoiceNo),
      referenceDate: record.date,
      partyName: referenceType === "Sale" ? (record.customer?.name || record.customerName || "Walk-in") : (record.vendor?.name || record.vendor?.company || "Vendor"),
      product: item.product?._id || item.product,
      productName: item.productName || item.product?.name || "Product",
      productDescription: item.description || item.product?.description || "",
      complaint: complaint.trim(), priority: req.body.priority || "Medium",
      createdBy: req.user?._id, createdByName: req.user?.name || req.user?.username || "Staff",
    });
    await logActivity(req, { action: "created", entityType: "Complaint", entityId: saved._id, entityLabel: saved.complaintNo, summary: `Created complaint ${saved.complaintNo} for ${saved.invoiceNo}`, changes: [{ field: "status", before: null, after: "Active" }] });
    res.status(201).json({ success: true, data: saved, message: "Complaint added successfully" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.solveComplaint = async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Complaint management permission required" });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    if (complaint.status === "Solved") return res.status(400).json({ success: false, message: "Complaint is already solved" });
    const resolution = String(req.body.resolution || "").trim();
    if (!resolution) return res.status(400).json({ success: false, message: "Resolution details are required" });
    complaint.status = "Solved";
    complaint.resolution = resolution;
    complaint.resolvedAt = req.body.resolvedAt || new Date();
    complaint.resolvedBy = req.user?._id;
    complaint.resolvedByName = req.user?.name || req.user?.username || "Staff";
    await complaint.save();
    await logActivity(req, { action: "updated", entityType: "Complaint", entityId: complaint._id, entityLabel: complaint.complaintNo, summary: `Solved complaint ${complaint.complaintNo}`, changes: [{ field: "status", before: "Active", after: "Solved" }, { field: "resolution", before: null, after: resolution }] });
    res.json({ success: true, data: complaint, message: "Complaint marked as solved" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
