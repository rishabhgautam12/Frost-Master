const mongoose = require("mongoose");

const vendorLedgerSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    type: {
      type: String,
      enum: ["Purchase", "Payment", "Debit Note", "Credit Note", "Return"],
      required: true,
    },
    invoiceNo: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    paid: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        qty: Number,
        rate: Number,
        total: Number,
      },
    ],
    status: {
      type: String,
      enum: ["Settled", "Partial", "Pending"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// Auto-set status before save
vendorLedgerSchema.pre("save", function (next) {
  if (this.paid >= this.amount) this.status = "Settled";
  else if (this.paid > 0) this.status = "Partial";
  else this.status = "Pending";
  next();
});

vendorLedgerSchema.virtual("balance").get(function () {
  return Math.max(0, this.amount - this.paid);
});

vendorLedgerSchema.set("toJSON", { virtuals: true });
vendorLedgerSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("VendorLedger", vendorLedgerSchema);
