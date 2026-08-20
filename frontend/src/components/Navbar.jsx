import { useState, useRef, useEffect } from "react";

const navConfig = [
  {
    label: "Vendor", key: "vendors",
    items: [
      { label: "➕ Create New Vendor", page: "vendor-add",    perm: "vendors_create" },
      { label: "📋 View All Vendors",  page: "vendor-list",   perm: "vendors_view"   },
      { label: "📒 Vendor Ledger",     page: "vendor-ledger", perm: "vendors_view"   },
      { label: "💸 Vendor Payout",     page: "vendor-payout", perm: "vendors_edit"   },
    ],
  },
  {
    label: "Products (Inventory)", key: "products",
    items: [
      { label: "➕ Add Product",    page: "product-add",   perm: "products_create" },
      { label: "📦 View Products",  page: "product-list",  perm: "products_view"   },
      { label: "📊 Product Stocks", page: "product-stock", perm: "products_stock"  },
    ],
  },
  {
    label: "Customers", key: "customers",
    items: [
      { label: "👤 View Customers", page: "customer-list", perm: "customers_view"   },
      { label: "➕ Add Customer",   page: "customer-add",  perm: "customers_create" },
    ],
  },
  {
    label: "Employees", key: "employees",
    items: [
      { label: "Attendance & Salary", page: "employee-management", perm: "employees_view" },
    ],
  },
  {
    label: "Sales", key: "sales",
    items: [
      { label: "🧾 Create Sale / Invoice", page: "sale-create",     perm: "sales_create"     },
      { label: "📋 All Sales",             page: "sales-list",      perm: "sales_view"       },
      { label: "📈 Sales Report",          page: "sales-report",    perm: "reports_sales"    },
      { label: "Staff Sales Report",       page: "staff-sales-report", perm: "reports_sales" },
    ],
  },
  {
    label: "Purchase", key: "purchase",
    items: [
      { label: "🛒 Create Purchase",       page: "purchase-create", perm: "purchases_create" },
      { label: "📦 All Purchases",         page: "purchases-list",  perm: "purchases_view"   },
      { label: "🧮 GST Report",            page: "gst-report",      perm: "reports_gst"      },
    ],
  },
  {
    label: "Reports", key: "reports",
    items: [
      { label: "📈 Sales Graphs",  page: "report-graphs", perm: "reports_graphs" },
      { label: "🚀 Growth Report", page: "report-growth", perm: "reports_graphs" },
      { label: "Staff Sales",     page: "staff-sales-report", perm: "reports_sales" },
    ],
  },
];

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

