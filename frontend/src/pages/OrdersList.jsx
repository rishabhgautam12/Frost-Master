import { useEffect, useState } from "react";
import { PageTitle, Btn, Badge, TableWrap, Th, Td, LoadingSpinner, ErrorMsg, EmptyState, Modal, FormGroup, FormInput, FormSelect, SuccessToast } from "../components/Shared";
import { salesAPI, customerAPI, productAPI, employeeAPI } from "../services/api";
import InvoiceDetailsFields, { partyDetailsFromCustomer } from "../components/InvoiceDetailsFields";
import TransactionDetailsModal from "../components/TransactionDetailsModal";

const statusColor = { Open: "yellow", Converted: "green", Cancelled: "gray" };
const today = () => new Date().toISOString().slice(0, 10);

function OrderEditModal({ order, onClose, onDone }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer: order.customer?._id || order.customer || "", customerName: order.customerName || "",
    saleType: order.saleType || "GST Invoice", paymentMode: order.paymentMode || "Credit",
    date: new Date(order.date).toISOString().slice(0, 10), isInterState: !!order.isInterState, notes: order.notes || "",
    invoiceDetails: order.invoiceDetails || { billTo:{}, shipTo:{} }, salesEmployee: order.salesEmployee?._id || order.salesEmployee || "", amountPaid: order.amountPaid || 0,
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
  const total = items.reduce((sum, item) => sum + itemTotal(item), 0);

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (!items.length || items.some(item => !item.product || +item.qty <= 0 || +item.rate <= 0)) throw new Error("Every item requires a product, quantity and rate.");
      const res = await salesAPI.updateOrder(order._id, { ...form, customer: form.customer || undefined, items: items.map(item => ({ ...item, qty:+item.qty, rate:+item.rate, billingRate:+item.billingRate, discount:+item.discount || 0, gstRate:+item.gstRate || 0, transportAmount:+item.transportAmount || 0, transportGstRate:+item.transportGstRate || 0 })) });
      onDone(res.message || "Order updated successfully");
    } catch (err) { setError(err.message); setSaving(false); }
  };

  return <Modal open wide title={`Edit Order - ${order.orderNo}`} onClose={onClose}>
    {order.status === "Converted" && <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", borderRadius:7, padding:10, marginBottom:12, fontSize:12 }}>This order has already been converted. Changes here update the original order record only; the linked sale remains unchanged.</div>}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10 }}>
      <FormGroup label="Order Date"><FormInput type="date" value={form.date} onChange={changeForm("date")} /></FormGroup>
      <FormGroup label="Sale Type"><FormSelect value={form.saleType} onChange={changeForm("saleType")}>{["GST Invoice","Cash Sale"].map(x => <option key={x}>{x}</option>)}</FormSelect></FormGroup>
      <FormGroup label="Payment Mode"><FormSelect value={form.paymentMode} onChange={changeForm("paymentMode")}>{["Credit","Cash","UPI","Card","Bank Transfer","Cheque"].map(x => <option key={x}>{x}</option>)}</FormSelect></FormGroup>
      <FormGroup label="Customer"><FormSelect value={form.customer} onChange={e => { const customer=customers.find(item=>item._id===e.target.value); const party=partyDetailsFromCustomer(customer); setForm(p => ({...p, customer:e.target.value, customerName:e.target.value ? "" : p.customerName, invoiceDetails:{...(p.invoiceDetails||{}),billTo:party,shipTo:{...party}}})); }}><option value="">Walk-in customer</option>{customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}</FormSelect></FormGroup>
      <FormGroup label="Walk-in Customer Name"><FormInput value={form.customerName} onChange={changeForm("customerName")} /></FormGroup>
      <FormGroup label="Sale Made By (Employee)"><FormSelect value={form.salesEmployee} onChange={changeForm("salesEmployee")}><option value="">Select employee</option>{employees.map(employee => <option key={employee._id} value={employee._id}>{employee.name} (M: {employee.manufacturingIncentivePercent || 0}% / I: {employee.importedIncentivePercent || 0}%)</option>)}</FormSelect></FormGroup>
      <FormGroup label="Advance Paid"><FormInput type="number" min="0" max={total || undefined} value={form.amountPaid} onChange={changeForm("amountPaid")} /></FormGroup>
    </div>
    <label style={{ display:"flex", gap:7, alignItems:"center", marginBottom:12, fontWeight:700 }}><input type="checkbox" checked={form.isInterState} onChange={changeForm("isInterState")} /> Inter-state order</label>
    <InvoiceDetailsFields value={form.invoiceDetails} onChange={invoiceDetails => setForm(prev => ({ ...prev, invoiceDetails }))} />
    <div style={{ overflowX:"auto", border:"1px solid #e2e8f0", borderRadius:8, marginBottom:14 }}>
      <div style={{ minWidth:1180 }}>
        <div style={{ display:"grid", gridTemplateColumns:"190px 130px 130px 60px 85px 85px 70px 65px 85px 75px 85px 35px", gap:6, padding:8, background:"#f8fafc", fontSize:10, fontWeight:800 }}>
          {["Product","Description","Warehouse","Qty","Rate","Billing Rate","Disc. %","GST %","Transport","Trans. GST %","Total",""].map(x => <div key={x}>{x}</div>)}
        </div>
        {items.map((item, index) => <div key={index} style={{ display:"grid", gridTemplateColumns:"190px 130px 130px 60px 85px 85px 70px 65px 85px 75px 85px 35px", gap:6, padding:8, borderTop:"1px solid #e2e8f0", alignItems:"start" }}>
          <select value={item.product} onChange={e => changeItem(index,"product",e.target.value)} style={{ padding:6, minWidth:0 }}><option value="">Select product</option>{products.map(p => <option key={p._id} value={p._id}>{p.name} | {p.modelNumber}</option>)}</select>
          <textarea rows="2" value={item.description} onChange={e => changeItem(index,"description",e.target.value)} style={{ padding:6, resize:"vertical" }} />
          <input value={item.warehouse} onChange={e => changeItem(index,"warehouse",e.target.value)} />
          {[["qty",1],["rate",0],["billingRate",0],["discount",0]].map(([key,min]) => <input key={key} type="number" min={min} value={item[key]} onChange={e => changeItem(index,key,e.target.value)} style={{ minWidth:0, padding:6 }} />)}
          <select value={item.gstRate} onChange={e => changeItem(index,"gstRate",e.target.value)}>{[0,5,9,12,18,28].map(x => <option key={x} value={x}>{x}%</option>)}</select>
          <input type="number" min="0" value={item.transportAmount} onChange={e => changeItem(index,"transportAmount",e.target.value)} style={{ minWidth:0, padding:6 }} />
          <select value={item.transportGstRate} onChange={e => changeItem(index,"transportGstRate",e.target.value)}>{[0,5,12,18,28].map(x => <option key={x} value={x}>{x}%</option>)}</select>
          <strong style={{ paddingTop:7 }}>₹{itemTotal(item).toFixed(2)}</strong>
          <button onClick={() => removeItem(index)} style={{ border:0, background:"#fee2e2", color:"#991b1b", height:30, cursor:"pointer" }}>×</button>
        </div>)}
        <div style={{ padding:8 }}><Btn sm color="blue" onClick={addItem}>+ Add Item</Btn></div>
      </div>
    </div>
    <FormGroup label="Notes"><textarea rows="3" value={form.notes} onChange={changeForm("notes")} style={{ width:"100%", padding:9, border:"1px solid #d1d5db", borderRadius:7, boxSizing:"border-box" }} /></FormGroup>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}><strong>Order Total: ₹{total.toLocaleString("en-IN", { maximumFractionDigits:2 })}</strong><div style={{ display:"flex", gap:8 }}><Btn color="cancel" onClick={onClose}>Cancel</Btn><Btn color="teal" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Changes"}</Btn></div></div>
    {error && <div style={{ color:"#dc2626", marginTop:10 }}>{error}</div>}
  </Modal>;
}

