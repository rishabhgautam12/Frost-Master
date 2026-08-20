import { useState, useEffect } from "react";
import {
  PageTitle, Btn, FormGroup, FormInput, FormSelect,
  SuccessToast, Modal,
} from "../components/Shared";
import { salesAPI, customerAPI, productAPI } from "../services/api";
import QuickAddProduct from "../components/QuickAddProduct";

const normalizePhone = value => value.replace(/\D/g, "").slice(0, 10);
const isValidPhone = value => /^\d{10}$/.test(value);
const SALE_ITEM_GRID = "minmax(320px, 2fr) 90px 64px 90px 80px 80px 100px 40px";
const SALE_ITEM_MIN_WIDTH = 864;

/* ── inline quick-add customer ── */
function QuickAddCustomer({ onSaved, onCancel }) {
  const [form, setForm] = useState({
    name:"", phone:"", email:"", customerType:"Retail",
    city:"", address:"", gstin:"", creditLimit:"", notes:""
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setPhone = e => setForm(p => ({ ...p, phone: normalizePhone(e.target.value) }));

  const handleSave = async () => {
    if (!form.name || !form.phone) return alert("Name and phone are required.");
    if (!isValidPhone(form.phone)) return alert("Phone number must be exactly 10 digits.");
    setSaving(true);
    try {
      const res = await customerAPI.create({ ...form, creditLimit: +form.creditLimit || 0 });
      onSaved(res.data);
    } catch (e) { alert(e.message); setSaving(false); }
  };

  return (
    <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10,
      padding:18, marginBottom:16 }}>
      <div style={{ fontWeight:700, fontSize:13, color:"#166534", marginBottom:14 }}>
        ➕ Add New Customer
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
        <FormGroup label="Full Name *">
          <FormInput placeholder="e.g. Amit Sharma" value={form.name} onChange={set("name")} />
        </FormGroup>
        <FormGroup label="Phone *">
          <FormInput type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10}
            placeholder="9876543210" value={form.phone} onChange={setPhone} />
        </FormGroup>
        <FormGroup label="Email">
          <FormInput placeholder="email@example.com" value={form.email} onChange={set("email")} />
        </FormGroup>
        <FormGroup label="Customer Type">
          <FormSelect value={form.customerType} onChange={set("customerType")}>
            {["Retail","Wholesale","VIP","Dealer","Online"].map(t => <option key={t}>{t}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="City">
          <FormInput placeholder="Delhi" value={form.city} onChange={set("city")} />
        </FormGroup>
        <FormGroup label="GSTIN (optional)">
          <FormInput placeholder="27AAAAA0000A1Z5" value={form.gstin} onChange={set("gstin")} />
        </FormGroup>
        <FormGroup label="Credit Limit (₹)">
          <FormInput type="number" placeholder="0" value={form.creditLimit} onChange={set("creditLimit")} />
        </FormGroup>
        <FormGroup label="Address">
  <FormInput placeholder="Full address" value={form.address} onChange={set("address")} />
</FormGroup>
        <FormGroup label="Notes">
          <FormInput placeholder="Any notes..." value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <Btn color="cancel" onClick={onCancel}>Cancel</Btn>
        <Btn color="green" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "💾 Save & Select Customer"}
        </Btn>
      </div>
    </div>
  );
}

