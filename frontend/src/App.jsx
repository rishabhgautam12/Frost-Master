import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import { AuthLoadingScreen, WelcomeTransition } from "./components/AppLoader";
import Navbar    from "./components/Navbar";
import StaffManagement from "./pages/StaffManagement";
import EmployeeManagement from "./pages/EmployeeManagement";

import Dashboard       from "./pages/Dashboard";
import VendorList      from "./pages/VendorList";
import VendorProfile   from "./pages/VendorProfile";
import VendorAdd       from "./pages/VendorAdd";
import VendorLedger    from "./pages/VendorLedger";
import VendorPayout    from "./pages/VendorPayout";
import ProductList     from "./pages/ProductList";
import ProductAdd      from "./pages/ProductAdd";
import ProductStock    from "./pages/ProductStock";
import CustomerList    from "./pages/CustomerList";
import CustomerProfile from "./pages/CustomerProfile";
import CreateSale      from "./pages/CreateSale";
import SalesList       from "./pages/SalesList";
import CreatePurchase  from "./pages/CreatePurchase";
import PurchasesList   from "./pages/PurchasesList";
import GSTReport       from "./pages/GSTReport";
import SalesReport     from "./pages/SalesReport";
import StaffSalesReport from "./pages/StaffSalesReport";
import ReportGraphs    from "./pages/ReportGraphs";
import ReportGrowth    from "./pages/ReportGrowth";

const bcNames = {
  dashboard:         "Dashboard",
  "vendor-list":     "Vendors",       "vendor-add":       "Add Vendor",
  "vendor-ledger":   "Vendor Ledger", "vendor-payout":    "Vendor Payout",
  "product-list":    "Products",      "product-add":      "Add Product",
  "product-stock":   "Product Stocks",
  "customer-list":   "Customers",
  "sale-create":     "Create Sale",   "sales-list":       "All Sales",
  "purchase-create": "Create Purchase","purchases-list":  "All Purchases",
  "gst-report":      "GST Report",    "sales-report":     "Sales Report",
  "staff-sales-report":"Staff Sales Report",
  "report-graphs":   "Graphs",        "report-growth":    "Growth Report",
  "staff-management":"Staff Management",
  "employee-management":"Employees",
};

function getLabel(page) {
  if (page.startsWith("vendor-profile:"))   return "Vendor Profile";
  if (page.startsWith("customer-profile:")) return "Customer Profile";
  return bcNames[page] || page;
}

function AccessDenied() {
  return (
    <div style={{ textAlign: "center", padding: 80, color: "#64748b" }}>
      <div style={{ fontSize: 52 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginTop: 12 }}>Access Denied</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>You don't have permission to view this page.</div>
      <div style={{ fontSize: 13, marginTop: 4, color: "#94a3b8" }}>Contact your administrator for access.</div>
    </div>
  );
}

export default function App() {
  const { user, logout, loading, justLoggedIn, clearJustLoggedIn } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [welcoming, setWelcoming] = useState(false);

  useEffect(() => {
    if (!justLoggedIn) return;
    setWelcoming(true);
    const t = setTimeout(() => {
      setWelcoming(false);
      clearJustLoggedIn();
    }, 1400);
    return () => clearTimeout(t);
  }, [justLoggedIn]);

  if (loading)    return <AuthLoadingScreen />;
  if (!user)      return <LoginPage />;
  if (welcoming)  return <WelcomeTransition name={user.name || user.username} />;

  // ── Permission helpers — computed directly from user object ──
  const isAdmin = user.role === "admin";

  const can = (perm) => {
    if (isAdmin) return true;
    const perms = user.permissions;
    if (!perms || perms === "all") return true;
    if (typeof perms === "object") return perms[perm] === true;
    return false;
  };

  // Guard component
  const Guard = ({ perm, children }) =>
    isAdmin || can(perm) ? children : <AccessDenied />;

  const vendorProfileId   = page.startsWith("vendor-profile:")   ? page.split(":")[1] : null;
  const customerProfileId = page.startsWith("customer-profile:") ? page.split(":")[1] : null;

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", background: "#f8fafc", minHeight: "100vh", fontSize: 13 }}>
      <Navbar page={page} navigate={setPage} user={user} onLogout={logout} />

      {/* Breadcrumb */}
      <div style={{ padding: "8px 20px", fontSize: 12, color: "#666", background: "#eef6f5", borderBottom: "1px solid #d7e5e4" }}>
        <span style={{ color: "#0ea5e9", cursor: "pointer" }} onClick={() => setPage("dashboard")}>Home</span>
        {" / "}
        <span>{getLabel(page)}</span>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Dashboard — always visible to any logged-in user */}
        {page === "dashboard"        && <Dashboard navigate={setPage} />}

        {/* Staff Management — admin only */}
        {page === "staff-management" && (isAdmin ? <StaffManagement /> : <AccessDenied />)}
        {page === "employee-management" && <Guard perm="employees_view"><EmployeeManagement user={user} /></Guard>}

        {/* Vendors */}
        {page === "vendor-list"      && <Guard perm="vendors_view">    <VendorList     navigate={setPage} /></Guard>}
        {page === "vendor-add"       && <Guard perm="vendors_create">  <VendorAdd      navigate={setPage} /></Guard>}
        {page === "vendor-ledger"    && <Guard perm="vendors_view">    <VendorLedger   navigate={setPage} /></Guard>}
        {page === "vendor-payout"    && <Guard perm="vendors_edit">    <VendorPayout   navigate={setPage} /></Guard>}
        {vendorProfileId             && <Guard perm="vendors_view">    <VendorProfile  vendorId={vendorProfileId} navigate={setPage} /></Guard>}

        {/* Products */}
        {page === "product-list"     && <Guard perm="products_view">   <ProductList    navigate={setPage} /></Guard>}
        {page === "product-add"      && <Guard perm="products_create"> <ProductAdd     navigate={setPage} /></Guard>}
        {page === "product-stock"    && <Guard perm="products_stock">  <ProductStock   navigate={setPage} /></Guard>}

        {/* Customers */}
        {page === "customer-list"    && <Guard perm="customers_view">  <CustomerList   navigate={setPage} /></Guard>}
        {page === "customer-add"     && <Guard perm="customers_create"><CustomerList   navigate={setPage} /></Guard>}
        {customerProfileId           && <Guard perm="customers_view">  <CustomerProfile customerId={customerProfileId} navigate={setPage} /></Guard>}

        {/* Sales */}
        {page === "sale-create"      && <Guard perm="sales_create">    <CreateSale     navigate={setPage} /></Guard>}
        {page === "sales-list"       && <Guard perm="sales_view">      <SalesList      navigate={setPage} /></Guard>}
        {page === "purchase-create"  && <Guard perm="purchases_create"><CreatePurchase navigate={setPage} /></Guard>}
        {page === "purchases-list"   && <Guard perm="purchases_view">  <PurchasesList  navigate={setPage} /></Guard>}
        {page === "gst-report"       && <Guard perm="reports_gst">     <GSTReport      /></Guard>}
        {page === "sales-report"     && <Guard perm="reports_sales">   <SalesReport    navigate={setPage} /></Guard>}
        {page === "staff-sales-report" && <Guard perm="reports_sales"> <StaffSalesReport /></Guard>}

        {/* Reports */}
        {page === "report-graphs"    && <Guard perm="reports_graphs">  <ReportGraphs   /></Guard>}
        {page === "report-growth"    && <Guard perm="reports_graphs">  <ReportGrowth   /></Guard>}
      </div>
    </div>
  );
}
