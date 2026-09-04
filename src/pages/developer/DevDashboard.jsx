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
  Clock3,
  CalendarDays,
  Layers3,
  Code2,
  CheckSquare2,
} from "lucide-react";

import "../../styles/developer/components.css";
import "../../styles/developer/Developer-dashboard.css";
import "../../styles/developer/current-project.css";
import "../../styles/developer/applications.css";
import "../../styles/developer/submissions.css";
import "../../styles/developer/profile.css";

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
   CONSTANTS
========================================================= */

const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  "pending",
  "assigned",
  "approved",
  "in_progress",
  "submitted",
  "under_review",
  "changes_requested",
]);

const COMPLETED_PROJECT_STATUSES = new Set([
  "completed",
  "finalized",
  "cancelled",
]);

const LOCKED_SUBMISSION_STATUSES = new Set([
  "submitted",
  "under_review",
]);

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

  finalized: {
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

  cancelled: {
    color: "#ff7373",
    bg: "rgba(255,115,115,.08)",
    border: "rgba(255,115,115,.22)",
  },
};

/* =========================================================
   HELPERS
========================================================= */

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
      .flatMap((item) => {
        if (typeof item === "string") {
          return item
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        }

        return item;
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
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
      Boolean(
        url.pathname &&
          url.pathname !== "/"
      )
    );
  } catch {
    return false;
  }
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const normalizedStatus =
    normalizeStatus(status);

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

      {normalizedStatus.replace(
        /_/g,
        " "
      )}
    </span>
  );
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
   LOADING STATE
========================================================= */

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

/* =========================================================
   CHANGES REQUESTED PANEL
========================================================= */

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
            The reviewer requested changes
            to your submission but did not
            provide additional written
            instructions.
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
          <strong>Submit Work</strong> tab.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PROJECT INFO CARD
========================================================= */

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

