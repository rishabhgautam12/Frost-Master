import { useState, useEffect } from "react";
import { PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td, StatsGrid, LoadingSpinner, ErrorMsg } from "../components/Shared";
import { salesAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";

export default function GSTReport() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);

  const load = () => {
    setLoading(true);
    salesAPI.getGSTReport({ from, to })
      .then((r) => { setData(r.data); setSummary(r.summary || {}); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageTitle>GST Report</PageTitle>

      <StatsGrid cards={[
        { label: "Taxable Amount", value: `₹${(summary.totalTaxable || 0).toLocaleString()}`, color: "#5a8be8" },
        { label: "CGST (Output)", value: `₹${(summary.totalCGST || 0).toLocaleString()}`, color: "#d946ef" },
        { label: "SGST (Output)", value: `₹${(summary.totalSGST || 0).toLocaleString()}`, color: "#f472b6" },
        { label: "IGST (Output)", value: `₹${(summary.totalIGST || 0).toLocaleString()}`, color: "#e5a03a" },
        { label: "Total Tax Collected", value: `₹${(summary.totalGST || 0).toLocaleString()}`, color: "#e0524c" },
      ]} />

      <SearchBar>
        <label style={{ fontSize: 12, fontWeight: 600 }}>From:</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <label style={{ fontSize: 12, fontWeight: 600 }}>To:</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Btn color="blue" onClick={load}>Generate Report</Btn>
        <Btn color="green" onClick={() => downloadCSV(data, [
          { label:"Invoice No.",   key:"invoiceNo"         },
          { label:"Date",          key:"date"              },
          { label:"Customer",      key:"customer.name"     },
          { label:"GSTIN",         key:"customer.gstin"    },
          { label:"Sale Type",     key:"saleType"          },
          { label:"Grand Total",   key:"grandTotal"        },
          { label:"Taxable Amt",   key:"subtotal"          },
          { label:"CGST (₹)",      key:"cgst"              },
          { label:"SGST (₹)",      key:"sgst"              },
          { label:"IGST (₹)",      key:"igst"              },
          { label:"Total GST (₹)", key:"totalGST"          },
        ], "gst_report")}>⬇ Export CSV</Btn>
      </SearchBar>

      <div style={{ background: "#f5f3ff", border: "1px solid #ede9fe", borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#8a5a12" }}>
        ℹ️ This report shows output GST (tax collected from customers). For GSTR-1 filing, consult your CA.
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{["Invoice No.", "Date", "Customer", "GSTIN", "Taxable (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Total Tax (₹)"].map((h) => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#9aa1b9" }}>No sales in this period</td></tr>
              ) : data.map((s) => {
                const taxable = s.grandTotal - s.totalGST;
                return (
                  <tr key={s._id} style={{ borderBottom: "1px solid #f1f3f9" }}>
                    <Td style={{ fontFamily: "monospace", color: "#0ea5e9" }}>{s.invoiceNo}</Td>
                    <Td>{new Date(s.date).toLocaleDateString("en-IN")}</Td>
                    <Td>{s.customer?.name || s.customerName || "Walk-in"}</Td>
                    <Td style={{ fontFamily: "monospace", fontSize: 10 }}>{s.customer?.gstin || "—"}</Td>
                    <Td>₹{taxable.toFixed(2)}</Td>
                    <Td style={{ color: "#d946ef" }}>₹{(s.cgst || 0).toFixed(2)}</Td>
                    <Td style={{ color: "#f472b6" }}>₹{(s.sgst || 0).toFixed(2)}</Td>
                    <Td style={{ color: "#e5a03a" }}>₹{(s.igst || 0).toFixed(2)}</Td>
                    <Td style={{ fontWeight: 700, color: "#e0524c" }}>₹{(s.totalGST || 0).toFixed(2)}</Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f5f3ff", fontWeight: 800 }}>
                <td colSpan={4} style={{ padding: "10px 12px" }}>TOTALS ({data.length} invoices)</td>
                <td style={{ padding: "10px 12px" }}>₹{(summary.totalTaxable || 0).toFixed(2)}</td>
                <td style={{ padding: "10px 12px", color: "#d946ef" }}>₹{(summary.totalCGST || 0).toFixed(2)}</td>
                <td style={{ padding: "10px 12px", color: "#f472b6" }}>₹{(summary.totalSGST || 0).toFixed(2)}</td>
                <td style={{ padding: "10px 12px", color: "#e5a03a" }}>₹{(summary.totalIGST || 0).toFixed(2)}</td>
                <td style={{ padding: "10px 12px", color: "#e0524c" }}>₹{(summary.totalGST || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </TableWrap>
      )}
    </div>
  );
}
