/**
 * csvExport.js — reusable CSV download helper
 *
 * Usage:
 *   downloadCSV(rows, columns, "filename");
 *
 *   rows    — array of objects
 *   columns — array of { label: "Column Header", key: "rowKey", type?: "date"|"number" }
 *             key supports dot-path: "customer.name"
 *   filename — without .csv
 */

function getVal(obj, path) {
  return path.split(".").reduce((o, k) => (o != null ? o[k] : ""), obj) ?? "";
}

function formatVal(val, type) {
  if (val === null || val === undefined || val === "") return "";

  // Auto-detect ISO date strings like "2024-03-15T..." or "2024-03-15"
  if (
    type === "date" ||
    (typeof val === "string" && /^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(val))
  ) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
  }

  return String(val);
}

function escapeCell(val) {
  const s = String(val ?? "").replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

export function downloadCSV(rows, columns, filename = "export") {
  if (!rows || rows.length === 0) {
    alert("No data to export.");
    return;
  }

  const header = columns.map(c => escapeCell(c.label)).join(",");
  const body   = rows.map(row =>
    columns.map(c => {
      const raw = getVal(row, c.key);
      return escapeCell(formatVal(raw, c.type));
    }).join(",")
  ).join("\n");

  const csv  = "\uFEFF" + header + "\n" + body; // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}