import { useState, useEffect } from "react";
import {
  PageTitle, Btn, SearchBar, Input, TableWrap, Th, Td,
  Badge, StatsGrid, Modal, FormGroup, FormInput, FormSelect,
  LoadingSpinner, ErrorMsg, SuccessToast,
} from "../components/Shared";
import { vendorAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";

const stColor  = { Settled:"green", Partial:"yellow", Pending:"red" };
const typColor = {
  Purchase:"blue", Payment:"green",
  "Debit Note":"yellow", "Credit Note":"gray", Return:"purple"
};

// Safe balance for a single entry
function entryBalance(r) {
  if (r.type === "Payment") return 0;                    // Payment rows have no balance due
  if (["Debit Note","Credit Note","Return"].includes(r.type)) return 0; // these are receivable, not payable
  const b = r.amount - r.paid;
  return b > 0 ? b : 0;                                 // never negative
}

export default function VendorLedger({ navigate }) {
  const [entries,   setEntries]   = useState([]);
  const [vendors,   setVendors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [selVendor, setSelVendor] = useState("all");
  const [selType,   setSelType]   = useState("All");
  const [from,      setFrom]      = useState("");
  const [to,        setTo]        = useState("");
  const [addModal,  setAddModal]  = useState(false);
  const [form, setForm] = useState({
    vendor:"", type:"Purchase", invoiceNo:"",
    date:new Date().toISOString().split("T")[0],
    amount:"", paid:"0", notes:""
  });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (selVendor !== "all") params.vendor = selVendor;
    if (selType   !== "All") params.type   = selType;
    if (from) params.from = from;
    if (to)   params.to   = to;

    Promise.all([vendorAPI.getLedger(params), vendorAPI.getAll()])
      .then(([lRes, vRes]) => {
        setEntries(lRes.data);
        setVendors(vRes.data);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.vendor || !form.amount)
      return alert("Please select a vendor and enter an amount.");
    setSaving(true);
    try {
      await vendorAPI.addLedgerEntry({ ...form, amount: +form.amount, paid: +form.paid });
      setToast("Entry added successfully!");
      setAddModal(false);
      setForm({
        vendor:"", type:"Purchase", invoiceNo:"",
        date:new Date().toISOString().split("T")[0],
        amount:"", paid:"0", notes:""
      });
      load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  // ── Correct summary calculations ─────────────────────────────────────────
  // Only count Purchase entries for purchase total
  const purchaseEntries = entries.filter(r => r.type === "Purchase");
  const paymentEntries  = entries.filter(r => r.type === "Payment");
  const returnEntries   = entries.filter(r =>
    ["Debit Note","Credit Note","Return"].includes(r.type)
  );

  const totalPurchaseAmt = purchaseEntries.reduce((s,r) => s + r.amount, 0);
  const totalPaymentAmt  = paymentEntries.reduce((s,r)  => s + r.amount,  0);
  const totalReturns     = returnEntries.reduce((s,r)   => s + r.amount,  0);

  // Correct outstanding = sum of each purchase's actual balance (matches what rows show)
  const totalActualPaid  = purchaseEntries.reduce((s,r) => s + Math.min(r.paid||0, r.amount), 0);
  const totalOutstanding = purchaseEntries.reduce((s,r) => {
    const effPaid = Math.min(r.paid||0, r.amount);
    return s + Math.max(0, r.amount - effPaid);
  }, 0);

  const pendingCount = purchaseEntries.filter(r => r.status === "Pending").length;

  // Per-vendor payable/receivable summary (for single-vendor filter)
  const vendorSummary = {};
  entries.forEach(e => {
    const vid   = e.vendor?._id || e.vendor;
    const vname = e.vendor?.name || "Unknown";
    if (!vendorSummary[vid])
      vendorSummary[vid] = { name:vname, purchased:0, paid:0, receivable:0 };
    if (e.type === "Purchase")
      vendorSummary[vid].purchased += e.amount;
    if (e.type === "Payment")
      vendorSummary[vid].paid += e.amount;
    if (["Debit Note","Credit Note","Return"].includes(e.type))
      vendorSummary[vid].receivable += e.amount;
  });

  // Footer: only sum Purchase rows for amount, only Payment rows for paid
  const footerPurchaseTotal = purchaseEntries.reduce((s,r) => s + r.amount, 0);
  const footerPaidTotal     = paymentEntries.reduce((s,r)  => s + r.amount, 0);
  // Balance Due footer = sum of each purchase row's actual balance
  // (NOT Purchase - Payment, because some purchases have paid stored directly on the entry)
  const footerBalance = purchaseEntries.reduce((s,r) => {
    const effPaid = Math.min(r.paid || 0, r.amount);
    return s + Math.max(0, r.amount - effPaid);
  }, 0);
  // Paid column in footer = payment rows + paid stored on purchase entries
  const footerPaidOnInvoices = purchaseEntries.reduce((s,r) => s + Math.min(r.paid||0, r.amount), 0);

  return (
    <div>
      <PageTitle>Vendor Ledger</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <StatsGrid cards={[
        { label:"Total Purchases",   value:`₹${totalPurchaseAmt.toLocaleString()}`, color:"#3b82f6" },
        { label:"Amount Paid",       value:`₹${totalActualPaid.toLocaleString()}`,  color:"#16a34a" },
        { label:"Outstanding Due",   value:`₹${totalOutstanding.toLocaleString()}`, color:"#ef4444" },
        { label:"Pending Invoices",  value:pendingCount,                             color:"#f59e0b" },
      ]} />

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14,
        flexWrap:"wrap", gap:10 }}>
        <Btn color="teal" onClick={() => setAddModal(true)}>+ Add Entry</Btn>
        <Btn color="green" onClick={() => downloadCSV(entries, [
          { label:"Date",        key:"date"        },
          { label:"Vendor",      key:"vendor.name" },
          { label:"Type",        key:"type"        },
          { label:"Invoice/Ref", key:"invoiceNo"   },
          { label:"Amount (₹)",  key:"amount"      },
          { label:"Paid (₹)",    key:"paid"        },
          { label:"Status",      key:"status"      },
        ], "vendor_ledger")}>⬇ Download CSV</Btn>
      </div>

      <SearchBar>
        <select value={selVendor} onChange={e => setSelVendor(e.target.value)}
          style={{ padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6,
            fontSize:12, background:"#f9fafb" }}>
          <option value="all">All Vendors</option>
          {vendors.map(v => (
            <option key={v._id} value={v._id}>{v.name} – {v.company}</option>
          ))}
        </select>
        <select value={selType} onChange={e => setSelType(e.target.value)}
          style={{ padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6,
            fontSize:12, background:"#f9fafb" }}>
          {["All","Purchase","Payment","Debit Note","Credit Note","Return"]
            .map(t => <option key={t}>{t}</option>)}
        </select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <Input type="date" value={to}   onChange={e => setTo(e.target.value)} />
        <Btn color="blue" onClick={load}>Filter</Btn>
      </SearchBar>

      {/* Single-vendor payable/receivable summary */}
      {selVendor !== "all" && vendorSummary[selVendor] && (() => {
        const vs      = vendorSummary[selVendor];
        const payable = Math.max(0, vs.purchased - vs.paid);
        return (
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8,
            padding:"12px 18px", marginBottom:14, display:"flex", gap:32,
            flexWrap:"wrap", fontSize:12, alignItems:"center" }}>
            <span style={{ fontWeight:800, color:"#1e293b", fontSize:13 }}>{vs.name}</span>
            <span>
              Total Purchased:&nbsp;
              <strong>₹{vs.purchased.toLocaleString()}</strong>
            </span>
            <span>
              Payments Made:&nbsp;
              <strong style={{ color:"#16a34a" }}>₹{vs.paid.toLocaleString()}</strong>
            </span>
            <span>
              We Owe (Payable):&nbsp;
              <strong style={{ color:"#ef4444" }}>₹{payable.toLocaleString()}</strong>
            </span>
            {vs.receivable > 0 && (
              <span>
                They Owe (Returns):&nbsp;
                <strong style={{ color:"#0ea5e9" }}>₹{vs.receivable.toLocaleString()}</strong>
              </span>
            )}
          </div>
        );
      })()}

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>
                {["Date","Vendor","Type","Invoice/Ref",
                  "Amount (₹)","Paid (₹)","Balance Due (₹)","Returns (₹)","Status","Action"]
                  .map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>
                    No entries found
                  </td>
                </tr>
              ) : entries.map(r => {
                const isReturn  = ["Debit Note","Credit Note","Return"].includes(r.type);
                const isPayment = r.type === "Payment";
                const isPurchase = r.type === "Purchase";

                // Cap paid at amount — prevent display of overpaid amounts
                const effectivePaid = Math.min(r.paid || 0, r.amount);
                // Balance = only for Purchase rows, never negative
                const bal = isPurchase ? Math.max(0, r.amount - effectivePaid) : 0;

                // Correct status for Purchase rows only
                let statusBadge = null;
                if (isPurchase) {
                  const s = effectivePaid >= r.amount ? "Settled"
                          : effectivePaid > 0 ? "Partial"
                          : "Pending";
                  statusBadge = <Badge color={stColor[s]}>{s}</Badge>;
                } else if (isReturn) {
                  statusBadge = <Badge color="blue">Credit</Badge>;
                }
                // Payment rows: no status badge — they are just payment records

                return (
                  <tr key={r._id} style={{ borderBottom:"1px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f0fdfa"}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    <Td>{new Date(r.date).toLocaleDateString("en-IN")}</Td>
                    <Td style={{ fontWeight:700 }}>{r.vendor?.name || "—"}</Td>
                    <Td>
                      <Badge color={typColor[r.type] || "gray"}>{r.type}</Badge>
                    </Td>
                    <Td style={{ color:"#0ea5e9", fontFamily:"monospace", fontSize:11 }}>
                      {r.invoiceNo || "—"}
                    </Td>
                    {/* Amount — invoice value */}
                    <Td style={{ fontWeight:700 }}>
                      ₹{r.amount.toLocaleString()}
                    </Td>
                    {/* Paid — only Purchase rows show paid amount */}
                    <Td style={{ color:"#16a34a", fontWeight:700 }}>
                      {isPurchase && effectivePaid > 0
                        ? `₹${effectivePaid.toLocaleString()}`
                        : "—"}
                    </Td>
                    {/* Balance Due — only Purchase rows */}
                    <Td style={{
                      color: isPurchase && bal > 0 ? "#ef4444" : "#94a3b8",
                      fontWeight:700
                    }}>
                      {isPurchase && bal > 0 ? `₹${bal.toLocaleString()}` : "—"}
                    </Td>
                    {/* Returns — only Debit/Credit Note / Return rows */}
                    <Td style={{ color:isReturn?"#0ea5e9":"#94a3b8", fontWeight:700 }}>
                      {isReturn ? `₹${r.amount.toLocaleString()}` : "—"}
                    </Td>
                    {/* Status — Purchase gets badge, Payment gets nothing */}
                    <Td>{statusBadge || <span style={{ color:"#94a3b8", fontSize:11 }}>—</span>}</Td>
                    {/* Action — Pay button only on unsettled Purchase entries */}
                    <Td>
                      {isPurchase && bal > 0 && (
                        <Btn sm color="teal" onClick={() => navigate("vendor-payout")}>
                          💳 Pay
                        </Btn>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer — clear and correct */}
            <tfoot>
              <tr style={{ background:"#eef6f5", fontWeight:700 }}>
                <td colSpan={4} style={{ padding:"10px 12px", fontSize:12 }}>
                  TOTAL &nbsp;
                  <span style={{ fontSize:10, fontWeight:400, color:"#64748b" }}>
                    ({purchaseEntries.length} purchases · {paymentEntries.length} payments)
                  </span>
                </td>
                {/* Total invoice amount (purchases only) */}
                <td style={{ padding:"10px 12px", fontWeight:800 }}>
                  ₹{footerPurchaseTotal.toLocaleString()}
                </td>
                {/* Total paid — sum of what's actually been paid on each invoice */}
                <td style={{ padding:"10px 12px", fontWeight:800, color:"#16a34a" }}>
                  ₹{footerPaidOnInvoices.toLocaleString()}
                </td>
                {/* Outstanding = exact sum of Balance Due column */}
                <td style={{ padding:"10px 12px", fontWeight:800, color:"#ef4444" }}>
                  {footerBalance > 0 ? `₹${footerBalance.toLocaleString()}` : "—"}
                </td>
                {/* Returns total */}
                <td style={{ padding:"10px 12px", fontWeight:800, color:"#0ea5e9" }}>
                  {totalReturns > 0 ? `₹${totalReturns.toLocaleString()}` : "—"}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </TableWrap>
      )}

      {/* Add Entry Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Ledger Entry">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormGroup label="Vendor *">
            <FormSelect value={form.vendor} onChange={set("vendor")}>
              <option value="">Select vendor</option>
              {vendors.map(v => (
                <option key={v._id} value={v._id}>{v.name} – {v.company}</option>
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Type *">
            <FormSelect value={form.type} onChange={set("type")}>
              {["Purchase","Payment","Debit Note","Credit Note","Return"]
                .map(t => <option key={t}>{t}</option>)}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Invoice/Ref No.">
            <FormInput placeholder="INV-001" value={form.invoiceNo} onChange={set("invoiceNo")} />
          </FormGroup>
          <FormGroup label="Date">
            <FormInput type="date" value={form.date} onChange={set("date")} />
          </FormGroup>
          <FormGroup label="Amount (₹) *">
            <FormInput type="number" placeholder="0" value={form.amount} onChange={set("amount")} />
          </FormGroup>
          <FormGroup label="Amount Paid (₹)">
            <FormInput type="number" placeholder="0" value={form.paid} onChange={set("paid")} />
          </FormGroup>
        </div>
        <FormGroup label="Notes">
          <FormInput placeholder="Optional notes" value={form.notes} onChange={set("notes")} />
        </FormGroup>
        {/* Helper text */}
        <div style={{ marginTop:10, fontSize:11, color:"#64748b", background:"#f8fafc",
          borderRadius:6, padding:"8px 12px" }}>
          💡 <strong>Purchase</strong> — vendor supplied goods (we owe them) &nbsp;|&nbsp;
          <strong>Payment</strong> — we paid them (reduces what we owe) &nbsp;|&nbsp;
          <strong>Debit/Credit Note / Return</strong> — goods returned / adjustment (they owe us)
        </div>
        <div style={{ display:"flex", gap:10, marginTop:14 }}>
          <Btn color="cancel" onClick={() => setAddModal(false)}>Cancel</Btn>
          <Btn color="teal" onClick={handleAdd} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Entry"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}