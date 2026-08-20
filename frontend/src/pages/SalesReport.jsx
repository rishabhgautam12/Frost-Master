import { useState, useEffect } from "react";
import { PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td, Badge, StatsGrid, LoadingSpinner, ErrorMsg } from "../components/Shared";
import { salesAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";

const stColor = { Paid:"green", Partial:"yellow", Pending:"red", Cancelled:"gray" };

export default function SalesReport({ navigate }) {
  const [sales,    setSales]   = useState([]);
  const [summary,  setSummary] = useState({});
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);
  const [from,     setFrom]    = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [to,       setTo]      = useState(new Date().toISOString().split("T")[0]);

  const load = () => {
    setLoading(true);
    salesAPI.getAll({ from, to })
      .then(r => { setSales(r.data); setSummary(r.summary || {}); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageTitle>Sales Report</PageTitle>

      <StatsGrid cards={[
        { value:`₹${(summary.totalRevenue||0).toLocaleString()}`, label:"Total Sales",       color:"#14b8a6" },
        { value: summary.totalSales || 0,                         label:"Orders",            color:"#10b981" },
        { value:`₹${Math.round((summary.totalRevenue||0) / Math.max(1,summary.totalSales||0)).toLocaleString()}`, label:"Avg Order Value", color:"#3b82f6" },
        { value:`₹${(summary.totalGST||0).toLocaleString()}`,     label:"Total GST",         color:"#ef4444" },
        { value:`₹${(summary.totalDue||0).toLocaleString()}`,     label:"Outstanding",       color:"#f59e0b" },
      ]} />

      <SearchBar>
        <label style={{ fontSize:11, fontWeight:700, color:"#64748b" }}>From:</label>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width:130 }} />
        <label style={{ fontSize:11, fontWeight:700, color:"#64748b" }}>To:</label>
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width:130 }} />
        <Btn color="blue" onClick={load}>Generate Report</Btn>
        <Btn color="green" onClick={() => downloadCSV(sales, [
          { label:"Invoice No.",   key:"invoiceNo"         },
          { label:"Date",          key:"date"              },
          { label:"Customer",      key:"customer.name"     },
          { label:"Sale Type",     key:"saleType"          },
          { label:"Payment Mode",  key:"paymentMode"       },
          { label:"Total (₹)",     key:"grandTotal"        },
          { label:"GST (₹)",       key:"totalGST"          },
          { label:"Paid (₹)",      key:"amountPaid"        },
          { label:"Due (₹)",       key:"amountDue"         },
          { label:"Status",        key:"status"            },
        ], "sales_report")}>⬇ Export CSV</Btn>
      </SearchBar>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>{["Date","Invoice #","Customer","Items","Payment","GST (₹)","Total (₹)","Paid (₹)","Due (₹)","Status"].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {sales.length === 0
                ? <tr><td colSpan={10} style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>No sales in this period</td></tr>
                : sales.map(s => (
                  <tr key={s._id} style={{ borderBottom:"1px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f0fdfa"}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    <Td>{new Date(s.date).toLocaleDateString("en-IN")}</Td>
                    <Td style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>{s.invoiceNo}</Td>
                    <Td style={{ fontWeight:700 }}>{s.customer?.name || s.customerName || "Walk-in"}</Td>
                    <Td>{s.items?.length || 0}</Td>
                    <Td>{s.paymentMode}</Td>
                    <Td style={{ color:"#f59e0b" }}>₹{(s.totalGST||0).toLocaleString()}</Td>
                    <Td style={{ fontWeight:700 }}>₹{s.grandTotal.toLocaleString()}</Td>
                    <Td style={{ color:"#16a34a" }}>₹{s.amountPaid.toLocaleString()}</Td>
                    <Td style={{ color: s.amountDue > 0 ? "#ef4444" : "#94a3b8", fontWeight:700 }}>
                      {s.amountDue > 0 ? `₹${s.amountDue.toLocaleString()}` : "—"}
                    </Td>
                    <Td><Badge color={stColor[s.status]||"gray"}>{s.status}</Badge></Td>
                  </tr>
                ))
              }
            </tbody>
            {sales.length > 0 && (
              <tfoot>
                <tr style={{ background:"#eef6f5", fontWeight:700 }}>
                  <td colSpan={6} style={{ padding:"10px 12px" }}>TOTALS ({sales.length} invoices)</td>
                  <td style={{ padding:"10px 12px", fontWeight:800 }}>₹{(summary.totalRevenue||0).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px", color:"#16a34a" }}>₹{(summary.totalReceived||0).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px", color:"#ef4444" }}>₹{(summary.totalDue||0).toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </TableWrap>
      )}
    </div>
  );
}
