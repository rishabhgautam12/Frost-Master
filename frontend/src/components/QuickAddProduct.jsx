/**
 * QuickAddProduct — reusable inline form
 * Used in: VendorProfile (AddPurchaseTab) and CreateSale
 *
 * Props:
 *   mode        — "purchase" | "sale"
 *   vendorId    — pre-fill vendor field (optional)
 *   defaultRate — pre-fill purchase/selling rate (optional)
 *   onSaved(product) — called with the created product
 *   onCancel()
 */
import { useState } from "react";
import { Btn, FormGroup, FormInput, FormSelect } from "./Shared";
import { productAPI } from "../services/api";

export default function QuickAddProduct({ mode="purchase", vendorId, defaultRate, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name:          "",
    modelNumber:   "",
    brand:         "",
    purchasePrice: defaultRate || "",
    sellingPrice:  "",
    gstRate:       "18",
    minStockAlert: "5",
    description:   "",
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const margin = form.purchasePrice && form.sellingPrice
    ? (((+form.sellingPrice - +form.purchasePrice) / +form.purchasePrice) * 100).toFixed(1)
    : null;

  const handleSave = async () => {
    if (!form.name)        return alert("Product name is required.");
    if (!form.modelNumber) return alert("Model number is required.");
    
    // In purchase mode, selling price is optional (can be set later)
    if (mode === "sale" && !form.sellingPrice)
      return alert("Selling price is required.");

     if (mode === "purchase" && !form.purchasePrice) return alert("Purchase price is required.");
    setSaving(true);
    try {
      const res = await productAPI.create({
        name:          form.name,
        modelNumber:   form.modelNumber,
        brand:         form.brand,
        vendor:        vendorId || undefined,
        purchasePrice: +form.purchasePrice,
        sellingPrice:  +form.sellingPrice || 0,
        stock:         0,
        minStockAlert: +form.minStockAlert || 5,
        gstRate:       +form.gstRate || 18,
        description:   form.description,
      });
      onSaved(res.data);
    } catch (e) {
      alert(e.message);
      setSaving(false);
    }
  };

  return (
    <div style={{
      background:    mode === "purchase" ? "#eff6ff" : "#f0fdf4",
      border:        `1px solid ${mode === "purchase" ? "#bfdbfe" : "#86efac"}`,
      borderRadius:  10,
      padding:       16,
      marginBottom:  12,
    }}>
      {/* Header */}
      <div style={{ fontWeight:700, fontSize:13,
        color: mode === "purchase" ? "#1e40af" : "#166534",
        marginBottom:12 }}>
        {mode === "purchase" ? "📦 Add New Product to Purchase" : "📦 Add New Product to Sell"}
      </div>

      {/* Margin preview */}
      {margin !== null && (
        <div style={{
          background: +margin >= 0 ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${+margin >= 0 ? "#86efac" : "#fca5a5"}`,
          borderRadius:7, padding:"8px 12px", marginBottom:12, fontSize:11,
        }}>
          💡 Margin: <strong>{margin}%</strong> &nbsp;|&nbsp;
          Buy ₹{form.purchasePrice} → Sell ₹{form.sellingPrice} →
          Profit <strong>₹{(+form.sellingPrice - +form.purchasePrice).toFixed(0)}</strong>/unit
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        <FormGroup label="Product Name *">
          <FormInput placeholder="e.g. Iron Tawa 30cm"
            value={form.name} onChange={set("name")} />
        </FormGroup>
        <FormGroup label="Model Number *">
          <FormInput placeholder="e.g. RT-TW-030"
            value={form.modelNumber} onChange={set("modelNumber")} />
        </FormGroup>
        <FormGroup label="Brand">
          <FormInput placeholder="e.g. Prestige"
            value={form.brand} onChange={set("brand")} />
        </FormGroup>
        <FormGroup label={`Purchase Price (₹)${mode === "sale" ? " (optional)" : " *"}`}>
          <FormInput type="number" placeholder="0"
            value={form.purchasePrice} onChange={set("purchasePrice")} />
        </FormGroup>
        <FormGroup label={`Selling Price (₹)${mode === "purchase" ? " (optional)" : " *"}`}>
          <FormInput type="number" placeholder="0"
            value={form.sellingPrice} onChange={set("sellingPrice")} />
        </FormGroup>
        <FormGroup label="GST Rate (%)">
          <FormSelect value={form.gstRate} onChange={set("gstRate")}>
            {["0","5","9","12","18","28"].map(r => <option key={r}>{r}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="Min Stock Alert">
          <FormInput type="number" placeholder="5"
            value={form.minStockAlert} onChange={set("minStockAlert")} />
        </FormGroup>
        <FormGroup label="Description" style={{ gridColumn:"span 2" }}>
          <FormInput placeholder="Optional..." value={form.description} onChange={set("description")} />
        </FormGroup>
      </div>

      <div style={{ display:"flex", gap:10, marginTop:12 }}>
        <Btn color="cancel" onClick={onCancel}>Cancel</Btn>
        <Btn color={mode === "purchase" ? "blue" : "teal"} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "💾 Save Product & Continue"}
        </Btn>
      </div>
    </div>
  );
}
