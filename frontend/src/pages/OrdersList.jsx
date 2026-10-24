import { useEffect, useState } from "react";
import { PageTitle, Btn, Badge, TableWrap, Th, Td, LoadingSpinner, ErrorMsg, EmptyState, Modal, FormGroup, FormInput, FormSelect, SuccessToast, ItemsSummary, roundTotal, formatRoundOff } from "../components/Shared";
import { salesAPI, customerAPI, productAPI, employeeAPI } from "../services/api";
import InvoiceDetailsFields, { partyDetailsFromCustomer } from "../components/InvoiceDetailsFields";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import RefundModal, { RefundHistory } from "../components/RefundModal";
import { downloadCSV } from "../services/csvExport";
import {
  periodRange, inPeriod, matchesSearch, money, FilterSelect, SearchInput, PeriodFilter,
  StatusTabs, ClearFiltersButton, SummaryCards, RowMenu, toolbarStyle,
} from "../components/ListFilters";

// Order stage for the list tabs: cancelled, or open with no / part / full advance.
const ORDER_STAGES = [
  { value: "none", label: "No advance" },
  { value: "part", label: "Part advance" },
  { value: "paid", label: "Fully paid" },
  { value: "cancelled", label: "Cancelled" },
];
const STAGE_COLOR = { none: "red", part: "yellow", paid: "green", cancelled: "gray" };
const ORDER_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amountDesc", label: "Amount: high to low" },
  { value: "amountAsc", label: "Amount: low to high" },
  { value: "balanceDesc", label: "Balance: high to low" },
];
const orderBalance = o => o.status === "Cancelled" ? 0 : Math.max(0, (+o.grandTotal || 0) - (+o.amountPaid || 0));
const orderStage = o => {
  if (o.status === "Cancelled") return "cancelled";
  if (!(+o.amountPaid > 0)) return "none";
  return orderBalance(o) > 0 ? "part" : "paid";
};
const salespersonOf = o => o.salesEmployee?.name || o.salesEmployeeName || "";
const orderSearchText = o => [
  o.orderNo, o.customer?.name, o.customerName, o.customer?.phone, salespersonOf(o), o.createdByName, o.notes, o.saleType,
  Math.round(o.grandTotal || 0),
  ...(o.items || []).flatMap(i => [i.productName, i.product?.name, i.product?.modelNumber, i.description]),
].filter(Boolean).join(" ").toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const currentUser = () => { try { return JSON.parse(localStorage.getItem("ht_user") || "null"); } catch { return null; } };

