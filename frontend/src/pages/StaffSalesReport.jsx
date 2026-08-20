import { useEffect, useState } from "react";
import {
  PageTitle, Btn, SearchBar, FormSelect, FormInput, TableWrap, Th, Td,
  LoadingSpinner, ErrorMsg, EmptyState,
} from "../components/Shared";
import { salesAPI } from "../services/api";

const money = n => `₹${(+n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const currentYear = new Date().getFullYear();

function MiniBars({ rows, labelKey, valueKey, color = "#0ea5e9", valuePrefix = "" }) {
  const max = Math.max(...rows.map(r => +r[valueKey] || 0), 1);
  if (!rows.length) return <EmptyState text="No graph data found." />;
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:10, minHeight:190, overflowX:"auto", padding:"8px 2px" }}>
      {rows.map((row, idx) => {
        const value = +row[valueKey] || 0;
        return (
          <div key={`${row[labelKey]}-${idx}`} style={{ minWidth:70, flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{ fontSize:10.5, fontWeight:800, color:"#1e293b", whiteSpace:"nowrap" }}>
              {valuePrefix}{value.toLocaleString("en-IN")}
            </div>
            <div style={{
              width:"100%", maxWidth:48, height:Math.max(8, Math.round((value / max) * 130)),
              background:color, borderRadius:"5px 5px 0 0",
            }} />
            <div style={{ fontSize:10, color:"#64748b", textAlign:"center", maxWidth:86, overflow:"hidden", textOverflow:"ellipsis" }}>
              {row[labelKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StaffSalesReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    year: String(currentYear),
    staff: "all",
    from: "",
    to: "",
  });

  const load = (overrideFilters) => {
    const activeFilters = overrideFilters || filters;
    setLoading(true);
    setError("");
    const params = {};
    if (activeFilters.from || activeFilters.to) {
      if (activeFilters.from) params.from = activeFilters.from;
      if (activeFilters.to) params.to = activeFilters.to;
    } else {
      params.year = activeFilters.year;
    }
    if (activeFilters.staff !== "all") params.staff = activeFilters.staff;
    salesAPI.getStaffReport(params)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);
  const set = key => e => setFilters(prev => ({ ...prev, [key]: e.target.value }));

  const summary = data?.summary || {};
  const byMember = data?.byMember || [];
  const byMonth = data?.byMonth || [];
  const byProduct = data?.byProduct || [];
  const monthlyTotals = Object.values(byMonth.reduce((acc, row) => {
    if (!acc[row.monthKey]) acc[row.monthKey] = { label:`${row.month} ${row.year}`, revenue:0, qty:0, invoices:0 };
    acc[row.monthKey].revenue += row.revenue;
    acc[row.monthKey].qty += row.qty;
    acc[row.monthKey].invoices += row.invoices;
    return acc;
  }, {}));

  return (
    <div>
      <PageTitle>Staff Sales Report</PageTitle>

      <SearchBar>
        <FormSelect value={filters.staff} onChange={set("staff")} style={{ width:180 }}>
          <option value="all">All Members</option>
          <option value="unassigned">Unassigned</option>
          {(data?.staff || []).map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
        </FormSelect>
        <FormSelect value={filters.year} onChange={set("year")} style={{ width:110 }} disabled={!!filters.from || !!filters.to}>
          {[0,1,2,3,4].map(i => <option key={currentYear - i}>{currentYear - i}</option>)}
        </FormSelect>
        <FormInput type="date" value={filters.from} onChange={set("from")} style={{ width:150 }} />
        <FormInput type="date" value={filters.to} onChange={set("to")} style={{ width:150 }} />
        <Btn color="blue" onClick={load}>Filter</Btn>
        <Btn color="cancel" onClick={() => {
          const next = { year:String(currentYear), staff:"all", from:"", to:"" };
          setFilters(next);
          load(next);
        }}>Reset</Btn>
      </SearchBar>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:14, marginBottom:18 }}>
            {[
              { label:"Total Sale", value:money(summary.revenue), color:"#0ea5e9" },
              { label:"Total Qty Sold", value:summary.qty || 0, color:"#16a34a" },
              { label:"Invoices", value:summary.invoices || 0, color:"#f59e0b" },
              { label:"Received", value:money(summary.received), color:"#22c55e" },
              { label:"Due", value:money(summary.due), color:"#ef4444" },
            ].map(card => (
              <div key={card.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderLeft:`4px solid ${card.color}`, borderRadius:8, padding:16 }}>
                <div style={{ fontSize:22, fontWeight:900, color:"#1e293b" }}>{card.value}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:3, fontWeight:700 }}>{card.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:16, overflowX:"auto" }}>
              <div style={{ fontWeight:800, marginBottom:8 }}>Monthly Sales Graph</div>
              <MiniBars rows={monthlyTotals} labelKey="label" valueKey="revenue" color="#14b8a6" />
            </div>
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:16, overflowX:"auto" }}>
              <div style={{ fontWeight:800, marginBottom:8 }}>Member Wise Sales Graph</div>
              <MiniBars rows={byMember.slice(0, 8)} labelKey="name" valueKey="revenue" color="#0ea5e9" />
            </div>
          </div>

          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr>{["Staff Member","Invoices","Qty Sold","Total Sale","Received","Due"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {byMember.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState text="No member-wise sales found." /></td></tr>
                ) : byMember.map(row => (
                  <tr key={row.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <Td style={{ fontWeight:800 }}>{row.name}<div style={{ fontSize:10, color:"#94a3b8" }}>{row.username || row.role}</div></Td>
                    <Td>{row.invoices}</Td>
                    <Td style={{ fontWeight:800, color:"#16a34a" }}>{row.qty}</Td>
                    <Td style={{ fontWeight:800 }}>{money(row.revenue)}</Td>
                    <Td style={{ color:"#16a34a", fontWeight:700 }}>{money(row.received)}</Td>
                    <Td style={{ color:row.due > 0 ? "#ef4444" : "#94a3b8", fontWeight:700 }}>{money(row.due)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <div style={{ height:18 }} />
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr>{["Staff Member","Product","Model No.","Qty Sold","Sale Amount"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {byProduct.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState text="No product-wise sales found." /></td></tr>
                ) : byProduct.map((row, idx) => (
                  <tr key={`${row.staffId}-${row.productId}-${idx}`} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <Td style={{ fontWeight:700 }}>{row.staffName}</Td>
                    <Td style={{ fontWeight:800 }}>{row.productName}</Td>
                    <Td style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>{row.modelNumber || "-"}</Td>
                    <Td style={{ fontWeight:800, color:"#16a34a" }}>{row.qty}</Td>
                    <Td style={{ fontWeight:800 }}>{money(row.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}
