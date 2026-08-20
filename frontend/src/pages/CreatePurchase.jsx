import { useState, useEffect } from "react";
import { PageTitle, Btn, FormGroup, FormInput, FormSelect, SuccessToast } from "../components/Shared";
import { salesAPI, vendorAPI, productAPI, employeeAPI } from "../services/api";
import QuickAddProduct from "../components/QuickAddProduct";

export default function CreatePurchase({ navigate }) {
  const [vendors,  setVendors]  = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [form, setForm] = useState({
    vendor:"", invoiceNo:"", date:new Date().toISOString().split("T")[0],
    notes:""
  });
  const [payments, setPayments] = useState([
    { paymentMode:"Credit", amount:"0", date:new Date().toISOString().split("T")[0], notes:"" }
  ]);
  const [items, setItems] = useState([
    { product:"", productName:"", qty:1, rate:"", billingRate:"", gstRate:18, transportAmount:"", transportGstRate:0, warehouse:"Main Warehouse" }
  ]);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);
  const [newProductRow, setNewProductRow] = useState(null);

  const loadProducts = () => {
    productAPI.getAll().then(r => setProducts(r.data)).catch(() => {});
  };

  useEffect(() => {
    Promise.all([vendorAPI.getAll({ status:"Active" }), productAPI.getAll(), employeeAPI.getWarehouses()])
      .then(([v, p, w]) => {
        setVendors(v.data);
        setProducts(p.data);
        setWarehouseOptions(w.data || []);
        if (w.data?.[0]?.name) {
          setItems(prev => prev.map(it => ({ ...it, warehouse: it.warehouse || w.data[0].name })));
        }
      })
      .catch(() => {});
  }, []);

  // Called when a new product is created inline
  const handleNewProductSaved = (rowIndex, newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
    setItems(prev => prev.map((it, idx) => {
      if (idx !== rowIndex) return it;
      return {
        ...it,
        product:     newProduct._id,
        productName: newProduct.name,
        rate:        String(newProduct.purchasePrice),
        billingRate: String(newProduct.purchasePrice),
        gstRate:     newProduct.gstRate || 18,
      };
    }));
    setNewProductRow(null);
    setToast(`Product "${newProduct.name}" created and selected.`);
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setPayment = (i, k, v) => setPayments(prev => prev.map((payment, idx) => (
    idx === i ? { ...payment, [k]: v } : payment
  )));
  const addPaymentRow = () => setPayments(prev => [...prev, { paymentMode:"Cash", amount:"", date:form.date, notes:"" }]);
  const removePaymentRow = (i) => setPayments(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => {
    if (idx !== i) return it;
    const u = { ...it, [k]: v };
    if (k === "product" && v) {
      const prod = products.find(p => p._id === v);
      if (prod) {
        u.rate    = String(prod.purchasePrice);
        u.billingRate = String(prod.purchasePrice);
        u.gstRate = prod.gstRate || 18;
      }
    }
    return u;
  }));

  const addItem    = () => setItems(p => [...p, { product:"", productName:"", qty:1, rate:"", billingRate:"", gstRate:18, transportAmount:"", transportGstRate:0, warehouse:warehouseOptions[0]?.name || "Main Warehouse" }]);
  const removeItem = i  => setItems(p => p.filter((_,idx) => idx !== i));

  // Per-item totals with editable GST
  const calcItem = it => {
    const qty = +it.qty || 0;
    const actual = qty * (+it.rate || 0);
    const billingRate = it.billingRate === "" || it.billingRate === undefined ? (+it.rate || 0) : (+it.billingRate || 0);
    const billing = qty * billingRate;
    const billingGst = (billing * (+it.gstRate || 0)) / 100;
    const transport = +it.transportAmount || 0;
    const transportGst = (transport * (+it.transportGstRate || 0)) / 100;
    return { actual, billing, transport, gst: billingGst + transportGst, billingGst, transportGst, total: actual + transport + billingGst + transportGst };
  };

  const totals = items.reduce((s, it) => {
    const c = calcItem(it);
    return { sub: s.sub + c.actual, billing: s.billing + c.billing, transport: s.transport + c.transport, gst: s.gst + c.gst };
  }, { sub:0, billing:0, transport:0, gst:0 });
  const grand = totals.sub + totals.transport + totals.gst;
  const totalPaid = payments.reduce((sum, payment) => (
    payment.paymentMode === "Credit" ? sum : sum + (+payment.amount || 0)
  ), 0);
  const cleanPayments = payments
    .filter(payment => (+payment.amount || 0) > 0 && payment.paymentMode !== "Credit")
    .map(payment => ({
      paymentMode: payment.paymentMode,
      amount: +payment.amount || 0,
      date: payment.date || form.date,
      notes: payment.notes || "",
    }));

  const handleSave = async () => {
    if (!form.vendor) return alert("Please select a vendor.");
    const validItems = items.filter(it => +it.qty > 0 && +it.rate > 0 && it.product);
    if (!validItems.length) return alert("Add at least one item with a product, qty and rate.");
    setSaving(true);
    try {
      await salesAPI.createPurchase({
        ...form,
        amountPaid: totalPaid,
        paymentMode: cleanPayments.length > 1 ? "Multiple" : (cleanPayments[0]?.paymentMode || "Credit"),
        payments: cleanPayments,
        items: validItems.map(it => ({
          product:  it.product,
          qty:      +it.qty,
          rate:     +it.rate,
          billingRate: it.billingRate === "" ? undefined : +it.billingRate,
          warehouse: it.warehouse || "Main Warehouse",
          gstRate:  +it.gstRate || 0,
          transportAmount: +it.transportAmount || 0,
          transportGstRate: +it.transportGstRate || 0,
        })),
      });
      setToast("Purchase recorded successfully!");
      setTimeout(() => navigate("purchases-list"), 1500);
    } catch (e) { alert(e.message); setSaving(false); }
  };

  return (
    <div style={{ maxWidth:1180, margin:"auto" }}>
      <PageTitle>Create Purchase</PageTitle>
      {toast && <SuccessToast msg={toast} />}
      <div style={{ background:"#fff", borderRadius:10, padding:28, border:"1px solid #e2e8f0" }}>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
          <FormGroup label="Vendor *">
            <FormSelect value={form.vendor} onChange={set("vendor")}>
              <option value="">Select vendor</option>
              {vendors.map(v => <option key={v._id} value={v._id}>{v.name} – {v.company}</option>)}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Vendor Invoice No.">
            <FormInput placeholder="INV-2345" value={form.invoiceNo} onChange={set("invoiceNo")} />
          </FormGroup>
          <FormGroup label="Date">
            <FormInput type="date" value={form.date} onChange={set("date")} />
          </FormGroup>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#1e293b" }}>Payment Entries</div>
            <Btn sm color="blue" onClick={addPaymentRow}>+ Add Payment</Btn>
          </div>
          <div style={{ border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            {payments.map((payment, i) => (
              <div key={i} style={{
                display:"grid",
                gridTemplateColumns:"150px 1fr 150px 1.4fr 36px",
                gap:8,
                padding:10,
                borderTop:i ? "1px solid #f1f5f9" : "none",
                alignItems:"center",
              }}>
                <FormSelect value={payment.paymentMode} onChange={e => setPayment(i, "paymentMode", e.target.value)}>
                  {["Credit","Cash","UPI","Bank Transfer","Cheque"].map(m => <option key={m}>{m}</option>)}
                </FormSelect>
                <FormInput type="number" placeholder="Amount" value={payment.amount}
                  disabled={payment.paymentMode === "Credit"}
                  onChange={e => setPayment(i, "amount", e.target.value)} />
                <FormInput type="date" value={payment.date} onChange={e => setPayment(i, "date", e.target.value)} />
                <FormInput placeholder="Payment notes / ref no." value={payment.notes}
                  onChange={e => setPayment(i, "notes", e.target.value)} />
                <button type="button" onClick={() => removePaymentRow(i)}
                  style={{ border:"none", borderRadius:6, background:"#fee2e2", color:"#991b1b", height:34, cursor:"pointer", fontWeight:800 }}>
                  x
                </button>
              </div>
            ))}
          </div>
          <div style={{ color:"#64748b", fontSize:11, marginTop:6 }}>
            Add Cash/UPI/Bank/Cheque rows for each payment. Credit rows are treated as unpaid balance.
          </div>
        </div>
        {/* Items table */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>📦 Purchased Items</div>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflowX:"auto", overflowY:"hidden" }}>
            {/* Table header */}
            <div style={{ display:"grid",
              gridTemplateColumns:"minmax(240px,2fr) 64px 100px 140px 70px 90px 105px 78px 95px 88px 100px 40px",
              minWidth:1320, gap:0, background:"#f8fafc", padding:"8px 10px",
              fontSize:11, fontWeight:700, color:"#374155" }}>
              {["Product","+ New","Model No.","Warehouse","Qty","Rate","Billing Rate","GST %","Transport","Trans GST","Total",""].map(h => (
                <div key={h} style={{ padding:"0 4px" }}>{h}</div>
              ))}
            </div>

            {items.map((it, i) => {
              const c    = calcItem(it);
              const prod = products.find(p => p._id === it.product);
              const isNewForm = newProductRow === i;

              return (
                <div key={i} style={{ borderTop:"1px solid #f1f5f9" }}>
                  {/* Row */}
                  <div style={{ display:"grid",
                    gridTemplateColumns:"minmax(240px,2fr) 64px 100px 140px 70px 90px 105px 78px 95px 88px 100px 40px",
                    minWidth:1320, gap:0, padding:"8px 10px", alignItems:"center" }}>

                    {/* Product select */}
                    <div style={{ padding:"0 4px" }}>
                      <select value={it.product}
                        onChange={e => setItem(i, "product", e.target.value)}
                        style={{ width:"100%", padding:"7px 8px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                        <option value="">— Select product —</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>
                            {p.name} | {p.modelNumber} | Stock: {p.stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* New product */}
                    <div style={{ padding:"0 4px" }}>
                      <button
                        title="Add a new product not in the list"
                        onClick={() => setNewProductRow(isNewForm ? null : i)}
                        style={{
                          width:"100%", padding:"7px 6px", borderRadius:6,
                          border:`1px solid ${isNewForm ? "#ef4444" : "#3b82f6"}`,
                          background: isNewForm ? "#fee2e2" : "#eff6ff",
                          color: isNewForm ? "#991b1b" : "#1e40af",
                          cursor:"pointer", fontSize:11, fontWeight:700,
                          whiteSpace:"nowrap",
                        }}>
                        {isNewForm ? "✕" : "+ New"}
                      </button>
                    </div>

                    {/* Model No */}
                    <div style={{ padding:"0 4px", fontFamily:"monospace",
                      color:"#0ea5e9", fontSize:11 }}>
                      {prod?.modelNumber || "—"}
                    </div>

                    {/* Warehouse */}
                    <div style={{ padding:"0 4px" }}>
                      {warehouseOptions.length ? (
                        <select value={it.warehouse || ""}
                          onChange={e => setItem(i, "warehouse", e.target.value)}
                          style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                            borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                          {it.warehouse && !warehouseOptions.some(w => w.name === it.warehouse) && (
                            <option value={it.warehouse}>{it.warehouse}</option>
                          )}
                          {warehouseOptions.map(w => <option key={w._id} value={w.name}>{w.name}</option>)}
                        </select>
                      ) : (
                        <input value={it.warehouse || ""}
                          onChange={e => setItem(i, "warehouse", e.target.value)}
                          placeholder="Main Warehouse"
                          style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                            borderRadius:6, fontSize:12 }} />
                      )}
                    </div>

                    {/* Qty */}
                    <div style={{ padding:"0 4px" }}>
                      <input type="number" min="1" value={it.qty}
                        onChange={e => setItem(i, "qty", e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12, textAlign:"center" }} />
                    </div>

                    {/* Rate */}
                    <div style={{ padding:"0 4px" }}>
                      <input type="number" value={it.rate}
                        onChange={e => setItem(i, "rate", e.target.value)}
                        placeholder="₹"
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12 }} />
                    </div>

                    {/* Billing Rate */}
                    <div style={{ padding:"0 4px" }}>
                      <input type="number" value={it.billingRate}
                        onChange={e => setItem(i, "billingRate", e.target.value)}
                        placeholder="Taxable"
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12 }} />
                    </div>

                    {/* GST % */}
                    <div style={{ padding:"0 4px" }}>
                      <select value={it.gstRate}
                        onChange={e => setItem(i, "gstRate", e.target.value)}
                        style={{ width:"100%", padding:"7px 4px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                        {["0","5","9","12","18","28"].map(r => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </div>

                    {/* Transport */}
                    <div style={{ padding:"0 4px" }}>
                      <input type="number" value={it.transportAmount}
                        onChange={e => setItem(i, "transportAmount", e.target.value)}
                        placeholder="0"
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12 }} />
                    </div>

                    {/* Transport GST */}
                    <div style={{ padding:"0 4px" }}>
                      <select value={it.transportGstRate}
                        onChange={e => setItem(i, "transportGstRate", e.target.value)}
                        style={{ width:"100%", padding:"7px 4px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                        {["0","5","12","18","28"].map(r => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </div>

                    {/* Total */}
                    <div style={{ padding:"0 4px", fontWeight:700, fontSize:12 }}>
                      ₹{c.total.toFixed(2)}
                    </div>

                    {/* Remove */}
                    <div style={{ padding:"0 4px" }}>
                      <button onClick={() => removeItem(i)}
                        style={{ background:"#fee2e2", color:"#991b1b", border:"none",
                          borderRadius:4, padding:"5px 8px", cursor:"pointer",
                          fontSize:11, width:"100%" }}>✕</button>
                    </div>
                  </div>

                  {/* Inline QuickAddProduct form for this row */}
                  {isNewForm && (
                    <div style={{ padding:"0 14px 14px" }}>
                      <QuickAddProduct
                        mode="purchase"
                        vendorId={form.vendor || undefined}
                        defaultRate={it.rate}
                        onSaved={newProd => handleNewProductSaved(i, newProd)}
                        onCancel={() => setNewProductRow(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ padding:"10px 14px", borderTop:"1px solid #f1f5f9" }}>
              <Btn color="blue" sm onClick={addItem}>+ Add Item</Btn>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <FormGroup label="Notes">
            <FormInput placeholder="Any notes..." value={form.notes} onChange={set("notes")} />
          </FormGroup>
          <div style={{ background:"#f8fafc", borderRadius:8, padding:16, fontSize:13 }}>
            <div style={{ fontWeight:700, marginBottom:10 }}>Purchase Summary</div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
              <span>Subtotal</span><span>₹{totals.sub.toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#64748b" }}>
              <span>Transport</span><span>₹{totals.transport.toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#f59e0b" }}>
              <span>Total GST</span><span>₹{totals.gst.toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0",
              borderTop:"2px solid #e2e8f0", fontWeight:800, fontSize:15 }}>
              <span>Grand Total</span><span>₹{grand.toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#16a34a" }}>
              <span>Amount Paid</span><span>₹{totalPaid.toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0",
              color:(grand-totalPaid)>0?"#ef4444":"#94a3b8", fontWeight:700 }}>
              <span>Outstanding</span>
              <span>₹{Math.max(0, grand-totalPaid).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <Btn color="cancel" onClick={() => navigate("purchases-list")}>Cancel</Btn>
          <Btn color="teal" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "🛒 Record Purchase"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
