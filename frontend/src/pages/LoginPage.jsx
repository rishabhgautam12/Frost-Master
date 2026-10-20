import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { LogoMark } from "../components/Navbar";

/* ══ Icons ══ */
const EyeIcon = ({ open }) =>
  open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const UserIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ══ Animated dashboard-mockup illustration ══ */
const DashboardIllustration = () => {
  const bars = [
    { h: 34, delay: 0   },
    { h: 52, delay: 0.1 },
    { h: 28, delay: 0.2 },
    { h: 46, delay: 0.3 },
    { h: 64, delay: 0.4 },
  ];
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 320, margin: "0 auto" }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: 22,
          padding: "20px 22px 18px",
          boxShadow: "0 30px 60px -28px rgba(15,21,53,0.55)",
          color: "#0f1535",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#9aa1b9", fontWeight: 700, letterSpacing: "0.08em" }}>THIS MONTH</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 2 }}>₹4.8L</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#17855a", background: "#e3f5ec", padding: "4px 9px", borderRadius: 999 }}>▲ 12.4%</div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 72, marginBottom: 14 }}>
          {bars.map((b, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: b.h }}
              transition={{ duration: 0.8, delay: 0.4 + b.delay, ease: "easeOut" }}
              style={{
                flex: 1, borderRadius: 8,
                background: i === bars.length - 1
                  ? "linear-gradient(180deg, #a78bfa, #7c3aed)"
                  : "linear-gradient(180deg, #ede9fe, #ddd6fe)",
              }}
            />
          ))}
        </div>

        {[
          { label: "Refrigerators", val: "128 units", color: "#5a8be8" },
          { label: "Kitchen Appliances", val: "342 units", color: "#fb923c" },
        ].map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.9 + i * 0.12 }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 0", borderTop: "1px solid #eef0f6",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: row.color }} />
              <span style={{ fontSize: 11.5, color: "#3a4260", fontWeight: 600 }}>{row.label}</span>
            </div>
            <span style={{ fontSize: 11.5, color: "#6b7392", fontWeight: 600 }}>{row.val}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* floating badges */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={{ opacity: { delay: 0.9, duration: 0.5 }, scale: { delay: 0.9, duration: 0.5 }, y: { delay: 1.4, duration: 3.2, repeat: Infinity, ease: "easeInOut" } }}
        style={{
          position: "absolute", top: -16, right: -14, width: 46, height: 46, borderRadius: 14,
          background: "#fff", boxShadow: "0 12px 26px -10px rgba(15,21,53,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}
      >❄️</motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.05, duration: 0.5 }, scale: { delay: 1.05, duration: 0.5 }, y: { delay: 1.6, duration: 3.6, repeat: Infinity, ease: "easeInOut" } }}
        style={{
          position: "absolute", bottom: -14, left: -16, width: 42, height: 42, borderRadius: 14,
          background: "#fff", boxShadow: "0 12px 26px -10px rgba(15,21,53,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
        }}
      >⚡</motion.div>
    </div>
  );
};

/* ══ Category Card ══ */
const CategoryCard = ({ emoji, label, sublabel, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    whileHover={{ y: -2 }}
    style={{
      display: "flex", alignItems: "center", gap: 10, borderRadius: 14,
      padding: "10px 12px", border: "1px solid rgba(255,255,255,0.22)",
      background: "rgba(255,255,255,0.12)", cursor: "default",
      backdropFilter: "blur(6px)",
    }}
  >
    <div style={{
      width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.9)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 15, flexShrink: 0,
    }}>
      {emoji}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", marginTop: 1 }}>{sublabel}</div>
    </div>
  </motion.div>
);

