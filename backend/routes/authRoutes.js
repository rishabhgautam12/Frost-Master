const express = require("express");
const router  = express.Router();
const { login, getMe, getStaff, createStaff, updateStaff, deleteStaff, getActivityLogs } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/login",         login);
router.get("/me",   protect,  getMe);

// Staff management — all require auth (admin check is inside controller)
router.get("/staff",          protect, getStaff);
router.post("/staff",         protect, createStaff);
router.put("/staff/:id",      protect, updateStaff);
router.delete("/staff/:id",   protect, deleteStaff);
router.get("/activity-logs",   protect, getActivityLogs);

module.exports = router;
