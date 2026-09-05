import "../../styles/developer/legacy-portal.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  MessageSquareWarning,
  MessageSquare,
  Clock3,
  CalendarDays,
  Layers3,
  Code2,
  CheckSquare2,
  LayoutDashboard,
  ChevronRight,
  CircleDot,
} from "lucide-react";

import "../../styles/developer/components.css";
import "../../styles/developer/Developer-dashboard.css";
import "../../styles/developer/current-project.css";
import "../../styles/developer/applications.css";
import "../../styles/developer/submissions.css";
import "../../styles/developer/profile.css";

import ExcwaLogo from "../../components/common/ExcwaLogo";
import OpportunitiesTab from "../../components/developer/OpportunitiesTab";
import DeveloperMessages from "../../components/developer/DeveloperMessages";

import { useDeveloper } from "../../hooks/useDeveloper";

import {
  getMyApplications,
  getMyCurrentAssignment,
} from "../../services/developerService";

import { submitProject } from "../../services/developer/developerSubmissionService";

/* ============================================================
   CONSTANTS
   ============================================================ */

const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  "assigned",
  "in_progress",
  "submitted",
  "under_review",
  "changes_requested",
]);

const COMPLETED_PROJECT_STATUSES = new Set([
  "completed",
]);

const LOCKED_SUBMISSION_STATUSES = new Set([
  "submitted",
  "under_review",
]);

const STATUS_COLORS = {
  approved: {
    color: "#69e5b7",
    bg: "rgba(105, 229, 183, 0.08)",
    border: "rgba(105, 229, 183, 0.22)",
  },

  selected: {
    color: "#69e5b7",
    bg: "rgba(105, 229, 183, 0.08)",
    border: "rgba(105, 229, 183, 0.22)",
  },

  assigned: {
    color: "#69e5b7",
    bg: "rgba(105, 229, 183, 0.08)",
    border: "rgba(105, 229, 183, 0.22)",
  },

  in_progress: {
    color: "#62e2ff",
    bg: "rgba(98, 226, 255, 0.08)",
    border: "rgba(98, 226, 255, 0.22)",
  },

  submitted: {
    color: "#62e2ff",
    bg: "rgba(98, 226, 255, 0.08)",
    border: "rgba(98, 226, 255, 0.22)",
  },

  under_review: {
    color: "#a98cff",
    bg: "rgba(169, 140, 255, 0.08)",
    border: "rgba(169, 140, 255, 0.22)",
  },

  changes_requested: {
    color: "#ffca70",
    bg: "rgba(255, 202, 112, 0.08)",
    border: "rgba(255, 202, 112, 0.22)",
  },

  completed: {
    color: "#69e5b7",
    bg: "rgba(105, 229, 183, 0.08)",
    border: "rgba(105, 229, 183, 0.22)",
  },

  finalized: {
    color: "#69e5b7",
    bg: "rgba(105, 229, 183, 0.08)",
    border: "rgba(105, 229, 183, 0.22)",
  },

  rejected: {
    color: "#ff7373",
    bg: "rgba(255, 115, 115, 0.08)",
    border: "rgba(255, 115, 115, 0.22)",
  },

  pending: {
    color: "#ffca70",
    bg: "rgba(255, 202, 112, 0.08)",
    border: "rgba(255, 202, 112, 0.22)",
  },

  cancelled: {
    color: "#ff7373",
    bg: "rgba(255, 115, 115, 0.08)",
    border: "rgba(255, 115, 115, 0.22)",
  },
};

/* ============================================================
   HELPERS
   ============================================================ */

function normalizeStatus(status) {
  return String(status || "pending")
    .trim()
    .toLowerCase();
}

