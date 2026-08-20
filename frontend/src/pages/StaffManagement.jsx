import { useState, useEffect } from "react";
import {
  PageTitle, Btn, TableWrap, Th, Td, Badge,
  Modal, FormGroup, FormInput, LoadingSpinner, ErrorMsg, SuccessToast,
} from "../components/Shared";
import { authAPI } from "../services/api";

// All permission groups with human-readable labels
const PERMISSION_GROUPS = [
  {
    group: "Dashboard",
    perms: [{ key: "dashboard", label: "View Dashboard" }],
  },
  {
    group: "Vendors",
    perms: [
      { key: "vendors_view",   label: "View Vendors"   },
      { key: "vendors_create", label: "Add Vendor"     },
      { key: "vendors_edit",   label: "Edit Vendor"    },
      { key: "vendors_delete", label: "Delete Vendor"  },
    ],
  },
  {
    group: "Products & Stock",
    perms: [
      { key: "products_view",   label: "View Products"   },
      { key: "products_create", label: "Add Product"     },
      { key: "products_edit",   label: "Edit Product"    },
      { key: "products_delete", label: "Delete Product"  },
      { key: "products_stock",  label: "Manage Stock"    },
    ],
  },
  {
    group: "Customers",
    perms: [
      { key: "customers_view",   label: "View Customers"   },
      { key: "customers_create", label: "Add Customer"     },
      { key: "customers_edit",   label: "Edit Customer"    },
      { key: "customers_delete", label: "Delete Customer"  },
    ],
  },
  {
    group: "Sales",
    perms: [
      { key: "sales_view",   label: "View Sales"    },
      { key: "sales_create", label: "Create Sale"   },
      { key: "sales_edit",   label: "Edit / Pay"    },
      { key: "sales_cancel", label: "Cancel Sale"   },
    ],
  },
  {
    group: "Purchases",
    perms: [
      { key: "purchases_view",   label: "View Purchases"   },
      { key: "purchases_create", label: "Create Purchase"  },
    ],
  },
  {
    group: "Reports",
    perms: [
      { key: "reports_gst",    label: "GST Report"    },
      { key: "reports_sales",  label: "Sales Report"  },
      { key: "reports_graphs", label: "Graphs"        },
    ],
  },
  {
    group: "Employees",
    perms: [
      { key: "employees_view",   label: "View Employees" },
      { key: "employees_create", label: "Add Employees" },
      { key: "employees_edit",   label: "Edit Employees" },
      { key: "employees_salary", label: "Salary & Attendance" },
    ],
  },
];

const ALL_PERM_KEYS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.key));

const BLANK_PERMS = ALL_PERM_KEYS.reduce((acc, k) => ({
  ...acc,
  // dashboard is always on by default for new staff
  [k]: k === "dashboard" ? true : false,
}), {});

