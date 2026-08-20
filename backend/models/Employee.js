const mongoose = require("mongoose");

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
    monthlySalary: { type: Number, required: true, min: 0, default: 0 },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

employeeSchema.index({ warehouse: 1, status: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
