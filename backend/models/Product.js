const mongoose = require("mongoose");

const warehouseStockSchema = new mongoose.Schema(
  {
    warehouse: { type: String, required: true, trim: true },
    stock:     { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    modelNumber:   { type: String, required: true, trim: true, unique: true },
    brand:         { type: String, trim: true },
    vendor:        { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    purchasePrice: { type: Number, required: true, min: 0, default: 0 },
    sellingPrice:  { type: Number, required: false, min: 0, default: 0 },
    stock:         { type: Number, default: 0 },
    warehouses:    { type: [warehouseStockSchema], default: [] },
    minStockAlert: { type: Number, default: 5 },
    unit:          { type: String, default: "pcs" },
    description:   { type: String },
    isActive:      { type: Boolean, default: true },
    gstRate:       { type: Number, default: 18 },
  },
  { timestamps: true }
);

productSchema.virtual("profitMargin").get(function () {
  if (this.purchasePrice === 0) return 0;
  return (((this.sellingPrice - this.purchasePrice) / this.purchasePrice) * 100).toFixed(2);
});

productSchema.pre("save", function (next) {
  if (Array.isArray(this.warehouses) && this.warehouses.length > 0) {
    this.stock = this.warehouses.reduce((sum, row) => sum + (+row.stock || 0), 0);
  }
  next();
});

productSchema.set("toJSON",   { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
