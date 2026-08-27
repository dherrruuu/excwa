import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ============================================================
// GLOBAL / CLIENT STYLES
// ============================================================

import "./styles/globals.css";
import "./styles/client.css";

// ============================================================
// DEVELOPER STYLES
// ============================================================

import "./styles/developer/Developer-dashboard.css";
import "./styles/developer/DeveloperLogin.css";
import "./styles/developer/opportunities.css";
import "./styles/developer/applications.css";
import "./styles/developer/current-project.css";
import "./styles/developer/profile.css";
import "./styles/developer/submissions.css";

// ============================================================
// ADMIN STYLES
// ============================================================

import "./styles/admin/admin.css";
import "./styles/admin/admin-auth.css";
import "./styles/admin/admin-components.css";
import "./styles/admin/admin-dashboard.css";
import "./styles/admin/admin-developer-info.css";
import "./styles/admin/admin-developers.css";
import "./styles/admin/admin-enquiries.css";
import "./styles/admin/admin-opportunities.css";
import "./styles/admin/admin-review-detail.css";
import "./styles/admin/admin-settings.css";

// ============================================================
// CLIENT PORTAL
// ============================================================

import "./styles/client-portal.css";

// ============================================================
// APPLICATION
// ============================================================

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);