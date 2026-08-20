const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");
require("dotenv").config();

const connectDB      = require("./config/db");
const errorHandler   = require("./middleware/errorHandler");
const { protect }    = require("./middleware/auth");

const authRoutes      = require("./routes/authRoutes");
const vendorRoutes    = require("./routes/vendorRoutes");
const productRoutes   = require("./routes/productRoutes");
const customerRoutes  = require("./routes/customerRoutes");
const salesRoutes     = require("./routes/salesRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const employeeRoutes  = require("./routes/employeeRoutes");

connectDB();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Public
app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "Frost Master API 🚀", timestamp: new Date() })
);
app.use("/api/auth", authRoutes);

// Protected — every route below requires a valid JWT
app.use("/api/vendors",   protect, vendorRoutes);
app.use("/api/products",  protect, productRoutes);
app.use("/api/customers", protect, customerRoutes);
app.use("/api/sales",     protect, salesRoutes);
app.use("/api/dashboard", protect, dashboardRoutes);
app.use("/api/employees", protect, employeeRoutes);

app.use("*", (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Frost Master Server → http://localhost:${PORT}`);
  console.log(`🔐 Auth protected. Seed with:  node seed.js\n`);
});
