import { useState } from "react";
import { PageTitle, Btn, FormGroup, FormInput, FormSelect, SuccessToast } from "../components/Shared";
import { vendorAPI } from "../services/api";

const normalizePhone = value => value.replace(/\D/g, "").slice(0, 10);
const isValidPhone = value => /^\d{10}$/.test(value);

export default function VendorAdd({ navigate }) {
  const [form, setForm] = useState({
    name:"", company:"", phone:"", email:"", city:"", address:"", gstin:"", status:"Active", notes:""
  });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setPhone = e => setForm(p => ({ ...p, phone: normalizePhone(e.target.value) }));

  const handleSave = async () => {
    if (!form.name || !form.company || !form.phone)
      return alert("Name, company and phone are required.");
    if (!isValidPhone(form.phone))
      return alert("Phone number must be exactly 10 digits.");
    setSaving(true);
    try {
      await vendorAPI.create(form);
      setToast("Vendor added successfully!");
      setTimeout(() => navigate("vendor-list"), 1500);
    } catch (e) { alert(e.message); setSaving(false); }
  };

  return (
    <div style={{ maxWidth:680, margin:"auto" }}>
      <PageTitle>Create New Vendor</PageTitle>
      {toast && <SuccessToast msg={toast} />}
      <div style={{ background:"#fff", borderRadius:10, padding:28, border:"1px solid #e2e8f0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormGroup label="Vendor Name *">
            <FormInput placeholder="e.g. Rohan Sharma" value={form.name} onChange={set("name")} />
          </FormGroup>
          <FormGroup label="Company Name *">
            <FormInput placeholder="e.g. Rohan Traders" value={form.company} onChange={set("company")} />
          </FormGroup>
          <FormGroup label="Phone *">
            <FormInput type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10}
              placeholder="9876543210" value={form.phone} onChange={setPhone} />
          </FormGroup>
          <FormGroup label="Email">
            <FormInput placeholder="vendor@example.com" value={form.email} onChange={set("email")} />
          </FormGroup>
          <FormGroup label="City">
            <FormInput placeholder="Delhi" value={form.city} onChange={set("city")} />
          </FormGroup>
          <FormGroup label="GSTIN">
            <FormInput placeholder="07AABCT1332L1ZV" value={form.gstin} onChange={set("gstin")} />
          </FormGroup>
          <FormGroup label="Status">
            <FormSelect value={form.status} onChange={set("status")}>
              {["Active","Inactive","Pending"].map(s => <option key={s}>{s}</option>)}
            </FormSelect>
          </FormGroup>
        </div>
        <FormGroup label="Address">
          <FormInput placeholder="Full address" value={form.address} onChange={set("address")} />
        </FormGroup>
        <FormGroup label="Notes">
          <textarea placeholder="Any notes..." rows={2} value={form.notes} onChange={set("notes")}
            style={{ width:"100%", padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:7, fontSize:13, outline:"none", background:"#f9fafb", boxSizing:"border-box", resize:"vertical" }} />
        </FormGroup>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <Btn color="cancel" onClick={() => navigate("vendor-list")}>Cancel</Btn>
          <Btn color="teal" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Vendor"}</Btn>
        </div>
      </div>
    </div>
  );
}
