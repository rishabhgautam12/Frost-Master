import { useState, useEffect } from "react";
import {
  PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td, Badge,
  Modal, FormGroup, FormInput, FormSelect,
  LoadingSpinner, ErrorMsg, EmptyState, SuccessToast,
} from "../components/Shared";
import { productAPI, vendorAPI, employeeAPI } from "../services/api";
import WarehouseStockEditor, {
  defaultWarehouseRows,
  normalizeWarehouseRows,
  warehousePayload,
  warehouseSummary,
  warehouseTotal,
} from "../components/WarehouseStockEditor";

export default function ProductList({ navigate }) {
  const [products, setProducts] = useState([]);
  const [vendors,  setVendors]  = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [toast,    setToast]    = useState(null);
  const [editProd, setEditProd] = useState(null);   // product being edited
  const [saving,   setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    Promise.all([productAPI.getAll(params), vendorAPI.getAll({ status:"Active" }), employeeAPI.getWarehouses()])
      .then(([pRes, vRes, wRes]) => {
        setProducts(pRes.data);
        setVendors(vRes.data);
        setWarehouseOptions(wRes.data || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try { await productAPI.delete(id); showToast("Product deleted successfully."); load(); }
    catch(e) { alert(e.message); }
  };

  const openEdit = p => setEditProd({
    _id:          p._id,
    name:         p.name,
    modelNumber:  p.modelNumber,
    brand:        p.brand || "",
    vendor:       p.vendor?._id || "",
    purchasePrice:String(p.purchasePrice),
    sellingPrice: String(p.sellingPrice),
    stock:        String(p.stock),
    warehouses:   normalizeWarehouseRows(p.warehouses, p.stock),
    minStockAlert:String(p.minStockAlert),
    gstRate:      String(p.gstRate || 18),
    description:  p.description || "",
  });

  const setE = k => e => setEditProd(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!editProd.name || !editProd.modelNumber || !editProd.purchasePrice || !editProd.sellingPrice)
      return alert("Name, model number, purchase price and selling price are required.");
    setSaving(true);
    try {
      await productAPI.update(editProd._id, {
        name:          editProd.name,
        modelNumber:   editProd.modelNumber,
        brand:         editProd.brand,
        vendor:        editProd.vendor || undefined,
        purchasePrice: +editProd.purchasePrice,
        sellingPrice:  +editProd.sellingPrice,
        stock:         warehouseTotal(editProd.warehouses),
        warehouses:    warehousePayload(editProd.warehouses),
        minStockAlert: +editProd.minStockAlert,
        gstRate:       +editProd.gstRate,
        description:   editProd.description,
      });
      showToast("Product updated successfully!");
      setEditProd(null);
      load();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const margin = editProd?.purchasePrice && editProd?.sellingPrice
    ? (((+editProd.sellingPrice - +editProd.purchasePrice) / +editProd.purchasePrice) * 100).toFixed(1)
    : null;

  return (
    <div>
      <PageTitle>Products</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
        <Btn color="teal" onClick={() => navigate("product-add")}>+ Add Product</Btn>
        <Btn color="blue" onClick={() => navigate("product-stock")}>📊 Manage Stock</Btn>
      </div>

      <SearchBar>
        <Input placeholder="Search by name or model number..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width:220 }} />
        <Btn color="blue" onClick={load}>Search</Btn>
        <span style={{ fontSize:11, color:"#64748b", marginLeft:"auto" }}>
          {products.length} products
        </span>
      </SearchBar>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>{["Product","Model No.","Brand","Vendor","Warehouse","Purchase ₹","Selling ₹",
                "Margin","Stock","GST%","Action"].map(h=><Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {products.length === 0
                ? <tr><td colSpan={11}><EmptyState text="No products found. Add one!" /></td></tr>
                : products.map(p => (
                  <tr key={p._id} style={{ borderBottom:"1px solid #f1f5f9" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#f0fdfa"}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <Td style={{ fontWeight:700 }}>{p.name}</Td>
                    <Td style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>
                      {p.modelNumber}
                    </Td>
                    <Td>{p.brand||"—"}</Td>
                    <Td style={{ color:"#64748b" }}>{p.vendor?.name||"—"}</Td>
                    <Td style={{ color:"#475569", fontSize:11, maxWidth:190 }}>
                      {warehouseSummary(p.warehouses?.length ? p.warehouses : defaultWarehouseRows(p.stock))}
                    </Td>
                    <Td>₹{p.purchasePrice.toLocaleString()}</Td>
                    <Td style={{ color:"#16a34a", fontWeight:700 }}>
                      ₹{p.sellingPrice.toLocaleString()}
                    </Td>
                    <Td style={{ fontWeight:700,
                      color:+p.profitMargin>=0?"#16a34a":"#ef4444" }}>
                      {p.profitMargin}%
                    </Td>
                    <Td>
                      <Badge color={p.stock===0?"red":p.stock<=p.minStockAlert?"yellow":"green"}>
                        {p.stock}{p.stock===0?" ⚠️":""}
                      </Badge>
                    </Td>
                    <Td style={{ color:"#64748b" }}>{p.gstRate||18}%</Td>
                    <Td>
                      <div style={{ display:"flex", gap:5 }}>
                        <Btn sm color="blue" onClick={() => openEdit(p)}>✏️ Edit</Btn>
                        <Btn sm color="red"  onClick={() => handleDelete(p._id, p.name)}>🗑</Btn>
                      </div>
                    </Td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </TableWrap>
      )}

      {/* ── Edit Modal ── */}
      <Modal open={!!editProd} onClose={() => setEditProd(null)}
        title={`Edit Product — ${editProd?.name}`} wide>
        {editProd && (
          <div>
            {margin !== null && (
              <div style={{ background:+margin>=0?"#dcfce7":"#fee2e2",
                border:`1px solid ${+margin>=0?"#86efac":"#fca5a5"}`,
                borderRadius:8, padding:"9px 14px", marginBottom:14, fontSize:12 }}>
                💡 Margin: <strong>{margin}%</strong> &nbsp;|&nbsp;
                Buy ₹{editProd.purchasePrice} → Sell ₹{editProd.sellingPrice} →
                Profit <strong>₹{(+editProd.sellingPrice-+editProd.purchasePrice).toFixed(0)}</strong>/unit
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FormGroup label="Product Name *">
                <FormInput value={editProd.name} onChange={setE("name")} />
              </FormGroup>
              <FormGroup label="Model Number *">
                <FormInput value={editProd.modelNumber} onChange={setE("modelNumber")} />
              </FormGroup>
              <FormGroup label="Brand">
                <FormInput value={editProd.brand} onChange={setE("brand")} />
              </FormGroup>
              <FormGroup label="Vendor">
                <FormSelect value={editProd.vendor} onChange={setE("vendor")}>
                  <option value="">Select vendor</option>
                  {vendors.map(v=>(
                    <option key={v._id} value={v._id}>{v.name} – {v.company}</option>
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Purchase Price (₹) *">
                <FormInput type="number" value={editProd.purchasePrice}
                  onChange={setE("purchasePrice")} />
              </FormGroup>
              <FormGroup label="Selling Price (₹) *">
                <FormInput type="number" value={editProd.sellingPrice}
                  onChange={setE("sellingPrice")} />
              </FormGroup>
              <FormGroup label="Stock (units)">
                <FormInput type="number" value={warehouseTotal(editProd.warehouses)} disabled />
              </FormGroup>
              <FormGroup label="Min Stock Alert">
                <FormInput type="number" value={editProd.minStockAlert}
                  onChange={setE("minStockAlert")} />
              </FormGroup>
              <FormGroup label="GST Rate (%)">
                <FormSelect value={editProd.gstRate} onChange={setE("gstRate")}>
                  {["0","5","9","12","18","28"].map(r=><option key={r}>{r}</option>)}
                </FormSelect>
              </FormGroup>
            </div>
            <FormGroup label="Warehouse-wise Stock">
              <WarehouseStockEditor
                rows={editProd.warehouses}
                onChange={(rows) => setEditProd(p => ({ ...p, warehouses: rows, stock: String(warehouseTotal(rows)) }))}
                warehouseOptions={warehouseOptions}
              />
            </FormGroup>
            <FormGroup label="Description">
              <FormInput value={editProd.description} onChange={setE("description")}
                placeholder="Optional..." />
            </FormGroup>
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <Btn color="cancel" onClick={() => setEditProd(null)}>Cancel</Btn>
              <Btn color="teal" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "💾 Save Changes"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
