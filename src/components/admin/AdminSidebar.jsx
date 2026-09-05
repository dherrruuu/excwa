import {
  LayoutDashboard,
  MessageSquareText,
  MessagesSquare,
  Settings,
  ExternalLink,
  Users,
  ClipboardCheck,
  BriefcaseBusiness,
  UserRoundSearch,
  Code2,
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

  const navItemClass = ({ isActive }) =>
    isActive
      ? "admin-nav-item active"
      : "admin-nav-item";

  return (
    <aside className="admin-sidebar">

      {/* ======================================================
          BRAND
          ====================================================== */}

      <div className="admin-sidebar-brand">
        <ExcwaLogo size={32} />

        <div>
          <strong>EXCWA</strong>
          <span>Tech Admin</span>
        </div>
      </div>


      {/* ======================================================
          NAVIGATION
          ====================================================== */}

      <nav className="admin-nav">

        {/* ==================================================
            OVERVIEW
            ================================================== */}

        <div className="admin-nav-group">

          <div className="admin-nav-label">
            OVERVIEW
          </div>

          <NavLink
            to="/admin"
            end
            className={navItemClass}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

        </div>


        {/* ==================================================
            COMMUNICATION
            ================================================== */}

        <div className="admin-nav-group">

          <div className="admin-nav-label">
            COMMUNICATION
          </div>

          <NavLink
            to="/admin/enquiries"
            className={navItemClass}
          >
            <MessageSquareText size={18} />
            Enquiries
          </NavLink>

          <NavLink
            to="/admin/messages"
            className={navItemClass}
          >
            <MessagesSquare size={18} />
            Messages
          </NavLink>

          <NavLink
            to="/admin/developer-messages"
            className={navItemClass}
          >
            <Code2 size={18} />
            Developer Messages
          </NavLink>

        </div>


        {/* ==================================================
            DEVELOPERS
            ================================================== */}

        <div className="admin-nav-group">

          <div className="admin-nav-label">
            DEVELOPERS
          </div>

          <NavLink
            to="/admin/developers"
            className={navItemClass}
          >
            <Users size={18} />
            Developer Applications
          </NavLink>

          <NavLink
            to="/admin/developer-info"
            className={navItemClass}
          >
            <UserRoundSearch size={18} />
            Developer Info
          </NavLink>

        </div>


        {/* ==================================================
            PROJECTS
            ================================================== */}

        <div className="admin-nav-group">

          <div className="admin-nav-label">
            PROJECTS
          </div>

          <NavLink
            to="/admin/opportunities"
            className={navItemClass}
          >
            <BriefcaseBusiness size={18} />
            Opportunities
          </NavLink>

          <NavLink
            to="/admin/reviews"
            className={navItemClass}
          >
            <ClipboardCheck size={18} />
            Work Reviews
          </NavLink>

        </div>


        {/* ==================================================
            SYSTEM
            ================================================== */}

        <div className="admin-nav-group">

          <div className="admin-nav-label">
            SYSTEM
          </div>

          <NavLink
            to="/admin/settings"
            className={navItemClass}
          >
            <Settings size={18} />
            Settings
          </NavLink>

        </div>

      </nav>


      {/* ======================================================
          BOTTOM
          ====================================================== */}

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