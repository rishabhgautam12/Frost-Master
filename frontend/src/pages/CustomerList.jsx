import { useState, useEffect } from "react";
import {
  PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td,
  Badge, Modal, FormGroup, FormInput, FormSelect,
  LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
} from "../components/Shared";
import { customerAPI } from "../services/api";

const stColor   = { Active:"green", VIP:"purple", Inactive:"red" };
const typeColor = { Retail:"green", Wholesale:"blue", VIP:"purple", Dealer:"yellow", Online:"gray" };

const BLANK = { name:"", phone:"", email:"", customerType:"Retail",
                city:"", address:"", gstin:"", creditLimit:"", notes:"" };

const normalizePhone = value => value.replace(/\D/g, "").slice(0, 10);
const isValidPhone = value => /^\d{10}$/.test(value);
const isPhoneDraft = value => /^\d{0,10}$/.test(value);

export default function CustomerList({ navigate }) {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [addModal,  setAddModal]  = useState(false);
  const [editCust,  setEditCust]  = useState(null);   // customer being edited
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    customerAPI.getAll(params)
      .then(r => { setCustomers(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setPhone = e => {
    const value = e.target.value;
    if (isPhoneDraft(value)) setForm(p => ({ ...p, phone: value }));
  };
  const pastePhone = e => {
    e.preventDefault();
    setForm(p => ({ ...p, phone: normalizePhone(e.clipboardData.getData("text")) }));
  };

  /* ── Add ── */
  const openAdd = () => { setForm(BLANK); setAddModal(true); };
  const handleAdd = async () => {
    if (!form.name || !form.phone) return alert("Name and phone are required.");
    if (!isValidPhone(form.phone)) return alert("Phone number must be exactly 10 digits.");
    setSaving(true);
    try {
      await customerAPI.create({ ...form, creditLimit: +form.creditLimit || 0 });
      showToast("Customer added successfully!");
      setAddModal(false);
      load();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  /* ── Edit ── */
  const openEdit = c => {
    setEditCust(c);
    setForm({
      name:        c.name,
      phone:       c.phone,
      email:       c.email || "",
      customerType:c.customerType || "Retail",
      city:        c.city || "",
      address:     c.address || "",
      gstin:       c.gstin || "",
      creditLimit: String(c.creditLimit || ""),
      notes:       c.notes || "",
      status:      c.status || "Active",
    });
  };
  const handleEdit = async () => {
    if (!form.name || !form.phone) return alert("Name and phone are required.");
    if (!isValidPhone(form.phone)) return alert("Phone number must be exactly 10 digits.");
    setSaving(true);
    try {
      await customerAPI.update(editCust._id, { ...form, creditLimit: +form.creditLimit || 0 });
      showToast("Customer updated successfully!");
      setEditCust(null);
      load();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  /* ── Delete ── */
  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" delete karna chahte ho?`)) return;
    try { await customerAPI.delete(id); showToast("Customer deleted"); load(); }
    catch(e) { alert(e.message); }
  };

  /* ── Shared form fields ── */
  const renderFormFields = () => (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <FormGroup label="Full Name *">
          <FormInput placeholder="e.g. Amit Sharma" value={form.name} onChange={set("name")} />
        </FormGroup>
        <FormGroup label="Phone *">
          <FormInput type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10}
            placeholder="9876543210" value={form.phone} onChange={setPhone} onPaste={pastePhone} />
        </FormGroup>
        <FormGroup label="Email">
          <FormInput placeholder="email@example.com" value={form.email} onChange={set("email")} />
        </FormGroup>
        <FormGroup label="Customer Type">
          <FormSelect value={form.customerType} onChange={set("customerType")}>
            {["Retail","Wholesale","VIP","Dealer","Online"].map(t=><option key={t}>{t}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="City">
          <FormInput placeholder="Delhi" value={form.city} onChange={set("city")} />
        </FormGroup>
        <FormGroup label="GSTIN">
          <FormInput placeholder="27AAAAA0000A1Z5" value={form.gstin} onChange={set("gstin")} />
        </FormGroup>
        <FormGroup label="Credit Limit (₹)">
          <FormInput type="number" placeholder="0" value={form.creditLimit}
            onChange={set("creditLimit")} />
        </FormGroup>
        {editCust && (
          <FormGroup label="Status">
            <FormSelect value={form.status} onChange={set("status")}>
              {["Active","Inactive","VIP"].map(s=><option key={s}>{s}</option>)}
            </FormSelect>
          </FormGroup>
        )}
      </div>
      <FormGroup label="Address">
        <FormInput placeholder="Full address" value={form.address} onChange={set("address")} />
      </FormGroup>
      <FormGroup label="Notes">
        <FormInput placeholder="Any notes..." value={form.notes} onChange={set("notes")} />
      </FormGroup>
    </>
  );

  return (
    <div>
      <PageTitle>Customers</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
        <Btn color="teal" onClick={openAdd}>+ Add Customer</Btn>
        <span style={{ fontSize:12, color:"#64748b" }}>{customers.length} customers</span>
      </div>

      <SearchBar>
        <Input placeholder="Search by name or phone..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width:240 }} />
        <Btn color="blue" onClick={load}>Search</Btn>
      </SearchBar>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>{["Customer Name","Phone","Type","City","Total Billed",
                "Received","Due","Status","Action"].map(h=><Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {customers.length === 0
                ? <tr><td colSpan={9}><EmptyState text="No customers found." /></td></tr>
                : customers.map(c => {
                  const due = c.totalBilled - c.totalReceived;
                  return (
                    <tr key={c._id} style={{ borderBottom:"1px solid #f1f5f9" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#f0fdfa"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <Td style={{ fontWeight:700 }}>
                        <span onClick={() => navigate(`customer-profile:${c._id}`)}
                          style={{ color:"#0ea5e9", cursor:"pointer",
                            display:"flex", alignItems:"center", gap:4 }}>
                          🔗 {c.name}
                        </span>
                      </Td>
                      <Td>{c.phone}</Td>
                      <Td>
                        <Badge color={typeColor[c.customerType]||"green"}>
                          {c.customerType}
                        </Badge>
                      </Td>
                      <Td>{c.city||"—"}</Td>
                      <Td style={{ fontWeight:700 }}>₹{c.totalBilled.toLocaleString()}</Td>
                      <Td style={{ color:"#16a34a", fontWeight:700 }}>
                        ₹{c.totalReceived.toLocaleString()}
                      </Td>
                      <Td style={{ color:due>0?"#ef4444":"#94a3b8", fontWeight:700 }}>
                        {due>0 ? `₹${due.toLocaleString()}` : "—"}
                      </Td>
                      <Td>
                        <Badge color={stColor[c.status]||"green"}>{c.status}</Badge>
                      </Td>
                      <Td>
                        <div style={{ display:"flex", gap:5 }}>
                          <Btn sm color="blue"
                            onClick={() => navigate(`customer-profile:${c._id}`)}>
                            👁 Profile
                          </Btn>
                          <Btn sm color="teal" onClick={() => openEdit(c)}>
                            ✏️ Edit
                          </Btn>
                          <Btn sm color="red" onClick={() => handleDelete(c._id, c.name)}>
                            🗑
                          </Btn>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </TableWrap>
      )}

      {/* ── Add Modal ── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add New Customer">
        {renderFormFields()}
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <Btn color="cancel" onClick={() => setAddModal(false)}>Cancel</Btn>
          <Btn color="teal" onClick={handleAdd} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Customer"}
          </Btn>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editCust} onClose={() => setEditCust(null)}
        title={`Edit Customer — ${editCust?.name}`}>
        {renderFormFields()}
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <Btn color="cancel" onClick={() => setEditCust(null)}>Cancel</Btn>
          <Btn color="teal" onClick={handleEdit} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Changes"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
