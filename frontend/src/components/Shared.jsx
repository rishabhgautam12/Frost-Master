// Shared UI components used across all pages

export const PageTitle = ({ children }) => (
  <div style={{ width: "100%", maxWidth: "100%", display: "flex", alignItems: "center", gap: 12, marginBottom: 20, overflowWrap: "anywhere", animation: "fm-fade-up 0.35s ease both" }}>
    <span style={{ width: 6, alignSelf: "stretch", minHeight: 28, borderRadius: 999, background: "linear-gradient(180deg, #a78bfa, #7c3aed)", flexShrink: 0 }} />
    <span style={{ fontSize: 22, fontWeight: 800, color: "#0f1535", letterSpacing: "-0.02em", lineHeight: 1.25, fontFamily: "var(--font-display)" }}>
      {children}
    </span>
  </div>
);

export const Btn = ({ children, onClick, color = "teal", sm, disabled }) => {
  const colors = {
    green:  { background: "#1f9d6b", color: "#fff", boxShadow: "0 4px 12px -4px rgba(31,157,107,0.45)" },
    blue:   { background: "#0ea5e9", color: "#fff", boxShadow: "0 4px 12px -4px rgba(59,143,217,0.45)" },
    teal:   { background: "linear-gradient(135deg, #8b5cf6, #7c3aed 55%, #9333ea)", color: "#fff", boxShadow: "0 4px 12px -4px rgba(124,58,237,0.5)" },
    gold:   { background: "linear-gradient(135deg, #7c3aed, #db2777)", color: "#fff", boxShadow: "0 4px 12px -4px rgba(60,76,184,0.5)" },
    red:    { background: "#e0524c", color: "#fff", boxShadow: "0 4px 12px -4px rgba(224,82,76,0.45)" },
    cancel: { background: "#fff", color: "#4a5272", border: "1px solid #dde1ec" },
    purple: { background: "#c026d3", color: "#fff", boxShadow: "0 4px 12px -4px rgba(122,92,224,0.45)" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = "brightness(1.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
      style={{
        padding: sm ? "5px 12px" : "9px 18px",
        borderRadius: sm ? 8 : 10, fontWeight: 700,
        fontSize: sm ? 11.5 : 12.5,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
        display: "inline-flex", alignItems: "center", gap: 6,
        justifyContent: "center", whiteSpace: "nowrap", minHeight: sm ? 30 : 38,
        letterSpacing: "0.01em",
        opacity: disabled ? 0.55 : 1,
        ...colors[color],
      }}
    >
      {children}
    </button>
  );
};

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
    style={{ maxWidth: "100%", padding: "9px 13px", border: "1px solid #dde1ec", borderRadius: 10, fontSize: 12.5, background: "#fafbfe", outline: "none", boxSizing: "border-box", minHeight: 38, ...style }}
  />
);

export const TableWrap = ({ children }) => (
  <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e6e9f2", boxShadow: "var(--shadow-sm)", overflowX: "auto" }}>
    {children}
  </div>
);

export const Th = ({ children }) => (
  <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#6b7392", fontSize: 11, whiteSpace: "nowrap", background: "#f8f9fd" }}>
    {children}
  </th>
);

export const Td = ({ children, style = {}, onClick }) => (
  <td onClick={onClick} style={{ padding: "12px 14px", color: "#3a4260", verticalAlign: "middle", ...style }}>
    {children}
  </td>
);

export const Badge = ({ children, color = "green" }) => {
  const colors = {
    green:  { background: "#e3f5ec", color: "#13734d", dot: "#1f9d6b" },
    red:    { background: "#fdeceb", color: "#a33a35", dot: "#e0524c" },
    yellow: { background: "#fdf1dc", color: "#8a5a12", dot: "#e5a03a" },
    blue:   { background: "#e5edfc", color: "#34509f", dot: "#5a8be8" },
    gray:   { background: "#f1f3f9", color: "#4a5272", dot: "#9aa1b9" },
    purple: { background: "#fae8ff", color: "#86198f", dot: "#d946ef" },
  };
  const { dot, ...c } = colors[color] || colors.gray;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, lineHeight: 1.5, whiteSpace: "nowrap", ...c }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      {children}
    </span>
  );
};

