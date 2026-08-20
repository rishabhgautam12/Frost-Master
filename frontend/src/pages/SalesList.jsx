import { useState, useEffect } from "react";
import {
  PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td, Badge,
  LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
  Modal, FormGroup, FormInput, FormSelect,
} from "../components/Shared";
import { salesAPI, customerAPI, productAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";

const stColor = { Paid: "green", Partial: "yellow", Pending: "red", Cancelled: "gray" };
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
const SALE_EDIT_GRID = "minmax(250px, 2fr) 100px 150px 70px 92px 84px 82px 105px 38px";
const SALE_EDIT_MIN_WIDTH = 980;

const saleDateValue = value => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const MONTHS = [
  { value: "", label: "All Months" },
  { value: "01", label: "January" },  { value: "02", label: "February" },
  { value: "03", label: "March" },    { value: "04", label: "April" },
  { value: "05", label: "May" },      { value: "06", label: "June" },
  { value: "07", label: "July" },     { value: "08", label: "August" },
  { value: "09", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - i);

// ── Payment Modal ──────────────────────────────────────────────────────────────
function PaymentModal({ sale, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(sale?.paymentMode || "Cash");
  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  if (!sale) return null;
  const due = sale.grandTotal - sale.amountPaid;

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setErr("Please enter a valid amount.");
    if (amt > due + 0.01) return setErr(`Maximum payable: ₹${due.toLocaleString()}`);
    setSaving(true); setErr("");
    try {
      await salesAPI.payForSale(sale._id, { amount: amt, method, notes });
      onDone(`₹${amt.toLocaleString()} payment recorded for ${sale.invoiceNo}`);
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal open title={`Record Payment — ${sale.invoiceNo}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, background: "#f8fafc", padding: 14, borderRadius: 8 }}>
        {[
          { label: "Grand Total",  value: `₹${sale.grandTotal.toLocaleString()}`,  color: "#1e293b" },
          { label: "Already Paid", value: `₹${sale.amountPaid.toLocaleString()}`,  color: "#16a34a" },
          { label: "Balance Due",  value: `₹${due.toLocaleString()}`,              color: due > 0 ? "#ef4444" : "#94a3b8" },
          { label: "Status",       value: sale.status,                             badge: true },
        ].map((d, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{d.label}</div>
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

      <FormGroup label="Payment Method">
        <FormSelect value={method} onChange={(e) => setMethod(e.target.value)}>
          {["Cash","UPI","Card","Bank Transfer","Cheque","Credit"].map(m => <option key={m}>{m}</option>)}
        </FormSelect>
      </FormGroup>

      <FormGroup label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note for this payment..."
          rows={2}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", background: "#f9fafb" }} />
      </FormGroup>

      {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>⚠️ {err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn color="cancel" onClick={onClose}>Cancel</Btn>
        <Btn color="green" onClick={handlePay} disabled={saving}>{saving ? "Saving..." : "✅ Record Payment"}</Btn>
      </div>
    </Modal>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
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
      <div style={{ marginBottom: 14, background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 12, color: "#64748b" }}>
        Customer: <strong style={{ color: "#1e293b" }}>{sale.customer?.name || sale.customerName || "Walk-in"}</strong>
        &nbsp;|&nbsp; Total: <strong style={{ color: "#1e293b" }}>₹{sale.grandTotal?.toLocaleString()}</strong>
        &nbsp;|&nbsp; Paid: <strong style={{ color: "#16a34a" }}>₹{sale.amountPaid?.toLocaleString()}</strong>
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
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>
            ⚠️ Manually override the status if needed. If set to Paid, amount paid will sync automatically.
          </div>
        </FormGroup>
      )}

      <FormGroup label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this sale..."
          rows={3}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", background: "#f9fafb" }} />
      </FormGroup>

      {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>⚠️ {err}</div>}
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
  });
  const [items, setItems] = useState(() => (sale?.items || []).map(it => ({
    product: it.product?._id || it.product || "",
    qty: it.qty || 1,
    rate: it.rate ?? "",
    discount: discountPercentFor(it),
    gstRate: it.gstRate ?? 18,
    warehouse: it.warehouse || "",
  })));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([customerAPI.getAll(), productAPI.getAll()])
      .then(([c, p]) => {
        setCustomers(c.data || []);
        setProducts(p.data || []);
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
      next.gstRate = prod?.gstRate ?? 18;
      next.warehouse = warehouseOptions(prod)[0]?.warehouse || "";
    }
    return next;
  }));
  const addItem = () => setItems(prev => [...prev, { product: "", qty: 1, rate: "", discount: 0, gstRate: 18, warehouse: "" }]);
  const removeItem = i => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  const calcItem = it => {
    const gross = (+it.rate || 0) * (+it.qty || 0);
    const discountPercent = Math.min(100, Math.max(0, +it.discount || 0));
    const discountAmount = (gross * discountPercent) / 100;
    const taxable = gross - discountAmount;
    const gst = (taxable * (+it.gstRate || 0)) / 100;
    return { gross, discountAmount, taxable, gst, total: taxable + gst };
  };
  const totals = items.reduce((sum, it) => {
    const c = calcItem(it);
    return {
      subtotal: sum.subtotal + c.gross,
      discount: sum.discount + c.discountAmount,
      gst: sum.gst + c.gst,
      total: sum.total + c.total,
    };
  }, { subtotal: 0, discount: 0, gst: 0, total: 0 });
  const due = Math.max(0, totals.total - (+form.amountPaid || 0));

  const handleSave = async () => {
    setSaving(true); setErr("");
    try {
      const validItems = items.filter(it => it.product && +it.qty > 0 && +it.rate >= 0);
      if (!validItems.length) throw new Error("Add at least one valid sale item.");
      if (!form.customer && !form.customerName && form.saleType !== "Cash Sale")
        throw new Error("Select a customer or enter a cash customer name.");
      await salesAPI.updateSaleDetails(sale._id, {
        ...form,
        customer: form.customer || undefined,
        isInterState: !!form.isInterState,
        amountPaid: +form.amountPaid || 0,
        items: validItems.map(it => ({
          product: it.product,
          qty: +it.qty,
          rate: +it.rate,
          discount: +it.discount || 0,
          gstRate: +it.gstRate || 0,
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
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
        <FormGroup label="Customer">
          <FormSelect value={form.customer}
            onChange={e => setForm(p => ({ ...p, customer: e.target.value, customerName: e.target.value ? "" : p.customerName }))}>
            <option value="">Walk-in / cash customer</option>
            {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}
          </FormSelect>
          {selectedCustomer && <div style={{ marginTop: 5, fontSize: 11, color: "#64748b" }}>{selectedCustomer.name} selected</div>}
        </FormGroup>
        <FormGroup label="Walk-in Customer Name">
          <FormInput placeholder="Customer name" value={form.customerName} onChange={set("customerName")} disabled={!!form.customer} />
        </FormGroup>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
        <input type="checkbox" checked={form.isInterState} onChange={set("isInterState")} />
        Inter-state sale
      </label>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflowX: "auto", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: SALE_EDIT_GRID, minWidth: SALE_EDIT_MIN_WIDTH, background: "#f8fafc", padding: "8px 10px", fontSize: 11, fontWeight: 800, color: "#1e293b" }}>
          {["Product","Model No.","Warehouse","Qty","Rate","Disc. %","GST %","Total",""].map(h => <div key={h} style={{ padding: "0 4px" }}>{h}</div>)}
        </div>
        {items.map((it, i) => {
          const prod = productById(it.product);
          const c = calcItem(it);
          const warehouses = warehouseOptions(prod);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: SALE_EDIT_GRID, minWidth: SALE_EDIT_MIN_WIDTH, padding: "8px 10px", borderTop: "1px solid #f1f5f9", alignItems: "start" }}>
              <div style={{ padding: "0 4px" }}>
                <select value={it.product} onChange={e => setItem(i, "product", e.target.value)}
                  style={{ width: "100%", padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, background: "#f9fafb" }}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name} | {p.modelNumber} | Stock: {p.stock}</option>)}
                </select>
              </div>
              <div style={{ padding: "7px 4px 0", color: "#0ea5e9", fontFamily: "monospace", fontSize: 11 }}>{prod?.modelNumber || "-"}</div>
              <div style={{ padding: "0 4px" }}>
                <input list={`sale-wh-${i}`} value={it.warehouse} onChange={e => setItem(i, "warehouse", e.target.value)}
                  placeholder="Warehouse"
                  style={{ width: "100%", padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} />
                <datalist id={`sale-wh-${i}`}>
                  {warehouses.map(w => <option key={w.warehouse} value={w.warehouse}>{w.stock}</option>)}
                </datalist>
                {warehouses.length > 0 && (
                  <div style={{ marginTop: 3, fontSize: 9.5, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {warehouses.map(w => `${w.warehouse}: ${w.stock}`).join(" | ")}
                  </div>
                )}
              </div>
              <div style={{ padding: "0 4px" }}><input type="number" min="1" value={it.qty} onChange={e => setItem(i, "qty", e.target.value)} style={{ width: "100%", padding: "7px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
              <div style={{ padding: "0 4px" }}><input type="number" value={it.rate} onChange={e => setItem(i, "rate", e.target.value)} style={{ width: "100%", padding: "7px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
              <div style={{ padding: "0 4px" }}><input type="number" min="0" max="100" step="0.01" value={it.discount} onChange={e => setItem(i, "discount", e.target.value)} style={{ width: "100%", padding: "7px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
              <div style={{ padding: "0 4px" }}>
                <select value={it.gstRate} onChange={e => setItem(i, "gstRate", e.target.value)}
                  style={{ width: "100%", padding: "7px 4px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, background: "#f9fafb" }}>
                  {["0","5","9","12","18","28"].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div style={{ padding: "7px 4px 0", fontWeight: 800, color: "#16a34a", fontSize: 12 }}>Rs {c.total.toFixed(2)}</div>
              <div style={{ padding: "0 4px" }}>
                <button type="button" onClick={() => removeItem(i)} style={{ width: "100%", padding: "6px 0", border: "none", borderRadius: 5, background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontWeight: 800 }}>x</button>
              </div>
            </div>
          );
        })}
        <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9" }}>
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
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", background: "#f9fafb" }} />
          </FormGroup>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: 16, fontSize: 13, alignSelf: "start" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Sale Summary</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span>Subtotal</span><strong>Rs {totals.subtotal.toFixed(2)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, color: "#f59e0b" }}>
            <span>{form.paymentMode === "Cash" ? "Cash Amount" : "Discount"}</span>
            <strong>Rs {form.paymentMode === "Cash" ? (+form.amountPaid || 0).toFixed(2) : totals.discount.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span>GST</span><strong>Rs {totals.gst.toFixed(2)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: 9, fontSize: 16 }}><span>Grand Total</span><strong>Rs {totals.total.toFixed(2)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: due > 0 ? "#ef4444" : "#16a34a" }}><span>Due</span><strong>Rs {due.toFixed(2)}</strong></div>
        </div>
      </div>

      {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>Warning: {err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn color="cancel" onClick={onClose}>Cancel</Btn>
        <Btn color="teal" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Btn>
      </div>
    </Modal>
  );
}

function ExpandedRow({ sale, cols }) {
  return (
    <tr style={{ background: "#f0fdf4" }}>
      <td colSpan={cols} style={{ padding: "14px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12 }}>
          {[
            { label: "Invoice No",   value: sale.invoiceNo },
            { label: "Sale Type",    value: sale.saleType },
            { label: "Payment Mode", value: sale.paymentMode },
            { label: "Grand Total",  value: `₹${sale.grandTotal.toLocaleString()}` },
            { label: "Amount Paid",  value: `₹${sale.amountPaid.toLocaleString()}` },
            { label: "Balance Due",  value: sale.amountDue > 0 ? `₹${sale.amountDue.toLocaleString()}` : "—" },
            { label: "GST",          value: `₹${sale.totalGST?.toLocaleString()}` },
            { label: "CGST",         value: `₹${sale.cgst?.toLocaleString()}` },
            { label: "SGST",         value: `₹${sale.sgst?.toLocaleString()}` },
          ].map((d, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{d.label}</div>
              <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 700, marginTop: 2 }}>{d.value}</div>
            </div>
          ))}
          {sale.notes && (
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Notes</div>
              <div style={{ fontSize: 12.5, color: "#475569", marginTop: 2, background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                📝 {sale.notes}
              </div>
            </div>
          )}
          {sale.items?.length > 0 && (
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Items</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ fontSize: 11.5, borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#e2e8f0" }}>
                      {["Product","Warehouse","Qty","Rate","Discount %","Discount Amount","Total","GST Rate","GST Amt"].map(h => (
                        <th key={h} style={{ padding: "5px 10px", textAlign: "left", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((it, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ padding: "5px 10px" }}>{it.productName || it.product?.name}</td>
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SalesList({ navigate }) {
  const [sales,    setSales]    = useState([]);
  const [summary,  setSummary]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [month,    setMonth]    = useState("");
  const [year,     setYear]     = useState(String(currentYear));
  const [toast,    setToast]    = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [editModal,setEditModal]= useState(null);

  // Derive date range from month + year pickers
  const getDateRange = () => {
    if (!month) {
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${lastDay}` };
  };

  const load = () => {
    setLoading(true);
    const range  = getDateRange();
    const params = { from: range.from, to: range.to };
    if (status) params.status = status;
    if (search) params.search = search;
    salesAPI.getAll(params)
      .then((r) => { setSales(r.data); setSummary(r.summary || {}); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleCancel = async (id) => {
    if (!confirm("Cancel this sale and restore stock?")) return;
    try { await salesAPI.cancel(id); showToast("Sale cancelled & stock restored"); load(); }
    catch (e) { alert(e.message); }
  };

  const afterPay  = (msg) => { setPayModal(null);  showToast(msg); load(); };
  const afterEdit = (msg) => { setEditModal(null); showToast(msg); load(); };
  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  // Totals from current list
  const totalRevenue  = sales.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const totalReceived = sales.reduce((s, o) => s + (o.amountPaid || 0), 0);
  const totalDue      = sales.reduce((s, o) => s + (o.amountDue  || 0), 0);
  const totalGST      = sales.reduce((s, o) => s + (o.totalGST   || 0), 0);
  const dueCount      = sales.filter(o => o.amountDue > 0 && o.status !== "Cancelled").length;

  const COLS = 11;

  return (
    <div>
      <PageTitle>All Sales</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Sales",     value: sales.length,                          color: "#3b82f6", icon: "🧾" },
          { label: "Total Revenue",   value: `₹${totalRevenue.toLocaleString()}`,   color: "#8b5cf6", icon: "💼" },
          { label: "Amount Received", value: `₹${totalReceived.toLocaleString()}`,  color: "#16a34a", icon: "✅" },
          { label: "Amount Due",      value: `₹${totalDue.toLocaleString()}`,       color: "#ef4444", icon: "🔴" },
          { label: "Total GST",       value: `₹${totalGST.toLocaleString()}`,       color: "#f59e0b", icon: "📋" },
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0", borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              {c.icon} {c.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Collection Progress Bar ── */}
      {totalRevenue > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, whiteSpace: "nowrap" }}>💰 Collection Status</div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ height: 8, borderRadius: 20, background: "#fee2e2", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 20, background: "#16a34a", width: `${Math.min(100, (totalReceived / totalRevenue) * 100).toFixed(1)}%`, transition: "width 0.6s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10.5 }}>
              <span style={{ color: "#16a34a", fontWeight: 700 }}>Collected: {((totalReceived / totalRevenue) * 100).toFixed(1)}%</span>
              <span style={{ color: "#ef4444", fontWeight: 700 }}>Pending: {((totalDue / totalRevenue) * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 800, whiteSpace: "nowrap" }}>
            {dueCount > 0 ? `${dueCount} invoice${dueCount > 1 ? "s" : ""} pending` : "All cleared ✅"}
          </div>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Btn color="teal"  onClick={() => navigate("sale-create")}>+ Create Sale</Btn>
        <Btn color="blue"  onClick={() => navigate("gst-report")}>📊 GST Report</Btn>
        <Btn color="green" onClick={() => downloadCSV(sales, [
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
        ], "all_sales")}>⬇ Export CSV</Btn>
      </div>

      {/* ── Filters ── */}
      <SearchBar>
        <Input placeholder="Search invoice / customer..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, background: "#f9fafb" }}>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)}
          style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, background: "#f9fafb" }}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, background: "#f9fafb" }}>
          <option value="">All Status</option>
          {["Paid","Partial","Pending","Cancelled"].map(s => <option key={s}>{s}</option>)}
        </select>
        <Btn color="blue" onClick={load}>Filter</Btn>
        <Btn color="cancel" onClick={() => {
          setSearch(""); setMonth(""); setYear(String(currentYear)); setStatus("");
          setTimeout(load, 50);
        }}>Reset</Btn>
      </SearchBar>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["","Invoice No.", "Date", "Customer", "Type", "Payment", "Total ₹", "Paid ₹", "Due ₹", "Status", "Actions"].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan={COLS}><EmptyState text="No sales found for the selected period." /></td></tr>
              ) : sales.map(s => (
                <>
                  <tr key={s._id}
                    style={{ borderBottom: "1px solid #f1f5f9", background: s.amountDue > 0 && s.status !== "Cancelled" ? "#fff9f9" : "" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0fdfa"}
                    onMouseLeave={e => e.currentTarget.style.background = s.amountDue > 0 && s.status !== "Cancelled" ? "#fff9f9" : ""}
                  >
                    <Td>
                      <button onClick={() => toggleExpand(s._id)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#64748b", padding: "2px 4px" }}>
                        {expanded === s._id ? "▲" : "▼"}
                      </button>
                    </Td>
                    <Td style={{ fontFamily: "monospace", color: "#0ea5e9", fontSize: 11 }}>{s.invoiceNo}</Td>
                    <Td>{new Date(s.date).toLocaleDateString("en-IN")}</Td>
                    <Td style={{ fontWeight: 700 }}>{s.customer?.name || s.customerName || "Walk-in"}</Td>
                    <Td>{s.saleType}</Td>
                    <Td>{s.paymentMode}</Td>
                    <Td style={{ fontWeight: 700 }}>₹{s.grandTotal.toLocaleString()}</Td>
                    <Td style={{ color: "#16a34a", fontWeight: 700 }}>₹{s.amountPaid.toLocaleString()}</Td>
                    <Td>
                      {s.amountDue > 0
                        ? <span style={{ color: "#ef4444", fontWeight: 700, background: "#fee2e2", padding: "2px 7px", borderRadius: 20, fontSize: 11 }}>
                            ₹{s.amountDue.toLocaleString()}
                          </span>
                        : <span style={{ color: "#94a3b8" }}>—</span>
                      }
                    </Td>
                    <Td><Badge color={stColor[s.status] || "gray"}>{s.status}</Badge></Td>
                    <Td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {s.status !== "Paid" && s.status !== "Cancelled" && (
                          <Btn sm color="green" onClick={() => setPayModal(s)}>💰 Pay</Btn>
                        )}
                        <Btn sm color="blue" onClick={() => setEditModal(s)}>✏️ Edit</Btn>
                        {s.status !== "Cancelled" && (
                          <Btn sm color="red" onClick={() => handleCancel(s._id)}>✕</Btn>
                        )}
                      </div>
                    </Td>
                  </tr>
                  {expanded === s._id && <ExpandedRow key={`exp-${s._id}`} sale={s} cols={COLS} />}
                </>
              ))}
            </tbody>

            {/* ── Footer Totals Row ── */}
            {sales.length > 0 && (
              <tfoot>
                <tr style={{ background: "#ccfbf1", borderTop: "2px solid #14b8a6" }}>
                  <td colSpan={6} style={{ padding: "10px 12px", fontWeight: 800, fontSize: 12, color: "#92400e" }}>
                    📊 TOTAL ({sales.length} invoice{sales.length > 1 ? "s" : ""})
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: 13, color: "#1e293b" }}>
                    ₹{totalRevenue.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: 13, color: "#16a34a" }}>
                    ₹{totalReceived.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: 13, color: totalDue > 0 ? "#ef4444" : "#94a3b8" }}>
                    {totalDue > 0 ? `₹${totalDue.toLocaleString()}` : "—"}
                  </td>
                  <td colSpan={2} style={{ padding: "10px 12px", fontSize: 11, color: "#92400e" }}>
                    {dueCount > 0 ? `⚠️ ${dueCount} invoice${dueCount > 1 ? "s" : ""} have pending dues` : "✅ All invoices cleared"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </TableWrap>
      )}

      {payModal  && <PaymentModal sale={payModal}  onClose={() => setPayModal(null)}  onDone={afterPay}  />}
      {editModal && <FullEditModal sale={editModal} onClose={() => setEditModal(null)} onDone={afterEdit} />}
    </div>
  );
}
