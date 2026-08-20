const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },
    email: { type: String, trim: true, lowercase: true },
    customerType: {
      type: String,
      enum: ["Retail", "Wholesale", "VIP", "Dealer", "Online"],
      default: "Retail",
    },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    gstin: { type: String, trim: true },
    creditLimit: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Inactive", "VIP"],
      default: "Active",
    },
    notes: { type: String },
    // Running ledger totals (auto-updated on each sale)
    totalBilled: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },
  },
  { timestamps: true }
);

customerSchema.virtual("amountDue").get(function () {
  return Math.max(0, this.totalBilled - this.totalReceived);
});

customerSchema.set("toJSON", { virtuals: true });
customerSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Customer", customerSchema);