/* ══ Input wrapper ══ */
const InputWrap = ({ focused, children }) => (
  <div style={{
    display: "flex", alignItems: "center",
    background: focused ? "#fff" : "#f7f8fd",
    border: `1.5px solid ${focused ? "#7c3aed" : "#e3e6f0"}`,
    borderRadius: 14, transition: "border 0.2s, box-shadow 0.2s, background 0.2s",
    boxShadow: focused ? "0 0 0 4px rgba(124,58,237,0.12)" : "none",
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
    flex: 1, minWidth: 0, padding: "13px 10px", fontSize: 14, color: "#0f1535",
    background: "transparent", outline: "none", border: "none", boxShadow: "none",
    fontFamily: "inherit",
  };
  const iconWrap = (on) => ({
    paddingLeft: 14, color: on ? "#7c3aed" : "#9aa1b9", display: "flex",
    alignItems: "center", flexShrink: 0, transition: "color 0.2s",
  });
  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 700, color: "#3a4260", marginBottom: 7,
  };
  const code = {
    background: "#fff", padding: "1px 7px", borderRadius: 6, border: "1px solid #e3e6f0",
    fontSize: 11.5, fontFamily: "ui-monospace, monospace", color: "#6d28d9",
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: "#f4f6fb",
      display: "flex", color: "#0f1535", position: "relative", overflow: "hidden",
    }}>
      {/* ══ LEFT PANEL ══ */}
      <div className="left-panel" style={{
        width: "50%", flexDirection: "column", justifyContent: "space-between",
        padding: "36px 44px", position: "relative", overflow: "hidden",
        background: "radial-gradient(700px 480px at 0% 0%, rgba(124,58,237,0.55), transparent 60%), radial-gradient(640px 520px at 100% 100%, rgba(219,39,119,0.42), transparent 60%), linear-gradient(160deg, #141a48 0%, #0f1535 60%, #170f3d 100%)",
        color: "#fff",
      }}>
        {/* Ambient soft glows */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", bottom: -180, right: -120, width: 460, height: 460, borderRadius: "50%", pointerEvents: "none",
            background: "radial-gradient(circle, rgba(236,72,153,0.55) 0%, transparent 65%)" }}
        />
        <motion.div
          animate={{ x: [0, -24, 0], y: [0, -16, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: -160, left: -140, width: 440, height: 440, borderRadius: "50%", pointerEvents: "none",
            background: "radial-gradient(circle, rgba(196,181,253,0.55) 0%, transparent 65%)" }}
        />
        <div style={{ position: "absolute", top: 90, right: -90, width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.14)", pointerEvents: "none" }} />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}
        >
          <div style={{ borderRadius: 13, boxShadow: "0 0 0 3px rgba(255,255,255,0.25)" }}><LogoMark size={42} /></div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>Frost Master</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.72)", letterSpacing: "0.06em", marginTop: 4 }}>Inventory Manager</div>
          </div>
        </motion.div>

        {/* Middle content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, position: "relative" }}>
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999,
                padding: "5px 12px", marginBottom: 16 }}
            >
              <motion.span
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#c6ecd9" }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>
                Smart Home Inventory
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", margin: 0 }}
            >
              Track everything<br />
              <span style={{ color: "rgba(255,255,255,0.7)" }}>in your home.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26 }}
              style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, marginTop: 12, maxWidth: 330 }}
            >
              Vendors, products, customers — manage purchases, sales and payments all in one place.
            </motion.p>
          </div>

          <DashboardIllustration />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 420 }}>
            <CategoryCard emoji="🍳" label="Kitchen & Utensils" sublabel="Pots, pans & more"  delay={1.0} />
            <CategoryCard emoji="❄️" label="Refrigerator Items" sublabel="Cold storage items"  delay={1.08} />
            <CategoryCard emoji="⚡" label="Electronics"         sublabel="Gadgets & devices"   delay={1.16} />
            <CategoryCard emoji="🏠" label="Home Appliances"     sublabel="Washing, AC & more"  delay={1.24} />
          </div>
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", position: "relative" }}>
          © 2026 FROST MASTER · All rights reserved
        </p>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 20px", position: "relative",
        background: "radial-gradient(600px 400px at 80% 0%, rgba(167,139,250,0.12), transparent 70%), radial-gradient(500px 360px at 10% 100%, rgba(236,72,153,0.10), transparent 70%)",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "100%", maxWidth: 410,
            background: "#fff",
            border: "1px solid #e6e9f2",
            borderRadius: 24, padding: "38px 34px",
            boxShadow: "0 30px 70px -36px rgba(15,21,53,0.35)",
          }}
        >
          {/* Mobile logo */}
          <div style={{ alignItems: "center", gap: 12, marginBottom: 28 }} className="mobile-logo">
            <LogoMark size={38} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Frost Master</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "#9aa1b9", letterSpacing: "0.04em" }}>Inventory Manager</div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 26 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, margin: "0 0 6px 0" }}>
              Welcome back 👋
            </h1>
            <p style={{ fontSize: 13.5, color: "#6b7392", margin: 0 }}>
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
                    background: "#fdeceb", border: "1px solid #f6cfcc", borderRadius: 12,
                    padding: "11px 14px", color: "#a33a35", fontSize: 12.5, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 18,
                  }}
                >
                  <span>⚠️</span> {error}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div>
              <label style={labelStyle}>Username</label>
              <InputWrap focused={focused === "username"}>
                <span style={iconWrap(focused === "username")}><UserIcon /></span>
                <input
                  className="login-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  onKeyDown={handleKey}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  autoFocus
                  style={inputStyle}
                />
              </InputWrap>
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <InputWrap focused={focused === "password"}>
                <span style={iconWrap(focused === "password")}><LockIcon /></span>
                <input
                  className="login-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  onKeyDown={handleKey}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} aria-label={showPass ? "Hide password" : "Show password"}
                  style={{ padding: "0 14px", height: 44, color: "#9aa1b9", background: "none",
                    border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <EyeIcon open={showPass} />
                </button>
              </InputWrap>
            </div>

            <motion.button
              onClick={handleSubmit}
              disabled={loading}
              whileHover={!loading ? { y: -1 } : {}}
              whileTap={!loading ? { scale: 0.985 } : {}}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none",
                background: loading ? "#ede9fe" : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)",
                color: loading ? "#8b5cf6" : "#fff", fontSize: 14, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: loading ? "none" : "0 14px 28px -12px rgba(124,58,237,0.7)",
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
                      <circle cx="12" cy="12" r="10" stroke="rgba(101,118,230,0.3)" strokeWidth="4" />
                      <path fill="#8b5cf6" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </motion.svg>
                    Signing in…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    Sign in to Frost Master
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Trust strip */}
          <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid #eef0f6",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            {[
              { emoji: "🔒", label: "Secure Login" },
              { emoji: "☁️", label: "Cloud Sync" },
              { emoji: "📱", label: "All Devices" },
            ].map(({ emoji, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>{emoji}</span>
                <span style={{ fontSize: 11.5, color: "#6b7392", fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Demo credentials box */}
          <div style={{
            marginTop: 18, background: "#f7f8fd", borderRadius: 14, padding: "13px 15px",
            border: "1px solid #eceef6",
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#3a4260", marginBottom: 7 }}>
              🧪 Demo Credentials (seed data)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "#6b7392" }}>
              <div>
                Admin: &nbsp;<code style={code}>admin</code>&nbsp;/&nbsp;<code style={code}>admin123</code>
              </div>
              <div>
                Staff: &nbsp;&nbsp;<code style={code}>priya</code>&nbsp;/&nbsp;<code style={code}>priya123</code>
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
