import { useState, useEffect, useId, useRef } from "react";
import "./Navbar.css";

const navConfig = [
  {
    label: "Vendors", key: "vendors", icon: "truck",
    items: [
      { label: "Create New Vendor", page: "vendor-add",    perm: "vendors_create" },
      { label: "View All Vendors",  page: "vendor-list",   perm: "vendors_view"   },
      { label: "Vendor Ledger",     page: "vendor-ledger", perm: "vendors_view"   },
      { label: "Vendor Payout",     page: "vendor-payout", perm: "vendors_edit"   },
    ],
  },
  {
    label: "Products", key: "products", icon: "box",
    items: [
      { label: "Add Product",    page: "product-add",   perm: "products_create" },
      { label: "View Products",  page: "product-list",  perm: "products_view"   },
      { label: "Product Stocks", page: "product-stock", perm: "products_stock"  },
    ],
  },
  {
    label: "Customers", key: "customers", icon: "users",
    items: [
      { label: "View Customers", page: "customer-list", perm: "customers_view"   },
      { label: "Add Customer",   page: "customer-add",  perm: "customers_create" },
    ],
  },
  {
    label: "Employees", key: "employees", icon: "calendar",
    items: [
      { label: "Attendance & Salary", page: "employee-management", perm: "employees_view" },
    ],
  },
  {
    label: "Sales", key: "sales", icon: "receipt",
    items: [
      { label: "Quotations",         page: "quotations-list",    perm: "sales_view"    },
      { label: "All Orders",         page: "orders-list",        perm: "sales_view"    },
      { label: "Ready to Dispatch",  page: "dispatch-ready",     perm: "sales_view"    },
      { label: "All Sales",          page: "sales-list",         perm: "sales_view"    },
      { label: "Staff Sales Report", page: "staff-sales-report", perm: "reports_sales" },
    ],
  },
  {
    label: "Complaints", key: "complaints", icon: "message",
    items: [
      { label: "Active Complaints", page: "complaints-active", perm: "complaints_view" },
      { label: "Solved Complaints", page: "complaints-solved", perm: "complaints_view" },
    ],
  },
  {
    label: "Purchase", key: "purchase", icon: "cart",
    items: [
      { label: "Create Purchase", page: "purchase-create", perm: "purchases_create" },
      { label: "All Purchases",   page: "purchases-list",  perm: "purchases_view"   },
      { label: "GST Report",      page: "gst-report",      perm: "reports_gst"      },
    ],
  },
  {
    label: "Reports", key: "reports", icon: "chart",
    items: [
      { label: "Sales Graphs",  page: "report-graphs",      perm: "reports_graphs" },
      { label: "Growth Report", page: "report-growth",      perm: "reports_graphs" },
      { label: "Staff Sales",   page: "staff-sales-report", perm: "reports_sales"  },
    ],
  },
];

const ICONS = {
  grid: <><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>,
  truck: <><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3.5V16h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17.5" cy="18" r="2" /></>,
  box: <><path d="M21 8 12 3 3 8l9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m9 16 2 2 4-4" /></>,
  receipt: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
  message: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></>,
  cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="19" cy="20" r="1.4" /><path d="M1.5 2h3.5l2.7 12.4a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22.5 6H6" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 6-7" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h10" /></>,
  close: <><path d="M18 6 6 18M6 6l12 12" /></>,
  chevron: <><path d="m6 9 6 6 6-6" /></>,
  back: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  home: <><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" /></>,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
};

const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

export const LogoMark = ({ size = 38 }) => {
  // Unique gradient id: a hidden duplicate logo (e.g. display:none panel) must not own the gradient.
  const gradId = `fmLogoGrad${useId().replace(/:/g, "")}`;
  return (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill={`url(#${gradId})`} />
    <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none">
      <path d="M20 9v22M10.5 14.5l19 11M29.5 14.5l-19 11" />
      <path d="M17 10.8l3 2.6 3-2.6M17 29.2l3-2.6 3 2.6" strokeWidth="1.8" />
    </g>
  </svg>
  );
};

// Quick-access tabs shown at the bottom of the screen on phones.
const mobileTabs = [
  { label: "Home",      page: "dashboard",     icon: "grid" },
  { label: "Sales",     page: "sales-list",    icon: "receipt", perm: "sales_view"     },
  { label: "Stock",     page: "product-stock", icon: "box",     perm: "products_stock" },
  { label: "Customers", page: "customer-list", icon: "users",   perm: "customers_view" },
];

/*
 * On phones, data tables are shown as stacked cards (see index.css `.fm-cards`).
 * This copies each column header onto its cells as data-label so a card can show "Label: value".
 */
function labelTables(root) {
  root.querySelectorAll("table").forEach(table => {
    const headRow = table.tHead?.rows[table.tHead.rows.length - 1];
    if (!headRow) return;
    const labels = [];
    for (const th of headRow.cells) {
      for (let i = 0; i < (th.colSpan || 1); i++) labels.push(th.textContent.trim());
    }
    if (!labels.some(Boolean)) return;
    table.classList.add("fm-cards");
    for (const body of table.tBodies) {
      for (const row of body.rows) {
        let col = 0;
        for (const td of row.cells) {
          const label = (td.colSpan || 1) === 1 ? labels[col] || "" : "";
          if (td.getAttribute("data-label") !== label) td.setAttribute("data-label", label);
          col += td.colSpan || 1;
        }
      }
    }
  });
}

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "U";

