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
  ArrowLeft,
  CalendarDays,
  Code2,
  FileText,
  Layers3,
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
  if (!status) return "Unknown";

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatList = (value) => {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not set";
  }

  if (typeof value === "string") {
    return value.trim() || "Not set";
  }

  return "Not set";
};

export default function ClientDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);

  const [activeSection, setActiveSection] =
    useState("overview");

  const [selectedProject, setSelectedProject] =
    useState(null);

  // ==========================================================
  // LOAD CLIENT PORTAL
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const loadClientPortal = async () => {
      try {
        setLoading(true);

        // ----------------------------------------------------
        // CURRENT USER
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
        // CLIENT USER
        // ----------------------------------------------------

        const {
          data: clientUser,
          error: clientUserError,
        } = await supabase
          .from("client_users")
          .select("id, client_id, user_id, role")
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
        // CLIENT PROFILE
        // ----------------------------------------------------

        const {
          data: clientData,
          error: clientError,
        } = await supabase
          .from("clients")
          .select(`
            id,
            company_name,
            contact_name,
            email,
            phone,
            status
          `)
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
        // CLIENT PROJECTS
        // ----------------------------------------------------

        const {
          data: projectData,
          error: projectError,
        } = await supabase
          .from("opportunities")
          .select(`
            id,
            title,
            description,
            category,
            project_type,
            required_roles,
            required_skills,
            tech_stack,
            deliverables,
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
  // SECTION NAVIGATION
  // ==========================================================

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSelectedProject(null);
  };

  // ==========================================================
  // OPEN PROJECT
  // ==========================================================

  const openProject = (project) => {
    setSelectedProject(project);
    setActiveSection("project-details");
  };

  // ==========================================================
  // BACK TO PROJECTS
  // ==========================================================

  const backToProjects = () => {
    setSelectedProject(null);
    setActiveSection("projects");
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
  // CLIENT ERROR
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
  // DISPLAY NAME
  // ==========================================================

  const displayName =
    client.contact_name ||
    client.company_name ||
    "Client";

  // ==========================================================
  // MAIN DASHBOARD
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

          {/* OVERVIEW */}

          <button
            type="button"
            className={`client-portal-nav-item ${
              activeSection === "overview"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleSectionChange("overview")
            }
          >
            <FolderKanban size={18} />

            <span>
              Overview
            </span>
          </button>

          {/* PROJECTS */}

          <button
            type="button"
            className={`client-portal-nav-item ${
              activeSection === "projects" ||
              activeSection === "project-details"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleSectionChange("projects")
            }
          >
            <BriefcaseBusiness size={18} />

            <span>
              Projects
            </span>
          </button>

          {/* MESSAGES */}

          <button
            type="button"
            className={`client-portal-nav-item ${
              activeSection === "messages"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleSectionChange("messages")
            }
          >
            <MessageSquare size={18} />

            <span>
              Messages
            </span>

            <span className="client-portal-nav-badge">
              Soon
            </span>
          </button>

          {/* PAYMENTS */}

          <button
            type="button"
            className={`client-portal-nav-item ${
              activeSection === "payments"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleSectionChange("payments")
            }
          >
            <CreditCard size={18} />

            <span>
              Payments
            </span>

            <span className="client-portal-nav-badge">
              Soon
            </span>
          </button>

          {/* PROFILE */}

          <button
            type="button"
            className={`client-portal-nav-item ${
              activeSection === "profile"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleSectionChange("profile")
            }
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
          RIGHT SIDE
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
              {activeSection === "overview" &&
                "Overview"}

              {activeSection === "projects" &&
                "Projects"}

              {activeSection === "project-details" &&
                "Project Details"}

              {activeSection === "messages" &&
                "Messages"}

              {activeSection === "payments" &&
                "Payments"}

              {activeSection === "profile" &&
                "Profile"}
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
            RIGHT CONTENT
            ================================================== */}

        <section className="client-portal-content">

          {/* =================================================
              OVERVIEW
              ================================================= */}

          {activeSection === "overview" && (
            <>
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

              <div className="client-portal-stats">

                <div className="client-portal-stat-card">
                  <div className="client-portal-stat-icon">
                    <BriefcaseBusiness size={20} />
                  </div>

                  <div>
                    <span>Total Projects</span>
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
                    <span>Active</span>
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
                    <span>Completed</span>
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
                    <span>Pending</span>
                    <strong>
                      {pendingProjects.length}
                    </strong>
                  </div>
                </div>

              </div>

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
                      onClick={() =>
                        handleSectionChange("projects")
                      }
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
                        <button
                          key={project.id}
                          type="button"
                          className="client-portal-project-card"
                          onClick={() =>
                            openProject(project)
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

                            </div>

                          </div>

                          <div className="client-portal-project-status">

                            <span
                              className={`client-project-status status-${String(
                                project.status || "unknown"
                              ).replaceAll("_", "-")}`}
                            >
                              {formatStatus(
                                project.status
                              )}
                            </span>

                          </div>

                        </button>
                      ))}

                  </div>
                )}

              </section>
            </>
          )}

          {/* =================================================
              PROJECTS
              ================================================= */}

          {activeSection === "projects" && (
            <section className="client-portal-section">

              <div className="client-portal-section-header">

                <div>
                  <span>
                    YOUR WORKSPACE
                  </span>

                  <h2>
                    All Projects
                  </h2>
                </div>

                <div>
                  <span>
                    {projects.length} project
                    {projects.length === 1
                      ? ""
                      : "s"}
                  </span>
                </div>

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

                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className="client-portal-project-card"
                      onClick={() =>
                        openProject(project)
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
                          {formatStatus(
                            project.status
                          )}
                        </span>

                        <ArrowRight size={18} />

                      </div>

                    </button>
                  ))}

                </div>
              )}

            </section>
          )}

          {/* =================================================
              PROJECT DETAILS
              ================================================= */}

          {activeSection === "project-details" &&
            selectedProject && (
              <section className="client-portal-section">

                {/* BACK */}

                <button
                  type="button"
                  className="client-project-back-link"
                  onClick={backToProjects}
                >
                  <ArrowLeft size={16} />

                  Back to Projects
                </button>

                {/* HERO */}

                <div className="client-project-hero">

                  <div>

                    <span className="client-project-eyebrow">
                      PROJECT DETAILS
                    </span>

                    <h2>
                      {selectedProject.title}
                    </h2>

                    <p>
                      {selectedProject.description ||
                        "No project description available."}
                    </p>

                  </div>

                  <span
                    className={`client-project-status status-${String(
                      selectedProject.status || "unknown"
                    ).replaceAll("_", "-")}`}
                  >
                    {formatStatus(
                      selectedProject.status
                    )}
                  </span>

                </div>

                {/* INFORMATION GRID */}

                <div className="client-project-detail-grid">

                  {/* PROJECT INFORMATION */}

                  <section className="client-project-panel">

                    <div className="client-project-panel-heading">

                      <FolderKanban size={18} />

                      <h3>
                        Project Information
                      </h3>

                    </div>

                    <div className="client-project-meta-grid">

                      <div>
                        <span>
                          Category
                        </span>

                        <strong>
                          {selectedProject.category ||
                            "Not set"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Project Type
                        </span>

                        <strong>
                          {selectedProject.project_type ||
                            "Not set"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Status
                        </span>

                        <strong>
                          {formatStatus(
                            selectedProject.status
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Budget
                        </span>

                        <strong>
                          {selectedProject.budget !== null &&
                          selectedProject.budget !== undefined
                            ? `₹${Number(
                                selectedProject.budget
                              ).toLocaleString("en-IN")}`
                            : "Not set"}
                        </strong>
                      </div>

                    </div>

                  </section>

                  {/* TIMELINE */}

                  <section className="client-project-panel">

                    <div className="client-project-panel-heading">

                      <CalendarDays size={18} />

                      <h3>
                        Timeline
                      </h3>

                    </div>

                    <div className="client-project-meta-grid">

                      <div>
                        <span>
                          Created
                        </span>

                        <strong>
                          {formatDate(
                            selectedProject.created_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Assigned
                        </span>

                        <strong>
                          {formatDate(
                            selectedProject.assigned_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Deadline
                        </span>

                        <strong>
                          {formatDate(
                            selectedProject.deadline
                          )}
                        </strong>
                      </div>

                    </div>

                  </section>

                  {/* TECHNOLOGY */}

                  <section className="client-project-panel">

                    <div className="client-project-panel-heading">

                      <Code2 size={18} />

                      <h3>
                        Technology & Skills
                      </h3>

                    </div>

                    <div className="client-project-copy">

                      <span>
                        Technology Stack
                      </span>

                      <p>
                        {formatList(
                          selectedProject.tech_stack
                        )}
                      </p>

                    </div>

                    <div className="client-project-copy">

                      <span>
                        Required Skills
                      </span>

                      <p>
                        {formatList(
                          selectedProject.required_skills
                        )}
                      </p>

                    </div>

                    <div className="client-project-copy">

                      <span>
                        Required Roles
                      </span>

                      <p>
                        {formatList(
                          selectedProject.required_roles
                        )}
                      </p>

                    </div>

                  </section>

                  {/* DELIVERABLES */}

                  <section className="client-project-panel">

                    <div className="client-project-panel-heading">

                      <FileText size={18} />

                      <h3>
                        Deliverables
                      </h3>

                    </div>

                    <div className="client-project-copy">

                      <p>
                        {selectedProject.deliverables ||
                          "No deliverables have been specified yet."}
                      </p>

                    </div>

                  </section>

                </div>

                {/* PROJECT STATUS */}

                <section className="client-project-preview-panel is-ready">

                  <div className="client-project-panel-heading">

                    <Layers3 size={18} />

                    <div>

                      <h3>
                        Project Progress
                      </h3>

                      <p>
                        Project status is managed by
                        EXCWA and updated as work
                        progresses.
                      </p>

                    </div>

                  </div>

                  <div className="client-project-progress">

                    <div
                      className={
                        selectedProject.status ===
                          "assigned" ||
                        selectedProject.status ===
                          "in_progress" ||
                        selectedProject.status ===
                          "submitted" ||
                        selectedProject.status ===
                          "under_review" ||
                        selectedProject.status ===
                          "changes_requested" ||
                        selectedProject.status ===
                          "completed"
                          ? "completed"
                          : ""
                      }
                    >
                      <span>
                        01
                      </span>

                      <strong>
                        Assigned
                      </strong>
                    </div>

                    <div
                      className={
                        selectedProject.status ===
                          "in_progress" ||
                        selectedProject.status ===
                          "submitted" ||
                        selectedProject.status ===
                          "under_review" ||
                        selectedProject.status ===
                          "changes_requested" ||
                        selectedProject.status ===
                          "completed"
                          ? "completed"
                          : ""
                      }
                    >
                      <span>
                        02
                      </span>

                      <strong>
                        Development
                      </strong>
                    </div>

                    <div
                      className={
                        selectedProject.status ===
                          "submitted" ||
                        selectedProject.status ===
                          "under_review" ||
                        selectedProject.status ===
                          "changes_requested" ||
                        selectedProject.status ===
                          "completed"
                          ? "completed"
                          : ""
                      }
                    >
                      <span>
                        03
                      </span>

                      <strong>
                        Review
                      </strong>
                    </div>

                    <div
                      className={
                        selectedProject.status ===
                          "completed"
                          ? "completed"
                          : ""
                      }
                    >
                      <span>
                        04
                      </span>

                      <strong>
                        Completed
                      </strong>
                    </div>

                  </div>

                </section>

              </section>
            )}

          {/* =================================================
              MESSAGES
              ================================================= */}

          {activeSection === "messages" && (
            <section className="client-portal-section">

              <div className="client-portal-empty">

                <div className="client-portal-empty-icon">
                  <MessageSquare size={24} />
                </div>

                <h3>
                  Messages
                </h3>

                <p>
                  Client communication will be
                  available here soon.
                </p>

              </div>

            </section>
          )}

          {/* =================================================
              PAYMENTS
              ================================================= */}

          {activeSection === "payments" && (
            <section className="client-portal-section">

              <div className="client-portal-empty">

                <div className="client-portal-empty-icon">
                  <CreditCard size={24} />
                </div>

                <h3>
                  Payments
                </h3>

                <p>
                  Payment management will be
                  available here soon.
                </p>

              </div>

            </section>
          )}

          {/* =================================================
              PROFILE
              ================================================= */}

          {activeSection === "profile" && (
            <section className="client-portal-section">

              <div className="client-project-detail-grid">

                <section className="client-project-panel">

                  <div className="client-project-panel-heading">

                    <UserRound size={18} />

                    <h3>
                      Client Profile
                    </h3>

                  </div>

                  <div className="client-project-meta-grid">

                    <div>
                      <span>
                        Contact Name
                      </span>

                      <strong>
                        {client.contact_name ||
                          "Not set"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Company
                      </span>

                      <strong>
                        {client.company_name ||
                          "Not set"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Email
                      </span>

                      <strong>
                        {client.email ||
                          "Not set"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Phone
                      </span>

                      <strong>
                        {client.phone ||
                          "Not set"}
                      </strong>
                    </div>

                  </div>

                </section>

              </div>

            </section>
          )}

        </section>

      </main>

    </div>
  );
}