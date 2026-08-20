import { useState, useEffect } from "react";
import {
  PageTitle, Btn, TableWrap, Th, Td, Badge, LoadingSpinner, ErrorMsg,
  EmptyState, Modal, FormGroup, FormInput, FormSelect, SuccessToast
} from "../components/Shared";
import { salesAPI, employeeAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";

const money = (n) => `₹${(+n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().split("T")[0];

function currentUser() {
  try { return JSON.parse(localStorage.getItem("ht_user") || "null"); }
  catch { return null; }
}

function calcItem(it) {
  const qty = +it.qty || 0;
  const rate = +it.rate || 0;
  const billingRate = it.billingRate === "" || it.billingRate === undefined ? rate : (+it.billingRate || 0);
  const transport = +it.transportAmount || 0;
  const actual = qty * rate;
  const billing = qty * billingRate;
  const gst = (billing * (+it.gstRate || 0)) / 100 + (transport * (+it.transportGstRate || 0)) / 100;
  return { actual, billing, transport, gst, total: actual + transport + gst };
}

function summarize(items) {
  return items.reduce((sum, it) => {
    const row = calcItem(it);
    return {
      subtotal: sum.subtotal + row.actual,
      transport: sum.transport + row.transport,
      gst: sum.gst + row.gst,
      grand: sum.grand + row.total,
    };
  }, { subtotal: 0, transport: 0, gst: 0, grand: 0 });
}

function PurchaseModal({
  purchase, editMode, canEdit, onClose, onEdit, onSave, saving,
  form, setForm, items, setItems, payments, setPayments, warehouseOptions,
}) {
  if (!purchase) return null;
  const disabled = !editMode;
  const totals = summarize(items);
  const paid = payments.reduce((sum, p) => sum + (+p.amount || 0), 0);
  const due = Math.max(0, totals.grand - paid);
  const setF = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setItem = (idx, key, value) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  const setPayment = (idx, key, value) => setPayments((prev) => prev.map((p, i) => i === idx ? { ...p, [key]: value } : p));
  const mutedInput = disabled ? { opacity: 0.72, cursor: "not-allowed" } : {};

  const addPayment = () => setPayments((prev) => [...prev, {
    paymentMode: "Cash", amount: "", date: form.date || today(), notes: "",
  }]);
  const removePayment = (idx) => setPayments((prev) => prev.filter((_, i) => i !== idx));

  return (
    <Modal open={!!purchase} onClose={onClose} wide title={`Purchase Details - ${purchase.purchaseNo}`}>
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:14 }}>
          <div style={{ color:"#64748b", fontSize:12 }}>
            {purchase.vendor?.name || "Vendor"} · {new Date(purchase.date).toLocaleDateString("en-IN")}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {!editMode && canEdit && <Btn sm color="blue" onClick={onEdit}>Edit</Btn>}
            {editMode && <Btn sm color="cancel" onClick={onClose}>Cancel</Btn>}
            {editMode && <Btn sm color="teal" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
          {[
            ["Subtotal", money(totals.subtotal), "#1e293b"],
            ["Transport", money(totals.transport), "#64748b"],
            ["Total GST", money(totals.gst), "#f59e0b"],
            ["Grand Total", money(totals.grand), "#111827"],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", fontWeight:800 }}>{label}</div>
              <div style={{ marginTop:4, color, fontWeight:800, fontSize:16 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <FormGroup label="Vendor Invoice No.">
            <FormInput disabled={disabled} style={mutedInput} value={form.invoiceNo} onChange={setF("invoiceNo")} />
          </FormGroup>
          <FormGroup label="Purchase Date">
            <FormInput type="date" disabled={disabled} style={mutedInput} value={form.date} onChange={setF("date")} />
          </FormGroup>
          <FormGroup label="Status">
            <FormInput disabled style={{ ...mutedInput, fontWeight:700 }} value={due === 0 ? "Received" : paid > 0 ? "Partial" : "Pending"} readOnly />
          </FormGroup>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:13, marginBottom:8 }}>Purchased Items</div>
          <div style={{ border:"1px solid #e2e8f0", borderRadius:8, overflowX:"auto" }}>
            <div style={{ display:"grid", gridTemplateColumns:"minmax(190px,2fr) 90px 130px 70px 90px 105px 78px 95px 88px 100px", minWidth:1140, background:"#f8fafc", padding:"8px 10px", fontSize:11, fontWeight:800 }}>
              {["Product","Model","Warehouse","Qty","Rate","Billing Rate","GST %","Transport","Trans GST","Total"].map(h => <div key={h} style={{ padding:"0 4px" }}>{h}</div>)}
            </div>
            {items.map((it, idx) => {
              const row = calcItem(it);
              return (
                <div key={idx} style={{ display:"grid", gridTemplateColumns:"minmax(190px,2fr) 90px 130px 70px 90px 105px 78px 95px 88px 100px", minWidth:1140, padding:"8px 10px", borderTop:"1px solid #f1f5f9", alignItems:"start" }}>
                  <div style={{ padding:"7px 4px 0", fontWeight:700 }}>{it.productName || "Item"}</div>
                  <div style={{ padding:"7px 4px 0", fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>{it.modelNumber || "-"}</div>
                  <div style={{ padding:"0 4px" }}>
                    {warehouseOptions.length ? (
                      <select disabled={disabled} value={it.warehouse || ""} onChange={(e) => setItem(idx, "warehouse", e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db", borderRadius:6, background:"#f9fafb", fontSize:12, ...mutedInput }}>
                        {it.warehouse && !warehouseOptions.some(w => w.name === it.warehouse) && <option value={it.warehouse}>{it.warehouse}</option>}
                        {warehouseOptions.map(w => <option key={w._id} value={w.name}>{w.name}</option>)}
                      </select>
                    ) : (
                      <input disabled={disabled} value={it.warehouse || ""} onChange={(e) => setItem(idx, "warehouse", e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box", ...mutedInput }} />
                    )}
                  </div>
                  <div style={{ padding:"0 4px" }}><input type="number" min="1" disabled={disabled} value={it.qty} onChange={(e) => setItem(idx, "qty", e.target.value)} style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box", ...mutedInput }} /></div>
                  <div style={{ padding:"0 4px" }}><input type="number" min="0" disabled={disabled} value={it.rate} onChange={(e) => setItem(idx, "rate", e.target.value)} style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box", ...mutedInput }} /></div>
                  <div style={{ padding:"0 4px" }}><input type="number" min="0" disabled={disabled} value={it.billingRate} onChange={(e) => setItem(idx, "billingRate", e.target.value)} style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box", ...mutedInput }} /></div>
                  <div style={{ padding:"0 4px" }}>
                    <select disabled={disabled} value={it.gstRate} onChange={(e) => setItem(idx, "gstRate", e.target.value)} style={{ width:"100%", padding:"7px 4px", border:"1px solid #d1d5db", borderRadius:6, background:"#f9fafb", fontSize:12, ...mutedInput }}>
                      {["0","5","9","12","18","28"].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div style={{ padding:"0 4px" }}><input type="number" min="0" disabled={disabled} value={it.transportAmount} onChange={(e) => setItem(idx, "transportAmount", e.target.value)} style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box", ...mutedInput }} /></div>
                  <div style={{ padding:"0 4px" }}>
                    <select disabled={disabled} value={it.transportGstRate} onChange={(e) => setItem(idx, "transportGstRate", e.target.value)} style={{ width:"100%", padding:"7px 4px", border:"1px solid #d1d5db", borderRadius:6, background:"#f9fafb", fontSize:12, ...mutedInput }}>
                      {["0","5","12","18","28"].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div style={{ padding:"7px 4px 0", fontWeight:800 }}>{money(row.total)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontWeight:800, fontSize:13 }}>Payments</div>
              {editMode && <Btn sm color="blue" onClick={addPayment}>+ Add Payment</Btn>}
            </div>
            <div style={{ border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
              {payments.length === 0 ? (
                <div style={{ padding:12, color:"#64748b", fontSize:12 }}>No payment recorded.</div>
              ) : payments.map((p, idx) => (
                <div key={p._id || idx} style={{ display:"grid", gridTemplateColumns:"120px 1fr 135px 1fr 34px", gap:8, padding:10, borderTop:idx ? "1px solid #f1f5f9" : "none" }}>
                  <FormSelect disabled={disabled} value={p.paymentMode} onChange={(e) => setPayment(idx, "paymentMode", e.target.value)}>
                    {["Cash","UPI","Bank Transfer","Cheque"].map(m => <option key={m}>{m}</option>)}
                  </FormSelect>
                  <FormInput type="number" disabled={disabled} value={p.amount} onChange={(e) => setPayment(idx, "amount", e.target.value)} />
                  <FormInput type="date" disabled={disabled} value={p.date} onChange={(e) => setPayment(idx, "date", e.target.value)} />
                  <FormInput disabled={disabled} placeholder="Notes" value={p.notes || ""} onChange={(e) => setPayment(idx, "notes", e.target.value)} />
                  {editMode ? <button onClick={() => removePayment(idx)} style={{ border:0, borderRadius:6, background:"#fee2e2", color:"#991b1b", cursor:"pointer" }}>x</button> : <span />}
                </div>
              ))}
            </div>
          </div>
          <div>
            <FormGroup label="Notes">
              <FormInput disabled={disabled} style={mutedInput} value={form.notes} onChange={setF("notes")} placeholder="Any notes..." />
            </FormGroup>
            <div style={{ background:"#f8fafc", borderRadius:8, padding:16, fontSize:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}><span>Amount Paid</span><strong style={{ color:"#16a34a" }}>{money(paid)}</strong></div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}><span>Outstanding</span><strong style={{ color:due > 0 ? "#ef4444" : "#94a3b8" }}>{money(due)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function PurchasesList({ navigate }) {
  const [purchases, setPurchases] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ invoiceNo:"", date:today(), notes:"" });
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const canEdit = currentUser()?.role === "admin";

  const load = () => {
    setLoading(true);
    salesAPI.getPurchases()
      .then((r) => { setPurchases(r.data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => {
    load();
    employeeAPI.getWarehouses().then(r => setWarehouseOptions(r.data || [])).catch(() => {});
  }, []);

  const openPurchase = (p) => {
    setSelected(p);
    setEditMode(false);
    setForm({
      invoiceNo: p.invoiceNo || "",
      date: p.date ? new Date(p.date).toISOString().split("T")[0] : today(),
      notes: p.notes || "",
    });
    setItems((p.items || []).map((it) => ({
      product: it.product?._id || it.product || "",
      productName: it.productName || it.product?.name || "",
      modelNumber: it.product?.modelNumber || "",
      qty: it.qty || 1,
      rate: it.rate ?? 0,
      billingRate: it.billingRate ?? it.rate ?? 0,
      gstRate: it.gstRate ?? 18,
      transportAmount: it.transportAmount ?? 0,
      transportGstRate: it.transportGstRate ?? 0,
      warehouse: it.warehouse || "Main Warehouse",
    })));
    setPayments((p.payments || []).map((pay) => ({
      _id: pay._id,
      paymentMode: pay.paymentMode || "Cash",
      amount: pay.amount ?? 0,
      date: pay.date ? new Date(pay.date).toISOString().split("T")[0] : today(),
      notes: pay.notes || "",
    })));
  };

  const closeModal = () => {
    if (editMode) {
      openPurchase(selected);
      return;
    }
    setSelected(null);
    setEditMode(false);
  };

  const savePurchase = async () => {
    if (!selected) return;
    const validItems = items.filter((it) => (+it.qty || 0) > 0 && (+it.rate || 0) >= 0);
    const cleanPayments = payments
      .filter((p) => (+p.amount || 0) > 0)
      .map((p) => ({
        paymentMode: p.paymentMode || "Cash",
        amount: +p.amount || 0,
        date: p.date || form.date,
        notes: p.notes || "",
      }));
    const totalPaid = cleanPayments.reduce((sum, p) => sum + (+p.amount || 0), 0);
    setSaving(true);
    try {
      const res = await salesAPI.updatePurchase(selected._id, {
        invoiceNo: form.invoiceNo,
        date: form.date,
        notes: form.notes,
        paymentMode: cleanPayments.length > 1 ? "Multiple" : (cleanPayments[0]?.paymentMode || "Credit"),
        amountPaid: totalPaid,
        payments: cleanPayments,
        items: validItems.map((it) => ({
          product: it.product || undefined,
          productName: it.productName,
          qty: +it.qty || 1,
          rate: +it.rate || 0,
          billingRate: it.billingRate === "" ? undefined : +it.billingRate,
          gstRate: +it.gstRate || 0,
          transportAmount: +it.transportAmount || 0,
          transportGstRate: +it.transportGstRate || 0,
          warehouse: it.warehouse || "Main Warehouse",
        })),
      });
      setToast("Purchase updated successfully!");
      setSelected(res.data);
      setEditMode(false);
      load();
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  };

  const total = purchases.reduce((s, p) => s + p.grandTotal, 0);
  const paid = purchases.reduce((s, p) => s + (p.amountPaid || 0), 0);

  return (
    <div>
      <PageTitle>All Purchases</PageTitle>
      {toast && <SuccessToast msg={toast} />}
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { label: "Total Purchases", value: purchases.length, color: "#3b82f6" },
          { label: "Total Amount", value: money(total), color: "#8b5cf6" },
          { label: "Amount Paid", value: money(paid), color: "#16a34a" },
          { label: "Outstanding", value: money(total - paid), color: "#ef4444" },
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "12px 16px", borderLeft: `4px solid ${c.color}`, border: "1px solid #e2e8f0", minWidth: 140 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{c.value}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <Btn color="teal" onClick={() => navigate("purchase-create")}>+ Create Purchase</Btn>
        <Btn color="green" onClick={() => downloadCSV(purchases, [
          { label:"Purchase No.", key:"purchaseNo" },
          { label:"Date", key:"date" },
          { label:"Vendor", key:"vendor.name" },
          { label:"Invoice No.", key:"invoiceNo" },
          { label:"Total (₹)", key:"grandTotal" },
          { label:"Paid (₹)", key:"amountPaid" },
          { label:"Payment Mode", key:"paymentMode" },
          { label:"Status", key:"status" },
        ], "all_purchases")}>Export CSV</Btn>
      </div>
      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} /> : (
        <TableWrap>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{["Purchase No.", "Date", "Vendor", "Vendor Invoice", "Items", "Total ₹", "Paid ₹", "Due ₹", "Payments"].map((h) => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr><td colSpan={9}><EmptyState text="No purchases yet" /></td></tr>
              ) : purchases.map((p) => {
                const due = Math.max(0, (p.grandTotal || 0) - (p.amountPaid || 0));
                return (
                  <tr key={p._id} onClick={() => openPurchase(p)} style={{ borderBottom: "1px solid #f1f5f9", cursor:"pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f0fdfa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                    <Td style={{ fontFamily: "monospace", color: "#0ea5e9" }}>{p.purchaseNo}</Td>
                    <Td>{new Date(p.date).toLocaleDateString("en-IN")}</Td>
                    <Td style={{ fontWeight: 700 }}>{p.vendor?.name || "-"}</Td>
                    <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{p.invoiceNo || "-"}</Td>
                    <Td>{p.items?.length || 0}</Td>
                    <Td style={{ fontWeight: 700 }}>{money(p.grandTotal)}</Td>
                    <Td style={{ color: "#16a34a" }}>{money(p.amountPaid || 0)}</Td>
                    <Td style={{ color: due > 0 ? "#ef4444" : "#94a3b8", fontWeight: 700 }}>{due > 0 ? money(due) : "-"}</Td>
                    <Td>
                      {p.payments?.length ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {p.payments.map((payment, idx) => (
                            <div key={payment._id || idx} style={{ fontSize: 11, color: "#475569" }}>
                              <strong>{payment.paymentMode}</strong>: {money(payment.amount)}
                            </div>
                          ))}
                        </div>
                      ) : p.paymentMode}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      <PurchaseModal
        purchase={selected}
        editMode={editMode}
        canEdit={canEdit}
        onClose={closeModal}
        onEdit={() => setEditMode(true)}
        onSave={savePurchase}
        saving={saving}
        form={form}
        setForm={setForm}
        items={items}
        setItems={setItems}
        payments={payments}
        setPayments={setPayments}
        warehouseOptions={warehouseOptions}
      />
    </div>
  );
}
