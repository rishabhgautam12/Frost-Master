// One customer form used everywhere a customer is added or edited, so every entry captures the same details.
import { FormGroup, FormInput, FormSelect, FormSection } from "./Shared";

// GST state codes (first two digits of a GSTIN).
export const GST_STATES = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"],
  ["05", "Uttarakhand"], ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"], ["09", "Uttar Pradesh"],
  ["10", "Bihar"], ["11", "Sikkim"], ["12", "Arunachal Pradesh"], ["13", "Nagaland"], ["14", "Manipur"],
  ["15", "Mizoram"], ["16", "Tripura"], ["17", "Meghalaya"], ["18", "Assam"], ["19", "West Bengal"],
  ["20", "Jharkhand"], ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"], ["27", "Maharashtra"], ["29", "Karnataka"], ["30", "Goa"],
  ["31", "Lakshadweep"], ["32", "Kerala"], ["33", "Tamil Nadu"], ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"], ["36", "Telangana"], ["37", "Andhra Pradesh"], ["38", "Ladakh"],
  ["97", "Other Territory"],
];
const stateByCode = Object.fromEntries(GST_STATES);
const codeByState = Object.fromEntries(GST_STATES.map(([code, name]) => [name.toLowerCase(), code]));

export const CUSTOMER_TYPES = ["Retail", "Wholesale", "VIP", "Dealer", "Online"];

export const BLANK_CUSTOMER = {
  name: "", phone: "", email: "", customerType: "Retail", address: "", city: "",
  stateName: "", stateCode: "", gstin: "", creditLimit: "", notes: "", status: "Active",
};

export const customerToForm = c => ({
  name: c.name || "", phone: c.phone || "", email: c.email || "", customerType: c.customerType || "Retail",
  address: c.address || "", city: c.city || "", stateName: c.stateName || "", stateCode: c.stateCode || "",
  gstin: c.gstin || "", creditLimit: c.creditLimit ? String(c.creditLimit) : "", notes: c.notes || "",
  status: c.status || "Active",
});

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

// Returns an error message, or "" when the form can be saved.
export const validateCustomer = form => {
  if (!form.name.trim()) return "Customer name is required.";
  if (!/^\d{10}$/.test(form.phone)) return "Phone number must be exactly 10 digits.";
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
  if (form.gstin && !GSTIN_PATTERN.test(form.gstin)) return "GSTIN should be 15 characters, e.g. 07AAECF4100D1ZC.";
  return "";
};

export const customerPayload = form => ({ ...form, name: form.name.trim(), creditLimit: +form.creditLimit || 0 });

export default function CustomerFormFields({ form, setForm, showStatus = false }) {
  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const setPhone = e => setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }));

  const setState = e => {
    const name = e.target.value;
    setForm(prev => ({ ...prev, stateName: name, stateCode: codeByState[name.toLowerCase()] || prev.stateCode }));
  };
  const setStateCode = e => {
    const code = e.target.value.replace(/\D/g, "").slice(0, 2);
    setForm(prev => ({ ...prev, stateCode: code, stateName: (code.length === 2 && stateByCode[code]) || prev.stateName }));
  };
  // A GSTIN starts with the state code, so fill the state from it.
  const setGstin = e => {
    const gstin = e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 15);
    const code = gstin.slice(0, 2);
    setForm(prev => ({ ...prev, gstin, ...(stateByCode[code] ? { stateCode: code, stateName: stateByCode[code] } : {}) }));
  };

  return (
    <>
      <FormSection title="Basic details">
        <FormGroup label="Full name *">
          <FormInput placeholder="e.g. Amit Sharma" value={form.name} onChange={set("name")} autoFocus />
        </FormGroup>
        <FormGroup label="Phone *" hint="10-digit mobile number">
          <FormInput type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" value={form.phone} onChange={setPhone} />
        </FormGroup>
        <FormGroup label="Email">
          <FormInput type="email" placeholder="name@example.com" value={form.email} onChange={set("email")} />
        </FormGroup>
        <FormGroup label="Customer type">
          <FormSelect value={form.customerType} onChange={set("customerType")}>
            {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
          </FormSelect>
        </FormGroup>
      </FormSection>

      <FormSection title="Address & GST" description="Used as Bill To / Ship To on invoices.">
        <FormGroup label="Address" full>
          <FormInput placeholder="Shop / building, street, area" value={form.address} onChange={set("address")} />
        </FormGroup>
        <FormGroup label="City">
          <FormInput placeholder="e.g. Ghaziabad" value={form.city} onChange={set("city")} />
        </FormGroup>
        <FormGroup label="State">
          <FormInput list="fm-gst-states" placeholder="Select or type state" value={form.stateName} onChange={setState} />
          <datalist id="fm-gst-states">{GST_STATES.map(([, name]) => <option key={name} value={name} />)}</datalist>
        </FormGroup>
        <FormGroup label="State code" hint="Fills from state or GSTIN">
          <FormInput inputMode="numeric" maxLength={2} placeholder="07" value={form.stateCode} onChange={setStateCode} />
        </FormGroup>
        <FormGroup label="GSTIN" hint="Optional · 15 characters">
          <FormInput placeholder="07AAECF4100D1ZC" value={form.gstin} onChange={setGstin} style={{ textTransform: "uppercase", letterSpacing: "0.03em" }} />
        </FormGroup>
      </FormSection>

      <FormSection title="Account" last>
        <FormGroup label="Credit limit (₹)">
          <FormInput type="number" min="0" placeholder="0" value={form.creditLimit} onChange={set("creditLimit")} />
        </FormGroup>
        {showStatus && (
          <FormGroup label="Status">
            <FormSelect value={form.status} onChange={set("status")}>
              {["Active", "Inactive", "VIP"].map(s => <option key={s}>{s}</option>)}
            </FormSelect>
          </FormGroup>
        )}
        <FormGroup label="Notes" full>
          <FormInput placeholder="Anything the team should know" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </FormSection>
    </>
  );
}