const ACTION_COLORS = {
  created: "green",
  updated: "blue",
  deleted: "red",
  cancelled: "red",
  payment: "purple",
  stock: "yellow",
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const changeSummary = (changes = []) => {
  if (!changes.length) return "No field-level changes captured";
  return changes.slice(0, 3).map(c => c.field).join(", ") + (changes.length > 3 ? ` +${changes.length - 3} more` : "");
};

// ── Permission Toggle Grid ──────────────────────────────────────────────────
function PermissionGrid({ perms, onChange }) {
  const allOn  = ALL_PERM_KEYS.every(k => perms[k]);
  const allOff = ALL_PERM_KEYS.every(k => !perms[k]);

  const toggleAll = (val) => {
    const next = { ...perms };
    ALL_PERM_KEYS.forEach(k => { next[k] = val; });
    onChange(next);
  };

  const toggleGroup = (keys, val) => {
    const next = { ...perms };
    keys.forEach(k => { next[k] = val; });
    onChange(next);
  };

  const toggle = (key) => onChange({ ...perms, [key]: !perms[key] });

  return (
    <div>
      {/* Select All / None */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Quick Select:</span>
        <button onClick={() => toggleAll(true)}
          style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #16a34a", background: allOn ? "#16a34a" : "#f0fdf4", color: allOn ? "#fff" : "#16a34a", borderRadius: 20, cursor: "pointer", fontWeight: 700 }}>
          ✅ All Access
        </button>
        <button onClick={() => toggleAll(false)}
          style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #ef4444", background: allOff ? "#ef4444" : "#fef2f2", color: allOff ? "#fff" : "#ef4444", borderRadius: 20, cursor: "pointer", fontWeight: 700 }}>
          🚫 No Access
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {PERMISSION_GROUPS.map(({ group, perms: groupPerms }) => {
          const keys    = groupPerms.map(p => p.key);
          const allGrOn = keys.every(k => perms[k]);
          return (
            <div key={group} style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              {/* Group header */}
              <div style={{ background: "#f8fafc", padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#1e293b", textTransform: "uppercase" }}>{group}</span>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 10, color: "#64748b", fontWeight: 600 }}>
                  All
                  <input type="checkbox" checked={allGrOn}
                    onChange={e => toggleGroup(keys, e.target.checked)}
                    style={{ cursor: "pointer", width: 14, height: 14, accentColor: "#0ea5e9" }} />
                </label>
              </div>
              {/* Perm rows */}
              {groupPerms.map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: perms[key] ? "#f0fdf4" : "#fff", transition: "background 0.1s" }}>
                  <span style={{ fontSize: 12, color: perms[key] ? "#15803d" : "#64748b", fontWeight: perms[key] ? 600 : 400 }}>
                    {perms[key] ? "✅" : "⬜"} {label}
                  </span>
                  <div onClick={() => toggle(key)}
                    style={{ width: 38, height: 20, borderRadius: 20, background: perms[key] ? "#16a34a" : "#d1d5db", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: perms[key] ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
                  </div>
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function StaffManagement() {
  const [staff,     setStaff]     = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error,     setError]     = useState(null);
  const [logsError, setLogsError] = useState(null);
  const [toast,     setToast]     = useState(null);
  const [activeTab, setActiveTab] = useState("staff");
  const [selectedLog, setSelectedLog] = useState(null);

  // Add modal
  const [addOpen,   setAddOpen]   = useState(false);
  const [addForm,   setAddForm]   = useState({ name: "", username: "", password: "" });
  const [addPerms,  setAddPerms]  = useState({ ...BLANK_PERMS });
  const [addSaving, setAddSaving] = useState(false);

  // Edit modal
  const [editUser,    setEditUser]    = useState(null);
  const [editForm,    setEditForm]    = useState({ name: "", password: "" });
  const [editPerms,   setEditPerms]   = useState({ ...BLANK_PERMS });
  const [editActive,  setEditActive]  = useState(true);
  const [editSaving,  setEditSaving]  = useState(false);

  const loadStaff = () => {
    setLoading(true);
    authAPI.getStaff()
      .then(r => { setStaff(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  const loadLogs = () => {
    setLogsLoading(true);
    authAPI.getActivityLogs({ limit: 300 })
      .then(r => { setLogs(r.data); setLogsLoading(false); })
      .catch(e => { setLogsError(e.message); setLogsLoading(false); });
  };

  const load = () => {
    loadStaff();
    loadLogs();
  };

  useEffect(() => { load(); }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ── Add Staff ──
  const handleAdd = async () => {
    if (!addForm.name || !addForm.username || !addForm.password)
      return alert("Name, username, and password are required.");
    if (addForm.password.length < 6)
      return alert("Password must be at least 6 characters.");
    setAddSaving(true);
    try {
      await authAPI.createStaff({ ...addForm, permissions: addPerms });
      showToast(`Staff member "${addForm.name}" created successfully`);
      setAddOpen(false);
      setAddForm({ name: "", username: "", password: "" });
      setAddPerms({ ...BLANK_PERMS });
      load();
    } catch (e) { alert(e.message); }
    setAddSaving(false);
  };

  // ── Open Edit ──
  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name, password: "" });
    setEditActive(u.isActive);
    // Merge stored permissions with blank (in case new perms were added)
    setEditPerms({ ...BLANK_PERMS, ...(u.permissions || {}) });
  };

  // ── Save Edit ──
  const handleEdit = async () => {
    if (!editForm.name) return alert("Name is required.");
    if (editForm.password && editForm.password.length < 6)
      return alert("New password must be at least 6 characters.");
    setEditSaving(true);
    const body = { name: editForm.name, isActive: editActive, permissions: editPerms };
    if (editForm.password) body.password = editForm.password;
    try {
      await authAPI.updateStaff(editUser.id, body);
      showToast(`"${editForm.name}" updated successfully`);
      setEditUser(null);
      load();
    } catch (e) { alert(e.message); }
    setEditSaving(false);
  };

  // ── Delete ──
  const handleDelete = async (u) => {
    if (!confirm(`Delete staff member "${u.name}"? This cannot be undone.`)) return;
    try {
      await authAPI.deleteStaff(u.id);
      showToast(`"${u.name}" deleted`);
      load();
    } catch (e) { alert(e.message); }
  };

  // ── Quick permission toggle from table ──
  const quickToggle = async (u, key) => {
    const current = { ...BLANK_PERMS, ...(u.permissions || {}) };
    current[key] = !current[key];
    try {
      await authAPI.updateStaff(u.id, { permissions: current });
      showToast("Permission updated");
      load();
    } catch (e) { alert(e.message); }
  };

  const permCount = (u) => ALL_PERM_KEYS.filter(k => u.permissions?.[k]).length;

  return (
    <div>
      <PageTitle>Staff Management</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
        {[
          { key: "staff", label: "Staff Members" },
          { key: "activity", label: `Activity Log (${logs.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: "10px 14px", border: "none", borderBottom: activeTab === tab.key ? "3px solid #0ea5e9" : "3px solid transparent", background: "transparent", color: activeTab === tab.key ? "#0f172a" : "#64748b", cursor: "pointer", fontWeight: 800, fontSize: 12 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "staff" ? (
        <>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total Staff",   value: staff.length,                                color: "#3b82f6", icon: "👥" },
          { label: "Active",        value: staff.filter(s => s.isActive).length,        color: "#16a34a", icon: "✅" },
          { label: "Inactive",      value: staff.filter(s => !s.isActive).length,       color: "#ef4444", icon: "🚫" },
          { label: "Full Access",   value: staff.filter(s => permCount(s) === ALL_PERM_KEYS.length).length, color: "#8b5cf6", icon: "🔓" },
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0", borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{c.icon} {c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <Btn color="teal" onClick={() => { setAddOpen(true); setAddForm({ name: "", username: "", password: "" }); setAddPerms({ ...BLANK_PERMS }); }}>
          + Add Staff Member
        </Btn>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Name", "Username", "Permissions", "Status", "Created", "Actions"].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                  No staff members yet. Click "Add Staff Member" to create one.
                </td></tr>
              ) : staff.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9", background: !u.isActive ? "#fafafa" : "" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0fdfa"}
                  onMouseLeave={e => e.currentTarget.style.background = !u.isActive ? "#fafafa" : ""}>
                  <Td style={{ fontWeight: 700 }}>
                    {u.name}
                    {!u.isActive && <span style={{ marginLeft: 6, fontSize: 10, color: "#94a3b8" }}>(Inactive)</span>}
                  </Td>
                  <Td style={{ fontFamily: "monospace", color: "#0ea5e9" }}>@{u.username}</Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 10, overflow: "hidden", minWidth: 60 }}>
                        <div style={{ height: "100%", background: "#16a34a", borderRadius: 10, width: `${(permCount(u) / ALL_PERM_KEYS.length) * 100}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                        {permCount(u)}/{ALL_PERM_KEYS.length}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <Badge color={u.isActive ? "green" : "gray"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </Td>
                  <Td style={{ color: "#64748b" }}>
                    {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn sm color="blue" onClick={() => openEdit(u)}>✏️ Edit</Btn>
                      <Btn sm color="red"  onClick={() => handleDelete(u)}>🗑 Delete</Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              Complete audit trail of staff and admin actions, newest first.
            </div>
            <Btn sm color="blue" onClick={loadLogs}>Refresh</Btn>
          </div>

          {logsLoading ? <LoadingSpinner /> : logsError ? <ErrorMsg message={logsError} onRetry={loadLogs} /> : (
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Date & Time", "Staff Member", "Action", "Record", "Changes", "Details"].map(h => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                      No activity has been recorded yet.
                    </td></tr>
                  ) : logs.map(log => (
                    <tr key={log._id} style={{ borderBottom: "1px solid #f1f5f9" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0fdfa"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <Td style={{ color: "#475569", whiteSpace: "nowrap" }}>{formatDateTime(log.createdAt)}</Td>
                      <Td>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{log.actor?.name || "-"}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>@{log.actor?.username || "-"} - {log.actor?.role || "-"}</div>
                      </Td>
                      <Td><Badge color={ACTION_COLORS[log.action] || "gray"}>{log.action}</Badge></Td>
                      <Td>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{log.entityType}</div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{log.entityLabel || "-"}</div>
                      </Td>
                      <Td>
                        <div style={{ color: "#1e293b", fontWeight: 600 }}>{log.summary}</div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{changeSummary(log.changes)}</div>
                      </Td>
                      <Td>
                        <Btn sm color="blue" onClick={() => setSelectedLog(log)}>View</Btn>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}

      {/* ── Add Modal ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Staff Member">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <FormGroup label="Full Name *">
            <FormInput placeholder="e.g. Rahul Sharma" value={addForm.name}
              onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Username *">
            <FormInput placeholder="e.g. rahul123" value={addForm.username}
              onChange={e => setAddForm(p => ({ ...p, username: e.target.value.toLowerCase() }))} />
          </FormGroup>
          <FormGroup label="Password *" style={{ gridColumn: "1/-1" }}>
            <FormInput type="password" placeholder="Min 6 characters" value={addForm.password}
              onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} />
          </FormGroup>
        </div>

        <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 12, color: "#1e293b" }}>
          🔐 Set Permissions
        </div>
        <PermissionGrid perms={addPerms} onChange={setAddPerms} />

        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <Btn color="cancel" onClick={() => setAddOpen(false)}>Cancel</Btn>
          <Btn color="teal" onClick={handleAdd} disabled={addSaving}>
            {addSaving ? "Creating..." : "✅ Create Staff Member"}
          </Btn>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)}
        title={`Edit Staff — ${editUser?.name}`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <FormGroup label="Full Name *">
            <FormInput placeholder="Full name" value={editForm.name}
              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Username">
            <FormInput value={`@${editUser?.username}`} disabled
              style={{ background: "#f1f5f9", color: "#94a3b8", cursor: "not-allowed" }} />
          </FormGroup>
          <FormGroup label="New Password">
            <FormInput type="password" placeholder="Leave blank to keep current"
              value={editForm.password}
              onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
          </FormGroup>
          <FormGroup label="Account Status">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <div onClick={() => setEditActive(v => !v)}
                style={{ width: 44, height: 24, borderRadius: 24, background: editActive ? "#16a34a" : "#d1d5db", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 3, left: editActive ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: editActive ? "#16a34a" : "#ef4444" }}>
                {editActive ? "Active" : "Inactive"}
              </span>
            </div>
          </FormGroup>
        </div>

        <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 12, color: "#1e293b" }}>
          🔐 Manage Permissions
        </div>
        <PermissionGrid perms={editPerms} onChange={setEditPerms} />

        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <Btn color="cancel" onClick={() => setEditUser(null)}>Cancel</Btn>
          <Btn color="teal" onClick={handleEdit} disabled={editSaving}>
            {editSaving ? "Saving..." : "💾 Save Changes"}
          </Btn>
        </div>
      </Modal>

      <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)}
        title={`Activity Details - ${selectedLog?.entityType || ""}`} wide>
        {selectedLog && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
              {[
                { label: "Date & Time", value: formatDateTime(selectedLog.createdAt) },
                { label: "Staff Member", value: `${selectedLog.actor?.name || "-"} (@${selectedLog.actor?.username || "-"})` },
                { label: "Action", value: selectedLog.action },
                { label: "Record", value: `${selectedLog.entityType} - ${selectedLog.entityLabel || "-"}` },
              ].map((item) => (
                <div key={item.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 12 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 10, color: "#1e293b", fontWeight: 800 }}>{selectedLog.summary}</div>

            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Field", "Before", "After"].map(h => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {(selectedLog.changes || []).length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                      No field-level changes captured.
                    </td></tr>
                  ) : selectedLog.changes.map((change, i) => (
                    <tr key={`${change.field}-${i}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <Td style={{ fontWeight: 800, color: "#0f172a", width: 160 }}>{change.field}</Td>
                      <Td style={{ maxWidth: 280, wordBreak: "break-word", color: "#991b1b" }}>{formatValue(change.before)}</Td>
                      <Td style={{ maxWidth: 280, wordBreak: "break-word", color: "#166534" }}>{formatValue(change.after)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}
      </Modal>
    </div>
  );
}