function OrderAdvanceModal({ order, onClose, onDone, isAdmin: adminRole, onEditPayment, onDeletePayment }) {
  const isAdmin = adminRole && !order.refunds?.length;
  const [form, setForm] = useState({ amount:"", method:"Cash", date:today(), notes:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remaining = order.status === "Cancelled" ? 0 : Math.max(0, (+order.grandTotal || 0) - (+order.amountPaid || 0));
  const customerAdvance = (order.payments || []).reduce((sum,payment) => sum + (+payment.advanceAmount || 0), 0);
  const payments = [...(order.payments || [])].sort((a,b) => new Date(b.date) - new Date(a.date));
  const submit = async () => {
    if (!+form.amount || +form.amount <= 0) return setError("Enter a valid advance amount.");
    setSaving(true); setError("");
    try {
      const response = await salesAPI.payForOrder(order._id, { ...form, amount:+form.amount });
      onDone(response.message || "Advance payment added successfully");
    } catch (err) { setError(err.message); setSaving(false); }
  };
  return <Modal open wide title={`Advance Payments - ${order.orderNo}`} onClose={onClose}>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
      {[["Order Total",order.grandTotal,"#0f1535"],["Applied to Order",order.amountPaid,"#17855a"],["Remaining",remaining,"#d0433d"],["Extra Advance",customerAdvance,"#c026d3"]].map(([label,value,color]) => <div key={label} style={{background:"#f7f8fc",border:"1px solid #e6e9f2",borderRadius:8,padding:12}}><div style={{fontSize:10,fontWeight:800,color:"#6b7392",textTransform:"uppercase"}}>{label}</div><div style={{fontSize:19,fontWeight:900,color,marginTop:4}}>₹{(+value||0).toLocaleString("en-IN")}</div></div>)}
    </div>
    <div style={{ fontWeight:800, marginBottom:8 }}>Advance Payment History</div>
    <RefundHistory record={order} />
    <div style={{ maxHeight:220, overflowY:"auto", border:"1px solid #e6e9f2", borderRadius:8, marginBottom:16 }}>
      {payments.length ? payments.map((payment,index) => <div key={payment._id||index} style={{display:"grid",gridTemplateColumns:"115px 120px 1fr 120px",gap:8,padding:10,borderBottom:"1px solid #e6e9f2",alignItems:"center"}}><span>{new Date(payment.date).toLocaleDateString("en-IN")}</span><Badge color="green">{payment.paymentMode}</Badge><span style={{color:"#6b7392"}}>{payment.notes||"-"}<small style={{display:"block"}}>Recorded by {payment.recordedByName||"Staff"}</small>{+payment.advanceAmount>0&&<small style={{display:"block",color:"#c026d3",fontWeight:800}}>₹{(+payment.advanceAmount).toLocaleString("en-IN")} moved to advance</small>}{isAdmin&&payment._id&&<span style={{display:"flex",gap:6,marginTop:5}}><Btn sm color="blue" onClick={()=>onEditPayment(payment)}>Edit Payment</Btn><Btn sm color="red" onClick={()=>onDeletePayment(payment)}>Delete</Btn></span>}</span><strong style={{textAlign:"right",color:"#17855a"}}>₹{(+payment.amount||0).toLocaleString("en-IN")}</strong></div>) : <div style={{padding:24,textAlign:"center",color:"#9aa1b9"}}>No advance payments recorded.</div>}
    </div>
    {order.status === "Open" ? <div style={{background:"#f0faf5",border:"1px solid #a8e2c6",borderRadius:8,padding:14}}>
      <div style={{fontWeight:800,color:"#13734d",marginBottom:10}}>Add Another Advance Payment</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
        <FormGroup label="Amount"><FormInput type="number" min="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} /></FormGroup>
        <FormGroup label="Payment Method"><FormSelect value={form.method} onChange={e=>setForm(p=>({...p,method:e.target.value}))}>{["Cash","UPI","Card","Bank Transfer","Cheque"].map(method=><option key={method}>{method}</option>)}</FormSelect></FormGroup>
        <FormGroup label="Payment Date"><FormInput type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></FormGroup>
        <FormGroup label="Notes / Reference"><FormInput value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} /></FormGroup>
      </div>
      {+form.amount > remaining && <div style={{color:"#c026d3",marginBottom:10,fontWeight:700}}>₹{(+form.amount-remaining).toLocaleString("en-IN")} extra will be stored as customer advance.</div>}
      {error && <div style={{color:"#d0433d",marginBottom:10}}>{error}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn color="cancel" onClick={onClose}>Close</Btn><Btn color="green" disabled={saving} onClick={submit}>{saving?"Saving...":"Add Advance Payment"}</Btn></div>
    </div> : <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",color:"#6b7392"}}><span>This order is no longer open; new advances cannot be added.</span><Btn color="cancel" onClick={onClose}>Close</Btn></div>}
  </Modal>;
}

function OrderPaymentEditModal({ order, payment, onClose, onDone }) {
  const [form,setForm]=useState({amount:String(payment.amount||""),method:payment.paymentMode||"Cash",date:payment.date?new Date(payment.date).toISOString().slice(0,10):today(),notes:payment.notes||""});
  const [saving,setSaving]=useState(false);const [error,setError]=useState("");
  const save=async()=>{if(!(+form.amount>0))return setError("Enter a valid payment amount.");setSaving(true);setError("");try{const response=await salesAPI.updateOrderPayment(order._id,payment._id,{...form,amount:+form.amount});onDone(response);}catch(err){setError(err.message);setSaving(false);}};
  return <Modal open title={`Edit Advance - ${order.orderNo}`} onClose={onClose}><FormGroup label="Amount"><FormInput type="number" min="0.01" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/></FormGroup><FormGroup label="Payment Method"><FormSelect value={form.method} onChange={e=>setForm(p=>({...p,method:e.target.value}))}>{["Cash","UPI","Card","Bank Transfer","Cheque"].map(method=><option key={method}>{method}</option>)}</FormSelect></FormGroup><FormGroup label="Date"><FormInput type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></FormGroup><FormGroup label="Notes / Reference"><FormInput value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></FormGroup>{error&&<div style={{color:"#d0433d",marginBottom:10}}>{error}</div>}<div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn color="cancel" onClick={onClose}>Cancel</Btn><Btn color="teal" disabled={saving} onClick={save}>{saving?"Saving...":"Save Payment"}</Btn></div></Modal>;
}

export function OrderEditModal({ order, onClose, onDone, documentName="Order", updateRecord=salesAPI.updateOrder }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer: order.customer?._id || order.customer || "", customerName: order.customerName || "",
    saleType: order.saleType || "GST Invoice", paymentMode: order.paymentMode || "Credit",
    date: new Date(order.date).toISOString().slice(0, 10), isInterState: !!order.isInterState, notes: order.notes || "",
    invoiceDetails: order.invoiceDetails || { billTo:{}, shipTo:{} }, salesEmployee: order.salesEmployee?._id || order.salesEmployee || "",
    ...(documentName === "Quotation" ? { amountPaid:order.amountPaid || 0 } : {}),
  });
  const [items, setItems] = useState((order.items || []).map(item => ({
    product: item.product?._id || item.product || "", description: item.description || "", warehouse: item.warehouse || "Main Warehouse",
    qty: item.qty || 1, rate: item.rate ?? "", billingRate: item.billingRate ?? item.rate ?? "", discount: item.discount || 0,
    gstRate: item.gstRate ?? 18, transportAmount: item.transportAmount || 0, transportGstRate: item.transportGstRate || 0,
  })));

  useEffect(() => { Promise.all([customerAPI.getAll(), productAPI.getAll(), employeeAPI.getAll()]).then(([c, p, e]) => {
    setCustomers(c.data || []); setProducts(p.data || []); setEmployees(e.data || []);
    setForm(prev => {
      const customer=(c.data || []).find(item=>item._id===prev.customer);
      if(!customer) return prev;
      const party=partyDetailsFromCustomer(customer); const current=prev.invoiceDetails || {};
      const hasCustomConsignee=current.shipTo?.name || current.shipTo?.address || current.shipTo?.gstin;
      return {...prev,invoiceDetails:{...current,billTo:party,shipTo:hasCustomConsignee?current.shipTo:{...party}}};
    });
  }).catch(() => {}); }, []);
  const changeForm = key => e => setForm(prev => ({ ...prev, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const changeItem = (index, key, value) => setItems(prev => prev.map((item, i) => {
    if (i !== index) return item;
    const next = { ...item, [key]: value };
    if (key === "product") {
      const product = products.find(p => p._id === value);
      next.rate = product?.sellingPrice ?? ""; next.billingRate = product?.sellingPrice ?? ""; next.gstRate = product?.gstRate ?? 18;
    }
    return next;
  }));
  const addItem = () => setItems(prev => [...prev, { product:"", description:"", warehouse:"Main Warehouse", qty:1, rate:"", billingRate:"", discount:0, gstRate:18, transportAmount:0, transportGstRate:0 }]);
  const removeItem = index => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  const itemTotal = item => {
    const gross = (+item.rate || 0) * (+item.qty || 0);
    const discount = gross * (+item.discount || 0) / 100;
    const billing = (+item.billingRate || 0) * (+item.qty || 0);
    const gst = Math.max(0, billing - discount) * (+item.gstRate || 0) / 100;
    const transport = +item.transportAmount || 0;
    return gross - discount + gst + transport + transport * (+item.transportGstRate || 0) / 100;
  };
  const { total, roundOff } = roundTotal(items.reduce((sum, item) => sum + itemTotal(item), 0));

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (!items.length || items.some(item => !item.product || +item.qty <= 0 || +item.rate <= 0)) throw new Error("Every item requires a product, quantity and rate.");
      if (!form.customer) throw new Error("Select a registered customer.");
      const res = await updateRecord(order._id, { ...form, customer: form.customer || undefined, items: items.map(item => ({ ...item, qty:+item.qty, rate:+item.rate, billingRate:+item.billingRate, discount:+item.discount || 0, gstRate:+item.gstRate || 0, transportAmount:+item.transportAmount || 0, transportGstRate:+item.transportGstRate || 0 })) });
      onDone(res.message || `${documentName} updated successfully`);
    } catch (err) { setError(err.message); setSaving(false); }
  };

  return <Modal open wide title={`Edit ${documentName} - ${order.orderNo || order.quotationNo}`} onClose={onClose}>
    {order.status === "Converted" && <div style={{ background:"#f2f6fe", border:"1px solid #cddcf7", color:"#3d63c4", borderRadius:7, padding:10, marginBottom:12, fontSize:12 }}>This order has already been converted. Changes here update the original order record only; the linked sale remains unchanged.</div>}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10 }}>
      <FormGroup label={`${documentName} Date`}><FormInput type="date" value={form.date} onChange={changeForm("date")} /></FormGroup>
      <FormGroup label="Sale Type"><FormSelect value={form.saleType} onChange={changeForm("saleType")}>{["GST Invoice","Cash Sale"].map(x => <option key={x}>{x}</option>)}</FormSelect></FormGroup>
      {documentName === "Quotation" && <FormGroup label="Payment Mode"><FormSelect value={form.paymentMode} onChange={changeForm("paymentMode")}>{["Credit","Cash","UPI","Card","Bank Transfer","Cheque"].map(x => <option key={x}>{x}</option>)}</FormSelect></FormGroup>}
      <FormGroup label="Customer"><FormSelect value={form.customer} onChange={e => { const customer=customers.find(item=>item._id===e.target.value); const party=partyDetailsFromCustomer(customer); setForm(p => ({...p, customer:e.target.value, customerName:"", invoiceDetails:{...(p.invoiceDetails||{}),billTo:party,shipTo:{...party}}})); }}><option value="">Select customer</option>{customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}</FormSelect></FormGroup>
      <FormGroup label="Sale Made By (Employee)"><FormSelect value={form.salesEmployee} onChange={changeForm("salesEmployee")}><option value="">Select employee</option>{employees.map(employee => <option key={employee._id} value={employee._id}>{employee.name} (M: {employee.manufacturingIncentivePercent || 0}% / I: {employee.importedIncentivePercent || 0}%)</option>)}</FormSelect></FormGroup>
      {documentName === "Quotation" ? <FormGroup label="Advance Paid"><FormInput type="number" min="0" max={total || undefined} value={form.amountPaid} onChange={changeForm("amountPaid")} /></FormGroup> : <FormGroup label="Advance payments (read-only)"><div style={{padding:10,background:"#f0faf5",border:"1px solid #c6ecd9",borderRadius:7}}><strong>₹{(order.payments?.length ? order.payments.reduce((sum,p)=>sum+(+p.amount||0),0) : (+order.amountPaid||0)).toLocaleString("en-IN")}</strong><div style={{fontSize:11,color:"#4a5272",marginTop:5}}>Use Advances to add payments. Admins can edit or delete individual payments there.</div></div></FormGroup>}
    </div>
    <label style={{ display:"flex", gap:7, alignItems:"center", marginBottom:12, fontWeight:700 }}><input type="checkbox" checked={form.isInterState} onChange={changeForm("isInterState")} /> Inter-state {documentName.toLowerCase()}</label>
    <InvoiceDetailsFields value={form.invoiceDetails} onChange={invoiceDetails => setForm(prev => ({ ...prev, invoiceDetails }))} />
    <div style={{ overflowX:"auto", border:"1px solid #e6e9f2", borderRadius:8, marginBottom:14 }}>
      <div style={{ minWidth:1180 }}>
        <div style={{ display:"grid", gridTemplateColumns:"190px 130px 130px 60px 85px 85px 70px 65px 85px 75px 85px 35px", gap:6, padding:8, background:"#f7f8fc", fontSize:10, fontWeight:800 }}>
          {["Product","Description","Warehouse","Qty","Rate","Billing Rate","Disc. %","GST %","Transport","Trans. GST %","Total",""].map(x => <div key={x}>{x}</div>)}
        </div>
        {items.map((item, index) => <div key={index} style={{ display:"grid", gridTemplateColumns:"190px 130px 130px 60px 85px 85px 70px 65px 85px 75px 85px 35px", gap:6, padding:8, borderTop:"1px solid #e6e9f2", alignItems:"start" }}>
          <select value={item.product} onChange={e => changeItem(index,"product",e.target.value)} style={{ padding:6, minWidth:0 }}><option value="">Select product</option>{products.map(p => <option key={p._id} value={p._id}>{p.name} | {p.modelNumber}</option>)}</select>
          <textarea rows="2" value={item.description} onChange={e => changeItem(index,"description",e.target.value)} style={{ padding:6, resize:"vertical" }} />
          <input value={item.warehouse} onChange={e => changeItem(index,"warehouse",e.target.value)} />
          {[["qty",1],["rate",0],["billingRate",0],["discount",0]].map(([key,min]) => <input key={key} type="number" min={min} value={item[key]} onChange={e => changeItem(index,key,e.target.value)} style={{ minWidth:0, padding:6 }} />)}
          <select value={item.gstRate} onChange={e => changeItem(index,"gstRate",e.target.value)}>{[0,5,9,12,18,28].map(x => <option key={x} value={x}>{x}%</option>)}</select>
          <input type="number" min="0" value={item.transportAmount} onChange={e => changeItem(index,"transportAmount",e.target.value)} style={{ minWidth:0, padding:6 }} />
          <select value={item.transportGstRate} onChange={e => changeItem(index,"transportGstRate",e.target.value)}>{[0,5,12,18,28].map(x => <option key={x} value={x}>{x}%</option>)}</select>
          <strong style={{ paddingTop:7 }}>₹{itemTotal(item).toFixed(2)}</strong>
          <button onClick={() => removeItem(index)} style={{ border:0, background:"#fdeceb", color:"#a33a35", height:30, cursor:"pointer" }}>×</button>
        </div>)}
        <div style={{ padding:8 }}><Btn sm color="blue" onClick={addItem}>+ Add Item</Btn></div>
      </div>
    </div>
    <FormGroup label="Notes"><textarea rows="3" value={form.notes} onChange={changeForm("notes")} style={{ width:"100%", padding:9, border:"1px solid #dde1ec", borderRadius:7, boxSizing:"border-box" }} /></FormGroup>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}><div><strong>{documentName} Total: ₹{total.toLocaleString("en-IN")}</strong>{roundOff !== 0 && <div style={{ fontSize:11, color:"#6b7392", marginTop:2 }}>Round off {formatRoundOff(roundOff)}</div>}</div><div style={{ display:"flex", gap:8 }}><Btn color="cancel" onClick={onClose}>Cancel</Btn><Btn color="teal" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Changes"}</Btn></div></div>
    {error && <div style={{ color:"#d0433d", marginTop:10 }}>{error}</div>}
  </Modal>;
}

