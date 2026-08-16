import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./styles/globals.css";
import "./styles/client.css";
import "./styles/developer.css";

// Admin styles
import "./styles/admin/admin.css";
import "./styles/admin/admin-auth.css";
import "./styles/admin/admin-components.css";
import "./styles/admin/admin-dashboard.css";
import "./styles/admin/admin-developers.css";
import "./styles/admin/admin-enquiries.css";
import "./styles/admin/admin-opportunities.css";
import "./styles/admin/admin-settings.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);