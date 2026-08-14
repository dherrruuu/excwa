import {
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ExternalLink,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminSidebar() {
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  return (
    <aside className="admin-sidebar">

      <div className="admin-sidebar-brand">

        <div className="brand-mark">
          <span />
        </div>

        <div>
          <strong>EXCWA</strong>
          <span>Tech Admin</span>
        </div>

      </div>

      <div className="admin-nav-label">
        MANAGEMENT
      </div>

      <nav className="admin-nav">

        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            isActive ? "admin-nav-item active" : "admin-nav-item"
          }
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        <NavLink
          to="/admin/enquiries"
          className={({ isActive }) =>
            isActive ? "admin-nav-item active" : "admin-nav-item"
          }
        >
          <MessageSquareText size={18} />
          Enquiries
        </NavLink>

        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            isActive ? "admin-nav-item active" : "admin-nav-item"
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>

      </nav>

      <div className="admin-sidebar-bottom">

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="admin-view-site"
        >
          <ExternalLink size={15} />
          View Website
        </a>

        <button
          onClick={logout}
          className="admin-logout"
        >
          Sign Out
        </button>

      </div>

    </aside>
  );
}