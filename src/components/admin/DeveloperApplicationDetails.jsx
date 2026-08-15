import {
  X,
  CheckCircle,
  XCircle,
  ExternalLink,
  Download,
  MapPin,
  GraduationCap,
  Mail,
  Phone,
  Github,
  Linkedin,
  Globe,
  Calendar,
  Trash2,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

export default function DeveloperApplicationDetails({
  application,
  onClose,
  onStatusChange,
  onDelete,
}) {
  if (!application) {
    return null;
  }

  const {
    full_name,
    phone,
    email,
    city,
    education,
    github_url,
    linkedin_url,
    portfolio_url,
    primary_roles,
    profile_photo_path,
    resume_path,
    status,
    created_at,
    reviewed_at,
  } = application;

  // =========================================================
  // STORAGE URLS
  // =========================================================

  const {
    data: photoData,
  } = profile_photo_path
    ? supabase.storage
        .from("profile-photos")
        .getPublicUrl(profile_photo_path)
    : { data: null };

  const {
    data: resumeData,
  } = resume_path
    ? supabase.storage
        .from("developer-resumes")
        .getPublicUrl(resume_path)
    : { data: null };

  const photoUrl =
    photoData?.publicUrl || null;

  const resumeUrl =
    resumeData?.publicUrl || null;

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =========================================================
  // STATUS
  // =========================================================

  const isPending =
    status === "pending";

  const isApproved =
    status === "approved";

  const isRejected =
    status === "rejected";

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className="developer-details-overlay"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <div className="developer-details-modal">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="developer-details-header">

          <div>

            <span className="developer-details-eyebrow">
              DEVELOPER APPLICATION
            </span>

            <h2>
              Applicant Details
            </h2>

          </div>

          <button
            type="button"
            className="developer-details-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>

        </div>

        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <div className="developer-details-profile">

          <div className="developer-details-photo">

            {photoUrl ? (
              <img
                src={photoUrl}
                alt={full_name}
              />
            ) : (
              <span>
                {full_name
                  ?.charAt(0)
                  ?.toUpperCase() || "?"}
              </span>
            )}

          </div>

          <div className="developer-details-profile-info">

            <h3>
              {full_name ||
                "Unnamed Applicant"}
            </h3>

            <p>
              {education ||
                "Education not provided"}
            </p>

            <div className="developer-details-status-row">

              <span
                className={`developer-status-badge ${status}`}
              >
                <span className="developer-status-dot" />
                {status
                  ?.charAt(0)
                  ?.toUpperCase() +
                  status?.slice(1)}
              </span>

              <span className="developer-details-location">
                <MapPin size={14} />
                {city || "Location not provided"}
              </span>

            </div>

          </div>

        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="developer-details-content">

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <section className="developer-details-section">

            <h3>
              Basic Information
            </h3>

            <div className="developer-details-info-grid">

              <div className="developer-detail-item">

                <span>
                  <Mail size={15} />
                  Email
                </span>

                <strong>
                  {email || "—"}
                </strong>

              </div>

              <div className="developer-detail-item">

                <span>
                  <Phone size={15} />
                  Phone
                </span>

                <strong>
                  {phone || "—"}
                </strong>

              </div>

              <div className="developer-detail-item">

                <span>
                  <GraduationCap size={15} />
                  Education
                </span>

                <strong>
                  {education || "—"}
                </strong>

              </div>

              <div className="developer-detail-item">

                <span>
                  <MapPin size={15} />
                  City
                </span>

                <strong>
                  {city || "—"}
                </strong>

              </div>

            </div>

          </section>

          {/* =================================================
              ROLES
          ================================================= */}

          <section className="developer-details-section">

            <h3>
              Professional Roles
            </h3>

            <div className="developer-details-role-list">

              {Array.isArray(primary_roles) &&
              primary_roles.length > 0 ? (
                primary_roles.map((role) => (
                  <span
                    key={role}
                    className="developer-details-role"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="developer-no-data">
                  No roles specified.
                </span>
              )}

            </div>

          </section>

          {/* =================================================
              PROFESSIONAL PROFILES
          ================================================= */}

          <section className="developer-details-section">

            <h3>
              Professional Profiles
            </h3>

            <div className="developer-profile-links">

              {github_url && (
                <a
                  href={github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="developer-profile-link"
                >
                  <Github size={17} />

                  <span>
                    GitHub
                  </span>

                  <ExternalLink size={14} />
                </a>
              )}

              {linkedin_url && (
                <a
                  href={linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="developer-profile-link"
                >
                  <Linkedin size={17} />

                  <span>
                    LinkedIn
                  </span>

                  <ExternalLink size={14} />
                </a>
              )}

              {portfolio_url && (
                <a
                  href={portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="developer-profile-link"
                >
                  <Globe size={17} />

                  <span>
                    Portfolio
                  </span>

                  <ExternalLink size={14} />
                </a>
              )}

              {!github_url &&
                !linkedin_url &&
                !portfolio_url && (
                  <span className="developer-no-data">
                    No professional profiles provided.
                  </span>
                )}

            </div>

          </section>

          {/* =================================================
              RESUME
          ================================================= */}

          <section className="developer-details-section">

            <h3>
              Resume
            </h3>

            {resumeUrl ? (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="developer-resume-card"
              >

                <div className="developer-resume-icon">
                  <Download size={20} />
                </div>

                <div>
                  <strong>
                    View / Download Resume
                  </strong>

                  <span>
                    Open the uploaded resume
                  </span>
                </div>

                <ExternalLink size={16} />

              </a>
            ) : (
              <div className="developer-no-data">
                Resume not available.
              </div>
            )}

          </section>

          {/* =================================================
              APPLICATION INFORMATION
          ================================================= */}

          <section className="developer-details-section">

            <h3>
              Application Information
            </h3>

            <div className="developer-application-meta">

              <div>
                <Calendar size={15} />

                <span>
                  Applied
                </span>

                <strong>
                  {formatDate(created_at)}
                </strong>
              </div>

              {reviewed_at && (
                <div>
                  <Calendar size={15} />

                  <span>
                    Reviewed
                  </span>

                  <strong>
                    {formatDate(reviewed_at)}
                  </strong>
                </div>
              )}

            </div>

          </section>

        </div>

        {/* =================================================
            FOOTER ACTIONS
        ================================================= */}

        <div className="developer-details-footer">

          <button
            type="button"
            className="developer-delete-btn"
            onClick={() =>
              onDelete(application.id)
            }
          >
            <Trash2 size={16} />
            Delete
          </button>

          <div className="developer-details-actions">

            <button
              type="button"
              className="developer-secondary-btn"
              onClick={onClose}
            >
              Close
            </button>

            {isPending && (
              <>
                <button
                  type="button"
                  className="developer-reject-btn"
                  onClick={() =>
                    onStatusChange(
                      application.id,
                      "rejected"
                    )
                  }
                >
                  <XCircle size={16} />
                  Reject
                </button>

                <button
                  type="button"
                  className="developer-approve-btn"
                  onClick={() =>
                    onStatusChange(
                      application.id,
                      "approved"
                    )
                  }
                >
                  <CheckCircle size={16} />
                  Approve
                </button>
              </>
            )}

            {isApproved && (
              <button
                type="button"
                className="developer-reject-btn"
                onClick={() =>
                  onStatusChange(
                    application.id,
                    "rejected"
                  )
                }
              >
                <XCircle size={16} />
                Reject
              </button>
            )}

            {isRejected && (
              <button
                type="button"
                className="developer-approve-btn"
                onClick={() =>
                  onStatusChange(
                    application.id,
                    "approved"
                  )
                }
              >
                <CheckCircle size={16} />
                Approve
              </button>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}