export default function OrdersList({ navigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ date: today(), paymentMode: "Credit", amountPaid: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const load = (filters = {}) => {
    setLoading(true);
    const selectedDate = filters.dateFilter ?? dateFilter;
    const selectedMonth = filters.monthFilter ?? monthFilter;
    const params = selectedDate
      ? { from: selectedDate, to: selectedDate }
      : selectedMonth ? { from: `${selectedMonth}-01`, to: `${selectedMonth}-${String(new Date(+selectedMonth.slice(0, 4), +selectedMonth.slice(5, 7), 0).getDate()).padStart(2, "0")}` } : {};
    salesAPI.getOrders(params).then(res => { setOrders(res.data || []); setError(""); }).catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

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

  return (
    <div>
      <PageTitle>All Orders</PageTitle>
      {toast && <SuccessToast msg={toast} />}
      <div className="order-filter-bar" style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end", marginBottom:14 }}>
        <div style={{ marginBottom:14 }}><Btn color="teal" onClick={() => navigate("order-create")}>+ Create Order</Btn></div>
        <FormGroup label="Filter by month"><FormInput type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); if (e.target.value) setDateFilter(""); }} /></FormGroup>
        <FormGroup label="Filter by date"><FormInput type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); if (e.target.value) setMonthFilter(""); }} /></FormGroup>
        <div style={{ marginBottom:14 }}><Btn color="blue" onClick={() => load()}>Filter</Btn></div>
        <div style={{ marginBottom:14 }}><Btn color="cancel" onClick={() => { setMonthFilter(""); setDateFilter(""); load({ monthFilter:"", dateFilter:"" }); }}>Reset</Btn></div>
      </div>
      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : orders.length === 0 ? <EmptyState text="No orders found." /> : (
        <TableWrap><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr>{["Order No.", "Order Date", "Customer", "Items", "Total", "Advance Paid", "Status", "Converted Sale", "Actions"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>{orders.map(order => (
            <tr key={order._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <Td style={{ fontWeight: 800 }}>{order.orderNo}</Td>
              <Td>{new Date(order.date).toLocaleDateString("en-IN")}</Td>
              <Td>{order.customer?.name || order.customerName || "Walk-in"}</Td>
              <Td>{(order.items || []).map((item, index) => <div key={item._id || index} style={{ marginBottom:4 }}><strong>{item.productName || item.product?.name}</strong>{item.description && <div style={{ color:"#64748b", fontSize:10.5, whiteSpace:"pre-wrap" }}>{item.description}</div>}</div>)}</Td>
              <Td style={{ fontWeight: 800 }}>₹{(+order.grandTotal || 0).toLocaleString("en-IN")}</Td>
              <Td style={{ color:"#15803d", fontWeight:800 }}>₹{(+order.amountPaid || 0).toLocaleString("en-IN")}</Td>
              <Td><Badge color={statusColor[order.status] || "gray"}>{order.status}</Badge></Td>
              <Td>{order.convertedSale ? `${order.convertedSale.invoiceNo} (${new Date(order.convertedSale.date).toLocaleDateString("en-IN")})` : "-"}</Td>
              <Td><div style={{ display:"flex", gap:6, flexWrap:"wrap" }}><Btn sm color="teal" onClick={() => setViewing(order)}>View Details</Btn><Btn sm color="blue" onClick={() => setEditing(order)}>Edit Details</Btn>{order.status === "Open" && <Btn sm color="green" onClick={() => openConvert(order)}>Convert to Sale</Btn>}</div></Td>
            </tr>
          ))}</tbody>
        </table></TableWrap>
      )}

      <Modal open={!!converting} onClose={() => !saving && setConverting(null)} title={`Convert ${converting?.orderNo || "Order"} to Sale`}>
        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>The order will remain in this list with its original date. The new sale will use the date below.</div>
        <FormGroup label="Sale Date"><FormInput type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></FormGroup>
        <FormGroup label="Payment Mode"><FormSelect value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}>{["Credit","Cash","UPI","Card","Bank Transfer","Cheque"].map(x => <option key={x}>{x}</option>)}</FormSelect></FormGroup>
        {converting?.amountPaid > 0 && <div style={{ background:"#f0fdf4", border:"1px solid #86efac", color:"#166534", padding:10, borderRadius:7, marginBottom:10 }}>Order advance already received: <strong>₹{(+converting.amountPaid).toLocaleString("en-IN")}</strong></div>}
        <FormGroup label="Additional Amount Paid During Conversion"><FormInput type="number" min="0" value={form.amountPaid} onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))} placeholder="0" /></FormGroup>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn color="cancel" onClick={() => setConverting(null)}>Cancel</Btn><Btn color="green" disabled={saving} onClick={convert}>{saving ? "Converting..." : "Convert to Sale"}</Btn></div>
      </Modal>
      {editing && <OrderEditModal order={editing} onClose={() => setEditing(null)} onDone={edited} />}
      {viewing && <TransactionDetailsModal record={viewing} type="order" onClose={() => setViewing(null)} />}
    </div>
  );
}
