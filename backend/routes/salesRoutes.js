const express = require("express");
const router = express.Router();
const { getRefunds, createRefund, protectRefundHistory } = require("../controllers/refundController");
router.get("/refunds/:kind/:id", getRefunds);
router.post("/refunds/:kind/:id", createRefund);
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
  deleteOrderPaymentRecord,
  convertOrderToSale,
  setOrderReady,
  getQuotations,
  createQuotation,
  updateQuotation,
  convertQuotationToOrder,
  updateSalePaymentRecord,
  deleteSalePaymentRecord,
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
router.put("/orders/:id", protectRefundHistory("orders"), updateOrder);
router.patch("/orders/:id/pay", payForOrder);
router.put("/orders/:id/payments/:paymentId", protectRefundHistory("orders"), updateOrderPaymentRecord);
router.delete("/orders/:id/payments/:paymentId", protectRefundHistory("orders"), deleteOrderPaymentRecord);
router.post("/orders/:id/convert", convertOrderToSale);
router.patch("/orders/:id/ready", setOrderReady);
router.get("/", getSales);
router.get("/gst-report", getGSTReport);
router.get("/staff-report", getStaffSalesReport);
router.post("/", createSale);
router.patch("/:id/payment", protectRefundHistory("sales"), updateSalePayment);
router.patch("/:id/cancel", protectRefundHistory("sales"), cancelSale);
router.patch("/:saleId/pay", payForSale);          // proper pay endpoint
router.put("/:saleId/payments/:paymentId", protectRefundHistory("sales"), updateSalePaymentRecord);
router.delete("/:saleId/payments/:paymentId", protectRefundHistory("sales"), deleteSalePaymentRecord);
router.put("/:id/details", protectRefundHistory("sales"), updateSaleDetails);      // edit notes / status
router.delete("/:id", protectRefundHistory("sales"), deleteSale);
router.get("/:id", getSaleById);

module.exports = router;
