// Shared UI components used across all pages

// Round a bill to the nearest rupee; roundOff is the adjustment shown on the bill.
export const roundTotal = (raw) => {
  const exact = Math.round((+raw || 0) * 100) / 100;
  const total = Math.round(exact);
  return { total, roundOff: Math.round((total - exact) * 100) / 100 };
};

export const formatRoundOff = (value) => {
  const n = +value || 0;
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}₹${Math.abs(n).toFixed(2)}`;
};

// Compact product cell for list tables: first product + "+N more", full list on hover.
export const ItemsSummary = ({ items = [] }) => {
  if (!items.length) return <span style={{ color: "#9aa1b9" }}>—</span>;
  const nameOf = (item) => item.productName || item.product?.name || "Product";
  const [first, ...rest] = items;
  const tooltip = items.map((item) => `${nameOf(item)} × ${item.qty || 1}`).join("\n");
  return (
    <div title={tooltip} style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: 240, minWidth: 0 }}>
      <span style={{ fontWeight: 700, color: "#0f1535", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{nameOf(first)}</span>
      {(+first.qty || 1) > 1 && <span style={{ color: "#6b7392", fontSize: 11, whiteSpace: "nowrap" }}>× {first.qty}</span>}
      {rest.length > 0 && (
        <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: 999, background: "#f1edff", color: "#6d28d9", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>
          +{rest.length} more
        </span>
      )}
    </div>
  );
};

// Small line icons (no emoji) for status UI.
const ICON_PATHS = {
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
  inbox: <><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2.5-8z" /></>,
  close: <path d="M18 6 6 18M6 6l12 12" />,
};
export const UiIcon = ({ name, size = 16, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICON_PATHS[name]}
  </svg>
);

export const PageTitle = ({ children, subtitle }) => (
  <div className="fm-page-head">
    <h1 className="fm-page-title">{children}</h1>
    {subtitle && <div className="fm-page-subtitle">{subtitle}</div>}
  </div>
);

// Existing colour names map onto a calmer hierarchy (see .fm-btn-* in index.css).
const BTN_VARIANT = {
  teal: "primary", gold: "primary",
  green: "success",
  blue: "soft", purple: "soft",
  red: "danger",
  cancel: "outline", slate: "outline",
};

export const Btn = ({ children, onClick, color = "teal", sm, disabled, type = "button", title }) => (
  <button
    type={type}
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`fm-btn fm-btn-${BTN_VARIANT[color] || "primary"}${sm ? " fm-btn-sm" : ""}`}
  >
    {children}
  </button>
);

export const SearchBar = ({ children }) => (
  <div className="fm-searchbar" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: "#fff", padding: "14px 16px", borderRadius: 14, border: "1px solid #e6e9f2", boxShadow: "var(--shadow-xs)", marginBottom: 18 }}>
    {children}
  </div>
);

export const Input = ({ placeholder, type = "text", style = {}, value, onChange }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    style={{ maxWidth: "100%", padding: "9px 13px", border: "1px solid #dde1ec", borderRadius: 10, fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box", minHeight: 38, ...style }}
  />
);

export const TableWrap = ({ children }) => (
  <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e6e9f2", boxShadow: "var(--shadow-sm)", overflowX: "auto" }}>
    {children}
  </div>
);

export const Th = ({ children }) => (
  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 700, color: "#6b7392", fontSize: 11, whiteSpace: "nowrap", background: "#fafbfd" }}>
    {children}
  </th>
);

export const Td = ({ children, style = {}, onClick }) => (
  <td onClick={onClick} style={{ padding: "12px 16px", color: "#3a4260", verticalAlign: "middle", ...style }}>
    {children}
  </td>
);

export const Badge = ({ children, color = "green" }) => {
  const colors = {
    green:  { background: "#e7f6ee", color: "#12704a", dot: "#1f9d6b" },
    red:    { background: "#fdeeed", color: "#a3302b", dot: "#e0524c" },
    yellow: { background: "#fdf3e1", color: "#8a5a12", dot: "#e5a03a" },
    blue:   { background: "#e9f0fd", color: "#2f4b9a", dot: "#5a8be8" },
    gray:   { background: "#f1f3f8", color: "#4a5272", dot: "#9aa1b9" },
    purple: { background: "#f3ecff", color: "#6d28d9", dot: "#8b5cf6" },
  };
  const { dot, ...c } = colors[color] || colors.gray;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, lineHeight: 1.5, whiteSpace: "nowrap", ...c }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      {children}
    </span>
  );
};

export const StatsGrid = ({ cards }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
    {cards.map((c, i) => (
      <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "15px 18px", border: "1px solid #e6e9f2", boxShadow: "var(--shadow-xs)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "#6b7392", fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, flexShrink: 0 }} />
          {c.label}
        </div>
        <div style={{ fontSize: "clamp(18px, 4.4vw, 24px)", fontWeight: 800, color: "#0f1535", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", lineHeight: 1.2, marginTop: 8 }}>{c.value}</div>
      </div>
    ))}
  </div>
);

export const FormGroup = ({ label, children }) => (
  <div style={{ marginBottom: 16, minWidth: 0 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3a4260", marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

export const FormInput = (props) => (
  <input {...props} style={{ width: "100%", padding: "10px 13px", border: "1px solid #dde1ec", borderRadius: 10, fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box", minHeight: 40, ...props.style }} />
);

export const FormSelect = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "10px 13px", border: "1px solid #dde1ec", borderRadius: 10, fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box", minHeight: 40 }}>
    {children}
  </select>
);

export const Modal = ({ open, onClose, title, children, wide, className }) => {
  if (!open) return null;
  return (
    <div className={className} onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,21,53,0.42)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fm-modal-panel" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 26, width: wide ? 1120 : 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-lg)", border: "1px solid #e6e9f2", animation: "fm-fade-up 0.2s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #eef0f6" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f1535", letterSpacing: "-0.01em" }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "#fff", border: "1px solid #e6e9f2", width: 32, height: 32, borderRadius: 9, cursor: "pointer", color: "#6b7392", flexShrink: 0, display: "grid", placeItems: "center" }}>
            <UiIcon name="close" size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const DetailRow = ({ open, cols, data }) => {
  if (!open) return null;
  return (
    <tr style={{ background: "#f8f9fd" }}>
      <td colSpan={cols}>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {data.map((d, i) => (
            <div key={i}>
              <label style={{ fontSize: 10.5, color: "#9aa1b9", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.label}</label>
              <p style={{ fontSize: 13, color: "#0f1535", fontWeight: 600, marginTop: 3 }}>{d.value}</p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
};

export const LoadingSpinner = () => (
  <div role="status" aria-label="Loading" style={{ display: "flex", justifyContent: "center", padding: 44 }}>
    <div style={{ width: 30, height: 30, borderRadius: "50%", border: "3px solid #ede9fe", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite" }} />
  </div>
);

export const ErrorMsg = ({ message, onRetry }) => (
  <div role="alert" style={{ background: "#fff", border: "1px solid #f3cdc9", borderLeft: "4px solid #e0524c", borderRadius: 12, padding: "12px 16px", color: "#a3302b", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
    <span style={{ display: "flex", alignItems: "center", gap: 9 }}><UiIcon name="alert" size={17} />{message}</span>
    {onRetry && <Btn sm color="red" onClick={onRetry}>Retry</Btn>}
  </div>
);

// `icon` is accepted for backwards compatibility but a consistent line icon is always shown.
export const EmptyState = ({ text }) => (
  <div style={{ textAlign: "center", padding: "52px 20px", color: "#9aa1b9" }}>
    <div style={{ width: 56, height: 56, margin: "0 auto", borderRadius: 16, background: "#f5f3ff", color: "#8b5cf6", display: "grid", placeItems: "center" }}>
      <UiIcon name="inbox" size={26} stroke={1.7} />
    </div>
    <div style={{ marginTop: 14, fontSize: 13.5, fontWeight: 600, color: "#6b7392" }}>{text || "No data found"}</div>
  </div>
);

export const SuccessToast = ({ msg }) => (
  <div role="status" style={{ position: "fixed", bottom: 24, right: 24, background: "#0f1535", color: "#fff", padding: "12px 18px 12px 12px", borderRadius: 12, fontWeight: 600, fontSize: 13, zIndex: 99999, boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 10, animation: "fm-fade-up 0.25s ease both", maxWidth: "calc(100vw - 48px)" }}>
    <span style={{ width: 24, height: 24, borderRadius: 7, background: "#1f9d6b", display: "grid", placeItems: "center", flexShrink: 0 }}><UiIcon name="check" size={14} stroke={2.6} /></span>
    {msg}
  </div>
);
