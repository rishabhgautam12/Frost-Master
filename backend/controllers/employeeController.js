const Warehouse = require("../models/Warehouse");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const SalaryPayment = require("../models/SalaryPayment");
const SalaryLock = require("../models/SalaryLock");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const Sale = require("../models/Sale");
const { createdChanges, logActivity, toChanges } = require("../utils/auditLogger");

const warehouseFields = ["name", "location", "notes", "isActive"];
const employeeFields = ["name", "phone", "role", "warehouse", "monthlySalary", "joiningDate", "status", "notes"];

function requireAdmin(req, res) {
  if (req.user.role !== "admin") {
    res.status(403).json({ success: false, message: "Admin access required" });
    return false;
  }
  return true;
}

function monthKeyFromDate(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(month) {
  const key = /^\d{4}-\d{2}$/.test(month || "") ? month : monthKeyFromDate();
  const [year, monthNo] = key.split("-").map(Number);
  return { key, year, monthIndex: monthNo - 1 };
}

function monthDates(month) {
  const { key, year, monthIndex } = parseMonth(month);
  const total = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: total }, (_, idx) => {
    const date = new Date(year, monthIndex, idx + 1);
    date.setHours(0, 0, 0, 0);
    return { date, key: dateKey(date) };
  });
}

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value) {
  const [year, monthNo, day] = String(value).slice(0, 10).split("-").map(Number);
  const date = new Date(year, monthNo - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function paidUnits(status) {
  if (!status) return 0;
  if (status === "Absent") return 0;
  if (status === "Half Day") return 0.5;
  return 1;
}

function compareMonth(a, b) {
  return a.localeCompare(b);
}

function nextMonthKey(month) {
  const { year, monthIndex } = parseMonth(month);
  return monthKeyFromDate(new Date(year, monthIndex + 1, 1));
}

function firstSalaryMonth(employee) {
  return monthKeyFromDate(employee.joiningDate || employee.createdAt || new Date());
}

async function earnedForMonth(employee, month) {
  const dates = monthDates(month);
  const attendanceRows = await Attendance.find({ employee: employee._id, month }).lean();
  const attendanceByDate = new Map(
    attendanceRows.map((row) => [dateKey(row.date), row])
  );
  const joining = employee.joiningDate ? new Date(employee.joiningDate) : null;
  if (joining) joining.setHours(0, 0, 0, 0);

  const days = dates.map((row) => {
    const beforeJoining = joining && row.date < joining;
    const saved = attendanceByDate.get(row.key);
    const status = beforeJoining ? "" : (saved?.status || "");
    return {
      date: row.key,
      status,
      notes: saved?.notes || "",
      isSaved: !!saved,
    };
  });

  const present = days.filter((d) => d.status === "Present").length;
  const absent = days.filter((d) => d.status === "Absent").length;
  const halfDay = days.filter((d) => d.status === "Half Day").length;
  const paidLeave = days.filter((d) => d.status === "Paid Leave").length;
  const payableUnits = days.reduce((sum, d) => sum + paidUnits(d.status), 0);
  const dailyRate = dates.length ? ((+employee.monthlySalary || 0) / dates.length) : 0;
  const salaryEarned = Math.round(payableUnits * dailyRate * 100) / 100;

  return {
    totalDays: dates.length,
    present,
    absent,
    halfDay,
    paidLeave,
    payableUnits,
    salaryEarned,
    days,
  };
}

async function getOpeningBalance(employee, month) {
  let cursor = firstSalaryMonth(employee);
  let earned = 0;

  while (compareMonth(cursor, month) < 0) {
    const summary = await earnedForMonth(employee, cursor);
    earned += summary.salaryEarned;
    cursor = nextMonthKey(cursor);
  }

  const payments = await SalaryPayment.find({
    employee: employee._id,
    month: { $lt: month },
  }).lean();
  const paid = payments.reduce((sum, payment) => sum + (+payment.amount || 0), 0);
  return Math.max(0, Math.round((earned - paid) * 100) / 100);
}

async function getSalarySummary(employee, month) {
  const earned = await earnedForMonth(employee, month);
  const openingBalance = await getOpeningBalance(employee, month);

  const payments = await SalaryPayment.find({ employee: employee._id, month })
    .sort({ date: -1 })
    .lean();
  const totalPaid = payments.reduce((sum, payment) => sum + (+payment.amount || 0), 0);
  const grossDue = openingBalance + earned.salaryEarned;
  const lock = await SalaryLock.findOne({ employee: employee._id, month }).lean();

  return {
    month,
    totalDays: earned.totalDays,
    present: earned.present,
    absent: earned.absent,
    halfDay: earned.halfDay,
    paidLeave: earned.paidLeave,
    payableUnits: earned.payableUnits,
    monthlySalary: employee.monthlySalary,
    salaryEarned: earned.salaryEarned,
    openingBalance,
    grossDue,
    totalPaid,
    dueAmount: Math.max(0, Math.round((grossDue - totalPaid) * 100) / 100),
    isLocked: !!lock?.isLocked,
    lockedAt: lock?.lockedAt || null,
    days: earned.days,
    payments,
  };
}

async function isSalaryMonthLocked(employeeId, month) {
  const lock = await SalaryLock.findOne({ employee: employeeId, month }).lean();
  return !!lock?.isLocked;
}

exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ isActive: -1, name: 1 });
    res.json({ success: true, data: warehouses });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createWarehouse = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const warehouse = await Warehouse.create(req.body);
    await logActivity(req, {
      action: "created",
      entityType: "Warehouse",
      entityId: warehouse._id,
      entityLabel: warehouse.name,
      summary: `Created warehouse ${warehouse.name}`,
      changes: createdChanges(warehouse, warehouseFields),
    });
    res.status(201).json({ success: true, data: warehouse, message: "Warehouse created" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateWarehouse = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const before = await Warehouse.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, message: "Warehouse not found" });
    const oldName = before.name;
    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (req.body.name && req.body.name !== oldName) {
      await Promise.all([
        Product.updateMany(
          { "warehouses.warehouse": oldName },
          { $set: { "warehouses.$[row].warehouse": warehouse.name } },
          { arrayFilters: [{ "row.warehouse": oldName }] }
        ),
        Purchase.updateMany(
          { "items.warehouse": oldName },
          { $set: { "items.$[row].warehouse": warehouse.name } },
          { arrayFilters: [{ "row.warehouse": oldName }] }
        ),
        Sale.updateMany(
          { "items.warehouse": oldName },
          { $set: { "items.$[row].warehouse": warehouse.name } },
          { arrayFilters: [{ "row.warehouse": oldName }] }
        ),
      ]);
    }
    const changes = toChanges(before, warehouse, warehouseFields);
    if (changes.length) {
      await logActivity(req, {
        action: "updated",
        entityType: "Warehouse",
        entityId: warehouse._id,
        entityLabel: warehouse.name,
        summary: `Updated warehouse ${warehouse.name}`,
        changes,
      });
    }
    res.json({ success: true, data: warehouse, message: "Warehouse updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ success: false, message: "Warehouse not found" });

    const [employeeCount, productCount, purchaseCount, saleCount] = await Promise.all([
      Employee.countDocuments({ warehouse: warehouse._id }),
      Product.countDocuments({ "warehouses.warehouse": warehouse.name }),
      Purchase.countDocuments({ "items.warehouse": warehouse.name }),
      Sale.countDocuments({ "items.warehouse": warehouse.name }),
    ]);
    const used = employeeCount + productCount + purchaseCount + saleCount;
    if (used > 0) {
      return res.status(400).json({
        success: false,
        message: "This warehouse is already used in employees/products/sales/purchases. Move or rename records before deleting.",
      });
    }

    await warehouse.deleteOne();
    await logActivity(req, {
      action: "deleted",
      entityType: "Warehouse",
      entityId: warehouse._id,
      entityLabel: warehouse.name,
      summary: `Deleted warehouse ${warehouse.name}`,
      changes: warehouseFields.map((field) => ({ field, before: warehouse[field], after: null })),
    });
    res.json({ success: true, message: "Warehouse deleted" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getEmployees = async (req, res) => {
  try {
    const { warehouse, status = "Active", search } = req.query;
    const filter = {};
    if (warehouse && warehouse !== "all") filter.warehouse = warehouse;
    if (status && status !== "all") filter.status = status;
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { role: { $regex: search, $options: "i" } },
    ];
    const employees = await Employee.find(filter).populate("warehouse", "name location").sort({ name: 1 });
    res.json({ success: true, data: employees });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createEmployee = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const employee = await Employee.create(req.body);
    await employee.populate("warehouse", "name location");
    await logActivity(req, {
      action: "created",
      entityType: "Employee",
      entityId: employee._id,
      entityLabel: employee.name,
      summary: `Created employee ${employee.name}`,
      changes: createdChanges(employee, employeeFields),
    });
    res.status(201).json({ success: true, data: employee, message: "Employee created" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateEmployee = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const before = await Employee.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, message: "Employee not found" });
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate("warehouse", "name location");
    const changes = toChanges(before, employee, employeeFields);
    if (changes.length) {
      await logActivity(req, {
        action: "updated",
        entityType: "Employee",
        entityId: employee._id,
        entityLabel: employee.name,
        summary: `Updated employee ${employee.name}`,
        changes,
      });
    }
    res.json({ success: true, data: employee, message: "Employee updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteEmployee = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    await Promise.all([
      Attendance.deleteMany({ employee: employee._id }),
      SalaryPayment.deleteMany({ employee: employee._id }),
    ]);
    await employee.deleteOne();
    await logActivity(req, {
      action: "deleted",
      entityType: "Employee",
      entityId: employee._id,
      entityLabel: employee.name,
      summary: `Deleted employee ${employee.name}`,
      changes: employeeFields.map((field) => ({ field, before: employee[field], after: null })),
    });
    res.json({ success: true, message: "Employee deleted" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const month = parseMonth(req.query.month).key;
    const employee = await Employee.findById(req.params.id).populate("warehouse", "name location");
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    const salary = await getSalarySummary(employee, month);
    res.json({ success: true, data: { employee, salary } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.saveAttendance = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    const { month, days = [] } = req.body;
    const parsed = parseMonth(month).key;
    if (await isSalaryMonthLocked(employee._id, parsed)) {
      return res.status(400).json({
        success: false,
        message: "This month is locked. Unlock it before changing attendance.",
      });
    }
    const validStatuses = new Set(["Present", "Absent", "Half Day", "Paid Leave"]);

    for (const day of days) {
      if (!day.date || !validStatuses.has(day.status)) continue;
      const date = parseDateKey(day.date);
      await Attendance.findOneAndUpdate(
        { employee: employee._id, date },
        {
          employee: employee._id,
          warehouse: employee.warehouse,
          date,
          month: parsed,
          status: day.status,
          notes: day.notes || "",
          markedBy: req.user?._id,
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    const salary = await getSalarySummary(employee, parsed);
    await logActivity(req, {
      action: "updated",
      entityType: "Attendance",
      entityId: employee._id,
      entityLabel: employee.name,
      summary: `Saved attendance for ${employee.name} (${parsed})`,
      changes: [{ field: "month", before: null, after: parsed }],
      metadata: { employee: employee._id, month: parsed, days: days.length },
    });
    res.json({ success: true, data: salary, message: "Attendance saved" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.addSalaryPayment = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    const { month, amount, paymentMode, date, notes } = req.body;
    const parsed = parseMonth(month).key;
    if (await isSalaryMonthLocked(employee._id, parsed)) {
      return res.status(400).json({ success: false, message: "This month is locked. Unlock it before adding payment." });
    }
    const summary = await getSalarySummary(employee, parsed);
    const paying = Math.min(Math.max(0, +amount || 0), summary.dueAmount);
    if (paying <= 0) return res.status(400).json({ success: false, message: "Valid payment amount required" });

    const payment = await SalaryPayment.create({
      employee: employee._id,
      warehouse: employee.warehouse,
      month: parsed,
      amount: paying,
      paymentMode: paymentMode || "Cash",
      date: date || new Date(),
      notes: notes || "",
      paidBy: req.user?._id,
    });
    await logActivity(req, {
      action: "payment",
      entityType: "Salary",
      entityId: employee._id,
      entityLabel: employee.name,
      summary: `Paid salary ${paying.toLocaleString("en-IN")} to ${employee.name}`,
      changes: [{ field: "paid", before: summary.totalPaid, after: summary.totalPaid + paying }],
      metadata: { payment: payment._id, month: parsed, paymentMode },
    });

    const nextSummary = await getSalarySummary(employee, parsed);
    res.status(201).json({ success: true, data: nextSummary, message: "Salary payment recorded" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateSalaryPayment = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    const payment = await SalaryPayment.findOne({ _id: req.params.paymentId, employee: employee._id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const { amount, paymentMode, date, notes } = req.body;
    const parsed = parseMonth(req.body.month || payment.month).key;
    if (await isSalaryMonthLocked(employee._id, parsed) || await isSalaryMonthLocked(employee._id, payment.month)) {
      return res.status(400).json({ success: false, message: "This month is locked. Unlock it before changing payment." });
    }
    const summary = await getSalarySummary(employee, parsed);
    const maxPayable = summary.dueAmount + (payment.month === parsed ? (+payment.amount || 0) : 0);
    const paying = Math.min(Math.max(0, +amount || 0), maxPayable);
    if (paying <= 0) return res.status(400).json({ success: false, message: "Valid payment amount required" });

    const beforeAmount = payment.amount;
    payment.month = parsed;
    payment.amount = paying;
    payment.paymentMode = paymentMode || payment.paymentMode || "Cash";
    payment.date = date || payment.date || new Date();
    payment.notes = notes || "";
    payment.warehouse = employee.warehouse;
    payment.paidBy = req.user?._id || payment.paidBy;
    await payment.save();

    await logActivity(req, {
      action: "updated",
      entityType: "Salary",
      entityId: employee._id,
      entityLabel: employee.name,
      summary: `Updated salary payment for ${employee.name}`,
      changes: [{ field: "amount", before: beforeAmount, after: paying }],
      metadata: { payment: payment._id, month: parsed, paymentMode: payment.paymentMode },
    });

    const nextSummary = await getSalarySummary(employee, parsed);
    res.json({ success: true, data: nextSummary, message: "Salary payment updated" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteSalaryPayment = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    const payment = await SalaryPayment.findOne({ _id: req.params.paymentId, employee: employee._id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const parsed = payment.month;
    if (await isSalaryMonthLocked(employee._id, parsed)) {
      return res.status(400).json({ success: false, message: "This month is locked. Unlock it before deleting payment." });
    }
    const amount = payment.amount;
    await payment.deleteOne();
    await logActivity(req, {
      action: "deleted",
      entityType: "Salary",
      entityId: employee._id,
      entityLabel: employee.name,
      summary: `Deleted salary payment for ${employee.name}`,
      changes: [{ field: "amount", before: amount, after: null }],
      metadata: { payment: req.params.paymentId, month: parsed },
    });

    const nextSummary = await getSalarySummary(employee, parsed);
    res.json({ success: true, data: nextSummary, message: "Salary payment deleted" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.setSalaryLock = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    const parsed = parseMonth(req.body.month).key;
    const isLocked = req.body.isLocked === true;

    await SalaryLock.findOneAndUpdate(
      { employee: employee._id, month: parsed },
      {
        employee: employee._id,
        warehouse: employee.warehouse,
        month: parsed,
        isLocked,
        lockedBy: isLocked ? req.user?._id : undefined,
        lockedAt: isLocked ? new Date() : null,
      },
      { upsert: true, new: true, runValidators: true }
    );

    await logActivity(req, {
      action: "updated",
      entityType: "Salary",
      entityId: employee._id,
      entityLabel: employee.name,
      summary: `${isLocked ? "Locked" : "Unlocked"} salary month ${parsed} for ${employee.name}`,
      changes: [{ field: "isLocked", before: !isLocked, after: isLocked }],
      metadata: { month: parsed },
    });

    const summary = await getSalarySummary(employee, parsed);
    res.json({ success: true, data: summary, message: isLocked ? "Month locked" : "Month unlocked" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