export default function OrdersList({ navigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [advanceOrder, setAdvanceOrder] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const isAdmin = currentUser()?.role === "admin";
  const [form, setForm] = useState({ date: today(), paymentMode: "Credit", amountPaid: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [saleType, setSaleType] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [sort, setSort] = useState("newest");

  // All open orders are loaded once; every filter below runs instantly in the browser.
  const load = () => {
    setLoading(true);
    salesAPI.getOrders().then(res => { setOrders(res.data || []); setError(""); }).catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  // ── Filtering ──
  const range = periodRange(period, customFrom, customTo);
  const salespeople = [...new Set(orders.map(salespersonOf).filter(Boolean))].sort();
  const baseOrders = orders.filter(o =>
    inPeriod(o.date, range)
    && (!saleType || o.saleType === saleType)
    && (!salesperson || salespersonOf(o) === salesperson)
    && matchesSearch(orderSearchText(o), search)
  );
  const stageCounts = ORDER_STAGES.reduce((acc, st) => ({ ...acc, [st.value]: baseOrders.filter(o => orderStage(o) === st.value).length }), {});
  const visibleOrders = baseOrders
    .filter(o => !stage || orderStage(o) === stage)
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.date) - new Date(b.date);
      if (sort === "amountDesc") return (b.grandTotal || 0) - (a.grandTotal || 0);
      if (sort === "amountAsc") return (a.grandTotal || 0) - (b.grandTotal || 0);
      if (sort === "balanceDesc") return orderBalance(b) - orderBalance(a);
      return new Date(b.date) - new Date(a.date) || String(b.orderNo).localeCompare(String(a.orderNo));
    });
  const activeFilterCount = [search.trim(), stage, period !== "all", saleType, salesperson].filter(Boolean).length;
  const clearFilters = () => {
    setSearch(""); setStage(""); setPeriod("all"); setCustomFrom(""); setCustomTo(""); setSaleType(""); setSalesperson("");
  };
  const liveOrders = visibleOrders.filter(o => o.status !== "Cancelled");
  const pipelineValue = liveOrders.reduce((sum, o) => sum + (+o.grandTotal || 0), 0);
  const advanceTotal = liveOrders.reduce((sum, o) => sum + (+o.amountPaid || 0), 0);
  const balanceTotal = liveOrders.reduce((sum, o) => sum + orderBalance(o), 0);
  const readyCount = liveOrders.filter(o => orderStage(o) === "paid").length;

  const openConvert = order => {
    setConverting(order);
    setForm({ date: today(), paymentMode: order.paymentMode || "Credit", amountPaid: "" });
  };
  const convert = async () => {
    setSaving(true);
    try {
      const res = await salesAPI.convertOrder(converting._id, { ...form, amountPaid: +form.amountPaid || 0 });
      setConverting(null);
      setToast(res.message);
      setTimeout(() => setToast(""), 3000);
      load();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };
  const edited = message => { setEditing(null); setToast(message); setTimeout(() => setToast(""), 3000); load(); };
  const advanceAdded = message => { setAdvanceOrder(null); setToast(message); setTimeout(() => setToast(""), 3000); load(); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <PageTitle>All Orders</PageTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Btn color="cancel" onClick={() => downloadCSV(visibleOrders, [
            { label: "Order No.", key: "orderNo" },
            { label: "Date", key: "date" },
            { label: "Customer", key: "customer.name" },
            { label: "Sale Type", key: "saleType" },
            { label: "Salesperson", key: "salesEmployeeName" },
            { label: "Total (₹)", key: "grandTotal" },
            { label: "Advance (₹)", key: "amountPaid" },
            { label: "Status", key: "status" },
            { label: "Notes", key: "notes" },
          ], "orders")}>Export CSV</Btn>
          <Btn color="teal" onClick={() => navigate("order-create")}>+ Create Order</Btn>
        </div>
      </div>
      {toast && <SuccessToast msg={toast} />}

      <SummaryCards cards={[
        { label: "Open Orders", value: liveOrders.length, color: "#5a8be8", sub: activeFilterCount ? `of ${orders.length} total` : "awaiting conversion" },
        { label: "Order Value", value: money(pipelineValue), color: "#7c3aed", sub: "excludes cancelled" },
        { label: "Advance Received", value: money(advanceTotal), color: "#1f9d6b", sub: pipelineValue > 0 ? `${((advanceTotal / pipelineValue) * 100).toFixed(1)}% of value` : "—" },
        { label: "Balance to Collect", value: money(balanceTotal), color: "#e0524c", sub: readyCount ? `${readyCount} fully paid, ready to convert` : "on conversion" },
      ]} />

      <div style={toolbarStyle}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <SearchInput value={search} onChange={setSearch} label="Search orders"
            placeholder="Search order no., customer, phone, product, salesperson…" />
          <PeriodFilter period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
          <FilterSelect label="Sort" value={sort} onChange={setSort}>
            {ORDER_SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </FilterSelect>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <StatusTabs value={stage} onChange={setStage} tabs={[
            { value: "", label: "All", count: baseOrders.length },
            ...ORDER_STAGES.map(st => ({ value: st.value, label: st.label, count: stageCounts[st.value] })),
          ]} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <FilterSelect label="Sale type" value={saleType} onChange={setSaleType}>
              <option value="">All types</option>
              {["GST Invoice", "Cash Sale"].map(t => <option key={t}>{t}</option>)}
            </FilterSelect>
            {salespeople.length > 0 && (
              <FilterSelect label="Salesperson" value={salesperson} onChange={setSalesperson}>
                <option value="">All salespeople</option>
                {salespeople.map(p => <option key={p}>{p}</option>)}
              </FilterSelect>
            )}
            <ClearFiltersButton count={activeFilterCount} onClick={clearFilters} />
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead><tr>{["Order", "Customer", "Items", "Total", "Advance", "Balance", "Status", ""].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {visibleOrders.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState text={orders.length ? "No orders match these filters." : "No open orders."} />
                {activeFilterCount > 0 && <div style={{ textAlign: "center", marginTop: -36, paddingBottom: 28 }}><Btn sm color="cancel" onClick={clearFilters}>Clear filters</Btn></div>}
              </td></tr>
            ) : visibleOrders.map(order => {
              const balance = orderBalance(order);
              const refunded = (order.refunds || []).reduce((sum, r) => sum + r.amount, 0);
              const locked = !!order.refunds?.length;
              return (
                <tr key={order._id}
                  style={{ borderBottom: "1px solid #f1f3f9", opacity: order.status === "Cancelled" ? 0.62 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#faf8ff"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <Td style={{ whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => setViewing(order)}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "monospace", color: "#0284c7", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                      {order.orderNo}
                    </button>
                    <div style={{ fontSize: 11, color: "#6b7392", marginTop: 3 }}>{new Date(order.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    <div style={{ fontSize: 10.5, color: "#9aa1b9", marginTop: 1 }}>{order.saleType}</div>
                  </Td>
                  <Td style={{ minWidth: 190 }}>
                    <div style={{ fontWeight: 700, color: "#0f1535" }}>{order.customer?.name || order.customerName || "Walk-in"}</div>
                    {order.customer?.phone && <div style={{ fontSize: 11, color: "#9aa1b9", marginTop: 2 }}>{order.customer.phone}</div>}
                    {salespersonOf(order) && <div style={{ fontSize: 11, color: "#6b7392", marginTop: 2 }}>by {salespersonOf(order)}</div>}
                  </Td>
                  <Td><ItemsSummary items={order.items} /></Td>
                  <Td style={{ fontWeight: 800, color: "#0f1535", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(order.grandTotal)}</Td>
                  <Td style={{ color: "#1f9d6b", fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{+order.amountPaid > 0 ? money(order.amountPaid) : <span style={{ color: "#b8bdd0" }}>—</span>}</Td>
                  <Td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{balance > 0 ? <span style={{ color: "#c0392b", fontWeight: 700 }}>{money(balance)}</span> : <span style={{ color: "#b8bdd0" }}>—</span>}</Td>
                  <Td>
                    <Badge color={STAGE_COLOR[orderStage(order)] || "gray"}>{ORDER_STAGES.find(st => st.value === orderStage(order))?.label}</Badge>
                    {refunded > 0 && <div style={{ color: "#b45309", fontWeight: 700, fontSize: 11, marginTop: 4 }}>Refunded {money(refunded)}</div>}
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                      {order.status === "Open" && <Btn sm color="green" onClick={() => openConvert(order)}>Convert</Btn>}
                      <Btn sm color="cancel" onClick={() => setViewing(order)}>View</Btn>
                      <RowMenu items={[
                        { label: `Advance payments (${order.payments?.length || 0})`, onClick: () => setAdvanceOrder(order) },
                        { label: "Edit order", onClick: () => setEditing(order), disabled: locked, disabledReason: "Orders with refunds cannot be edited" },
                        { label: "Refunds", onClick: () => setRefundOrder(order) },
                      ]} />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
          {visibleOrders.length > 0 && (
            <tfoot>
              <tr style={{ background: "#f5f3ff", borderTop: "2px solid #ddd6fe" }}>
                <td colSpan={3} style={{ padding: "11px 14px", fontWeight: 800, fontSize: 12, color: "#4c1d95" }}>Total · {liveOrders.length} order{liveOrders.length === 1 ? "" : "s"}</td>
                <td style={{ padding: "11px 14px", fontWeight: 800, color: "#0f1535", whiteSpace: "nowrap" }}>{money(pipelineValue)}</td>
                <td style={{ padding: "11px 14px", fontWeight: 800, color: "#1f9d6b", whiteSpace: "nowrap" }}>{money(advanceTotal)}</td>
                <td style={{ padding: "11px 14px", fontWeight: 800, color: balanceTotal > 0 ? "#c0392b" : "#9aa1b9", whiteSpace: "nowrap" }}>{balanceTotal > 0 ? money(balanceTotal) : "—"}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table></TableWrap>
      )}

      <Modal open={!!converting} onClose={() => !saving && setConverting(null)} title={`Convert ${converting?.orderNo || "Order"} to Sale`}>
        <div style={{ color: "#6b7392", fontSize: 12, marginBottom: 14 }}>The order will move to All Sales as a new sale dated below, and will be removed from this list.</div>
        <FormGroup label="Sale Date"><FormInput type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></FormGroup>
        <FormGroup label="Payment Mode"><FormSelect value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}>{["Credit","Cash","UPI","Card","Bank Transfer","Cheque"].map(x => <option key={x}>{x}</option>)}</FormSelect></FormGroup>
        {converting?.amountPaid > 0 && <div style={{ background:"#f0faf5", border:"1px solid #a8e2c6", color:"#13734d", padding:10, borderRadius:7, marginBottom:10 }}>Order advance already received: <strong>₹{(+converting.amountPaid).toLocaleString("en-IN")}</strong></div>}
        <FormGroup label="Additional Amount Paid During Conversion"><FormInput type="number" min="0" value={form.amountPaid} onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))} placeholder="0" /></FormGroup>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn color="cancel" onClick={() => setConverting(null)}>Cancel</Btn><Btn color="green" disabled={saving} onClick={convert}>{saving ? "Converting..." : "Convert to Sale"}</Btn></div>
      </Modal>
      {editing && <OrderEditModal order={editing} onClose={() => setEditing(null)} onDone={edited} />}
      {viewing && <TransactionDetailsModal record={viewing} type="order" onClose={() => setViewing(null)} />}
      {refundOrder && <RefundModal kind="orders" record={refundOrder} isAdmin={isAdmin} onClose={()=>setRefundOrder(null)} onDone={message=>{setToast(message);setTimeout(()=>setToast(""),4000);load();}} />}
      {advanceOrder && <OrderAdvanceModal order={advanceOrder} isAdmin={isAdmin} onEditPayment={payment=>setEditingPayment({order:advanceOrder,payment})} onDeletePayment={async payment=>{if(!confirm(`Delete payment ₹${(+payment.amount||0).toLocaleString("en-IN")}? This will recalculate the order, linked sale and customer advance.`))return;try{const response=await salesAPI.deleteOrderPayment(advanceOrder._id,payment._id);setAdvanceOrder(response.data);setToast(response.message);setTimeout(()=>setToast(""),3000);load();}catch(err){alert(err.message);}}} onClose={() => setAdvanceOrder(null)} onDone={advanceAdded} />}
      {editingPayment && <OrderPaymentEditModal order={editingPayment.order} payment={editingPayment.payment} onClose={()=>setEditingPayment(null)} onDone={response=>{setEditingPayment(null);setAdvanceOrder(response.data);setToast(response.message);setTimeout(()=>setToast(""),3000);load();}} />}
    </div>
  );
}
