const mongoose = require("mongoose");

const quotationPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  appliedAmount: { type: Number, min: 0, default: 0 },
  advanceAmount: { type: Number, min: 0, default: 0 },
  paymentMode: { type: String, default: "Cash" },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  recordedByName: { type: String, trim: true },
}, { _id: true });

const quotationItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: String,
  hsnCode: { type: String, trim: true },
  description: { type: String, trim: true },
  qty: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  billingRate: { type: Number, default: 0 },
  billingTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  warehouse: { type: String, trim: true, default: "Main Warehouse" },
  gstRate: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  transportAmount: { type: Number, default: 0 },
  transportGstRate: { type: Number, default: 0 },
  transportGstAmount: { type: Number, default: 0 },
  productType: { type: String, enum: ["Manufacturing", "Imported"], default: "Manufacturing" },
});

const quotationSchema = new mongoose.Schema({
  quotationNo: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  customerName: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdByName: String,
  salesEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  salesEmployeeName: String,
  saleType: { type: String, enum: ["GST Invoice", "Cash Sale"], default: "GST Invoice" },
  paymentMode: { type: String, default: "Credit" },
  date: { type: Date, default: Date.now },
  items: [quotationItemSchema],
  subtotal: { type: Number, default: 0 },
  billingSubtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  transportTotal: { type: Number, default: 0 },
  totalGST: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  payments: { type: [quotationPaymentSchema], default: [] },
  isInterState: { type: Boolean, default: false },
  notes: String,
  invoiceDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Draft", "Converted", "Cancelled"], default: "Draft" },
  convertedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  convertedAt: Date,
}, { timestamps: true });

quotationSchema.pre("save", async function(next) {
  if (!this.quotationNo) {
    const count = await mongoose.model("Quotation").countDocuments();
    this.quotationNo = `QTN-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
  this.subtotal = this.items.reduce((sum, item) => sum + (+item.total || 0) + (+item.discountAmount || 0), 0);
  this.billingSubtotal = this.items.reduce((sum, item) => sum + (+item.billingTotal || 0), 0);
  this.totalDiscount = this.items.reduce((sum, item) => sum + (+item.discountAmount || 0), 0);
  this.transportTotal = this.items.reduce((sum, item) => sum + (+item.transportAmount || 0), 0);
  this.totalGST = this.items.reduce((sum, item) => sum + (+item.gstAmount || 0) + (+item.transportGstAmount || 0), 0);
  this.grandTotal = this.subtotal - this.totalDiscount + this.transportTotal + this.totalGST;
  next();
});

module.exports = mongoose.model("Quotation", quotationSchema);
