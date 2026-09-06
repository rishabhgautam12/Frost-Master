const express = require("express");
const router = express.Router();
const {
  getSales,
  getSaleById,
  createSale,
  updateSalePayment,
  cancelSale,
  getGSTReport,
  getStaffSalesReport,
  getPurchases,
  createPurchase,
  updatePurchase,
  updatePurchasePayment,
  payForSale,
  updateSaleDetails,
  getOrders,
  createOrder,
  updateOrder,
  convertOrderToSale,
} = require("../controllers/salesController");

// Purchases
router.get("/purchases/all", getPurchases);
router.post("/purchases", createPurchase);
router.put("/purchases/:id", updatePurchase);
router.patch("/purchases/:id/payment", updatePurchasePayment);

// Sales
router.get("/orders/all", getOrders);
router.post("/orders", createOrder);
router.put("/orders/:id", updateOrder);
router.post("/orders/:id/convert", convertOrderToSale);
router.get("/", getSales);
router.get("/gst-report", getGSTReport);
router.get("/staff-report", getStaffSalesReport);
router.post("/", createSale);
router.patch("/:id/payment", updateSalePayment);
router.patch("/:id/cancel", cancelSale);
router.patch("/:saleId/pay", payForSale);          // proper pay endpoint
router.put("/:id/details", updateSaleDetails);      // edit notes / status
router.get("/:id", getSaleById);

module.exports = router;
