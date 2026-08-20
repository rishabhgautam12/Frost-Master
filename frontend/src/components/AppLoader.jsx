import { motion } from "framer-motion";

const LogoMark = ({ size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 38 38" fill="none">
    <defs>
      <linearGradient id="loaderLogoGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#0f766e" />
      </linearGradient>
    </defs>
    <rect width="38" height="38" rx="10" fill="url(#loaderLogoGrad)" />
    <path d="M6 18 L19 8 L32 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M10 17 L10 29 L28 29 L28 17" fill="white" opacity="0.12" />
    <path d="M10 17 L10 29 L28 29 L28 17" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="none" opacity="0.5" />
    <rect x="16" y="22" width="6" height="7" rx="1" fill="white" opacity="0.95" />
    <rect x="11" y="19" width="4" height="4" rx="0.8" fill="white" opacity="0.6" />
    <rect x="23" y="19" width="4" height="4" rx="0.8" fill="white" opacity="0.6" />
  </svg>
);

const Shell = ({ children }) => (
  <div style={{
    minHeight: "100vh", width: "100%", background: "#05070d",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Segoe UI',sans-serif", position: "relative", overflow: "hidden",
  }}>
    <motion.div
      animate={{ x: [0, 26, 0], y: [0, 16, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "absolute", top: -140, left: -120, width: 380, height: 380, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(45,212,191,0.14) 0%, transparent 65%)" }}
    />
    <motion.div
      animate={{ x: [0, -20, 0], y: [0, -14, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "absolute", bottom: -160, right: -140, width: 420, height: 420, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(245,158,11,0.09) 0%, transparent 65%)" }}
    />
    {children}
  </div>
);

const Dots = () => (
  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        style={{ width: 6, height: 6, borderRadius: "50%", background: "#2dd4bf" }}
      />
    ))}
  </div>
);

/* Shown while the app checks an existing session (before the login page appears) */
export function AuthLoadingScreen() {
  return (
    <Shell>
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "inline-flex", position: "relative" }}
        >
          <motion.div
            animate={{ boxShadow: [
              "0 0 0px 0px rgba(45,212,191,0.35)",
              "0 0 0px 14px rgba(45,212,191,0)",
            ] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            style={{ borderRadius: 14 }}
          >
            <LogoMark size={56} />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          style={{ fontSize: 20, fontWeight: 900, color: "#f8fafc", marginTop: 18,
            fontFamily: "Georgia,serif", letterSpacing: "-0.02em" }}
        >
          FROST MASTER
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.45 }}
          style={{ fontSize: 11, color: "#64748b", marginTop: 6, marginBottom: 20,
            letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}
        >
          Preparing your workspace
        </motion.div>
        <Dots />
      </div>
    </Shell>
  );
}

/* Shown briefly right after a successful login, before the dashboard appears */
export function WelcomeTransition({ name }) {
  return (
    <Shell>
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto",
            background: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 8px rgba(45,212,191,0.1), 0 8px 30px -6px rgba(45,212,191,0.5)",
          }}
        >
          <motion.svg
            width="34" height="34" viewBox="0 0 24 24" fill="none"
            stroke="#04140f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          >
            <motion.path
              d="M4 12l6 6L20 6"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", marginTop: 20,
            fontFamily: "Georgia,serif", letterSpacing: "-0.02em" }}
        >
          Welcome back{name ? `, ${name}` : ""}!
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48, duration: 0.4 }}
          style={{ fontSize: 11, color: "#64748b", marginTop: 6, marginBottom: 20,
            letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}
        >
          Loading your dashboard
        </motion.div>
        <Dots />
      </div>
    </Shell>
  );
}
