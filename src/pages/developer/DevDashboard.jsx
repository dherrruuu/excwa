import { useEffect, useState } from "react";

import {
  LogOut,
  Briefcase,
  FileCheck,
  Send,
  User,
  ExternalLink,
  FolderKanban,
} from "lucide-react";

import "../../styles/developer.css";

import ExcwaLogo from "../../components/common/ExcwaLogo";
import OpportunitiesTab from "../../components/developer/OpportunitiesTab";

import { useDeveloper } from "../../hooks/useDeveloper";

import {
  getMyApplications,
  getMyCurrentAssignment,
  submitWork,
} from "../../services/developerService";

// ============================================================
// STATUS COLORS
// ============================================================

const STATUS_COLORS = {
  approved: {
    color: "#69e5b7",
    bg: "rgba(105,229,183,.08)",
    border: "rgba(105,229,183,.2)",
  },

  selected: {
    color: "#69e5b7",
    bg: "rgba(105,229,183,.08)",
    border: "rgba(105,229,183,.2)",
  },

  submitted: {
    color: "#62e2ff",
    bg: "rgba(98,226,255,.08)",
    border: "rgba(98,226,255,.2)",
  },

  under_review: {
    color: "#a98cff",
    bg: "rgba(169,140,255,.08)",
    border: "rgba(169,140,255,.2)",
  },

  changes_requested: {
    color: "#ffca70",
    bg: "rgba(255,202,112,.08)",
    border: "rgba(255,202,112,.2)",
  },

  completed: {
    color: "#69e5b7",
    bg: "rgba(105,229,183,.08)",
    border: "rgba(105,229,183,.2)",
  },

  rejected: {
    color: "#ff7373",
    bg: "rgba(255,115,115,.08)",
    border: "rgba(255,115,115,.2)",
  },
};

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }) {
  const s =
    STATUS_COLORS[status] ||
    STATUS_COLORS.approved;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 10,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        textTransform: "capitalize",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: s.color,
        }}
      />

      {status?.replace(/_/g, " ") || "Approved"}
    </span>
  );
}

// ============================================================
// CURRENT PROJECT
// ============================================================

