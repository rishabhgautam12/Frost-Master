import { Btn, FormInput, FormSelect } from "./Shared";

export const defaultWarehouseName = (warehouseOptions = []) =>
  warehouseOptions[0]?.name || "Main Warehouse";

export const defaultWarehouseRows = (stock = "", warehouseOptions = []) => [
  { warehouse: defaultWarehouseName(warehouseOptions), stock: stock === undefined ? "" : String(stock) },
];

export function normalizeWarehouseRows(rows, fallbackStock = "") {
  const clean = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      warehouse: String(row.warehouse || "").trim(),
      stock: row.stock === "" || row.stock === undefined ? "" : String(row.stock),
    }))
    .filter((row) => row.warehouse || row.stock !== "");

  if (clean.length === 0) return defaultWarehouseRows(fallbackStock);
  return clean;
}

export function warehouseTotal(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => sum + (+row.stock || 0), 0);
}

export function warehousePayload(rows) {
  return normalizeWarehouseRows(rows, "")
    .filter((row) => row.warehouse)
    .map((row) => ({ warehouse: row.warehouse, stock: +row.stock || 0 }));
}

export function warehouseSummary(rows) {
  const clean = warehousePayload(rows);
  if (clean.length === 0) return "No warehouse";
  return clean.map((row) => `${row.warehouse}: ${row.stock}`).join(", ");
}

export default function WarehouseStockEditor({ rows, onChange, warehouseOptions = [] }) {
  const warehouseNames = warehouseOptions.map((w) => w.name).filter(Boolean);
  const update = (index, key, value) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const addRow = () => onChange([...(rows || []), { warehouse: defaultWarehouseName(warehouseOptions), stock: "" }]);
  const removeRow = (index) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length ? next : defaultWarehouseRows("", warehouseOptions));
  };

  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
          Warehouse Stock
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>
          Total: {warehouseTotal(rows)}
        </div>
      </div>

      {(rows || []).map((row, index) => (
        <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 110px 34px", gap: 8, marginBottom: 8 }}>
          {warehouseNames.length ? (
            <FormSelect
              value={row.warehouse}
              onChange={(e) => update(index, "warehouse", e.target.value)}
            >
              {!warehouseNames.includes(row.warehouse) && row.warehouse && (
                <option value={row.warehouse}>{row.warehouse}</option>
              )}
              {warehouseNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </FormSelect>
          ) : (
            <FormInput
              placeholder="e.g. Main Warehouse"
              value={row.warehouse}
              onChange={(e) => update(index, "warehouse", e.target.value)}
            />
          )}
          <FormInput
            type="number"
            placeholder="Qty"
            value={row.stock}
            onChange={(e) => update(index, "stock", e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            style={{ border: "none", borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontWeight: 800, cursor: "pointer" }}
          >
            x
          </button>
        </div>
      ))}

      <Btn sm color="blue" onClick={addRow}>+ Add Warehouse</Btn>
    </div>
  );
}
