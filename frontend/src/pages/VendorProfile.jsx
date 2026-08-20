/**
 * VendorProfile — Full dedicated page
 *
 * Flow:
 *  - Vendor ki saari info (name, company, phone, etc.)
 *  - Summary cards: total purchase, paid, baaki (payable), returns
 *  - 4 tabs:
 *      1. Purchases  — all purchases from this vendor with item details
 *      2. Products   — all products linked to this vendor
 *      3. Ledger     — payment history (Purchase / Payment / Debit Note)
 *      4. Add Purchase — record a new purchase directly from this page
 */

import { useState, useEffect } from "react";
import {
  Btn, Badge, LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
  FormGroup, FormInput, FormSelect, Modal,
} from "../components/Shared";
import { vendorAPI, productAPI, salesAPI, employeeAPI } from "../services/api";
import QuickAddProduct from "../components/QuickAddProduct";

/* ─── small helpers ─── */
const Stat = ({ label, value, color }) => (
  <div style={{ background:"#fff", borderRadius:8, padding:"14px 16px",
    borderLeft:`4px solid ${color}`, border:"1px solid #e2e8f0", minWidth:130, flex:1 }}>
    <div style={{ fontSize:20, fontWeight:800, color:"#1e293b" }}>{value}</div>
    <div style={{ fontSize:10, color:"#64748b", marginTop:3 }}>{label}</div>
  </div>
);

const TH = ({ children }) => (
  <th style={{ padding:"9px 11px", background:"#14b8a6", textAlign:"left",
    color:"#ecfeff", fontWeight:700, fontSize:11, whiteSpace:"nowrap" }}>{children}</th>
);
const TD = ({ children, style={} }) => (
  <td style={{ padding:"9px 11px", fontSize:12, color:"#334155", ...style }}>{children}</td>
);

