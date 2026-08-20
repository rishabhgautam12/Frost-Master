const mongoose = require("mongoose");

const salaryPaymentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Cheque"],
      default: "Cash",
    },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

salaryPaymentSchema.index({ employee: 1, month: 1, date: -1 });
salaryPaymentSchema.index({ warehouse: 1, month: 1 });

module.exports = mongoose.model("SalaryPayment", salaryPaymentSchema);
