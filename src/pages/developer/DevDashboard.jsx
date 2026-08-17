import { useCallback, useEffect, useMemo, useState } from "react";

import {
  LogOut,
  Briefcase,
  FileCheck,
  Send,
  User,
  ExternalLink,
  FolderKanban,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import "../../styles/developer.css";

import ExcwaLogo from "../../components/common/ExcwaLogo";
import OpportunitiesTab from "../../components/developer/OpportunitiesTab";

import { useDeveloper } from "../../hooks/useDeveloper";

import {
  getMyApplications,
  getMyCurrentAssignment,
} from "../../services/developerService";

import {
  submitProject,
} from "../../services/developer/developerSubmissionService";

/* =========================================================
   STATUS CONFIG
========================================================= */

const STATUS_COLORS = {
  approved: {
    color: "#69e5b7",
    bg: "rgba(105,229,183,.08)",
    border: "rgba(105,229,183,.22)",
  },

  selected: {
    color: "#69e5b7",
    bg: "rgba(105,229,183,.08)",
    border: "rgba(105,229,183,.22)",
  },

  assigned: {
    color: "#69e5b7",
    bg: "rgba(105,229,183,.08)",
    border: "rgba(105,229,183,.22)",
  },

  in_progress: {
    color: "#62e2ff",
    bg: "rgba(98,226,255,.08)",
    border: "rgba(98,226,255,.22)",
  },

  submitted: {
    color: "#62e2ff",
    bg: "rgba(98,226,255,.08)",
    border: "rgba(98,226,255,.22)",
  },

  under_review: {
    color: "#a98cff",
    bg: "rgba(169,140,255,.08)",
    border: "rgba(169,140,255,.22)",
  },

  changes_requested: {
    color: "#ffca70",
    bg: "rgba(255,202,112,.08)",
    border: "rgba(255,202,112,.22)",
  },

  completed: {
    color: "#69e5b7",
    bg: "rgba(105,229,183,.08)",
    border: "rgba(105,229,183,.22)",
  },

  rejected: {
    color: "#ff7373",
    bg: "rgba(255,115,115,.08)",
    border: "rgba(255,115,115,.22)",
  },

  pending: {
    color: "#ffca70",
    bg: "rgba(255,202,112,.08)",
    border: "rgba(255,202,112,.22)",
  },
};

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const normalizedStatus =
    String(status || "pending")
      .trim()
      .toLowerCase();

  const style =
    STATUS_COLORS[normalizedStatus] ||
    STATUS_COLORS.pending;

  return (
    <span
      className="dev-status-badge"
      style={{
        color: style.color,
        background: style.bg,
        borderColor: style.border,
      }}
    >
      <span
        className="dev-status-dot"
        style={{
          background: style.color,
        }}
      />

      {normalizedStatus.replace(/_/g, " ")}
    </span>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getOpportunity(assignment) {
  if (!assignment) {
    return null;
  }

  return (
    assignment.opportunities ||
    assignment.opportunity ||
    null
  );
}

function getAssignmentId(assignment) {
  return (
    assignment?.id ||
    assignment?.assignment_id ||
    null
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "—";
  }

  return `₹${number.toLocaleString("en-IN")}`;
}

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon: Icon = FolderKanban,
  title,
  description,
  action,
  onAction,
}) {
  return (
    <div className="dev-tab-empty">
      <Icon
        size={36}
        className="dev-empty-icon"
      />

      <h3>{title}</h3>

      {description && (
        <p>{description}</p>
      )}

      {action && onAction && (
        <button
          type="button"
          className="primary-btn"
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </div>
  );
}

/* =========================================================
   CURRENT PROJECT
========================================================= */

function CurrentProjectTab({
  assignment,
  onRefresh,
}) {
  if (!assignment) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No active project"
        description="You don't currently have a project assigned. Browse opportunities to find your next project."
      />
    );
  }

  const project =
    getOpportunity(assignment);

  const projectTitle =
    project?.title ||
    assignment?.title ||
    "Untitled Project";

  const projectDescription =
    project?.description ||
    assignment?.description ||
    "No project description has been provided.";

  const techStack =
    getArray(project?.tech_stack);

  const requiredSkills =
    getArray(project?.required_skills);

  return (
    <div className="dev-current-project">

      <div className="dev-project-header">
        <div className="dev-project-heading">

          <span className="dev-opp-category">
            {project?.category || "Project"}
          </span>

          <h2>{projectTitle}</h2>

          <p>
            Project ID:{" "}
            {project?.id ||
              assignment?.opportunity_id ||
              assignment?.id ||
              "—"}
          </p>
        </div>

        <div className="dev-project-actions">
          <StatusBadge
            status={
              assignment?.status ||
              "assigned"
            }
          />

          {onRefresh && (
            <button
              type="button"
              className="dev-icon-button"
              onClick={onRefresh}
              title="Refresh project"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="dev-project-section">
        <h3>Project Requirement</h3>

        <p>{projectDescription}</p>
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
            {formatDate(project?.deadline)}
          </strong>
        </div>

        <div className="dev-project-info">
          <span>Developer Payout</span>

          <strong>
            {formatCurrency(
              project?.freelancer_payout
            )}
          </strong>
        </div>

        <div className="dev-project-info">
          <span>Assigned On</span>

          <strong>
            {formatDate(
              assignment?.assigned_at
            )}
          </strong>
        </div>

      </div>

      {techStack.length > 0 && (
        <div className="dev-project-section">
          <h3>Technology Stack</h3>

          <div className="dev-opp-tags">
            {techStack.map(
              (tech, index) => (
                <span
                  key={`${tech}-${index}`}
                  className="dev-tag"
                >
                  {tech}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {requiredSkills.length > 0 && (
        <div className="dev-project-section">
          <h3>Required Skills</h3>

          <div className="dev-opp-tags">
            {requiredSkills.map(
              (skill, index) => (
                <span
                  key={`${skill}-${index}`}
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

/* =========================================================
   SUBMIT WORK
========================================================= */

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

  const project =
    getOpportunity(assignment);

  const assignmentId =
    getAssignmentId(assignment);

  /*
   * Support both possible nested response structures.
   */
  const submissions = getArray(
    assignment?.project_submissions
  );

  const submission =
    assignment?.submission ||
    submissions[0] ||
    null;

  const submissionStatus =
    String(
      submission?.status || ""
    )
      .trim()
      .toLowerCase();

  const assignmentStatus =
    String(
      assignment?.status || ""
    )
      .trim()
      .toLowerCase();

  const canResubmit =
    submissionStatus ===
    "changes_requested";

  const submissionLocked =
    submissionStatus ===
      "submitted" ||
    submissionStatus ===
      "under_review";

  const projectCompleted =
    assignmentStatus ===
      "completed" ||
    submissionStatus ===
      "completed";

  async function handleSubmit() {
    setError("");
    setMessage("");

    const cleanGithubUrl =
      githubUrl.trim();

    const cleanNotes =
      notes.trim();

    if (!assignmentId) {
      setError(
        "Assignment ID is missing. Please refresh the dashboard and try again."
      );

      console.error(
        "Assignment object:",
        assignment
      );

      return;
    }

    if (!cleanGithubUrl) {
      setError(
        "GitHub repository URL is required."
      );

      return;
    }

    try {
      const parsedUrl =
        new URL(cleanGithubUrl);

      if (
        parsedUrl.protocol !==
          "http:" &&
        parsedUrl.protocol !==
          "https:"
      ) {
        throw new Error();
      }
    } catch {
      setError(
        "Please enter a valid repository URL."
      );

      return;
    }

    setSubmitting(true);

    try {
      await submitProject({
        assignmentId,
        githubUrl: cleanGithubUrl,
        submissionNotes:
          cleanNotes || null,
      });

      setGithubUrl("");
      setNotes("");

      setMessage(
        "Your work has been submitted successfully."
      );

      if (onSubmitted) {
        await onSubmitted();
      }
    } catch (err) {
      console.error(
        "Project submission failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to submit your work."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!assignment) {
    return (
      <EmptyState
        icon={Send}
        title="No active project"
        description="You can submit your work once a project has been assigned to you."
      />
    );
  }

  if (projectCompleted) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Project completed"
        description="This project has already been completed."
      />
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
            {project?.title ||
              "Project"}
          </h2>
        </div>

        <StatusBadge
          status={
            submissionStatus ||
            assignmentStatus ||
            "in_progress"
          }
        />
      </div>

      {canResubmit && (
        <div className="dev-submit-notice warning">
          <strong>
            Changes requested
          </strong>

          {submission?.review_message && (
            <p>
              {submission.review_message}
            </p>
          )}

          <p>
            Update your work and submit it again.
          </p>
        </div>
      )}

      {submissionStatus ===
        "submitted" && (
        <div className="dev-submit-notice info">
          <strong>
            Work submitted
          </strong>

          <p>
            Your submission is waiting for reviewer approval.
          </p>
        </div>
      )}

      {submissionStatus ===
        "under_review" && (
        <div className="dev-submit-notice review">
          <strong>
            Under review
          </strong>

          <p>
            A reviewer is currently reviewing your submission.
          </p>
        </div>
      )}

      <div className="field">
        <label>
          GitHub Repository URL{" "}
          <em>*</em>
        </label>

        <input
          type="url"
          placeholder="https://github.com/username/project"
          value={githubUrl}
          onChange={(event) =>
            setGithubUrl(
              event.target.value
            )
          }
          disabled={
            submitting ||
            submissionLocked
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
          Submission Notes{" "}
          <em className="optional-label">
            optional
          </em>
        </label>

        <textarea
          rows={5}
          placeholder="Add setup instructions or any important notes..."
          value={notes}
          onChange={(event) =>
            setNotes(
              event.target.value
            )
          }
          disabled={
            submitting ||
            submissionLocked
          }
        />
      </div>

      {error && (
        <div className="dev-form-message error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="dev-form-message success">
          <CheckCircle2 size={14} />
          <span>{message}</span>
        </div>
      )}

      <button
        type="button"
        className="primary-btn form-submit"
        onClick={handleSubmit}
        disabled={
          submitting ||
          submissionLocked
        }
      >
        <Send size={14} />

        {submitting
          ? "Submitting..."
          : submissionLocked
          ? "Work Submitted"
          : canResubmit
          ? "Resubmit Work"
          : "Submit Work"}
      </button>
    </div>
  );
}

/* =========================================================
   APPLICATIONS
========================================================= */

function ApplicationsTab({
  refreshKey,
}) {
  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadApplications =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getMyApplications();

        setApplications(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "Unable to load applications:",
          err
        );

        setError(
          err?.message ||
            "Unable to load your applications."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadApplications();
  }, [
    loadApplications,
    refreshKey,
  ]);

  if (loading) {
    return (
      <div className="dev-tab-empty">
        <RefreshCw
          size={28}
          className="dev-loading-icon"
        />

        <h3>
          Loading applications
        </h3>

        <p>
          Please wait...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Unable to load applications"
        description={error}
        action="Try Again"
        onAction={loadApplications}
      />
    );
  }

  if (!applications.length) {
    return (
      <EmptyState
        icon={FileCheck}
        title="No applications yet"
        description="Applications you submit for opportunities will appear here."
      />
    );
  }

  return (
    <div className="dev-app-list">
      {applications.map(
        (application) => {
          const opportunity =
            application?.opportunities ||
            application?.opportunity ||
            null;

          return (
            <div
              key={
                application?.id ||
                `${application?.opportunity_id}-${application?.created_at}`
              }
              className="dev-app-card"
            >
              <div className="dev-app-content">

                <span className="dev-opp-category">
                  {opportunity?.category ||
                    "Project"}
                </span>

                <h3>
                  {opportunity?.title ||
                    "Untitled Project"}
                </h3>

                <p>
                  Applied{" "}
                  {formatDate(
                    application?.applied_at ||
                      application?.created_at
                  )}
                </p>

                {opportunity?.description && (
                  <span className="dev-app-description">
                    {opportunity.description}
                  </span>
                )}
              </div>

              <StatusBadge
                status={
                  application?.status ||
                  "pending"
                }
              />
            </div>
          );
        }
      )}
    </div>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function ProfileTab({
  profile,
  devProfile,
}) {
  const profileItems = useMemo(
    () => [
      [
        "Full Name",
        profile?.full_name ||
          devProfile?.full_name,
      ],

      [
        "Email",
        profile?.email ||
          devProfile?.email,
      ],

      [
        "Phone",
        devProfile?.phone ||
          profile?.phone,
      ],

      [
        "City",
        devProfile?.city,
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
        "Developer Status",
        devProfile?.status,
      ],
    ],
    [profile, devProfile]
  );

  return (
    <div className="dev-auth-card dev-profile-card">

      <div className="dev-section-heading">
        <div>
          <span className="eyebrow">
            Account
          </span>

          <h2>Your Profile</h2>

          <p>
            Your developer account information.
          </p>
        </div>

        <User size={22} />
      </div>

      <div className="admin-detail-grid">
        {profileItems.map(
          ([label, value]) => {
            const isLink =
              typeof value ===
                "string" &&
              /^https?:\/\//i.test(
                value
              );

            return (
              <div
                key={label}
                className="admin-detail-item"
              >
                <span>{label}</span>

                {isLink ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>
                      {value.replace(
                        /^https?:\/\//i,
                        ""
                      )}
                    </span>

                    <ExternalLink
                      size={11}
                    />
                  </a>
                ) : (
                  <strong>
                    {value || "—"}
                  </strong>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function DevDashboard() {
  const {
    profile,
    devProfile,
    loading: profileLoading,
    logout,
  } = useDeveloper();

  const [assignment, setAssignment] =
    useState(null);

  const [assignmentLoading, setAssignmentLoading] =
    useState(false);

  const [assignmentError, setAssignmentError] =
    useState("");

  const [tab, setTab] =
    useState("opportunities");

  const [applicationsRefreshKey, setApplicationsRefreshKey] =
    useState(0);

  const [loggingOut, setLoggingOut] =
    useState(false);

  /* =======================================================
     LOAD CURRENT ASSIGNMENT
  ======================================================= */

  const loadAssignment =
    useCallback(async () => {
      setAssignmentLoading(true);
      setAssignmentError("");

      try {
        const data =
          await getMyCurrentAssignment();

        setAssignment(
          data || null
        );
      } catch (error) {
        console.error(
          "Unable to load current assignment:",
          error
        );

        setAssignment(null);

        setAssignmentError(
          error?.message ||
            "Unable to load your current project."
        );
      } finally {
        setAssignmentLoading(false);
      }
    }, []);

  /* =======================================================
     LOAD ASSIGNMENT AFTER PROFILE IS READY
  ======================================================= */

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    if (!devProfile) {
      setAssignment(null);
      setAssignmentError("");
      return;
    }

    loadAssignment();
  }, [
    profileLoading,
    devProfile,
    loadAssignment,
  ]);

  /* =======================================================
     PERIODIC REFRESH
  ======================================================= */

  useEffect(() => {
    if (
      profileLoading ||
      !devProfile
    ) {
      return undefined;
    }

    const interval =
      setInterval(() => {
        loadAssignment();
      }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [
    profileLoading,
    devProfile,
    loadAssignment,
  ]);

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  /* =======================================================
     USER INFORMATION
  ======================================================= */

  const displayName =
    profile?.full_name ||
    devProfile?.full_name ||
    "Developer";

  const firstName =
    displayName
      .trim()
      .split(/\s+/)[0] ||
    "Developer";

  const hasActiveProject =
    Boolean(assignment);

  /* =======================================================
     TABS
     
     IMPORTANT:
     Keep ALL tabs available.
     
     A developer with an active project should still be able
     to see Opportunities, Applications and Profile.
  ======================================================= */

  const tabs = [
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
      id: "project",
      label: "Current Project",
      icon: FolderKanban,
      badge: hasActiveProject
        ? "Active"
        : null,
    },

    {
      id: "submissions",
      label: "Submit Work",
      icon: Send,
      badge: hasActiveProject
        ? null
        : "No Project",
    },

    {
      id: "profile",
      label: "Profile",
      icon: User,
    },
  ];

  /* =======================================================
     DASHBOARD STATS
  ======================================================= */

  const developerStatus =
    devProfile?.status ||
    "pending";

  /* =======================================================
     TAB CONTENT
  ======================================================= */

  function renderTab() {
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
      return (
        <ApplicationsTab
          refreshKey={
            applicationsRefreshKey
          }
        />
      );
    }

    if (tab === "project") {
      if (assignmentLoading) {
        return (
          <div className="dev-tab-empty">
            <RefreshCw
              size={28}
              className="dev-loading-icon"
            />

            <h3>
              Loading current project
            </h3>

            <p>
              Please wait...
            </p>
          </div>
        );
      }

      if (
        assignmentError &&
        !assignment
      ) {
        return (
          <EmptyState
            icon={AlertCircle}
            title="Unable to load project"
            description={assignmentError}
            action="Try Again"
            onAction={loadAssignment}
          />
        );
      }

      return (
        <CurrentProjectTab
          assignment={assignment}
          onRefresh={loadAssignment}
        />
      );
    }

    if (tab === "submissions") {
      if (assignmentLoading) {
        return (
          <div className="dev-tab-empty">
            <RefreshCw
              size={28}
              className="dev-loading-icon"
            />

            <h3>
              Loading project
            </h3>

            <p>
              Please wait...
            </p>
          </div>
        );
      }

      if (
        assignmentError &&
        !assignment
      ) {
        return (
          <EmptyState
            icon={AlertCircle}
            title="Unable to load project"
            description={assignmentError}
            action="Try Again"
            onAction={loadAssignment}
          />
        );
      }

      return (
        <SubmitWorkTab
          assignment={assignment}
          onSubmitted={
            async () => {
              await loadAssignment();

              setApplicationsRefreshKey(
                (value) =>
                  value + 1
              );
            }
          }
        />
      );
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

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (profileLoading) {
    return (
      <div className="dev-dashboard-shell">
        <div className="dev-dashboard-loading">
          <div className="dev-dashboard-loading-logo">
            <ExcwaLogo size={44} />
          </div>

          <RefreshCw
            size={20}
            className="dev-loading-icon"
          />

          <h2>
            Loading Developer Portal
          </h2>

          <p>
            Preparing your workspace...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="dev-dashboard-shell">

      {/* =================================================
          TOPBAR
      ================================================= */}

      <header className="dev-dashboard-topbar">
        <div className="container dev-dashboard-topbar-inner">

          <div className="dev-dashboard-brand">
            <ExcwaLogo size={36} />

            <span>
              EXCWA{" "}
              <b>Developers</b>
            </span>
          </div>

          <div className="dev-dashboard-userbar">

            <div className="dev-user-avatar">
              {firstName
                .charAt(0)
                .toUpperCase()}
            </div>

            <span className="dev-dashboard-user-name">
              {displayName}
            </span>

            <button
              type="button"
              className="secondary-btn dev-signout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={13} />

              {loggingOut
                ? "Signing Out..."
                : "Sign Out"}
            </button>

          </div>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="container dev-dashboard-content">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="dev-dashboard-hero">

          <div className="dev-dashboard-hero-copy">

            <p className="eyebrow">
              Developer Portal
            </p>

            <h1>
              Welcome back,{" "}
              <span>{firstName}</span>
            </h1>

            <p>
              {hasActiveProject
                ? "Your current project is active. Track your work and submit your completed deliverables."
                : "Explore opportunities, manage your applications and find your next project."}
            </p>

          </div>

          <div className="dev-dashboard-hero-metrics">

            <div className="dev-metric-card">
              <span className="dev-metric-label">
                Developer Status
              </span>

              <strong>
                <StatusBadge
                  status={
                    developerStatus
                  }
                />
              </strong>
            </div>

            <div className="dev-metric-card">
              <span className="dev-metric-label">
                Current Project
              </span>

              <strong>
                {hasActiveProject
                  ? "Assigned"
                  : "None"}
              </strong>
            </div>

          </div>
        </section>

        {/* =================================================
            ACTIVE PROJECT QUICK INFO
        ================================================= */}

        {hasActiveProject && (
          <section className="dev-active-project-banner">

            <div className="dev-active-project-icon">
              <FolderKanban
                size={20}
              />
            </div>

            <div className="dev-active-project-content">
              <span>
                Active Project
              </span>

              <strong>
                {getOpportunity(
                  assignment
                )?.title ||
                  "Current Project"}
              </strong>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                setTab("project")
              }
            >
              View Project
            </button>

          </section>
        )}

        {/* =================================================
            TABS
        ================================================= */}

        <nav className="dev-tabs">
          {tabs.map(
            ({
              id,
              label,
              icon: Icon,
              badge,
            }) => (
              <button
                key={id}
                type="button"
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

                <span>
                  {label}
                </span>

                {badge && (
                  <small>
                    {badge}
                  </small>
                )}
              </button>
            )
          )}
        </nav>

        {/* =================================================
            PANEL
        ================================================= */}

        <section className="dev-dashboard-panel">
          {renderTab()}
        </section>

      </main>
    </div>
  );
}