export const StatsGrid = ({ cards }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
    {cards.map((c, i) => (
      <div key={i} style={{ position: "relative", overflow: "hidden", background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #e6e9f2", boxShadow: "var(--shadow-sm)" }}>
        <span style={{ position: "absolute", top: -26, right: -26, width: 78, height: 78, borderRadius: "50%", background: c.color, opacity: 0.1 }} />
        <span style={{ display: "block", width: 28, height: 5, borderRadius: 999, background: c.color, marginBottom: 12 }} />
        <div style={{ position: "relative", fontSize: "clamp(17px, 4.4vw, 24px)", fontWeight: 800, color: "#0f1535", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", lineHeight: 1.2 }}>{c.value}</div>
        <div style={{ fontSize: 11.5, color: "#6b7392", marginTop: 3, fontWeight: 600 }}>{c.label}</div>
      </div>
    ))}
  </div>
);

export const FormGroup = ({ label, children }) => (
  <div style={{ marginBottom: 16, minWidth: 0 }}>
    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#4a5272", marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

export const FormInput = (props) => (
  <input {...props} style={{ width: "100%", padding: "10px 13px", border: "1px solid #dde1ec", borderRadius: 10, fontSize: 13, outline: "none", background: "#fafbfe", boxSizing: "border-box", minHeight: 40, ...props.style }} />
);

export const FormSelect = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "10px 13px", border: "1px solid #dde1ec", borderRadius: 10, fontSize: 13, outline: "none", background: "#fafbfe", boxSizing: "border-box", minHeight: 40 }}>
    {children}
  </select>
);

export const Modal = ({ open, onClose, title, children, wide, className }) => {
  if (!open) return null;
  return (
    <div className={className} onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,21,53,0.38)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fm-modal-panel" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 28, width: wide ? 1120 : 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-lg)", border: "1px solid #e6e9f2", animation: "fm-fade-up 0.22s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #eef0f6" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f1535", letterSpacing: "-0.01em", fontFamily: "var(--font-display)" }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "#f1f3f9", border: "none", width: 32, height: 32, borderRadius: 10, fontSize: 14, cursor: "pointer", color: "#6b7392", flexShrink: 0, display: "grid", placeItems: "center" }}>✕</button>
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
  <div style={{ display: "flex", justifyContent: "center", padding: 44 }}>
    <div style={{ width: 34, height: 34, borderRadius: "50%", border: "3.5px solid #ede9fe", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite" }} />
  </div>
);

export const ErrorMsg = ({ message, onRetry }) => (
  <div style={{ background: "#fdeceb", border: "1px solid #f6cfcc", borderRadius: 12, padding: "14px 18px", color: "#a33a35", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
    <span>⚠️ {message}</span>
    {onRetry && <Btn sm color="red" onClick={onRetry}>Retry</Btn>}
  </div>
);

export const EmptyState = ({ icon = "📭", text }) => (
  <div style={{ textAlign: "center", padding: "56px 20px", color: "#9aa1b9" }}>
    <div style={{ width: 72, height: 72, margin: "0 auto", borderRadius: 22, background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", display: "grid", placeItems: "center", fontSize: 32 }}>{icon}</div>
    <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: "#6b7392" }}>{text || "No data found"}</div>
  </div>
);

export const SuccessToast = ({ msg }) => (
  <div style={{ position: "fixed", bottom: 24, right: 24, background: "#fff", color: "#13734d", padding: "12px 18px 12px 14px", borderRadius: 14, fontWeight: 700, fontSize: 13, zIndex: 99999, boxShadow: "var(--shadow-lg)", border: "1px solid #c6ecd9", display: "flex", alignItems: "center", gap: 10, animation: "fm-fade-up 0.25s ease both" }}>
    <span style={{ width: 26, height: 26, borderRadius: 8, background: "#e3f5ec", display: "grid", placeItems: "center", fontSize: 13 }}>✅</span>
    {msg}
  </div>
);
