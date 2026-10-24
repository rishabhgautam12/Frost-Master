import { useState, useEffect } from "react";
import {
  PageTitle, Btn, TableWrap, Th, Td, Badge,
  LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
  Modal, FormGroup, FormInput, FormSelect, roundTotal, formatRoundOff,
} from "../components/Shared";
import { salesAPI, customerAPI, productAPI, employeeAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";
import InvoiceDetailsFields, { partyDetailsFromCustomer } from "../components/InvoiceDetailsFields";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import RefundModal, { RefundHistory } from "../components/RefundModal";
import {
  periodRange, inPeriod, matchesSearch, money, FilterSelect, SearchInput, PeriodFilter,
  StatusTabs, ClearFiltersButton, SummaryCards, RowMenu, toolbarStyle,
} from "../components/ListFilters";

const stColor = { Paid: "green", Partial: "yellow", Pending: "red", Cancelled: "gray" };
function currentUser() {
  try { return JSON.parse(localStorage.getItem("ht_user") || "null"); }
  catch { return null; }
}
const discountAmountFor = item => {
  if (+item.discountAmount > 0) return +item.discountAmount;
  return (+item.discount || 0) * (+item.qty || 0);
};
const discountPercentFor = item => {
  if (!+item.discount) return 0;
  if (+item.discountAmount > 0) return +item.discount;
  return +item.rate > 0 ? (+item.discount / +item.rate) * 100 : 0;
};
const formatPercent = value => Number(value.toFixed(2));
const SALE_EDIT_GRID = "minmax(220px, 2fr) 90px 130px 60px 80px 85px 70px 65px 90px 70px 100px 36px";
const SALE_EDIT_MIN_WIDTH = 1230;

const saleDateValue = value => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};


