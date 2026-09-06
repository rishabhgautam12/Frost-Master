const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String },
  description: { type: String, trim: true },
  qty: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true },       // selling price at time of sale
  discount: { type: Number, default: 0, min: 0, max: 100 }, // percentage
  discountAmount: { type: Number, default: 0, min: 0 },
  total: { type: Number },                        // taxable amount after discount
  billingRate: { type: Number, default: 0 },
  billingTotal: { type: Number, default: 0 },
  warehouse: { type: String, trim: true },
  gstRate: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  transportAmount: { type: Number, default: 0 },
  transportGstRate: { type: Number, default: 0 },
  transportGstAmount: { type: Number, default: 0 },
});

const salePaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, enum: ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"], default: "Cash" },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  recordedByName: { type: String, trim: true },
}, { _id: true });

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String },               // for walk-in / cash sales
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    soldByName: { type: String },
    saleType: {
      type: String,
      enum: ["GST Invoice", "Cash Sale"],
      default: "GST Invoice",
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank Transfer", "Credit", "Cheque", "Multiple"],
      default: "Cash",
    },
    date: { type: Date, default: Date.now },
    items: [saleItemSchema],
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    billingSubtotal: { type: Number, default: 0 },
    transportTotal: { type: Number, default: 0 },
    totalGST: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    payments: { type: [salePaymentSchema], default: [] },
    amountDue: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    isInterState: { type: Boolean, default: false },
    notes: { type: String },
    invoiceDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["Paid", "Partial", "Pending", "Cancelled"],
      default: "Pending",
    },
    sourceOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: true }
);

// Auto-generate invoice number
saleSchema.pre("save", async function (next) {
  if (!this.invoiceNo) {
    const count = await mongoose.model("Sale").countDocuments();
    const yr = new Date().getFullYear();
    this.invoiceNo = `INV-${yr}-${String(count + 1).padStart(4, "0")}`;
  }
  // Calculate totals
  this.subtotal = this.items.reduce((s, i) => s + i.total + (i.discountAmount || 0), 0);
  this.totalDiscount = this.items.reduce((s, i) => s + (i.discountAmount || 0), 0);
  this.billingSubtotal = this.items.reduce((s, i) => s + (+i.billingTotal || 0), 0);
  this.transportTotal = this.items.reduce((s, i) => s + (+i.transportAmount || 0), 0);
  this.totalGST = this.items.reduce((s, i) => s + (+i.gstAmount || 0) + (+i.transportGstAmount || 0), 0);
  this.grandTotal = this.subtotal - this.totalDiscount + this.transportTotal + this.totalGST;
  if (this.isInterState) {
    this.igst = this.totalGST;
    this.cgst = 0;
    this.sgst = 0;
  } else {
    this.cgst = this.totalGST / 2;
    this.sgst = this.totalGST / 2;
    this.igst = 0;
  }
  this.amountDue = Math.max(0, this.grandTotal - this.amountPaid);
  if (this.status !== "Cancelled") {
    if (this.amountPaid >= this.grandTotal) this.status = "Paid";
    else if (this.amountPaid > 0) this.status = "Partial";
    else this.status = "Pending";
  }
  next();
});

module.exports = mongoose.model("Sale", saleSchema);
