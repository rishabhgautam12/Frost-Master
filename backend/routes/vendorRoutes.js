const express = require("express");
const router  = express.Router();
const {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  toggleVendorStatus,
  deleteVendor,
  getVendorLedger,
  addLedgerEntry,
  payLedgerEntry,
  updateVendorPayment,
} = require("../controllers/vendorController");

router.get("/",                    getVendors);
router.get("/ledger",              getVendorLedger);
router.post("/ledger",             addLedgerEntry);
router.patch("/ledger/:id/pay",    payLedgerEntry);      // ← new
router.put("/ledger/payments/:id", updateVendorPayment);
router.get("/:id",                 getVendorById);
router.post("/",                   createVendor);
router.put("/:id",                 updateVendor);
router.patch("/:id/toggle-status", toggleVendorStatus);
router.delete("/:id",              deleteVendor);

module.exports = router;
