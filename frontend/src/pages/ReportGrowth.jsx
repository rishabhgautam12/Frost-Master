import { useState, useEffect } from "react";
import { PageTitle, TableWrap, Th, Td, LoadingSpinner } from "../components/Shared";
import { dashboardAPI } from "../services/api";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function ReportGrowth() {
  const [trend,   setTrend]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats()
      .then(r => { setTrend(r.data.monthlyTrend || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Build growth table: compare each month to the previous month
  const rows = trend.map((t, i) => {
    const prev = trend[i - 1];
    const change  = prev ? t.revenue - prev.revenue : null;
    const pct     = prev && prev.revenue > 0 ? ((change / prev.revenue) * 100).toFixed(1) : null;
    return {
      month:   MONTHS[t._id.month - 1] + " " + t._id.year,
      revenue: t.revenue,
      orders:  t.orders,
      change,
      pct,
      trend:   change === null ? "—" : change >= 0 ? "📈" : "📉",
    };
  });

  if (loading) return <div><PageTitle>Growth Report</PageTitle><LoadingSpinner /></div>;

  return (
    <div>
      <PageTitle>Increase in Sales & Growth</PageTitle>

      {rows.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:10, padding:60, textAlign:"center", color:"#94a3b8", border:"1px solid #e2e8f0" }}>
          <div style={{ fontSize:40 }}>📊</div>
          <div style={{ marginTop:10 }}>No sales data yet. Start creating sales to see growth trends.</div>
        </div>
      ) : (
        <>
          <div style={{ background:"#f0fdfa", border:"1px solid #ccfbf1", borderRadius:8, padding:"10px 16px", marginBottom:14, fontSize:12, color:"#92400e" }}>
            ℹ️ Month-over-month comparison based on actual sales in MongoDB.
          </div>
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr>{["Month","Revenue (₹)","Orders","Change (₹)","Change %","Avg Order (₹)","Trend"].map(h => <Th key={h}>{h}</Th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f0fdfa"}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    <Td style={{ fontWeight:700 }}>{r.month}</Td>
                    <Td style={{ fontWeight:700 }}>₹{r.revenue.toLocaleString()}</Td>
                    <Td>{r.orders}</Td>
                    <Td style={{ color: r.change === null ? "#94a3b8" : r.change >= 0 ? "#16a34a" : "#ef4444", fontWeight:700 }}>
                      {r.change === null ? "—" : `${r.change >= 0 ? "+" : ""}₹${r.change.toLocaleString()}`}
                    </Td>
                    <Td style={{ color: r.pct === null ? "#94a3b8" : +r.pct >= 0 ? "#16a34a" : "#ef4444", fontWeight:700 }}>
                      {r.pct === null ? "—" : `${+r.pct >= 0 ? "+" : ""}${r.pct}%`}
                    </Td>
                    <Td>₹{r.orders > 0 ? Math.round(r.revenue / r.orders).toLocaleString() : "—"}</Td>
                    <Td style={{ fontSize:18 }}>{r.trend}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:"#eef6f5", fontWeight:700 }}>
                  <td style={{ padding:"10px 12px" }}>TOTAL ({rows.length} months)</td>
                  <td style={{ padding:"10px 12px", fontWeight:800 }}>₹{rows.reduce((s,r) => s+r.revenue,0).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px" }}>{rows.reduce((s,r) => s+r.orders,0)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}
