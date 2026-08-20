const mongoose = require("mongoose");

const salaryLockSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    month: { type: String, required: true },
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lockedAt: { type: Date },
  },
  { timestamps: true }
);

salaryLockSchema.index({ employee: 1, month: 1 }, { unique: true });
salaryLockSchema.index({ warehouse: 1, month: 1 });

module.exports = mongoose.model("SalaryLock", salaryLockSchema);