export default function Navbar({ page, navigate, user, onLogout }) {
  const [open,         setOpen]         = useState(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [mobileExpand, setMobileExpand] = useState(null);
  const ref      = useRef(null);
  const isMobile = useIsMobile();

  // ── Permission check — computed directly from user prop (no context needed) ──
  const isAdmin = user?.role === "admin";

  const can = (perm) => {
    if (!user) return false;
    if (isAdmin) return true;
    const perms = user.permissions;
    if (!perms || perms === "all") return true;
    // perms can be a plain object or Map-serialized object
    if (typeof perms === "object") return perms[perm] === true;
    return false;
  };

  // Filter: admin sees everything, staff sees only permitted items
  const visibleItems = (items) =>
    isAdmin ? items : items.filter(item => !item.perm || can(item.perm));

  const visibleConfig = navConfig
    .map(nav => ({ ...nav, items: visibleItems(nav.items) }))
    .filter(nav => nav.items.length > 0);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileExpand(null);
  }, [page]);

  const handleLogout = () => {
    if (confirm("Do you want to Logout?")) onLogout();
  };

  const goTo = (pg) => {
    navigate(pg);
    setOpen(null);
    setMobileOpen(false);
    setMobileExpand(null);
  };

  return (
    <nav ref={ref} style={{ position: "sticky", top: 0, zIndex: 1000 }}>

      {/* ── Top black bar ── */}
      <div style={{ background: "#111827", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: 52 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "#2dd4bf", color: "#042f2e", fontWeight: 900, fontSize: 14, padding: "4px 10px", borderRadius: 5, letterSpacing: "-0.5px", border: "2px solid rgba(255,255,255,0.9)" }}>
            🏠 FROST MASTER
          </div>
          {!isMobile && <div style={{ fontSize: 9, color: "#9ca3af" }}>Inventory Manager</div>}
        </div>

        {/* Desktop right side */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
            <span style={{ color: "#d1d5db" }}>
              Welcome: <strong style={{ color: "#14b8a6" }}>{user?.name || user?.username}</strong>
              <span style={{ marginLeft: 6, background: isAdmin ? "#7c3aed" : "#0ea5e9", color: "#fff", fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                {isAdmin ? "ADMIN" : "STAFF"}
              </span>
            </span>
            {isAdmin && (
              <button onClick={() => goTo("staff-management")}
                style={{ background: page === "staff-management" ? "#7c3aed" : "rgba(124,58,237,0.18)", border: "1px solid #7c3aed", color: page === "staff-management" ? "#fff" : "#c4b5fd", padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                👥 Staff
              </button>
            )}
            <button onClick={handleLogout}
              style={{ background: "none", border: "1px solid #374151", color: "#d1d5db", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              ⎋ Logout
            </button>
          </div>
        )}

        {/* Mobile right side */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#14b8a6", fontWeight: 700 }}>
              {user?.name || user?.username}
              <span style={{ marginLeft: 5, background: isAdmin ? "#7c3aed" : "#0ea5e9", color: "#fff", fontSize: 8, padding: "1px 5px", borderRadius: 10, fontWeight: 700 }}>
                {isAdmin ? "ADMIN" : "STAFF"}
              </span>
            </span>
            <button onClick={() => setMobileOpen(v => !v)}
              style={{ background: "none", border: "1px solid #374151", color: "#d1d5db", width: 36, height: 36, borderRadius: 6, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: 0 }}>
              {mobileOpen
                ? <span style={{ fontSize: 18, lineHeight: 1, color: "#14b8a6" }}>✕</span>
                : <>
                    <span style={{ width: 18, height: 2, background: "#d1d5db", borderRadius: 2, display: "block" }} />
                    <span style={{ width: 18, height: 2, background: "#d1d5db", borderRadius: 2, display: "block" }} />
                    <span style={{ width: 18, height: 2, background: "#d1d5db", borderRadius: 2, display: "block" }} />
                  </>
              }
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop yellow navbar ── */}
      {!isMobile && (
        <div style={{ background: "#0f766e", padding: "0 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          <ul style={{ display: "flex", flexWrap: "wrap", listStyle: "none", margin: 0, padding: 0, gap: 0 }}>

            {/* Dashboard — always visible */}
            <li>
              <button onClick={() => goTo("dashboard")}
                style={{ padding: "12px 14px", fontWeight: 700, fontSize: 12.5, color: "#ecfeff", cursor: "pointer", border: "none", background: page === "dashboard" ? "rgba(255,255,255,0.16)" : "none", borderRadius: page === "dashboard" ? 4 : 0 }}>
                📊 Dashboard
              </button>
            </li>

            {/* All other nav sections */}
            {visibleConfig.map(nav => {
              const isOpen   = open === nav.key;
              const isActive = nav.items.some(i => i.page === page);
              return (
                <li key={nav.key} style={{ position: "relative" }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : nav.key)}
                    onMouseEnter={e => { if (!isActive && !isOpen) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                    onMouseLeave={e => { if (!isActive && !isOpen) e.currentTarget.style.background = "none"; }}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 14px", fontWeight: 700, fontSize: 12.5, color: "#ecfeff", cursor: "pointer", whiteSpace: "nowrap", border: "none", background: isActive || isOpen ? "rgba(255,255,255,0.16)" : "none", borderRadius: isActive || isOpen ? 4 : 0, transition: "background 0.15s" }}>
                    {nav.label}
                    <span style={{ fontSize: 9, marginLeft: 2, display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
                  </button>

                  {isOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", minWidth: 220, border: "1px solid #cbd5e1", borderRadius: 4, boxShadow: "0 6px 20px rgba(0,0,0,0.18)", zIndex: 9999 }}>
                      {nav.items.map((item, i) => (
                        <a key={i} href="#"
                          onClick={e => { e.preventDefault(); goTo(item.page); }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f0fdfa"}
                          onMouseLeave={e => e.currentTarget.style.background = page === item.page ? "#ccfbf1" : "transparent"}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", color: "#0f172a", textDecoration: "none", fontWeight: 600, fontSize: 12.5, borderBottom: i < nav.items.length - 1 ? "1px solid #e2e8f0" : "none", background: page === item.page ? "#ccfbf1" : "transparent" }}>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Mobile drawer ── */}
      {isMobile && mobileOpen && (
        <div style={{ position: "fixed", top: 52, left: 0, right: 0, bottom: 0, zIndex: 9998 }}>
          <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
          <div style={{ position: "relative", zIndex: 1, background: "#0f766e", width: "80%", maxWidth: 300, height: "100%", overflowY: "auto", boxShadow: "4px 0 20px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>

            <button onClick={() => goTo("dashboard")}
              style={{ width: "100%", textAlign: "left", padding: "14px 18px", fontWeight: 700, fontSize: 13, color: "#ecfeff", border: "none", borderBottom: "1px solid rgba(255,255,255,0.14)", cursor: "pointer", background: page === "dashboard" ? "rgba(255,255,255,0.16)" : "transparent" }}>
              📊 Dashboard
            </button>

            {visibleConfig.map(nav => {
              const isExpanded = mobileExpand === nav.key;
              const isActive   = nav.items.some(i => i.page === page);
              return (
                <div key={nav.key}>
                  <button onClick={() => setMobileExpand(isExpanded ? null : nav.key)}
                    style={{ width: "100%", textAlign: "left", padding: "14px 18px", fontWeight: 700, fontSize: 13, color: "#ecfeff", border: "none", borderBottom: "1px solid rgba(255,255,255,0.14)", cursor: "pointer", background: isActive || isExpanded ? "rgba(255,255,255,0.14)" : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{nav.label}</span>
                    <span style={{ fontSize: 10, display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                  </button>
                  {isExpanded && (
                    <div style={{ background: "rgba(15,23,42,0.18)" }}>
                      {nav.items.map((item, i) => (
                        <a key={i} href="#"
                          onClick={e => { e.preventDefault(); goTo(item.page); }}
                          style={{ display: "block", padding: "12px 28px", color: "#ecfeff", textDecoration: "none", fontWeight: 600, fontSize: 12.5, borderBottom: i < nav.items.length - 1 ? "1px solid rgba(255,255,255,0.12)" : "none", background: page === item.page ? "rgba(255,255,255,0.14)" : "transparent" }}>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isAdmin && (
              <button onClick={() => goTo("staff-management")}
                style={{ width: "100%", textAlign: "left", padding: "14px 18px", fontWeight: 700, fontSize: 13, color: page === "staff-management" ? "#c4b5fd" : "#ecfeff", border: "none", borderBottom: "1px solid rgba(255,255,255,0.14)", cursor: "pointer", background: page === "staff-management" ? "rgba(124,58,237,0.18)" : "transparent" }}>
                👥 Staff Management
              </button>
            )}

            <div style={{ marginTop: "auto", borderTop: "1px solid rgba(0,0,0,0.15)", padding: 16 }}>
              <button onClick={handleLogout}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 7, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#ecfeff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                ⎋ Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