/* ────────────────────────────────────────────────
   TAB 1 — Purchases list
──────────────────────────────────────────────── */
function PurchasesTab({ vendorId, onRefresh }) {
  const [purchases, setPurchases] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(null);
  const [editModal, setEditModal] = useState(null); // purchase being edited
  const [editForm,  setEditForm]  = useState({ invoiceNo:"", date:"", paymentMode:"", amountPaid:"", notes:"" });
  const [editItems, setEditItems] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  const load = () => {
    salesAPI.getPurchases()
      .then(r => {
        const mine = r.data.filter(p => (p.vendor?._id || p.vendor) === vendorId);
        setPurchases(mine);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    employeeAPI.getWarehouses().then(r => setWarehouseOptions(r.data || [])).catch(() => {});
  }, [vendorId]);

  const openEdit = (p) => {
    setEditForm({
      invoiceNo:   p.invoiceNo || "",
      date:        new Date(p.date).toISOString().split("T")[0],
      paymentMode: p.paymentMode || "Credit",
      amountPaid:  String(p.amountPaid || 0),
      notes:       p.notes || "",
    });
    setEditItems((p.items || []).map(it => ({
      product: it.product?._id || it.product || "",
      productName: it.productName || it.product?.name || "",
      modelNumber: it.product?.modelNumber || "",
      qty: it.qty || 1,
      rate: it.rate ?? 0,
      warehouse: it.warehouse || "Main Warehouse",
      gstRate: it.gstRate ?? 18,
    })));
    setEditModal(p);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      // Update purchase details
      await salesAPI.updatePurchase(editModal._id, {
        invoiceNo:   editForm.invoiceNo,
        date:        editForm.date,
        paymentMode: editForm.paymentMode,
        amountPaid:  +editForm.amountPaid || 0,
        notes:       editForm.notes,
        items: editItems.map(it => ({
          product: it.product || undefined,
          productName: it.productName,
          qty: +it.qty,
          rate: +it.rate,
          warehouse: it.warehouse || "Main Warehouse",
          gstRate: +it.gstRate || 0,
        })),
      });
      setToast("Purchase updated successfully!");
      setEditModal(null);
      load();
      onRefresh();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;
  if (purchases.length === 0) return (
    <EmptyState icon="🛒" text="No purchases yet. Use the 'Add Purchase' tab to record one." />
  );

  const totalAmt  = purchases.reduce((s,p) => s + p.grandTotal, 0);
  const totalPaid = purchases.reduce((s,p) => s + (p.amountPaid||0), 0);

  return (
    <div>
      {toast && <SuccessToast msg={toast} />}
      {/* summary row */}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <Stat label="Total Purchases"  value={purchases.length}                              color="#3b82f6" />
        <Stat label="Total Amount"     value={`₹${totalAmt.toLocaleString()}`}               color="#8b5cf6" />
        <Stat label="Amount Paid"      value={`₹${totalPaid.toLocaleString()}`}              color="#16a34a" />
        <Stat label="Outstanding"      value={`₹${(totalAmt-totalPaid).toLocaleString()}`}   color="#ef4444" />
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr>
            {["","Purchase No.","Date","Invoice","Items","Total ₹","Paid ₹","Due ₹","Mode","Status",""]
              .map(h => <TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {purchases.map(p => {
              const due = p.grandTotal - (p.amountPaid||0);
              return (
                <>
                  <tr key={p._id}
                    style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f0fdfa"}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    <TD>
                      <button onClick={() => setExpanded(expanded===p._id ? null : p._id)}
                        style={{ background:"none", border:"none", cursor:"pointer", fontSize:14 }}>
                        {expanded===p._id ? "▾" : "▸"}
                      </button>
                    </TD>
                    <TD style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>{p.purchaseNo}</TD>
                    <TD>{new Date(p.date).toLocaleDateString("en-IN")}</TD>
                    <TD style={{ fontFamily:"monospace", fontSize:11 }}>{p.invoiceNo||"—"}</TD>
                    <TD>{p.items?.length||0}</TD>
                    <TD style={{ fontWeight:700 }}>₹{p.grandTotal.toLocaleString()}</TD>
                    <TD style={{ color:"#16a34a", fontWeight:700 }}>₹{(p.amountPaid||0).toLocaleString()}</TD>
                    <TD style={{ color: due>0?"#ef4444":"#94a3b8", fontWeight:700 }}>
                      {due>0 ? `₹${due.toLocaleString()}` : "—"}
                    </TD>
                    <TD>{p.paymentMode}</TD>
                    <TD><Badge color={due===0?"green":due<p.grandTotal?"yellow":"red"}>
                      {due===0?"Paid":due<p.grandTotal?"Partial":"Pending"}
                    </Badge></TD>
                    <TD>
                      <Btn sm color="blue" onClick={() => openEdit(p)}>✏️ Edit</Btn>
                    </TD>
                  </tr>

                  {/* Expanded items */}
                  {expanded===p._id && (
                    <tr style={{ background:"#f8fafc" }}>
                      <td colSpan={11} style={{ padding:"12px 20px" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8 }}>
                          📦 PURCHASE ITEMS
                        </div>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                          <thead><tr>
                            {["Product","Model No.","Qty","Rate (₹)","Total (₹)","GST (₹)"]
                              .map(h=><th key={h} style={{ padding:"6px 10px", background:"#e2e8f0", textAlign:"left", fontWeight:700 }}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {(p.items||[]).map((it,i)=>(
                              <tr key={i} style={{ borderBottom:"1px solid #e2e8f0" }}>
                                <td style={{ padding:"6px 10px", fontWeight:700 }}>{it.productName||"—"}</td>
                                <td style={{ padding:"6px 10px", fontFamily:"monospace", color:"#0ea5e9" }}>
                                  {it.product?.modelNumber||"—"}
                                </td>
                                <td style={{ padding:"6px 10px" }}>{it.qty}</td>
                                <td style={{ padding:"6px 10px" }}>₹{it.rate?.toLocaleString()}</td>
                                <td style={{ padding:"6px 10px", fontWeight:700 }}>₹{it.total?.toLocaleString()}</td>
                                <td style={{ padding:"6px 10px", color:"#f59e0b" }}>₹{it.gstAmount?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {p.notes && (
                          <div style={{ marginTop:8, fontSize:11, color:"#64748b" }}>
                            📝 Notes: {p.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:"#eef6f5", fontWeight:800 }}>
              <td colSpan={5} style={{ padding:"10px 11px", fontSize:12 }}>
                TOTAL ({purchases.length} purchases)
              </td>
              <td style={{ padding:"10px 11px" }}>₹{totalAmt.toLocaleString()}</td>
              <td style={{ padding:"10px 11px", color:"#16a34a" }}>₹{totalPaid.toLocaleString()}</td>
              <td style={{ padding:"10px 11px", color:"#ef4444" }}>₹{(totalAmt-totalPaid).toLocaleString()}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Edit Purchase Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} wide
        title={`Edit Purchase — ${editModal?.purchaseNo}`}>
        {editModal && (() => {
          const setF = k => e => setEditForm(p => ({ ...p, [k]: e.target.value }));
          const setItem = (idx, key, value) => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it));
          const itemTotals = editItems.reduce((sum, it) => {
            const total = (+it.qty || 0) * (+it.rate || 0);
            return {
              subtotal: sum.subtotal + total,
              gst: sum.gst + ((total * (+it.gstRate || 0)) / 100),
            };
          }, { subtotal: 0, gst: 0 });
          const grandTotal  = itemTotals.subtotal + itemTotals.gst;
          const newPaid     = Math.min(grandTotal, Math.max(0, +editForm.amountPaid || 0));
          const newDue      = grandTotal - newPaid;
          return (
            <div>
              {/* Purchase summary strip */}
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8,
                padding:"12px 16px", marginBottom:16, display:"grid",
                gridTemplateColumns:"repeat(3,1fr)", gap:10, fontSize:12 }}>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Grand Total</div>
                  <div style={{ fontWeight:800, fontSize:15 }}>₹{grandTotal.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>New Amount Paid</div>
                  <div style={{ fontWeight:700, color:"#16a34a", fontSize:15 }}>₹{newPaid.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>New Balance</div>
                  <div style={{ fontWeight:800, color: newDue>0?"#ef4444":"#16a34a", fontSize:15 }}>
                    {newDue>0 ? `₹${newDue.toLocaleString()}` : "✅ Fully Paid"}
                  </div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <FormGroup label="Vendor Invoice No.">
                  <FormInput placeholder="INV-2345" value={editForm.invoiceNo} onChange={setF("invoiceNo")} />
                </FormGroup>
                <FormGroup label="Purchase Date">
                  <FormInput type="date" value={editForm.date} onChange={setF("date")} />
                </FormGroup>
                <FormGroup label="Payment Mode">
                  <FormSelect value={editForm.paymentMode} onChange={setF("paymentMode")}>
                    {["Cash","UPI","Bank Transfer","Cheque","Credit"].map(m=><option key={m}>{m}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Amount Paid (₹)">
                  <FormInput type="number" placeholder="0"
                    value={editForm.amountPaid} onChange={setF("amountPaid")} />
                  {+editForm.amountPaid > grandTotal && (
                    <div style={{ color:"#ef4444", fontSize:10, marginTop:3 }}>
                      ⚠️ Cannot exceed grand total ₹{grandTotal.toLocaleString()}
                    </div>
                  )}
                </FormGroup>
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontWeight:800, fontSize:13, marginBottom:8, color:"#1e293b" }}>Purchase Items</div>
                <div style={{ border:"1px solid #e2e8f0", borderRadius:8, overflowX:"auto" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"minmax(210px,2fr) 95px 130px 70px 95px 82px 92px", minWidth:820, background:"#f8fafc", padding:"8px 10px", fontSize:11, fontWeight:800, color:"#1e293b" }}>
                    {["Product","Model No.","Warehouse","Qty","Rate","GST %","Total"].map(h => <div key={h} style={{ padding:"0 4px" }}>{h}</div>)}
                  </div>
                  {editItems.map((it, idx) => {
                    const rowTotal = (+it.qty || 0) * (+it.rate || 0);
                    const rowGst = (rowTotal * (+it.gstRate || 0)) / 100;
                    return (
                      <div key={idx} style={{ display:"grid", gridTemplateColumns:"minmax(210px,2fr) 95px 130px 70px 95px 82px 92px", minWidth:820, padding:"8px 10px", borderTop:"1px solid #f1f5f9", alignItems:"start" }}>
                        <div style={{ padding:"7px 4px 0", fontWeight:700 }}>{it.productName || "Item"}</div>
                        <div style={{ padding:"7px 4px 0", fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>{it.modelNumber || "-"}</div>
                        <div style={{ padding:"0 4px" }}>
                          {warehouseOptions.length ? (
                            <select value={it.warehouse} onChange={e => setItem(idx, "warehouse", e.target.value)}
                              style={{ width:"100%", padding:"7px 8px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box", background:"#f9fafb" }}>
                              {it.warehouse && !warehouseOptions.some(w => w.name === it.warehouse) && (
                                <option value={it.warehouse}>{it.warehouse}</option>
                              )}
                              {warehouseOptions.map(w => <option key={w._id} value={w.name}>{w.name}</option>)}
                            </select>
                          ) : (
                            <input value={it.warehouse} onChange={e => setItem(idx, "warehouse", e.target.value)}
                              style={{ width:"100%", padding:"7px 8px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box" }} />
                          )}
                        </div>
                        <div style={{ padding:"0 4px" }}>
                          <input type="number" min="1" value={it.qty} onChange={e => setItem(idx, "qty", e.target.value)}
                            style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box" }} />
                        </div>
                        <div style={{ padding:"0 4px" }}>
                          <input type="number" min="0" value={it.rate} onChange={e => setItem(idx, "rate", e.target.value)}
                            style={{ width:"100%", padding:"7px 6px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box" }} />
                        </div>
                        <div style={{ padding:"0 4px" }}>
                          <select value={it.gstRate} onChange={e => setItem(idx, "gstRate", e.target.value)}
                            style={{ width:"100%", padding:"7px 4px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                            {["0","5","9","12","18","28"].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </div>
                        <div style={{ padding:"7px 4px 0", fontWeight:800, color:"#16a34a", fontSize:12 }}>
                          ₹{(rowTotal + rowGst).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <FormGroup label="Notes">
                <FormInput placeholder="Any notes..." value={editForm.notes} onChange={setF("notes")} />
              </FormGroup>
              <div style={{ display:"flex", gap:10, marginTop:16 }}>
                <Btn color="cancel" onClick={() => setEditModal(null)}>Cancel</Btn>
                <Btn color="teal" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Saving..." : "💾 Save Changes"}
                </Btn>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

/* ────────────────────────────────────────────────
   TAB 2 — Products
──────────────────────────────────────────────── */
function ProductsTab({ vendorId, vendorName, onRefresh }) {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [addModal,   setAddModal]   = useState(false);
  const [editModal,  setEditModal]  = useState(null); // product being edited
  const [form,       setForm]       = useState({
    name:"", modelNumber:"", brand:"",
    purchasePrice:"", sellingPrice:"", stock:"",
    minStockAlert:"5", gstRate:"18", description:""
  });
  const [editForm,   setEditForm]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);

  const load = () => {
    productAPI.getAll({ vendor: vendorId })
      .then(r => { setProducts(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [vendorId]);

  const set     = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setEdit = k => e => setEditForm(p => ({ ...p, [k]: e.target.value }));

  const openEdit = (p) => {
    setEditForm({
      name:          p.name,
      modelNumber:   p.modelNumber,
      brand:         p.brand || "",
      purchasePrice: String(p.purchasePrice),
      sellingPrice:  String(p.sellingPrice || ""),
      stock:         String(p.stock),
      minStockAlert: String(p.minStockAlert),
      gstRate:       String(p.gstRate || 18),
      description:   p.description || "",
    });
    setEditModal(p);
  };

  const handleAdd = async () => {
    if (!form.name || !form.modelNumber || !form.purchasePrice)
      return alert("Name, model number and purchase price are required.");
    setSaving(true);
    try {
      await productAPI.create({
        name:          form.name,
        modelNumber:   form.modelNumber,
        brand:         form.brand,
        vendor:        vendorId,
        purchasePrice: +form.purchasePrice,
        sellingPrice:  +form.sellingPrice || 0,
        stock:         +form.stock || 0,
        minStockAlert: +form.minStockAlert || 5,
        gstRate:       +form.gstRate || 18,
        description:   form.description,
      });
      setToast("Product added successfully!");
      setAddModal(false);
      setForm({ name:"", modelNumber:"", brand:"", purchasePrice:"", sellingPrice:"",
                stock:"", minStockAlert:"5", gstRate:"18", description:"" });
      load();
      onRefresh();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const handleEditSave = async () => {
    if (!editForm.name || !editForm.modelNumber || !editForm.purchasePrice)
      return alert("Name, model number and purchase price are required.");
    setSaving(true);
    try {
      await productAPI.update(editModal._id, {
        name:          editForm.name,
        modelNumber:   editForm.modelNumber,
        brand:         editForm.brand,
        purchasePrice: +editForm.purchasePrice,
        sellingPrice:  +editForm.sellingPrice || 0,
        stock:         +editForm.stock || 0,
        minStockAlert: +editForm.minStockAlert || 5,
        gstRate:       +editForm.gstRate || 18,
        description:   editForm.description,
      });
      setToast("Product updated successfully!");
      setEditModal(null);
      load();
      onRefresh();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const addMargin = form.purchasePrice && form.sellingPrice
    ? (((+form.sellingPrice - +form.purchasePrice) / +form.purchasePrice) * 100).toFixed(1)
    : null;

  const editMargin = editForm.purchasePrice && editForm.sellingPrice
    ? (((+editForm.sellingPrice - +editForm.purchasePrice) / +editForm.purchasePrice) * 100).toFixed(1)
    : null;

  if (loading) return <LoadingSpinner />;

  const ProductFormFields = ({ f, setF, isEdit }) => (
    <>
      {(isEdit ? editMargin : addMargin) !== null && (
        <div style={{ background:+(isEdit?editMargin:addMargin)>=0?"#dcfce7":"#fee2e2",
          border:`1px solid ${+(isEdit?editMargin:addMargin)>=0?"#86efac":"#fca5a5"}`,
          borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12 }}>
          💡 Margin: <strong>{isEdit?editMargin:addMargin}%</strong> &nbsp;|&nbsp;
          Buy ₹{f.purchasePrice} → Sell ₹{f.sellingPrice} →
          Profit <strong>₹{(+f.sellingPrice-+f.purchasePrice).toFixed(0)}</strong>/unit
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <FormGroup label="Product Name *">
          <FormInput placeholder="e.g. Iron Tawa 30cm" value={f.name} onChange={setF("name")} />
        </FormGroup>
        <FormGroup label="Model Number *">
          <FormInput placeholder="e.g. RT-TW-030" value={f.modelNumber} onChange={setF("modelNumber")} />
        </FormGroup>
        <FormGroup label="Brand">
          <FormInput placeholder="e.g. Prestige" value={f.brand} onChange={setF("brand")} />
        </FormGroup>
        <FormGroup label="GST Rate (%)">
          <FormSelect value={f.gstRate} onChange={setF("gstRate")}>
            {["0","5","9","12","18","28"].map(r=><option key={r}>{r}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="Purchase Price (₹) *">
          <FormInput type="number" placeholder="0" value={f.purchasePrice} onChange={setF("purchasePrice")} />
        </FormGroup>
        <FormGroup label="Selling Price (₹) (optional)">
          <FormInput type="number" placeholder="0" value={f.sellingPrice} onChange={setF("sellingPrice")} />
        </FormGroup>
        <FormGroup label={isEdit ? "Current Stock" : "Initial Stock"}>
          <FormInput type="number" placeholder="0" value={f.stock} onChange={setF("stock")} />
        </FormGroup>
        <FormGroup label="Min Stock Alert">
          <FormInput type="number" placeholder="5" value={f.minStockAlert} onChange={setF("minStockAlert")} />
        </FormGroup>
      </div>
      <FormGroup label="Description">
        <FormInput placeholder="Optional..." value={f.description} onChange={setF("description")} />
      </FormGroup>
    </>
  );

  return (
    <div>
      {toast && <SuccessToast msg={toast} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:12, color:"#64748b" }}>{products.length} products from {vendorName}</span>
        <Btn color="teal" onClick={() => setAddModal(true)}>+ Add New Product</Btn>
      </div>

      {products.length === 0
        ? <EmptyState icon="📦" text="No products from this vendor yet. Click 'Add New Product' to add one." />
        : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr>
                {["Product Name","Model No.","Brand","Purchase ₹","Selling ₹","Margin","Stock","GST %","Status",""]
                  .map(h=><TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody>
                {products.map(p => {
                  const margin = p.purchasePrice && p.sellingPrice
                    ? (((p.sellingPrice-p.purchasePrice)/p.purchasePrice)*100).toFixed(1)
                    : "—";
                  const stockStatus = p.stock===0?"Out":p.stock<=p.minStockAlert?"Low":"OK";
                  return (
                    <tr key={p._id} style={{ borderBottom:"1px solid #f1f5f9" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#f0fdfa"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <TD style={{ fontWeight:700 }}>{p.name}</TD>
                      <TD style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>{p.modelNumber}</TD>
                      <TD>{p.brand||"—"}</TD>
                      <TD>₹{p.purchasePrice.toLocaleString()}</TD>
                      <TD style={{ color:"#16a34a", fontWeight:700 }}>
                        {p.sellingPrice ? `₹${p.sellingPrice.toLocaleString()}` : <span style={{ color:"#f59e0b" }}>Not set</span>}
                      </TD>
                      <TD style={{ color: margin!=="—" && +margin>=0?"#16a34a":"#ef4444", fontWeight:700 }}>
                        {margin !== "—" ? `${margin}%` : "—"}
                      </TD>
                      <TD style={{ fontWeight:800, fontSize:14,
                        color:p.stock===0?"#ef4444":p.stock<=p.minStockAlert?"#f59e0b":"#1e293b" }}>
                        {p.stock}
                      </TD>
                      <TD style={{ color:"#64748b" }}>{p.gstRate}%</TD>
                      <TD><Badge color={{ Out:"red", Low:"yellow", OK:"green" }[stockStatus]}>{stockStatus}</Badge></TD>
                      <TD>
                        <Btn sm color="blue" onClick={() => openEdit(p)}>✏️ Edit</Btn>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Add Product Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title={`Add Product — ${vendorName}`} wide>
        <ProductFormFields f={form} setF={set} isEdit={false} />
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <Btn color="cancel" onClick={() => setAddModal(false)}>Cancel</Btn>
          <Btn color="teal" onClick={handleAdd} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Product"}
          </Btn>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)}
        title={`Edit Product — ${editModal?.name}`} wide>
        {editModal && (
          <>
            <ProductFormFields f={editForm} setF={setEdit} isEdit={true} />
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <Btn color="cancel" onClick={() => setEditModal(null)}>Cancel</Btn>
              <Btn color="teal" onClick={handleEditSave} disabled={saving}>
                {saving ? "Saving..." : "💾 Update Product"}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

/* ────────────────────────────────────────────────
   TAB 3 — Ledger
──────────────────────────────────────────────── */
function LedgerTab({ vendorId, onRefresh }) {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [payModal, setPayModal] = useState(null);  // specific Purchase entry to pay
  const [payForm,  setPayForm]  = useState({
    amount:"", method:"NEFT", ref:"",
    date: new Date().toISOString().split("T")[0], notes:""
  });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const load = () => {
    vendorAPI.getLedger({ vendor: vendorId })
      .then(r => { setEntries(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [vendorId]);

  const setPay = k => e => setPayForm(p => ({ ...p, [k]: e.target.value }));

  // Open pay modal for a specific Purchase entry
  const openPay = (entry) => {
    const bal = entry.balance ?? (entry.amount - entry.paid);
    setPayModal(entry);
    setPayForm(f => ({ ...f, amount: String(bal), ref:"", notes:"" }));
  };

  const handlePay = async () => {
    if (!payForm.amount || +payForm.amount <= 0)
      return alert("Please enter a valid amount.");
    const bal = payModal.balance ?? (payModal.amount - payModal.paid);
    if (+payForm.amount > bal)
      return alert(`Amount cannot exceed the balance due of ₹${bal.toLocaleString()}.`);

    setSaving(true);
    try {
      // Calls PATCH /vendors/ledger/:id/pay
      // Updates the Purchase entry's paid field + auto-changes status
      // Also creates a Payment audit row in ledger
      const res = await vendorAPI.payLedgerEntry(payModal._id, {
        amount: +payForm.amount,
        method: payForm.method,
        ref:    payForm.ref,
        date:   payForm.date,
        notes:  payForm.notes,
      });
      setToast(res.message);
      setPayModal(null);
      setPayForm({ amount:"", method:"NEFT", ref:"", date:new Date().toISOString().split("T")[0], notes:"" });
      load();
      onRefresh();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;

  const totalPurchased = entries.filter(e=>e.type==="Purchase").reduce((s,e)=>s+e.amount,0);
  const totalPaid      = entries.filter(e=>e.type==="Payment").reduce((s,e)=>s+e.amount,0);
  const totalReturns   = entries.filter(e=>["Debit Note","Credit Note","Return"].includes(e.type)).reduce((s,e)=>s+e.amount,0);
  const amountPayable  = Math.max(0, totalPurchased - totalPaid);

  return (
    <div>
      {toast && <SuccessToast msg={toast} />}

      {/* Summary */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <Stat label="Total Purchased"    value={`₹${totalPurchased.toLocaleString()}`} color="#3b82f6" />
        <Stat label="We Paid Them"       value={`₹${totalPaid.toLocaleString()}`}       color="#16a34a" />
        <Stat label="We Owe (Payable)"   value={`₹${amountPayable.toLocaleString()}`}   color="#ef4444" />
        <Stat label="They Owe (Returns)" value={`₹${totalReturns.toLocaleString()}`}    color="#f59e0b" />
      </div>

      {entries.length === 0
        ? <EmptyState icon="📒" text="No ledger entries found." />
        : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr>
                {["Date","Type","Reference","Invoice Amount","Amount Paid","Balance Due","Notes","Status","Action"]
                  .map(h=><TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody>
                {entries.map(e => {
                  const bal      = e.balance ?? (e.amount - e.paid);
                  const isReturn  = ["Debit Note","Credit Note","Return"].includes(e.type);
                  const isPayment = e.type === "Payment";
                  const isPurchaseWithDue = e.type === "Purchase" && bal > 0;

                  return (
                    <tr key={e._id}
                      style={{
                        borderBottom:"1px solid #f1f5f9",
                        background: isPayment ? "#f0fdf4" : "transparent",
                      }}
                      onMouseEnter={ev=>ev.currentTarget.style.background=isPayment?"#dcfce7":"#f0fdfa"}
                      onMouseLeave={ev=>ev.currentTarget.style.background=isPayment?"#f0fdf4":"transparent"}>
                      <TD>{new Date(e.date).toLocaleDateString("en-IN")}</TD>
                      <TD>
                        <Badge color={{
                          Purchase:"blue", Payment:"green",
                          "Debit Note":"yellow", Return:"purple"
                        }[e.type]||"gray"}>
                          {e.type}
                        </Badge>
                      </TD>
                      {/* Reference / Invoice No */}
                      <TD style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>
                        {e.invoiceNo||"—"}
                      </TD>
                      {/* Invoice Amount — for Payment rows show "—" since it's not an invoice */}
                      <TD style={{ fontWeight:700, color: isPayment?"#94a3b8":"#1e293b" }}>
                        {isPayment ? "—" : `₹${e.amount.toLocaleString()}`}
                      </TD>
                      {/* Amount Paid — for Purchase: how much paid so far; for Payment: the payment itself */}
                      <TD style={{ color:"#16a34a", fontWeight:700 }}>
                        {isPayment
                          ? `₹${e.amount.toLocaleString()}`   // Payment row: amount IS the payment
                          : e.paid > 0
                            ? `₹${e.paid.toLocaleString()}`
                            : "—"
                        }
                      </TD>
                      {/* Balance Due — only meaningful for Purchase entries */}
                      <TD style={{ color: !isReturn && !isPayment && bal>0?"#ef4444":"#94a3b8", fontWeight:700 }}>
                        {!isReturn && !isPayment && bal>0 ? `₹${bal.toLocaleString()}` : "—"}
                      </TD>
                      {/* Notes */}
                      <TD style={{ color:"#64748b", fontSize:11, maxWidth:180 }}>
                        {e.notes
                          ? <span title={e.notes}>{e.notes.length>40 ? e.notes.slice(0,40)+"…" : e.notes}</span>
                          : "—"
                        }
                      </TD>
                      <TD>
                        <Badge color={{ Settled:"green", Partial:"yellow", Pending:"red" }[e.status]||"gray"}>
                          {e.status}
                        </Badge>
                      </TD>
                      <TD>
                        {isPurchaseWithDue && (
                          <Btn sm color="teal" onClick={() => openPay(e)}>💳 Pay</Btn>
                        )}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Pay Modal — tied to a specific Purchase entry */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)}
        title={`Pay Invoice — ${payModal?.invoiceNo || payModal?._id?.slice(-6)}`}>
        {payModal && (() => {
          const bal        = payModal.balance ?? (payModal.amount - payModal.paid);
          const paying     = +payForm.amount || 0;
          const leftAfter  = Math.max(0, bal - paying);
          return (
            <div>
              {/* Invoice summary strip */}
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0",
                borderRadius:8, padding:"12px 16px", marginBottom:16,
                display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, fontSize:12 }}>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Invoice Amount</div>
                  <div style={{ fontWeight:800, fontSize:14 }}>₹{payModal.amount.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Already Paid</div>
                  <div style={{ fontWeight:700, color:"#16a34a" }}>₹{payModal.paid.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Balance Due</div>
                  <div style={{ fontWeight:800, color:"#ef4444", fontSize:14 }}>₹{bal.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Current Status</div>
                  <Badge color={{ Settled:"green", Partial:"yellow", Pending:"red" }[payModal.status]}>
                    {payModal.status}
                  </Badge>
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>After This Payment</div>
                  <Badge color={leftAfter===0 && paying>0 ? "green" : paying>0 ? "yellow" : "red"}>
                    {leftAfter===0 && paying>0
                      ? "✅ Invoice Fully Settled"
                      : paying>0
                      ? `₹${leftAfter.toLocaleString()} will remain`
                      : "Enter an amount above"}
                  </Badge>
                </div>
              </div>

              {/* Form */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <FormGroup label="Amount Paying (₹) *">
                  <FormInput type="number" value={payForm.amount}
                    onChange={setPay("amount")}
                    placeholder={`Max ₹${bal.toLocaleString()}`} />
                  {paying > bal && (
                    <div style={{ color:"#ef4444", fontSize:10, marginTop:3 }}>
                      ⚠️ Cannot exceed balance of ₹{bal.toLocaleString()}
                    </div>
                  )}
                </FormGroup>
                <FormGroup label="Payment Method">
                  <FormSelect value={payForm.method} onChange={setPay("method")}>
                    {["NEFT","UPI","Cheque","Bank Transfer","Cash"].map(m=><option key={m}>{m}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Reference / UTR">
                  <FormInput placeholder="e.g. NEFT1234567" value={payForm.ref} onChange={setPay("ref")} />
                </FormGroup>
                <FormGroup label="Date">
                  <FormInput type="date" value={payForm.date} onChange={setPay("date")} />
                </FormGroup>
              </div>
              <FormGroup label="Notes (optional)">
                <FormInput placeholder="Any notes..." value={payForm.notes} onChange={setPay("notes")} />
              </FormGroup>

              <div style={{ display:"flex", gap:10, marginTop:16 }}>
                <Btn color="cancel" onClick={() => setPayModal(null)}>Cancel</Btn>
                <Btn color="teal" onClick={handlePay}
                  disabled={saving || !payForm.amount || +payForm.amount<=0 || +payForm.amount>bal}>
                  {saving ? "Processing..." : `💸 Pay ₹${paying.toLocaleString()}`}
                </Btn>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

/* ────────────────────────────────────────────────
   TAB 4 — Add Purchase
──────────────────────────────────────────────── */
function AddPurchaseTab({ vendorId, vendorName, onDone }) {
  const [allProducts,   setAllProducts]   = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [items,         setItems]         = useState([
    { product:"", productName:"", qty:1, rate:"", billingRate:"", gstRate:18, transportAmount:"", transportGstRate:0, warehouse:"Main Warehouse" }
  ]);
  const [form, setForm] = useState({
    invoiceNo:"", date:new Date().toISOString().split("T")[0],
    paymentMode:"Credit", amountPaid:"0", notes:""
  });
  // Track which row is showing the new-product form
  const [newProductRow, setNewProductRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const loadProducts = () => {
    productAPI.getAll()
      .then(r => setAllProducts(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadProducts();
    employeeAPI.getWarehouses()
      .then(r => {
        setWarehouseOptions(r.data || []);
        if (r.data?.[0]?.name) {
          setItems(prev => prev.map(it => ({ ...it, warehouse: it.warehouse || r.data[0].name })));
        }
      })
      .catch(() => {});
  }, [vendorId]);

  const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => {
    if (idx !== i) return it;
    const updated = { ...it, [k]: v };
    if (k === "product" && v) {
      const prod = allProducts.find(p => p._id === v);
      if (prod) {
        updated.rate    = String(prod.purchasePrice);
        updated.billingRate = String(prod.purchasePrice);
        updated.gstRate = prod.gstRate || 18;
      }
    }
    return updated;
  }));

  const addRow    = ()  => setItems(p => [...p, { product:"", productName:"", qty:1, rate:"", billingRate:"", gstRate:18, transportAmount:"", transportGstRate:0, warehouse:warehouseOptions[0]?.name || "Main Warehouse" }]);
  const removeRow = (i) => setItems(p => p.filter((_,idx) => idx !== i));

  // Called when a new product is saved from QuickAddProduct
  const handleNewProductSaved = (rowIndex, newProduct) => {
    // Add to dropdown list
    setAllProducts(prev => [newProduct, ...prev]);
    // Auto-select it in that row
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

  const calcItem = it => {
    const qty = +it.qty || 0;
    const sub = qty * (+it.rate || 0);
    const billingRate = it.billingRate === "" || it.billingRate === undefined ? (+it.rate || 0) : (+it.billingRate || 0);
    const billing = qty * billingRate;
    const transport = +it.transportAmount || 0;
    const gst = (billing * (+it.gstRate || 0)) / 100 + (transport * (+it.transportGstRate || 0)) / 100;
    return { sub, billing, transport, gst, total: sub + transport + gst };
  };
  const totals = items.reduce((s, it) => {
    const ci = calcItem(it);
    return { sub: s.sub + ci.sub, billing: s.billing + ci.billing, transport: s.transport + ci.transport, gst: s.gst + ci.gst };
  }, { sub:0, billing:0, transport:0, gst:0 });
  const grand = totals.sub + totals.transport + totals.gst;

  const handleSave = async () => {
    const valid = items.filter(it => (+it.qty>0) && (+it.rate>0) && it.product);
    if (!valid.length)
      return alert("Please add at least one item. Select a product from the dropdown or add a new one.");
    setSaving(true);
    try {
      await salesAPI.createPurchase({
        vendor:      vendorId,
        invoiceNo:   form.invoiceNo,
        date:        form.date,
        paymentMode: form.paymentMode,
        amountPaid:  +form.amountPaid || 0,
        notes:       form.notes,
        items: valid.map(it => ({
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
      setToast("Purchase recorded successfully! Stock has been updated.");
      setItems([{ product:"", productName:"", qty:1, rate:"", billingRate:"", gstRate:18, transportAmount:"", transportGstRate:0, warehouse:warehouseOptions[0]?.name || "Main Warehouse" }]);
      setForm({ invoiceNo:"", date:new Date().toISOString().split("T")[0],
                paymentMode:"Credit", amountPaid:"0", notes:"" });
      loadProducts();
      onDone();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const purchaseProducts = [...allProducts].sort((a, b) => {
    const aVendor = (a.vendor?._id || a.vendor || "").toString();
    const bVendor = (b.vendor?._id || b.vendor || "").toString();
    const aLinked = aVendor === vendorId;
    const bLinked = bVendor === vendorId;
    if (aLinked !== bLinked) return aLinked ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <div>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ background:"#f0fdfa", border:"1px solid #ccfbf1", borderRadius:8,
        padding:"10px 16px", marginBottom:16, fontSize:12, color:"#92400e" }}>
        ℹ️ Record a purchase from <strong>{vendorName}</strong>.
        Select an existing product or click <strong>"+ New Product"</strong> to add one on the spot —
        it will be saved to your product list automatically.
      </div>

      {/* Header fields */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
        <FormGroup label="Vendor Invoice No.">
          <FormInput placeholder="INV-2345" value={form.invoiceNo} onChange={setF("invoiceNo")} />
        </FormGroup>
        <FormGroup label="Purchase Date">
          <FormInput type="date" value={form.date} onChange={setF("date")} />
        </FormGroup>
        <FormGroup label="Payment Mode">
          <FormSelect value={form.paymentMode} onChange={setF("paymentMode")}>
            {["Cash","UPI","Bank Transfer","Cheque","Credit"].map(m=><option key={m}>{m}</option>)}
          </FormSelect>
        </FormGroup>
      </div>

      {/* Items */}
      <div style={{ background:"#fff", borderRadius:8, border:"1px solid #e2e8f0",
        marginBottom:16, overflow:"hidden" }}>
        <div style={{ padding:"12px 14px", borderBottom:"1px solid #f1f5f9",
          fontWeight:700, fontSize:13 }}>
          📦 Purchase Items
        </div>

        {items.map((it, i) => {
          const ci   = calcItem(it);
          const prod = allProducts.find(p => p._id === it.product);
          const isNewProductForm = newProductRow === i;

          return (
            <div key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
              {/* Row */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, padding:"10px 14px",
                alignItems:"flex-end" }}>
                {/* Product select */}
                <div style={{ flex:"2 1 180px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>
                    Product
                  </label>
                  <div style={{ display:"flex", gap:6 }}>
                    <select value={it.product}
                      onChange={e => setItem(i, "product", e.target.value)}
                      style={{ flex:1, padding:"8px 10px", border:"1px solid #d1d5db",
                        borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                      <option value="">— Select product —</option>
                      {purchaseProducts.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.name} | {p.modelNumber} | Stock: {p.stock} | Vendor: {p.vendor?.name || "Unlinked"}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setNewProductRow(isNewProductForm ? null : i)}
                      style={{
                        padding:"7px 10px", borderRadius:6, border:"1px solid #3b82f6",
                        background: isNewProductForm ? "#3b82f6" : "#eff6ff",
                        color: isNewProductForm ? "#fff" : "#3b82f6",
                        cursor:"pointer", fontSize:11, fontWeight:700, whiteSpace:"nowrap",
                      }}>
                      {isNewProductForm ? "✕ Cancel" : "+ New"}
                    </button>
                  </div>
                </div>

                {/* Model No */}
                <div style={{ flex:"1 1 90px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>
                    Model No.
                  </label>
                  <div style={{ padding:"8px 10px", background:"#f8fafc", border:"1px solid #e2e8f0",
                    borderRadius:6, fontSize:11, fontFamily:"monospace", color:"#0ea5e9",
                    minHeight:35 }}>
                    {prod?.modelNumber || "—"}
                  </div>
                </div>

                {/* Warehouse */}
                <div style={{ flex:"1 1 140px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>
                    Warehouse
                  </label>
                  {warehouseOptions.length ? (
                    <select value={it.warehouse || ""}
                      onChange={e => setItem(i, "warehouse", e.target.value)}
                      style={{ width:"100%", padding:"8px 8px", border:"1px solid #d1d5db",
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
                      style={{ width:"100%", padding:"8px 8px", border:"1px solid #d1d5db",
                        borderRadius:6, fontSize:12, background:"#f9fafb" }} />
                  )}
                </div>

                {/* Qty */}
                <div style={{ flex:"0 0 70px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>Qty</label>
                  <input type="number" min="1" value={it.qty}
                    onChange={e => setItem(i, "qty", e.target.value)}
                    style={{ width:"100%", padding:"8px 8px", border:"1px solid #d1d5db",
                      borderRadius:6, fontSize:12, textAlign:"center" }} />
                </div>

                {/* Rate */}
                <div style={{ flex:"0 0 90px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>Rate (₹)</label>
                  <input type="number" value={it.rate}
                    onChange={e => setItem(i, "rate", e.target.value)}
                    placeholder="₹"
                    style={{ width:"100%", padding:"8px 8px", border:"1px solid #d1d5db",
                      borderRadius:6, fontSize:12 }} />
                </div>

                {/* Billing Rate */}
                <div style={{ flex:"0 0 110px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>Billing Rate</label>
                  <input type="number" value={it.billingRate}
                    onChange={e => setItem(i, "billingRate", e.target.value)}
                    placeholder="Taxable"
                    style={{ width:"100%", padding:"8px 8px", border:"1px solid #d1d5db",
                      borderRadius:6, fontSize:12 }} />
                </div>

                {/* GST */}
                <div style={{ flex:"0 0 80px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>GST %</label>
                  <select value={it.gstRate}
                    onChange={e => setItem(i, "gstRate", e.target.value)}
                    style={{ width:"100%", padding:"8px 6px", border:"1px solid #d1d5db",
                      borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                    {["0","5","9","12","18","28"].map(r=><option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>

                {/* Transport */}
                <div style={{ flex:"0 0 100px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>Transport</label>
                  <input type="number" value={it.transportAmount}
                    onChange={e => setItem(i, "transportAmount", e.target.value)}
                    placeholder="0"
                    style={{ width:"100%", padding:"8px 8px", border:"1px solid #d1d5db",
                      borderRadius:6, fontSize:12 }} />
                </div>

                {/* Transport GST */}
                <div style={{ flex:"0 0 90px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>Trans GST</label>
                  <select value={it.transportGstRate}
                    onChange={e => setItem(i, "transportGstRate", e.target.value)}
                    style={{ width:"100%", padding:"8px 6px", border:"1px solid #d1d5db",
                      borderRadius:6, fontSize:12, background:"#f9fafb" }}>
                    {["0","5","12","18","28"].map(r=><option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>

                {/* Total */}
                <div style={{ flex:"0 0 90px" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700,
                    color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>Total</label>
                  <div style={{ padding:"8px 10px", background:"#f8fafc", border:"1px solid #e2e8f0",
                    borderRadius:6, fontSize:12, fontWeight:700 }}>
                    ₹{ci.total.toFixed(2)}
                  </div>
                </div>

                {/* Remove */}
                {items.length > 1 && (
                  <button onClick={() => removeRow(i)}
                    style={{ alignSelf:"flex-end", background:"#fee2e2", color:"#991b1b",
                      border:"none", borderRadius:6, padding:"8px 10px",
                      cursor:"pointer", fontSize:12, marginBottom:1 }}>✕</button>
                )}
              </div>

              {/* Inline new product form for this row */}
              {isNewProductForm && (
                <div style={{ padding:"0 14px 14px" }}>
                  <QuickAddProduct
                    mode="purchase"
                    vendorId={vendorId}
                    defaultRate={it.rate}
                    onSaved={newProd => handleNewProductSaved(i, newProd)}
                    onCancel={() => setNewProductRow(null)}
                  />
                </div>
              )}
            </div>
          );
        })}

        <div style={{ padding:"10px 14px" }}>
          <Btn color="blue" sm onClick={addRow}>+ Add Row</Btn>
        </div>
      </div>

      {/* Totals + Amount Paid */}
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
        <div style={{ background:"#f8fafc", borderRadius:8, padding:"16px", fontSize:13 }}>
          <div style={{ fontWeight:700, marginBottom:10 }}>Purchase Summary</div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
            <span>Subtotal</span><span>?{totals.sub.toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#64748b" }}>
            <span>Transport</span><span>?{totals.transport.toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#f59e0b" }}>
            <span>Total GST</span><span>₹{totals.gst.toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0",
            borderTop:"2px solid #e2e8f0", fontWeight:800, fontSize:16, color:"#1e293b" }}>
            <span>Grand Total</span><span>₹{grand.toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", color:"#16a34a" }}>
            <span>{form.paymentMode === "Cash" ? "Cash Amount" : "Amount Paid"}</span><span>₹{(+form.amountPaid||0).toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0",
            color:(grand-(+form.amountPaid||0))>0?"#ef4444":"#94a3b8", fontWeight:700 }}>
            <span>Outstanding</span>
            <span>₹{Math.max(0, grand-(+form.amountPaid||0)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <Btn color="cancel" onClick={() => {
          setItems([{ product:"", productName:"", qty:1, rate:"", billingRate:"", gstRate:18, transportAmount:"", transportGstRate:0, warehouse:warehouseOptions[0]?.name || "Main Warehouse" }]);
          setForm({ invoiceNo:"", date:new Date().toISOString().split("T")[0],
                    paymentMode:"Credit", amountPaid:"0", notes:"" });
          setNewProductRow(null);
        }}>Reset</Btn>
        <Btn color="teal" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "🛒 Record Purchase"}
        </Btn>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────── */
export default function VendorProfile({ vendorId, navigate }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState("purchases");

  const load = () => {
    vendorAPI.getById(vendorId)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, [vendorId]);

  if (loading) return <div style={{ padding:60 }}><LoadingSpinner /></div>;
  if (error)   return <ErrorMsg message={error} onRetry={load} />;

  const { vendor, summary } = data;
  const TABS = [
    { key:"purchases",   label:"🛒 Purchases"    },
    { key:"products",    label:"📦 Products"     },
    { key:"ledger",      label:"📒 Ledger"       },
    { key:"add-purchase",label:"➕ Add Purchase" },
  ];

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom:16 }}>
        <Btn color="cancel" onClick={() => navigate("vendor-list")}>← Back to Vendors</Btn>
      </div>

      {/* Vendor header card */}
      <div style={{ background:"linear-gradient(135deg,#111827,#1f2937)",
        borderRadius:12, padding:"22px 24px", marginBottom:20, color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.5px" }}>{vendor.name}</div>
            <div style={{ fontSize:15, color:"#9ca3af", marginTop:3 }}>{vendor.company}</div>
            <div style={{ display:"flex", gap:20, marginTop:10, flexWrap:"wrap", fontSize:13, color:"#d1d5db" }}>
              <span>📞 {vendor.phone}</span>
              {vendor.email && <span>📧 {vendor.email}</span>}
              {vendor.city  && <span>📍 {vendor.city}</span>}
              {vendor.gstin && <span>🏷️ {vendor.gstin}</span>}
            </div>
          </div>
          <Badge color={{ Active:"green", Inactive:"red", Pending:"yellow" }[vendor.status]}>
            {vendor.status}
          </Badge>
        </div>

        {/* Summary cards inside header */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
          gap:10, marginTop:18 }}>
          {[
            { label:"Total Purchased",    value:`₹${(summary.totalPurchased||0).toLocaleString()}`,  bg:"rgba(59,130,246,0.2)",  border:"#3b82f6" },
            { label:"We Paid Them",       value:`₹${(summary.totalPaid||0).toLocaleString()}`,        bg:"rgba(22,163,74,0.2)",   border:"#16a34a" },
            { label:"We Owe (Payable)",   value:`₹${(summary.amountPayable||0).toLocaleString()}`,    bg:"rgba(239,68,68,0.2)",   border:"#ef4444" },
            { label:"They Owe (Returns)", value:`₹${(summary.totalReturns||0).toLocaleString()}`,     bg:"rgba(245,158,11,0.2)",  border:"#f59e0b" },
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
      <div style={{ display:"flex", borderBottom:"2px solid #e2e8f0", marginBottom:20, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:"10px 22px", fontWeight:700, fontSize:13, cursor:"pointer",
              borderBottom: tab===t.key ? "3px solid #14b8a6" : "3px solid transparent",
              marginBottom:-2, color: tab===t.key ? "#1e293b" : "#64748b",
              background: t.key==="add-purchase" && tab!==t.key ? "#f0fdf4" : "transparent",
              borderRadius: t.key==="add-purchase" ? "6px 6px 0 0" : 0,
            }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab === "purchases"    && <PurchasesTab    vendorId={vendorId} onRefresh={load} />}
      {tab === "products"     && <ProductsTab     vendorId={vendorId} vendorName={vendor.name} onRefresh={load} />}
      {tab === "ledger"       && <LedgerTab       vendorId={vendorId} onRefresh={load} />}
      {tab === "add-purchase" && <AddPurchaseTab  vendorId={vendorId} vendorName={vendor.name}
        onDone={() => { load(); setTab("purchases"); }} />}
    </div>
  );
}