function CurrentProjectTab({ assignment }) {
  if (!assignment) {
    return (
      <div className="dev-tab-empty">
        <FolderKanban
          size={32}
          style={{
            opacity: 0.3,
            marginBottom: 12,
          }}
        />

        <p>No active project.</p>

        <span>
          Browse opportunities to find your next project.
        </span>
      </div>
    );
  }

  const project = assignment.opportunities;

  return (
    <div className="dev-current-project">
      <div className="dev-project-header">
        <div>
          <span className="dev-opp-category">
            {project?.category || "Project"}
          </span>

          <h2>
            {project?.title || "Untitled Project"}
          </h2>

          <p>
            Project ID: {project?.id || "—"}
          </p>
        </div>

        <StatusBadge status="approved" />
      </div>

      <div className="dev-project-section">
        <h3>Project Requirement</h3>

        <p>
          {project?.description ||
            "No description provided."}
        </p>
      </div>

      <div className="dev-project-grid">
        <div className="dev-project-info">
          <span>Project Type</span>

          <strong>
            {project?.project_type || "—"}
          </strong>
        </div>

        <div className="dev-project-info">
          <span>Deadline</span>

          <strong>
            {project?.deadline
              ? new Date(
                  project.deadline
                ).toLocaleDateString("en-IN")
              : "—"}
          </strong>
        </div>

        <div className="dev-project-info">
          <span>Freelancer Payout</span>

          <strong>
            {project?.freelancer_payout
              ? `₹${Number(
                  project.freelancer_payout
                ).toLocaleString("en-IN")}`
              : "—"}
          </strong>
        </div>

        <div className="dev-project-info">
          <span>Assigned</span>

          <strong>
            {assignment.assigned_at
              ? new Date(
                  assignment.assigned_at
                ).toLocaleDateString("en-IN")
              : "—"}
          </strong>
        </div>
      </div>

      {project?.tech_stack?.length > 0 && (
        <div className="dev-project-section">
          <h3>Technology Stack</h3>

          <div className="dev-opp-tags">
            {project.tech_stack.map((tech) => (
              <span
                key={tech}
                className="dev-tag"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {project?.required_skills?.length > 0 && (
        <div className="dev-project-section">
          <h3>Required Skills</h3>

          <div className="dev-opp-tags">
            {project.required_skills.map(
              (skill) => (
                <span
                  key={skill}
                  className="dev-tag"
                >
                  {skill}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {project?.deliverables && (
        <div className="dev-project-section">
          <h3>Deliverables</h3>

          <p>{project.deliverables}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUBMIT WORK
// ============================================================

function SubmitWorkTab({
  assignment,
  onSubmitted,
}) {
  const [githubUrl, setGithubUrl] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ----------------------------------------------------------
  // EXISTING SUBMISSION
  // ----------------------------------------------------------

  const existingSubmission =
    assignment?.project_submissions?.[0] ||
    null;

  const submissionStatus =
    existingSubmission?.status || null;

  // ----------------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------------

  async function handleSubmit() {
    setError("");
    setMessage("");

    if (!githubUrl.trim()) {
      setError(
        "GitHub repository URL is required."
      );
      return;
    }

    if (
      !githubUrl.startsWith(
        "https://github.com/"
      )
    ) {
      setError(
        "Please enter a valid GitHub repository URL."
      );
      return;
    }

    if (!assignment?.id) {
      setError(
        "No active assignment found."
      );
      return;
    }

    setSubmitting(true);

    try {
      await submitWork({
        assignmentId:
          assignment.id,

        githubUrl:
          githubUrl.trim(),

        notes:
          notes.trim(),
      });

      setMessage(
        "Your work has been submitted successfully. It is now waiting for reviewer approval."
      );

      if (onSubmitted) {
        await onSubmitted();
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to submit your work."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ----------------------------------------------------------
  // NO ASSIGNMENT
  // ----------------------------------------------------------

  if (!assignment) {
    return (
      <div className="dev-tab-empty">
        <Send
          size={32}
          style={{
            opacity: 0.3,
            marginBottom: 12,
          }}
        />

        <p>No active project.</p>

        <span>
          You can submit work once a project is assigned.
        </span>
      </div>
    );
  }

  // ----------------------------------------------------------
  // SUBMISSION ALREADY APPROVED / COMPLETED
  // ----------------------------------------------------------

  if (
    submissionStatus === "completed"
  ) {
    return (
      <div className="dev-tab-empty">
        <FileCheck
          size={32}
          style={{
            opacity: 0.3,
            marginBottom: 12,
          }}
        />

        <p>Project completed.</p>

        <span>
          This project has been completed by the reviewer.
        </span>
      </div>
    );
  }

  return (
    <div className="dev-auth-card dev-submit-card">
      <div className="dev-submit-header">
        <div>
          <span className="dev-opp-category">
            Current Project
          </span>

          <h2>
            {assignment.opportunities?.title}
          </h2>
        </div>

        <StatusBadge
          status={
            submissionStatus ||
            "approved"
          }
        />
      </div>

      {submissionStatus ===
        "changes_requested" && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 10,
            background:
              "rgba(255,202,112,.08)",
            border:
              "1px solid rgba(255,202,112,.2)",
          }}
        >
          <strong
            style={{
              color: "#ffca70",
            }}
          >
            Changes requested
          </strong>

          {existingSubmission?.review_message && (
            <p
              style={{
                marginTop: 8,
              }}
            >
              {
                existingSubmission.review_message
              }
            </p>
          )}
        </div>
      )}

      {submissionStatus ===
        "submitted" && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 10,
            background:
              "rgba(98,226,255,.08)",
            border:
              "1px solid rgba(98,226,255,.2)",
          }}
        >
          <strong
            style={{
              color: "#62e2ff",
            }}
          >
            Work submitted
          </strong>

          <p>
            Your submission is waiting for reviewer approval.
          </p>
        </div>
      )}

      <div className="field">
        <label>
          GitHub Repository URL <em>*</em>
        </label>

        <input
          type="url"
          placeholder="https://github.com/username/project"
          value={githubUrl}
          onChange={(e) =>
            setGithubUrl(
              e.target.value
            )
          }
        />
      </div>

      <div
        className="field"
        style={{
          marginTop: 16,
        }}
      >
        <label>
          Submission Notes

          <em
            style={{
              color: "#5e6a7b",
              fontStyle: "normal",
            }}
          >
            {" "}
            optional
          </em>
        </label>

        <textarea
          rows={5}
          placeholder="Add setup instructions or any important notes..."
          value={notes}
          onChange={(e) =>
            setNotes(
              e.target.value
            )
          }
        />
      </div>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {message && (
        <p
          style={{
            color: "#69e5b7",
            fontSize: 12,
          }}
        >
          {message}
        </p>
      )}

      <button
        className="primary-btn form-submit"
        onClick={handleSubmit}
        disabled={
          submitting ||
          submissionStatus ===
            "submitted"
        }
      >
        <Send size={14} />

        {submitting
          ? "Submitting..."
          : submissionStatus ===
            "submitted"
          ? "Work Submitted"
          : "Submit Work"}
      </button>
    </div>
  );
}

// ============================================================
// APPLICATIONS
// ============================================================

function ApplicationsTab() {
  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  async function loadApplications() {
    try {
      setLoading(true);

      const data =
        await getMyApplications();

      setApplications(data);
    } catch (error) {
      console.error(
        "Unable to load applications:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  if (loading) {
    return (
      <div className="dev-tab-empty">
        Loading applications...
      </div>
    );
  }

  if (!applications.length) {
    return (
      <div className="dev-tab-empty">
        <FileCheck
          size={32}
          style={{
            opacity: 0.3,
            marginBottom: 12,
          }}
        />

        <p>No applications yet.</p>
      </div>
    );
  }

  return (
    <div className="dev-app-list">
      {applications.map(
        (application) => (
          <div
            key={application.id}
            className="dev-app-card"
          >
            <div>
              <span className="dev-opp-category">
                {
                  application
                    .opportunities
                    ?.category
                }
              </span>

              <h3>
                {
                  application
                    .opportunities
                    ?.title
                }
              </h3>

              <p>
                Applied{" "}
                {new Date(
                  application.applied_at
                ).toLocaleDateString(
                  "en-IN"
                )}
              </p>
            </div>

            <StatusBadge
              status={
                application.status
              }
            />
          </div>
        )
      )}
    </div>
  );
}

// ============================================================
// PROFILE
// ============================================================

function ProfileTab({
  profile,
  devProfile,
}) {
  return (
    <div
      className="dev-auth-card"
      style={{
        padding: 28,
      }}
    >
      <h3>Your Profile</h3>

      <div className="admin-detail-grid">
        {[
          [
            "Full Name",
            profile?.full_name ||
              devProfile?.full_name,
          ],

          [
            "Email",
            profile?.email,
          ],

          [
            "Phone",
            devProfile?.phone ||
              profile?.phone ||
              "—",
          ],

          [
            "City",
            devProfile?.city ||
              "—",
          ],

          [
            "GitHub",
            devProfile?.github_url,
          ],

          [
            "LinkedIn",
            devProfile?.linkedin_url,
          ],

          [
            "Portfolio",
            devProfile?.portfolio_url,
          ],

          [
            "Status",
            devProfile?.status,
          ],
        ].map(
          ([label, value]) => (
            <div
              key={label}
              className="admin-detail-item"
            >
              <span>{label}</span>

              {value?.startsWith?.(
                "http"
              ) ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                >
                  {value.replace(
                    "https://",
                    ""
                  )}

                  <ExternalLink
                    size={10}
                  />
                </a>
              ) : (
                <strong>
                  {value || "—"}
                </strong>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================

export default function DevDashboard() {
  const {
    profile,
    devProfile,
    logout,
  } = useDeveloper();

  const [assignment, setAssignment] =
    useState(null);

  const [tab, setTab] =
    useState("opportunities");

  const [loadingAssignment, setLoadingAssignment] =
    useState(true);

  // ==========================================================
  // LOAD ASSIGNMENT
  // ==========================================================

  async function loadAssignment() {
    if (!devProfile?.id) {
      setLoadingAssignment(false);
      return;
    }

    try {
      setLoadingAssignment(true);

      const data =
        await getMyCurrentAssignment();

      setAssignment(data);

      // If developer has active project,
      // always show it.
      if (data) {
        setTab((currentTab) => {
          if (
            currentTab ===
              "opportunities" ||
            currentTab ===
              "applications"
          ) {
            return "project";
          }

          return currentTab;
        });
      }

      // If project was completed,
      // automatically unlock opportunities.
      if (!data) {
        setTab((currentTab) => {
          if (
            currentTab ===
              "project" ||
            currentTab ===
              "submissions"
          ) {
            return "opportunities";
          }

          return currentTab;
        });
      }
    } catch (err) {
      console.error(
        "Unable to load current assignment:",
        err
      );
    } finally {
      setLoadingAssignment(false);
    }
  }

  useEffect(() => {
    loadAssignment();
  }, [devProfile?.id]);

  // ==========================================================
  // DISPLAY NAME
  // ==========================================================

  const displayName =
    profile?.full_name ||
    devProfile?.full_name ||
    "";

  const firstName =
    displayName
      ? displayName.split(" ")[0]
      : "";

  // ==========================================================
  // ACTIVE PROJECT
  // ==========================================================

  const hasActiveProject =
    !!assignment;

  // ==========================================================
  // TABS
  // ==========================================================

  const tabs = hasActiveProject
    ? [
        {
          id: "project",
          label: "Current Project",
          icon: FolderKanban,
        },

        {
          id: "submissions",
          label: "Submit Work",
          icon: Send,
        },

        {
          id: "profile",
          label: "Profile",
          icon: User,
        },
      ]
    : [
        {
          id: "opportunities",
          label: "Opportunities",
          icon: Briefcase,
        },

        {
          id: "applications",
          label: "My Applications",
          icon: FileCheck,
        },

        {
          id: "profile",
          label: "Profile",
          icon: User,
        },
      ];

  // ==========================================================
  // TAB RENDER
  // ==========================================================

  function renderTab() {
    if (loadingAssignment) {
      return (
        <div className="dev-tab-empty">
          Loading your project...
        </div>
      );
    }

    if (tab === "project") {
      return (
        <CurrentProjectTab
          assignment={assignment}
        />
      );
    }

    if (tab === "submissions") {
      return (
        <SubmitWorkTab
          assignment={assignment}
          onSubmitted={
            loadAssignment
          }
        />
      );
    }

    if (tab === "opportunities") {
      return (
        <OpportunitiesTab
          devProfile={devProfile}
          onAssignmentCreated={
            async () => {
              await loadAssignment();

              setTab("project");
            }
          }
        />
      );
    }

    if (tab === "applications") {
      return <ApplicationsTab />;
    }

    if (tab === "profile") {
      return (
        <ProfileTab
          profile={profile}
          devProfile={devProfile}
        />
      );
    }

    return null;
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="dev-dashboard-shell">
      {/* =====================================================
          TOPBAR
          ===================================================== */}

      <header className="dev-dashboard-topbar">
        <div className="container dev-dashboard-topbar-inner">
          <div className="dev-dashboard-brand">
            <ExcwaLogo size={36} />

            <span>
              EXCWA <b>Developers</b>
            </span>
          </div>

          <div className="dev-dashboard-userbar">
            <span className="dev-dashboard-user-name">
              {displayName ||
                "\u00A0"}
            </span>

            <button
              className="secondary-btn dev-signout-btn"
              onClick={logout}
            >
              <LogOut size={13} />

              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      <div className="container dev-dashboard-content">
        {/* HERO */}

        <section className="dev-dashboard-hero">
          <div className="dev-dashboard-hero-copy">
            <p className="eyebrow">
              Developer Portal
            </p>

            <h1>
              Welcome back,{" "}
              <span>
                {firstName ||
                  "\u00A0"}
              </span>
            </h1>

            <p>
              {hasActiveProject
                ? "Your current project is assigned and ready to work on."
                : "Browse available projects and find your next opportunity."}
            </p>
          </div>

          <div className="dev-dashboard-hero-metrics">
            <div className="dev-metric-card">
              <span className="dev-metric-label">
                Status
              </span>

              <strong>
                {devProfile?.status ||
                  "pending"}
              </strong>
            </div>

            <div className="dev-metric-card">
              <span className="dev-metric-label">
                Project
              </span>

              <strong>
                {hasActiveProject
                  ? "Assigned"
                  : "Available"}
              </strong>
            </div>
          </div>
        </section>

        {/* TABS */}

        <div className="dev-tabs">
          {tabs.map(
            ({
              id,
              label,
              icon: Icon,
            }) => (
              <button
                key={id}
                className={`dev-tab ${
                  tab === id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setTab(id)
                }
              >
                <Icon size={14} />

                {label}
              </button>
            )
          )}
        </div>

        {/* PANEL */}

        <div className="dev-dashboard-panel">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}