import { useState, useEffect } from "react";
import {
  PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td,
  Badge, Modal, FormGroup, FormInput, FormSelect,
  LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
} from "../components/Shared";
import { vendorAPI } from "../services/api";

const stColor = { Active:"green", Inactive:"red", Pending:"yellow" };
const BLANK   = { name:"", company:"", phone:"", email:"", city:"",
                  address:"", gstin:"", status:"Active", notes:"" };
const normalizePhone = value => value.replace(/\D/g, "").slice(0, 10);
const isValidPhone = value => /^\d{10}$/.test(value);

export default function VendorList({ navigate }) {
  const [vendors,   setVendors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [activeTab, setActiveTab] = useState("Active");
  const [search,    setSearch]    = useState("");
  const [editV,     setEditV]     = useState(null);
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  const load = () => {
    setLoading(true);
    vendorAPI.getAll()
      .then(r => { setVendors(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setPhone = e => setForm(p => ({ ...p, phone: normalizePhone(e.target.value) }));

  const openEdit = v => {
    setEditV(v);
    setForm({ name:v.name, company:v.company, phone:v.phone, email:v.email||"",
              city:v.city||"", address:v.address||"", gstin:v.gstin||"",
              status:v.status, notes:v.notes||"" });
  };

  const handleSave = async () => {
    if (!form.name || !form.company || !form.phone)
      return alert("Name, company and phone are required.");
    if (!isValidPhone(form.phone))
      return alert("Phone number must be exactly 10 digits.");
    setSaving(true);
    try {
      await vendorAPI.update(editV._id, form);
      showToast("Vendor updated successfully!");
      setEditV(null);
      load();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const handleToggle = async id => {
    try { await vendorAPI.toggleStatus(id); load(); showToast("Status updated successfully."); }
    catch(e) { alert(e.message); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try { await vendorAPI.delete(id); showToast("Vendor deleted"); load(); }
    catch(e) { alert(e.message); }
  };

  const filtered = vendors.filter(v => {
    const matchTab = activeTab==="Active" ? v.status==="Active" : v.status!=="Active";
    const matchSearch = !search
      || v.name.toLowerCase().includes(search.toLowerCase())
      || v.company.toLowerCase().includes(search.toLowerCase())
      || (v.phone||"").includes(search);
    return matchTab && matchSearch;
  });

  return (
    <div>
      <PageTitle>All Vendors</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <Btn color="teal" onClick={() => navigate("vendor-add")}>+ Add New Vendor</Btn>
        <span style={{ fontSize:12, color:"#64748b" }}>{filtered.length} vendors</span>
      </div>

      <SearchBar>
        <Input placeholder="Search by name, company or phone..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width:240 }} />
      </SearchBar>

      <div style={{ display:"flex", borderBottom:"2px solid #e2e8f0", marginBottom:14 }}>
        {["Active","Inactive"].map(t => (
          <div key={t} onClick={() => setActiveTab(t)}
            style={{ padding:"9px 22px", fontWeight:700, fontSize:12.5, cursor:"pointer",
              borderBottom: activeTab===t ? "3px solid #0ea5e9" : "3px solid transparent",
              marginBottom:-2, color: activeTab===t ? "#0ea5e9" : "#64748b" }}>{t}</div>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>{["Vendor Name","Company","City","Phone","GSTIN",
                "Total Purchased","We Owe","Status","Action"].map(h=><Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9}><EmptyState text="No vendors found." /></td></tr>
                : filtered.map(v => (
                  <tr key={v._id} style={{ borderBottom:"1px solid #f1f5f9" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#f0fdfa"}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <Td style={{ fontWeight:700 }}>
                      <span onClick={() => navigate(`vendor-profile:${v._id}`)}
                        style={{ color:"#0ea5e9", cursor:"pointer",
                          display:"flex", alignItems:"center", gap:4 }}>
                        🔗 {v.name}
                      </span>
                    </Td>
                    <Td>{v.company}</Td>
                    <Td>{v.city||"—"}</Td>
                    <Td>{v.phone}</Td>
                    <Td style={{ fontFamily:"monospace", fontSize:10, color:"#94a3b8" }}>
                      {v.gstin||"—"}
                    </Td>
                    <Td style={{ fontWeight:700 }}>₹{(v.totalPurchased||0).toLocaleString()}</Td>
                    <Td style={{ fontWeight:700,
                      color:(v.totalPurchased-v.totalPaid)>0?"#ef4444":"#94a3b8" }}>
                      {(v.totalPurchased-v.totalPaid)>0
                        ? `₹${(v.totalPurchased-v.totalPaid).toLocaleString()}` : "—"}
                    </Td>
                    <Td><Badge color={stColor[v.status]||"gray"}>{v.status}</Badge></Td>
                    <Td>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        <Btn sm color="blue"
                          onClick={() => navigate(`vendor-profile:${v._id}`)}>
                          👁 Profile
                        </Btn>
                        <Btn sm color="teal" onClick={() => openEdit(v)}>✏️ Edit</Btn>
                        <Btn sm color="red"
                          onClick={() => handleToggle(v._id)}>
                          {v.status==="Active" ? "Deactivate" : "Activate"}
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </TableWrap>
      )}

      {/* ── Edit Modal ── */}
      <Modal open={!!editV} onClose={() => setEditV(null)}
        title={`Edit Vendor — ${editV?.name}`}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormGroup label="Vendor Name *">
            <FormInput value={form.name} onChange={set("name")} />
          </FormGroup>
          <FormGroup label="Company Name *">
            <FormInput value={form.company} onChange={set("company")} />
          </FormGroup>
          <FormGroup label="Phone *">
            <FormInput type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10}
              value={form.phone} onChange={setPhone} />
          </FormGroup>
          <FormGroup label="Email">
            <FormInput value={form.email} onChange={set("email")} />
          </FormGroup>
          <FormGroup label="City">
            <FormInput value={form.city} onChange={set("city")} />
          </FormGroup>
          <FormGroup label="GSTIN">
            <FormInput value={form.gstin} onChange={set("gstin")} />
          </FormGroup>
          <FormGroup label="Status">
            <FormSelect value={form.status} onChange={set("status")}>
              {["Active","Inactive","Pending"].map(s=><option key={s}>{s}</option>)}
            </FormSelect>
          </FormGroup>
        </div>
        <FormGroup label="Address">
          <FormInput value={form.address} onChange={set("address")} />
        </FormGroup>
        <FormGroup label="Notes">
          <FormInput value={form.notes} onChange={set("notes")} />
        </FormGroup>
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <Btn color="cancel" onClick={() => setEditV(null)}>Cancel</Btn>
          <Btn color="teal" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Changes"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
