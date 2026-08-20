import {
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ExternalLink,
  Users,
  ClipboardCheck,
  BriefcaseBusiness,
  UserRoundSearch,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import ExcwaLogo from "../common/ExcwaLogo";
import { supabase } from "../../lib/supabase";

export default function AdminSidebar() {
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  return (
    <aside className="admin-sidebar">

      {/* BRAND */}

      <div className="admin-sidebar-brand">
        <ExcwaLogo size={32} />

        <div>
          <strong>EXCWA</strong>
          <span>Tech Admin</span>
        </div>
      </div>

      {/* NAVIGATION LABEL */}

      <div className="admin-nav-label">
        MANAGEMENT
      </div>

      {/* NAVIGATION */}

      <nav className="admin-nav">

        {/* DASHBOARD */}

        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            isActive
              ? "admin-nav-item active"
              : "admin-nav-item"
          }
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        {/* ENQUIRIES */}

        <NavLink
          to="/admin/enquiries"
          className={({ isActive }) =>
            isActive
              ? "admin-nav-item active"
              : "admin-nav-item"
          }
        >
          <MessageSquareText size={18} />
          Enquiries
        </NavLink>

        {/* DEVELOPER APPLICATIONS */}

        <NavLink
          to="/admin/developers"
          className={({ isActive }) =>
            isActive
              ? "admin-nav-item active"
              : "admin-nav-item"
          }
        >
          <Users size={18} />
          Developer Applications
        </NavLink>

        {/* DEVELOPER INFO */}

        <NavLink
          to="/admin/developer-info"
          className={({ isActive }) =>
            isActive
              ? "admin-nav-item active"
              : "admin-nav-item"
          }
        >
          <UserRoundSearch size={18} />
          Developer Info
        </NavLink>

        {/* OPPORTUNITIES */}

        <NavLink
          to="/admin/opportunities"
          className={({ isActive }) =>
            isActive
              ? "admin-nav-item active"
              : "admin-nav-item"
          }
        >
          <BriefcaseBusiness size={18} />
          Opportunities
        </NavLink>

        {/* WORK REVIEWS */}

        <NavLink
          to="/admin/reviews"
          className={({ isActive }) =>
            isActive
              ? "admin-nav-item active"
              : "admin-nav-item"
          }
        >
          <ClipboardCheck size={18} />
          Work Reviews
        </NavLink>

        {/* SETTINGS */}

        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            isActive
              ? "admin-nav-item active"
              : "admin-nav-item"
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>

      </nav>

      {/* BOTTOM */}

      <div className="admin-sidebar-bottom">

        {/* VIEW WEBSITE */}

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="admin-view-site"
        >
          <ExternalLink size={15} />
          View Website
        </a>

        {/* SIGN OUT */}

        <button
          type="button"
          onClick={logout}
          className="admin-logout"
        >
          Sign Out
        </button>

      </div>

    </aside>
  );
}