/* =========================================================
   PROJECT TAG SECTION
========================================================= */

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
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="dev-tag"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   CURRENT PROJECT
========================================================= */

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
    assignment?.started_at ||
    assignment?.created_at;

  const techStack = normalizeList(
    project?.tech_stack
  );

  const requiredSkills = normalizeList(
    project?.required_skills
  );

  const deliverables =
    project?.deliverables ||
    assignment?.deliverables ||
    "";

  return (
    <div className="dev-current-project">
      {/* PROJECT HEADER */}

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

      {/* REVIEWER FEEDBACK */}

      <ChangesRequestedPanel
        submission={submission}
      />

      {/* REQUIREMENT */}

      <div className="dev-project-section dev-project-requirement">
        <div className="dev-project-section-heading">
          <FolderKanban size={17} />

          <h3>
            Project Requirement
          </h3>
        </div>

        <p>{projectDescription}</p>
      </div>

      {/* PROJECT INFORMATION */}

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

      {/* TECHNOLOGY STACK */}

      <ProjectTagSection
        icon={Code2}
        title="Technology Stack"
        items={techStack}
      />

      {/* REQUIRED SKILLS */}

      <ProjectTagSection
        icon={CheckSquare2}
        title="Required Skills"
        items={requiredSkills}
      />

      {/* DELIVERABLES */}

      {deliverables && (
        <div className="dev-project-section">
          <div className="dev-project-section-heading">
            <FileCheck size={17} />

            <h3>Deliverables</h3>
          </div>

          <div className="dev-deliverables">
            {Array.isArray(
              deliverables
            ) ? (
              deliverables.map(
                (item, index) => (
                  <div
                    key={index}
                    className="dev-deliverable-item"
                  >
                    <CheckCircle2
                      size={15}
                    />

                    <span>
                      {String(item)}
                    </span>
                  </div>
                )
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

  const handleSubmit = async () => {
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

    if (!isValidGithubUrl(
      cleanGithubUrl
    )) {
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
      {/* HEADER */}

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

      {/* CHANGES REQUESTED */}

      <ChangesRequestedPanel
        submission={submission}
      />

      {/* SUBMITTED */}

      {submissionStatus ===
        "submitted" && (
        <div className="dev-submit-notice info">
          <strong>
            Work submitted
          </strong>

          <p>
            Your submission is waiting
            for reviewer approval.
          </p>
        </div>
      )}

      {/* UNDER REVIEW */}

      {submissionStatus ===
        "under_review" && (
        <div className="dev-submit-notice review">
          <strong>
            Under review
          </strong>

          <p>
            A reviewer is currently
            reviewing your submission.
          </p>
        </div>
      )}

      {/* GITHUB */}

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

      {/* NOTES */}

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

      {/* ERROR */}

      {error && (
        <div className="dev-form-message error">
          <AlertCircle size={14} />

          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div className="dev-form-message success">
          <CheckCircle2 size={14} />

          <span>{message}</span>
        </div>
      )}

      {/* SUBMIT */}

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

/* =========================================================
   APPLICATIONS
========================================================= */

function ApplicationsTab() {
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
  }, [loadApplications]);

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
        (application) => {
          const opportunity =
            application?.opportunities ||
            application?.opportunity ||
            null;

          const applicationKey =
            application?.id ||
            `${application?.opportunity_id}-${application?.created_at}`;

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
                    application?.applied_at ||
                      application?.created_at
                  )}
                </p>

                {opportunity?.description && (
                  <span className="dev-app-description">
                    {
                      opportunity.description
                    }
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

  const primaryRoles = Array.isArray(
    devProfile?.primary_roles
  )
    ? devProfile.primary_roles
    : [];

  const renderValue = (value) => {
    if (!value) {
      return <strong>—</strong>;
    }

    const isLink =
      typeof value === "string" &&
      /^https?:\/\//i.test(value);

    if (!isLink) {
      return <strong>{value}</strong>;
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
  };

  return (
    <div className="dev-auth-card dev-profile-card">

      {/* HEADER */}
      <div className="dev-section-heading">
        <div>
          <span className="eyebrow">
            Account
          </span>

          <h2>Your Profile</h2>

          <p>
            Your EXCWA developer account
            information and professional documents.
          </p>
        </div>

        <User size={22} />
      </div>

      {/* PROFILE OVERVIEW */}
      <div className="dev-profile-overview">

        <div className="dev-profile-photo-wrapper">

          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt={fullName}
              className="dev-profile-photo"
              onError={(event) => {
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

          <span>
            {city}
          </span>

          <StatusBadge
            status={developerStatus}
          />
        </div>
      </div>

      {/* PROFILE DETAILS */}
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

      {/* PRIMARY ROLES */}
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
              (role, index) => (
                <span
                  key={`${role}-${index}`}
                  className="dev-tag"
                >
                  {role}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* PROFILE PHOTO */}
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
              alt={`${fullName} profile`}
              className="dev-profile-large-photo"
            />

            <div className="dev-profile-photo-preview-info">
              <strong>
                Profile Photo
              </strong>

              <span>
                Your uploaded developer profile image
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

      {/* RESUME */}
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

  const [tab, setTab] =
    useState("opportunities");

  const [loggingOut, setLoggingOut] =
    useState(false);

  /* =======================================================
     LOAD ASSIGNMENT

     IMPORTANT:
     Do NOT put `assignment` in this
     callback dependency array.

     Otherwise:
     setAssignment()
       ↓
     callback recreated
       ↓
     effect runs again
       ↓
     another API request
  ======================================================= */

  const loadAssignment =
    useCallback(
      async ({
        background = false,
      } = {}) => {
        if (!devProfile) {
          return;
        }

        if (background) {
          setAssignmentRefreshing(
            true
          );
        } else {
          setAssignmentLoading(
            true
          );
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
          setAssignmentLoading(
            false
          );

          setAssignmentRefreshing(
            false
          );
        }
      },
      [devProfile]
    );

  /* =======================================================
     INITIAL ASSIGNMENT LOAD
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
     ASSIGNMENT STATUS
  ======================================================= */

  const assignmentStatus =
    useMemo(
      () =>
        normalizeStatus(
          assignment?.status
        ),
      [assignment?.status]
    );

  const hasActiveProject =
    Boolean(assignment) &&
    ACTIVE_ASSIGNMENT_STATUSES.has(
      assignmentStatus
    );

  /* =======================================================
     TAB CONFIGURATION
  ======================================================= */

  const tabs = useMemo(() => {
    if (hasActiveProject) {
      return [
        {
          id: "project",
          label: "My Work",
          icon: FolderKanban,
        },
        {
          id: "submissions",
          label: "Submit Work",
          icon: Send,
        },
        {
          id: "profile",
          label: "My Profile",
          icon: User,
        },
      ];
    }

    return [
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
        label: "My Profile",
        icon: User,
      },
    ];
  }, [hasActiveProject]);

  /* =======================================================
     AUTOMATIC TAB SWITCH
  ======================================================= */

  useEffect(() => {
    if (hasActiveProject) {
      if (
        ![
          "project",
          "submissions",
          "profile",
        ].includes(tab)
      ) {
        setTab("project");
      }

      return;
    }

    if (
      ![
        "opportunities",
        "applications",
        "profile",
      ].includes(tab)
    ) {
      setTab("opportunities");
    }
  }, [
    hasActiveProject,
    tab,
  ]);

  /* =======================================================
     BACKGROUND REFRESH

     Refreshes assignment every 15 seconds
     without replacing the visible project
     with a loading screen.
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
        loadAssignment({
          background: true,
        });
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

  const handleLogout =
    async () => {
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

  const developerStatus =
    devProfile?.status ||
    "pending";

  /* =======================================================
     TAB CONTENT
  ======================================================= */

  const renderTab = () => {
    switch (tab) {
      case "opportunities":
        return (
          <OpportunitiesTab
            devProfile={devProfile}
            onAssignmentCreated={async () => {
              await loadAssignment();

              setTab("project");
            }}
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
              onAction={() =>
                loadAssignment()
              }
            />
          );
        }

        return (
          <CurrentProjectTab
            assignment={assignment}
            onRefresh={() =>
              loadAssignment({
                background: true,
              })
            }
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
              onAction={() =>
                loadAssignment()
              }
            />
          );
        }

        return (
          <SubmitWorkTab
            assignment={assignment}
            onSubmitted={async () => {
              await loadAssignment();
            }}
          />
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
  };

  /* =======================================================
     INITIAL PROFILE LOADING
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
        {/* HERO */}

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
                ? "Your project is currently active. Manage your work and submit your completed deliverables."
                : "Explore available opportunities, manage your applications and find your next project."}
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
                  ? "Active"
                  : "None"}
              </strong>
            </div>
          </div>
        </section>

        {/* ACTIVE PROJECT */}

        {hasActiveProject && (
          <section className="dev-active-project-banner">
            <div className="dev-active-project-icon">
              <FolderKanban size={20} />
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
              View My Work
            </button>
          </section>
        )}

        {/* TABS */}

        <nav
          className="dev-tabs"
          aria-label="Developer dashboard navigation"
        >
          {tabs.map(
            ({
              id,
              label,
              icon: Icon,
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
                aria-current={
                  tab === id
                    ? "page"
                    : undefined
                }
              >
                <Icon size={14} />

                <span>
                  {label}
                </span>
              </button>
            )
          )}
        </nav>

        {/* PANEL */}

        <section className="dev-dashboard-panel">
          {renderTab()}
        </section>
      </main>
    </div>
  );
}