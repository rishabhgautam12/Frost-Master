import { useEffect, useMemo, useState } from "react";
import {
  Btn, Badge, Modal, FormGroup, FormInput, FormSelect,
  LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
} from "../components/Shared";
import { employeeAPI, salesAPI } from "../services/api";
import TransactionDetailsModal from "../components/TransactionDetailsModal";

const STATUSES = [
  { key: "Present", label: "Present", bg: "#a7f3d0", border: "#059669", color: "#064e3b" },
  { key: "Absent", label: "Absent", bg: "#fecdd3", border: "#e11d48", color: "#881337" },
  { key: "Half Day", label: "Half Day", bg: "linear-gradient(90deg,#a7f3d0 0 50%,#fde68a 50% 100%)", border: "#d97706", color: "#78350f" },
  { key: "Paid Leave", label: "Paid Leave", bg: "#c7d2fe", border: "#4f46e5", color: "#312e81" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 760 : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 760);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const money = (value) => `Rs. ${Math.round(+value || 0).toLocaleString("en-IN")}`;
const safeFileName = (value) => String(value || "attendance").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

function parseMonth(month) {
  const [year, monthNo] = month.split("-").map(Number);
  return { year, monthIndex: monthNo - 1 };
}

function shiftMonth(month, offset) {
  const { year, monthIndex } = parseMonth(month);
  return monthKey(new Date(year, monthIndex + offset, 1));
}

function monthLabel(month) {
  const { year, monthIndex } = parseMonth(month);
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

function fullCycleLabel(month) {
  const { year, monthIndex } = parseMonth(month);
  const total = new Date(year, monthIndex + 1, 0).getDate();
  return `01 ${MONTH_NAMES[monthIndex]} - ${String(total).padStart(2, "0")} ${MONTH_NAMES[monthIndex]}`;
}

function statusStyle(status) {
  return STATUSES.find((s) => s.key === status) || { bg: "#fff", border: "#94a3b8", color: "#64748b" };
}

function buildCalendar(days, month) {
  const { year, monthIndex } = parseMonth(month);
  const first = new Date(year, monthIndex, 1);
  const leading = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: leading }, () => null);
  days.forEach((day) => cells.push(day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function EmployeeManagement({ user }) {
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";
  const perms = user?.permissions || {};
  const canCreate = isAdmin || perms.employees_create;
  const canEdit = isAdmin || perms.employees_edit || perms.employees_salary;

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [employees, setEmployees] = useState([]);
  const [inactiveEmployees, setInactiveEmployees] = useState([]);
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detail, setDetail] = useState(null);
  const [month, setMonth] = useState(monthKey());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: "", location: "", notes: "" });
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: "", phone: "", role: "", monthlySalary: "", manufacturingIncentivePercent: "0", importedIncentivePercent: "0", joiningDate: "", status: "Active", notes: "",
  });
  const [attendancePicker, setAttendancePicker] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMode: "Cash", date: "", notes: "" });
  const [salaryChangeOpen, setSalaryChangeOpen] = useState(false);
  const [salaryChangeSaving, setSalaryChangeSaving] = useState(false);
  const [salaryChangeForm, setSalaryChangeForm] = useState({
    effectiveFrom: "", monthlySalary: "", manufacturingIncentivePercent: "0", importedIncentivePercent: "0", note: "",
  });
  const [incentiveModalOpen, setIncentiveModalOpen] = useState(false);
  const [saleDetail, setSaleDetail] = useState(null);
  const [saleDetailLoading, setSaleDetailLoading] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadWarehouses = () => {
    setLoading(true);
    employeeAPI.getWarehouses()
      .then((res) => {
        setWarehouses(res.data);
        setSelectedWarehouse((current) => current || res.data[0]?._id || "");
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const loadEmployees = () => {
    if (!selectedWarehouse) {
      setEmployees([]);
      setSelectedEmployee(null);
      setDetail(null);
      return;
    }
    employeeAPI.getAll({ warehouse: selectedWarehouse, status: "Active" })
      .then((res) => {
        setEmployees(res.data);
        const stillSelected = res.data.find((emp) => emp._id === selectedEmployee?._id);
        const nextSelected = stillSelected || res.data[0] || null;
        setSelectedEmployee(nextSelected);
      })
      .catch((err) => setError(err.message));
  };

  const loadDetail = () => {
    if (!selectedEmployee?._id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    employeeAPI.getById(selectedEmployee._id, { month })
      .then((res) => {
        setDetail(res.data);
        setDetailLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setDetailLoading(false);
      });
  };

  useEffect(() => { loadWarehouses(); }, []);
  const loadInactiveEmployees = () => {
    if (!selectedWarehouse) {
      setInactiveEmployees([]);
      return;
    }
    setInactiveLoading(true);
    employeeAPI.getAll({ warehouse: selectedWarehouse, status: "Inactive" })
      .then((res) => {
        setInactiveEmployees(res.data);
        setInactiveLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setInactiveLoading(false);
      });
  };

  const openInactiveList = () => {
    setInactiveOpen(true);
    loadInactiveEmployees();
  };

  useEffect(() => { loadEmployees(); }, [selectedWarehouse]);
  useEffect(() => { loadDetail(); }, [selectedEmployee?._id, month]);

  const salary = detail?.salary;
  const calendarCells = useMemo(() => buildCalendar(salary?.days || [], month), [salary, month]);
  const attendanceLocked = !!salary?.isLocked;
  const canMarkAttendance = canEdit && !attendanceLocked;

  const selectedWarehouseData = warehouses.find((w) => w._id === selectedWarehouse);

  const openCreateWarehouse = () => {
    setEditingWarehouse(null);
    setWarehouseForm({ name: "", location: "", notes: "" });
    setWarehouseOpen(true);
  };

  const openEditWarehouse = () => {
    if (!selectedWarehouseData) return;
    setEditingWarehouse(selectedWarehouseData);
    setWarehouseForm({
      name: selectedWarehouseData.name || "",
      location: selectedWarehouseData.location || "",
      notes: selectedWarehouseData.notes || "",
    });
    setWarehouseOpen(true);
  };

  const handleSaveWarehouse = async () => {
    if (!warehouseForm.name.trim()) return alert("Warehouse name required.");
    try {
      const res = editingWarehouse
        ? await employeeAPI.updateWarehouse(editingWarehouse._id, warehouseForm)
        : await employeeAPI.createWarehouse(warehouseForm);
      showToast(editingWarehouse ? "Warehouse updated" : "Warehouse created");
      setWarehouseOpen(false);
      setEditingWarehouse(null);
      setWarehouseForm({ name: "", location: "", notes: "" });
      await loadWarehouses();
      setSelectedWarehouse(res.data._id);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouseData) return;
    if (!confirm(`Delete warehouse "${selectedWarehouseData.name}"?`)) return;
    try {
      await employeeAPI.deleteWarehouse(selectedWarehouseData._id);
      showToast("Warehouse deleted");
      setSelectedWarehouse("");
      setSelectedEmployee(null);
      setDetail(null);
      loadWarehouses();
    } catch (err) { alert(err.message); }
  };

  const openCreateEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({ name: "", phone: "", role: "", monthlySalary: "", manufacturingIncentivePercent: "0", importedIncentivePercent: "0", joiningDate: "", status: "Active", notes: "" });
    setEmployeeOpen(true);
  };

  const openEditEmployee = () => {
    const employee = detail?.employee || selectedEmployee;
    if (!employee) return;
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name || "",
      phone: employee.phone || "",
      role: employee.role || "",
      monthlySalary: String(employee.monthlySalary || ""),
      manufacturingIncentivePercent: String(employee.manufacturingIncentivePercent ?? employee.incentivePercent ?? 0),
      importedIncentivePercent: String(employee.importedIncentivePercent ?? employee.incentivePercent ?? 0),
      joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split("T")[0] : "",
      status: employee.status || "Active",
      notes: employee.notes || "",
    });
    setEmployeeOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!employeeForm.name.trim() || !employeeForm.monthlySalary) return alert("Name and monthly salary required.");
    try {
      const payload = {
        ...employeeForm,
        warehouse: editingEmployee?.warehouse?._id || editingEmployee?.warehouse || selectedWarehouse,
        monthlySalary: +employeeForm.monthlySalary || 0,
        manufacturingIncentivePercent: +employeeForm.manufacturingIncentivePercent || 0,
        importedIncentivePercent: +employeeForm.importedIncentivePercent || 0,
        joiningDate: employeeForm.joiningDate || undefined,
      };
      const res = editingEmployee
        ? await employeeAPI.update(editingEmployee._id, payload)
        : await employeeAPI.create(payload);
      showToast(editingEmployee ? "Employee updated" : "Employee added");
      setEmployeeOpen(false);
      setEditingEmployee(null);
      setEmployeeForm({ name: "", phone: "", role: "", monthlySalary: "", manufacturingIncentivePercent: "0", importedIncentivePercent: "0", joiningDate: "", status: "Active", notes: "" });
      await loadEmployees();
      setSelectedEmployee(res.data);
      setDetail((prev) => prev ? { ...prev, employee: res.data } : prev);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteEmployee = async () => {
    const employee = detail?.employee || selectedEmployee;
    if (!employee) return;
    if (!confirm(`Delete employee "${employee.name}" and all attendance/payment records?`)) return;
    try {
      await employeeAPI.delete(employee._id);
      showToast("Employee deleted");
      setSelectedEmployee(null);
      setDetail(null);
      loadEmployees();
    } catch (err) { alert(err.message); }
  };

  const toggleEmployeeStatus = async (employee, status) => {
    if (!isAdmin || !employee) return;
    try {
      await employeeAPI.update(employee._id, { status });
      showToast(status === "Inactive" ? "Employee moved to inactive list" : "Employee activated");
      setSelectedEmployee(null);
      setDetail(null);
      loadEmployees();
      if (inactiveOpen) loadInactiveEmployees();
    } catch (err) { alert(err.message); }
  };

  const setAttendanceStatus = (date, status) => {
    if (!salary || !canMarkAttendance) return;
    const nextDays = salary.days.map((day) => {
      if (day.date !== date) return day;
      return { ...day, status };
    });
    setDetail((prev) => ({ ...prev, salary: { ...prev.salary, days: nextDays } }));
    setAttendancePicker(null);
  };

  const saveAttendance = async () => {
    if (!selectedEmployee || !salary) return;
    if (attendanceLocked) return alert("This month is locked. Unlock it before changing attendance.");
    try {
      const changedDays = salary.days.filter((day) => day.status || day.isSaved);
      const res = await employeeAPI.saveAttendance(selectedEmployee._id, { month, days: changedDays });
      setDetail((prev) => ({ ...prev, salary: res.data }));
      showToast("Attendance saved");
    } catch (err) { alert(err.message); }
  };

  const addPayment = async () => {
    if (!selectedEmployee || paymentSaving) return;
    if (attendanceLocked) return alert("This month is locked. Unlock it before changing payment.");
    setPaymentSaving(true);
    try {
      const payload = {
        ...paymentForm,
        month,
        amount: +paymentForm.amount || 0,
        date: paymentForm.date || undefined,
      };
      const res = editingPayment
        ? await employeeAPI.updatePayment(selectedEmployee._id, editingPayment._id, payload)
        : await employeeAPI.addPayment(selectedEmployee._id, payload);
      setDetail((prev) => ({ ...prev, salary: res.data }));
      setPaymentOpen(false);
      setEditingPayment(null);
      setPaymentForm({ amount: "", paymentMode: "Cash", date: "", notes: "" });
      showToast(editingPayment ? "Payment updated" : "Payment recorded");
    } catch (err) { alert(err.message); }
    setPaymentSaving(false);
  };

  const openAddPayment = () => {
    if (attendanceLocked) return alert("This month is locked. Unlock it before adding payment.");
    setEditingPayment(null);
    setPaymentForm({
      amount: salary?.dueAmount ? String(Math.round(salary.dueAmount)) : "",
      paymentMode: "Cash",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setPaymentOpen(true);
  };

  const openEditPayment = (payment) => {
    if (attendanceLocked) return alert("This month is locked. Unlock it before editing payment.");
    setEditingPayment(payment);
    setPaymentForm({
      amount: String(payment.amount || ""),
      paymentMode: payment.paymentMode || "Cash",
      date: payment.date ? new Date(payment.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      notes: payment.notes || "",
    });
    setPaymentOpen(true);
  };

  const deletePayment = async (payment) => {
    if (!isAdmin || !selectedEmployee || !payment) return;
    if (attendanceLocked) return alert("This month is locked. Unlock it before deleting payment.");
    if (!confirm(`Delete payment ${money(payment.amount)}?`)) return;
    try {
      const res = await employeeAPI.deletePayment(selectedEmployee._id, payment._id);
      setDetail((prev) => ({ ...prev, salary: res.data }));
      showToast("Payment deleted");
    } catch (err) { alert(err.message); }
  };

  const toggleSalaryLock = async () => {
    if (!isAdmin || !selectedEmployee || !salary) return;
    try {
      const res = await employeeAPI.setSalaryLock(selectedEmployee._id, {
        month,
        isLocked: !salary.isLocked,
      });
      setDetail((prev) => ({ ...prev, salary: res.data }));
      showToast(res.message);
    } catch (err) { alert(err.message); }
  };

  const openChangeSalary = () => {
    const employee = detail?.employee || selectedEmployee;
    if (!employee) return;
    setSalaryChangeForm({
      effectiveFrom: shiftMonth(monthKey(), 1),
      monthlySalary: String(employee.monthlySalary || ""),
      manufacturingIncentivePercent: String(employee.manufacturingIncentivePercent ?? 0),
      importedIncentivePercent: String(employee.importedIncentivePercent ?? 0),
      note: "",
    });
    setSalaryChangeOpen(true);
  };

  const saveSalaryChange = async () => {
    if (!selectedEmployee || salaryChangeSaving) return;
    if (!salaryChangeForm.effectiveFrom || !salaryChangeForm.monthlySalary) {
      return alert("Effective month and new monthly salary are required.");
    }
    setSalaryChangeSaving(true);
    try {
      const payload = {
        ...salaryChangeForm,
        monthlySalary: +salaryChangeForm.monthlySalary || 0,
        manufacturingIncentivePercent: +salaryChangeForm.manufacturingIncentivePercent || 0,
        importedIncentivePercent: +salaryChangeForm.importedIncentivePercent || 0,
      };
      const res = await employeeAPI.addSalaryChange(selectedEmployee._id, payload);
      setDetail((prev) => prev ? { ...prev, employee: res.data } : prev);
      setSalaryChangeOpen(false);
      showToast(`New salary applies from ${monthLabel(salaryChangeForm.effectiveFrom)} onward`);
      await loadEmployees();
      await loadDetail();
    } catch (err) { alert(err.message); }
    setSalaryChangeSaving(false);
  };

  const deleteSalaryHistoryEntry = async (entry) => {
    if (!isAdmin || !selectedEmployee) return;
    if (!confirm(`Remove the salary change effective ${monthLabel(entry.effectiveFrom)} (${money(entry.monthlySalary)}/month)?`)) return;
    try {
      const res = await employeeAPI.deleteSalaryChange(selectedEmployee._id, entry._id);
      setDetail((prev) => prev ? { ...prev, employee: res.data } : prev);
      showToast("Salary change removed");
      await loadEmployees();
      await loadDetail();
    } catch (err) { alert(err.message); }
  };

  const downloadAttendanceImage = () => {
    if (!detail?.employee || !salary) return;
    const scale = 2;
    const width = 920;
    const padding = 24;
    const rowH = 76;
    const titleY = 274;
    const weekdaysY = 314;
    const calendarTop = 332;
    const calendarLeft = padding;
    const calendarW = width - padding * 2;
    const cellW = calendarW / 7;
    const rows = Math.ceil(calendarCells.length / 7);
    const statsTop = calendarTop + rows * rowH + 64;
    const paymentRowsHeight = Math.max(54, salary.payments.length * 58);
    const height = statsTop + 150 + paymentRowsHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    const rect = (x, y, w, h, fill, stroke) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
      }
    };
    const text = (value, x, y, opts = {}) => {
      ctx.fillStyle = opts.color || "#0f172a";
      ctx.font = `${opts.weight || 400} ${opts.size || 14}px Segoe UI, Arial`;
      ctx.textAlign = opts.align || "left";
      ctx.fillText(String(value), x, y);
    };
    const fitText = (value, x, y, maxWidth, opts = {}) => {
      let size = opts.size || 20;
      const minSize = opts.minSize || 12;
      const weight = opts.weight || 400;
      ctx.font = `${weight} ${size}px Segoe UI, Arial`;
      while (ctx.measureText(String(value)).width > maxWidth && size > minSize) {
        size -= 1;
        ctx.font = `${weight} ${size}px Segoe UI, Arial`;
      }
      let str = String(value);
      while (ctx.measureText(str).width > maxWidth && str.length > 1) str = str.slice(0, -1);
      if (str !== String(value)) str = `${str.slice(0, -1)}…`;
      text(str, x, y, { ...opts, size, weight });
    };

    rect(0, 0, width, height, "#f8fafc");
    rect(0, 0, width, 100, "#134e4a");
    text(detail.employee.name, padding, 38, { color: "#fff", size: 22, weight: 800 });
    text(`${detail.employee.role || "Employee"} - ${detail.employee.warehouse?.name || ""}`, padding, 62, { color: "#d1fae5", size: 12, weight: 600 });
    if (detail.employee.notes) text(`Notes: ${detail.employee.notes}`, padding, 84, { color: "#ccfbf1", size: 11 });
    rect(width - 176, 26, 70, 22, "#dbeafe");
    text(monthLabel(month), width - 141, 42, { color: "#1e40af", size: 11, weight: 800, align: "center" });

    const cardY = 122;
    const cardH = 118;
    const cardGap = 12;
    const cardW = (calendarW - cardGap * 3) / 4;
    const statCardDefs = [
      {
        label: "Total Due", accent: "#0f766e", value: money(salary.dueAmount), valueColor: "#0f766e",
        sub: `Prev ${money(salary.openingBalance || 0)} + month ${money(salary.totalEarnings ?? salary.salaryEarned)}`,
      },
      {
        label: "Advance Balance", accent: "#2563eb", value: money(salary.advanceAmount || 0), valueColor: "#2563eb",
        sub: `Opening advance ${money(salary.openingAdvance || 0)}`,
      },
      {
        label: "Month Salary", accent: "#0f172a", value: money(salary.salaryEarned), valueColor: "#0f172a",
        sub: `Payable ${money(salary.grossDue ?? salary.salaryEarned)} - Paid ${money(salary.totalPaid)}`,
      },
      {
        label: "Monthly Incentive", accent: "#15803d", value: money(salary.incentiveEarned || 0), valueColor: "#15803d",
        sub: `${(salary.incentiveSales || []).length} sale${(salary.incentiveSales || []).length === 1 ? "" : "s"}`,
      },
    ];
    statCardDefs.forEach((card, idx) => {
      const x = calendarLeft + idx * (cardW + cardGap);
      rect(x, cardY, cardW, cardH, "#fff", "#cbd5e1");
      rect(x, cardY, cardW, 3, card.accent);
      fitText(card.label, x + 14, cardY + 26, cardW - 28, { color: "#64748b", size: 10, weight: 700, minSize: 8 });
      fitText(card.value, x + 14, cardY + 60, cardW - 28, { color: card.valueColor, size: 20, weight: 800, minSize: 13 });
      fitText(card.sub, x + 14, cardY + 88, cardW - 28, { color: "#64748b", size: 9, minSize: 8 });
    });

    text(`<`, padding + 12, titleY, { size: 24, weight: 800 });
    text(`Attendance  ${monthLabel(month)}`, width / 2, titleY, { size: 20, weight: 800, align: "center" });
    text(`>`, width - padding - 16, titleY, { size: 24, weight: 800 });
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((day, idx) => {
      text(day, calendarLeft + idx * cellW + cellW / 2, weekdaysY, { size: 12, weight: 700, align: "center" });
    });
    calendarCells.forEach((day, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const x = calendarLeft + col * cellW;
      const y = calendarTop + row * rowH;
      const status = day ? statusStyle(day.status) : null;
      const fill = day ? (day.status === "Half Day" ? "#a7f3d0" : status.bg) : "#fff";
      rect(x, y, cellW, rowH, fill, "#94a3b8");
      if (day?.status === "Half Day") rect(x + cellW / 2, y, cellW / 2, rowH, "#fde68a", "#94a3b8");
      if (day) text(Number(day.date.slice(-2)), x + cellW / 2, y + 42, { size: 16, align: "center" });
    });

    let legendX = padding;
    STATUSES.forEach((status) => {
      ctx.beginPath();
      ctx.arc(legendX + 8, statsTop - 34, 8, 0, Math.PI * 2);
      ctx.fillStyle = status.key === "Half Day" ? "#a7f3d0" : status.bg;
      ctx.fill();
      ctx.strokeStyle = status.border;
      ctx.stroke();
      text(status.label, legendX + 22, statsTop - 29, { size: 11, color: "#334155" });
      legendX += 112;
    });

    const statCards = [
      ["Present", salary.present, "#16a34a"],
      ["Absent", salary.absent, "#ef4444"],
      ["Half Day", salary.halfDay, "#f59e0b"],
      ["Paid Leave", salary.paidLeave, "#64748b"],
    ];
    statCards.forEach(([label, value, color], idx) => {
      const x = padding + idx * ((calendarW - 24) / 4 + 8);
      const w = (calendarW - 24) / 4;
      rect(x, statsTop, w, 64, "#fff", "#cbd5e1");
      rect(x, statsTop, 4, 64, color);
      text(value, x + 18, statsTop + 28, { size: 18, weight: 900 });
      text(label, x + 18, statsTop + 50, { size: 11, weight: 700, color });
    });

    rect(padding, statsTop + 84, calendarW, 70, "#f1f5f9");
    text(fullCycleLabel(month), padding + 18, statsTop + 112, { size: 12 });
    text(`total earnings: ${money(salary.totalEarnings ?? salary.salaryEarned)}`, padding + 18, statsTop + 135, { size: 12, weight: 700 });
    text("VIEW SUMMARY", width - padding - 22, statsTop + 126, { size: 13, weight: 900, color: "#0f766e", align: "right" });

    let y = statsTop + 184;
    if (!salary.payments.length) {
      text("There are no transactions in this cycle.", padding, y, { size: 14, color: "#64748b" });
    } else {
      salary.payments.forEach((payment) => {
        text(`${new Date(payment.date).toLocaleDateString("en-IN")} - ${payment.paymentMode}`, padding, y, { size: 12, color: "#334155" });
        text(money(payment.amount), width - padding, y, { size: 12, weight: 900, color: "#16a34a", align: "right" });
        if (payment.notes) text(`Notes: ${payment.notes}`, padding, y + 22, { size: 11, color: "#64748b" });
        rect(padding, y + 38, calendarW, 1, "#e2e8f0");
        y += 58;
      });
    }

    const a = document.createElement("a");
    a.download = `${safeFileName(detail.employee.name)}-${month}-attendance.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const openSaleDetail = async (saleId) => {
    if (!saleId || saleDetailLoading) return;
    setSaleDetailLoading(true);
    try {
      const res = await salesAPI.getById(saleId);
      setSaleDetail(res.data);
    } catch (err) { alert(err.message); }
    setSaleDetailLoading(false);
  };

  const downloadIncentiveImage = () => {
    if (!detail?.employee || !salary) return;
    const rows = salary.incentiveSales || [];
    const scale = 2;
    const width = 1060;
    const padding = 24;
    const headerH = 92;
    const rowH = 40;
    const headRowH = 30;
    const tableTop = headerH + 20;
    const height = tableTop + headRowH + Math.max(rows.length, 1) * rowH + 70;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    const rect = (x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); };
    const text = (value, x, y, opts = {}) => {
      ctx.fillStyle = opts.color || "#0f172a";
      ctx.font = `${opts.weight || 400} ${opts.size || 13}px Segoe UI, Arial`;
      ctx.textAlign = opts.align || "left";
      ctx.fillText(String(value), x, y);
    };
    const truncate = (value, maxWidth, size = 12) => {
      ctx.font = `400 ${size}px Segoe UI, Arial`;
      let str = String(value || "-");
      if (ctx.measureText(str).width <= maxWidth) return str;
      while (str.length > 1 && ctx.measureText(`${str}…`).width > maxWidth) str = str.slice(0, -1);
      return `${str}…`;
    };

    rect(0, 0, width, height, "#f8fafc");
    rect(0, 0, width, headerH, "#134e4a");
    text(detail.employee.name, padding, 34, { color: "#fff", size: 20, weight: 800 });
    text(`${detail.employee.role || "Employee"} - Incentive Sales - ${monthLabel(month)}`, padding, 58, { color: "#d1fae5", size: 12, weight: 600 });
    text(`Total Incentive: ${money(salary.incentiveEarned || 0)}`, padding, 80, { color: "#a7f3d0", size: 13, weight: 800 });

    const cols = [
      { key: "invoice", label: "Invoice", x: padding, w: 110 },
      { key: "date", label: "Date", x: padding + 110, w: 80 },
      { key: "customer", label: "Customer", x: padding + 190, w: 140 },
      { key: "products", label: "Products", x: padding + 330, w: 230 },
      { key: "payment", label: "Payment", x: padding + 560, w: 80 },
      { key: "base", label: "Base Amount", x: padding + 640, w: 130, align: "right" },
      { key: "pct", label: "Incentive %", x: padding + 770, w: 80, align: "right" },
      { key: "incentive", label: "Incentive", x: padding + 850, w: 130, align: "right" },
    ];
    let y = tableTop;
    rect(padding, y, width - padding * 2, headRowH, "#e2e8f0");
    cols.forEach((c) => text(c.label, c.align === "right" ? c.x + c.w - 8 : c.x + 8, y + 20, { size: 11, weight: 800, align: c.align || "left" }));
    y += headRowH;

    const byKey = (key) => cols.find((c) => c.key === key);
    if (!rows.length) {
      text("No incentive-earning sales this month.", padding + 8, y + 24, { size: 12, color: "#64748b" });
      y += rowH;
    } else {
      rows.forEach((sale, idx) => {
        const pct = sale.incentiveBaseAmount ? ((sale.incentiveAmount / sale.incentiveBaseAmount) * 100).toFixed(2) : "0.00";
        const productsLabel = (sale.items || []).map((i) => `${i.productName || "Item"} x${i.qty}`).join(", ") || "-";
        rect(padding, y, width - padding * 2, rowH, idx % 2 ? "#fff" : "#f1f5f9");
        text(sale.invoiceNo || "-", byKey("invoice").x + 8, y + 25, { size: 12 });
        text(sale.date ? new Date(sale.date).toLocaleDateString("en-IN") : "-", byKey("date").x + 8, y + 25, { size: 12 });
        text(truncate(sale.customer?.name || sale.customerName || "Walk-in", byKey("customer").w - 16), byKey("customer").x + 8, y + 25, { size: 12 });
        text(truncate(productsLabel, byKey("products").w - 16), byKey("products").x + 8, y + 25, { size: 11 });
        text(sale.status || "-", byKey("payment").x + 8, y + 25, { size: 11, weight: 700, color: sale.status === "Paid" ? "#15803d" : sale.status === "Partial" ? "#b45309" : "#dc2626" });
        text(money(sale.incentiveBaseAmount), byKey("base").x + byKey("base").w - 8, y + 25, { size: 12, align: "right" });
        text(`${pct}%`, byKey("pct").x + byKey("pct").w - 8, y + 25, { size: 12, align: "right" });
        text(money(sale.incentiveAmount), byKey("incentive").x + byKey("incentive").w - 8, y + 25, { size: 12, weight: 800, color: "#15803d", align: "right" });
        y += rowH;
      });
    }

    rect(padding, y, width - padding * 2, 1, "#94a3b8");
    y += 32;
    text("Total Incentive", byKey("pct").x + byKey("pct").w - 8, y, { size: 13, weight: 900, align: "right" });
    text(money(salary.incentiveEarned || 0), byKey("incentive").x + byKey("incentive").w - 8, y, { size: 15, weight: 900, color: "#15803d", align: "right" });

    const a = document.createElement("a");
    a.download = `${safeFileName(detail.employee.name)}-${month}-incentive.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const employeeCard = (emp) => (
    <div
      key={emp._id}
      onClick={() => setSelectedEmployee(emp)}
      style={{
        width: "100%", textAlign: "left", background: selectedEmployee?._id === emp._id ? "#eff6ff" : "#fff",
        border: `1px solid ${selectedEmployee?._id === emp._id ? "#93c5fd" : "#e2e8f0"}`,
        borderRadius: 8, padding: 14, cursor: "pointer", marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontWeight: 800, color: "#0f172a" }}>{emp.name}</div>
        <Badge color={emp.status === "Inactive" ? "red" : "green"}>{emp.status}</Badge>
      </div>
      <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{emp.role || "Employee"} - {money(emp.monthlySalary)}/month</div>
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleEmployeeStatus(emp, emp.status === "Inactive" ? "Active" : "Inactive");
            }}
            style={{
              border: "none",
              borderRadius: 7,
              padding: "8px 14px",
              background: emp.status === "Inactive" ? "#16a34a" : "#ef4444",
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
              minWidth: 104,
              textAlign: "center",
            }}>
            {emp.status === "Inactive" ? "Activate" : "Inactive"}
          </button>
        </div>
      )}
    </div>
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMsg message={error} onRetry={loadWarehouses} />;

  return (
    <div style={{ maxWidth: 1540, margin: "0 auto", padding: isMobile ? "0 0 84px" : 0 }}>
      {toast && <SuccessToast msg={toast} />}

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        marginBottom: 14, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: "#0f172a", fontFamily: "Georgia,serif" }}>
            Employee Attendance & Salary
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
            Warehouse-wise employee mapping, monthly attendance and salary due.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {detail?.employee && salary && <Btn color="green" onClick={downloadAttendanceImage}>Download Record</Btn>}
          {canCreate && <Btn color="blue" onClick={openCreateWarehouse}>+ Warehouse</Btn>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "480px minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginBottom: 16 }}>
            <FormGroup label="Select Warehouse">
              <FormSelect value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
                {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </FormSelect>
              {selectedWarehouseData?.location && (
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 5 }}>{selectedWarehouseData.location}</div>
              )}
              {selectedWarehouseData?.notes && (
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>{selectedWarehouseData.notes}</div>
              )}
            </FormGroup>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 900, color: "#1e293b", fontSize: 16 }}>{employees.length} Active Employees</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Manage this warehouse team</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                {isAdmin && selectedWarehouse && <PanelButton color="slate" onClick={openInactiveList}>Inactive List</PanelButton>}
                {isAdmin && selectedWarehouse && <PanelButton color="blue" onClick={openEditWarehouse}>Edit Warehouse</PanelButton>}
                {isAdmin && selectedWarehouse && <PanelButton color="red" onClick={handleDeleteWarehouse}>Delete Warehouse</PanelButton>}
                {canCreate && selectedWarehouse && <PanelButton color="teal" onClick={openCreateEmployee}>+ Employee</PanelButton>}
            </div>
          </div>

          {warehouses.length === 0 ? (
            <EmptyState text="No warehouse yet. Admin can create the first warehouse." />
          ) : employees.length === 0 ? (
            <EmptyState text="No active employees mapped to this warehouse." />
          ) : (
            <div>{employees.map(employeeCard)}</div>
          )}
        </div>

        <div>
          {!selectedEmployee ? (
            <EmptyState text="Select an employee to view salary and attendance." />
          ) : detailLoading || !salary ? (
            <LoadingSpinner />
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ background: "#134e4a", color: "#fff", padding: isMobile ? "18px 18px 76px" : "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{detail.employee.name}</div>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>{detail.employee.role || "Employee"} - {detail.employee.warehouse?.name}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {attendanceLocked && <Badge color="red">Locked</Badge>}
                    <Badge color="blue">{monthLabel(month)}</Badge>
                    {isAdmin && (
                      <Btn sm color={attendanceLocked ? "green" : "red"} onClick={toggleSalaryLock}>
                        {attendanceLocked ? "Unlock Month" : "Lock Month"}
                      </Btn>
                    )}
                    <Btn sm color="green" onClick={downloadAttendanceImage}>Download</Btn>
                    {isAdmin && <Btn sm color="teal" onClick={openEditEmployee}>Edit Employee</Btn>}
                    {isAdmin && <Btn sm color="blue" onClick={openChangeSalary}>Change Salary</Btn>}
                    {isAdmin && (
                      <Btn sm color={detail.employee.status === "Inactive" ? "green" : "red"}
                        onClick={() => toggleEmployeeStatus(detail.employee, detail.employee.status === "Inactive" ? "Active" : "Inactive")}>
                        {detail.employee.status === "Inactive" ? "Activate" : "Inactive"}
                      </Btn>
                    )}
                    {isAdmin && <Btn sm color="red" onClick={handleDeleteEmployee}>Delete</Btn>}
                  </div>
                </div>
                {detail.employee.notes && (
                  <div style={{ marginTop: 10, color: "#ccfbf1", fontSize: 12 }}>
                    Notes: {detail.employee.notes}
                  </div>
                )}
              </div>

              <div style={{ padding: isMobile ? "0 12px 18px" : 20 }}>
                <div style={{
                  marginTop: isMobile ? -58 : 0,
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
                  gap: 12,
                }}>
                  <StatCard
                    accent="#0f766e"
                    label="Total Due"
                    value={money(salary.dueAmount)}
                    valueColor="#0f766e"
                    sub={`Previous due ${money(salary.openingBalance || 0)} + this month ${money(salary.totalEarnings ?? salary.salaryEarned)}`}
                  />
                  <StatCard
                    accent="#2563eb"
                    label="Advance Balance"
                    value={money(salary.advanceAmount || 0)}
                    valueColor="#2563eb"
                    sub={`Opening advance ${money(salary.openingAdvance || 0)}; future salary adjusts automatically`}
                  />
                  <StatCard
                    accent="#0f172a"
                    label="Month Salary"
                    value={money(salary.salaryEarned)}
                    valueColor="#0f172a"
                    sub={`Payable ${money(salary.grossDue ?? salary.salaryEarned)} - Paid ${money(salary.totalPaid)}`}
                  />
                  <StatCard
                    accent="#15803d"
                    label="Monthly Incentive"
                    value={money(salary.incentiveEarned || 0)}
                    valueColor="#15803d"
                    sub={`${(salary.incentiveSales || []).length} sale${(salary.incentiveSales || []).length === 1 ? "" : "s"} · Total earnings ${money(salary.totalEarnings ?? salary.salaryEarned)} · tap to view`}
                    onClick={() => setIncentiveModalOpen(true)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 12px", gap: 10 }}>
                  <button onClick={() => setMonth(shiftMonth(month, -1))} style={navBtn}>‹</button>
                  <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? 5 : 10 }}>
                    <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 500 }}>Attendance&nbsp; {monthLabel(month)}</div>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => e.target.value && setMonth(e.target.value)}
                      aria-label="Select attendance month"
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 7,
                        padding: "6px 8px",
                        background: "#fff",
                        color: "#334155",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    />
                  </div>
                  <button onClick={() => setMonth(shiftMonth(month, 1))} style={navBtn}>›</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontWeight: 600, marginBottom: 8 }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderTop: "1px solid #94a3b8", borderLeft: "1px solid #94a3b8" }}>
                  {calendarCells.map((day, idx) => {
                    const style = day ? statusStyle(day.status) : null;
                    return (
                      <button
                        key={day?.date || idx}
                        onClick={() => day && canMarkAttendance && setAttendancePicker(day)}
                        disabled={!day || !canMarkAttendance}
                        title={day ? `${day.date} - ${day.status}` : ""}
                        style={{
                          minHeight: isMobile ? 80 : 70,
                          border: "none",
                          borderRight: "1px solid #94a3b8",
                          borderBottom: "1px solid #94a3b8",
                          background: day ? style.bg : "#fff",
                          color: day ? "#111827" : "#cbd5e1",
                          cursor: day && canMarkAttendance ? "pointer" : "default",
                          fontSize: isMobile ? 24 : 18,
                        }}
                      >
                        {day ? Number(day.date.slice(-2)) : ""}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, margin: "16px 0 18px", alignItems: "center" }}>
                  {STATUSES.map((s) => (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: isMobile ? 16 : 12 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: s.bg, border: `1px solid ${s.border}`, display: "inline-block" }} />
                      {s.label}
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
                  <MiniStat label="Present" value={salary.present} color="#16a34a" />
                  <MiniStat label="Absent" value={salary.absent} color="#ef4444" />
                  <MiniStat label="Half Day" value={salary.halfDay} color="#f59e0b" />
                  <MiniStat label="Paid Leave" value={salary.paidLeave} color="#64748b" />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f1f5f9", padding: 16, borderRadius: 8, gap: 10 }}>
                  <div>
                    <div style={{ fontSize: isMobile ? 18 : 14 }}>{fullCycleLabel(month)}</div>
                    <div style={{ fontSize: isMobile ? 18 : 14 }}>Total: {money(salary.salaryEarned)}</div>
                  </div>
                  <button onClick={() => alert(`Present: ${salary.present}\nAbsent: ${salary.absent}\nHalf Day: ${salary.halfDay}\nPaid Leave: ${salary.paidLeave}\nPrevious Due: ${money(salary.openingBalance || 0)}\nOpening Advance: ${money(salary.openingAdvance || 0)}\nThis Month: ${money(salary.salaryEarned)}\nPaid: ${money(salary.totalPaid)}\nDue: ${money(salary.dueAmount)}\nAdvance Balance: ${money(salary.advanceAmount || 0)}`)}
                    style={{ border: "none", background: "transparent", color: "#0f766e", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                    VIEW SUMMARY
                  </button>
                </div>

                <div style={{ marginTop: 14, color: "#64748b", fontSize: 13 }}>
                  {salary.payments.length === 0 ? "There are no transactions in this cycle." : salary.payments.map((p) => (
                    <div key={p._id} style={{ padding: "9px 0", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span>{new Date(p.date).toLocaleDateString("en-IN")} - {p.paymentMode}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ color: "#16a34a" }}>{money(p.amount)}</strong>
                          {canEdit && !attendanceLocked && <Btn sm color="blue" onClick={() => openEditPayment(p)}>Edit</Btn>}
                          {isAdmin && !attendanceLocked && <Btn sm color="red" onClick={() => deletePayment(p)}>Delete</Btn>}
                        </span>
                      </div>
                      {p.notes && (
                        <div style={{ marginTop: 4, color: "#475569", fontSize: 12 }}>
                          Notes: {p.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                  {canEdit && (
                    <Btn color={attendanceLocked ? "cancel" : "teal"} onClick={saveAttendance} disabled={attendanceLocked}>
                      {attendanceLocked ? "Attendance Locked" : "Save Attendance"}
                    </Btn>
                  )}
                  {canEdit && <Btn color={attendanceLocked ? "cancel" : "blue"} onClick={openAddPayment} disabled={attendanceLocked}>
                    {attendanceLocked ? "Payment Locked" : "Add Payment"}
                  </Btn>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {canEdit && salary && selectedEmployee && !attendanceLocked && (
        <button onClick={openAddPayment}
          style={{
            display: isMobile ? "flex" : "none",
            position: "fixed", right: 22, bottom: 28, zIndex: 2000,
            alignItems: "center", gap: 12, border: "none", borderRadius: 999,
            background: "#0f766e", color: "#fff", padding: "15px 24px",
            fontWeight: 900, letterSpacing: 1, boxShadow: "0 8px 24px rgba(15,118,110,0.35)",
          }}>
          Rs. ADD PAYMENT
        </button>
      )}

      <Modal open={!!attendancePicker} onClose={() => setAttendancePicker(null)}
        title={attendancePicker ? `Mark Attendance - ${new Date(attendancePicker.date).toLocaleDateString("en-IN")}` : "Mark Attendance"}>
        {attendancePicker && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              {STATUSES.map((status) => (
                <button
                  key={status.key}
                  type="button"
                  onClick={() => setAttendanceStatus(attendancePicker.date, status.key)}
                  style={{
                    border: `2px solid ${attendancePicker.status === status.key ? status.color : status.border}`,
                    background: status.bg,
                    color: status.color,
                    borderRadius: 8,
                    padding: "18px 14px",
                    fontWeight: 900,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: `1px solid ${status.border}`, background: status.bg, marginRight: 8, verticalAlign: -2 }} />
                  {status.label}
                </button>
              ))}
              {attendancePicker.status && (
                <button
                  type="button"
                  onClick={() => setAttendanceStatus(attendancePicker.date, "")}
                  style={{
                    border: "2px solid #64748b",
                    background: "#f8fafc",
                    color: "#334155",
                    borderRadius: 8,
                    padding: "18px 14px",
                    fontWeight: 900,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "1px solid #64748b", background: "#fff", marginRight: 8, verticalAlign: -2 }} />
                  Remove Attendance
                </button>
              )}
            </div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 14 }}>
              Select a status or remove the current attendance. Then click Save Attendance on the page to persist it.
            </div>
          </div>
        )}
      </Modal>

      <Modal open={warehouseOpen} onClose={() => { setWarehouseOpen(false); setEditingWarehouse(null); }}
        title={editingWarehouse ? "Edit Warehouse" : "Create Warehouse"}>
        <FormGroup label="Warehouse Name *"><FormInput value={warehouseForm.name} onChange={(e) => setWarehouseForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Noida Warehouse" /></FormGroup>
        <FormGroup label="Location"><FormInput value={warehouseForm.location} onChange={(e) => setWarehouseForm((p) => ({ ...p, location: e.target.value }))} placeholder="City / area" /></FormGroup>
        <FormGroup label="Notes"><FormInput value={warehouseForm.notes} onChange={(e) => setWarehouseForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" /></FormGroup>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn color="cancel" onClick={() => { setWarehouseOpen(false); setEditingWarehouse(null); }}>Cancel</Btn>
          <Btn color="blue" onClick={handleSaveWarehouse}>{editingWarehouse ? "Save Warehouse" : "Create"}</Btn>
        </div>
      </Modal>

      <Modal open={inactiveOpen} onClose={() => setInactiveOpen(false)}
        title={`Inactive Employees - ${selectedWarehouseData?.name || ""}`}>
        {inactiveLoading ? (
          <LoadingSpinner />
        ) : inactiveEmployees.length === 0 ? (
          <EmptyState text="No inactive employees in this warehouse." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {inactiveEmployees.map((emp) => (
              <div key={emp._id} style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 12,
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>{emp.name}</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                    {emp.role || "Employee"} - {money(emp.monthlySalary)}/month
                  </div>
                </div>
                <Btn sm color="green" onClick={() => toggleEmployeeStatus(emp, "Active")}>Activate</Btn>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={employeeOpen} onClose={() => { setEmployeeOpen(false); setEditingEmployee(null); }}
        title={editingEmployee ? "Edit Employee" : "Add Employee"}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <FormGroup label="Name *"><FormInput value={employeeForm.name} onChange={(e) => setEmployeeForm((p) => ({ ...p, name: e.target.value }))} /></FormGroup>
          <FormGroup label="Phone"><FormInput value={employeeForm.phone} onChange={(e) => setEmployeeForm((p) => ({ ...p, phone: e.target.value }))} /></FormGroup>
          <FormGroup label="Role"><FormInput value={employeeForm.role} onChange={(e) => setEmployeeForm((p) => ({ ...p, role: e.target.value }))} placeholder="Loader, Manager, Helper" /></FormGroup>
          {editingEmployee ? (
            <FormGroup label="Monthly Salary">
              <div style={{ padding: "9px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#f8fafc", color: "#334155", fontSize: 13 }}>
                {money(employeeForm.monthlySalary)}/month
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>Use "Change Salary" to update this, with an effective month.</div>
              </div>
            </FormGroup>
          ) : (
            <FormGroup label="Monthly Salary *"><FormInput type="number" value={employeeForm.monthlySalary} onChange={(e) => setEmployeeForm((p) => ({ ...p, monthlySalary: e.target.value }))} /></FormGroup>
          )}
          <FormGroup label="Manufacturing Incentive %"><FormInput type="number" min="0" max="100" step="0.01" value={employeeForm.manufacturingIncentivePercent} onChange={(e) => setEmployeeForm((p) => ({ ...p, manufacturingIncentivePercent: e.target.value }))} /></FormGroup>
          <FormGroup label="Imported Incentive %"><FormInput type="number" min="0" max="100" step="0.01" value={employeeForm.importedIncentivePercent} onChange={(e) => setEmployeeForm((p) => ({ ...p, importedIncentivePercent: e.target.value }))} /></FormGroup>
          {editingEmployee && (
            <div style={{ gridColumn: isMobile ? "auto" : "1 / -1", color: "#94a3b8", fontSize: 11, marginTop: -8 }}>
              Incentive % changes apply immediately to new sales — no effective month needed.
            </div>
          )}
          <FormGroup label="Joining Date"><FormInput type="date" value={employeeForm.joiningDate} onChange={(e) => setEmployeeForm((p) => ({ ...p, joiningDate: e.target.value }))} /></FormGroup>
          <FormGroup label="Status">
            <FormSelect value={employeeForm.status} onChange={(e) => setEmployeeForm((p) => ({ ...p, status: e.target.value }))}>
              {["Active", "Inactive"].map((status) => <option key={status}>{status}</option>)}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Notes"><FormInput value={employeeForm.notes} onChange={(e) => setEmployeeForm((p) => ({ ...p, notes: e.target.value }))} /></FormGroup>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn color="cancel" onClick={() => { setEmployeeOpen(false); setEditingEmployee(null); }}>Cancel</Btn>
          <Btn color="teal" onClick={handleSaveEmployee}>{editingEmployee ? "Save Employee" : "Add Employee"}</Btn>
        </div>
      </Modal>

      <Modal open={salaryChangeOpen} onClose={() => { if (!salaryChangeSaving) setSalaryChangeOpen(false); }}
        title={`Change Salary - ${selectedEmployee?.name || ""}`}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <FormGroup label="Effective From (month) *">
            <FormInput type="month" value={salaryChangeForm.effectiveFrom} onChange={(e) => setSalaryChangeForm((p) => ({ ...p, effectiveFrom: e.target.value }))} />
          </FormGroup>
          <FormGroup label="New Monthly Salary *">
            <FormInput type="number" value={salaryChangeForm.monthlySalary} onChange={(e) => setSalaryChangeForm((p) => ({ ...p, monthlySalary: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Manufacturing Incentive %">
            <FormInput type="number" min="0" max="100" step="0.01" value={salaryChangeForm.manufacturingIncentivePercent} onChange={(e) => setSalaryChangeForm((p) => ({ ...p, manufacturingIncentivePercent: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Imported Incentive %">
            <FormInput type="number" min="0" max="100" step="0.01" value={salaryChangeForm.importedIncentivePercent} onChange={(e) => setSalaryChangeForm((p) => ({ ...p, importedIncentivePercent: e.target.value }))} />
          </FormGroup>
          <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
            <FormGroup label="Note"><FormInput value={salaryChangeForm.note} onChange={(e) => setSalaryChangeForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional, e.g. Annual increment" /></FormGroup>
          </div>
        </div>
        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>
          This salary applies from {salaryChangeForm.effectiveFrom ? monthLabel(salaryChangeForm.effectiveFrom) : "the selected month"} onward. Months before it keep using whatever salary was in effect at the time — past balances will not change.
        </div>
        {(selectedEmployee?.salaryHistory?.length > 0) && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Salary History</div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              {[...selectedEmployee.salaryHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map((entry) => (
                <div key={entry._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
                  <div>
                    <strong>{monthLabel(entry.effectiveFrom)}</strong> onward - {money(entry.monthlySalary)}/month
                    <span style={{ color: "#64748b" }}> · Mfg {entry.manufacturingIncentivePercent || 0}% · Imported {entry.importedIncentivePercent || 0}%</span>
                    {entry.note && <div style={{ color: "#94a3b8" }}>{entry.note}</div>}
                  </div>
                  {isAdmin && <Btn sm color="red" onClick={() => deleteSalaryHistoryEntry(entry)}>Delete</Btn>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn color="cancel" onClick={() => setSalaryChangeOpen(false)} disabled={salaryChangeSaving}>Cancel</Btn>
          <Btn color="blue" onClick={saveSalaryChange} disabled={salaryChangeSaving}>{salaryChangeSaving ? "Saving..." : "Save Salary Change"}</Btn>
        </div>
      </Modal>

      <Modal open={incentiveModalOpen} onClose={() => setIncentiveModalOpen(false)} wide
        title={`Incentive Sales - ${detail?.employee?.name || ""} (${monthLabel(month)})`}>
        {!salary?.incentiveSales?.length ? (
          <EmptyState text="No incentive-earning sales this month." />
        ) : (
          <>
            <div style={{ maxHeight: 440, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <th style={thStyle}>Invoice</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Products</th>
                    <th style={thStyle}>Payment</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Base Amount</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Incentive %</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Incentive</th>
                  </tr>
                </thead>
                <tbody>
                  {salary.incentiveSales.map((sale) => {
                    const pct = sale.incentiveBaseAmount ? ((sale.incentiveAmount / sale.incentiveBaseAmount) * 100).toFixed(2) : "0.00";
                    const productsLabel = (sale.items || []).map((i) => `${i.productName || "Item"} x${i.qty}`).join(", ") || "-";
                    return (
                      <tr key={sale._id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => openSaleDetail(sale._id)}
                            disabled={saleDetailLoading}
                            style={{ border: "none", background: "none", color: "#0ea5e9", fontWeight: 700, cursor: saleDetailLoading ? "wait" : "pointer", padding: 0, fontSize: "inherit" }}
                          >
                            {sale.invoiceNo || "-"}
                          </button>
                        </td>
                        <td style={tdStyle}>{sale.date ? new Date(sale.date).toLocaleDateString("en-IN") : "-"}</td>
                        <td style={tdStyle}>{sale.customer?.name || sale.customerName || "Walk-in"}</td>
                        <td style={{ ...tdStyle, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={productsLabel}>{productsLabel}</td>
                        <td style={tdStyle}><Badge color={saleStatusColor[sale.status] || "gray"}>{sale.status || "-"}</Badge></td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{money(sale.incentiveBaseAmount)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{pct}%</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#15803d", fontWeight: 800 }}>{money(sale.incentiveAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #cbd5e1" }}>
                    <td style={{ ...tdStyle, fontWeight: 900 }} colSpan={7}>Total Incentive</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#15803d", fontWeight: 900 }}>{money(salary.incentiveEarned || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <Btn color="cancel" onClick={() => setIncentiveModalOpen(false)}>Close</Btn>
              <Btn color="green" onClick={downloadIncentiveImage}>Download Image</Btn>
            </div>
          </>
        )}
      </Modal>

      {saleDetail && <TransactionDetailsModal record={saleDetail} type="sale" onClose={() => setSaleDetail(null)} />}

      <Modal open={paymentOpen} onClose={() => { if (!paymentSaving) { setPaymentOpen(false); setEditingPayment(null); } }}
        title={`${editingPayment ? "Edit" : "Add"} Payment - ${selectedEmployee?.name || ""}`}>
        <FormGroup label="Amount"><FormInput type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} /></FormGroup>
        <FormGroup label="Payment Mode">
          <FormSelect value={paymentForm.paymentMode} onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMode: e.target.value }))}>
            {["Cash", "UPI", "Bank Transfer", "Cheque"].map((m) => <option key={m}>{m}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="Date"><FormInput type="date" value={paymentForm.date} onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value }))} /></FormGroup>
        <FormGroup label="Notes"><FormInput value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} /></FormGroup>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            Current due: {money(salary?.dueAmount || 0)} · Advance: {money(salary?.advanceAmount || 0)}<br />
            You may pay more than the current due; the extra amount will be stored as advance.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn color="cancel" onClick={() => { setPaymentOpen(false); setEditingPayment(null); }} disabled={paymentSaving}>Cancel</Btn>
            <Btn color="blue" onClick={addPayment} disabled={paymentSaving}>
              {paymentSaving ? "Saving..." : editingPayment ? "Save Payment" : "Pay"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ label, value, valueColor, sub, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", border: "1px solid #e2e8f0", borderTop: `3px solid ${accent}`,
        borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: valueColor, fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderLeft: `4px solid ${color}`, borderRadius: 8, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function PanelButton({ children, color = "teal", onClick }) {
  const palette = {
    teal: { background: "#0d9488", color: "#fff", border: "#0d9488" },
    blue: { background: "#0ea5e9", color: "#fff", border: "#0ea5e9" },
    red: { background: "#ef4444", color: "#fff", border: "#ef4444" },
    slate: { background: "#f8fafc", color: "#334155", border: "#cbd5e1" },
  };
  const tone = palette[color] || palette.teal;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 44,
        width: "100%",
        border: `1px solid ${tone.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        background: tone.background,
        color: tone.color,
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
        textAlign: "center",
        lineHeight: 1.15,
      }}
    >
      {children}
    </button>
  );
}

const navBtn = {
  width: 38,
  height: 38,
  border: "none",
  background: "transparent",
  color: "#111827",
  fontSize: 34,
  cursor: "pointer",
  lineHeight: 1,
};

const thStyle = { padding: "9px 10px", fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: 0.3 };
const tdStyle = { padding: "8px 10px", color: "#1e293b" };
const saleStatusColor = { Paid: "green", Partial: "yellow", Pending: "red", Cancelled: "gray" };
