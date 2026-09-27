const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  complaintNo: { type: String, unique: true },
  referenceType: { type: String, enum: ["External", "Sale", "Purchase"], default: "External" },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  invoiceNo: { type: String, trim: true },
  externalComplaintNo: { type: String, trim: true },
  source: { type: String, enum: ["Email", "Phone", "Walk-in", "Other"], default: "Email" },
  emailReference: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  modelNumber: { type: String, trim: true },
  serialNumber: { type: String, trim: true },
  receivedAt: { type: Date },
  stage: { type: String, enum: ["New", "Assigned", "Visit Scheduled", "In Progress", "Waiting for Parts", "Waiting for Customer", "Closed"], default: "New" },
  assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  assignedEmployeeName: String,
  timeline: { type: [new mongoose.Schema({
    type: { type: String, required: true },
    occurredAt: { type: Date, required: true },
    recordedAt: { type: Date, default: Date.now },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    employeeName: String,
    previousEmployeeName: String,
    stage: String,
    notes: String,
    problemFound: String,
    workDone: String,
    partsUsed: String,
    nextAction: String,
    scheduledAt: Date,
    customerFeedback: String,
  })], default: [] },
  referenceDate: { type: Date },
  partyName: { type: String, trim: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: { type: String, required: true, trim: true },
  productDescription: { type: String, trim: true },
  complaint: { type: String, required: true, trim: true },
  priority: { type: String, enum: ["Low", "Medium", "High", "Urgent"], default: "Medium" },
  status: { type: String, enum: ["Active", "Solved"], default: "Active" },
  resolution: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdByName: String,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedByName: String,
  resolvedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });

complaintSchema.pre("save", async function (next) {
  if (!this.complaintNo) {
    this.complaintNo = `CMP-${new Date().getFullYear()}-${this._id.toString().slice(-12).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model("Complaint", complaintSchema);
