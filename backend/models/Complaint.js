const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  complaintNo: { type: String, unique: true },
  referenceType: { type: String, enum: ["Sale", "Purchase"], required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  invoiceNo: { type: String, required: true, trim: true },
  referenceDate: { type: Date },
  partyName: { type: String, trim: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
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
}, { timestamps: true });

complaintSchema.pre("save", async function (next) {
  if (!this.complaintNo) {
    const count = await mongoose.model("Complaint").countDocuments();
    this.complaintNo = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Complaint", complaintSchema);
