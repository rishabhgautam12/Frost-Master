import { useState, useEffect } from "react";
import { PageTitle, StatsGrid, LoadingSpinner, ErrorMsg } from "../components/Shared";
import { dashboardAPI } from "../services/api";

function BarChart({ data, color = "#14b8a6", height = 140, isMobile = false }) {
  const max = Math.max(...data.map(d => d.num), 1);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: isMobile ? 6 : 10,
        height,
        padding: "10px 0",
        minWidth: isMobile ? 320 : "auto",
      }}
    >
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: isMobile ? 9 : 10,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            {d.val}
          </div>

          <div
            style={{
              width: "100%",
              background: d.highlight ? "#16a34a" : color,
              borderRadius: "4px 4px 0 0",
              height: Math.max(
                4,
                Math.round((d.num / max) * (height - 30))
              ),
              transition: "height 0.4s ease",
            }}
          />

          <div
            style={{
              fontSize: isMobile ? 9 : 10,
              color: "#64748b",
            }}
          >
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function ReportGraphs() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    dashboardAPI
      .getStats()
      .then((r) => {
        setStats(r.data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div>
        <PageTitle>Monthly Sales Report</PageTitle>
        <LoadingSpinner />
      </div>
    );

  if (error)
    return (
      <div>
        <PageTitle>Monthly Sales Report</PageTitle>
        <ErrorMsg message={error} />
      </div>
    );

  const trend = stats.monthlyTrend || [];

  const revenueData = trend.map((t, i) => ({
    label: MONTHS[t._id.month - 1],
    num: t.revenue,
    val: `₹${(t.revenue / 1000).toFixed(0)}K`,
    highlight: i === trend.length - 1,
  }));

  const ordersData = trend.map((t, i) => ({
    label: MONTHS[t._id.month - 1],
    num: t.orders,
    val: String(t.orders),
    highlight: i === trend.length - 1,
  }));

  const topProducts = stats.topProducts || [];

  return (
    <div
      style={{
        padding: isMobile ? "0 8px" : 0,
      }}
    >
      <PageTitle>Sales Graphs & Analytics</PageTitle>

      <StatsGrid
        cards={[
          {
            label: "This Month Revenue",
            value: `₹${(
              stats.stats?.monthlyRevenue || 0
            ).toLocaleString()}`,
            color: "#14b8a6",
          },
          {
            label: "This Month Orders",
            value: stats.stats?.monthlySalesCount || 0,
            color: "#10b981",
          },
          {
            label: "Total Products",
            value: stats.stats?.totalProducts || 0,
            color: "#3b82f6",
          },
          {
            label: "Active Vendors",
            value: stats.stats?.totalVendors || 0,
            color: "#8b5cf6",
          },
        ]}
      />

      {/* Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* Revenue Chart */}
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: isMobile ? 12 : 20,
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            📈 Monthly Revenue (Last 6 months)
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              marginBottom: 8,
            }}
          >
            ₹ in thousands
          </div>

          {revenueData.length > 0 ? (
            <BarChart
              data={revenueData}
              color="#14b8a6"
              isMobile={isMobile}
            />
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              No sales data yet
            </div>
          )}
        </div>

        {/* Orders Chart */}
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: isMobile ? 12 : 20,
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            🛒 Monthly Orders
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              marginBottom: 8,
            }}
          >
            Number of invoices
          </div>

          {ordersData.length > 0 ? (
            <BarChart
              data={ordersData}
              color="#0ea5e9"
              isMobile={isMobile}
            />
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              No orders data yet
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: isMobile ? 12 : 20,
          border: "1px solid #e2e8f0",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          🏆 Top Products by Revenue
        </div>

        {topProducts.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            No product data yet
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit,minmax(160px,1fr))",
              gap: 12,
            }}
          >
            {topProducts.map((p, i) => (
              <div
                key={i}
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  #{i + 1}
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#1e293b",
                    marginBottom: 6,
                    wordBreak: "break-word",
                  }}
                >
                  {p.name}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                  }}
                >
                  Qty sold: <strong>{p.totalQty}</strong>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#16a34a",
                    marginTop: 4,
                  }}
                >
                  ₹{(p.totalRevenue || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock */}
      {stats.lowStockProducts?.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: isMobile ? 12 : 20,
            border: "1px solid #fca5a5",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 12,
              color: "#ef4444",
            }}
          >
            ⚠️ Low / Out of Stock Products
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit,minmax(220px,1fr))",
              gap: 10,
            }}
          >
            {stats.lowStockProducts.map((p) => (
              <div
                key={p._id}
                style={{
                  background: "#fee2e2",
                  borderRadius: 7,
                  padding: "10px 14px",
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    wordBreak: "break-word",
                  }}
                >
                  {p.name}
                </div>

                <div
                  style={{
                    color: "#991b1b",
                  }}
                >
                  Stock: {p.stock} / Min: {p.minStockAlert}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}