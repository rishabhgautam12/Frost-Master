import { useState, useEffect } from "react";
import {
  Btn, Badge, LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
  FormGroup, FormInput, FormSelect,
} from "../components/Shared";
import { customerAPI, salesAPI, productAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";

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

const TH = ({ children }) => (
  <th style={{ padding:"9px 11px", background:"#14b8a6", textAlign:"left",
    color:"#ecfeff", fontWeight:700, fontSize:11, whiteSpace:"nowrap" }}>{children}</th>
);
const TD = ({ children, style={} }) => (
  <td style={{ padding:"9px 11px", fontSize:12, color:"#334155", ...style }}>{children}</td>
);
const Stat = ({ label, value, color }) => (
  <div style={{ background:"#fff", borderRadius:8, padding:"14px 16px",
    borderLeft:`4px solid ${color}`, border:"1px solid #e2e8f0", flex:1, minWidth:130 }}>
    <div style={{ fontSize:20, fontWeight:800, color:"#1e293b" }}>{value}</div>
    <div style={{ fontSize:10, color:"#64748b", marginTop:3 }}>{label}</div>
  </div>
);

/* ────────────────────────────────────────────────
   TAB 1 — Products Bought
──────────────────────────────────────────────── */
function ProductsBoughtTab({ productSummary, stats }) {
  if (productSummary.length === 0)
    return <EmptyState icon="🛍️" text="No products purchased yet. Use the 'Add Sale' tab to create a sale." />;

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <Stat label="Unique Products"  value={productSummary.length}                         color="#3b82f6" />
        <Stat label="Total Qty Bought" value={productSummary.reduce((s,p)=>s+p.totalQty,0)} color="#8b5cf6" />
        <Stat label="Total Amount"     value={`₹${stats.totalBilled.toLocaleString()}`}      color="#f59e0b" />
        <Stat label="Amount Due"       value={`₹${stats.totalDue.toLocaleString()}`}         color="#ef4444" />
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>
            {["Product Name","Model No.","Total Qty","Total Amount","Last Purchase Date"]
              .map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {productSummary.map((p,i) => (
              <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f0fdfa"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <TD style={{ fontWeight:700 }}>{p.name}</TD>
                <TD style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>
                  {p.modelNumber||"—"}
                </TD>
                <TD style={{ fontWeight:700, fontSize:14 }}>{p.totalQty}</TD>
                <TD style={{ fontWeight:700, color:"#16a34a" }}>₹{p.totalAmount.toLocaleString()}</TD>
                <TD>{new Date(p.lastDate).toLocaleDateString("en-IN")}</TD>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background:"#eef6f5", fontWeight:800 }}>
              <td colSpan={2} style={{ padding:"10px 11px" }}>TOTAL</td>
              <td style={{ padding:"10px 11px" }}>{productSummary.reduce((s,p)=>s+p.totalQty,0)}</td>
              <td style={{ padding:"10px 11px", color:"#16a34a" }}>
                ₹{productSummary.reduce((s,p)=>s+p.totalAmount,0).toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   TAB 2 — Sale History
──────────────────────────────────────────────── */
function SaleHistoryTab({ sales, onRefresh, customerName }) {
  const [expanded, setExpanded] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payForm,  setPayForm]  = useState({
    amount:"", method:"Cash", notes:"",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const setPay = k => e => setPayForm(p => ({ ...p, [k]: e.target.value }));

  const openPay = (sale) => {
    setPayModal(sale);
    setPayForm(f => ({ ...f, amount: String(sale.amountDue), notes:"" }));
  };

  const handlePay = async () => {
    if (!payForm.amount || +payForm.amount <= 0)
      return alert("Please enter a valid amount.");
    if (+payForm.amount > payModal.amountDue)
      return alert(`Amount cannot exceed the balance due of ₹${payModal.amountDue.toLocaleString()}.`);
    setSaving(true);
    try {
      const res = await customerAPI.payForSale(payModal._id, {
        amount: +payForm.amount,
        method: payForm.method,
        notes:  payForm.notes,
        date:   payForm.date,
      });
      setToast(res.message);
      setPayModal(null);
      setPayForm({ amount:"", method:"Cash", notes:"", date: new Date().toISOString().split("T")[0] });
      onRefresh();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const handleCSV = () => {
    downloadCSV(sales, [
      { label:"Invoice No.",    key:"invoiceNo"    },
      { label:"Date",           key:"date"         },
      { label:"Sale Type",      key:"saleType"     },
      { label:"Payment Mode",   key:"paymentMode"  },
      { label:"Grand Total",    key:"grandTotal"   },
      { label:"Amount Paid",    key:"amountPaid"   },
      { label:"Amount Due",     key:"amountDue"    },
      { label:"Status",         key:"status"       },
      { label:"CGST",           key:"cgst"         },
      { label:"SGST",           key:"sgst"         },
      { label:"IGST",           key:"igst"         },
    ], `sales_${customerName || "customer"}`);
  };

  if (sales.length === 0)
    return <EmptyState icon="🧾" text="No sales found for this customer." />;

  const totalBilled   = sales.reduce((s,o)=>s+o.grandTotal,0);
  const totalReceived = sales.reduce((s,o)=>s+o.amountPaid,0);
  const totalDue      = sales.reduce((s,o)=>s+o.amountDue,0);

  return (
    <div>
      {toast && <SuccessToast msg={toast} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <Stat label="Total Orders"    value={sales.length}                         color="#3b82f6" />
          <Stat label="Total Billed"    value={`₹${totalBilled.toLocaleString()}`}   color="#8b5cf6" />
          <Stat label="Amount Received" value={`₹${totalReceived.toLocaleString()}`} color="#16a34a" />
          <Stat label="Amount Due"      value={`₹${totalDue.toLocaleString()}`}      color="#ef4444" />
        </div>
        <Btn color="green" onClick={handleCSV}>⬇ Export CSV</Btn>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>
            {["","Invoice","Date","Type","Payment","Total ₹","Paid ₹","Due ₹","Status","Action"]
              .map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {sales.map(s => (
              <>
                <tr key={s._id} style={{ borderBottom:"1px solid #f1f5f9" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0fdfa"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <TD>
                    <button onClick={() => setExpanded(expanded===s._id ? null : s._id)}
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:14 }}>
                      {expanded===s._id ? "▾" : "▸"}
                    </button>
                  </TD>
                  <TD style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>{s.invoiceNo}</TD>
                  <TD>{new Date(s.date).toLocaleDateString("en-IN")}</TD>
                  <TD>{s.saleType}</TD>
                  <TD>{s.paymentMode}</TD>
                  <TD style={{ fontWeight:700 }}>₹{s.grandTotal.toLocaleString()}</TD>
                  <TD style={{ color:"#16a34a", fontWeight:700 }}>₹{s.amountPaid.toLocaleString()}</TD>
                  <TD style={{ color:s.amountDue>0?"#ef4444":"#94a3b8", fontWeight:700 }}>
                    {s.amountDue>0 ? `₹${s.amountDue.toLocaleString()}` : "—"}
                  </TD>
                  <TD>
                    <Badge color={{ Paid:"green", Partial:"yellow", Pending:"red", Cancelled:"gray" }[s.status]}>
                      {s.status}
                    </Badge>
                  </TD>
                  <TD>
                    {s.amountDue > 0 && s.status !== "Cancelled" && (
                      <Btn sm color="teal" onClick={() => openPay(s)}>
                        💳 Receive
                      </Btn>
                    )}
                  </TD>
                </tr>

                {expanded===s._id && (
                  <tr style={{ background:"#f8fafc" }}>
                    <td colSpan={10} style={{ padding:"12px 20px" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8 }}>
                        🛍️ SALE ITEMS
                      </div>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead><tr>
                          {["Product","Qty","Rate ₹","Discount %","Discount ₹","Total ₹","GST ₹"]
                            .map(h=><th key={h} style={{ padding:"6px 10px", background:"#e2e8f0", textAlign:"left", fontWeight:700 }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {(s.items||[]).map((it,i)=>(
                            <tr key={i} style={{ borderBottom:"1px solid #e2e8f0" }}>
                              <td style={{ padding:"6px 10px", fontWeight:700 }}>{it.productName}</td>
                              <td style={{ padding:"6px 10px" }}>{it.qty}</td>
                              <td style={{ padding:"6px 10px" }}>₹{it.rate}</td>
                              <td style={{ padding:"6px 10px", color:"#f59e0b" }}>
                                {discountPercentFor(it)>0 ? `${formatPercent(discountPercentFor(it))}%` : "—"}
                              </td>
                              <td style={{ padding:"6px 10px", color:"#f59e0b" }}>
                                {discountAmountFor(it)>0 ? `₹${discountAmountFor(it).toFixed(2)}` : "—"}
                              </td>
                              <td style={{ padding:"6px 10px", fontWeight:700 }}>₹{it.total?.toLocaleString()}</td>
                              <td style={{ padding:"6px 10px", color:"#f59e0b" }}>₹{it.gstAmount?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ display:"flex", gap:20, marginTop:10, fontSize:11, color:"#64748b", flexWrap:"wrap" }}>
                        <span>Subtotal: <strong>₹{s.subtotal?.toLocaleString()}</strong></span>
                        <span>Discount: <strong style={{color:"#f59e0b"}}>-₹{(
                          s.totalDiscount || (s.items || []).reduce((sum, item) => sum + discountAmountFor(item), 0)
                        ).toFixed(2)}</strong></span>
                        {s.isInterState
                          ? <span>IGST: <strong style={{color:"#f59e0b"}}>₹{s.igst?.toFixed(2)}</strong></span>
                          : <>
                              <span>CGST: <strong style={{color:"#8b5cf6"}}>₹{s.cgst?.toFixed(2)}</strong></span>
                              <span>SGST: <strong style={{color:"#ec4899"}}>₹{s.sgst?.toFixed(2)}</strong></span>
                            </>
                        }
                        <span style={{ fontWeight:700, color:"#1e293b" }}>
                          Grand Total: ₹{s.grandTotal?.toLocaleString()}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rich Pay Modal */}
      {payModal && (() => {
        const due      = payModal.amountDue;
        const paying   = +payForm.amount || 0;
        const leftAfter = Math.max(0, due - paying);
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:9000,
            display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
            onClick={() => setPayModal(null)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", borderRadius:12, padding:28, width:480,
                maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
              <div style={{ fontSize:16, fontWeight:800, marginBottom:16 }}>
                💳 Receive Payment — {payModal.invoiceNo}
              </div>

              {/* Invoice summary strip */}
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0",
                borderRadius:8, padding:"12px 16px", marginBottom:16,
                display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, fontSize:12 }}>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Invoice Total</div>
                  <div style={{ fontWeight:800, fontSize:14 }}>₹{payModal.grandTotal.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Already Received</div>
                  <div style={{ fontWeight:700, color:"#16a34a" }}>₹{payModal.amountPaid.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Balance Due</div>
                  <div style={{ fontWeight:800, color:"#ef4444", fontSize:14 }}>₹{due.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Current Status</div>
                  <span style={{ background:{ Paid:"#dcfce7", Partial:"#ccfbf1", Pending:"#fee2e2" }[payModal.status],
                    color:{ Paid:"#166534", Partial:"#92400e", Pending:"#991b1b" }[payModal.status],
                    padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700 }}>
                    {payModal.status}
                  </span>
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>After This Payment</div>
                  <span style={{
                    background: leftAfter===0 && paying>0 ? "#dcfce7" : paying>0 ? "#ccfbf1" : "#f1f5f9",
                    color: leftAfter===0 && paying>0 ? "#166534" : paying>0 ? "#92400e" : "#64748b",
                    padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700 }}>
                    {leftAfter===0 && paying>0
                      ? "✅ Fully Settled"
                      : paying>0
                      ? `₹${leftAfter.toLocaleString()} will remain`
                      : "Enter amount below"}
                  </span>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <FormGroup label="Amount Receiving (₹) *">
                  <FormInput type="number" value={payForm.amount}
                    onChange={setPay("amount")}
                    placeholder={`Max ₹${due.toLocaleString()}`} />
                  {paying > due && (
                    <div style={{ color:"#ef4444", fontSize:10, marginTop:3 }}>
                      ⚠️ Cannot exceed balance of ₹{due.toLocaleString()}
                    </div>
                  )}
                </FormGroup>
                <FormGroup label="Payment Mode">
                  <FormSelect value={payForm.method} onChange={setPay("method")}>
                    {["Cash","UPI","Card","Bank Transfer","Cheque","Credit"].map(m=>(
                      <option key={m}>{m}</option>
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Date">
                  <FormInput type="date" value={payForm.date} onChange={setPay("date")} />
                </FormGroup>
                <FormGroup label="Notes (optional)">
                  <FormInput placeholder="Any notes..." value={payForm.notes} onChange={setPay("notes")} />
                </FormGroup>
              </div>

              <div style={{ display:"flex", gap:10, marginTop:16 }}>
                <Btn color="cancel" onClick={() => setPayModal(null)}>Cancel</Btn>
                <Btn color="teal" onClick={handlePay}
                  disabled={saving || !payForm.amount || +payForm.amount<=0 || +payForm.amount>due}>
                  {saving ? "Processing..." : `✅ Receive ₹${paying.toLocaleString()}`}
                </Btn>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ────────────────────────────────────────────────
   TAB 3 — Add Sale
──────────────────────────────────────────────── */
function AddSaleTab({ customer, onDone }) {
  const [allProducts, setAllProducts] = useState([]);
  const [items,  setItems]  = useState([{ product:"", qty:1, rate:"", discount:0 }]);
  const [form,   setForm]   = useState({
    saleType:"GST Invoice", paymentMode:"Cash",
    date:new Date().toISOString().split("T")[0],
    isInterState:false, amountPaid:"", notes:""
  });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  useEffect(() => {
    productAPI.getAll().then(r => setAllProducts(r.data)).catch(() => {});
  }, []);

  const setF = k => e => setForm(p => ({
    ...p, [k]: e.target.type==="checkbox" ? e.target.checked : e.target.value
  }));

  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => {
    if (idx!==i) return it;
    const u = { ...it, [k]: v };
    if (k==="product" && v) {
      const p = allProducts.find(p=>p._id===v);
      if (p) u.rate = String(p.sellingPrice);
    }
    return u;
  }));

  const addRow    = ()  => setItems(p => [...p, { product:"", qty:1, rate:"", discount:0 }]);
  const removeRow = (i) => setItems(p => p.filter((_,idx)=>idx!==i));

  const calcItem = it => {
    const gross = (+it.rate || 0) * (+it.qty || 0);
    const discountPercent = Math.min(100, Math.max(0, +it.discount || 0));
    const discountAmount = (gross * discountPercent) / 100;
    const sub = gross - discountAmount;
    const prod = allProducts.find(p=>p._id===it.product);
    const gst  = (sub * (+it.gstRate || prod?.gstRate || 18)) / 100;
    return { gross, discountAmount, sub, gst, total:sub+gst, gstRate:prod?.gstRate||18 };
  };

  const totals = items.reduce((s,it) => {
    const c = calcItem(it);
    return {
      sub: s.sub + c.gross,
      discount: s.discount + c.discountAmount,
      gst: s.gst + c.gst,
      total: s.total + c.total,
    };
  }, { sub:0, discount:0, gst:0, total:0 });

  const cgst = form.isInterState ? 0 : totals.gst/2;
  const sgst = form.isInterState ? 0 : totals.gst/2;
  const igst = form.isInterState ? totals.gst : 0;
  const due  = Math.max(0, totals.total - (+form.amountPaid||0));

  const handleSave = async () => {
    const valid = items.filter(it => it.product && +it.qty>0 && +it.rate>0);
    if (!valid.length) return alert("Please select at least one product.");
    setSaving(true);
    try {
      await salesAPI.create({
        customer:    customer._id,
        customerName:customer.name,
        saleType:    form.saleType,
        paymentMode: form.paymentMode,
        date:        form.date,
        isInterState:!!form.isInterState,
        amountPaid:  +form.amountPaid || 0,
        notes:       form.notes,
        items: valid.map(it => ({
          product:  it.product,
          qty:      +it.qty,
          rate:     +it.rate,
          discount: +it.discount||0,
        })),
      });
      setToast("Sale created successfully! Stock has been updated.");
      setItems([{ product:"", qty:1, rate:"", discount:0 }]);
      setForm({ saleType:"GST Invoice", paymentMode:"Cash",
                date:new Date().toISOString().split("T")[0],
                isInterState:false, amountPaid:"", notes:"" });
      onDone();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8,
        padding:"10px 16px", marginBottom:16, fontSize:12, color:"#1e40af" }}>
        Creating a sale for <strong>{customer.name}</strong>.
        Select a product — the rate will be filled automatically (you can edit it).
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
        <FormGroup label="Sale Type">
          <FormSelect value={form.saleType} onChange={setF("saleType")}>
            {["GST Invoice","Cash Sale"].map(t=><option key={t}>{t}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="Payment Mode">
          <FormSelect value={form.paymentMode} onChange={setF("paymentMode")}>
            {["Cash","UPI","Card","Bank Transfer","Credit","Cheque"].map(m=><option key={m}>{m}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="Date">
          <FormInput type="date" value={form.date} onChange={setF("date")} />
        </FormGroup>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12,
          fontWeight:700, cursor:"pointer" }}>
          <input type="checkbox" checked={form.isInterState} onChange={setF("isInterState")} />
          Inter-state sale (IGST applies)
        </label>
      </div>

      <div style={{ background:"#fff", borderRadius:8, border:"1px solid #e2e8f0",
        marginBottom:16, overflowX:"auto" }}>
        <div style={{ padding:"12px 14px", borderBottom:"1px solid #f1f5f9",
          fontWeight:700, fontSize:13 }}>🛍️ Sale Items</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr style={{ background:"#f8fafc" }}>
            {["Product","Qty","Rate (₹)","Discount (%)","GST %","Total (₹)",""]
              .map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left",
                fontWeight:700, fontSize:11 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {items.map((it,i) => {
              const c = calcItem(it);
              return (
                <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                  <td style={{ padding:"7px 8px" }}>
                    <select value={it.product}
                      onChange={e=>setItem(i,"product",e.target.value)}
                      style={{ width:220, padding:"7px 8px", border:"1px solid #d1d5db",
                        borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                      <option value="">— Select a product —</option>
                      {allProducts.map(p=>(
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.modelNumber}) | Stock: {p.stock} | ₹{p.sellingPrice}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding:"7px 8px" }}>
                    <input type="number" min="1" value={it.qty}
                      onChange={e=>setItem(i,"qty",e.target.value)}
                      style={{ width:55, padding:"7px 8px", border:"1px solid #d1d5db",
                        borderRadius:6, fontSize:12, textAlign:"center" }} />
                  </td>
                  <td style={{ padding:"7px 8px" }}>
                    <input type="number" value={it.rate}
                      onChange={e=>setItem(i,"rate",e.target.value)}
                      style={{ width:80, padding:"7px 8px", border:"1px solid #d1d5db",
                        borderRadius:6, fontSize:12 }} />
                  </td>
                  <td style={{ padding:"7px 8px" }}>
                    <input type="number" min="0" max="100" step="0.01" value={it.discount}
                      onChange={e=>setItem(i,"discount",e.target.value)}
                      style={{ width:70, padding:"7px 8px", border:"1px solid #d1d5db",
                        borderRadius:6, fontSize:12 }} />
                    {c.discountAmount > 0 && (
                      <div style={{ fontSize:9, color:"#f59e0b", marginTop:3 }}>
                        -₹{c.discountAmount.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:"7px 8px", color:"#64748b" }}>{c.gstRate}%</td>
                  <td style={{ padding:"7px 8px", fontWeight:700, color:"#16a34a" }}>
                    ₹{c.total.toFixed(2)}
                  </td>
                  <td style={{ padding:"7px 8px" }}>
                    {items.length>1 && (
                      <button onClick={()=>removeRow(i)}
                        style={{ background:"#fee2e2", color:"#991b1b", border:"none",
                          borderRadius:4, padding:"4px 8px", cursor:"pointer" }}>✕</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"10px 14px" }}>
          <Btn color="blue" sm onClick={addRow}>+ Add Row</Btn>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <FormGroup label="Amount Paid (₹)">
            <FormInput type="number" placeholder="0 for credit"
              value={form.amountPaid} onChange={setF("amountPaid")} />
          </FormGroup>
          <FormGroup label="Notes">
            <FormInput placeholder="Any notes..." value={form.notes} onChange={setF("notes")} />
          </FormGroup>
        </div>
        <div style={{ background:"#f8fafc", borderRadius:8, padding:16, fontSize:13 }}>
          <div style={{ fontWeight:700, marginBottom:10 }}>Invoice Summary</div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
            <span>Subtotal</span><span>₹{totals.sub.toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#f59e0b" }}>
            <span>Discount</span><span>-₹{totals.discount.toFixed(2)}</span>
          </div>
          {form.isInterState
            ? <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#f59e0b" }}>
                <span>IGST</span><span>₹{igst.toFixed(2)}</span>
              </div>
            : <>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#8b5cf6" }}>
                  <span>CGST</span><span>₹{cgst.toFixed(2)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#ec4899" }}>
                  <span>SGST</span><span>₹{sgst.toFixed(2)}</span>
                </div>
              </>
          }
          <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0",
            borderTop:"2px solid #e2e8f0", fontWeight:800, fontSize:16 }}>
            <span>Grand Total</span><span>₹{totals.total.toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#16a34a" }}>
            <span>Amount Paid</span><span>₹{(+form.amountPaid||0).toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0",
            color:due>0?"#ef4444":"#94a3b8", fontWeight:700 }}>
            <span>Balance Due</span><span>₹{due.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <Btn color="cancel" onClick={() => {
          setItems([{ product:"", qty:1, rate:"", discount:0 }]);
          setForm({ saleType:"GST Invoice", paymentMode:"Cash",
                    date:new Date().toISOString().split("T")[0],
                    isInterState:false, amountPaid:"", notes:"" });
        }}>Reset</Btn>
        <Btn color="teal" onClick={handleSave} disabled={saving}>
          {saving ? "Creating..." : "🧾 Create Sale"}
        </Btn>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────── */
export default function CustomerProfile({ customerId, navigate }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState("products");

  const load = () => {
    customerAPI.getById(customerId)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, [customerId]);

  if (loading) return <div style={{ padding:60 }}><LoadingSpinner /></div>;
  if (error)   return <ErrorMsg message={error} onRetry={load} />;

  const { customer, sales, productSummary, stats } = data;
  const TABS = [
    { key:"products", label:"📦 Products Bought" },
    { key:"history",  label:"🧾 Sale History"    },
    { key:"add-sale", label:"➕ Add Sale"         },
  ];
  const typeColor = { Retail:"green", Wholesale:"blue", VIP:"purple", Dealer:"yellow", Online:"gray" };

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <Btn color="cancel" onClick={() => navigate("customer-list")}>← Back to Customers</Btn>
      </div>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f)",
        borderRadius:12, padding:"22px 24px", marginBottom:20, color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.5px" }}>
              {customer.name}
            </div>
            <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap",
              fontSize:13, color:"#94a3b8" }}>
              <span>📞 {customer.phone}</span>
              {customer.email && <span>📧 {customer.email}</span>}
              {customer.city  && <span>📍 {customer.city}</span>}
              {customer.gstin && <span>🏷️ {customer.gstin}</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <Badge color={typeColor[customer.customerType]||"green"}>
              {customer.customerType}
            </Badge>
            <Badge color={{ Active:"green", Inactive:"red", VIP:"purple" }[customer.status]||"green"}>
              {customer.status}
            </Badge>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
          gap:10, marginTop:18 }}>
          {[
            { label:"Total Orders",    value: stats.totalOrders,                              bg:"rgba(59,130,246,0.2)",  border:"#3b82f6" },
            { label:"Total Billed",    value:`₹${stats.totalBilled.toLocaleString()}`,         bg:"rgba(139,92,246,0.2)",  border:"#8b5cf6" },
            { label:"Amount Received", value:`₹${stats.totalReceived.toLocaleString()}`,       bg:"rgba(22,163,74,0.2)",   border:"#16a34a" },
            { label:"Amount Due",      value:`₹${stats.totalDue.toLocaleString()}`,            bg:"rgba(239,68,68,0.2)",   border:"#ef4444" },
            { label:"Credit Limit",    value:`₹${(customer.creditLimit||0).toLocaleString()}`, bg:"rgba(245,158,11,0.2)",  border:"#f59e0b" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px",
              borderLeft:`3px solid ${c.border}` }}>
              <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{c.value}</div>
              <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"2px solid #e2e8f0",
        marginBottom:20, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:"10px 22px", fontWeight:700, fontSize:13, cursor:"pointer",
              borderBottom: tab===t.key ? "3px solid #14b8a6" : "3px solid transparent",
              marginBottom:-2, color: tab===t.key ? "#1e293b" : "#64748b",
              background: t.key==="add-sale" && tab!==t.key ? "#f0fdf4" : "transparent",
              borderRadius: t.key==="add-sale" ? "6px 6px 0 0" : 0 }}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === "products" && <ProductsBoughtTab productSummary={productSummary} stats={stats} />}
      {tab === "history"  && <SaleHistoryTab    sales={sales} onRefresh={load} customerName={customer.name} />}
      {tab === "add-sale" && <AddSaleTab        customer={customer} onDone={() => { load(); setTab("history"); }} />}
    </div>
  );
}
