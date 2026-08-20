import { useState, useEffect } from "react";
import {
  PageTitle, Btn, TableWrap, Th, Td, Badge,
  Modal, FormGroup, FormInput, FormSelect,
  StatsGrid, LoadingSpinner, ErrorMsg, SuccessToast,
} from "../components/Shared";
import { vendorAPI } from "../services/api";
import { downloadCSV } from "../services/csvExport";

export default function VendorPayout({ navigate }) {
  const [pending,  setPending]  = useState([]);
  const [vendors,  setVendors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [form,     setForm]     = useState({
    amount:"", method:"NEFT", ref:"",
    date: new Date().toISOString().split("T")[0], notes:""
  });
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      vendorAPI.getLedger({ type:"Purchase" }),
      vendorAPI.getAll({ status:"Active" }),
    ])
      .then(([lRes, vRes]) => {
        // Only show Purchase entries that are not fully settled
        const due = lRes.data.filter(e =>
          e.type === "Purchase" &&
          (e.balance ?? (e.amount - e.paid)) > 0
        );
        setPending(due);
        setVendors(vRes.data);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const totalDue = pending.reduce((s, e) => s + (e.balance ?? (e.amount - e.paid)), 0);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openPayModal = (entry) => {
    const bal = entry.balance ?? (entry.amount - entry.paid);
    setPayModal(entry);
    setForm(f => ({ ...f, amount: String(bal), ref:"", notes:"" }));
  };

  const handlePay = async () => {
    if (!form.amount || +form.amount <= 0)
      return alert("Please enter a valid amount.");
    const bal = payModal.balance ?? (payModal.amount - payModal.paid);
    if (+form.amount > bal)
      return alert(`Amount cannot exceed the balance due of ₹${bal.toLocaleString()}.`);

    setSaving(true);
    try {
      const res = await vendorAPI.payLedgerEntry(payModal._id, {
        amount: +form.amount,
        method: form.method,
        ref:    form.ref,
        date:   form.date,
        notes:  form.notes,
      });

      setToast(res.message);
      setPayModal(null);
      setForm({ amount:"", method:"NEFT", ref:"", date: new Date().toISOString().split("T")[0], notes:"" });
      load(); // refresh list — settled ones will disappear
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div>
      <PageTitle>Vendor Payout</PageTitle>
      {toast && <SuccessToast msg={toast} />}

      <StatsGrid cards={[
        { label:"Pending Invoices",  value: pending.length,                        color:"#f59e0b" },
        { label:"Total Outstanding", value: `₹${totalDue.toLocaleString()}`,       color:"#ef4444" },
        { label:"Active Vendors",    value: vendors.length,                        color:"#3b82f6" },
      ]} />

      {loading ? <LoadingSpinner /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#1e293b" }}>⏳ Pending Payouts</div>
            <Btn color="green" onClick={() => downloadCSV(pending, [
              { label:"Vendor",        key:"vendor.name" },
              { label:"Invoice/Ref",   key:"invoiceNo"   },
              { label:"Date",          key:"date"        },
              { label:"Amount (₹)",    key:"amount"      },
              { label:"Paid (₹)",      key:"paid"        },
              { label:"Status",        key:"status"      },
            ], "vendor_pending_payouts")}>⬇ Export CSV</Btn>
          </div>
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr>{["Vendor","Invoice / Ref","Date","Invoice Amt (₹)","Paid (₹)","Balance Due (₹)","Status","Action"]
                  .map(h => <Th key={h}>{h}</Th>)}</tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>
                      🎉 All vendor payments are settled!
                    </td>
                  </tr>
                ) : pending.map(e => {
                  const bal = e.balance ?? (e.amount - e.paid);
                  return (
                    <tr key={e._id} style={{ borderBottom:"1px solid #f1f5f9" }}
                      onMouseEnter={ev => ev.currentTarget.style.background="#f0fdfa"}
                      onMouseLeave={ev => ev.currentTarget.style.background=""}>
                      <Td style={{ fontWeight:700 }}>{e.vendor?.name || "—"}</Td>
                      <Td style={{ fontFamily:"monospace", color:"#0ea5e9", fontSize:11 }}>
                        {e.invoiceNo || "—"}
                      </Td>
                      <Td>{new Date(e.date).toLocaleDateString("en-IN")}</Td>
                      <Td style={{ fontWeight:700 }}>₹{e.amount.toLocaleString()}</Td>
                      <Td style={{ color:"#16a34a", fontWeight:700 }}>
                        ₹{e.paid.toLocaleString()}
                      </Td>
                      <Td style={{ color:"#ef4444", fontWeight:800 }}>
                        ₹{bal.toLocaleString()}
                      </Td>
                      <Td>
                        <Badge color={{ Settled:"green", Partial:"yellow", Pending:"red" }[e.status] || "gray"}>
                          {e.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Btn sm color="teal" onClick={() => openPayModal(e)}>
                          💳 Pay Now
                        </Btn>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>

              {pending.length > 0 && (
                <tfoot>
                  <tr style={{ background:"#eef6f5", fontWeight:700 }}>
                    <td colSpan={3} style={{ padding:"10px 12px" }}>
                      TOTAL ({pending.length} invoices)
                    </td>
                    <td style={{ padding:"10px 12px" }}>
                      ₹{pending.reduce((s,e)=>s+e.amount,0).toLocaleString()}
                    </td>
                    <td style={{ padding:"10px 12px", color:"#16a34a" }}>
                      ₹{pending.reduce((s,e)=>s+e.paid,0).toLocaleString()}
                    </td>
                    <td style={{ padding:"10px 12px", color:"#ef4444", fontWeight:800 }}>
                      ₹{totalDue.toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </TableWrap>
        </>
      )}

      {/* ── Pay Modal ── */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)}
        title={`Pay Invoice — ${payModal?.vendor?.name}`}>
        {payModal && (() => {
          const bal     = payModal.balance ?? (payModal.amount - payModal.paid);
          const paying  = +form.amount || 0;
          const leftAfter = Math.max(0, bal - paying);
          return (
            <div>
              {/* Invoice summary strip */}
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0",
                borderRadius:8, padding:"12px 16px", marginBottom:16,
                display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, fontSize:12 }}>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Invoice</div>
                  <div style={{ fontWeight:700, fontFamily:"monospace", color:"#0ea5e9" }}>
                    {payModal.invoiceNo || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Invoice Amount</div>
                  <div style={{ fontWeight:700 }}>₹{payModal.amount.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Balance Due</div>
                  <div style={{ fontWeight:800, color:"#ef4444", fontSize:14 }}>
                    ₹{bal.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Already Paid</div>
                  <div style={{ fontWeight:700, color:"#16a34a" }}>
                    ₹{payModal.paid.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>Current Status</div>
                  <Badge color={{ Settled:"green", Partial:"yellow", Pending:"red" }[payModal.status]}>
                    {payModal.status}
                  </Badge>
                </div>
                <div>
                  <div style={{ color:"#64748b", fontSize:10, fontWeight:700,
                    textTransform:"uppercase", marginBottom:3 }}>After This Payment</div>
                  <Badge color={leftAfter === 0 ? "green" : paying > 0 ? "yellow" : "red"}>
                    {leftAfter === 0 && paying > 0
                      ? "✅ Fully Settled"
                      : paying > 0
                      ? `₹${leftAfter.toLocaleString()} remaining`
                      : "—"}
                  </Badge>
                </div>
              </div>

              {/* Form */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <FormGroup label="Amount Paying (₹) *">
                  <FormInput type="number" value={form.amount}
                    onChange={set("amount")}
                    placeholder={`Max ₹${bal.toLocaleString()}`} />
                  {paying > bal && (
                    <div style={{ color:"#ef4444", fontSize:10, marginTop:3 }}>
                      ⚠️ Cannot exceed balance of ₹{bal.toLocaleString()}
                    </div>
                  )}
                </FormGroup>
                <FormGroup label="Payment Method">
                  <FormSelect value={form.method} onChange={set("method")}>
                    {["NEFT","UPI","Cheque","Bank Transfer","Cash"].map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Reference / UTR No.">
                  <FormInput placeholder="e.g. NEFT1234567" value={form.ref} onChange={set("ref")} />
                </FormGroup>
                <FormGroup label="Payment Date">
                  <FormInput type="date" value={form.date} onChange={set("date")} />
                </FormGroup>
              </div>
              <FormGroup label="Notes (optional)">
                <FormInput placeholder="Any notes..." value={form.notes} onChange={set("notes")} />
              </FormGroup>

              <div style={{ display:"flex", gap:10, marginTop:16 }}>
                <Btn color="cancel" onClick={() => setPayModal(null)}>Cancel</Btn>
                <Btn color="teal" onClick={handlePay}
                  disabled={saving || !form.amount || +form.amount <= 0 || +form.amount > bal}>
                  {saving ? "Processing..." : `💸 Pay ₹${(+form.amount||0).toLocaleString()}`}
                </Btn>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