export default function Navbar({ page, navigate, onBack, user, onLogout, label, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded,   setExpanded]   = useState(() => new Set());
  const contentRef = useRef(null);

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

  // Show only the section holding the current page; close the mobile drawer on navigation.
  useEffect(() => {
    const active = navConfig.find(nav => nav.items.some(i => i.page === page));
    if (active) setExpanded(new Set([active.key]));
    setMobileOpen(false);
  }, [page]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    let frame = 0;
    const run = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => labelTables(root)); };
    run();
    const observer = new MutationObserver(run);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggle = (key) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleLogout = () => {
    if (confirm("Do you want to Logout?")) onLogout();
  };

  const goTo = (pg) => {
    navigate(pg);
    setMobileOpen(false);
  };

  const displayName = user?.name || user?.username;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="fm-shell">
      {/* ── Sidebar ── */}
      <aside className={`fm-sidebar ${mobileOpen ? "fm-sidebar-open" : ""}`} aria-label="Main navigation">
        <div className="fm-brand">
          <LogoMark size={38} />
          <div>
            <strong>Frost Master</strong>
            <span>Inventory Manager</span>
          </div>
          <button className="fm-icon-btn fm-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>

        <nav className="fm-nav">
          <button
            className={`fm-nav-link ${page === "dashboard" ? "fm-active" : ""}`}
            onClick={() => goTo("dashboard")}
          >
            <span className="fm-nav-icon"><Icon name="grid" /></span>
            <span className="fm-grow">Dashboard</span>
          </button>

          <div className="fm-nav-caption">Workspace</div>

          {visibleConfig.map(nav => {
            const isOpen   = expanded.has(nav.key);
            const isActive = nav.items.some(i => i.page === page);
            return (
              <div key={nav.key} className={`fm-group ${isOpen ? "fm-group-open" : ""}`}>
                <button
                  className={`fm-nav-link ${isActive ? "fm-parent-active" : ""}`}
                  onClick={() => toggle(nav.key)}
                  aria-expanded={isOpen}
                  title={nav.label}
                >
                  <span className="fm-nav-icon"><Icon name={nav.icon} /></span>
                  <span className="fm-grow">{nav.label}</span>
                  <span className="fm-chevron"><Icon name="chevron" size={15} /></span>
                </button>
                <div className="fm-sub">
                  <div className="fm-sub-inner">
                    {nav.items.map(item => (
                      <a
                        key={item.page + item.label}
                        href="#"
                        className={`fm-sub-link ${page === item.page ? "fm-active" : ""}`}
                        onClick={e => { e.preventDefault(); goTo(item.page); }}
                        tabIndex={isOpen ? 0 : -1}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {isAdmin && (
            <>
              <div className="fm-nav-caption">Admin</div>
              <button
                className={`fm-nav-link ${page === "staff-management" ? "fm-active" : ""}`}
                onClick={() => goTo("staff-management")}
              >
                <span className="fm-nav-icon"><Icon name="shield" /></span>
                <span className="fm-grow">Staff Management</span>
              </button>
            </>
          )}
        </nav>

        <div className="fm-user-card">
          <div className="fm-avatar">{initials(displayName)}</div>
          <div className="fm-user-meta">
            <strong>{displayName}</strong>
            <span className={isAdmin ? "fm-role fm-role-admin" : "fm-role"}>{isAdmin ? "Admin" : "Staff"}</span>
          </div>
          <button className="fm-icon-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fm-scrim" onClick={() => setMobileOpen(false)} />}

      {/* ── Main column ── */}
      <div className="fm-main">
        <header className="fm-topbar">
          <button className="fm-icon-btn fm-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>

          {page !== "dashboard" && onBack && (
            <button className="fm-back-btn" onClick={onBack} aria-label="Go back" title="Go back">
              <Icon name="back" size={16} />
              <span>Back</span>
            </button>
          )}

          <div className="fm-crumbs">
            <button onClick={() => goTo("dashboard")} className="fm-crumb-home">
              <Icon name="home" size={15} />
              <span>Home</span>
            </button>
            <span className="fm-crumb-sep">/</span>
            <span className="fm-crumb-current">{label}</span>
          </div>

          <div className="fm-top-right">
            <span className="fm-date-pill">{today}</span>
            <div className="fm-top-user">
              <div className="fm-avatar fm-avatar-sm">{initials(displayName)}</div>
              <div className="fm-top-user-meta">
                <strong>{displayName}</strong>
                <span>{isAdmin ? "Administrator" : "Staff member"}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="fm-content" ref={contentRef}>
          {children}
        </main>
      </div>

      {/* ── Phone bottom tabs ── */}
      <nav className="fm-tabbar" aria-label="Quick navigation">
        {mobileTabs.filter(t => !t.perm || can(t.perm)).map(t => (
          <button key={t.page} className={`fm-tab ${page === t.page ? "fm-active" : ""}`} onClick={() => goTo(t.page)}>
            <Icon name={t.icon} size={19} />
            <span>{t.label}</span>
          </button>
        ))}
        <button className={`fm-tab ${mobileOpen ? "fm-active" : ""}`} onClick={() => setMobileOpen(true)}>
          <Icon name="more" size={19} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
