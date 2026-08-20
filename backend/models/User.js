const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// All permission keys available in the system
const ALL_PERMISSIONS = [
  "dashboard",
  "vendors_view", "vendors_create", "vendors_edit", "vendors_delete",
  "products_view", "products_create", "products_edit", "products_delete", "products_stock",
  "customers_view", "customers_create", "customers_edit", "customers_delete",
  "sales_view", "sales_create", "sales_edit", "sales_cancel",
  "purchases_view", "purchases_create",
  "reports_gst", "reports_sales", "reports_graphs",
  "employees_view", "employees_create", "employees_edit", "employees_salary",
];

const permissionsDefault = ALL_PERMISSIONS.reduce((acc, k) => {
  acc[k] = k === "dashboard"; // dashboard on by default, everything else off
  return acc;
}, {});

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role:     { type: String, enum: ["admin", "staff"], default: "staff" },
    isActive: { type: Boolean, default: true },
    // Granular permissions — only used for role=staff, admins have all access
    permissions: {
      type: Map,
      of: Boolean,
      default: () => ({ ...permissionsDefault }),
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// Check if user can do something
userSchema.methods.can = function (permission) {
  if (this.role === "admin") return true;
  return this.permissions.get(permission) === true;
};

module.exports = mongoose.model("User", userSchema);
module.exports.ALL_PERMISSIONS = ALL_PERMISSIONS;
