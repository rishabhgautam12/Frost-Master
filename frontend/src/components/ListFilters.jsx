// Shared CRM-style list controls: search box, period ranges, filter selects, status tabs, row menu.
import { useEffect, useState } from "react";

export const PERIODS = [
  { value: "all",       label: "All time" },
  { value: "today",     label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week",      label: "This week" },
  { value: "month",     label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "fy",        label: "This financial year" },
  { value: "lastFy",    label: "Last financial year" },
  { value: "custom",    label: "Custom range" },
];

export const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Returns [from, to] as YYYY-MM-DD strings (either may be null = open-ended).
export function periodRange(period, customFrom, customTo) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1; // Indian FY: April–March
  switch (period) {
    case "today": return [isoDay(today), isoDay(today)];
    case "yesterday": { const y = new Date(today); y.setDate(y.getDate() - 1); return [isoDay(y), isoDay(y)]; }
    case "week": { const s = new Date(today); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return [isoDay(s), isoDay(today)]; }
    case "month": return [isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), isoDay(today)];
    case "lastMonth": return [isoDay(new Date(today.getFullYear(), today.getMonth() - 1, 1)), isoDay(new Date(today.getFullYear(), today.getMonth(), 0))];
    case "fy": return [`${fyStart}-04-01`, `${fyStart + 1}-03-31`];
    case "lastFy": return [`${fyStart - 1}-04-01`, `${fyStart}-03-31`];
    case "custom": return [customFrom || null, customTo || null];
    default: return [null, null];
  }
}

export const inPeriod = (date, [from, to]) => {
  const day = isoDay(new Date(date));
  return (!from || day >= from) && (!to || day <= to);
};

// Every search word must appear somewhere in the record's text.
export const matchesSearch = (text, query) => {
  const q = query.trim().toLowerCase();
  return !q || q.split(/\s+/).every(word => text.includes(word));
};

export const money = n => `₹${(+n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const filterSelectStyle = {
  padding: "9px 30px 9px 12px", border: "1px solid #dde1ec", borderRadius: 10, fontSize: 12.5,
  background: "#fafbfe", color: "#3a4260", minHeight: 38, cursor: "pointer", maxWidth: "100%",
};

export function FilterSelect({ value, onChange, children, label }) {
  return (
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} style={filterSelectStyle}>
      {children}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder, label }) {
  return (
    <div style={{ position: "relative", flex: "1 1 280px", minWidth: 0 }}>
      <span aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9aa1b9", fontSize: 14, pointerEvents: "none" }}>⌕</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        style={{ width: "100%", boxSizing: "border-box", padding: "9px 34px 9px 32px", border: "1px solid #dde1ec", borderRadius: 10, fontSize: 13, background: "#fafbfe", outline: "none", minHeight: 38 }}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")}
          style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, border: "none", borderRadius: 7, background: "#f1f3f9", color: "#6b7392", cursor: "pointer" }}>✕</button>
      )}
    </div>
  );
}

// Period dropdown plus the from/to pickers when "Custom range" is chosen.
export function PeriodFilter({ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }) {
  return (
    <>
      <FilterSelect label="Period" value={period} onChange={setPeriod}>
        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </FilterSelect>
      {period === "custom" && (
        <>
          <input type="date" aria-label="From date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={filterSelectStyle} />
          <span style={{ color: "#9aa1b9", fontSize: 12 }}>to</span>
          <input type="date" aria-label="To date" value={customTo} min={customFrom || undefined} onChange={e => setCustomTo(e.target.value)} style={filterSelectStyle} />
        </>
      )}
    </>
  );
}

// Pill tabs with counts. tabs: [{ value, label, count }]; value "" means "All".
export function StatusTabs({ tabs, value, onChange }) {
  const tabStyle = active => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999,
    border: `1px solid ${active ? "#7c3aed" : "#e6e9f2"}`, background: active ? "#7c3aed" : "#fff",
    color: active ? "#fff" : "#4a5272", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
  });
  const countStyle = active => ({
    padding: "0 7px", borderRadius: 999, fontSize: 10.5, lineHeight: "18px",
    background: active ? "rgba(255,255,255,.22)" : "#f1f3f9", color: active ? "#fff" : "#6b7392",
  });
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {tabs.map(tab => {
        const active = value === tab.value;
        return (
          <button type="button" key={tab.value || "all"} onClick={() => onChange(active && tab.value ? "" : tab.value)} style={tabStyle(active)}>
            {tab.label} <span style={countStyle(active)}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ClearFiltersButton({ count, onClick }) {
  if (!count) return null;
  return (
    <button type="button" onClick={onClick}
      style={{ border: "none", background: "none", color: "#7c3aed", fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: "6px 4px" }}>
      Clear filters ({count})
    </button>
  );
}

export function SummaryCards({ cards }) {
  return (
    <div className="sales-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
      {cards.map((c) => (
        <div className="sales-summary-card" key={c.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e6e9f2", borderLeft: `4px solid ${c.color}` }}>
          <div className="sales-summary-label" style={{ fontSize: 11, color: "#6b7392", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</div>
          <div className="sales-summary-value" style={{ fontSize: 22, fontWeight: 800, color: "#0f1535", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
          <div style={{ fontSize: 11, color: "#9aa1b9", marginTop: 2, fontWeight: 600 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

export const toolbarStyle = { background: "#fff", border: "1px solid #e6e9f2", borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: "var(--shadow-xs)" };

// "More" menu for a table row. Fixed positioning so the table's overflow never clips it.
export function RowMenu({ items }) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);
  const visible = items.filter(i => !i.hidden);
  const toggle = e => {
    e.stopPropagation();
    if (pos) return setPos(null);
    const r = e.currentTarget.getBoundingClientRect();
    const menuHeight = visible.length * 36 + 12;
    const top = r.bottom + menuHeight > window.innerHeight ? Math.max(8, r.top - menuHeight - 4) : r.bottom + 4;
    setPos({ top, left: Math.max(8, r.right - 210) });
  };
  return (
    <>
      <button type="button" aria-label="More actions" onClick={toggle}
        style={{ width: 32, height: 30, borderRadius: 8, border: "1px solid #dde1ec", background: pos ? "#f1edff" : "#fff", color: "#4a5272", cursor: "pointer", fontSize: 16, lineHeight: 1, fontWeight: 800 }}>
        ⋯
      </button>
      {pos && (
        <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: pos.top, left: pos.left, width: 210, background: "#fff", border: "1px solid #e6e9f2", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6, zIndex: 9500 }}>
          {visible.map(item => (
            <button key={item.label} type="button" disabled={item.disabled}
              onClick={() => { setPos(null); item.onClick(); }}
              onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = item.danger ? "#fdeceb" : "#f5f3ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              title={item.disabled ? item.disabledReason : undefined}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none", borderRadius: 8, background: "transparent", fontSize: 12.5, fontWeight: 600, cursor: item.disabled ? "not-allowed" : "pointer", color: item.disabled ? "#b8bdd0" : item.danger ? "#c0392b" : "#3a4260" }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
