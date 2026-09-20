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
  deletePurchase,
  updatePurchasePayment,
  payForSale,
  updateSaleDetails,
  deleteSale,
  getOrders,
  createOrder,
  updateOrder,
  payForOrder,
  updateOrderPaymentRecord,
  convertOrderToSale,
  getQuotations,
  createQuotation,
  updateQuotation,
  convertQuotationToOrder,
  updateSalePaymentRecord,
} = require("../controllers/salesController");

// Purchases
router.get("/purchases/all", getPurchases);
router.post("/purchases", createPurchase);
router.put("/purchases/:id", updatePurchase);
router.delete("/purchases/:id", deletePurchase);
router.patch("/purchases/:id/payment", updatePurchasePayment);

// Sales
router.get("/quotations/all", getQuotations);
router.post("/quotations", createQuotation);
router.put("/quotations/:id", updateQuotation);
router.post("/quotations/:id/convert", convertQuotationToOrder);
router.get("/orders/all", getOrders);
router.post("/orders", createOrder);
router.put("/orders/:id", updateOrder);
router.patch("/orders/:id/pay", payForOrder);
router.put("/orders/:id/payments/:paymentId", updateOrderPaymentRecord);
router.post("/orders/:id/convert", convertOrderToSale);
router.get("/", getSales);
router.get("/gst-report", getGSTReport);
router.get("/staff-report", getStaffSalesReport);
router.post("/", createSale);
router.patch("/:id/payment", updateSalePayment);
router.patch("/:id/cancel", cancelSale);
router.patch("/:saleId/pay", payForSale);          // proper pay endpoint
router.put("/:saleId/payments/:paymentId", updateSalePaymentRecord);
router.put("/:id/details", updateSaleDetails);      // edit notes / status
router.delete("/:id", deleteSale);
router.get("/:id", getSaleById);

module.exports = router;
