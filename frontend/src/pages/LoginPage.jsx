import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

/* ══ Icons ══ */
const EyeIcon = ({ open }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ══ Logo ══ */
const LogoMark = ({ size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 38 38" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#0f766e" />
      </linearGradient>
    </defs>
    <rect width="38" height="38" rx="10" fill="url(#logoGrad)" />
    <path d="M6 18 L19 8 L32 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M10 17 L10 29 L28 29 L28 17" fill="white" opacity="0.12" />
    <path d="M10 17 L10 29 L28 29 L28 17" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="none" opacity="0.5" />
    <rect x="16" y="22" width="6" height="7" rx="1" fill="white" opacity="0.95" />
    <rect x="11" y="19" width="4" height="4" rx="0.8" fill="white" opacity="0.6" />
    <rect x="23" y="19" width="4" height="4" rx="0.8" fill="white" opacity="0.6" />
  </svg>
);

/* ══ Animated dashboard-mockup illustration ══ */
const DashboardIllustration = () => {
  const bars = [
    { h: 34, delay: 0,   color: "#2dd4bf" },
    { h: 52, delay: 0.1, color: "#38bdf8" },
    { h: 26, delay: 0.2, color: "#f59e0b" },
    { h: 44, delay: 0.3, color: "#a78bfa" },
    { h: 60, delay: 0.4, color: "#2dd4bf" },
  ];
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 300, margin: "0 auto" }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "20px 22px 22px",
          backdropFilter: "blur(6px)",
          boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6)",
        }}
      >
        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} />
          </div>
          <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em", fontWeight: 700 }}>LIVE STOCK</div>
        </div>

        {/* bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 72, marginBottom: 16 }}>
          {bars.map((b, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: b.h }}
              transition={{ duration: 0.8, delay: 0.4 + b.delay, ease: "easeOut" }}
              style={{
                flex: 1, borderRadius: 6,
                background: `linear-gradient(180deg, ${b.color} 0%, ${b.color}55 100%)`,
                boxShadow: `0 0 16px -2px ${b.color}88`,
              }}
            />
          ))}
        </div>

        {/* rows */}
        {[
          { label: "Refrigerators", val: "128 units", color: "#38bdf8" },
          { label: "Kitchen Appliances", val: "342 units", color: "#f59e0b" },
        ].map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.9 + i * 0.12 }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 0", borderTop: i === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.color }} />
              <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600 }}>{row.label}</span>
            </div>
            <span style={{ fontSize: 11, color: "#64748b" }}>{row.val}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* floating badges */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={{ opacity: { delay: 0.9, duration: 0.5 }, scale: { delay: 0.9, duration: 0.5 }, y: { delay: 1.4, duration: 3.2, repeat: Infinity, ease: "easeInOut" } }}
        style={{
          position: "absolute", top: -14, right: -10, width: 44, height: 44, borderRadius: 12,
          background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          backdropFilter: "blur(4px)",
        }}
      >❄️</motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.05, duration: 0.5 }, scale: { delay: 1.05, duration: 0.5 }, y: { delay: 1.6, duration: 3.6, repeat: Infinity, ease: "easeInOut" } }}
        style={{
          position: "absolute", bottom: -12, left: -14, width: 40, height: 40, borderRadius: 12,
          background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          backdropFilter: "blur(4px)",
        }}
      >⚡</motion.div>
    </div>
  );
};

/* ══ Category Card ══ */
const CategoryCard = ({ emoji, label, sublabel, glow, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.18)" }}
    style={{
      display: "flex", alignItems: "center", gap: 10, borderRadius: 12,
      padding: "10px 12px", border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.03)", cursor: "default",
    }}
  >
    <div style={{
      width: 30, height: 30, borderRadius: 8, background: glow,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, flexShrink: 0,
    }}>
      {emoji}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{sublabel}</div>
    </div>
    <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
      background: "#34d399", flexShrink: 0, boxShadow: "0 0 8px #34d399" }} />
  </motion.div>
);

