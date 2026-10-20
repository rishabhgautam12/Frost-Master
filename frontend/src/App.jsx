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
import CreateOrder     from "./pages/CreateOrder";
import SalesList       from "./pages/SalesList";
import OrdersList      from "./pages/OrdersList";
import CreateQuotation from "./pages/CreateQuotation";
import QuotationsList  from "./pages/QuotationsList";
import Complaints      from "./pages/Complaints";
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
  "order-create":    "Create Order",  "orders-list":      "All Orders",
  "quotation-create":"Create Quotation", "quotations-list":"Quotations",
  "complaints-active":"Active Complaints", "complaints-solved":"Solved Complaints",
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
    <div style={{ maxWidth: 440, margin: "48px auto", textAlign: "center", padding: "44px 32px", background: "#fff", border: "1px solid #e6e9f2", borderRadius: 20, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ width: 72, height: 72, margin: "0 auto", borderRadius: 22, background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", display: "grid", placeItems: "center", fontSize: 32 }}>🔒</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "#0f1535", marginTop: 18, letterSpacing: "-0.01em" }}>Access Denied</div>
      <div style={{ fontSize: 13.5, marginTop: 8, color: "#6b7392" }}>You don't have permission to view this page.</div>
      <div style={{ fontSize: 12.5, marginTop: 4, color: "#9aa1b9" }}>Contact your administrator for access.</div>
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

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

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
    <Navbar page={page} navigate={setPage} user={user} onLogout={logout} label={getLabel(page)}>
      <div style={{ minWidth: 0, maxWidth: "100%" }}>
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
        {page === "quotation-create" && <Guard perm="sales_create">  <CreateQuotation navigate={setPage} /></Guard>}
        {page === "quotations-list"  && <Guard perm="sales_view">    <QuotationsList  navigate={setPage} /></Guard>}
        {page === "sale-create"      && <Guard perm="sales_create">    <CreateSale     navigate={setPage} /></Guard>}
        {page === "sales-list"       && <Guard perm="sales_view">      <SalesList      navigate={setPage} /></Guard>}
        {page === "order-create"     && <Guard perm="sales_create">    <CreateOrder    navigate={setPage} /></Guard>}
        {page === "orders-list"      && <Guard perm="sales_view">      <OrdersList     navigate={setPage} /></Guard>}
        {page === "complaints-active" && <Guard perm="complaints_view"><Complaints status="Active" user={user} navigate={setPage} /></Guard>}
        {page === "complaints-solved" && <Guard perm="complaints_view"><Complaints status="Solved" user={user} navigate={setPage} /></Guard>}
        {page === "purchase-create"  && <Guard perm="purchases_create"><CreatePurchase navigate={setPage} /></Guard>}
        {page === "purchases-list"   && <Guard perm="purchases_view">  <PurchasesList  navigate={setPage} /></Guard>}
        {page === "gst-report"       && <Guard perm="reports_gst">     <GSTReport      /></Guard>}
        {page === "sales-report"     && <Guard perm="reports_sales">   <SalesReport    navigate={setPage} /></Guard>}
        {page === "staff-sales-report" && <Guard perm="reports_sales"> <StaffSalesReport /></Guard>}

        {/* Reports */}
        {page === "report-graphs"    && <Guard perm="reports_graphs">  <ReportGraphs   /></Guard>}
        {page === "report-growth"    && <Guard perm="reports_graphs">  <ReportGrowth   /></Guard>}
      </div>
    </Navbar>
  );
}
