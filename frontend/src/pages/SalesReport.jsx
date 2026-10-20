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
        { value:`₹${(summary.totalRevenue||0).toLocaleString()}`, label:"Total Sales",       color:"#8b5cf6" },
        { value: summary.totalSales || 0,                         label:"Orders",            color:"#10b981" },
        { value:`₹${Math.round((summary.totalRevenue||0) / Math.max(1,summary.totalSales||0)).toLocaleString()}`, label:"Avg Order Value", color:"#5a8be8" },
        { value:`₹${(summary.totalGST||0).toLocaleString()}`,     label:"Total GST",         color:"#e0524c" },
        { value:`₹${(summary.totalDue||0).toLocaleString()}`,     label:"Outstanding",       color:"#e5a03a" },
      ]} />

      <SearchBar>
        <label style={{ fontSize:11, fontWeight:700, color:"#6b7392" }}>From:</label>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width:130 }} />
        <label style={{ fontSize:11, fontWeight:700, color:"#6b7392" }}>To:</label>
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
                ? <tr><td colSpan={10} style={{ padding:40, textAlign:"center", color:"#9aa1b9" }}>No sales in this period</td></tr>
                : sales.map(s => (
                  <tr key={s._id} style={{ borderBottom:"1px solid #f1f3f9" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f5f3ff"}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    <Td>{new Date(s.date).toLocaleDateString("en-IN")}</Td>
                    <Td style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>{s.invoiceNo}</Td>
                    <Td style={{ fontWeight:700 }}>{s.customer?.name || s.customerName || "Walk-in"}</Td>
                    <Td>{s.items?.length || 0}</Td>
                    <Td>{s.paymentMode}</Td>
                    <Td style={{ color:"#e5a03a" }}>₹{(s.totalGST||0).toLocaleString()}</Td>
                    <Td style={{ fontWeight:700 }}>₹{s.grandTotal.toLocaleString()}</Td>
                    <Td style={{ color:"#1f9d6b" }}>₹{s.amountPaid.toLocaleString()}</Td>
                    <Td style={{ color: s.amountDue > 0 ? "#e0524c" : "#9aa1b9", fontWeight:700 }}>
                      {s.amountDue > 0 ? `₹${s.amountDue.toLocaleString()}` : "—"}
                    </Td>
                    <Td><Badge color={stColor[s.status]||"gray"}>{s.status}</Badge></Td>
                  </tr>
                ))
              }
            </tbody>
            {sales.length > 0 && (
              <tfoot>
                <tr style={{ background:"#f5f3ff", fontWeight:700 }}>
                  <td colSpan={6} style={{ padding:"10px 12px" }}>TOTALS ({sales.length} invoices)</td>
                  <td style={{ padding:"10px 12px", fontWeight:800 }}>₹{(summary.totalRevenue||0).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px", color:"#1f9d6b" }}>₹{(summary.totalReceived||0).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px", color:"#e0524c" }}>₹{(summary.totalDue||0).toLocaleString()}</td>
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
