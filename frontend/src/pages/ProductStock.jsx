import { useState, useEffect } from "react";
import {
  PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td, Badge,
  Modal, FormGroup, FormInput, FormSelect,
  LoadingSpinner, ErrorMsg, SuccessToast,
} from "../components/Shared";
import { productAPI, employeeAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";
import { defaultWarehouseRows, warehouseSummary } from "../components/WarehouseStockEditor";

export default function ProductStock({ navigate }) {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [adjModal,  setAdjModal]  = useState(null);
  const [adjQty,    setAdjQty]    = useState("");
  const [adjWarehouse, setAdjWarehouse] = useState("Main Warehouse");
  const [adjReason, setReason]    = useState("Manual Adjustment");
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [stockFilter, setStockFilter] = useState("all");
  const [warehouseOptions, setWarehouseOptions] = useState([]);

  const load = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    Promise.all([productAPI.getAll(params), employeeAPI.getWarehouses()])
      .then(([pRes, wRes]) => {
        setProducts(pRes.data);
        setWarehouseOptions(wRes.data || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const stockValueOf = p => p.stockValue ?? (Math.max(0, +p.stock || 0) * (+p.valuationPrice || +p.effectivePurchasePrice || +p.purchasePrice || +p.sellingPrice || 0));

  const handleAdj = async () => {
    if (!adjQty || isNaN(+adjQty)) return alert("Enter a valid number (negative to reduce).");
    setSaving(true);
    try {
      await productAPI.updateStock(adjModal._id, { adjustment: +adjQty, warehouse: adjWarehouse, reason: adjReason });
      showToast("Stock updated!");
      setAdjModal(null); setAdjQty(""); setAdjWarehouse(warehouseOptions[0]?.name || "Main Warehouse"); load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  // ── Correct summary calculations ──
  const totalUnits   = products.reduce((s, p) => s + p.stock, 0);
  // Stock value only from products with positive stock
  const totalValue   = products.reduce((s, p) => s + stockValueOf(p), 0);
  const lowStock     = products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert).length;
  const outOfStock   = products.filter(p => p.stock === 0).length;
  const negativeStock = products.filter(p => p.stock < 0).length;
  const valueStock = products.filter(p => p.stock > 0 && stockValueOf(p) > 0).length;

  // ── Status helper ──
  const getStatus = p => {
    if (p.stock < 0)                           return "Negative";
    if (p.stock === 0)                         return "Out";
    if (p.stock <= p.minStockAlert)            return "Low";
    return "OK";
  };
  const statusColor = { OK: "green", Low: "yellow", Out: "red", Negative: "red" };
  const filteredProducts = products.filter(p => {
    if (stockFilter === "low") return p.stock > 0 && p.stock <= p.minStockAlert;
    if (stockFilter === "out") return p.stock === 0;
    if (stockFilter === "negative") return p.stock < 0;
    if (stockFilter === "value") return p.stock > 0 && stockValueOf(p) > 0;
    return true;
  });
  const filteredUnits = filteredProducts.reduce((s, p) => s + p.stock, 0);
  const filteredValue = filteredProducts.reduce((s, p) => s + stockValueOf(p), 0);

  const previewStock = adjModal && adjQty !== "" ? adjModal.stock + +adjQty : adjModal?.stock;

  return (
    <div>
      <PageTitle>Product Stock</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total Stock Units",  value: totalUnits,                          color: "#3b82f6", icon: "📦" },
          { label: "Stock Value", value: `₹${totalValue.toLocaleString()}`,   color: "#8b5cf6", icon: "💰" },
          { label: "Low Stock Items",    value: lowStock,                             color: "#f59e0b", icon: "⚠️" },
          { label: "Out of Stock",       value: outOfStock,                           color: "#ef4444", icon: "🚫" },
          { label: "Negative Stock",     value: negativeStock,                        color: "#dc2626", icon: "📉" },
        ].map((c, i) => {
          const key = ["all", "value", "low", "out", "negative"][i];
          const active = stockFilter === key;
          return (
          <button type="button" key={key} onClick={() => setStockFilter(key)} style={{
            textAlign: "left", cursor: "pointer",
            background: "#fff", borderRadius: 10, padding: "14px 16px",
            border: active ? `2px solid ${c.color}` : "1px solid #e2e8f0", borderLeft: `4px solid ${c.color}`,
            boxShadow: active ? "0 6px 16px rgba(15, 23, 42, 0.12)" : "none",
          }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              {c.icon} {c.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: (c.label === "Negative Stock" && negativeStock > 0) ? "#dc2626" : "#1e293b", marginTop: 4 }}>
              {c.value}
            </div>
            {key === "value" && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{valueStock} valued item{valueStock === 1 ? "" : "s"}</div>}
          </button>
          );
        })}
      </div>

      {/* Negative stock warning banner */}
      {negativeStock > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#b91c1c", display: "flex", alignItems: "center", gap: 8 }}>
          📉 <strong>{negativeStock} product{negativeStock > 1 ? "s have" : " has"} negative stock</strong> — sales have been recorded beyond available stock. Please restock or verify.
        </div>
      )}

      {/* ── Top Buttons ── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Btn color="teal" onClick={() => navigate("product-add")}>+ Add Product</Btn>
        <Btn color="green" onClick={() => downloadCSV(filteredProducts.map(p => ({
          ...p,
          stockValue: stockValueOf(p),
          warehouseText: warehouseSummary(p.warehouses?.length ? p.warehouses : defaultWarehouseRows(p.stock)),
        })), [
          { label: "Product Name",   key: "name"          },
          { label: "Model Number",   key: "modelNumber"   },
          { label: "Brand",          key: "brand"         },
          { label: "Vendor",         key: "vendor.name"   },
          { label: "Purchase Price", key: "purchasePrice" },
          { label: "Selling Price",  key: "sellingPrice"  },
          { label: "Stock",          key: "stock"         },
          { label: "Stock Value",    key: "stockValue"    },
          { label: "Warehouse Stock", key: "warehouseText" },
          { label: "Min Alert",      key: "minStockAlert" },
          { label: "GST Rate",       key: "gstRate"       },
        ], "product_stock")}>⬇ Export CSV</Btn>
      </div>

      <SearchBar>
        <Input placeholder="Search product / model..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        <Btn color="blue" onClick={load}>Filter</Btn>
        <Btn color="cancel" onClick={() => { setSearch(""); setStockFilter("all"); setTimeout(load, 50); }}>Reset</Btn>
      </SearchBar>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Product", "Model No.", "Vendor", "Warehouse", "Purchase ₹", "Sell ₹", "Stock", "Min Alert", "Stock Value", "Status", "Action"].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0
                ? <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No products found.</td></tr>
                : filteredProducts.map(p => {
                  const status   = getStatus(p);
                  const stockVal = stockValueOf(p);
                  const isNeg    = p.stock < 0;
                  return (
                    <tr key={p._id}
                      style={{ borderBottom: "1px solid #f1f5f9", background: isNeg ? "#fff5f5" : "" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0fdfa"}
                      onMouseLeave={e => e.currentTarget.style.background = isNeg ? "#fff5f5" : ""}>
                      <Td style={{ fontWeight: 700 }}>{p.name}</Td>
                      <Td style={{ fontFamily: "monospace", color: "#0ea5e9", fontSize: 11 }}>{p.modelNumber}</Td>
                      <Td style={{ color: "#64748b" }}>{p.vendor?.name || "—"}</Td>
                      <Td style={{ color: "#475569", fontSize: 11, maxWidth: 220 }}>
                        {warehouseSummary(p.warehouses?.length ? p.warehouses : defaultWarehouseRows(p.stock))}
                      </Td>
                      <Td>₹{p.purchasePrice.toLocaleString()}</Td>
                      <Td style={{ color: "#16a34a", fontWeight: 700 }}>₹{p.sellingPrice.toLocaleString()}</Td>
                      <Td>
                        <span style={{
                          fontWeight: 800, fontSize: 14,
                          color: isNeg ? "#dc2626" : p.stock === 0 ? "#ef4444" : p.stock <= p.minStockAlert ? "#f59e0b" : "#1e293b",
                        }}>
                          {p.stock}
                          {isNeg && <span style={{ fontSize: 10, marginLeft: 3 }}>📉</span>}
                        </span>
                      </Td>
                      <Td style={{ color: "#64748b" }}>{p.minStockAlert}</Td>
                      <Td>₹{stockVal.toLocaleString()}</Td>
                      <Td>
                        <Badge color={statusColor[status]}>{status}</Badge>
                      </Td>
                      <Td>
                        <Btn sm color="blue" onClick={() => {
                          setAdjModal(p);
                          setAdjQty("");
                          setAdjWarehouse(p.warehouses?.[0]?.warehouse || warehouseOptions[0]?.name || "Main Warehouse");
                        }}>± Adjust</Btn>
                      </Td>
                    </tr>
                  );
                })
              }
            </tbody>
            {filteredProducts.length > 0 && (
              <tfoot>
                <tr style={{ background: "#ccfbf1", borderTop: "2px solid #14b8a6" }}>
                  <td colSpan={6} style={{ padding: "10px 12px", fontWeight: 800, fontSize: 12, color: "#92400e" }}>
                    📊 TOTAL ({filteredProducts.length} products)
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: 14,
                    color: filteredUnits < 0 ? "#dc2626" : "#1e293b" }}>
                    {filteredUnits}
                  </td>
                  <td style={{ padding: "10px 12px" }}></td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: 13, color: "#1e293b" }}>
                    ₹{filteredValue.toLocaleString()}
                  </td>
                  <td colSpan={2} style={{ padding: "10px 12px", fontSize: 11, color: "#92400e" }}>
                    {negativeStock > 0
                      ? `⚠️ ${negativeStock} product${negativeStock > 1 ? "s" : ""} in negative`
                      : outOfStock > 0
                        ? `🚫 ${outOfStock} out of stock`
                        : "✅ All stocked"
                    }
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </TableWrap>
      )}

      {/* ── Stock Adjustment Modal ── */}
      <Modal open={!!adjModal} onClose={() => setAdjModal(null)}
        title={`Adjust Stock — ${adjModal?.name}`}>
        {adjModal && (
          <div>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Current Stock</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: adjModal.stock < 0 ? "#dc2626" : "#1e293b" }}>
                  {adjModal.stock} units
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Min Alert</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>{adjModal.minStockAlert}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>After Adjustment</div>
                <div style={{ fontSize: 20, fontWeight: 800,
                  color: previewStock < 0 ? "#dc2626" : previewStock === 0 ? "#ef4444" : "#16a34a" }}>
                  {previewStock ?? adjModal.stock} units
                </div>
              </div>
            </div>

            <FormGroup label="Adjustment Quantity (+ to add, − to reduce)">
              <FormInput type="number" placeholder="e.g. +10 or -3"
                value={adjQty} onChange={e => setAdjQty(e.target.value)} />
            </FormGroup>

            <FormGroup label="Warehouse">
              {warehouseOptions.length ? (
                <FormSelect value={adjWarehouse} onChange={e => setAdjWarehouse(e.target.value)}>
                  {adjWarehouse && !warehouseOptions.some(w => w.name === adjWarehouse) && (
                    <option value={adjWarehouse}>{adjWarehouse}</option>
                  )}
                  {warehouseOptions.map(w => <option key={w._id} value={w.name}>{w.name}</option>)}
                </FormSelect>
              ) : (
                <>
                  <FormInput
                    list="warehouse-options"
                    placeholder="e.g. Main Warehouse"
                    value={adjWarehouse}
                    onChange={e => setAdjWarehouse(e.target.value)}
                  />
                  <datalist id="warehouse-options">
                    {(adjModal.warehouses?.length ? adjModal.warehouses : defaultWarehouseRows(adjModal.stock))
                      .map(row => <option key={row.warehouse} value={row.warehouse} />)}
                  </datalist>
                </>
              )}
            </FormGroup>

            <FormGroup label="Reason">
              <FormSelect value={adjReason} onChange={e => setReason(e.target.value)}>
                {["Manual Adjustment","Received from Vendor","Damaged / Expired","Returned by Customer","Stock Count Correction"].map(r => <option key={r}>{r}</option>)}
              </FormSelect>
            </FormGroup>

            {previewStock < 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 7, padding: "8px 12px", marginBottom: 12, fontSize: 11.5, color: "#b91c1c" }}>
                ⚠️ This will result in negative stock ({previewStock} units). Proceed only if intentional.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <Btn color="cancel" onClick={() => setAdjModal(null)}>Cancel</Btn>
              <Btn color="teal" onClick={handleAdj} disabled={saving}>
                {saving ? "Saving..." : "💾 Update Stock"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
