import { useEffect, useState } from "react";
import { PageTitle, Btn, Badge, TableWrap, Th, Td, LoadingSpinner, ErrorMsg, EmptyState, Modal, FormGroup, FormInput, FormSelect, SuccessToast } from "../components/Shared";
import { salesAPI } from "../services/api";

const statusColor = { Open: "yellow", Converted: "green", Cancelled: "gray" };
const today = () => new Date().toISOString().slice(0, 10);

export default function OrdersList({ navigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(null);
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

  return (
    <div>
      <PageTitle>All Orders</PageTitle>
      {toast && <SuccessToast msg={toast} />}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"end", marginBottom:14 }}>
        <Btn color="teal" onClick={() => navigate("order-create")}>+ Create Order</Btn>
        <FormGroup label="Filter by month"><FormInput type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); if (e.target.value) setDateFilter(""); }} /></FormGroup>
        <FormGroup label="Filter by date"><FormInput type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); if (e.target.value) setMonthFilter(""); }} /></FormGroup>
        <Btn color="blue" onClick={() => load()}>Filter</Btn>
        <Btn color="cancel" onClick={() => { setMonthFilter(""); setDateFilter(""); load({ monthFilter:"", dateFilter:"" }); }}>Reset</Btn>
      </div>
      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : orders.length === 0 ? <EmptyState text="No orders found." /> : (
        <TableWrap><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr>{["Order No.", "Order Date", "Customer", "Items", "Total", "Status", "Converted Sale", "Actions"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>{orders.map(order => (
            <tr key={order._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <Td style={{ fontWeight: 800 }}>{order.orderNo}</Td>
              <Td>{new Date(order.date).toLocaleDateString("en-IN")}</Td>
              <Td>{order.customer?.name || order.customerName || "Walk-in"}</Td>
              <Td>{(order.items || []).map((item, index) => <div key={item._id || index} style={{ marginBottom:4 }}><strong>{item.productName || item.product?.name}</strong>{item.description && <div style={{ color:"#64748b", fontSize:10.5, whiteSpace:"pre-wrap" }}>{item.description}</div>}</div>)}</Td>
              <Td style={{ fontWeight: 800 }}>₹{(+order.grandTotal || 0).toLocaleString("en-IN")}</Td>
              <Td><Badge color={statusColor[order.status] || "gray"}>{order.status}</Badge></Td>
              <Td>{order.convertedSale ? `${order.convertedSale.invoiceNo} (${new Date(order.convertedSale.date).toLocaleDateString("en-IN")})` : "-"}</Td>
              <Td>{order.status === "Open" && <Btn sm color="green" onClick={() => openConvert(order)}>Convert to Sale</Btn>}</Td>
            </tr>
          ))}</tbody>
        </table></TableWrap>
      )}

      <Modal open={!!converting} onClose={() => !saving && setConverting(null)} title={`Convert ${converting?.orderNo || "Order"} to Sale`}>
        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>The order will remain in this list with its original date. The new sale will use the date below.</div>
        <FormGroup label="Sale Date"><FormInput type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></FormGroup>
        <FormGroup label="Payment Mode"><FormSelect value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}>{["Credit","Cash","UPI","Card","Bank Transfer","Cheque"].map(x => <option key={x}>{x}</option>)}</FormSelect></FormGroup>
        <FormGroup label="Amount Paid"><FormInput type="number" min="0" value={form.amountPaid} onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))} placeholder="0" /></FormGroup>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn color="cancel" onClick={() => setConverting(null)}>Cancel</Btn><Btn color="green" disabled={saving} onClick={convert}>{saving ? "Converting..." : "Convert to Sale"}</Btn></div>
      </Modal>
    </div>
  );
}
