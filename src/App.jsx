import { BrowserRouter, Routes, Route } from "react-router-dom";

// =========================================================
// PUBLIC
// =========================================================
import Home from "./pages/Home";

// =========================================================
// ADMIN
// =========================================================
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEnquiries from "./pages/AdminEnquiries";
import AdminDevelopers from "./pages/AdminDevelopers";
import AdminOpportunities from "./pages/AdminOpportunities";
import AdminSettings from "./pages/AdminSettings";

import AdminLayout from "./components/admin/AdminLayout";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";

// =========================================================
// DEVELOPER
// =========================================================
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

        {/* =====================================================
            PUBLIC WEBSITE
            ===================================================== */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* =====================================================
            DEVELOPER AUTH
            ===================================================== */}

        <Route
          path="/developer/register"
          element={<DevRegister />}
        />

        <Route
          path="/developer/login"
          element={<DevLogin />}
        />

        <Route
          path="/developer/profile"
          element={<DevProfile />}
        />

        <Route
          path="/developer/pending"
          element={<DevPending />}
        />

        <Route
          path="/developer/rejected"
          element={<DevRejected />}
        />

        <Route
          path="/developer/suspended"
          element={<DevSuspended />}
        />


        {/* =====================================================
            DEVELOPER PROTECTED ROUTES
            ===================================================== */}

        <Route element={<DevProtectedRoute />}>

          <Route
            path="/developer/dashboard"
            element={<DevDashboard />}
          />

        </Route>


        {/* =====================================================
            ADMIN LOGIN
            ===================================================== */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />


        {/* =====================================================
            ADMIN PROTECTED ROUTES
            ===================================================== */}

        <Route element={<AdminProtectedRoute />}>

          <Route
            path="/admin"
            element={<AdminLayout />}
          >

            {/* Admin Dashboard */}
            <Route
              index
              element={<AdminDashboard />}
            />

            {/* Enquiries */}
            <Route
              path="enquiries"
              element={<AdminEnquiries />}
            />

            {/* Developer Applications */}
            <Route
              path="developers"
              element={<AdminDevelopers />}
            />

            {/* Opportunities */}
            <Route
              path="opportunities"
              element={<AdminOpportunities />}
            />

            {/* Settings */}
            <Route
              path="settings"
              element={<AdminSettings />}
            />

          </Route>

        </Route>

      </Routes>

    </BrowserRouter>
  );
}
