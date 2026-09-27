const express = require("express");
const { lookupInvoice, getComplaints, createComplaint, solveComplaint, getEmployees, addTimelineEvent } = require("../controllers/complaintController");
const router = express.Router();
router.use((req, res, next) => {
  const allowed = key => req.user?.permissions?.get?.(key) === true || req.user?.permissions?.[key] === true;
  if (req.user?.role === "admin" || allowed("complaints_view") || allowed("complaints_manage")) return next();
  res.status(403).json({ success:false, message:"Complaint access permission required" });
});

router.get("/employees", getEmployees);
router.get("/invoice", lookupInvoice);
router.get("/", getComplaints);
router.post("/", createComplaint);
router.patch("/:id/solve", solveComplaint);
router.post("/:id/timeline", addTimelineEvent);

module.exports = router;
