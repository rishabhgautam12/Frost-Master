import { useEffect, useMemo, useState } from "react";
import { PageTitle, Btn, FormSelect, FormInput, TableWrap, Th, Td, LoadingSpinner, ErrorMsg, EmptyState, Badge } from "../components/Shared";
import { salesAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";

const money = value => `₹${(+value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const currentYear = new Date().getFullYear();
const PAGE_SIZE = 20;

function Pagination({ page, totalPages, totalRows, onChange }) {
  if (totalRows <= PAGE_SIZE) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalRows);
  const pages = Array.from({length:totalPages},(_,index)=>index+1).filter(number => number===1 || number===totalPages || Math.abs(number-page)<=2);
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",background:"#fff",border:"1px solid #cbd5e1",borderTop:0,padding:"10px 12px",borderRadius:"0 0 8px 8px"}}>
    <span style={{fontSize:11,color:"#64748b"}}>Showing {start}-{end} of {totalRows} records</span>
    <div style={{display:"flex",gap:5,alignItems:"center"}}><Btn sm color="cancel" disabled={page===1} onClick={()=>onChange(page-1)}>Previous</Btn>{pages.map((number,index)=><span key={number} style={{display:"contents"}}>{index>0 && number-pages[index-1]>1 && <span style={{padding:"4px"}}>…</span>}<Btn sm color={number===page?"teal":"cancel"} onClick={()=>onChange(number)}>{number}</Btn></span>)}<Btn sm color="cancel" disabled={page===totalPages} onClick={()=>onChange(page+1)}>Next</Btn></div>
  </div>;
}

function MetricCard({ label, value, note, color, icon }) {
  return <div style={{background:"#fff",border:"1px solid #cbd5e1",borderLeft:`5px solid ${color}`,borderRadius:10,padding:"15px 17px",minWidth:0}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase"}}><span>{label}</span><span style={{fontSize:18}}>{icon}</span></div>
    <div style={{fontSize:22,fontWeight:900,color:"#0f172a",marginTop:5,overflowWrap:"anywhere"}}>{value}</div>
    <div style={{fontSize:10.5,color:"#64748b",marginTop:3}}>{note}</div>
  </div>;
}

function RankingBars({ rows }) {
  const max = Math.max(1, ...rows.map(row => +row.revenue || 0));
  if (!rows.length) return <EmptyState text="No employee performance data found." />;
  return <div style={{display:"flex",flexDirection:"column",gap:13}}>{rows.slice(0,8).map((row,index) => <div key={row.id}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:11,marginBottom:5}}><span style={{fontWeight:800,color:"#334155"}}>{index + 1}. {row.name}</span><strong>{money(row.revenue)}</strong></div>
    <div style={{height:9,background:"#e2e8f0",borderRadius:20,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(2,(row.revenue/max)*100)}%`,background:"linear-gradient(90deg,#0f766e,#2dd4bf)",borderRadius:20}} /></div>
  </div>)}</div>;
}

