import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public
import Home from "./pages/Home";

// Admin
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEnquiries from "./pages/AdminEnquiries";
import AdminSettings from "./pages/AdminSettings";
//import AdminDevelopers from "./pages/admin/AdminDevelopers";
//import AdminOpportunities from "./pages/admin/AdminOpportunities";
//import AdminAssignments from "./pages/admin/AdminAssignments";
import AdminLayout from "./components/admin/AdminLayout";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";

// Developer
import DevRegister from "./pages/developer/DevRegister";
import DevLogin from "./pages/developer/DevLogin";
import DevProfile from "./pages/developer/DevProfile";
import DevPending from "./pages/developer/DevPending";
import DevRejected from "./pages/developer/DevRejected";
import DevSuspended from "./pages/developer/DevSuspended";
import DevDashboard from "./pages/developer/DevDashboard";
import DevProtectedRoute from "./components/developer/DevProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── PUBLIC ── */}
        <Route path="/" element={<Home />} />

        {/* ── DEVELOPER AUTH ── */}
        <Route path="/developer/register" element={<DevRegister />} />
        <Route path="/developer/login"    element={<DevLogin />} />
        <Route path="/developer/profile"  element={<DevProfile />} />
        <Route path="/developer/pending"  element={<DevPending />} />
        <Route path="/developer/rejected" element={<DevRejected />} />
        <Route path="/developer/suspended" element={<DevSuspended />} />

        {/* ── DEVELOPER PROTECTED ── */}
        <Route element={<DevProtectedRoute />}>
          <Route path="/developer/dashboard" element={<DevDashboard />} />
        </Route>

        {/* ── ADMIN LOGIN ── */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ── ADMIN PROTECTED ── */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index                  element={<AdminDashboard />} />
            <Route path="enquiries"       element={<AdminEnquiries />} />
            
            <Route path="settings"        element={<AdminSettings />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}