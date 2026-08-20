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
} = require("../controllers/salesController");

// Purchases
router.get("/purchases/all", getPurchases);
router.post("/purchases", createPurchase);
router.put("/purchases/:id", updatePurchase);
router.patch("/purchases/:id/payment", updatePurchasePayment);

// Sales
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
