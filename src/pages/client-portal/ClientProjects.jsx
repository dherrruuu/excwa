import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Loader2,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "../../styles/client-portal.css";

const formatDate = (value) => {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status) => {
  return String(status || "unknown")
    .replaceAll("_", " ");
};

export default function ClientProjects() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      try {
        setLoading(true);
        setError("");

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

        const {
          data: clientUser,
          error: clientUserError,
        } = await supabase
          .from("client_users")
          .select("client_id")
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

        const {
          data,
          error: projectError,
        } = await supabase
          .from("opportunities")
          .select(`
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
          `)
          .eq("client_id", clientUser.client_id)
          .is("deleted_at", null)
          .order("created_at", {
            ascending: false,
          });

        if (projectError) {
          throw projectError;
        }

        if (mounted) {
          setProjects(data || []);
        }
      } catch (loadError) {
        console.error(
          "Client projects loading error:",
          loadError
        );

        if (mounted) {
          setProjects([]);
          setError(
            loadError.message ||
              "Unable to load your projects."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      mounted = false;
    };
  }, [navigate]);

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
          Loading your projects...
        </p>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="client-portal-error-page">
        <div className="client-portal-error-card">
          <FolderKanban size={32} />

          <h2>
            Projects unavailable
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/client/dashboard")
            }
          >
            Return to overview
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PROJECT COUNTS
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

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="client-portal">

      {/* ====================================================
          SIDEBAR
          ==================================================== */}

      <aside className="client-portal-sidebar">

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

        <nav className="client-portal-nav">

          <button
            type="button"
            className="client-portal-nav-item"
            onClick={() =>
              navigate("/client/dashboard")
            }
          >
            <FolderKanban size={18} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            className="client-portal-nav-item active"
          >
            <BriefcaseBusiness size={18} />
            <span>Projects</span>
          </button>

          <button
            type="button"
            className="client-portal-nav-item"
          >
            <span>Messages</span>
            <span className="client-portal-nav-badge">
              Soon
            </span>
          </button>

          <button
            type="button"
            className="client-portal-nav-item"
          >
            <span>Payments</span>
            <span className="client-portal-nav-badge">
              Soon
            </span>
          </button>

        </nav>

      </aside>

      {/* ====================================================
          MAIN
          ==================================================== */}

      <main className="client-portal-main">

        <header className="client-portal-topbar">

          <div>
            <span className="client-portal-section-label">
              CLIENT PORTAL
            </span>

            <h1>
              Projects
            </h1>
          </div>

          <button
            type="button"
            className="client-project-back-link"
            onClick={() =>
              navigate("/client/dashboard")
            }
          >
            <ArrowLeft size={16} />
            Back to overview
          </button>

        </header>

        <section className="client-portal-content">

          {/* =================================================
              HEADER
              ================================================= */}

          <div className="client-portal-section-header">

            <div>
              <span>
                YOUR WORKSPACE
              </span>

              <h2>
                All Projects
              </h2>
            </div>

          </div>

          {/* =================================================
              SUMMARY
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

          </div>

          {/* =================================================
              PROJECT LIST
              ================================================= */}

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

              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="client-portal-project-card"
                  onClick={() =>
                    navigate(
                      `/client/projects/${project.id}`
                    )
                  }
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

                      <p>
                        {project.description ||
                          "No project description available."}
                      </p>

                    </div>

                  </div>

                  <div className="client-portal-project-status">

                    <span
                      className={`client-project-status status-${String(
                        project.status || "unknown"
                      ).replaceAll("_", "-")}`}
                    >
                      {formatStatus(project.status)}
                    </span>

                    <div className="client-portal-project-date">
                      <CalendarDays size={14} />
                      <span>
                        {project.deadline
                          ? `Due ${formatDate(
                              project.deadline
                            )}`
                          : `Created ${formatDate(
                              project.created_at
                            )}`}
                      </span>
                    </div>

                    <ArrowRight size={18} />

                  </div>

                </button>
              ))}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}