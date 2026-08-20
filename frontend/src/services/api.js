const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("ht_token") || "";
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (res.status === 401) {
    // Token expired / invalid → force logout
    localStorage.removeItem("ht_token");
    localStorage.removeItem("ht_user");
    window.location.reload();
    throw new Error("Session expired. Please log in again.");
  }
  if (!data.success) throw new Error(data.message || "Request failed");
  return data;
}

// Auth
export const authAPI = {
  login:         (body)     => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me:            ()         => request("/auth/me"),
  getStaff:      ()         => request("/auth/staff"),
  createStaff:   (body)     => request("/auth/staff",       { method: "POST",   body: JSON.stringify(body) }),
  updateStaff:   (id, body) => request(`/auth/staff/${id}`, { method: "PUT",    body: JSON.stringify(body) }),
  deleteStaff:   (id)       => request(`/auth/staff/${id}`, { method: "DELETE" }),
  getActivityLogs:(params = {}) => request(`/auth/activity-logs?${new URLSearchParams(params)}`),
};

// Vendors
export const vendorAPI = {
  getAll:        (params = {}) => request(`/vendors?${new URLSearchParams(params)}`),
  getById:       (id)          => request(`/vendors/${id}`),
  create:        (body)        => request("/vendors",        { method: "POST",   body: JSON.stringify(body) }),
  update:        (id, body)    => request(`/vendors/${id}`,  { method: "PUT",    body: JSON.stringify(body) }),
  toggleStatus:  (id)          => request(`/vendors/${id}/toggle-status`, { method: "PATCH" }),
  delete:        (id)          => request(`/vendors/${id}`,  { method: "DELETE" }),
  getLedger:     (params = {}) => request(`/vendors/ledger?${new URLSearchParams(params)}`),
  addLedgerEntry:(body)        => request("/vendors/ledger", { method: "POST",   body: JSON.stringify(body) }),
  payLedgerEntry:(id, body)    => request(`/vendors/ledger/${id}/pay`, { method: "PATCH", body: JSON.stringify(body) }),
};

// Products
export const productAPI = {
  getAll:      (params = {}) => request(`/products?${new URLSearchParams(params)}`),
  getById:     (id)          => request(`/products/${id}`),
  create:      (body)        => request("/products",        { method: "POST",   body: JSON.stringify(body) }),
  update:      (id, body)    => request(`/products/${id}`,  { method: "PUT",    body: JSON.stringify(body) }),
  delete:      (id)          => request(`/products/${id}`,  { method: "DELETE" }),
  updateStock: (id, body)    => request(`/products/${id}/stock`, { method: "PATCH", body: JSON.stringify(body) }),
};

// Customers
export const customerAPI = {
  getAll:        (params = {}) => request(`/customers?${new URLSearchParams(params)}`),
  getById:       (id)          => request(`/customers/${id}`),
  create:        (body)        => request("/customers",        { method: "POST",   body: JSON.stringify(body) }),
  update:        (id, body)    => request(`/customers/${id}`,  { method: "PUT",    body: JSON.stringify(body) }),
  delete:        (id)          => request(`/customers/${id}`,  { method: "DELETE" }),
  recordPayment: (body)        => request("/customers/payment",{ method: "POST",   body: JSON.stringify(body) }),
  payForSale:    (saleId, body) => request(`/customers/sales/${saleId}/pay`, { method: "PATCH", body: JSON.stringify(body) }),
};

// Sales
export const salesAPI = {
  getAll:                  (params = {}) => request(`/sales?${new URLSearchParams(params)}`),
  getById:                 (id)          => request(`/sales/${id}`),
  create:                  (body)        => request("/sales",            { method: "POST",   body: JSON.stringify(body) }),
  updatePayment:           (id, body)    => request(`/sales/${id}/payment`,{ method: "PATCH", body: JSON.stringify(body) }),
  payForSale:              (id, body)    => request(`/sales/${id}/pay`,   { method: "PATCH", body: JSON.stringify(body) }),
  updateSaleDetails:       (id, body)    => request(`/sales/${id}/details`,{ method: "PUT",  body: JSON.stringify(body) }),
  cancel:                  (id)          => request(`/sales/${id}/cancel`,  { method: "PATCH" }),
  getGSTReport:            (params = {}) => request(`/sales/gst-report?${new URLSearchParams(params)}`),
  getStaffReport:          (params = {}) => request(`/sales/staff-report?${new URLSearchParams(params)}`),
  getPurchases:            ()            => request("/sales/purchases/all"),
  createPurchase:          (body)        => request("/sales/purchases",  { method: "POST",  body: JSON.stringify(body) }),
  updatePurchase:          (id, body)    => request(`/sales/purchases/${id}`, { method: "PUT",   body: JSON.stringify(body) }),
  updatePurchasePayment:   (id, body)    => request(`/sales/purchases/${id}/payment`, { method: "PATCH", body: JSON.stringify(body) }),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => request("/dashboard/stats"),
};

// Employees, attendance and salary
export const employeeAPI = {
  getWarehouses:  ()         => request("/employees/warehouses"),
  createWarehouse:(body)     => request("/employees/warehouses", { method: "POST", body: JSON.stringify(body) }),
  updateWarehouse:(id, body) => request(`/employees/warehouses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteWarehouse:(id)       => request(`/employees/warehouses/${id}`, { method: "DELETE" }),
  getAll:         (params = {}) => request(`/employees?${new URLSearchParams(params)}`),
  create:         (body)     => request("/employees", { method: "POST", body: JSON.stringify(body) }),
  update:         (id, body) => request(`/employees/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete:         (id)       => request(`/employees/${id}`, { method: "DELETE" }),
  getById:        (id, params = {}) => request(`/employees/${id}?${new URLSearchParams(params)}`),
  saveAttendance: (id, body) => request(`/employees/${id}/attendance`, { method: "PUT", body: JSON.stringify(body) }),
  setSalaryLock:  (id, body) => request(`/employees/${id}/salary-lock`, { method: "PUT", body: JSON.stringify(body) }),
  addPayment:     (id, body) => request(`/employees/${id}/payments`, { method: "POST", body: JSON.stringify(body) }),
  updatePayment:  (id, paymentId, body) => request(`/employees/${id}/payments/${paymentId}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePayment:  (id, paymentId) => request(`/employees/${id}/payments/${paymentId}`, { method: "DELETE" }),
};
