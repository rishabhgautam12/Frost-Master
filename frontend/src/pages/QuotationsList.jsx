import { useEffect, useState } from "react";
import { PageTitle, Btn, TableWrap, Th, Td, LoadingSpinner, ErrorMsg, EmptyState, Modal, FormGroup, FormInput, SuccessToast } from "../components/Shared";
import { salesAPI } from "../services/api";
import { OrderEditModal } from "./OrdersList";
import TransactionDetailsModal from "../components/TransactionDetailsModal";

const today = () => new Date().toISOString().slice(0, 10);

export default function QuotationsList({ navigate }) {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [converting, setConverting] = useState(null);
  const [orderDate, setOrderDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const load = (filters = {}) => {
    setLoading(true);
    const date = filters.dateFilter ?? dateFilter;
    const month = filters.monthFilter ?? monthFilter;
    const params = date ? { from:date, to:date } : month ? {
      from:`${month}-01`,
      to:`${month}-${String(new Date(+month.slice(0,4), +month.slice(5,7), 0).getDate()).padStart(2,"0")}`,
    } : {};
    salesAPI.getQuotations(params).then(res => { setQuotations(res.data || []); setError(""); })
      .catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const done = message => { setEditing(null); setToast(message); setTimeout(() => setToast(""), 3000); load(); };
  const convert = async () => {
    setSaving(true);
    try {
      const res = await salesAPI.convertQuotation(converting._id, { date:orderDate });
      setConverting(null); setToast(res.message); setTimeout(() => setToast(""), 3000); load();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  return <div>
    <PageTitle>Quotations</PageTitle>
    {toast && <SuccessToast msg={toast} />}
    <div className="order-filter-bar" style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14}}>
      <div style={{marginBottom:14}}><Btn color="teal" onClick={() => navigate("quotation-create")}>+ Create Quotation</Btn></div>
      <FormGroup label="Filter by month"><FormInput type="month" value={monthFilter} onChange={e => {setMonthFilter(e.target.value);if(e.target.value)setDateFilter("");}} /></FormGroup>
      <FormGroup label="Filter by date"><FormInput type="date" value={dateFilter} onChange={e => {setDateFilter(e.target.value);if(e.target.value)setMonthFilter("");}} /></FormGroup>
      <div style={{marginBottom:14}}><Btn color="blue" onClick={() => load()}>Filter</Btn></div>
      <div style={{marginBottom:14}}><Btn color="cancel" onClick={() => {setMonthFilter("");setDateFilter("");load({monthFilter:"",dateFilter:""});}}>Reset</Btn></div>
    </div>
    {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : quotations.length === 0 ? <EmptyState text="No active quotations found." /> : <TableWrap><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr>{["Quotation No.","Date","Customer","Items","Total","Actions"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
      <tbody>{quotations.map(q => <tr key={q._id} style={{borderBottom:"1px solid #cbd5e1"}}>
        <Td style={{fontWeight:800}}>{q.quotationNo}</Td><Td>{new Date(q.date).toLocaleDateString("en-IN")}</Td>
        <Td>{q.customer?.name || q.customerName || "-"}</Td>
        <Td>{(q.items || []).map((item,i) => <div key={item._id || i}><strong>{item.productName || item.product?.name}</strong>{item.description && <small style={{display:"block",color:"#64748b"}}>{item.description}</small>}</div>)}</Td>
        <Td style={{fontWeight:800}}>₹{(+q.grandTotal || 0).toLocaleString("en-IN")}</Td>
        <Td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn sm color="teal" onClick={() => setViewing(q)}>View Details</Btn><Btn sm color="blue" onClick={() => setEditing(q)}>Edit</Btn><Btn sm color="green" onClick={() => {setConverting(q);setOrderDate(today());}}>Convert to Order</Btn></div></Td>
      </tr>)}</tbody>
    </table></TableWrap>}
    {editing && <OrderEditModal order={editing} documentName="Quotation" updateRecord={salesAPI.updateQuotation} onClose={() => setEditing(null)} onDone={done} />}
    {viewing && <TransactionDetailsModal record={viewing} type="quotation" onClose={() => setViewing(null)} />}
    <Modal open={!!converting} title={`Convert ${converting?.quotationNo || "Quotation"} to Order`} onClose={() => !saving && setConverting(null)}>
      <div style={{color:"#64748b",marginBottom:12}}>A new order will be created with all quotation details. This quotation will then be removed from the active list.</div>
      <FormGroup label="Order Date"><FormInput type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} /></FormGroup>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn color="cancel" onClick={() => setConverting(null)}>Cancel</Btn><Btn color="green" disabled={saving} onClick={convert}>{saving ? "Converting..." : "Convert to Order"}</Btn></div>
    </Modal>
  </div>;
}