/* ══ Input wrapper ══ */
const InputWrap = ({ focused, children }) => (
  <div style={{
    display: "flex", alignItems: "center",
    background: "rgba(255,255,255,0.04)",
    border: `1.5px solid ${focused ? "#2dd4bf" : "rgba(255,255,255,0.09)"}`,
    borderRadius: 12, transition: "border 0.2s, box-shadow 0.2s",
    boxShadow: focused ? "0 0 0 4px rgba(45,212,191,0.12)" : "none",
  }}>
    {children}
  </div>
);

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function LoginPage() {
  const { login }                     = useAuth();
  const [username,  setUsername]      = useState("");
  const [password,  setPassword]      = useState("");
  const [showPass,  setShowPass]      = useState(false);
  const [loading,   setLoading]       = useState(false);
  const [error,     setError]         = useState("");
  const [focused,   setFocused]       = useState(null);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!username || !password) { setError("Put both username and password!"); return; }
    setLoading(true); setError("");
    try {
      await login(username.trim(), password);
      // AuthContext sets user + justLoggedIn → App.jsx shows welcome transition, then dashboard
    } catch (err) {
      setError(err.message || "Login failed. Check credentials.");
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === "Enter") handleSubmit(); };

  /* ── shared input style ── */
  const inputStyle = {
    flex: 1, padding: "12px 10px", fontSize: 14, color: "#f1f5f9",
    background: "transparent", outline: "none", border: "none",
    fontFamily: "'Segoe UI',sans-serif",
  };
  const iconWrap = {
    paddingLeft: 14, color: "#64748b", display: "flex",
    alignItems: "center", flexShrink: 0,
  };
  const labelStyle = {
    display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: "#05070d",
      display: "flex", fontFamily: "'Segoe UI',sans-serif",
      color: "#e2e8f0", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient animated glows */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: -140, left: -120, width: 420, height: 420, borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(45,212,191,0.14) 0%, transparent 65%)" }}
      />
      <motion.div
        animate={{ x: [0, -24, 0], y: [0, -16, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", bottom: -160, right: -140, width: 460, height: 460, borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(245,158,11,0.09) 0%, transparent 65%)" }}
      />
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.5,
        backgroundImage: `
          repeating-linear-gradient(22.5deg,  transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 3px, transparent 3px, transparent 8px),
          repeating-linear-gradient(67.5deg,  transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 3px, transparent 3px, transparent 8px)
        `,
      }} />

      {/* ══ LEFT PANEL ══ */}
      <div
        style={{
          width: "48%", flexDirection: "column", justifyContent: "space-between",
          padding: "36px 40px", borderRight: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 1,
        }}
        className="left-panel"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <LogoMark size={40} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.04em",
              fontFamily: "Georgia,serif", lineHeight: 1 }}>FROST MASTER</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b",
              letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 3 }}>Inventory Manager</div>
          </div>
        </motion.div>

        {/* Middle content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.25)", borderRadius: 999,
                padding: "4px 12px", marginBottom: 14 }}
            >
              <motion.span
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#2dd4bf" }}
              />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#5eead4", letterSpacing: "0.05em" }}>
                Smart Home Inventory
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              style={{ fontSize: 30, fontWeight: 700, color: "#f8fafc", lineHeight: 1.15,
                letterSpacing: "-0.02em", fontFamily: "Georgia,serif", margin: 0 }}
            >
              Track everything<br />
              <span style={{ color: "#64748b" }}>in your home.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26 }}
              style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.7, marginTop: 10,
                maxWidth: 280 }}
            >
              Vendors, products, customers — manage purchases, sales and payments all in one place.
            </motion.p>
          </div>

          {/* Illustration */}
          <DashboardIllustration />

          {/* Category cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <CategoryCard emoji="🍳" label="Kitchen & Utensils"  sublabel="Pots, pans & more"   glow="rgba(245,158,11,0.14)" delay={1.0} />
            <CategoryCard emoji="❄️" label="Refrigerator Items"  sublabel="Cold storage items"   glow="rgba(56,189,248,0.14)" delay={1.08} />
            <CategoryCard emoji="⚡" label="Electronics"          sublabel="Gadgets & devices"    glow="rgba(167,139,250,0.14)" delay={1.16} />
            <CategoryCard emoji="🏠" label="Home Appliances"      sublabel="Washing, AC & more"   glow="rgba(52,211,153,0.14)" delay={1.24} />
          </div>
        </div>

        {/* Footer */}
        <p style={{ fontSize: 10.5, color: "#475569", textAlign: "center" }}>
          © 2026 FROST MASTER · All rights reserved
        </p>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px", position: "relative", zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "100%", maxWidth: 380,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20, padding: "36px 32px",
            backdropFilter: "blur(10px)",
            boxShadow: "0 30px 80px -30px rgba(0,0,0,0.55)",
          }}
        >

          {/* Mobile logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}
            className="mobile-logo">
            <LogoMark size={34} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#f8fafc",
                letterSpacing: "-0.03em", fontFamily: "Georgia,serif" }}>FROST MASTER</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b",
                letterSpacing: "0.2em", textTransform: "uppercase" }}>Inventory Manager</div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em",
              lineHeight: 1.2, fontFamily: "Georgia,serif", margin: "0 0 6px 0" }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              Sign in to manage your inventory
            </p>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: "hidden" }}
              >
                <motion.div
                  animate={{ x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                  style={{
                    background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 10,
                    padding: "11px 14px", color: "#fca5a5", fontSize: 12.5,
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 18,
                  }}
                >
                  <span>⚠️</span> {error}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Username */}
            <div>
              <label style={labelStyle}>Username</label>
              <InputWrap focused={focused === "username"}>
                <span style={iconWrap}><UserIcon /></span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  onKeyDown={handleKey}
                  placeholder="e.g. admin"
                  autoFocus
                  style={inputStyle}
                />
              </InputWrap>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <InputWrap focused={focused === "password"}>
                <span style={iconWrap}><LockIcon /></span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  onKeyDown={handleKey}
                  placeholder="••••••••••••"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ paddingRight: 14, color: "#64748b", background: "none",
                    border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <EyeIcon open={showPass} />
                </button>
              </InputWrap>
            </div>

            {/* Submit */}
            <motion.button
              onClick={handleSubmit}
              disabled={loading}
              whileHover={!loading ? { scale: 1.015 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                background: loading ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
                color: loading ? "#94a3b8" : "#04140f", fontSize: 14, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: loading ? "none"
                  : "0 8px 24px -6px rgba(45,212,191,0.45)",
                letterSpacing: "0.01em",
                marginTop: 4,
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <motion.svg
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                      style={{ width: 16, height: 16 }}
                      viewBox="0 0 24 24" fill="none"
                    >
                      <circle cx="12" cy="12" r="10" stroke="rgba(148,163,184,0.35)" strokeWidth="4" />
                      <path fill="#94a3b8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </motion.svg>
                    Signing in…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    Sign in to FROST MASTER
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Trust strip */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {[
              { emoji: "🔒", label: "Secure Login" },
              { emoji: "☁️", label: "Cloud Sync" },
              { emoji: "📱", label: "All Devices" },
            ].map(({ emoji, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>{emoji}</span>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Demo credentials box */}
          <div style={{
            marginTop: 20, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "13px 15px",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
              🧪 Demo Credentials (seed data)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#94a3b8" }}>
              <div>
                Admin: &nbsp;
                <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4,
                  fontSize: 11, fontFamily: "monospace", color: "#e2e8f0" }}>admin</code>
                &nbsp;/&nbsp;
                <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4,
                  fontSize: 11, fontFamily: "monospace", color: "#e2e8f0" }}>admin123</code>
              </div>
              <div>
                Staff: &nbsp;&nbsp;
                <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4,
                  fontSize: 11, fontFamily: "monospace", color: "#e2e8f0" }}>priya</code>
                &nbsp;/&nbsp;
                <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4,
                  fontSize: 11, fontFamily: "monospace", color: "#e2e8f0" }}>priya123</code>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Show left panel on large screens */}
      <style>{`
        .left-panel { display: none; }
        .mobile-logo { display: flex; }
        @media (min-width: 1024px) {
          .left-panel  { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
