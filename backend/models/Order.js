const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: String,
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
});

const orderSchema = new mongoose.Schema({
  orderNo: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  customerName: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdByName: String,
  salesEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  salesEmployeeName: { type: String, trim: true },
  saleType: { type: String, enum: ["GST Invoice", "Cash Sale"], default: "GST Invoice" },
  paymentMode: { type: String, default: "Credit" },
  date: { type: Date, default: Date.now },
  items: [orderItemSchema],
  subtotal: { type: Number, default: 0 },
  billingSubtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  transportTotal: { type: Number, default: 0 },
  totalGST: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  isInterState: { type: Boolean, default: false },
  notes: String,
  invoiceDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Open", "Converted", "Cancelled"], default: "Open" },
  convertedSale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
  convertedAt: Date,
}, { timestamps: true });

orderSchema.pre("save", async function (next) {
  if (!this.orderNo) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNo = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
  this.subtotal = this.items.reduce((sum, item) => sum + (+item.total || 0) + (+item.discountAmount || 0), 0);
  this.billingSubtotal = this.items.reduce((sum, item) => sum + (+item.billingTotal || 0), 0);
  this.totalDiscount = this.items.reduce((sum, item) => sum + (+item.discountAmount || 0), 0);
  this.transportTotal = this.items.reduce((sum, item) => sum + (+item.transportAmount || 0), 0);
  this.totalGST = this.items.reduce((sum, item) => sum + (+item.gstAmount || 0) + (+item.transportGstAmount || 0), 0);
  this.grandTotal = this.subtotal - this.totalDiscount + this.transportTotal + this.totalGST;
  next();
});

module.exports = mongoose.model("Order", orderSchema);