/* ── main page ── */
export default function CreateSale({ navigate }) {
  const [customers,   setCustomers]   = useState([]);
  const [products,    setProducts]    = useState([]);
  const [showAddCust, setShowAddCust] = useState(false);
  const [newProductRow, setNewProductRow] = useState(null); // row index showing new-product form
  const [form, setForm] = useState({
    customer:"", customerName:"", saleType:"GST Invoice", paymentMode:"Cash",
    date:new Date().toISOString().split("T")[0], isInterState:false,
    amountPaid:"", notes:""
  });
  const [items, setItems] = useState([
    { product:"", qty:1, rate:"", discount:0, gstRate:18 }
  ]);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const loadProducts = () => {
    productAPI.getAll().then(r => setProducts(r.data)).catch(() => {});
  };

  useEffect(() => {
    Promise.all([customerAPI.getAll(), productAPI.getAll()])
      .then(([c, p]) => { setCustomers(c.data); setProducts(p.data); })
      .catch(() => {});
  }, []);

  const set = k => e => setForm(p => ({
    ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value
  }));

  const handleCustomerSaved = newCustomer => {
    setCustomers(prev => [newCustomer, ...prev]);
    setForm(p => ({ ...p, customer: newCustomer._id, customerName:"" }));
    setShowAddCust(false);
    setToast(`Customer "${newCustomer.name}" added and selected.`);
  };

  // Called when a new product is created inline during a sale row
  const handleNewProductSaved = (rowIndex, newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
    setItems(prev => prev.map((it, idx) => {
      if (idx !== rowIndex) return it;
      return {
        ...it,
        product: newProduct._id,
        rate:    newProduct.sellingPrice,
        gstRate: newProduct.gstRate || 18,
      };
    }));
    setNewProductRow(null);
    setToast(`Product "${newProduct.name}" created and selected.`);
  };

  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => {
    if (idx !== i) return it;
    const u = { ...it, [k]: v };
    if (k === "product" && v) {
      const prod = products.find(p => p._id === v);
      if (prod) { u.rate = prod.sellingPrice; u.gstRate = prod.gstRate || 18; }
    }
    return u;
  }));

  const addItem    = () => setItems(p => [...p, { product:"", qty:1, rate:"", discount:0, gstRate:18 }]);
  const removeItem = i  => setItems(p => p.filter((_,idx) => idx !== i));

  const calcItem = it => {
    const gross = (+it.rate || 0) * (+it.qty || 0);
    const discountPercent = Math.min(100, Math.max(0, +it.discount || 0));
    const discountAmount = (gross * discountPercent) / 100;
    const taxable = gross - discountAmount;
    const gst = (taxable * (+it.gstRate || 0)) / 100;
    return { gross, discountAmount, taxable, gst, total: taxable + gst };
  };

  const totals = items.reduce((s, it) => {
    const c = calcItem(it);
    return {
      subtotal: s.subtotal + c.gross,
      discount: s.discount + c.discountAmount,
      gst: s.gst + c.gst,
      total: s.total + c.total,
    };
  }, { subtotal:0, discount:0, gst:0, total:0 });

  const cgst = form.isInterState ? 0 : totals.gst / 2;
  const sgst = form.isInterState ? 0 : totals.gst / 2;
  const igst = form.isInterState ? totals.gst : 0;
  const due  = Math.max(0, totals.total - (+form.amountPaid || 0));

  const handleSave = async () => {
    const validItems = items.filter(it => it.product && +it.qty > 0 && +it.rate > 0);
    if (!validItems.length) return alert("Add at least one valid item.");
    if (!form.customer && !form.customerName && form.saleType !== "Cash Sale")
      return alert("Select a customer or enter a name for a cash sale.");
    setSaving(true);
    try {
      await salesAPI.create({
        ...form,
        customer:    form.customer || undefined,
        isInterState:!!form.isInterState,
        amountPaid:  +form.amountPaid || 0,
        items: validItems.map(it => ({
          product:  it.product,
          qty:      +it.qty,
          rate:     +it.rate,
          discount: +it.discount || 0,
          gstRate:  +it.gstRate || 0,
        })),
      });
      setToast("Sale created successfully!");
      setTimeout(() => navigate("sales-list"), 1500);
    } catch (e) { alert(e.message); setSaving(false); }
  };

  const selectedCustomer = customers.find(c => c._id === form.customer);

  return (
    <div style={{ maxWidth:960, margin:"auto" }}>
      <PageTitle>Create Sale / Invoice</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ background:"#fff", borderRadius:10, padding:28, border:"1px solid #e2e8f0" }}>

        {/* Sale type / payment / date */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
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

        {/* Customer section */}
        {!showAddCust ? (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FormGroup label="Customer (registered)">
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <FormSelect style={{ flex:1 }} value={form.customer}
                    onChange={e => setForm(p => ({ ...p, customer:e.target.value, customerName:"" }))}>
                    <option value="">Select customer</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} – {c.phone}</option>
                    ))}
                  </FormSelect>
                  <Btn sm color="green" onClick={() => {
                    setShowAddCust(true);
                    setForm(p => ({ ...p, customer:"", customerName:"" }));
                  }}>+ New</Btn>
                </div>
                {selectedCustomer && (
                  <div style={{ marginTop:6, fontSize:11, color:"#64748b",
                    background:"#f0fdf4", padding:"6px 10px", borderRadius:6,
                    border:"1px solid #86efac" }}>
                    ✅ {selectedCustomer.name} · {selectedCustomer.phone}
                    {selectedCustomer.email && ` · ${selectedCustomer.email}`}
                    {selectedCustomer.city  && ` · ${selectedCustomer.city}`}
                    &nbsp;·&nbsp;<strong>{selectedCustomer.customerType}</strong>
                  </div>
                )}
              </FormGroup>
              <FormGroup label="Walk-in / Cash Customer Name">
                <FormInput placeholder="Enter name if not registered"
                  value={form.customerName} onChange={set("customerName")}
                  disabled={!!form.customer} />
              </FormGroup>
            </div>
          </div>
        ) : (
          <QuickAddCustomer
            onSaved={handleCustomerSaved}
            onCancel={() => setShowAddCust(false)}
          />
        )}

        {/* Inter-state */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8,
            fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <input type="checkbox" checked={form.isInterState} onChange={set("isInterState")} />
            Inter-state sale (IGST instead of CGST + SGST)
          </label>
        </div>

        {/* Items */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:"#1e293b" }}>
            📦 Sale Items
          </div>

          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflowX:"auto" }}>
            {/* Table header */}
            <div style={{ display:"grid",
              gridTemplateColumns:SALE_ITEM_GRID, minWidth:SALE_ITEM_MIN_WIDTH,
              gap:0, background:"#f8fafc", padding:"8px 10px",
              fontSize:11, fontWeight:700, color:"#374155" }}>
              {["Product","Model No.","Qty","Rate (₹)","Disc. (%)","GST %","Total (₹)",""].map(h => (
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
                    gridTemplateColumns:SALE_ITEM_GRID, minWidth:SALE_ITEM_MIN_WIDTH,
                    gap:0, padding:"8px 10px", alignItems:"start" }}>

                    {/* Product select + New button */}
                    <div style={{ padding:"0 4px", minWidth:0 }}>
                      <div style={{ display:"flex", gap:5, minWidth:0 }}>
                        <select value={it.product}
                          onChange={e => setItem(i, "product", e.target.value)}
                          style={{ flex:1, width:0, minWidth:0, padding:"7px 8px", border:"1px solid #d1d5db",
                            borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                          <option value="">Select product</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.name} | {p.modelNumber} | Stk:{p.stock}
                            </option>
                          ))}
                        </select>
                        <button
                          title="Add a new product not in the list"
                          onClick={() => setNewProductRow(isNewForm ? null : i)}
                          style={{
                            padding:"6px 8px", borderRadius:6,
                            border:`1px solid ${isNewForm ? "#ef4444" : "#10b981"}`,
                            background: isNewForm ? "#fee2e2" : "#f0fdf4",
                            color: isNewForm ? "#991b1b" : "#166534",
                            cursor:"pointer", fontSize:11, fontWeight:700,
                            whiteSpace:"nowrap", flexShrink:0,
                          }}>
                          {isNewForm ? "✕" : "+ New"}
                        </button>
                      </div>
                    </div>

                    {/* Model No */}
                    <div style={{ padding:"0 4px", fontFamily:"monospace",
                      color:"#0ea5e9", fontSize:11 }}>
                      {prod?.modelNumber || "—"}
                    </div>

                    {/* Qty */}
                    <div style={{ padding:"0 4px" }}>
                      <input type="number" min="1" value={it.qty}
                        onChange={e => setItem(i, "qty", e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12, textAlign:"center", boxSizing:"border-box" }} />
                    </div>

                    {/* Rate */}
                    <div style={{ padding:"0 4px" }}>
                      <input type="number" value={it.rate}
                        onChange={e => setItem(i, "rate", e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12, boxSizing:"border-box" }} />
                    </div>

                    {/* Discount */}
                    <div style={{ padding:"0 4px" }}>
                      <input type="number" min="0" max="100" step="0.01" value={it.discount}
                        onChange={e => setItem(i, "discount", e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12, boxSizing:"border-box" }} />
                      {c.discountAmount > 0 && (
                        <div style={{ fontSize:9, color:"#f59e0b", marginTop:3 }}>
                          -₹{c.discountAmount.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* GST */}
                    <div style={{ padding:"0 4px" }}>
                      <select value={it.gstRate}
                        onChange={e => setItem(i, "gstRate", e.target.value)}
                        style={{ width:"100%", padding:"7px 4px", border:"1px solid #d1d5db",
                          borderRadius:6, fontSize:12, background:"#f9fafb", boxSizing:"border-box" }}>
                        {["0","5","9","12","18","28"].map(r => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </div>

                    {/* Total */}
                    <div style={{ padding:"0 4px", fontWeight:700, color:"#16a34a",
                      fontSize:12 }}>
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

                  {/* Inline new product form for this row */}
                  {isNewForm && (
                    <div style={{ padding:"0 14px 14px" }}>
                      <QuickAddProduct
                        mode="sale"
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

        {/* Summary + Notes */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div>
            <FormGroup label="Notes">
              <FormInput placeholder="Any notes for this sale..."
                value={form.notes} onChange={set("notes")} />
            </FormGroup>
            <FormGroup label="Amount Paid (₹)">
              <FormInput type="number" placeholder="0 for credit"
                value={form.amountPaid} onChange={set("amountPaid")} />
            </FormGroup>
          </div>
          <div style={{ background:"#f8fafc", borderRadius:8, padding:16, fontSize:13 }}>
            <div style={{ fontWeight:700, marginBottom:10 }}>Invoice Summary</div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
              <span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#f59e0b" }}>
              <span>{form.paymentMode === "Cash" ? "Cash Amount" : "Discount"}</span>
              <span>{form.paymentMode === "Cash" ? `₹${(+form.amountPaid || 0).toFixed(2)}` : `-₹${totals.discount.toFixed(2)}`}</span>
            </div>
            {form.isInterState ? (
              <div style={{ display:"flex", justifyContent:"space-between",
                padding:"4px 0", color:"#f59e0b" }}>
                <span>IGST</span><span>₹{igst.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between",
                  padding:"4px 0", color:"#8b5cf6" }}>
                  <span>CGST</span><span>₹{cgst.toFixed(2)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between",
                  padding:"4px 0", color:"#ec4899" }}>
                  <span>SGST</span><span>₹{sgst.toFixed(2)}</span>
                </div>
              </>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0",
              borderTop:"2px solid #e2e8f0", fontWeight:800, fontSize:15, color:"#1e293b" }}>
              <span>Grand Total</span><span>₹{totals.total.toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
              padding:"4px 0", color:"#16a34a" }}>
              <span>Amount Paid</span><span>₹{(+form.amountPaid||0).toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0",
              color:due>0?"#ef4444":"#94a3b8", fontWeight:700 }}>
              <span>Amount Due</span><span>₹{due.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <Btn color="cancel" onClick={() => navigate("sales-list")}>Cancel</Btn>
          <Btn color="teal" onClick={handleSave} disabled={saving}>
            {saving ? "Creating..." : "🧾 Create Sale"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
