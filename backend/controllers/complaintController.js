const Complaint = require("../models/Complaint");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const Employee = require("../models/Employee");
const { logActivity } = require("../utils/auditLogger");

function canManage(req) {
  return req.user?.role === "admin" || req.user?.permissions?.get?.("complaints_manage") === true || req.user?.permissions?.complaints_manage === true;
}

const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };
const clean = value => String(value || "").trim();
function dateValue(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  if (!date || Number.isNaN(date.getTime())) fail("Enter a valid date and time.");
  return date;
}
async function employeeValue(id) {
  if (!id) fail("Select an employee.");
  const employee = await Employee.findById(id);
  if (!employee || employee.status !== "Active") fail("Select an active employee.");
  return employee;
}
function respondError(res, error) {
  res.status(error.status || (["ValidationError", "CastError", "VersionError"].includes(error.name) ? 400 : 500)).json({ success:false, message:error.name === "VersionError" ? "This ticket changed. Refresh and try again." : error.message });
}
function event(req, type, occurredAt, fields = {}) {
  return { type, occurredAt, actor:req.user?._id, actorName:req.user?.name || req.user?.username || "Staff", ...fields };
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
    if (req.query.referenceId) filter.referenceId = req.query.referenceId;
    if (req.query.referenceType) filter.referenceType = req.query.referenceType;
    const complaints = await populatedComplaint(Complaint.find(filter)).sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createComplaint = async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Complaint management permission required" });
    const { referenceId, product } = req.body;
    const referenceType = req.body.referenceType || "External";
    const complaint = clean(req.body.complaint);
    if (!complaint) fail("Describe the reported problem.");
    if (!["External", "Sale", "Purchase"].includes(referenceType)) fail("Invalid reference type.");
    let reference = {};
    if (referenceType !== "External") {
    if (!referenceId || !product) fail("Fetch an invoice and select its product.");
    const Model = referenceType === "Sale" ? Sale : Purchase;
    const record = await Model.findById(referenceId).populate("items.product", "name modelNumber description").populate(referenceType === "Sale" ? "customer" : "vendor", "name company");
    if (!record) return res.status(404).json({ success: false, message: "Referenced invoice not found" });
    const item = record.items.find(row => String(row.product?._id || row.product) === String(product));
    if (!item) return res.status(400).json({ success: false, message: "Selected product does not belong to this invoice" });
    reference = {
      referenceType, referenceId: record._id,
      invoiceNo: referenceType === "Sale" ? record.invoiceNo : (record.purchaseNo || record.invoiceNo),
      referenceDate: record.date,
      partyName: referenceType === "Sale" ? (record.customer?.name || record.customerName || "Walk-in") : (record.vendor?.name || record.vendor?.company || "Vendor"),
      product: item.product?._id || item.product,
      productName: item.productName || item.product?.name || "Product",
      productDescription: item.description || item.product?.description || "",
    };
    } else {
      if (!clean(req.body.partyName) || !clean(req.body.productName)) fail("Customer name and product are required.");
      reference = { partyName:clean(req.body.partyName), productName:clean(req.body.productName), productDescription:clean(req.body.productDescription) };
    }
    const receivedAt = dateValue(req.body.receivedAt);
    if (receivedAt > new Date()) fail("Received time cannot be in the future.");
    const employee = req.body.assignedEmployee ? await employeeValue(req.body.assignedEmployee) : null;
    const stage = employee ? "Assigned" : "New";
    const timeline = [event(req, "Received", receivedAt, { notes:complaint, stage:"New" })];
    if (employee) timeline.push(event(req, "Assigned", new Date(), { employee:employee._id, employeeName:employee.name, stage, notes:"Initial assignment" }));
    const saved = await Complaint.create({
      ...reference, referenceType, complaint, receivedAt, stage,
      externalComplaintNo:clean(req.body.externalComplaintNo), source:req.body.source || "Email",
      emailReference:clean(req.body.emailReference), phone:clean(req.body.phone), email:clean(req.body.email), address:clean(req.body.address),
      modelNumber:clean(req.body.modelNumber), serialNumber:clean(req.body.serialNumber),
      assignedEmployee:employee?._id, assignedEmployeeName:employee?.name, timeline,
      priority: req.body.priority || "Medium",
      createdBy: req.user?._id, createdByName: req.user?.name || req.user?.username || "Staff",
    });
    await logActivity(req, { action: "created", entityType: "Complaint", entityId: saved._id, entityLabel: saved.complaintNo, summary: `Created complaint ${saved.complaintNo} for ${saved.invoiceNo || saved.externalComplaintNo}`, changes: [{ field: "status", before: null, after: "Active" }] });
    res.status(201).json({ success: true, data: saved, message: "Complaint added successfully" });
  } catch (err) { respondError(res, err); }
};

