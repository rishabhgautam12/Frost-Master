const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    date: { type: Date, required: true },
    month: { type: String, required: true },
    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "Paid Leave"],
      default: "Present",
    },
    notes: { type: String, trim: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ warehouse: 1, month: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
