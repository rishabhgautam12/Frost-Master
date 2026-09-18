const mongoose = require("mongoose");

// One row per salary change. `effectiveFrom` ("YYYY-MM") is the first salary
// month this row applies to; it keeps applying until a later row takes over.
// This lets a salary change made "today" apply only from a chosen month
// onward, without rewriting what was earned in past months.
const salaryHistorySchema = new mongoose.Schema(
  {
    effectiveFrom: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    monthlySalary: { type: Number, required: true, min: 0 },
    manufacturingIncentivePercent: { type: Number, min: 0, max: 100, default: 0 },
    importedIncentivePercent: { type: Number, min: 0, max: 100, default: 0 },
    note: { type: String, trim: true },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },
    role: { type: String, trim: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    // Current salary/incentive — always mirrors the latest salaryHistory row.
    // Kept top-level for quick reads (lists, forms); the source of truth for
    // what applied in a given month is salaryHistory.
    monthlySalary: { type: Number, required: true, min: 0, default: 0 },
    incentivePercent: { type: Number, min: 0, max: 100, default: 0 },
    manufacturingIncentivePercent: { type: Number, min: 0, max: 100, default: 0 },
    importedIncentivePercent: { type: Number, min: 0, max: 100, default: 0 },
    salaryHistory: { type: [salaryHistorySchema], default: [] },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

employeeSchema.index({ warehouse: 1, status: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
