const express = require("express");
const router = express.Router();
const {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  addSalaryChange,
  deleteSalaryChange,
  saveAttendance,
  addSalaryPayment,
  updateSalaryPayment,
  deleteSalaryPayment,
  setSalaryLock,
} = require("../controllers/employeeController");

router.get("/warehouses", getWarehouses);
router.post("/warehouses", createWarehouse);
router.put("/warehouses/:id", updateWarehouse);
router.delete("/warehouses/:id", deleteWarehouse);

router.get("/", getEmployees);
router.post("/", createEmployee);
router.get("/:id", getEmployeeById);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);
router.post("/:id/salary-history", addSalaryChange);
router.delete("/:id/salary-history/:entryId", deleteSalaryChange);
router.put("/:id/attendance", saveAttendance);
router.put("/:id/salary-lock", setSalaryLock);
router.post("/:id/payments", addSalaryPayment);
router.put("/:id/payments/:paymentId", updateSalaryPayment);
router.delete("/:id/payments/:paymentId", deleteSalaryPayment);

module.exports = router;
