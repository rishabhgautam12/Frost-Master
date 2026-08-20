// Shared UI components used across all pages

export const PageTitle = ({ children }) => (
  <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", textAlign: "center", marginBottom: 18, fontFamily: "Georgia,serif" }}>
    {children}
  </div>
);

export const Btn = ({ children, onClick, color = "teal", sm, disabled }) => {
  const colors = {
    green:  { background: "#16a34a", color: "#fff" },
    blue:   { background: "#0ea5e9", color: "#fff" },
    teal:   { background: "#0d9488", color: "#fff" },
    gold:   { background: "#0f766e", color: "#fff" },
    red:    { background: "#ef4444", color: "#fff" },
    cancel: { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
    purple: { background: "#7c3aed", color: "#fff" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: sm ? "5px 10px" : "8px 16px",
        borderRadius: 6, fontWeight: 700,
        fontSize: sm ? 11 : 12,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
        display: "inline-flex", alignItems: "center", gap: 5,
        transition: "all 0.15s",
        opacity: disabled ? 0.6 : 1,
        ...colors[color],
      }}
    >
      {children}
    </button>
  );
};

export const SearchBar = ({ children }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#fff", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16 }}>
    {children}
  </div>
);

export const Input = ({ placeholder, type = "text", style = {}, value, onChange }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    style={{ padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, background: "#f9fafb", outline: "none", ...style }}
  />
);

export const TableWrap = ({ children }) => (
  <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflowX: "auto" }}>
    {children}
  </div>
);

export const Th = ({ children }) => (
  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#ecfeff", fontSize: 11.5, whiteSpace: "nowrap", background: "#0f766e" }}>
    {children}
  </th>
);

export const Td = ({ children, style = {}, onClick }) => (
  <td onClick={onClick} style={{ padding: "10px 12px", color: "#334155", verticalAlign: "middle", ...style }}>
    {children}
  </td>
);

export const Badge = ({ children, color = "green" }) => {
  const colors = {
    green:  { background: "#dcfce7", color: "#166534" },
    red:    { background: "#fee2e2", color: "#991b1b" },
    yellow: { background: "#fef3c7", color: "#92400e" },
    blue:   { background: "#dbeafe", color: "#1e40af" },
    gray:   { background: "#f1f5f9", color: "#475569" },
    purple: { background: "#ede9fe", color: "#5b21b6" },
  };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, ...colors[color] }}>
      {children}
    </span>
  );
};

export const StatsGrid = ({ cards }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 20 }}>
    {cards.map((c, i) => (
      <div key={i} style={{ background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0", borderLeft: `4px solid ${c.color}` }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>{c.value}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{c.label}</div>
      </div>
    ))}
  </div>
);

export const FormGroup = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

export const FormInput = (props) => (
  <input {...props} style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, outline: "none", background: "#f9fafb", boxSizing: "border-box", ...props.style }} />
);

export const FormSelect = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, outline: "none", background: "#f9fafb", boxSizing: "border-box" }}>
    {children}
  </select>
);

export const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, width: wide ? 1120 : 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", fontFamily: "Georgia,serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const DetailRow = ({ open, cols, data }) => {
  if (!open) return null;
  return (
    <tr style={{ background: "#f8fafc" }}>
      <td colSpan={cols}>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {data.map((d, i) => (
            <div key={i}>
              <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{d.label}</label>
              <p style={{ fontSize: 12.5, color: "#1e293b", fontWeight: 600, marginTop: 2 }}>{d.value}</p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
};

export const LoadingSpinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid #e2e8f0", borderTopColor: "#14b8a6", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export const ErrorMsg = ({ message, onRetry }) => (
  <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "14px 18px", color: "#991b1b", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span>⚠️ {message}</span>
    {onRetry && <Btn sm color="red" onClick={onRetry}>Retry</Btn>}
  </div>
);

export const EmptyState = ({ icon = "📭", text }) => (
  <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
    <div style={{ fontSize: 40 }}>{icon}</div>
    <div style={{ marginTop: 10, fontSize: 14 }}>{text || "No data found"}</div>
  </div>
);

export const SuccessToast = ({ msg }) => (
  <div style={{ position: "fixed", bottom: 24, right: 24, background: "#16a34a", color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 700, fontSize: 13, zIndex: 99999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
    ✅ {msg}
  </div>
);
