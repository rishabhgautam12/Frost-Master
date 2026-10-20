import { motion } from "framer-motion";
import { LogoMark } from "./Navbar";

const Shell = ({ children }) => (
  <div style={{
    minHeight: "100vh", width: "100%", background: "#f4f6fb",
    display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden",
  }}>
    <motion.div
      animate={{ x: [0, 26, 0], y: [0, 16, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "absolute", top: -140, left: -120, width: 380, height: 380, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(167,139,250,0.28) 0%, transparent 65%)" }}
    />
    <motion.div
      animate={{ x: [0, -20, 0], y: [0, -14, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "absolute", bottom: -160, right: -140, width: 420, height: 420, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(236,72,153,0.24) 0%, transparent 65%)" }}
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
        style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }}
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
              "0 0 0px 0px rgba(124,58,237,0.35)",
              "0 0 0px 16px rgba(124,58,237,0)",
            ] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            style={{ borderRadius: 16 }}
          >
            <LogoMark size={56} />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          style={{ fontSize: 20, fontWeight: 900, color: "#0f1535", marginTop: 18,
            letterSpacing: "-0.02em" }}
        >
          Frost Master
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.45 }}
          style={{ fontSize: 11, color: "#6b7392", marginTop: 6, marginBottom: 20,
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
            background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 10px rgba(124,58,237,0.1), 0 14px 34px -10px rgba(124,58,237,0.6)",
          }}
        >
          <motion.svg
            width="34" height="34" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
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
          style={{ fontSize: 20, fontWeight: 800, color: "#0f1535", marginTop: 22,
            letterSpacing: "-0.02em" }}
        >
          Welcome back{name ? `, ${name}` : ""}!
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48, duration: 0.4 }}
          style={{ fontSize: 11, color: "#6b7392", marginTop: 6, marginBottom: 20,
            letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}
        >
          Loading your dashboard
        </motion.div>
        <Dots />
      </div>
    </Shell>
  );
}
