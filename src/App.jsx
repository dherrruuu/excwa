import { BrowserRouter, Routes, Route } from "react-router-dom";

// ============================================================
// PUBLIC
// ============================================================

import Home from "./pages/Home";

// ============================================================
// ADMIN
// ============================================================

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEnquiries from "./pages/admin/AdminEnquiries";
import AdminDevelopers from "./pages/admin/AdminDevelopers";
import AdminOpportunities from "./pages/admin/AdminOpportunities";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminSettings from "./pages/admin/AdminSettings";

import AdminLayout from "./components/admin/AdminLayout";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";

// ============================================================
// DEVELOPER
// ============================================================

import DevRegister from "./pages/developer/DevRegister";
import DevLogin from "./pages/developer/DevLogin";
import DevProfile from "./pages/developer/DevProfile";
import DevPending from "./pages/developer/DevPending";
import DevRejected from "./pages/developer/DevRejected";
import DevSuspended from "./pages/developer/DevSuspended";
import DevDashboard from "./pages/developer/DevDashboard";

import DevProtectedRoute from "./components/developer/DevProtectedRoute";

// ============================================================
// APP
// ============================================================

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ======================================================
            PUBLIC WEBSITE
            ====================================================== */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* ======================================================
            DEVELOPER AUTH
            ====================================================== */}

        <Route
          path="/developer/login"
          element={<DevLogin />}
        />

        <Route
          path="/developer/register"
          element={<DevRegister />}
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


        {/* ======================================================
            DEVELOPER PROTECTED ROUTES
            ====================================================== */}

        <Route element={<DevProtectedRoute />}>

          <Route
            path="/developer/dashboard"
            element={<DevDashboard />}
          />

        </Route>


        {/* ======================================================
            ADMIN LOGIN
            ====================================================== */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />


        {/* ======================================================
            ADMIN PROTECTED ROUTES
            ====================================================== */}

        <Route element={<AdminProtectedRoute />}>

          <Route
            path="/admin"
            element={<AdminLayout />}
          >

            {/* ==================================================
                ADMIN DASHBOARD
                /admin
                ================================================== */}

            <Route
              index
              element={<AdminDashboard />}
            />


            {/* ==================================================
                ENQUIRIES
                /admin/enquiries
                ================================================== */}

            <Route
              path="enquiries"
              element={<AdminEnquiries />}
            />


            {/* ==================================================
                DEVELOPERS
                /admin/developers
                ================================================== */}

            <Route
              path="developers"
              element={<AdminDevelopers />}
            />


            {/* ==================================================
                OPPORTUNITIES
                /admin/opportunities
                ================================================== */}

            <Route
              path="opportunities"
              element={<AdminOpportunities />}
            />


            {/* ==================================================
                REVIEWS
                /admin/reviews
                ==================================================
                
                Review details are opened as a panel from
                AdminReviews.jsx.

                There is intentionally NO:
                /admin/reviews/:id

                This prevents a page reload and prevents
                AdminProtectedRoute from running again.
                ================================================== */}

            <Route
              path="reviews"
              element={<AdminReviews />}
            />


            {/* ==================================================
                SETTINGS
                /admin/settings
                ================================================== */}

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
