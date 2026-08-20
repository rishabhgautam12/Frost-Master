const express = require("express");
const router  = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  recordPayment,
  payForSale,
} = require("../controllers/customerController");

router.get("/",                        getCustomers);
router.get("/:id",                     getCustomerById);
router.post("/",                       createCustomer);
router.put("/:id",                     updateCustomer);
router.delete("/:id",                  deleteCustomer);
router.post("/payment",                recordPayment);          // legacy
router.patch("/sales/:saleId/pay",     payForSale);             // ← new proper endpoint
module.exports = router;
