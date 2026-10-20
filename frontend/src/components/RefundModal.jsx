import { useEffect, useState } from "react";
import { Modal, FormGroup, FormInput, FormSelect } from "./Shared";
import { salesAPI } from "../services/api";
import "./RefundModal.css";

const money = value => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits:2 })}`;
const date = value => new Date(value).toLocaleDateString("en-IN");
const today = () => { const d = new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const requestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const receiptLabel = p => `${date(p.date)} · ${p.paymentMode} · ${money(p.amount)} · Receipt …${String(p._id).slice(-8)}`;

export function RefundHistory({ record }) {
  if (!record.refunds?.length) return null;
  return <section className="refund-history"><h3>Refund history · {money(record.refunds.reduce((sum,r) => sum+r.amount,0))}</h3>
    {[...record.refunds].reverse().map(r => {
      const receipt = record.payments?.find(p => p._id === r.paymentId);
      return <article key={r._id}><div className="refund-history-heading"><strong>{money(r.amount)} refunded</strong><span>{r.type}</span></div>
        <p>{date(r.date)} · {r.method} · Recorded by {r.recordedByName || "Admin"}</p>
        <div className="refund-note">{r.notes}</div>
        <small>{r.paymentId ? `Original payment: ${receipt ? receiptLabel(receipt) : r.paymentId}` : "No original payment reference selected"}</small>
        <small>Refund ID: {r._id}</small>
      </article>;
    })}
  </section>;
}

export default function RefundModal({ kind, record, isAdmin, onClose, onDone }) {
  const [data,setData] = useState(null), [error,setError] = useState(""), [saving,setSaving] = useState(false);
  const [form,setForm] = useState({ type:"Extra Payment", amount:"", method:"Cash", date:today(), notes:"", paymentId:"", requestId:requestId() });
  const [confirmed,setConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    salesAPI.getRefunds(kind,record._id).then(r => { if(active) { setData(r.data); if(r.data.document.status === "Cancelled") setForm(f => ({...f,type:"Cancellation"})); } }).catch(e => {if(active) setError(e.message);});
    return () => { active=false; };
  },[kind,record._id]);
  const set = (key,value) => { setForm(f => ({...f,[key]:value})); setConfirmed(false); };
  const document = data?.document;
  const payment = document?.payments.find(p => p._id === form.paymentId);
  const refundable = data ? Math.min(form.type === "Cancellation" ? data.received : data.advance, payment ? payment.amount-(payment.refundedAmount || 0) : Infinity) : 0;
  const cancelling = form.type === "Cancellation" && document?.status !== "Cancelled";
  async function submit(e) {
    e.preventDefault();
    if (!confirmed) return setError("Confirm the refund before recording it.");
    setSaving(true); setError("");
    try {
      const response = await salesAPI.refund(kind,record._id,{...form,amount:Number(form.amount)});
      setData(response.data); setForm(f => ({...f,amount:"",notes:"",paymentId:"",requestId:requestId()})); setConfirmed(false);
      onDone(response.message);
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  }
  return <Modal open wide title={`Refunds · ${document?.invoiceNo || document?.orderNo || record.invoiceNo || record.orderNo}`} onClose={() => !saving && onClose()}>
    <div className="refund-workspace">
      {error && <div className="refund-error" role="alert">{error}</div>}
      {!data ? <p>{error ? "Refund details could not be loaded. Close and reopen this window after resolving the error." : "Loading refund details…"}</p> : <>
        {kind === "orders" && data.kind === "sales" && <p className="refund-info">This order is converted. Refunds are managed against its linked sale and shown on both records.</p>}
        <div className="refund-summary">{[["Original receipts",document.payments.reduce((sum,p)=>sum+p.amount,0)],["Refunded",document.refunds.reduce((sum,r)=>sum+r.amount,0)],["Money still held",data.received],[document.status === "Cancelled" ? "Pending cancellation refund" : "Extra payment",document.status === "Cancelled" ? data.received : data.advance]].map(([label,value]) => <div key={label}><small>{label}</small><strong>{money(value)}</strong></div>)}</div>
        <RefundHistory record={document} />
        {document.refunds.length > 0 && <p className="refund-info">Original receipts and financial document edits are locked after a refund to protect the audit history. Further eligible refunds can still be recorded here.</p>}
        {isAdmin && data.received > 0 ? <form onSubmit={submit} className="refund-form"><h3>Record a refund</h3>
          <div className="refund-fields">
            <FormGroup label="Refund type"><FormSelect value={form.type} onChange={e=>set("type",e.target.value)} disabled={saving || document.status === "Cancelled"}><option>Extra Payment</option><option>Cancellation</option></FormSelect></FormGroup>
            <FormGroup label="Original payment reference (optional)"><FormSelect value={form.paymentId} onChange={e=>set("paymentId",e.target.value)} disabled={saving}><option value="">No specific payment reference</option>{document.payments.filter(p=>p.amount>(p.refundedAmount||0)).map(p=><option key={p._id} value={p._id}>{receiptLabel(p)} · Available {money(p.amount-(p.refundedAmount||0))}</option>)}</FormSelect></FormGroup>
            <FormGroup label={`Refund amount · Maximum ${money(refundable)}`}><FormInput required type="number" min="0.01" step="0.01" max={refundable} value={form.amount} disabled={saving} onChange={e=>set("amount",e.target.value)} /></FormGroup>
            <FormGroup label="Refund method"><FormSelect value={form.method} disabled={saving} onChange={e=>set("method",e.target.value)}>{["Cash","UPI","Card","Bank Transfer","Cheque"].map(m=><option key={m}>{m}</option>)}</FormSelect></FormGroup>
            <FormGroup label="Refund date"><FormInput required type="date" max={today()} disabled={saving} value={form.date} onChange={e=>set("date",e.target.value)} /></FormGroup>
          </div>
          <FormGroup label="Reason / note *"><textarea required rows={3} maxLength={2000} disabled={saving} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Explain the refund and add any bank / UPI transaction reference." /></FormGroup>
          <p className={cancelling ? "refund-warning" : "refund-info"}>{cancelling ? `This cancels the entire ${data.kind === "sales" ? "sale and restores all its product quantities to stock" : "order"}. It is not an individual product return. Any money not refunded now stays visible as pending cancellation refund.` : form.type === "Extra Payment" ? "Only the extra payment is refunded. The invoice / order value and stock stay unchanged." : "The document is already cancelled. This records another refund without restoring stock again."}</p>
          <label className="refund-confirm"><input type="checkbox" checked={confirmed} disabled={saving} onChange={e=>setConfirmed(e.target.checked)} /><span>I confirm the money has been returned to the customer{cancelling ? " and the entire document should be cancelled" : ""}. This records the refund; it does not transfer money.</span></label>
          <div className="refund-actions"><button type="button" onClick={onClose} disabled={saving}>Close</button><button type="submit" disabled={saving || !confirmed || refundable<=0}>{saving ? "Recording…" : cancelling ? "Cancel & record refund" : "Record refund"}</button></div>
        </form> : <p className="refund-info">{data.received<=0 ? "No unrefunded payments remain." : "Only an admin can record a refund."}</p>}
      </>}
    </div>
  </Modal>;
}
