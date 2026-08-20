import { useEffect, useMemo, useState } from "react";
import {
  Btn, Badge, Modal, FormGroup, FormInput, FormSelect,
  LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
} from "../components/Shared";
import { employeeAPI } from "../services/api";

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
    name: "", phone: "", role: "", monthlySalary: "", joiningDate: "", status: "Active", notes: "",
  });
  const [attendancePicker, setAttendancePicker] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMode: "Cash", date: "", notes: "" });

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
    setEmployeeForm({ name: "", phone: "", role: "", monthlySalary: "", joiningDate: "", status: "Active", notes: "" });
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
        joiningDate: employeeForm.joiningDate || undefined,
      };
      const res = editingEmployee
        ? await employeeAPI.update(editingEmployee._id, payload)
        : await employeeAPI.create(payload);
      showToast(editingEmployee ? "Employee updated" : "Employee added");
      setEmployeeOpen(false);
      setEditingEmployee(null);
      setEmployeeForm({ name: "", phone: "", role: "", monthlySalary: "", joiningDate: "", status: "Active", notes: "" });
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

    rect(0, 0, width, height, "#f8fafc");
    rect(0, 0, width, 100, "#134e4a");
    text(detail.employee.name, padding, 38, { color: "#fff", size: 22, weight: 800 });
    text(`${detail.employee.role || "Employee"} - ${detail.employee.warehouse?.name || ""}`, padding, 62, { color: "#d1fae5", size: 12, weight: 600 });
    if (detail.employee.notes) text(`Notes: ${detail.employee.notes}`, padding, 84, { color: "#ccfbf1", size: 11 });
    rect(width - 176, 26, 70, 22, "#dbeafe");
    text(monthLabel(month), width - 141, 42, { color: "#1e40af", size: 11, weight: 800, align: "center" });

    const cardY = 122;
    rect(padding, cardY, 420, 118, "#fff", "#cbd5e1");
    text("Total Due", padding + 20, cardY + 36, { color: "#334155", size: 14 });
    text(money(salary.dueAmount), padding + 20, cardY + 78, { color: "#0f766e", size: 28, weight: 300 });
    text(`Previous due: ${money(salary.openingBalance || 0)} + this month: ${money(salary.salaryEarned)}`, padding + 20, cardY + 104, { color: "#64748b", size: 11 });
    rect(width - padding - 420, cardY, 420, 118, "#fff", "#cbd5e1");
    text("Month Salary", width - padding - 400, cardY + 36, { color: "#334155", size: 14 });
    text(money(salary.salaryEarned), width - padding - 400, cardY + 72, { color: "#0f172a", size: 22, weight: 800 });
    text(`Payable ${money(salary.grossDue || salary.salaryEarned)} - Paid ${money(salary.totalPaid)}`, width - padding - 400, cardY + 100, { color: "#64748b", size: 11 });

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
    text(`total: ${money(salary.salaryEarned)}`, padding + 18, statsTop + 135, { size: 12, weight: 700 });
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
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 18, boxShadow: "0 4px 16px rgba(15,23,42,0.1)" }}>
                    <div style={{ color: "#334155", fontSize: 16, marginBottom: 8 }}>Total Due</div>
                    <div style={{ color: "#0f766e", fontSize: isMobile ? 34 : 38, fontWeight: 300 }}>{money(salary.dueAmount)}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
                      Previous due {money(salary.openingBalance || 0)} + this month {money(salary.salaryEarned)}
                    </div>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 18 }}>
                    <div style={{ color: "#334155", fontSize: 16, marginBottom: 8 }}>Month Salary</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{money(salary.salaryEarned)}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      Payable {money(salary.grossDue || salary.salaryEarned)} - Paid {money(salary.totalPaid)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 12px" }}>
                  <button onClick={() => setMonth(shiftMonth(month, -1))} style={navBtn}>‹</button>
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 500 }}>Attendance&nbsp; {monthLabel(month)}</div>
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
                  <button onClick={() => alert(`Present: ${salary.present}\nAbsent: ${salary.absent}\nHalf Day: ${salary.halfDay}\nPaid Leave: ${salary.paidLeave}\nPrevious Due: ${money(salary.openingBalance || 0)}\nThis Month: ${money(salary.salaryEarned)}\nPaid: ${money(salary.totalPaid)}\nDue: ${money(salary.dueAmount)}`)}
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
          <FormGroup label="Monthly Salary *"><FormInput type="number" value={employeeForm.monthlySalary} onChange={(e) => setEmployeeForm((p) => ({ ...p, monthlySalary: e.target.value }))} /></FormGroup>
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
          <div style={{ color: "#64748b", fontSize: 12 }}>Current due: {money(salary?.dueAmount || 0)}</div>
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
