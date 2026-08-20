import { useEffect, useMemo, useState } from "react";
import { Badge, LoadingSpinner } from "../components/Shared";
import { dashboardAPI } from "../services/api";
import "./Dashboard.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const money = (value = 0) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
const shortMoney = (value = 0) => {
  const n = Math.round(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

function KPI({ label, value, sub, accent, tone, onClick }) {
  return (
    <button
      className={`dash-kpi ${onClick ? "dash-kpi-clickable" : ""}`}
      style={{ "--accent": accent }}
      onClick={onClick}
      type="button"
    >
      <span className={`dash-kpi-mark dash-kpi-mark-${tone}`} />
      <span className="dash-kpi-label">{label}</span>
      <strong className="dash-kpi-value">{value}</strong>
      <span className="dash-kpi-sub">{sub}</span>
    </button>
  );
}

function Panel({ title, meta, action, actionLabel, children, className = "" }) {
  return (
    <section className={`dash-panel ${className}`}>
      <div className="dash-panel-head">
        <div>
          <h3>{title}</h3>
          {meta && <p>{meta}</p>}
        </div>
        {action && (
          <button className="dash-link-btn" type="button" onClick={action}>
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyMini({ children = "No data yet" }) {
  return <div className="dash-empty">{children}</div>;
}

function RevenueAreaChart({ data }) {
  if (!data.length) return <EmptyMini>No sales trend yet</EmptyMini>;

  const width = 680;
  const height = 248;
  const pad = { top: 24, right: 18, bottom: 36, left: 56 };
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const min = Math.min(...data.map((d) => d.revenue), 0);
  const span = Math.max(max - min, 1);

  const x = (i) => pad.left + (i * (width - pad.left - pad.right)) / Math.max(data.length - 1, 1);
  const y = (v) => pad.top + (1 - (v - min) / span) * (height - pad.top - pad.bottom);
  const points = data.map((d, i) => `${x(i)},${y(d.revenue)}`).join(" ");
  const area = `${pad.left},${height - pad.bottom} ${points} ${x(data.length - 1)},${height - pad.bottom}`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const yy = pad.top + t * (height - pad.top - pad.bottom);
    const value = max - t * span;
    return { y: yy, value };
  });

  return (
    <div className="dash-chart-scroll">
      <svg className="dash-area-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly revenue chart">
        <defs>
          <linearGradient id="dashRevenueFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="dashRevenueLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        {gridLines.map((line, i) => (
          <g key={i}>
            <line x1={pad.left} x2={width - pad.right} y1={line.y} y2={line.y} className="dash-grid-line" />
            <text x={pad.left - 12} y={line.y + 4} textAnchor="end" className="dash-axis-text">
              {shortMoney(line.value).replace("₹", "")}
            </text>
          </g>
        ))}
        <polygon points={area} fill="url(#dashRevenueFill)" />
        <polyline points={points} fill="none" stroke="url(#dashRevenueLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={`${d.label}-${i}`}>
            <circle cx={x(i)} cy={y(d.revenue)} r="5" className="dash-point" />
            <text x={x(i)} y={height - 13} textAnchor="middle" className="dash-axis-text">{d.label}</text>
            <text x={x(i)} y={Math.max(13, y(d.revenue) - 12)} textAnchor="middle" className="dash-point-label">
              {shortMoney(d.revenue)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function OrdersBarChart({ data }) {
  if (!data.length) return <EmptyMini>No order data yet</EmptyMini>;
  const max = Math.max(...data.map((d) => d.orders), 1);

  return (
    <div className="dash-bars">
      {data.map((d, i) => (
        <div className="dash-bar-col" key={`${d.label}-${i}`}>
          <span>{d.orders}</span>
          <div className="dash-bar-track">
            <div
              className={i === data.length - 1 ? "dash-bar dash-bar-current" : "dash-bar"}
              style={{ height: `${Math.max(10, (d.orders / max) * 100)}%` }}
            />
          </div>
          <small>{d.label}</small>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ slices }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (!total) return <EmptyMini>No status data</EmptyMini>;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="dash-donut-wrap">
      <svg className="dash-donut" viewBox="0 0 120 120" role="img" aria-label="Sale status chart">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="18" />
        {slices.map((slice) => {
          const dash = (slice.value / total) * circumference;
          const strokeDashoffset = -offset;
          offset += dash;
          return (
            <circle
              key={slice.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 60 60)"
            />
          );
        })}
        <text x="60" y="56" textAnchor="middle" className="dash-donut-total">{total}</text>
        <text x="60" y="72" textAnchor="middle" className="dash-donut-caption">sales</text>
      </svg>
      <div className="dash-legend">
        {slices.map((slice) => (
          <div key={slice.label} className="dash-legend-row">
            <span><i style={{ background: slice.color }} />{slice.label}</span>
            <strong>{slice.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankRow({ index, label, value, max, color, sub }) {
  const width = max > 0 ? Math.max(5, (value / max) * 100) : 0;
  return (
    <div className="dash-rank-row">
      <div className="dash-rank-top">
        <span className="dash-rank-name"><b>#{index}</b>{label}</span>
        <strong>{money(value)}</strong>
      </div>
      {sub && <div className="dash-rank-sub">{sub}</div>}
      <div className="dash-rank-track">
        <div style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Dashboard({ navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI
      .getStats()
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const prepared = useMemo(() => {
    if (!data) return null;
    const trend = (data.monthlyTrend || []).map((item) => ({
      label: MONTHS[item._id.month - 1],
      revenue: Math.round(item.revenue || 0),
      orders: item.orders || 0,
      received: item.received || 0,
    }));
    const statusColors = { Paid: "#16a34a", Partial: "#f59e0b", Pending: "#ef4444" };
    const statusSlices = (data.paymentStatusBreakdown || []).map((item) => ({
      label: item._id || "Unknown",
      value: item.count || 0,
      color: statusColors[item._id] || "#64748b",
    }));
    const maxProduct = Math.max(...(data.topProducts || []).map((p) => p.totalRevenue || 0), 1);
    const maxVendor = Math.max(...(data.vendorOutstanding || []).map((v) => v.outstanding || 0), 1);
    return { trend, statusSlices, maxProduct, maxVendor };
  }, [data]);

  if (loading) {
    return (
      <div className="dash-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || !prepared) {
    return (
      <div className="dash-offline">
        <div className="dash-offline-icon">!</div>
        <strong>Unable to connect to backend</strong>
        <span>Backend server port 5000 par running hona chahiye.</span>
      </div>
    );
  }

  const { stats = {}, recentSales = [], lowStockProducts = [], topProducts = [], paymentModes = [], customerTypeBreakdown = [], vendorOutstanding = [] } = data;
  const growth = stats.growthPct === null || stats.growthPct === undefined ? null : Number(stats.growthPct);
  const duePct = stats.monthlyRevenue ? Math.round(((stats.monthlyDue || 0) / stats.monthlyRevenue) * 100) : 0;
  const receivedPct = stats.monthlyRevenue ? Math.round(((stats.monthlyReceived || 0) / stats.monthlyRevenue) * 100) : 0;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="dashboard-page">
      <section className="dash-hero">
        <div>
          <span className="dash-eyebrow">Business Overview</span>
          <h1>Dashboard</h1>
          <p>{today} · Revenue, stock aur payments ka live snapshot.</p>
        </div>
        <div className={growth === null ? "dash-growth dash-growth-neutral" : growth >= 0 ? "dash-growth dash-growth-up" : "dash-growth dash-growth-down"}>
          <span>{growth === null ? "No last month baseline" : `${growth >= 0 ? "+" : ""}${growth}%`}</span>
          <small>{growth === null ? "Growth will appear after more sales" : "vs last month"}</small>
        </div>
      </section>

      <section className="dash-kpi-grid">
        <KPI label="Month Revenue" value={money(stats.monthlyRevenue)} sub={`${stats.monthlySalesCount || 0} orders`} accent="#0f766e" tone="teal" onClick={() => navigate("sales-list")} />
        <KPI label="Received" value={money(stats.monthlyReceived)} sub={`${receivedPct}% collected`} accent="#16a34a" tone="green" />
        <KPI label="Due Amount" value={money(stats.monthlyDue)} sub={`${duePct}% pending`} accent="#ef4444" tone="red" onClick={() => navigate("sales-list")} />
        <KPI label="Purchases" value={money(stats.monthlyPurchases)} sub="this month" accent="#7c3aed" tone="purple" onClick={() => navigate("purchases-list")} />
        <KPI label="Products" value={stats.totalProducts || 0} sub="active inventory" accent="#2563eb" tone="blue" onClick={() => navigate("product-list")} />
        <KPI label="Customers" value={stats.totalCustomers || 0} sub="registered" accent="#0891b2" tone="cyan" onClick={() => navigate("customer-list")} />
      </section>

      <section className="dash-main-grid">
        <Panel title="Revenue Trend" meta="Last 6 months sales performance" className="dash-wide">
          <RevenueAreaChart data={prepared.trend} />
        </Panel>

        <Panel title="Sale Status" meta="All non-cancelled invoices">
          <DonutChart slices={prepared.statusSlices} />
        </Panel>

        <Panel title="Quick Actions" meta="Daily shortcuts">
          <div className="dash-actions">
            {[
              ["Create Sale", "sale-create"],
              ["Record Purchase", "purchase-create"],
              ["Add Product", "product-add"],
              ["GST Report", "gst-report"],
              ["Vendor Ledger", "vendor-ledger"],
              ["Stock", "product-stock"],
            ].map(([label, page]) => (
              <button key={page} type="button" onClick={() => navigate(page)}>{label}</button>
            ))}
          </div>
        </Panel>

        <Panel title="Monthly Orders" meta="Invoice count trend">
          <OrdersBarChart data={prepared.trend} />
        </Panel>

        <Panel title="Top Products" meta="Revenue leaders" action={() => navigate("product-list")} actionLabel="All Products" className="dash-wide">
          {topProducts.length === 0 ? (
            <EmptyMini>No product sales yet</EmptyMini>
          ) : (
            <div className="dash-rank-list">
              {topProducts.map((product, index) => (
                <RankRow
                  key={product._id || product.name}
                  index={index + 1}
                  label={product.name || "Product"}
                  value={product.totalRevenue || 0}
                  max={prepared.maxProduct}
                  color={["#0f766e", "#2563eb", "#7c3aed", "#16a34a", "#f59e0b", "#db2777"][index] || "#64748b"}
                  sub={`${product.totalQty || 0} qty sold`}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Payment Modes" meta="This month">
          {paymentModes.length === 0 ? (
            <EmptyMini>No payments yet</EmptyMini>
          ) : (
            <div className="dash-simple-list">
              {paymentModes.slice(0, 5).map((mode) => (
                <div key={mode._id || "Unknown"}>
                  <span>{mode._id || "Unknown"}</span>
                  <strong>{mode.count} · {money(mode.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="dash-bottom-grid">
        <Panel title="Recent Sales" meta="Latest invoices" action={() => navigate("sales-list")} actionLabel="View All">
          {recentSales.length === 0 ? (
            <EmptyMini>No sales yet</EmptyMini>
          ) : (
            <div className="dash-sale-list">
              {recentSales.map((sale) => (
                <button
                  key={sale._id}
                  type="button"
                  onClick={() => sale.customer?._id && navigate(`customer-profile:${sale.customer._id}`)}
                  className="dash-sale-row"
                >
                  <span>
                    <strong>{sale.customer?.name || sale.customerName || "Walk-in"}</strong>
                    <small>{sale.invoiceNo} · {new Date(sale.date).toLocaleDateString("en-IN")} · {sale.saleType}</small>
                  </span>
                  <span className="dash-sale-amount">
                    <b>{money(sale.grandTotal)}</b>
                    <Badge color={{ Paid: "green", Partial: "yellow", Pending: "red", Cancelled: "gray" }[sale.status] || "gray"}>{sale.status}</Badge>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`Stock Alerts (${lowStockProducts.length})`} meta="Low and out of stock" action={() => navigate("product-stock")} actionLabel="Manage">
          {lowStockProducts.length === 0 ? (
            <div className="dash-good-state">All products are well-stocked</div>
          ) : (
            <div className="dash-stock-list">
              {lowStockProducts.map((product) => (
                <div key={product._id} className="dash-stock-row">
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.vendor?.name || "No vendor"} · Min {product.minStockAlert}</small>
                  </span>
                  <Badge color={product.stock === 0 ? "red" : "yellow"}>{product.stock === 0 ? "OUT" : `${product.stock} left`}</Badge>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Customer Mix" meta="Customer categories">
          {customerTypeBreakdown.length === 0 ? (
            <EmptyMini>No customers yet</EmptyMini>
          ) : (
            <div className="dash-chip-grid">
              {customerTypeBreakdown.map((type) => (
                <div key={type._id || "Unknown"}>
                  <span>{type._id || "Unknown"}</span>
                  <strong>{type.count}</strong>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Vendor Outstanding" meta="Top payable balances" action={() => navigate("vendor-ledger")} actionLabel="Ledger">
          {vendorOutstanding.length === 0 ? (
            <div className="dash-good-state">All vendors settled</div>
          ) : (
            <div className="dash-rank-list dash-compact-ranks">
              {vendorOutstanding.map((vendor, index) => (
                <RankRow
                  key={vendor._id || vendor.name}
                  index={index + 1}
                  label={vendor.name}
                  value={vendor.outstanding || 0}
                  max={prepared.maxVendor}
                  color="#ef4444"
                />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </main>
  );
}
