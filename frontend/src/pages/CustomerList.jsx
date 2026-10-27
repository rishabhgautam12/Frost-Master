import { useState, useEffect } from "react";
import {
  PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td,
  Badge, Modal, FormGroup, FormInput, FormSelect,
  LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
} from "../components/Shared";
import { customerAPI } from "../services/api";
import CustomerFormFields, { BLANK_CUSTOMER, customerToForm, validateCustomer, customerPayload } from "../components/CustomerFormFields";

const stColor   = { Active:"green", VIP:"purple", Inactive:"red" };
const typeColor = { Retail:"green", Wholesale:"blue", VIP:"purple", Dealer:"yellow", Online:"gray" };


export default function CustomerList({ navigate }) {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [addModal,  setAddModal]  = useState(false);
  const [editCust,  setEditCust]  = useState(null);   // customer being edited
  const [form,      setForm]      = useState(BLANK_CUSTOMER);
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
  /* ── Add ── */
  const openAdd = () => { setForm(BLANK_CUSTOMER); setAddModal(true); };
  const handleAdd = async () => {
    const problem = validateCustomer(form);
    if (problem) return alert(problem);
    setSaving(true);
    try {
      await customerAPI.create(customerPayload(form));
      showToast("Customer added successfully!");
      setAddModal(false);
      load();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  /* ── Edit ── */
  const openEdit = c => {
    setEditCust(c);
    setForm(customerToForm(c));
  };
  const handleEdit = async () => {
    const problem = validateCustomer(form);
    if (problem) return alert(problem);
    setSaving(true);
    try {
      await customerAPI.update(editCust._id, customerPayload(form));
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

  const renderFormFields = () => <CustomerFormFields form={form} setForm={setForm} showStatus={!!editCust} />;

  return (
    <div>
      <PageTitle>Customers</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
        <Btn color="teal" onClick={openAdd}>+ Add Customer</Btn>
        <span style={{ fontSize:12, color:"#6b7392" }}>{customers.length} customers</span>
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
                    <tr key={c._id} style={{ borderBottom:"1px solid #f1f3f9" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <Td style={{ fontWeight:700 }}>
                        <span onClick={() => navigate(`customer-profile:${c._id}`)}
                          style={{ color:"#0ea5e9", cursor:"pointer",
                            display:"flex", alignItems:"center", gap:4 }}>
                          {c.name}
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
                      <Td style={{ color:"#1f9d6b", fontWeight:700 }}>
                        ₹{c.totalReceived.toLocaleString()}
                      </Td>
                      <Td style={{ color:due>0?"#e0524c":"#9aa1b9", fontWeight:700 }}>
                        {due>0 ? `₹${due.toLocaleString()}` : "—"}
                      </Td>
                      <Td>
                        <Badge color={stColor[c.status]||"green"}>{c.status}</Badge>
                      </Td>
                      <Td>
                        <div style={{ display:"flex", gap:5 }}>
                          <Btn sm color="blue"
                            onClick={() => navigate(`customer-profile:${c._id}`)}>
                            Profile
                          </Btn>
                          <Btn sm color="teal" onClick={() => openEdit(c)}>
                            Edit
                          </Btn>
                          <Btn sm color="red" onClick={() => handleDelete(c._id, c.name)}>
                            Delete
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
            {saving ? "Saving..." : "Save Customer"}
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
            {saving ? "Saving..." : "Save Changes"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