function MonthlyChart({ rows }) {
  const totals = Object.values(rows.reduce((map,row) => {
    if (!map[row.monthKey]) map[row.monthKey] = {key:row.monthKey,label:`${row.month} ${row.year}`,revenue:0};
    map[row.monthKey].revenue += +row.revenue || 0;
    return map;
  }, {}));
  const max = Math.max(1,...totals.map(row => row.revenue));
  if (!totals.length) return <EmptyState text="No monthly sales data found." />;
  return <div style={{height:220,display:"flex",alignItems:"flex-end",gap:10,overflowX:"auto",paddingTop:18}}>{totals.map(row => <div key={row.key} title={`${row.label}: ${money(row.revenue)}`} style={{minWidth:58,flex:1,height:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center"}}>
    <strong style={{fontSize:9.5,whiteSpace:"nowrap"}}>{money(row.revenue)}</strong><div style={{height:`${Math.max(5,(row.revenue/max)*150)}px`,width:34,background:"linear-gradient(#38bdf8,#0369a1)",borderRadius:"6px 6px 0 0",marginTop:5}} /><span style={{fontSize:9.5,color:"#64748b",marginTop:6,whiteSpace:"nowrap"}}>{row.label}</span>
  </div>)}</div>;
}

export default function StaffSalesReport() {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [filters,setFilters] = useState({year:String(currentYear),staff:"all",from:"",to:""});
  const [activeTab,setActiveTab] = useState("employees");
  const [page,setPage] = useState(1);

  const load = (next = filters) => {
    if (next.from && next.to && next.from > next.to) { setError("From date cannot be later than To date."); return; }
    setLoading(true); setError(""); setPage(1);
    const params = next.from || next.to ? {} : {year:next.year};
    if (next.from) params.from = next.from;
    if (next.to) params.to = next.to;
    if (next.staff !== "all") params.staff = next.staff;
    salesAPI.getStaffReport(params).then(response => setData(response.data)).catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const change = key => event => setFilters(previous => ({...previous,[key]:event.target.value}));
  const summary = data?.summary || {};
  const members = data?.byMember || [];
  const products = data?.byProduct || [];
  const invoices = data?.invoices || [];
  const collectionRate = summary.revenue ? summary.received / summary.revenue * 100 : 0;
  const averageInvoice = summary.invoices ? summary.revenue / summary.invoices : 0;
  const sortedProducts = useMemo(() => [...products].sort((a,b) => b.revenue-a.revenue),[products]);
  const activeRows = activeTab === "employees" ? members : activeTab === "products" ? sortedProducts : invoices;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  const pageRows = activeRows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const reset = () => { const next={year:String(currentYear),staff:"all",from:"",to:""};setFilters(next);load(next); };
  const tabs = [{id:"employees",label:"Employee Performance"},{id:"products",label:"Product Performance"},{id:"invoices",label:"Invoice Details"}];

  return <div style={{maxWidth:1500,margin:"auto"}}>
    <PageTitle>Staff Sales Report</PageTitle>
    <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:14,marginBottom:16}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10,alignItems:"end"}}>
      <label><span style={{display:"block",fontSize:10,fontWeight:800,color:"#64748b",marginBottom:6}}>EMPLOYEE</span><FormSelect value={filters.staff} onChange={change("staff")}><option value="all">All Employees</option><option value="unassigned">Unassigned Sales</option>{(data?.staff||[]).map(employee => <option key={employee._id} value={employee._id}>{employee.name}{employee.role?` - ${employee.role}`:""}</option>)}</FormSelect></label>
      <label><span style={{display:"block",fontSize:10,fontWeight:800,color:"#64748b",marginBottom:6}}>YEAR</span><FormSelect value={filters.year} onChange={change("year")} disabled={!!filters.from||!!filters.to}>{Array.from({length:7},(_,i)=>currentYear-i).map(year=><option key={year}>{year}</option>)}</FormSelect></label>
      <label><span style={{display:"block",fontSize:10,fontWeight:800,color:"#64748b",marginBottom:6}}>FROM DATE</span><FormInput type="date" value={filters.from} onChange={change("from")} /></label>
      <label><span style={{display:"block",fontSize:10,fontWeight:800,color:"#64748b",marginBottom:6}}>TO DATE</span><FormInput type="date" value={filters.to} onChange={change("to")} /></label>
      <div style={{display:"flex",gap:8}}><Btn color="blue" onClick={() => load()}>Apply Filters</Btn><Btn color="cancel" onClick={reset}>Reset</Btn></div>
    </div></div>

    {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={() => load()} /> : <>
      <div className="staff-report-cards" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12,marginBottom:16}}>
        <MetricCard label="Total Sales" value={money(summary.revenue)} note={`${summary.invoices||0} invoices`} color="#0284c7" icon="₹" />
        <MetricCard label="Collected" value={money(summary.received)} note={`${collectionRate.toFixed(1)}% collection rate`} color="#16a34a" icon="✓" />
        <MetricCard label="Outstanding" value={money(summary.due)} note="Pending customer payments" color="#ef4444" icon="!" />
        <MetricCard label="Incentive" value={money(summary.incentive)} note="Employee incentive earned" color="#8b5cf6" icon="★" />
        <MetricCard label="Quantity Sold" value={(summary.qty||0).toLocaleString("en-IN")} note={`Average invoice ${money(averageInvoice)}`} color="#f59e0b" icon="#" />
      </div>
      <div className="staff-report-charts" style={{display:"grid",gridTemplateColumns:"minmax(0,1.35fr) minmax(280px,.65fr)",gap:14,marginBottom:16}}>
        <section style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:16,overflow:"hidden"}}><div style={{fontWeight:900}}>Monthly Sales Trend</div><div style={{fontSize:10.5,color:"#64748b"}}>Revenue for the selected period</div><MonthlyChart rows={data?.byMonth||[]} /></section>
        <section style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:16}}><div style={{fontWeight:900}}>Employee Ranking</div><div style={{fontSize:10.5,color:"#64748b",marginBottom:16}}>{members[0]?`Top performer: ${members[0].name}`:"No performance data"}</div><RankingBars rows={members} /></section>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:10}}><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{tabs.map(tab=><Btn key={tab.id} color={activeTab===tab.id?"teal":"cancel"} onClick={()=>{setActiveTab(tab.id);setPage(1);}}>{tab.label}</Btn>)}</div><Btn color="green" onClick={()=>downloadCSV(invoices,[{label:"Invoice",key:"invoiceNo"},{label:"Date",key:"date"},{label:"Employee",key:"staffName"},{label:"Customer",key:"customerName"},{label:"Qty",key:"qty"},{label:"Sale",key:"grandTotal"},{label:"Received",key:"amountPaid"},{label:"Due",key:"amountDue"},{label:"Incentive",key:"incentiveAmount"},{label:"Status",key:"status"}],"staff_sales_report")}>Export Report</Btn></div>

      {activeTab==="employees" && <TableWrap><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Employee","Incentive Rates","Invoices","Qty","Sales","Received","Due","Collection","Incentive"].map(h=><Th key={h}>{h}</Th>)}</tr></thead><tbody>{members.length?pageRows.map(row=><tr key={row.id} style={{borderBottom:"1px solid #cbd5e1"}}><Td><strong>{row.name}</strong><small style={{display:"block",color:"#64748b"}}>{row.role||"-"}</small></Td><Td>M: {row.manufacturingRate||0}% / I: {row.importedRate||0}%</Td><Td>{row.invoices}</Td><Td>{row.qty}</Td><Td><strong>{money(row.revenue)}</strong></Td><Td style={{color:"#15803d",fontWeight:700}}>{money(row.received)}</Td><Td style={{color:row.due>0?"#dc2626":"#64748b",fontWeight:700}}>{money(row.due)}</Td><Td>{row.revenue?`${(row.received/row.revenue*100).toFixed(1)}%`:"0%"}</Td><Td style={{color:"#7c3aed",fontWeight:800}}>{money(row.incentive)}</Td></tr>):<tr><td colSpan="9"><EmptyState text="No employee sales found." /></td></tr>}</tbody></table></TableWrap>}
      {activeTab==="products" && <TableWrap><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Employee","Product","Model No.","Type","Qty","Sales Value","Incentive"].map(h=><Th key={h}>{h}</Th>)}</tr></thead><tbody>{sortedProducts.length?pageRows.map((row,index)=><tr key={`${row.staffId}-${row.productId}-${index}`} style={{borderBottom:"1px solid #cbd5e1"}}><Td><strong>{row.staffName}</strong></Td><Td>{row.productName}</Td><Td style={{fontFamily:"monospace"}}>{row.modelNumber||"-"}</Td><Td><Badge color={row.productType==="Imported"?"purple":"green"}>{row.productType}</Badge></Td><Td>{row.qty}</Td><Td><strong>{money(row.revenue)}</strong></Td><Td style={{color:"#7c3aed",fontWeight:800}}>{money(row.incentive)}</Td></tr>):<tr><td colSpan="7"><EmptyState text="No product performance found." /></td></tr>}</tbody></table></TableWrap>}
      {activeTab==="invoices" && <TableWrap><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Invoice","Date","Employee","Customer","Qty","Total","Received","Due","Incentive","Status"].map(h=><Th key={h}>{h}</Th>)}</tr></thead><tbody>{invoices.length?pageRows.map(row=><tr key={row._id} style={{borderBottom:"1px solid #cbd5e1"}}><Td style={{fontFamily:"monospace",fontWeight:800,color:"#0284c7"}}>{row.invoiceNo}</Td><Td>{new Date(row.date).toLocaleDateString("en-IN")}</Td><Td>{row.staffName}</Td><Td>{row.customerName}</Td><Td>{row.qty}</Td><Td><strong>{money(row.grandTotal)}</strong></Td><Td style={{color:"#15803d"}}>{money(row.amountPaid)}</Td><Td style={{color:"#dc2626"}}>{money(row.amountDue)}</Td><Td style={{color:"#7c3aed"}}>{money(row.incentiveAmount)}</Td><Td><Badge color={row.status==="Paid"?"green":row.status==="Partial"?"yellow":"red"}>{row.status}</Badge></Td></tr>):<tr><td colSpan="10"><EmptyState text="No invoices found." /></td></tr>}</tbody></table></TableWrap>}
      <Pagination page={page} totalPages={totalPages} totalRows={activeRows.length} onChange={setPage} />
    </>}
  </div>;
}