// ── Payment Modal ──────────────────────────────────────────────────────────────
function PaymentModal({ sale, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(sale?.paymentMode && sale.paymentMode !== "Multiple" && sale.paymentMode !== "Credit" ? sale.paymentMode : "Cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  if (!sale) return null;
  const due = Math.max(0, sale.grandTotal - sale.amountPaid);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setErr("Please enter a valid amount.");
    setSaving(true); setErr("");
    try {
      await salesAPI.payForSale(sale._id, { amount: amt, method, notes, date: paymentDate });
      onDone(`₹${amt.toLocaleString()} payment recorded for ${sale.invoiceNo}`);
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal open title={`Record Payment — ${sale.invoiceNo}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, background: "#f7f8fc", padding: 14, borderRadius: 8 }}>
        {[
          { label: "Grand Total",  value: `₹${sale.grandTotal.toLocaleString()}`,  color: "#0f1535" },
          { label: "Already Paid", value: `₹${sale.amountPaid.toLocaleString()}`,  color: "#1f9d6b" },
          { label: "Balance Due",  value: `₹${due.toLocaleString()}`,              color: due > 0 ? "#e0524c" : "#9aa1b9" },
          { label: "Status",       value: sale.status,                             badge: true },
        ].map((d, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: "#6b7392", fontWeight: 700, textTransform: "uppercase" }}>{d.label}</div>
            {d.badge
              ? <div style={{ marginTop: 4 }}><Badge color={stColor[sale.status]}>{sale.status}</Badge></div>
              : <div style={{ fontSize: 18, fontWeight: 800, color: d.color }}>{d.value}</div>
            }
          </div>
        ))}
      </div>

      <FormGroup label="Payment Amount (₹)">
        <div style={{ display: "flex", gap: 8 }}>
          <FormInput type="number" placeholder="Enter amount" value={amount}
            onChange={(e) => setAmount(e.target.value)} style={{ flex: 1 }} />
          <Btn color="blue" onClick={() => setAmount(String(due))}>Full Due</Btn>
        </div>
      </FormGroup>
      {+amount > due && <div style={{color:"#c026d3",fontWeight:700,marginBottom:10}}>₹{(+amount-due).toLocaleString()} extra will be stored as customer advance.</div>}

      <FormGroup label="Payment Method">
        <FormSelect value={method} onChange={(e) => setMethod(e.target.value)}>
          {["Cash","UPI","Card","Bank Transfer","Cheque"].map(m => <option key={m}>{m}</option>)}
        </FormSelect>
      </FormGroup>

      <FormGroup label="Payment Date">
        <FormInput type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
      </FormGroup>

      <FormGroup label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note for this payment..."
          rows={2}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #dde1ec", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", background: "#fafbfe" }} />
      </FormGroup>

      {err && <div style={{ color: "#e0524c", fontSize: 12, marginBottom: 10 }}>⚠️ {err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn color="cancel" onClick={onClose}>Cancel</Btn>
        <Btn color="green" onClick={handlePay} disabled={saving}>{saving ? "Saving..." : "✅ Record Payment"}</Btn>
      </div>
    </Modal>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function PaymentHistoryDrawer({ sale, onClose, onAddPayment, isAdmin, onEditPayment, onDeletePayment }) {
  if (!sale) return null;
  const payments = [...(sale.payments || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const trackedTotal = payments.reduce((sum, payment) => sum + (+payment.amount || 0), 0);
  const legacyAmount = Math.max(0, (+sale.amountPaid || 0) - trackedTotal);
  const canPay = sale.status !== "Cancelled";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.42)" }} />
      <aside style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "min(460px, 100vw)", background: "#f7f8fc", boxShadow: "-12px 0 30px rgba(15,23,42,.18)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 22px", background: "#fff", borderBottom: "1px solid #e6e9f2", display: "flex", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f1535" }}>Payment History</div>
            <div style={{ marginTop: 3, fontSize: 12, color: "#6b7392" }}>{sale.invoiceNo} · {sale.customer?.name || sale.customerName || "Walk-in"}</div>
          </div>
          <button onClick={onClose} aria-label="Close payment history" style={{ border: 0, background: "#f1f3f9", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
            {[["Invoice Total", sale.grandTotal, "#0f1535"], ["Total Paid", sale.amountPaid, "#1f9d6b"], ["Balance Due", sale.amountDue, "#d0433d"]].map(([label, value, color]) => (
              <div key={label} style={{ padding: "11px 9px", background: "#fff", border: "1px solid #e6e9f2", borderRadius: 9 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#6b7392", textTransform: "uppercase" }}>{label}</div>
                <div style={{ marginTop: 4, fontSize: 15, fontWeight: 800, color }}>₹{(+value || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#3a4260", marginBottom: 10 }}>{payments.length} recorded payment{payments.length === 1 ? "" : "s"}</div>
          <RefundHistory record={sale} />
          {legacyAmount > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 800, color: "#8a5a12" }}>₹{legacyAmount.toLocaleString()} previously paid</div>
              <div style={{ fontSize: 11, color: "#a16207", marginTop: 3 }}>This amount was saved before detailed payment tracking was enabled.</div>
            </div>
          )}
          {payments.length === 0 && legacyAmount === 0 ? (
            <div style={{ textAlign: "center", color: "#9aa1b9", padding: "42px 10px", background: "#fff", border: "1px dashed #d9deea", borderRadius: 10 }}>No payments recorded yet.</div>
          ) : payments.map((payment, index) => (
            <div key={payment._id || `${payment.date}-${index}`} style={{ background: "#fff", border: "1px solid #e6e9f2", borderLeft: "4px solid #22c55e", borderRadius: 9, padding: 13, marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 800, color: "#17855a", fontSize: 17 }}>₹{(+payment.amount || 0).toLocaleString()}</div>
                <Badge color="green">{payment.paymentMode || "Cash"}</Badge>
              </div>
              <div style={{ marginTop: 7, color: "#4a5272", fontSize: 12 }}>{new Date(payment.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
              <div style={{ marginTop: 3, color: "#6b7392", fontSize: 11 }}>Recorded by {payment.recordedByName || "Staff"}</div>
              {+payment.advanceAmount > 0 && <div style={{marginTop:4,color:"#c026d3",fontSize:11,fontWeight:800}}>₹{(+payment.advanceAmount).toLocaleString()} stored as customer advance</div>}
              {payment.notes && <div style={{ marginTop: 8, padding: "7px 9px", borderRadius: 6, background: "#f7f8fc", color: "#4a5272", fontSize: 12 }}>{payment.notes}</div>}
              {payment.refundedAmount > 0 && <div style={{color:"#b45309",marginTop:6}}>Refunded ₹{payment.refundedAmount.toLocaleString("en-IN")} · Net ₹{(payment.amount-payment.refundedAmount).toLocaleString("en-IN")}</div>}
              {isAdmin && payment._id && !sale.refunds?.length && <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:8}}><Btn sm color="blue" onClick={()=>onEditPayment(payment)}>Edit Payment</Btn><Btn sm color="red" onClick={()=>onDeletePayment(payment)}>Delete</Btn></div>}
            </div>
          ))}
        </div>
        <div style={{ padding: "14px 18px", background: "#fff", borderTop: "1px solid #e6e9f2", display: "flex", justifyContent: "flex-end", gap: 9 }}>
          <Btn color="cancel" onClick={onClose}>Close</Btn>
          {canPay && <Btn color="green" onClick={onAddPayment}>+ Add Payment</Btn>}
        </div>
      </aside>
    </div>
  );
}

function PaymentEditModal({ title, payment, onClose, onSave }) {
  const [form,setForm] = useState({amount:String(payment.amount||""),method:payment.paymentMode||"Cash",date:payment.date?new Date(payment.date).toISOString().slice(0,10):new Date().toISOString().slice(0,10),notes:payment.notes||""});
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const save = async () => {
    if (!(+form.amount>0)) return setError("Enter a valid payment amount.");
    setSaving(true);setError("");
    try { await onSave({...form,amount:+form.amount}); } catch(err) { setError(err.message);setSaving(false); }
  };
  return <Modal open title={title} onClose={onClose}><FormGroup label="Amount"><FormInput type="number" min="0.01" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} /></FormGroup><FormGroup label="Payment Method"><FormSelect value={form.method} onChange={e=>setForm(p=>({...p,method:e.target.value}))}>{["Cash","UPI","Card","Bank Transfer","Cheque"].map(method=><option key={method}>{method}</option>)}</FormSelect></FormGroup><FormGroup label="Payment Date"><FormInput type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></FormGroup><FormGroup label="Notes / Reference"><FormInput value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} /></FormGroup>{error&&<div style={{color:"#d0433d",marginBottom:10}}>{error}</div>}<div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn color="cancel" onClick={onClose}>Cancel</Btn><Btn color="teal" disabled={saving} onClick={save}>{saving?"Saving...":"Save Payment"}</Btn></div></Modal>;
}

function EditModal({ sale, onClose, onDone }) {
  const [notes,       setNotes]       = useState(sale?.notes || "");
  const [paymentMode, setPaymentMode] = useState(sale?.paymentMode || "Cash");
  const [status,      setStatus]      = useState(sale?.status || "Pending");
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState("");

  if (!sale) return null;

  const handleSave = async () => {
    setSaving(true); setErr("");
    try {
      await salesAPI.updateSaleDetails(sale._id, { notes, paymentMode, status });
      onDone(`${sale.invoiceNo} updated successfully`);
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal open title={`Edit Sale — ${sale.invoiceNo}`} onClose={onClose}>
      <div style={{ marginBottom: 14, background: "#f7f8fc", padding: 12, borderRadius: 8, fontSize: 12, color: "#6b7392" }}>
        Customer: <strong style={{ color: "#0f1535" }}>{sale.customer?.name || sale.customerName || "Walk-in"}</strong>
        &nbsp;|&nbsp; Total: <strong style={{ color: "#0f1535" }}>₹{sale.grandTotal?.toLocaleString()}</strong>
        &nbsp;|&nbsp; Paid: <strong style={{ color: "#1f9d6b" }}>₹{sale.amountPaid?.toLocaleString()}</strong>
      </div>

      <FormGroup label="Payment Mode">
        <FormSelect value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
          {["Cash","UPI","Card","Bank Transfer","Cheque","Credit"].map(m => <option key={m}>{m}</option>)}
        </FormSelect>
      </FormGroup>

      {sale.status !== "Cancelled" && (
        <FormGroup label="Status Override">
          <FormSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
          </FormSelect>
          <div style={{ fontSize: 10.5, color: "#9aa1b9", marginTop: 4 }}>
            ⚠️ Manually override the status if needed. If set to Paid, amount paid will sync automatically.
          </div>
        </FormGroup>
      )}

      <FormGroup label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this sale..."
          rows={3}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #dde1ec", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", background: "#fafbfe" }} />
      </FormGroup>

      {err && <div style={{ color: "#e0524c", fontSize: 12, marginBottom: 10 }}>⚠️ {err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn color="cancel" onClick={onClose}>Cancel</Btn>
        <Btn color="teal" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Changes"}</Btn>
      </div>
    </Modal>
  );
}

// ── Expanded Detail Row ────────────────────────────────────────────────────────
function FullEditModal({ sale, onClose, onDone }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    customer: sale?.customer?._id || sale?.customer || "",
    customerName: sale?.customerName || "",
    saleType: sale?.saleType || "GST Invoice",
    paymentMode: sale?.paymentMode || "Cash",
    date: saleDateValue(sale?.date),
    isInterState: !!sale?.isInterState,
    amountPaid: sale?.amountPaid ?? 0,
    status: sale?.status || "Pending",
    notes: sale?.notes || "",
    invoiceDetails: sale?.invoiceDetails || { billTo:{}, shipTo:{} },
    salesEmployee: sale?.salesEmployee?._id || sale?.salesEmployee || "",
  });
  const [items, setItems] = useState(() => (sale?.items || []).map(it => ({
    product: it.product?._id || it.product || "",
    description: it.description || "",
    qty: it.qty || 1,
    rate: it.rate ?? "",
    billingRate: it.billingRate ?? it.rate ?? "",
    discount: discountPercentFor(it),
    gstRate: it.gstRate ?? 18,
    transportAmount: it.transportAmount ?? 0,
    transportGstRate: it.transportGstRate ?? 0,
    warehouse: it.warehouse || "",
  })));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([customerAPI.getAll(), productAPI.getAll(), employeeAPI.getAll()])
      .then(([c, p, e]) => {
        setCustomers(c.data || []);
        setProducts(p.data || []);
        setEmployees(e.data || []);
        setForm(prev => {
          const customer = (c.data || []).find(item => item._id === prev.customer);
          if (!customer) return prev;
          const party = partyDetailsFromCustomer(customer);
          const current = prev.invoiceDetails || {};
          const hasCustomConsignee = current.shipTo?.name || current.shipTo?.address || current.shipTo?.gstin;
          return { ...prev, invoiceDetails:{ ...current, billTo:party, shipTo:hasCustomConsignee ? current.shipTo : { ...party } } };
        });
      })
      .catch(() => {});
  }, []);

  if (!sale) return null;

  const set = k => e => setForm(p => ({
    ...p,
    [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
  }));
  const productById = id => products.find(p => p._id === id);
  const warehouseOptions = prod => {
    const rows = Array.isArray(prod?.warehouses) ? prod.warehouses.filter(w => w?.warehouse) : [];
    if (rows.length) return rows;
    return prod ? [{ warehouse: "Main Warehouse", stock: prod.stock || 0 }] : [];
  };
  const selectedCustomer = customers.find(c => c._id === form.customer);

  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => {
    if (idx !== i) return it;
    const next = { ...it, [k]: v };
    if (k === "product") {
      const prod = productById(v);
      next.rate = prod?.sellingPrice ?? "";
      next.billingRate = prod?.sellingPrice ?? "";
      next.gstRate = prod?.gstRate ?? 18;
      next.warehouse = warehouseOptions(prod)[0]?.warehouse || "";
    }
    return next;
  }));
  const addItem = () => setItems(prev => [...prev, { product: "", qty: 1, rate: "", billingRate: "", discount: 0, gstRate: 18, transportAmount: 0, transportGstRate: 0, warehouse: "" }]);
  const removeItem = i => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  const calcItem = it => {
    const gross = (+it.rate || 0) * (+it.qty || 0);
    const discountPercent = Math.min(100, Math.max(0, +it.discount || 0));
    const discountAmount = (gross * discountPercent) / 100;
    const taxable = gross - discountAmount;
    const billingTotal = (+it.billingRate || 0) * (+it.qty || 0);
    const gst = (Math.max(0, billingTotal - discountAmount) * (+it.gstRate || 0)) / 100;
    const transport = +it.transportAmount || 0;
    const transportGst = (transport * (+it.transportGstRate || 0)) / 100;
    return { gross, discountAmount, taxable, gst, transport, transportGst, total: taxable + gst + transport + transportGst };
  };
  const totals = items.reduce((sum, it) => {
    const c = calcItem(it);
    return {
      subtotal: sum.subtotal + c.gross,
      discount: sum.discount + c.discountAmount,
      transport: sum.transport + c.transport,
      gst: sum.gst + c.gst + c.transportGst,
      total: sum.total + c.total,
    };
  }, { subtotal: 0, discount: 0, transport: 0, gst: 0, total: 0 });
  const { total: grandTotal, roundOff } = roundTotal(totals.total);
  const due = Math.max(0, grandTotal - (+form.amountPaid || 0));

  const handleSave = async () => {
    setSaving(true); setErr("");
    try {
      const validItems = items.filter(it => it.product && +it.qty > 0 && +it.rate >= 0);
      if (!validItems.length) throw new Error("Add at least one valid sale item.");
      if (!form.customer) throw new Error("Select a registered customer.");
      await salesAPI.updateSaleDetails(sale._id, {
        ...form,
        customer: form.customer || undefined,
        isInterState: !!form.isInterState,
        amountPaid: +form.amountPaid || 0,
        items: validItems.map(it => ({
          product: it.product,
          description: it.description || "",
          qty: +it.qty,
          rate: +it.rate,
          billingRate: it.billingRate === "" ? undefined : +it.billingRate,
          discount: +it.discount || 0,
          gstRate: +it.gstRate || 0,
          transportAmount: +it.transportAmount || 0,
          transportGstRate: +it.transportGstRate || 0,
          warehouse: it.warehouse || undefined,
        })),
      });
      onDone(`${sale.invoiceNo} updated successfully`);
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal open title={`Edit Sale - ${sale.invoiceNo}`} onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <FormGroup label="Sale Type">
          <FormSelect value={form.saleType} onChange={set("saleType")}>
            {["GST Invoice","Cash Sale"].map(t => <option key={t}>{t}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="Payment Mode">
          <FormSelect value={form.paymentMode} onChange={set("paymentMode")}>
            {["Cash","UPI","Card","Bank Transfer","Credit","Cheque"].map(m => <option key={m}>{m}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="Date">
          <FormInput type="date" value={form.date} onChange={set("date")} />
        </FormGroup>
        <FormGroup label="Sale Made By (Employee)">
          <FormSelect value={form.salesEmployee} onChange={set("salesEmployee")}><option value="">Select employee</option>{employees.map(employee => <option key={employee._id} value={employee._id}>{employee.name} (M: {employee.manufacturingIncentivePercent || 0}% / I: {employee.importedIncentivePercent || 0}%)</option>)}</FormSelect>
        </FormGroup>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <FormGroup label="Customer">
          <FormSelect value={form.customer}
            onChange={e => {
              const customer = customers.find(item => item._id === e.target.value);
              const party = partyDetailsFromCustomer(customer);
              setForm(p => ({ ...p, customer:e.target.value, customerName:e.target.value ? "" : p.customerName, invoiceDetails:{ ...(p.invoiceDetails || {}), billTo:party, shipTo:{ ...party } } }));
            }}>
            <option value="">Select customer</option>
            {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}
          </FormSelect>
          {selectedCustomer && <div style={{ marginTop: 5, fontSize: 11, color: "#6b7392" }}>{selectedCustomer.name} selected</div>}
        </FormGroup>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
        <input type="checkbox" checked={form.isInterState} onChange={set("isInterState")} />
        Inter-state sale
      </label>

      <InvoiceDetailsFields value={form.invoiceDetails} onChange={invoiceDetails => setForm(p => ({ ...p, invoiceDetails }))} />

      <div style={{ border: "1px solid #e6e9f2", borderRadius: 8, overflowX: "auto", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: SALE_EDIT_GRID, minWidth: SALE_EDIT_MIN_WIDTH, background: "#f7f8fc", padding: "8px 10px", fontSize: 11, fontWeight: 800, color: "#0f1535" }}>
          {["Product","Model No.","Warehouse","Qty","Rate","Billing Rate","Disc. %","GST %","Transport","Trans. GST %","Total",""].map(h => <div key={h} style={{ padding: "0 4px" }}>{h}</div>)}
        </div>
        {items.map((it, i) => {
          const prod = productById(it.product);
          const c = calcItem(it);
          const warehouses = warehouseOptions(prod);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: SALE_EDIT_GRID, minWidth: SALE_EDIT_MIN_WIDTH, padding: "8px 10px", borderTop: "1px solid #f1f3f9", alignItems: "start" }}>
              <div style={{ padding: "0 4px" }}>
                <select value={it.product} onChange={e => setItem(i, "product", e.target.value)}
                  style={{ width: "100%", padding: "7px 8px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, background: "#fafbfe" }}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name} | {p.modelNumber} | Stock: {p.stock}</option>)}
                </select>
              </div>
              <div style={{ padding: "7px 4px 0", color: "#0ea5e9", fontFamily: "monospace", fontSize: 11 }}>{prod?.modelNumber || "-"}</div>
              <div style={{ padding: "0 4px" }}>
                <input list={`sale-wh-${i}`} value={it.warehouse} onChange={e => setItem(i, "warehouse", e.target.value)}
                  placeholder="Warehouse"
                  style={{ width: "100%", padding: "7px 8px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} />
                <datalist id={`sale-wh-${i}`}>
                  {warehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.stock}</option>)}
                </datalist>
                {warehouses.length > 0 && (
                  <div style={{ marginTop: 3, fontSize: 9.5, color: "#6b7392", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {warehouses.map(w => `${w.warehouse}: ${w.stock}`).join(" | ")}
                  </div>
                )}
              </div>
              <div style={{ padding: "0 4px" }}><input type="number" min="1" value={it.qty} onChange={e => setItem(i, "qty", e.target.value)} style={{ width: "100%", padding: "7px 6px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
              <div style={{ padding: "0 4px" }}><input type="number" value={it.rate} onChange={e => setItem(i, "rate", e.target.value)} style={{ width: "100%", padding: "7px 6px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
              <div style={{ padding: "0 4px" }}><input type="number" value={it.billingRate} onChange={e => setItem(i, "billingRate", e.target.value)} style={{ width: "100%", padding: "7px 6px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
              <div style={{ padding: "0 4px" }}><input type="number" min="0" max="100" step="0.01" value={it.discount} onChange={e => setItem(i, "discount", e.target.value)} style={{ width: "100%", padding: "7px 6px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
              <div style={{ padding: "0 4px" }}>
                <select value={it.gstRate} onChange={e => setItem(i, "gstRate", e.target.value)}
                  style={{ width: "100%", padding: "7px 4px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, background: "#fafbfe" }}>
                  {["0","5","9","12","18","28"].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div style={{ padding: "0 4px" }}><input type="number" min="0" value={it.transportAmount} onChange={e => setItem(i, "transportAmount", e.target.value)} style={{ width: "100%", padding: "7px 6px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
              <div style={{ padding: "0 4px" }}>
                <select value={it.transportGstRate} onChange={e => setItem(i, "transportGstRate", e.target.value)} style={{ width: "100%", padding: "7px 4px", border: "1px solid #dde1ec", borderRadius: 6, fontSize: 12, background: "#fafbfe" }}>
                  {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div style={{ padding: "7px 4px 0", fontWeight: 800, color: "#1f9d6b", fontSize: 12 }}>Rs {c.total.toFixed(2)}</div>
              <div style={{ padding: "0 4px" }}>
                <button type="button" onClick={() => removeItem(i)} style={{ width: "100%", padding: "6px 0", border: "none", borderRadius: 5, background: "#fdeceb", color: "#a33a35", cursor: "pointer", fontWeight: 800 }}>x</button>
              </div>
            </div>
          );
        })}
        <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f3f9" }}>
          <Btn sm color="blue" onClick={addItem}>+ Add Item</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <FormGroup label="Amount Paid (Rs)">
            <FormInput type="number" value={form.amountPaid} onChange={set("amountPaid")} />
          </FormGroup>
          <FormGroup label="Status">
            <FormSelect value={form.status} onChange={set("status")}>
              {["Paid","Partial","Pending","Cancelled"].map(s => <option key={s}>{s}</option>)}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Notes">
            <textarea value={form.notes} onChange={set("notes")} placeholder="Add notes about this sale..." rows={3}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #dde1ec", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", background: "#fafbfe" }} />
          </FormGroup>
        </div>
        <div style={{ background: "#f7f8fc", borderRadius: 8, padding: 16, fontSize: 13, alignSelf: "start" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Sale Summary</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span>Subtotal</span><strong>Rs {totals.subtotal.toFixed(2)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, color: "#e5a03a" }}>
            <span>{form.paymentMode === "Cash" ? "Cash Amount" : "Discount"}</span>
            <strong>Rs {form.paymentMode === "Cash" ? (+form.amountPaid || 0).toFixed(2) : totals.discount.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span>GST</span><strong>Rs {totals.gst.toFixed(2)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span>Transport</span><strong>Rs {totals.transport.toFixed(2)}</strong></div>
          {roundOff !== 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, color: "#6b7392" }}><span>Round Off</span><strong>{formatRoundOff(roundOff)}</strong></div>}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e6e9f2", paddingTop: 9, fontSize: 16 }}><span>Grand Total</span><strong>Rs {grandTotal.toFixed(2)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: due > 0 ? "#e0524c" : "#1f9d6b" }}><span>Due</span><strong>Rs {due.toFixed(2)}</strong></div>
        </div>
      </div>

      {err && <div style={{ color: "#e0524c", fontSize: 12, marginBottom: 10 }}>Warning: {err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn color="cancel" onClick={onClose}>Cancel</Btn>
        <Btn color="teal" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Btn>
      </div>
    </Modal>
  );
}

function ExpandedRow({ sale, cols }) {
  return (
    <tr style={{ background: "#f0faf5" }}>
      <td colSpan={cols} style={{ padding: "14px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12 }}>
          {[
            { label: "Invoice No",   value: sale.invoiceNo },
            { label: "Sale Type",    value: sale.saleType },
            { label: "Payment Mode", value: sale.paymentMode },
            ...(+sale.roundOff ? [{ label: "Round Off", value: formatRoundOff(sale.roundOff) }] : []),
            { label: "Grand Total",  value: `₹${sale.grandTotal.toLocaleString()}` },
            { label: "Amount Paid",  value: `₹${sale.amountPaid.toLocaleString()}` },
            { label: "Balance Due",  value: sale.amountDue > 0 ? `₹${sale.amountDue.toLocaleString()}` : "—" },
            { label: "GST",          value: `₹${sale.totalGST?.toLocaleString()}` },
            { label: "CGST",         value: `₹${sale.cgst?.toLocaleString()}` },
            { label: "SGST",         value: `₹${sale.sgst?.toLocaleString()}` },
          ].map((d, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: "#9aa1b9", fontWeight: 700, textTransform: "uppercase" }}>{d.label}</div>
              <div style={{ fontSize: 13, color: "#0f1535", fontWeight: 700, marginTop: 2 }}>{d.value}</div>
            </div>
          ))}
          {sale.notes && (
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 10, color: "#9aa1b9", fontWeight: 700, textTransform: "uppercase" }}>Notes</div>
              <div style={{ fontSize: 12.5, color: "#4a5272", marginTop: 2, background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid #e6e9f2" }}>
                📝 {sale.notes}
              </div>
            </div>
          )}
          {sale.items?.length > 0 && (
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 10, color: "#9aa1b9", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Items</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ fontSize: 11.5, borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#e6e9f2" }}>
                      {["Product","Warehouse","Qty","Rate","Discount %","Discount Amount","Total","GST Rate","GST Amt"].map(h => (
                        <th key={h} style={{ padding: "5px 10px", textAlign: "left", fontWeight: 700, color: "#0f1535", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((it, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f7f8fc" }}>
                        <td style={{ padding: "5px 10px" }}>
                          <div>{it.productName || it.product?.name}</div>
                          {it.description && <div style={{ marginTop:3, color:"#6b7392", fontSize:10.5, whiteSpace:"pre-wrap" }}>{it.description}</div>}
                        </td>
                        <td style={{ padding: "5px 10px" }}>{it.warehouse || "Main Warehouse"}</td>
                        <td style={{ padding: "5px 10px" }}>{it.qty}</td>
                        <td style={{ padding: "5px 10px" }}>₹{it.rate?.toLocaleString()}</td>
                        <td style={{ padding: "5px 10px" }}>{discountPercentFor(it) > 0 ? `${formatPercent(discountPercentFor(it))}%` : "—"}</td>
                        <td style={{ padding: "5px 10px" }}>{discountAmountFor(it) > 0 ? `₹${discountAmountFor(it).toFixed(2)}` : "—"}</td>
                        <td style={{ padding: "5px 10px", fontWeight: 700 }}>₹{it.total?.toLocaleString()}</td>
                        <td style={{ padding: "5px 10px" }}>{it.gstRate}%</td>
                        <td style={{ padding: "5px 10px" }}>₹{it.gstAmount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── List filters ───────────────────────────────────────────────────────────────
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amountDesc", label: "Amount: high to low" },
  { value: "amountAsc",  label: "Amount: low to high" },
  { value: "dueDesc",    label: "Due: high to low" },
];
const STATUSES = ["Paid", "Partial", "Pending", "Cancelled"];
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Credit", "Multiple"];

const searchableText = s => [
  s.invoiceNo, s.customer?.name, s.customerName, s.customer?.phone,
  s.salesEmployee?.name, s.salesEmployeeName, s.soldByName, s.notes, s.paymentMode, s.saleType,
  Math.round(s.grandTotal || 0),
  ...(s.items || []).flatMap(i => [i.productName, i.product?.name, i.product?.modelNumber, i.description]),
].filter(Boolean).join(" ").toLowerCase();
const salespersonOf = s => s.salesEmployee?.name || s.salesEmployeeName || "";

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SalesList({ navigate }) {
  const [targetSale] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("salesListTarget") || "null"); }
    catch { return null; }
  });
  const [sales,    setSales]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState(targetSale?.invoiceNo || "");
  const [status,   setStatus]   = useState("");
  const [period,   setPeriod]   = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [saleType, setSaleType] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [sort,     setSort]     = useState("newest");
  const [toast,    setToast]    = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [paymentDrawer, setPaymentDrawer] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [refundSale, setRefundSale] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [editModal,setEditModal]= useState(null);
  const isAdmin = currentUser()?.role === "admin";
  const canComplaints = isAdmin || currentUser()?.permissions?.complaints_view;

  // All sales are loaded once; every filter below runs instantly in the browser.
  const load = () => {
    setLoading(true);
    salesAPI.getAll()
      .then((r) => { setSales(r.data || []); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    sessionStorage.removeItem("salesListTarget");
    load();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleCancel = async (id) => {
    if (!confirm("Cancel this sale and restore stock?")) return;
    try { await salesAPI.cancel(id); showToast("Sale cancelled & stock restored"); load(); }
    catch (e) { alert(e.message); }
  };

  const handleDelete = async (sale) => {
    if (!confirm(`Permanently delete ${sale.invoiceNo}? Stock and customer balances will be reversed.`)) return;
    try {
      await salesAPI.deleteSale(sale._id);
      showToast("Sale deleted successfully");
      load();
    } catch (e) { alert(e.message); }
  };

  const afterPay  = (msg) => { setPayModal(null);  showToast(msg); load(); };
  const afterEdit = (msg) => { setEditModal(null); showToast(msg); load(); };

  // ── Filtering ──
  const range = periodRange(period, customFrom, customTo);
  const salespeople = [...new Set(sales.map(salespersonOf).filter(Boolean))].sort();

  // Everything except the status tab, so the tab counts reflect the other filters.
  const baseSales = sales.filter(s =>
    inPeriod(s.date, range)
    && (!saleType || s.saleType === saleType)
    && (!paymentMode || s.paymentMode === paymentMode)
    && (!salesperson || salespersonOf(s) === salesperson)
    && matchesSearch(searchableText(s), search)
  );
  const statusCounts = STATUSES.reduce((acc, st) => ({ ...acc, [st]: baseSales.filter(s => s.status === st).length }), {});
  const visibleSales = baseSales
    .filter(s => !status || s.status === status)
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.date) - new Date(b.date);
      if (sort === "amountDesc") return (b.grandTotal || 0) - (a.grandTotal || 0);
      if (sort === "amountAsc") return (a.grandTotal || 0) - (b.grandTotal || 0);
      if (sort === "dueDesc") return (b.amountDue || 0) - (a.amountDue || 0);
      return new Date(b.date) - new Date(a.date) || String(b.invoiceNo).localeCompare(String(a.invoiceNo));
    });

  const activeFilterCount = [search.trim(), status, period !== "all", saleType, paymentMode, salesperson].filter(Boolean).length;
  const clearFilters = () => {
    setSearch(""); setStatus(""); setPeriod("all"); setCustomFrom(""); setCustomTo("");
    setSaleType(""); setPaymentMode(""); setSalesperson("");
  };

  // Totals from the filtered list
  const activeSales = visibleSales.filter(s => s.status !== "Cancelled");
  const totalRevenue  = activeSales.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const totalReceived = activeSales.reduce((s, o) => s + (o.amountPaid || 0), 0);
  const totalDue      = activeSales.reduce((s, o) => s + (o.amountDue  || 0), 0);
  const dueCount      = activeSales.filter(o => o.amountDue > 0).length;

  const COLS = 7;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <PageTitle>All Sales</PageTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Btn color="cancel" onClick={() => navigate("gst-report")}>GST Report</Btn>
          <Btn color="cancel" onClick={() => downloadCSV(visibleSales, [
            { label: "Invoice No.",  key: "invoiceNo"     },
            { label: "Date",         key: "date"          },
            { label: "Customer",     key: "customer.name" },
            { label: "Sale Type",    key: "saleType"      },
            { label: "Payment Mode", key: "paymentMode"   },
            { label: "Total (₹)",    key: "grandTotal"    },
            { label: "GST (₹)",      key: "totalGST"      },
            { label: "Paid (₹)",     key: "amountPaid"    },
            { label: "Due (₹)",      key: "amountDue"     },
            { label: "Status",       key: "status"        },
            { label: "Notes",        key: "notes"         },
          ], "sales")}>Export CSV</Btn>
          <Btn color="teal" onClick={() => navigate("sale-create")}>+ Create Sale</Btn>
        </div>
      </div>
      {toast && <SuccessToast msg={toast} />}

      {/* ── Summary Cards (follow the filters) ── */}
      <SummaryCards cards={[
        { label: "Invoices",    value: visibleSales.length,  color: "#5a8be8", sub: activeFilterCount ? `of ${sales.length} total` : "all time" },
        { label: "Revenue",     value: money(totalRevenue),  color: "#7c3aed", sub: "excludes cancelled" },
        { label: "Received",    value: money(totalReceived), color: "#1f9d6b", sub: totalRevenue > 0 ? `${((totalReceived / totalRevenue) * 100).toFixed(1)}% collected` : "—" },
        { label: "Outstanding", value: money(totalDue),      color: "#e0524c", sub: dueCount ? `${dueCount} invoice${dueCount > 1 ? "s" : ""} pending` : "all cleared" },
      ]} />

      {/* ── Toolbar ── */}
      <div style={toolbarStyle}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <SearchInput value={search} onChange={setSearch} label="Search sales"
            placeholder="Search invoice, customer, phone, product, salesperson…" />
          <PeriodFilter period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
          <FilterSelect label="Sort" value={sort} onChange={setSort}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </FilterSelect>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <StatusTabs value={status} onChange={setStatus} tabs={[
            { value: "", label: "All", count: baseSales.length },
            ...STATUSES.map(st => ({ value: st, label: st, count: statusCounts[st] })),
          ]} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <FilterSelect label="Sale type" value={saleType} onChange={setSaleType}>
              <option value="">All types</option>
              {["GST Invoice", "Cash Sale"].map(t => <option key={t}>{t}</option>)}
            </FilterSelect>
            <FilterSelect label="Payment mode" value={paymentMode} onChange={setPaymentMode}>
              <option value="">All payment modes</option>
              {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
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
        <TableWrap>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {["Invoice", "Customer", "Total", "Paid", "Due", "Status", ""].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {visibleSales.length === 0 ? (
                <tr><td colSpan={COLS}>
                  <EmptyState text={sales.length ? "No sales match these filters." : "No sales yet."} />
                  {activeFilterCount > 0 && <div style={{ textAlign: "center", marginTop: -36, paddingBottom: 28 }}><Btn sm color="cancel" onClick={clearFilters}>Clear filters</Btn></div>}
                </td></tr>
              ) : visibleSales.map(s => {
                const refunded = (s.refunds || []).reduce((sum, r) => sum + r.amount, 0);
                const locked = !!s.refunds?.length;
                return (
                  <tr key={s._id}
                    style={{ borderBottom: "1px solid #f1f3f9", opacity: s.status === "Cancelled" ? 0.62 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#faf8ff"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <Td style={{ whiteSpace: "nowrap" }}>
                      <button type="button" onClick={() => setDetailModal(s)}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "monospace", color: "#0284c7", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                        {s.invoiceNo}
                      </button>
                      <div style={{ fontSize: 11, color: "#6b7392", marginTop: 3 }}>{new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      <div style={{ fontSize: 10.5, color: "#9aa1b9", marginTop: 1 }}>{s.saleType} · {s.paymentMode}</div>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 700, color: "#0f1535" }}>{s.customer?.name || s.customerName || "Walk-in"}</div>
                      {s.customer?.phone && <div style={{ fontSize: 11, color: "#9aa1b9", marginTop: 2 }}>{s.customer.phone}</div>}
                      {salespersonOf(s) && <div style={{ fontSize: 11, color: "#6b7392", marginTop: 2 }}>by {salespersonOf(s)}</div>}
                    </Td>
                    <Td style={{ fontWeight: 800, color: "#0f1535", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(s.grandTotal)}</Td>
                    <Td style={{ color: "#1f9d6b", fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(s.amountPaid)}</Td>
                    <Td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                      {s.amountDue > 0 && s.status !== "Cancelled"
                        ? <span style={{ color: "#c0392b", fontWeight: 700 }}>{money(s.amountDue)}</span>
                        : <span style={{ color: "#b8bdd0" }}>—</span>}
                    </Td>
                    <Td>
                      <Badge color={stColor[s.status] || "gray"}>{s.status}</Badge>
                      {refunded > 0 && <div style={{ color: "#b45309", fontWeight: 700, fontSize: 11, marginTop: 4 }}>Refunded {money(refunded)}</div>}
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                        {s.status !== "Cancelled" && s.amountDue > 0 && <Btn sm color="green" onClick={() => setPayModal(s)}>Pay</Btn>}
                        <Btn sm color="cancel" onClick={() => setDetailModal(s)}>View</Btn>
                        <RowMenu items={[
                          { label: `Payment history (${s.payments?.length || 0})`, onClick: () => setPaymentDrawer(s) },
                          { label: "Edit sale", onClick: () => setEditModal(s), disabled: locked, disabledReason: "Sales with refunds cannot be edited" },
                          { label: "Service / Complaints", hidden: !canComplaints, onClick: () => { sessionStorage.setItem("complaintTarget", JSON.stringify({ referenceId: s._id, invoiceNo: s.invoiceNo })); navigate("complaints-active"); } },
                          { label: "Refunds", onClick: () => setRefundSale(s) },
                          { label: "Cancel sale", danger: true, hidden: s.status === "Cancelled", onClick: () => locked ? setRefundSale(s) : handleCancel(s._id) },
                          { label: "Delete sale", danger: true, hidden: !isAdmin, disabled: locked, disabledReason: "Sales with refunds cannot be deleted", onClick: () => handleDelete(s) },
                        ]} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>

            {/* ── Footer Totals Row ── */}
            {visibleSales.length > 0 && (
              <tfoot>
                <tr style={{ background: "#f5f3ff", borderTop: "2px solid #ddd6fe" }}>
                  <td colSpan={2} style={{ padding: "11px 14px", fontWeight: 800, fontSize: 12, color: "#4c1d95" }}>
                    Total · {visibleSales.length} invoice{visibleSales.length > 1 ? "s" : ""}
                  </td>
                  <td style={{ padding: "11px 14px", fontWeight: 800, color: "#0f1535", whiteSpace: "nowrap" }}>{money(totalRevenue)}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 800, color: "#1f9d6b", whiteSpace: "nowrap" }}>{money(totalReceived)}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 800, color: totalDue > 0 ? "#c0392b" : "#9aa1b9", whiteSpace: "nowrap" }}>{totalDue > 0 ? money(totalDue) : "—"}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </TableWrap>
      )}

      {payModal  && <PaymentModal sale={payModal}  onClose={() => setPayModal(null)}  onDone={afterPay}  />}
      {detailModal && <TransactionDetailsModal record={detailModal} type="sale" onClose={() => setDetailModal(null)} />}
      {refundSale && <RefundModal kind="sales" record={refundSale} isAdmin={isAdmin} onClose={()=>setRefundSale(null)} onDone={message=>{showToast(message);load();}} />}
      {paymentDrawer && <PaymentHistoryDrawer
        sale={paymentDrawer}
        onClose={() => setPaymentDrawer(null)}
        onAddPayment={() => { setPaymentDrawer(null); setPayModal(paymentDrawer); }}
        isAdmin={isAdmin}
        onEditPayment={payment => setEditingPayment({sale:paymentDrawer,payment})}
        onDeletePayment={async payment=>{if(!confirm(`Delete payment ₹${(+payment.amount||0).toLocaleString("en-IN")}? Customer paid and advance balances will be recalculated.`))return;try{const response=await salesAPI.deleteSalePayment(paymentDrawer._id,payment._id);setPaymentDrawer(response.data);showToast(response.message);load();}catch(err){alert(err.message);}}}
      />}
      {editingPayment && <PaymentEditModal title={`Edit Payment - ${editingPayment.sale.invoiceNo}`} payment={editingPayment.payment} onClose={()=>setEditingPayment(null)} onSave={async body=>{const response=await salesAPI.updateSalePayment(editingPayment.sale._id,editingPayment.payment._id,body);setEditingPayment(null);setPaymentDrawer(response.data);showToast(response.message);load();}} />}
      {editModal && <FullEditModal sale={editModal} onClose={() => setEditModal(null)} onDone={afterEdit} />}
    </div>
  );
}
