const express = require("express");
const { lookupInvoice, getComplaints, createComplaint, solveComplaint } = require("../controllers/complaintController");
const router = express.Router();

router.get("/invoice", lookupInvoice);
router.get("/", getComplaints);
router.post("/", createComplaint);
router.patch("/:id/solve", solveComplaint);

module.exports = router;
