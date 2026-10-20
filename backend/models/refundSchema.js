const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
  requestId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  type: { type: String, enum: ["Extra Payment", "Cancellation"], required: true },
  date: { type: Date, required: true },
  method: { type: String, enum: ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"], required: true },
  notes: { type: String, required: true, trim: true },
  paymentId: mongoose.Schema.Types.ObjectId,
  allocations: [{ paymentId: mongoose.Schema.Types.ObjectId, amount: Number }],
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  recordedByName: String,
  recordedAt: { type: Date, default: Date.now },
});
