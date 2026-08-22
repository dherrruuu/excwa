import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  LogOut,
  MessageSquare,
  CreditCard,
  UserRound,
  FolderKanban,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "../../styles/client-portal.css";

export default function ClientDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);

  // ==========================================================
  // LOAD CLIENT
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const loadClientPortal = async () => {
      try {
        setLoading(true);

        // ----------------------------------------------------
        // 1. GET CURRENT USER
        // ----------------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          navigate("/client/login", {
            replace: true,
          });

          return;
        }

        // ----------------------------------------------------
        // 2. GET CLIENT USER LINK
        // ----------------------------------------------------

        const {
          data: clientUser,
          error: clientUserError,
        } = await supabase
          .from("client_users")
          .select(
            "id, client_id, user_id, role"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (clientUserError) {
          throw clientUserError;
        }

        if (!clientUser?.client_id) {
          throw new Error(
            "Client account is not connected."
          );
        }

        // ----------------------------------------------------
        // 3. GET CLIENT
        // ----------------------------------------------------

        const {
          data: clientData,
          error: clientError,
        } = await supabase
          .from("clients")
          .select(
            `
              id,
              company_name,
              contact_name,
              email,
              phone,
              status
            `
          )
          .eq("id", clientUser.client_id)
          .maybeSingle();

        if (clientError) {
          throw clientError;
        }

        if (!clientData) {
          throw new Error(
            "Client profile could not be found."
          );
        }

        // ----------------------------------------------------
        // 4. GET CLIENT PROJECTS
        // ----------------------------------------------------

        const {
          data: projectData,
          error: projectError,
        } = await supabase
          .from("opportunities")
          .select(
            `
              id,
              title,
              description,
              category,
              project_type,
              status,
              deadline,
              budget,
              created_at,
              assigned_at
            `
          )
          .eq("client_id", clientUser.client_id)
          .is("deleted_at", null)
          .order("created_at", {
            ascending: false,
          });

        if (projectError) {
          throw projectError;
        }

        if (mounted) {
          setClient(clientData);
          setProjects(projectData || []);
        }
      } catch (error) {
        console.error(
          "Client dashboard loading error:",
          error
        );

        if (mounted) {
          setClient(null);
          setProjects([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadClientPortal();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();

      navigate("/client/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Client logout error:",
        error
      );
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="client-portal-loading">

        <Loader2
          size={30}
          className="client-portal-loading-spinner"
        />

        <p>
          Loading your client portal...
        </p>

      </div>
    );
  }

  // ==========================================================
  // NO CLIENT
  // ==========================================================

  if (!client) {
    return (
      <div className="client-portal-error-page">

        <div className="client-portal-error-card">

          <BriefcaseBusiness size={32} />

          <h2>
            Client profile unavailable
          </h2>

          <p>
            We couldn't load your EXCWA client
            profile. Please contact EXCWA support.
          </p>

          <button
            type="button"
            onClick={handleLogout}
          >
            Return to Login
          </button>

        </div>

      </div>
    );
  }

  // ==========================================================
  // PROJECT STATS
  // ==========================================================

  const activeProjects = projects.filter(
    (project) =>
      project.status === "assigned" ||
      project.status === "in_progress" ||
      project.status === "submitted" ||
      project.status === "under_review" ||
      project.status === "changes_requested"
  );

  const completedProjects = projects.filter(
    (project) =>
      project.status === "completed"
  );

  const pendingProjects = projects.filter(
    (project) =>
      project.status === "draft" ||
      project.status === "open"
  );

  // ==========================================================
  // GREETING
  // ==========================================================

  const displayName =
    client.contact_name ||
    client.company_name ||
    "Client";

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  return (
    <div className="client-portal">

      {/* ====================================================
          SIDEBAR
          ==================================================== */}

      <aside className="client-portal-sidebar">

        {/* BRAND */}

        <div className="client-portal-brand">

          <div className="client-portal-brand-mark">
            E
          </div>

          <div>
            <strong>
              EXCWA
            </strong>

            <span>
              CLIENT PORTAL
            </span>
          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="client-portal-nav">

          <button
            type="button"
            className="client-portal-nav-item active"
          >
            <FolderKanban size={18} />
            <span>
              Overview
            </span>
          </button>

          <button
            type="button"
            className="client-portal-nav-item"
          >
            <BriefcaseBusiness size={18} />
            <span>
              Projects
            </span>
          </button>

          <button
            type="button"
            className="client-portal-nav-item"
          >
            <MessageSquare size={18} />
            <span>
              Messages
            </span>

            <span className="client-portal-nav-badge">
              Soon
            </span>
          </button>

          <button
            type="button"
            className="client-portal-nav-item"
          >
            <CreditCard size={18} />
            <span>
              Payments
            </span>

            <span className="client-portal-nav-badge">
              Soon
            </span>
          </button>

          <button
            type="button"
            className="client-portal-nav-item"
          >
            <UserRound size={18} />
            <span>
              Profile
            </span>
          </button>

        </nav>

        {/* LOGOUT */}

        <div className="client-portal-sidebar-bottom">

          <button
            type="button"
            className="client-portal-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />

            <span>
              Sign out
            </span>
          </button>

        </div>

      </aside>

      {/* ====================================================
          MAIN
          ==================================================== */}

      <main className="client-portal-main">

        {/* ==================================================
            TOPBAR
            ================================================== */}

        <header className="client-portal-topbar">

          <div>
            <span className="client-portal-section-label">
              CLIENT PORTAL
            </span>

            <h1>
              Overview
            </h1>
          </div>

          <div className="client-portal-user">

            <div className="client-portal-user-avatar">
              {displayName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="client-portal-user-info">

              <strong>
                {displayName}
              </strong>

              <span>
                {client.company_name}
              </span>

            </div>

          </div>

        </header>

        {/* ==================================================
            CONTENT
            ================================================== */}

        <section className="client-portal-content">

          {/* WELCOME */}

          <div className="client-portal-welcome">

            <div>

              <span>
                WELCOME BACK
              </span>

              <h2>
                Hello, {displayName}
              </h2>

              <p>
                Here's an overview of your EXCWA
                projects and activity.
              </p>

            </div>

            <div className="client-portal-welcome-icon">
              <BriefcaseBusiness size={32} />
            </div>

          </div>

          {/* =================================================
              STAT CARDS
              ================================================= */}

          <div className="client-portal-stats">

            <div className="client-portal-stat-card">

              <div className="client-portal-stat-icon">
                <BriefcaseBusiness size={20} />
              </div>

              <div>

                <span>
                  Total Projects
                </span>

                <strong>
                  {projects.length}
                </strong>

              </div>

            </div>

            <div className="client-portal-stat-card">

              <div className="client-portal-stat-icon">
                <Clock3 size={20} />
              </div>

              <div>

                <span>
                  Active
                </span>

                <strong>
                  {activeProjects.length}
                </strong>

              </div>

            </div>

            <div className="client-portal-stat-card">

              <div className="client-portal-stat-icon">
                <CheckCircle2 size={20} />
              </div>

              <div>

                <span>
                  Completed
                </span>

                <strong>
                  {completedProjects.length}
                </strong>

              </div>

            </div>

            <div className="client-portal-stat-card">

              <div className="client-portal-stat-icon">
                <FolderKanban size={20} />
              </div>

              <div>

                <span>
                  Pending
                </span>

                <strong>
                  {pendingProjects.length}
                </strong>

              </div>

            </div>

          </div>

          {/* =================================================
              PROJECTS
              ================================================= */}

          <section className="client-portal-section">

            <div className="client-portal-section-header">

              <div>

                <span>
                  YOUR WORK
                </span>

                <h2>
                  Recent Projects
                </h2>

              </div>

              {projects.length > 0 && (
                <button
                  type="button"
                  className="client-portal-view-all"
                >
                  View all

                  <ArrowRight size={16} />
                </button>
              )}

            </div>

            {projects.length === 0 ? (
              <div className="client-portal-empty">

                <div className="client-portal-empty-icon">
                  <FolderKanban size={24} />
                </div>

                <h3>
                  No projects yet
                </h3>

                <p>
                  Your EXCWA projects will appear
                  here once they are created.
                </p>

              </div>
            ) : (
              <div className="client-portal-project-list">

                {projects
                  .slice(0, 5)
                  .map((project) => (
                    <div
                      key={project.id}
                      className="client-portal-project-card"
                    >

                      <div className="client-portal-project-main">

                        <div className="client-portal-project-icon">
                          <BriefcaseBusiness size={20} />
                        </div>

                        <div>

                          <h3>
                            {project.title}
                          </h3>

                          <span>
                            {project.category ||
                              project.project_type ||
                              "Project"}
                          </span>

                        </div>

                      </div>

                      <div className="client-portal-project-status">

                        <span
                          className={`client-project-status status-${String(
                            project.status || "unknown"
                          ).replaceAll("_", "-")}`}
                        >
                          {String(
                            project.status ||
                              "Unknown"
                          )
                            .replaceAll("_", " ")}
                        </span>

                      </div>

                    </div>
                  ))}

              </div>
            )}

          </section>

        </section>

      </main>

    </div>
  );
}