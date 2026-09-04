import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  FileCheck2,
  FolderKanban,
  Layers3,
  Loader2,
  Play,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { getClientProject } from "../../services/client/clientProjectService";
import "../../styles/client-portal.css";

const formatDate = (value) => {
  if (!value) return "Not set";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const formatStatus = (value) => {
  return String(value || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClass = (value) => {
  return `status-${String(value || "unknown").replaceAll("_", "-")}`;
};

const getProgressSteps = (status) => {
  const steps = [
    {
      key: "created",
      label: "Project Created",
    },
    {
      key: "assigned",
      label: "Developer Assigned",
    },
    {
      key: "in_progress",
      label: "Development",
    },
    {
      key: "submitted",
      label: "Submitted",
    },
    {
      key: "under_review",
      label: "Under Review",
    },
    {
      key: "approved",
      label: "Approved",
    },
    {
      key: "completed",
      label: "Completed",
    },
  ];

  const statusOrder = [
    "draft",
    "open",
    "assigned",
    "in_progress",
    "submitted",
    "under_review",
    "changes_requested",
    "approved",
    "completed",
    "closed",
  ];

  const currentIndex = statusOrder.indexOf(status);

  return steps.map((step, index) => {
    let active = false;

    if (status === "changes_requested") {
      active = index <= 3;
    } else if (status === "closed") {
      active = index <= 6;
    } else {
      const stepIndex = statusOrder.indexOf(step.key);
      active = stepIndex !== -1 && currentIndex >= stepIndex;
    }

    return {
      ...step,
      active,
    };
  });
};

export default function ClientProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError("");

    getClientProject(projectId)
      .then((data) => {
        if (mounted) {
          setProject(data);
        }
      })
      .catch((loadError) => {
        if (mounted) {
          setError(
            loadError.message || "Unable to load this project."
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="client-portal-loading">
        <Loader2
          size={30}
          className="client-portal-loading-spinner"
        />
        <p>Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="client-portal-error-page">
        <div className="client-portal-error-card">
          <FolderKanban size={32} />

          <h2>Project unavailable</h2>

          <p>
            {error ||
              "This project is not available in your client portal."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/client/dashboard")}
          >
            Return to projects
          </button>
        </div>
      </div>
    );
  }

  const submission = project.latest_submission;
  const assignment = project.assignment;

  const previewEnabled = Boolean(
    project.client_preview_enabled
  );

  const canPreview = Boolean(
    previewEnabled &&
      project.preview_url &&
      project.preview_status === "ready"
  );

  const technologies = asList(project.tech_stack);
  const requiredSkills = asList(project.required_skills);
  const requiredRoles = asList(project.required_roles);

  const progressSteps = getProgressSteps(project.status);

  const shortProjectId = project.id
    ? `${project.id.slice(0, 8)}...`
    : "Not available";

  return (
    <div className="client-portal">
      <main className="client-portal-main client-project-details-main">
        {/* =====================================================
            TOP BAR
        ===================================================== */}

        <header className="client-portal-topbar">
          <div>
            <span className="client-portal-section-label">
              CLIENT PORTAL / PROJECT
            </span>

            <h1>{project.title}</h1>
          </div>

          <Link
            className="client-project-back-link"
            to="/client/dashboard"
          >
            <ArrowLeft size={16} />
            Back to overview
          </Link>
        </header>

        <section className="client-portal-content client-project-details-content">
          {/* =====================================================
              PROJECT HERO
          ===================================================== */}

          <section className="client-project-hero">
            <div className="client-project-hero-content">
              <span className="client-project-eyebrow">
                PROJECT WORKSPACE
              </span>

              <h2>{project.title}</h2>

              <p>
                {project.description ||
                  "Project information and progress will appear here."}
              </p>

              <div className="client-project-hero-meta">
                <span>
                  Project ID: <strong>{shortProjectId}</strong>
                </span>

                <span>
                  Created:{" "}
                  <strong>
                    {formatDate(project.created_at)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="client-project-hero-status">
              <span
                className={`client-project-status ${getStatusClass(
                  project.status
                )}`}
              >
                {formatStatus(project.status)}
              </span>
            </div>
          </section>

          {/* =====================================================
              QUICK INFORMATION
          ===================================================== */}

          <section className="client-project-summary-grid">
            <div className="client-project-summary-card">
              <div className="client-project-summary-icon">
                <Layers3 size={18} />
              </div>

              <div>
                <span>Project Type</span>
                <strong>
                  {project.project_type || "Not set"}
                </strong>
              </div>
            </div>

            <div className="client-project-summary-card">
              <div className="client-project-summary-icon">
                <FolderKanban size={18} />
              </div>

              <div>
                <span>Category</span>
                <strong>
                  {project.category || "Project"}
                </strong>
              </div>
            </div>

            <div className="client-project-summary-card">
              <div className="client-project-summary-icon">
                <CalendarDays size={18} />
              </div>

              <div>
                <span>Deadline</span>
                <strong>
                  {formatDate(project.deadline)}
                </strong>
              </div>
            </div>

            <div className="client-project-summary-card">
              <div className="client-project-summary-icon">
                <UserRoundCheck size={18} />
              </div>

              <div>
                <span>Assignment</span>
                <strong>
                  {assignment
                    ? "Developer Assigned"
                    : "Awaiting Assignment"}
                </strong>
              </div>
            </div>
          </section>

          {/* =====================================================
              MAIN INFORMATION GRID
          ===================================================== */}

          <div className="client-project-detail-grid">
            {/* ===================================================
                PROJECT INFORMATION
            =================================================== */}

            <section className="client-project-panel">
              <div className="client-project-panel-heading">
                <FolderKanban size={18} />

                <div>
                  <h3>Project Information</h3>
                  <p>
                    General information about your project.
                  </p>
                </div>
              </div>

              <div className="client-project-meta-grid">
                <div>
                  <span>Category</span>
                  <strong>
                    {project.category || "Project"}
                  </strong>
                </div>

                <div>
                  <span>Project Type</span>
                  <strong>
                    {project.project_type || "Not set"}
                  </strong>
                </div>

                <div>
                  <span>Project ID</span>
                  <strong title={project.id}>
                    {shortProjectId}
                  </strong>
                </div>

                <div>
                  <span>Created</span>
                  <strong>
                    {formatDate(project.created_at)}
                  </strong>
                </div>
              </div>
            </section>

            {/* ===================================================
                TIMELINE
            =================================================== */}

            <section className="client-project-panel">
              <div className="client-project-panel-heading">
                <CalendarDays size={18} />

                <div>
                  <h3>Timeline</h3>
                  <p>
                    Important project dates and activity.
                  </p>
                </div>
              </div>

              <div className="client-project-meta-grid">
                <div>
                  <span>Created</span>
                  <strong>
                    {formatDate(project.created_at)}
                  </strong>
                </div>

                <div>
                  <span>Deadline</span>
                  <strong>
                    {formatDate(project.deadline)}
                  </strong>
                </div>

                <div>
                  <span>Latest Submission</span>
                  <strong>
                    {submission
                      ? formatDate(submission.submitted_at)
                      : "Awaiting work"}
                  </strong>
                </div>

                <div>
                  <span>Current Status</span>
                  <strong>
                    {formatStatus(project.status)}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          {/* =====================================================
              SCOPE & REQUIREMENTS
          ===================================================== */}

          <section className="client-project-panel client-project-full-panel">
            <div className="client-project-panel-heading">
              <FileCheck2 size={18} />

              <div>
                <h3>Scope & Requirements</h3>
                <p>
                  Technologies, roles, skills and expected
                  deliverables for this project.
                </p>
              </div>
            </div>

            <div className="client-project-scope-grid">
              <div className="client-project-scope-item">
                <span>Technology Stack</span>

                <div className="client-project-tags">
                  {technologies.length ? (
                    technologies.map((technology) => (
                      <span
                        className="client-project-tag"
                        key={technology}
                      >
                        <Code2 size={13} />
                        {technology}
                      </span>
                    ))
                  ) : (
                    <strong>Not set</strong>
                  )}
                </div>
              </div>

              <div className="client-project-scope-item">
                <span>Required Skills</span>

                <div className="client-project-tags">
                  {requiredSkills.length ? (
                    requiredSkills.map((skill) => (
                      <span
                        className="client-project-tag"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <strong>Not set</strong>
                  )}
                </div>
              </div>

              <div className="client-project-scope-item">
                <span>Required Roles</span>

                <div className="client-project-tags">
                  {requiredRoles.length ? (
                    requiredRoles.map((role) => (
                      <span
                        className="client-project-tag"
                        key={role}
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <strong>Not set</strong>
                  )}
                </div>
              </div>
            </div>

            <div className="client-project-copy">
              <span>Deliverables</span>

              <p>
                {project.deliverables || "Not set"}
              </p>
            </div>
          </section>

          {/* =====================================================
              PROJECT PROGRESS
          ===================================================== */}

          <section className="client-project-panel client-project-progress-panel">
            <div className="client-project-panel-heading">
              <Clock3 size={18} />

              <div>
                <h3>Project Progress</h3>

                <p>
                  Current progress based on the project
                  workflow.
                </p>
              </div>
            </div>

            <div className="client-project-progress">
              {progressSteps.map((step, index) => (
                <div
                  className={`client-project-progress-step ${
                    step.active ? "is-active" : ""
                  }`}
                  key={step.key}
                >
                  <div className="client-project-progress-marker">
                    {step.active ? (
                      <CheckCircle2 size={17} />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  <div className="client-project-progress-label">
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =====================================================
              LATEST UPDATE
          ===================================================== */}

          <section className="client-project-panel">
            <div className="client-project-panel-heading">
              <FileCheck2 size={18} />

              <div>
                <h3>Latest Project Update</h3>

                <p>
                  The latest submission and review information.
                </p>
              </div>
            </div>

            <div className="client-project-meta-grid">
              <div>
                <span>Submission</span>

                <strong>
                  {submission
                    ? formatDate(submission.submitted_at)
                    : "Not submitted"}
                </strong>
              </div>

              <div>
                <span>Review Status</span>

                <strong>
                  {submission?.status
                    ? formatStatus(submission.status)
                    : "Not submitted"}
                </strong>
              </div>
            </div>

            <div className="client-project-submission-note">
              {submission?.review_message ||
                submission?.submission_notes ||
                "Your project updates will appear here when work is submitted."}
            </div>
          </section>

          {/* =====================================================
              WORK PREVIEW
          ===================================================== */}

          <section
            className={`client-project-preview-panel ${
              canPreview ? "is-ready" : "is-locked"
            }`}
          >
            <div className="client-project-panel-heading">
              {canPreview ? (
                <Play size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}

              <div>
                <h3>Work Preview</h3>

                <p>
                  {canPreview
                    ? "The latest submitted version is ready to review."
                    : previewEnabled
                    ? "EXCWA is preparing the latest submitted version."
                    : "Preview is not available for this project yet."}
                </p>
              </div>
            </div>

            {canPreview ? (
              <a
                className="client-project-preview-button"
                href={project.preview_url}
                target="_blank"
                rel="noreferrer"
              >
                <Play size={16} />
                Open Live Preview
                <ExternalLink size={14} />
              </a>
            ) : previewEnabled ? (
              <span className="client-project-preview-locked">
                Preview is being prepared
              </span>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}