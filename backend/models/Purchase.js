const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: { type: String },
  qty: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true },
  total: { type: Number },
  billingRate: { type: Number, default: 0 },
  billingTotal: { type: Number, default: 0 },
  warehouse: { type: String, trim: true, default: "Main Warehouse" },
  gstRate: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  transportAmount: { type: Number, default: 0 },
  transportGstRate: { type: Number, default: 0 },
  transportGstAmount: { type: Number, default: 0 },
});

const purchasePaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Cheque"],
      default: "Cash",
    },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNo: { type: String, unique: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    invoiceNo: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    items: [purchaseItemSchema],
    subtotal: { type: Number, default: 0 },
    billingSubtotal: { type: Number, default: 0 },
    transportTotal: { type: Number, default: 0 },
    totalGST: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    payments: { type: [purchasePaymentSchema], default: [] },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Credit", "Multiple"],
      default: "Credit",
    },
    notes: { type: String },
    status: {
      type: String,
      enum: ["Received", "Partial", "Pending", "Cancelled"],
      default: "Received",
    },
  },
  { timestamps: true }
);

purchaseSchema.pre("save", async function (next) {
  if (!this.purchaseNo) {
    const count = await mongoose.model("Purchase").countDocuments();
    this.purchaseNo = `PUR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
  this.subtotal = this.items.reduce((s, i) => s + (+i.total || 0), 0);
  this.billingSubtotal = this.items.reduce((s, i) => s + (+i.billingTotal || 0), 0);
  this.transportTotal = this.items.reduce((s, i) => s + (+i.transportAmount || 0), 0);
  this.totalGST = this.items.reduce((s, i) => s + (+i.gstAmount || 0) + (+i.transportGstAmount || 0), 0);
  this.grandTotal = this.subtotal + this.transportTotal + this.totalGST;
  if (Array.isArray(this.payments) && this.payments.length > 0) {
    this.amountPaid = Math.min(
      this.grandTotal,
      this.payments.reduce((sum, payment) => sum + (+payment.amount || 0), 0)
    );
    this.paymentMode = this.payments.length > 1 ? "Multiple" : this.payments[0].paymentMode;
  }
  if (this.status !== "Cancelled") {
    if (this.amountPaid >= this.grandTotal) this.status = "Received";
    else if (this.amountPaid > 0) this.status = "Partial";
    else this.status = "Pending";
  }
  next();
});

module.exports = mongoose.model("Purchase", purchaseSchema);
