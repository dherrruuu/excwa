import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./pages/Home";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEnquiries from "./pages/AdminEnquiries";
import AdminSettings from "./pages/AdminSettings";

import AdminLayout from "./components/admin/AdminLayout";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";

export default function App() {

  return (
    <BrowserRouter>

      <Routes>

        {/* CLIENT */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* ADMIN LOGIN */}
        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        {/* PROTECTED ADMIN */}
        <Route element={<AdminProtectedRoute />}>

          <Route
            path="/admin"
            element={<AdminLayout />}
          >

            <Route
              index
              element={<AdminDashboard />}
            />

            <Route
              path="enquiries"
              element={<AdminEnquiries />}
            />

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