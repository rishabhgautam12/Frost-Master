import { FormGroup, FormInput } from "./Shared";

const fields = [
  ["dispatchedThrough", "Dispatched Through"], ["destination", "Destination"],
  ["motorVehicleNo", "Motor Vehicle No."],
];

function PartyFields({ title, value = {}, onChange }) {
  return <div style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:12 }}>
    <div style={{ fontWeight:800, color:"#334155", marginBottom:10 }}>{title}</div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:10 }}>
      <FormGroup label="Business / Party Name"><FormInput value={value.name || ""} onChange={e => onChange("name", e.target.value)} /></FormGroup>
      <FormGroup label="GSTIN / UIN"><FormInput value={value.gstin || ""} onChange={e => onChange("gstin", e.target.value)} /></FormGroup>
      <FormGroup label="State Name"><FormInput value={value.stateName || ""} onChange={e => onChange("stateName", e.target.value)} /></FormGroup>
      <FormGroup label="State Code"><FormInput value={value.stateCode || ""} onChange={e => onChange("stateCode", e.target.value)} /></FormGroup>
    </div>
    <FormGroup label="Complete Address"><textarea rows="3" value={value.address || ""} onChange={e => onChange("address", e.target.value)} style={{ width:"100%", padding:9, border:"1px solid #d1d5db", borderRadius:7, boxSizing:"border-box", resize:"vertical" }} /></FormGroup>
  </div>;
}

export default function InvoiceDetailsFields({ value = {}, onChange }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const setParty = (party, key, next) => set(party, { ...(value[party] || {}), [key]: next });
  return <div style={{ marginBottom:20, padding:14, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:9 }}>
    <div style={{ fontSize:14, fontWeight:800, color:"#1e293b", marginBottom:12 }}>Invoice, Dispatch and Delivery Details</div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:10 }}>
      {fields.map(([key, label, type]) => <FormGroup key={key} label={label}><FormInput type={type || "text"} value={value[key] || ""} onChange={e => set(key, e.target.value)} /></FormGroup>)}
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:12 }}>
      <PartyFields title="Buyer (Bill To)" value={value.billTo} onChange={(key, next) => setParty("billTo", key, next)} />
      <PartyFields title="Consignee (Ship To)" value={value.shipTo} onChange={(key, next) => setParty("shipTo", key, next)} />
    </div>
  </div>;
}