function getOpportunity(assignment) {
  return (
    assignment?.opportunities ||
    assignment?.opportunity ||
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

function getLatestSubmission(assignment) {
  if (!assignment) {
    return null;
  }

  if (assignment.submission) {
    return assignment.submission;
  }

  if (Array.isArray(assignment.project_submissions)) {
    return assignment.project_submissions[0] || null;
  }

  if (Array.isArray(assignment.submissions)) {
    return assignment.submissions[0] || null;
  }

  return null;
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

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap(function (item) {
        if (typeof item === "string") {
          return item
            .split(",")
            .map(function (part) {
              return part.trim();
            })
            .filter(Boolean);
        }

        return item;
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  return [];
}

function isValidGithubUrl(value) {
  try {
    const url = new URL(value.trim());

    const hostname = url.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return (
      url.protocol === "https:" &&
      hostname === "github.com" &&
      Boolean(url.pathname) &&
      url.pathname !== "/"
    );
  } catch {
    return false;
  }
}

/* ============================================================
   STATUS BADGE
   ============================================================ */

function StatusBadge({ status }) {
  const normalizedStatus = normalizeStatus(status);

  const style =
    STATUS_COLORS[normalizedStatus] ||
    STATUS_COLORS.pending;

  const label = normalizedStatus.replace(/_/g, " ");

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

      {label}
    </span>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

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

/* ============================================================
   LOADING STATE
   ============================================================ */

function LoadingState({
  title = "Loading",
  description = "Please wait...",
}) {
  return (
    <div className="dev-tab-empty">
      <RefreshCw
        size={28}
        className="dev-loading-icon"
      />

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}

/* ============================================================
   CHANGES REQUESTED
   ============================================================ */

function ChangesRequestedPanel({
  submission,
}) {
  const status = normalizeStatus(
    submission?.status
  );

  if (
    !submission ||
    status !== "changes_requested"
  ) {
    return null;
  }

  const reviewMessage =
    submission?.review_message?.trim();

  return (
    <div className="dev-changes-requested-panel">
      <div className="dev-changes-requested-header">
        <div className="dev-changes-requested-icon">
          <MessageSquareWarning size={20} />
        </div>

        <div>
          <span>Reviewer Feedback</span>

          <h3>
            Changes Requested
          </h3>
        </div>

        <StatusBadge
          status="changes_requested"
        />
      </div>

      <div className="dev-changes-requested-body">
        {reviewMessage ? (
          <>
            <p className="dev-feedback-label">
              Changes required
            </p>

            <div className="dev-review-message">
              {reviewMessage}
            </div>
          </>
        ) : (
          <p className="dev-review-message-empty">
            The reviewer requested changes to
            your submission but did not provide
            additional written instructions.
          </p>
        )}

        {submission?.reviewed_at && (
          <div className="dev-review-meta">
            <Clock3 size={13} />

            <span>
              Reviewed{" "}
              {formatDateTime(
                submission.reviewed_at
              )}
            </span>
          </div>
        )}

        <p className="dev-feedback-instruction">
          Please make the requested changes,
          update your GitHub repository, and
          submit the updated work from the{" "}
          <strong>Submit Work</strong> section.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT INFO CARD
   ============================================================ */

function ProjectInfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="dev-project-info-card">
      <div className="dev-project-info-icon">
        <Icon size={17} />
      </div>

      <div className="dev-project-info-content">
        <span>{label}</span>

        <strong>
          {value || "—"}
        </strong>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT TAG SECTION
   ============================================================ */

function ProjectTagSection({
  icon: Icon,
  title,
  items = [],
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="dev-project-section">
      <div className="dev-project-section-heading">
        <Icon size={17} />

        <h3>{title}</h3>
      </div>

      <div className="dev-opp-tags">
        {items.map(function (item, index) {
          return (
            <span
              key={
                String(item) +
                "-" +
                index
              }
              className="dev-tag"
            >
              {item}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   CURRENT PROJECT
   ============================================================ */

function CurrentProjectTab({
  assignment,
  onRefresh,
  refreshing = false,
}) {
  if (!assignment) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No active project"
        description="You don't currently have a project assigned."
      />
    );
  }

  const project =
    getOpportunity(assignment);

  const submission =
    getLatestSubmission(assignment);

  const projectTitle =
    project?.title ||
    assignment?.title ||
    "Untitled Project";

  const projectDescription =
    project?.description ||
    assignment?.description ||
    "No project description has been provided.";

  const projectId =
    project?.id ||
    assignment?.opportunity_id ||
    assignment?.id ||
    "—";

  const projectType =
    project?.project_type ||
    project?.type ||
    assignment?.project_type ||
    "—";

  const deadline =
    project?.deadline ||
    assignment?.deadline;

  const assignedAt =
    assignment?.assigned_at ||
    assignment?.started_at;

  const techStack =
    normalizeList(project?.tech_stack);

  const requiredSkills =
    normalizeList(
      project?.required_skills
    );

  const deliverables =
    project?.deliverables ||
    assignment?.deliverables ||
    "";

  return (
    <div className="dev-current-project">
      <div className="dev-project-header">
        <div className="dev-project-heading">
          <span className="dev-opp-category">
            {project?.category ||
              "Web Application"}
          </span>

          <h2>{projectTitle}</h2>

          <p>
            Project ID:{" "}
            <span className="dev-project-id">
              {projectId}
            </span>
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
              disabled={refreshing}
              title="Refresh project"
              aria-label="Refresh project"
            >
              <RefreshCw
                size={14}
                className={
                  refreshing
                    ? "dev-loading-icon"
                    : ""
                }
              />
            </button>
          )}
        </div>
      </div>

      <ChangesRequestedPanel
        submission={submission}
      />

      <div className="dev-project-section dev-project-requirement">
        <div className="dev-project-section-heading">
          <FolderKanban size={17} />

          <h3>
            Project Requirement
          </h3>
        </div>

        <p>{projectDescription}</p>
      </div>

      <div className="dev-project-info-grid">
        <ProjectInfoCard
          icon={Layers3}
          label="Project Type"
          value={projectType}
        />

        <ProjectInfoCard
          icon={CalendarDays}
          label="Deadline"
          value={formatDate(deadline)}
        />

        <ProjectInfoCard
          icon={CheckSquare2}
          label="Assigned On"
          value={formatDate(assignedAt)}
        />
      </div>

      <ProjectTagSection
        icon={Code2}
        title="Technology Stack"
        items={techStack}
      />

      <ProjectTagSection
        icon={CheckSquare2}
        title="Required Skills"
        items={requiredSkills}
      />

      {deliverables && (
        <div className="dev-project-section">
          <div className="dev-project-section-heading">
            <FileCheck size={17} />

            <h3>Deliverables</h3>
          </div>

          <div className="dev-deliverables">
            {Array.isArray(deliverables) ? (
              deliverables.map(
                function (item, index) {
                  return (
                    <div
                      key={index}
                      className="dev-deliverable-item"
                    >
                      <CheckCircle2 size={15} />

                      <span>
                        {String(item)}
                      </span>
                    </div>
                  );
                }
              )
            ) : (
              <p>{deliverables}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUBMIT WORK
   ============================================================ */

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

  const submission =
    getLatestSubmission(assignment);

  const submissionStatus =
    normalizeStatus(
      submission?.status
    );

  const assignmentStatus =
    normalizeStatus(
      assignment?.status
    );

  const canResubmit =
    submissionStatus ===
      "changes_requested" ||
    assignmentStatus ===
      "changes_requested";

  const submissionLocked =
    LOCKED_SUBMISSION_STATUSES.has(
      submissionStatus
    );

  const projectCompleted =
    COMPLETED_PROJECT_STATUSES.has(
      assignmentStatus
    ) ||
    submissionStatus === "completed";

  const handleSubmit =
    async function () {
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

      if (
        !isValidGithubUrl(
          cleanGithubUrl
        )
      ) {
        setError(
          "Please enter a valid HTTPS GitHub repository URL."
        );

        return;
      }

      if (submissionLocked) {
        setError(
          "This submission is currently locked while it is being reviewed."
        );

        return;
      }

      setSubmitting(true);

      try {
        await submitProject({
          assignmentId,
          githubUrl:
            cleanGithubUrl,
          submissionNotes:
            cleanNotes || null,
        });

        setGithubUrl("");
        setNotes("");

        setMessage(
          canResubmit
            ? "Your updated work has been resubmitted successfully."
            : "Your work has been submitted successfully."
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
    };

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

      <ChangesRequestedPanel
        submission={submission}
      />

      {submissionStatus ===
        "submitted" && (
        <div className="dev-submit-notice info">
          <strong>
            Work submitted
          </strong>

          <p>
            Your submission is waiting for
            reviewer approval.
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
            A reviewer is currently reviewing
            your submission.
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
          onChange={function (event) {
            setGithubUrl(
              event.target.value
            );
          }}
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
          placeholder={
            canResubmit
              ? "Explain what you changed in this version..."
              : "Add setup instructions or any important notes..."
          }
          value={notes}
          onChange={function (event) {
            setNotes(
              event.target.value
            );
          }}
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
          ? "Resubmit Updated Work"
          : "Submit Work"}
      </button>
    </div>
  );
}

/* ============================================================
   APPLICATIONS
   ============================================================ */

function ApplicationsTab() {
  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadApplications =
    useCallback(
      async function () {
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
      },
      []
    );

  useEffect(
    function () {
      loadApplications();
    },
    [loadApplications]
  );

  if (loading) {
    return (
      <LoadingState
        title="Loading applications"
      />
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
        function (
          application,
          index
        ) {
          const opportunity =
            application?.opportunities ||
            application?.opportunity ||
            null;

          const applicationKey =
            application?.id ||
            application?.opportunity_id ||
            "application-" + index;

          return (
            <div
              key={applicationKey}
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
                    application?.applied_at
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

/* ============================================================
   PROFILE
   ============================================================ */

function ProfileTab({
  profile,
  devProfile,
}) {
  const profilePhotoUrl =
    devProfile?.profile_photo_url ||
    devProfile?.profilePhotoUrl ||
    devProfile?.photo_url ||
    devProfile?.avatar_url ||
    profile?.profile_photo_url ||
    profile?.profilePhotoUrl ||
    profile?.photo_url ||
    profile?.avatar_url ||
    "";

  const resumeUrl =
    devProfile?.resume_url ||
    devProfile?.resumeUrl ||
    devProfile?.resume ||
    profile?.resume_url ||
    profile?.resumeUrl ||
    profile?.resume ||
    "";

  const fullName =
    devProfile?.full_name ||
    profile?.full_name ||
    "Developer";

  const email =
    devProfile?.email ||
    profile?.email ||
    "—";

  const phone =
    devProfile?.phone ||
    profile?.phone ||
    "—";

  const city =
    devProfile?.city ||
    profile?.city ||
    "—";

  const githubUrl =
    devProfile?.github_url ||
    devProfile?.githubUrl ||
    profile?.github_url ||
    profile?.githubUrl ||
    "";

  const linkedinUrl =
    devProfile?.linkedin_url ||
    devProfile?.linkedinUrl ||
    profile?.linkedin_url ||
    profile?.linkedinUrl ||
    "";

  const portfolioUrl =
    devProfile?.portfolio_url ||
    devProfile?.portfolioUrl ||
    profile?.portfolio_url ||
    profile?.portfolioUrl ||
    "";

  const developerStatus =
    devProfile?.status ||
    profile?.status ||
    "pending";

  const primaryRoles =
    Array.isArray(
      devProfile?.primary_roles
    )
      ? devProfile.primary_roles
      : [];

  function renderValue(value) {
    if (!value) {
      return <strong>—</strong>;
    }

    const isLink =
      typeof value === "string" &&
      /^https?:\/\//i.test(value);

    if (!isLink) {
      return (
        <strong>{value}</strong>
      );
    }

    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="dev-profile-detail-link"
      >
        <span>
          {value.replace(
            /^https?:\/\//i,
            ""
          )}
        </span>

        <ExternalLink size={11} />
      </a>
    );
  }

  return (
    <div className="dev-auth-card dev-profile-card">
      <div className="dev-section-heading">
        <div>
          <span className="eyebrow">
            Account
          </span>

          <h2>Your Profile</h2>

          <p>
            Your EXCWA developer account
            information and professional
            documents.
          </p>
        </div>

        <User size={22} />
      </div>

      <div className="dev-profile-overview">
        <div className="dev-profile-photo-wrapper">
          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt={fullName}
              className="dev-profile-photo"
              onError={function (event) {
                event.currentTarget.style.display =
                  "none";

                const placeholder =
                  event.currentTarget.parentElement?.querySelector(
                    ".dev-profile-photo-placeholder"
                  );

                if (placeholder) {
                  placeholder.style.display =
                    "flex";
                }
              }}
            />
          ) : null}

          <div
            className="dev-profile-photo-placeholder"
            style={{
              display: profilePhotoUrl
                ? "none"
                : "flex",
            }}
          >
            <User size={32} />
          </div>
        </div>

        <div className="dev-profile-overview-info">
          <h3>{fullName}</h3>

          <span>{city}</span>

          <StatusBadge
            status={developerStatus}
          />
        </div>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-item">
          <span>Full Name</span>
          <strong>{fullName}</strong>
        </div>

        <div className="admin-detail-item">
          <span>Email</span>
          <strong>{email}</strong>
        </div>

        <div className="admin-detail-item">
          <span>Phone</span>
          <strong>{phone}</strong>
        </div>

        <div className="admin-detail-item">
          <span>City</span>
          <strong>{city}</strong>
        </div>

        <div className="admin-detail-item">
          <span>GitHub</span>
          {renderValue(githubUrl)}
        </div>

        <div className="admin-detail-item">
          <span>LinkedIn</span>
          {renderValue(linkedinUrl)}
        </div>

        <div className="admin-detail-item">
          <span>Portfolio</span>
          {renderValue(portfolioUrl)}
        </div>

        <div className="admin-detail-item">
          <span>Developer Status</span>

          <StatusBadge
            status={developerStatus}
          />
        </div>
      </div>

      {primaryRoles.length > 0 && (
        <div className="dev-profile-section">
          <div className="dev-profile-document-header">
            <div>
              <span className="eyebrow">
                Professional Expertise
              </span>

              <h3>
                Primary Roles
              </h3>
            </div>
          </div>

          <div className="dev-opp-tags">
            {primaryRoles.map(
              function (
                role,
                index
              ) {
                return (
                  <span
                    key={
                      String(role) +
                      "-" +
                      index
                    }
                    className="dev-tag"
                  >
                    {role}
                  </span>
                );
              }
            )}
          </div>
        </div>
      )}

      <div className="dev-profile-documents">
        <div className="dev-profile-document-header">
          <div>
            <span className="eyebrow">
              Profile Media
            </span>

            <h3>
              Profile Photo
            </h3>
          </div>

          <User size={20} />
        </div>

        {profilePhotoUrl ? (
          <div className="dev-profile-photo-preview-card">
            <img
              src={profilePhotoUrl}
              alt={
                fullName +
                " profile"
              }
              className="dev-profile-large-photo"
            />

            <div className="dev-profile-photo-preview-info">
              <strong>
                Profile Photo
              </strong>

              <span>
                Your uploaded developer
                profile image
              </span>

              <a
                href={profilePhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-btn"
              >
                <ExternalLink size={14} />
                Open Image
              </a>
            </div>
          </div>
        ) : (
          <div className="dev-profile-document-empty">
            <User size={18} />

            <span>
              No profile photo uploaded.
            </span>
          </div>
        )}
      </div>

      <div className="dev-profile-documents">
        <div className="dev-profile-document-header">
          <div>
            <span className="eyebrow">
              Professional Document
            </span>

            <h3>
              Resume
            </h3>
          </div>

          <FileCheck size={20} />
        </div>

        {resumeUrl ? (
          <div className="dev-profile-resume-card">
            <div className="dev-profile-resume-icon">
              <FileCheck size={24} />
            </div>

            <div className="dev-profile-resume-info">
              <strong>
                Your Resume
              </strong>

              <span>
                Uploaded PDF document
              </span>
            </div>

            <div className="dev-profile-resume-actions">
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-btn dev-profile-resume-btn"
              >
                <ExternalLink size={14} />
                View Resume
              </a>

              <a
                href={resumeUrl}
                download
                className="secondary-btn dev-profile-resume-btn"
              >
                <FileCheck size={14} />
                Download
              </a>
            </div>
          </div>
        ) : (
          <div className="dev-profile-document-empty">
            <FileCheck size={18} />

            <span>
              No resume uploaded.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   OVERVIEW
   ============================================================ */

function Overview({
  firstName,
  developerStatus,
  assignment,
  assignmentStatus,
  hasActiveProject,
  applicationsCount,
  onNavigate,
  onRefresh,
  refreshing,
}) {
  const project =
    getOpportunity(assignment);

  const latestSubmission =
    getLatestSubmission(assignment);

  const projectTitle =
    project?.title ||
    assignment?.title ||
    "No active project";

  const projectDeadline =
    project?.deadline ||
    assignment?.deadline;

  const submissionStatus =
    normalizeStatus(
      latestSubmission?.status
    );

  return (
    <div className="dev-overview">
      <section className="dev-overview-welcome">
        <div>
          <span className="dev-overview-eyebrow">
            Developer Workspace
          </span>

          <h1>
            Welcome back,{" "}
            <span>{firstName}</span>
          </h1>

          <p>
            {hasActiveProject
              ? "Your workspace is ready. Continue working on your assigned project."
              : "Explore opportunities, track your applications and manage your developer profile."}
          </p>
        </div>

        <div className="dev-overview-status">
          <span>Account status</span>

          <StatusBadge
            status={developerStatus}
          />
        </div>
      </section>

      <section className="dev-overview-stats">
        <button
          type="button"
          className="dev-overview-stat"
          onClick={function () {
            onNavigate(
              hasActiveProject
                ? "project"
                : "opportunities"
            );
          }}
        >
          <div className="dev-overview-stat-icon">
            <FolderKanban size={18} />
          </div>

          <div>
            <span>Current Project</span>

            <strong>
              {hasActiveProject
                ? "Active"
                : "None"}
            </strong>
          </div>

          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          className="dev-overview-stat"
          onClick={function () {
            onNavigate("applications");
          }}
        >
          <div className="dev-overview-stat-icon">
            <FileCheck size={18} />
          </div>

          <div>
            <span>Applications</span>

            <strong>
              {applicationsCount}
            </strong>
          </div>

          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          className="dev-overview-stat"
          onClick={function () {
            onNavigate("messages");
          }}
        >
          <div className="dev-overview-stat-icon">
            <MessageSquare size={18} />
          </div>

          <div>
            <span>Communication</span>

            <strong>
              Messages
            </strong>
          </div>

          <ChevronRight size={16} />
        </button>
      </section>

      <section className="dev-overview-main-grid">
        <div className="dev-overview-project">
          <div className="dev-overview-section-header">
            <div>
              <span>WORKSPACE</span>

              <h2>
                {hasActiveProject
                  ? "Current Project"
                  : "Your Next Project"}
              </h2>
            </div>

            {hasActiveProject && (
              <button
                type="button"
                className="dev-overview-refresh"
                onClick={onRefresh}
                disabled={refreshing}
                title="Refresh project"
              >
                <RefreshCw
                  size={15}
                  className={
                    refreshing
                      ? "dev-loading-icon"
                      : ""
                  }
                />
              </button>
            )}
          </div>

          {hasActiveProject ? (
            <>
              <div className="dev-overview-project-title">
                <div className="dev-overview-project-icon">
                  <FolderKanban size={22} />
                </div>

                <div>
                  <span>
                    {project?.category ||
                      "Project"}
                  </span>

                  <h3>
                    {projectTitle}
                  </h3>
                </div>
              </div>

              <div className="dev-overview-project-meta">
                <div>
                  <span>Status</span>

                  <StatusBadge
                    status={
                      assignmentStatus
                    }
                  />
                </div>

                <div>
                  <span>Deadline</span>

                  <strong>
                    {formatDate(
                      projectDeadline
                    )}
                  </strong>
                </div>

                <div>
                  <span>Submission</span>

                  <strong>
                    {submissionStatus
                      ? submissionStatus.replace(
                          /_/g,
                          " "
                        )
                      : "Not submitted"}
                  </strong>
                </div>
              </div>

              <div className="dev-overview-project-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={function () {
                    onNavigate(
                      "project"
                    );
                  }}
                >
                  <FolderKanban size={15} />
                  Open Project
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={function () {
                    onNavigate(
                      "submissions"
                    );
                  }}
                >
                  <Send size={15} />
                  Submit Work
                </button>
              </div>
            </>
          ) : (
            <div className="dev-overview-empty-project">
              <div className="dev-overview-empty-icon">
                <Briefcase size={25} />
              </div>

              <h3>
                Find your next opportunity
              </h3>

              <p>
                Browse available projects and
                apply for work that matches your
                skills.
              </p>

              <button
                type="button"
                className="primary-btn"
                onClick={function () {
                  onNavigate(
                    "opportunities"
                  );
                }}
              >
                <Briefcase size={15} />
                Explore Opportunities
              </button>
            </div>
          )}
        </div>

        <div className="dev-overview-activity">
          <div className="dev-overview-section-header">
            <div>
              <span>QUICK ACCESS</span>

              <h2>
                Workspace
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="dev-overview-quick-item"
            onClick={function () {
              onNavigate(
                "opportunities"
              );
            }}
          >
            <div>
              <Briefcase size={17} />
            </div>

            <span>
              Browse Opportunities
            </span>

            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            className="dev-overview-quick-item"
            onClick={function () {
              onNavigate(
                "applications"
              );
            }}
          >
            <div>
              <FileCheck size={17} />
            </div>

            <span>
              View Applications
            </span>

            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            className="dev-overview-quick-item"
            onClick={function () {
              onNavigate(
                "messages"
              );
            }}
          >
            <div>
              <MessageSquare size={17} />
            </div>

            <span>
              Contact EXCWA
            </span>

            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            className="dev-overview-quick-item"
            onClick={function () {
              onNavigate(
                "profile"
              );
            }}
          >
            <div>
              <User size={17} />
            </div>

            <span>
              Manage Profile
            </span>

            <ChevronRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   MAIN DASHBOARD
   ============================================================ */

export default function DevDashboard() {
  const {
    profile,
    devProfile,
    loading: profileLoading,
    logout,
  } = useDeveloper();

  const [assignment, setAssignment] =
    useState(null);

  const [
    assignmentLoading,
    setAssignmentLoading,
  ] = useState(false);

  const [
    assignmentRefreshing,
    setAssignmentRefreshing,
  ] = useState(false);

  const [
    assignmentError,
    setAssignmentError,
  ] = useState("");

  const [applications, setApplications] =
    useState([]);

  const [tab, setTab] =
    useState("overview");

  const [loggingOut, setLoggingOut] =
    useState(false);

  /* ==========================================================
     LOAD ASSIGNMENT
     ========================================================== */

  const loadAssignment =
    useCallback(
      async function (options = {}) {
        const background =
          options.background === true;

        if (!devProfile) {
          return;
        }

        if (background) {
          setAssignmentRefreshing(true);
        } else {
          setAssignmentLoading(true);
        }

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

          setAssignmentError(
            error?.message ||
              "Unable to load your current project."
          );
        } finally {
          setAssignmentLoading(false);
          setAssignmentRefreshing(false);
        }
      },
      [devProfile]
    );

  /* ==========================================================
     LOAD APPLICATIONS
     ========================================================== */

  const loadApplicationSummary =
    useCallback(
      async function () {
        if (!devProfile) {
          return;
        }

        try {
          const data =
            await getMyApplications();

          setApplications(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (error) {
          console.error(
            "Unable to load application summary:",
            error
          );
        }
      },
      [devProfile]
    );

  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(
    function () {
      if (profileLoading) {
        return;
      }

      if (!devProfile) {
        setAssignment(null);
        setApplications([]);
        setAssignmentError("");
        return;
      }

      loadAssignment();
      loadApplicationSummary();
    },
    [
      profileLoading,
      devProfile,
      loadAssignment,
      loadApplicationSummary,
    ]
  );

  /* ==========================================================
     BACKGROUND REFRESH
     ========================================================== */

  useEffect(
    function () {
      if (
        profileLoading ||
        !devProfile
      ) {
        return undefined;
      }

      const interval =
        setInterval(
          function () {
            loadAssignment({
              background: true,
            });
          },
          15000
        );

      return function () {
        clearInterval(interval);
      };
    },
    [
      profileLoading,
      devProfile,
      loadAssignment,
    ]
  );

  /* ==========================================================
     ASSIGNMENT STATUS
     ========================================================== */

  const assignmentStatus =
    useMemo(
      function () {
        return normalizeStatus(
          assignment?.status
        );
      },
      [assignment?.status]
    );

  const hasActiveProject =
    Boolean(assignment) &&
    ACTIVE_ASSIGNMENT_STATUSES.has(
      assignmentStatus
    );

  /* ==========================================================
     USER INFORMATION
     ========================================================== */

  const displayName =
    profile?.full_name ||
    devProfile?.full_name ||
    "Developer";

  const firstName =
    displayName
      .trim()
      .split(/\s+/)[0] ||
    "Developer";

  const developerStatus =
    devProfile?.status ||
    "pending";

  /* ==========================================================
     NAVIGATION
     ========================================================== */

  const navigation = useMemo(
    function () {
      const items = [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          id: "opportunities",
          label: "Opportunities",
          icon: Briefcase,
          hideWhenActive: true,
        },
        {
          id: "applications",
          label: "My Applications",
          icon: FileCheck,
          hideWhenActive: true,
        },
        {
          id: "project",
          label: "My Work",
          icon: FolderKanban,
          onlyWhenActive: true,
        },
        {
          id: "submissions",
          label: "Submit Work",
          icon: Send,
          onlyWhenActive: true,
        },
        {
          id: "messages",
          label: "Messages",
          icon: MessageSquare,
        },
        {
          id: "profile",
          label: "My Profile",
          icon: User,
        },
      ];

      return items.filter(
        function (item) {
          if (
            item.onlyWhenActive &&
            !hasActiveProject
          ) {
            return false;
          }

          if (
            item.hideWhenActive &&
            hasActiveProject
          ) {
            return false;
          }

          return true;
        }
      );
    },
    [hasActiveProject]
  );

  /* ==========================================================
     AUTOMATIC TAB SAFETY
     ========================================================== */

  useEffect(
    function () {
      const validTabs =
        navigation.map(
          function (item) {
            return item.id;
          }
        );

      if (!validTabs.includes(tab)) {
        setTab("overview");
      }
    },
    [navigation, tab]
  );

  /* ==========================================================
     LOGOUT
     ========================================================== */

  const handleLogout =
    async function () {
      if (loggingOut) {
        return;
      }

      setLoggingOut(true);

      try {
        await logout();
      } catch (error) {
        console.error(
          "Logout failed:",
          error
        );
      } finally {
        setLoggingOut(false);
      }
    };

  /* ==========================================================
     TAB CONTENT
     ========================================================== */

  function renderContent() {
    switch (tab) {
      case "overview":
        return (
          <Overview
            firstName={firstName}
            developerStatus={
              developerStatus
            }
            assignment={assignment}
            assignmentStatus={
              assignmentStatus
            }
            hasActiveProject={
              hasActiveProject
            }
            applicationsCount={
              applications.length
            }
            onNavigate={setTab}
            onRefresh={function () {
              loadAssignment({
                background: true,
              });
            }}
            refreshing={
              assignmentRefreshing
            }
          />
        );

      case "opportunities":
        return (
          <OpportunitiesTab
            devProfile={devProfile}
          />
        );

      case "applications":
        return (
          <ApplicationsTab />
        );

      case "project":
        if (
          assignmentLoading &&
          !assignment
        ) {
          return (
            <LoadingState
              title="Loading current project"
            />
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
              description={
                assignmentError
              }
              action="Try Again"
              onAction={function () {
                loadAssignment();
              }}
            />
          );
        }

        return (
          <CurrentProjectTab
            assignment={assignment}
            onRefresh={function () {
              loadAssignment({
                background: true,
              });
            }}
            refreshing={
              assignmentRefreshing
            }
          />
        );

      case "submissions":
        if (
          assignmentLoading &&
          !assignment
        ) {
          return (
            <LoadingState
              title="Loading project"
            />
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
              description={
                assignmentError
              }
              action="Try Again"
              onAction={function () {
                loadAssignment();
              }}
            />
          );
        }

        return (
          <SubmitWorkTab
            assignment={assignment}
            onSubmitted={async function () {
              await loadAssignment();
              await loadApplicationSummary();
            }}
          />
        );

      case "messages":
        return (
          <DeveloperMessages />
        );

      case "profile":
        return (
          <ProfileTab
            profile={profile}
            devProfile={devProfile}
          />
        );

      default:
        return null;
    }
  }

  /* ==========================================================
     INITIAL PROFILE LOADING
     ========================================================== */

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

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="dev-dashboard-shell dev-workspace">
      {/* ======================================================
          SIDEBAR
          ====================================================== */}

      <aside className="dev-workspace-sidebar">
        <div className="dev-sidebar-brand">
          <ExcwaLogo size={38} />

          <div>
            <strong>EXCWA</strong>
            <span>Developers</span>
          </div>
        </div>

        <div className="dev-sidebar-profile">
          <div className="dev-sidebar-avatar">
            {firstName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {displayName}
            </strong>

            <span>
              Developer
            </span>
          </div>
        </div>

        <div className="dev-sidebar-label">
          Workspace
        </div>

        <nav
          className="dev-sidebar-nav"
          aria-label="Developer workspace navigation"
        >
          {navigation.map(
            function (item) {
              const Icon =
                item.icon;

              const active =
                tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={
                    "dev-sidebar-nav-item" +
                    (active
                      ? " active"
                      : "")
                  }
                  onClick={function () {
                    setTab(item.id);
                  }}
                >
                  <Icon size={17} />

                  <span>
                    {item.label}
                  </span>

                  {active && (
                    <span className="dev-sidebar-active-dot" />
                  )}
                </button>
              );
            }
          )}
        </nav>

        <div className="dev-sidebar-bottom">
          <div className="dev-sidebar-status">
            <CircleDot size={14} />

            <div>
              <span>
                Account status
              </span>

              <strong>
                {normalizeStatus(
                  developerStatus
                ).replace(
                  /_/g,
                  " "
                )}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="dev-sidebar-signout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={16} />

            <span>
              {loggingOut
                ? "Signing Out..."
                : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>

      {/* ======================================================
          MAIN WORKSPACE
          ====================================================== */}

      <main className="dev-workspace-main">
        <header className="dev-workspace-topbar">
          <div>
            <span>
              EXCWA DEVELOPER PORTAL
            </span>

            <h1>
              {tab === "overview"
                ? "Workspace"
                : navigation.find(
                    function (item) {
                      return (
                        item.id === tab
                      );
                    }
                  )?.label ||
                  "Workspace"}
            </h1>
          </div>

          <div className="dev-workspace-topbar-user">
            <div className="dev-topbar-avatar">
              {firstName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {firstName}
              </strong>

              <span>
                {hasActiveProject
                  ? "Project assigned"
                  : "Available"}
              </span>
            </div>
          </div>
        </header>

        <div className="dev-workspace-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}