exports.solveComplaint = async (req, res) => {
  req.body = { ...req.body, type:"Closed", notes:req.body.resolution, workDone:req.body.workDone || req.body.resolution, occurredAt:req.body.resolvedAt || req.body.occurredAt };
  return exports.addTimelineEvent(req, res);
};

exports.getEmployees = async (req, res) => {
  try {
    res.json({ success:true, data:await Employee.find({ status:"Active" }).select("name role warehouse").populate("warehouse", "name").sort({ name:1 }) });
  } catch (err) { respondError(res, err); }
};

exports.addTimelineEvent = async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Complaint management permission required" });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    const body = req.body;
    const type = body.type;
    if (!["Assigned", "Visit Scheduled", "Visit Report", "Work Update", "Note", "Closed", "Reopened"].includes(type)) fail("Invalid timeline action.");
    if (complaint.status === "Solved" && type !== "Reopened") fail("Reopen the ticket before adding an update.");
    if (complaint.status !== "Solved" && type === "Reopened") fail("This ticket is already open.");
    const occurredAt = dateValue(body.occurredAt);
    if (occurredAt > new Date()) fail("Report time cannot be in the future. Use the scheduled visit field for a future visit.");
    if (occurredAt.getTime() + 60000 <= new Date(complaint.receivedAt || complaint.createdAt).getTime()) fail("Report time cannot be before the complaint was received.");
    const fields = {};
    for (const key of ["notes", "problemFound", "workDone", "partsUsed", "nextAction", "customerFeedback"]) fields[key] = clean(body[key]);
    if (["Note", "Reopened"].includes(type) && !fields.notes) fail("Enter a note or reason for reopening.");
    if (!complaint.timeline.length) {
      complaint.timeline.push(event(req, "Received", complaint.receivedAt || complaint.createdAt, { notes:complaint.complaint, actor:complaint.createdBy, actorName:complaint.createdByName, stage:"New" }));
      if (complaint.status === "Solved") complaint.timeline.push(event(req, "Closed", complaint.resolvedAt || complaint.updatedAt, { notes:complaint.resolution, workDone:complaint.resolution, actor:complaint.resolvedBy, actorName:complaint.resolvedByName, stage:"Closed" }));
    }
    if (type === "Assigned") {
      const employee = await employeeValue(body.employee);
      if (String(complaint.assignedEmployee) === String(employee._id)) fail("This employee is already assigned.");
      fields.previousEmployeeName = complaint.assignedEmployeeName;
      complaint.assignedEmployee = employee._id;
      complaint.assignedEmployeeName = employee.name;
      if (["New", "Assigned"].includes(complaint.stage)) complaint.stage = "Assigned";
    }
    if (["Visit Scheduled", "Visit Report", "Work Update", "Closed"].includes(type) && !complaint.assignedEmployee) fail("Assign an employee first.");
    fields.employee = complaint.assignedEmployee;
    fields.employeeName = complaint.assignedEmployeeName;
    if (type === "Visit Scheduled") {
      fields.scheduledAt = dateValue(body.scheduledAt, null);
      if (fields.scheduledAt < occurredAt) fail("Scheduled visit must be after the report time.");
      complaint.stage = "Visit Scheduled";
    }
    if (["Visit Report", "Work Update"].includes(type)) {
      if (!fields.workDone) fail("Enter a brief work report.");
      const stage = body.stage || "In Progress";
      if (!["In Progress", "Waiting for Parts", "Waiting for Customer"].includes(stage)) fail("Invalid work status.");
      complaint.stage = stage;
    }
    if (type === "Closed") {
      if (!fields.workDone) fail("A final work and resolution report is required to close the ticket.");
      complaint.status = "Solved";
      complaint.stage = "Closed";
      complaint.resolution = fields.workDone;
      complaint.resolvedAt = occurredAt;
      complaint.resolvedBy = req.user?._id;
      complaint.resolvedByName = req.user?.name || req.user?.username;
    }
    if (type === "Reopened") {
      complaint.status = "Active";
      complaint.stage = complaint.assignedEmployee ? "Assigned" : "New";
      complaint.resolution = undefined;
      complaint.resolvedAt = undefined;
      complaint.resolvedBy = undefined;
      complaint.resolvedByName = undefined;
    }
    fields.stage = complaint.stage;
    complaint.timeline.push(event(req, type === "Assigned" && fields.previousEmployeeName ? "Reassigned" : type, occurredAt, fields));
    await complaint.save();
    await logActivity(req, { action:"updated", entityType:"Complaint", entityId:complaint._id, entityLabel:complaint.complaintNo, summary:`${type}: ${complaint.complaintNo}` });
    res.json({ success: true, data: complaint, message: "Ticket timeline updated" });
  } catch (err) { respondError(res, err); }
};
