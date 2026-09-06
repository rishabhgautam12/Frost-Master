import { useEffect, useState } from "react";
import { PageTitle, Btn, Badge, TableWrap, Th, Td, LoadingSpinner, ErrorMsg, EmptyState, Modal, FormGroup, FormInput, FormSelect, SuccessToast } from "../components/Shared";
import { complaintAPI } from "../services/api";

const priorityColor = { Low:"gray", Medium:"blue", High:"yellow", Urgent:"red" };
const textAreaStyle = { width:"100%", padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:7, fontSize:13, resize:"vertical", boxSizing:"border-box", background:"#f9fafb" };

export default function Complaints({ status = "Active", user }) {
  const canManage = user?.role === "admin" || user?.permissions?.complaints_manage;
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [form, setForm] = useState({ referenceType:"Sale", invoice:"", product:"", complaint:"", priority:"Medium" });
  const [solving, setSolving] = useState(null);
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = () => {
    setLoading(true);
    complaintAPI.getAll({ status }).then(res => { setComplaints(res.data || []); setError(""); }).catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(load, [status]);

  const resetAdd = () => {
    setForm({ referenceType:"Sale", invoice:"", product:"", complaint:"", priority:"Medium" });
    setInvoiceData(null);
  };
  const lookup = async () => {
    if (!form.invoice.trim()) return alert("Enter an invoice number.");
    setLookupLoading(true);
    try {
      const res = await complaintAPI.lookupInvoice({ type:form.referenceType, invoice:form.invoice.trim() });
      setInvoiceData(res.data);
      setForm(prev => ({ ...prev, product:"" }));
    } catch (err) { setInvoiceData(null); alert(err.message); }
    setLookupLoading(false);
  };
  const create = async () => {
    if (!invoiceData || !form.product || !form.complaint.trim()) return alert("Fetch an invoice, select a product, and enter complaint details.");
    setSaving(true);
    try {
      await complaintAPI.create({ referenceType:form.referenceType, referenceId:invoiceData.referenceId, product:form.product, complaint:form.complaint, priority:form.priority });
      setAddOpen(false); resetAdd(); setToast("Complaint added successfully"); load();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };
  const solve = async () => {
    if (!resolution.trim()) return alert("Enter resolution details.");
    setSaving(true);
    try {
      await complaintAPI.solve(solving._id, { resolution, resolvedAt:new Date().toISOString() });
      setSolving(null); setResolution(""); setToast("Complaint marked as solved"); load();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  return (
    <div>
      <PageTitle>{status === "Active" ? "Active Complaints" : "Solved Complaints"}</PageTitle>
      {toast && <SuccessToast msg={toast} />}
      {status === "Active" && canManage && <div style={{ marginBottom:14 }}><Btn color="teal" onClick={() => { resetAdd(); setAddOpen(true); }}>+ Add Complaint</Btn></div>}
      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : complaints.length === 0 ? <EmptyState text={`No ${status.toLowerCase()} complaints found.`} /> : (
        <TableWrap><table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr>{["Complaint No.","Added","Reference","Invoice Date","Party","Product","Complaint","Priority",status === "Solved" ? "Resolution" : "Action"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>{complaints.map(row => <tr key={row._id} style={{ borderBottom:"1px solid #f1f5f9" }}>
            <Td style={{ fontWeight:800 }}>{row.complaintNo}</Td>
            <Td>{new Date(row.createdAt).toLocaleDateString("en-IN")}</Td>
            <Td><div><Badge color={row.referenceType === "Sale" ? "green" : "blue"}>{row.referenceType}</Badge></div><div style={{ marginTop:4, fontFamily:"monospace" }}>{row.invoiceNo}</div></Td>
            <Td>{row.referenceDate ? new Date(row.referenceDate).toLocaleDateString("en-IN") : "-"}</Td>
            <Td>{row.partyName || "-"}</Td>
            <Td><strong>{row.productName}</strong>{row.productDescription && <div style={{ color:"#64748b", marginTop:3 }}>{row.productDescription}</div>}</Td>
            <Td style={{ minWidth:190, whiteSpace:"pre-wrap" }}>{row.complaint}</Td>
            <Td><Badge color={priorityColor[row.priority]}>{row.priority}</Badge></Td>
            <Td>{status === "Active" ? (canManage ? <Btn sm color="green" onClick={() => { setSolving(row); setResolution(""); }}>Mark Solved</Btn> : "-") : <div><div style={{ whiteSpace:"pre-wrap" }}>{row.resolution}</div><div style={{ color:"#64748b", fontSize:10.5, marginTop:4 }}>{row.resolvedAt ? new Date(row.resolvedAt).toLocaleDateString("en-IN") : ""} {row.resolvedByName ? `by ${row.resolvedByName}` : ""}</div></div>}</Td>
          </tr>)}</tbody>
        </table></TableWrap>
      )}

      <Modal open={addOpen} onClose={() => !saving && setAddOpen(false)} title="Add Complaint" wide>
        <div style={{ display:"grid", gridTemplateColumns:"180px 1fr auto", gap:10, alignItems:"end" }}>
          <FormGroup label="Reference Type"><FormSelect value={form.referenceType} onChange={e => { setForm(p => ({ ...p, referenceType:e.target.value, product:"" })); setInvoiceData(null); }}><option>Sale</option><option>Purchase</option></FormSelect></FormGroup>
          <FormGroup label="Invoice Number"><FormInput value={form.invoice} onChange={e => { setForm(p => ({ ...p, invoice:e.target.value })); setInvoiceData(null); }} placeholder={form.referenceType === "Sale" ? "e.g. INV-2026-0001" : "Purchase No. or vendor invoice no."} /></FormGroup>
          <Btn color="blue" disabled={lookupLoading} onClick={lookup}>{lookupLoading ? "Fetching..." : "Fetch Invoice"}</Btn>
        </div>
        {invoiceData && <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, padding:12, margin:"10px 0 14px", color:"#166534" }}><strong>{invoiceData.invoiceNo}</strong> · {new Date(invoiceData.date).toLocaleDateString("en-IN")} · {invoiceData.partyName}</div>}
        {invoiceData && <FormGroup label="Complaint Product *"><FormSelect value={form.product} onChange={e => setForm(p => ({ ...p, product:e.target.value }))}><option value="">Select product from invoice</option>{invoiceData.items.map((item, index) => <option key={`${item.product}-${index}`} value={item.product}>{item.productName}{item.modelNumber ? ` (${item.modelNumber})` : ""} · Qty ${item.qty}</option>)}</FormSelect></FormGroup>}
        {form.product && invoiceData && (() => { const item = invoiceData.items.find(value => String(value.product) === String(form.product)); return item?.description ? <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:7, padding:10, color:"#64748b", marginBottom:12 }}><strong>Product description:</strong> {item.description}</div> : null; })()}
        <FormGroup label="Priority"><FormSelect value={form.priority} onChange={e => setForm(p => ({ ...p, priority:e.target.value }))}>{["Low","Medium","High","Urgent"].map(value => <option key={value}>{value}</option>)}</FormSelect></FormGroup>
        <FormGroup label="Complaint Details *"><textarea rows={4} style={textAreaStyle} value={form.complaint} onChange={e => setForm(p => ({ ...p, complaint:e.target.value }))} placeholder="Describe the product issue..." /></FormGroup>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}><Btn color="cancel" onClick={() => setAddOpen(false)}>Cancel</Btn><Btn color="teal" disabled={saving} onClick={create}>{saving ? "Saving..." : "Add Complaint"}</Btn></div>
      </Modal>

      <Modal open={!!solving} onClose={() => !saving && setSolving(null)} title={`Solve ${solving?.complaintNo || "Complaint"}`}>
        <div style={{ marginBottom:12 }}><strong>{solving?.productName}</strong><div style={{ color:"#64748b", marginTop:4 }}>{solving?.complaint}</div></div>
        <FormGroup label="Resolution Details *"><textarea rows={4} style={textAreaStyle} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Explain how this complaint was resolved..." /></FormGroup>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}><Btn color="cancel" onClick={() => setSolving(null)}>Cancel</Btn><Btn color="green" disabled={saving} onClick={solve}>{saving ? "Saving..." : "Mark as Solved"}</Btn></div>
      </Modal>
    </div>
  );
}
