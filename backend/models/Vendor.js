const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    company:        { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },
    email:          { type: String, trim: true, lowercase: true },
    city:           { type: String, trim: true },
    address:        { type: String, trim: true },
    gstin:          { type: String, trim: true },
    status:         { type: String, enum: ["Active","Inactive","Pending"], default: "Active" },
    totalPurchased: { type: Number, default: 0 },
    totalPaid:      { type: Number, default: 0 },
    totalReceived:  { type: Number, default: 0 },
    notes:          { type: String },
  },
  { timestamps: true }
);

vendorSchema.virtual("amountPayable").get(function () {
  return Math.max(0, this.totalPurchased - this.totalPaid);
});
vendorSchema.virtual("amountReceivable").get(function () {
  return Math.max(0, this.totalReceived);
});
vendorSchema.set("toJSON",   { virtuals: true });
vendorSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Vendor", vendorSchema);
