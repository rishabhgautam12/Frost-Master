import { useState, useEffect } from "react";
import { PageTitle, Btn, FormGroup, FormInput, FormSelect, SuccessToast } from "../components/Shared";
import { productAPI, vendorAPI, employeeAPI } from "../services/api";
import WarehouseStockEditor, { defaultWarehouseRows, warehousePayload, warehouseTotal } from "../components/WarehouseStockEditor";

export default function ProductAdd({ navigate }) {
  const [vendors, setVendors] = useState([]);
  const [form,    setForm]    = useState({
    name:"", modelNumber:"", brand:"", vendor:"",
    purchasePrice:"", sellingPrice:"", stock:"",
    minStockAlert:"5", gstRate:"18", description:""
  });
  const [warehouses, setWarehouses] = useState(defaultWarehouseRows(""));
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  useEffect(() => {
    Promise.all([vendorAPI.getAll({ status:"Active" }), employeeAPI.getWarehouses()])
      .then(([vRes, wRes]) => {
        setVendors(vRes.data);
        setWarehouseOptions(wRes.data || []);
        if (wRes.data?.length) setWarehouses(defaultWarehouseRows("", wRes.data));
      })
      .catch(() => {});
  }, []);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.modelNumber || !form.purchasePrice || !form.sellingPrice)
      return alert("Product name, model number, purchase price and selling price are required.");
    setSaving(true);
    try {
      await productAPI.create({
        name:          form.name,
        modelNumber:   form.modelNumber,
        brand:         form.brand,
        vendor:        form.vendor || undefined,
        purchasePrice: +form.purchasePrice,
        sellingPrice:  +form.sellingPrice,
        stock:         warehouseTotal(warehouses),
        warehouses:    warehousePayload(warehouses),
        minStockAlert: +form.minStockAlert || 5,
        gstRate:       +form.gstRate || 18,
        description:   form.description,
      });
      setToast("Product added successfully!");
      setTimeout(() => navigate("product-list"), 1500);
    } catch (e) { alert(e.message); setSaving(false); }
  };

  const margin = form.purchasePrice && form.sellingPrice
    ? (((+form.sellingPrice - +form.purchasePrice) / +form.purchasePrice) * 100).toFixed(1)
    : null;

  return (
    <div style={{ maxWidth:700, margin:"auto" }}>
      <PageTitle>Add New Product</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <div style={{ background:"#fff", borderRadius:10, padding:28, border:"1px solid #e2e8f0" }}>

        {/* Live margin preview */}
        {margin !== null && (
          <div style={{ background: +margin >= 0 ? "#dcfce7":"#fee2e2", border:`1px solid ${+margin>=0?"#86efac":"#fca5a5"}`, borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:12 }}>
            💡 Profit Margin: <strong>{margin}%</strong> &nbsp;|&nbsp;
            Buy ₹{form.purchasePrice} → Sell ₹{form.sellingPrice} → Profit <strong>₹{(+form.sellingPrice - +form.purchasePrice).toFixed(0)}</strong>/unit
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormGroup label="Product Name *">
            <FormInput placeholder="e.g. Iron Tawa 30cm" value={form.name} onChange={set("name")} />
          </FormGroup>
          <FormGroup label="Model Number *">
            <FormInput placeholder="e.g. RT-TW-030" value={form.modelNumber} onChange={set("modelNumber")} />
          </FormGroup>
          <FormGroup label="Brand">
            <FormInput placeholder="e.g. Prestige" value={form.brand} onChange={set("brand")} />
          </FormGroup>
          <FormGroup label="Vendor">
            <FormSelect value={form.vendor} onChange={set("vendor")}>
              <option value="">Select vendor (optional)</option>
              {vendors.map(v => <option key={v._id} value={v._id}>{v.name} – {v.company}</option>)}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Purchase Price (₹) *">
            <FormInput type="number" placeholder="e.g. 280" value={form.purchasePrice} onChange={set("purchasePrice")} />
          </FormGroup>
          <FormGroup label="Selling Price (₹) *">
            <FormInput type="number" placeholder="e.g. 349" value={form.sellingPrice} onChange={set("sellingPrice")} />
          </FormGroup>
          <FormGroup label="Initial Stock (units)">
            <FormInput type="number" placeholder="0" value={warehouseTotal(warehouses)} disabled />
          </FormGroup>
          <FormGroup label="Min Stock Alert">
            <FormInput type="number" placeholder="5" value={form.minStockAlert} onChange={set("minStockAlert")} />
          </FormGroup>
          <FormGroup label="GST Rate (%)">
            <FormSelect value={form.gstRate} onChange={set("gstRate")}>
              {["0","5","9","12","18","28"].map(r => <option key={r}>{r}</option>)}
            </FormSelect>
          </FormGroup>
        </div>

        <FormGroup label="Warehouse-wise Stock">
          <WarehouseStockEditor rows={warehouses} onChange={setWarehouses} warehouseOptions={warehouseOptions} />
        </FormGroup>

        <FormGroup label="Description (optional)">
          <textarea placeholder="Write a short description..." rows={2} value={form.description} onChange={set("description")}
            style={{ width:"100%", padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:7, fontSize:13, outline:"none", background:"#f9fafb", boxSizing:"border-box", resize:"vertical" }} />
        </FormGroup>

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <Btn color="cancel" onClick={() => navigate("product-list")}>Cancel</Btn>
          <Btn color="teal" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Product"}</Btn>
        </div>
      </div>
    </div>
  );
}
