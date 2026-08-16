import { useEffect, useMemo, useState } from "react";

import {
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Github,
  Linkedin,
  Globe,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import "./DeveloperApplicationDetails.css";


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}


function getStatusLabel(status) {
  if (!status) {
    return "Unknown";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}


function getStatusClass(status) {
  switch (status) {
    case "pending":
      return "pending";

    case "accepted":
      return "accepted";

    case "rejected":
      return "rejected";

    default:
      return "default";
  }
}


function normalizeUrl(url) {
  if (!url) {
    return null;
  }

  const trimmed =
    String(url).trim();

  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}


/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="admin-application-detail-item">

      <div className="admin-application-detail-item-icon">
        <Icon size={17} />
      </div>

      <div className="admin-application-detail-item-content">

        <span className="admin-application-detail-label">
          {label}
        </span>

        <span className="admin-application-detail-value">
          {value || "—"}
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   LINK ITEM
========================================================= */

function LinkItem({
  icon: Icon,
  label,
  url,
}) {
  const normalizedUrl =
    normalizeUrl(url);

  if (!normalizedUrl) {
    return (
      <div className="admin-application-link-item disabled">

        <div className="admin-application-link-icon">
          <Icon size={17} />
        </div>

        <div>
          <span className="admin-application-detail-label">
            {label}
          </span>

          <span className="admin-application-link-empty">
            Not provided
          </span>
        </div>

      </div>
    );
  }

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="admin-application-link-item"
    >

      <div className="admin-application-link-icon">
        <Icon size={17} />
      </div>

      <div className="admin-application-link-content">

        <span className="admin-application-detail-label">
          {label}
        </span>

        <span className="admin-application-link-url">
          {url}
        </span>

      </div>

      <ExternalLink size={15} />

    </a>
  );
}


/* =========================================================
   COMPONENT
========================================================= */

export default function DeveloperApplicationDetails({
  application,
  onClose,
  onStatusChange,
  onDelete,
}) {
  const [isAccepting, setIsAccepting] =
    useState(false);

  const [isRejecting, setIsRejecting] =
    useState(false);

  const [showRejectForm, setShowRejectForm] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [profilePhotoUrl, setProfilePhotoUrl] =
    useState(null);

  const [resumeUrl, setResumeUrl] =
    useState(null);


  const isBusy =
    isAccepting ||
    isRejecting;


  const status =
    application?.status ||
    "pending";


  /* =========================================================
     ROLES
  ========================================================= */

  const roles = useMemo(() => {
    if (!application?.primary_roles) {
      return [];
    }

    if (
      Array.isArray(
        application.primary_roles
      )
    ) {
      return application.primary_roles;
    }

    return [
      application.primary_roles,
    ];
  }, [application]);


  /* =========================================================
     RESOLVE FILE URLS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function resolveFiles() {
      setProfilePhotoUrl(
        application?.profile_photo_url ||
          null
      );

      setResumeUrl(
        application?.resume_url ||
          null
      );

      if (!application) {
        return;
      }


      /* -----------------------------------------------------
         PROFILE PHOTO
      ----------------------------------------------------- */

      if (
        !application.profile_photo_url &&
        application.profile_photo_path
      ) {
        const {
          data,
          error: photoError,
        } = await supabase.storage
          .from("profile-photos")
          .createSignedUrl(
            application.profile_photo_path,
            60 * 60
          );

        if (
          !cancelled &&
          !photoError &&
          data?.signedUrl
        ) {
          setProfilePhotoUrl(
            data.signedUrl
          );
        }
      }


      /* -----------------------------------------------------
         RESUME
      ----------------------------------------------------- */

      if (
        !application.resume_url &&
        application.resume_path
      ) {
        const {
          data,
          error: resumeError,
        } = await supabase.storage
          .from("developer-resumes")
          .createSignedUrl(
            application.resume_path,
            60 * 60
          );

        if (
          !cancelled &&
          !resumeError &&
          data?.signedUrl
        ) {
          setResumeUrl(
            data.signedUrl
          );
        }
      }
    }

    resolveFiles();

    return () => {
      cancelled = true;
    };
  }, [application]);


  /* =========================================================
     RESET LOCAL ACTION STATE WHEN APPLICATION CHANGES
  ========================================================= */

  useEffect(() => {
    setError("");
    setSuccessMessage("");
    setShowRejectForm(false);
    setRejectionReason("");
    setIsAccepting(false);
    setIsRejecting(false);
  }, [application?.id]);


  /* =========================================================
     NO APPLICATION
  ========================================================= */

  if (!application) {
    return (
      <div className="admin-review-details-overlay">

        <div className="admin-review-details-panel">

          <div className="admin-review-details-empty">

            <AlertCircle size={32} />

            <h3>
              Application not found
            </h3>

            <button
              type="button"
              onClick={onClose}
              className="admin-review-details-close-button"
            >
              Close
            </button>

          </div>

        </div>

      </div>
    );
  }


  /* =========================================================
     ACCEPT
     
     IMPORTANT:
     
     The modal does NOT call Supabase.
     
     It calls:
     
       onStatusChange("accepted")
     
     The table then calls:
     
       adminDeveloperService.approveDeveloperApplication()
     
     ========================================================= */

  async function handleAccept() {
    if (isBusy) {
      return;
    }

    if (status !== "pending") {
      setError(
        `This application is already ${status}.`
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Accept ${application.full_name}'s developer application?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsAccepting(true);

    try {
      if (!onStatusChange) {
        throw new Error(
          "Application status handler is unavailable."
        );
      }

      await onStatusChange(
        "accepted"
      );

      setSuccessMessage(
        "Developer application accepted successfully."
      );

      setTimeout(() => {
        onClose?.();
      }, 700);
    } catch (err) {
      console.error(
        "handleAccept error:",
        err
      );

      setError(
        err?.message ||
          "Unable to approve developer application."
      );
    } finally {
      setIsAccepting(false);
    }
  }


  /* =========================================================
     OPEN REJECT FORM
  ========================================================= */

  function handleOpenReject() {
    if (isBusy) {
      return;
    }

    if (status !== "pending") {
      setError(
        `This application is already ${status}.`
      );

      return;
    }

    setError("");
    setSuccessMessage("");
    setShowRejectForm(true);
  }


  /* =========================================================
     CANCEL REJECT
  ========================================================= */

  function handleCancelReject() {
    if (isRejecting) {
      return;
    }

    setShowRejectForm(false);
    setRejectionReason("");
    setError("");
  }


  /* =========================================================
     REJECT
     
     IMPORTANT:
     
     The modal does NOT call Supabase.
     
     It calls:
     
       onStatusChange("rejected", reason)
     
     ========================================================= */

  async function handleReject() {
    if (isBusy) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (!reason) {
      setError(
        "Please enter a rejection reason."
      );

      return;
    }

    if (reason.length < 5) {
      setError(
        "Please provide a meaningful rejection reason."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Reject ${application.full_name}'s developer application?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsRejecting(true);

    try {
      if (!onStatusChange) {
        throw new Error(
          "Application status handler is unavailable."
        );
      }

      await onStatusChange(
        "rejected",
        reason
      );

      setSuccessMessage(
        "Developer application rejected successfully."
      );

      setShowRejectForm(false);
      setRejectionReason("");

      setTimeout(() => {
        onClose?.();
      }, 700);
    } catch (err) {
      console.error(
        "handleReject error:",
        err
      );

      setError(
        err?.message ||
          "Unable to reject developer application."
      );
    } finally {
      setIsRejecting(false);
    }
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="admin-review-details-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          if (!isBusy) {
            onClose?.();
          }
        }
      }}
    >

      <aside className="admin-review-details-panel">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="admin-review-details-header">

          <div className="admin-review-details-header-left">

            <div className="admin-review-details-title-icon">
              <User size={20} />
            </div>

            <div>
              <h2>
                Developer Application
              </h2>

              <p>
                Review applicant details
              </p>
            </div>

          </div>

          <button
            type="button"
            className="admin-review-details-close"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close"
          >
            <X size={20} />
          </button>

        </div>


        {/* =================================================
            BODY
        ================================================= */}

        <div className="admin-review-details-body">

          {/* ===============================================
              ALERTS
          =============================================== */}

          {error && (
            <div className="admin-review-details-alert error">

              <AlertCircle size={18} />

              <span>
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>

            </div>
          )}


          {successMessage && (
            <div className="admin-review-details-alert success">

              <CheckCircle2 size={18} />

              <span>
                {successMessage}
              </span>

            </div>
          )}


          {/* ===============================================
              APPLICANT HERO
          =============================================== */}

          <section className="admin-application-profile">

            <div className="admin-application-avatar">

              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={
                    application.full_name ||
                    "Applicant"
                  }
                />
              ) : (
                <User size={32} />
              )}

            </div>

            <div className="admin-application-profile-info">

              <h3>
                {application.full_name ||
                  "Unnamed Applicant"}
              </h3>

              <p>
                {application.email ||
                  "No email"}
              </p>

              <div className="admin-application-status-row">

                <span
                  className={`admin-application-status ${getStatusClass(
                    status
                  )}`}
                >
                  {getStatusLabel(status)}
                </span>

              </div>

            </div>

          </section>


          {/* ===============================================
              PERSONAL INFORMATION
          =============================================== */}

          <section className="admin-application-section">

            <div className="admin-application-section-heading">
              <h3>
                Personal Information
              </h3>
            </div>

            <div className="admin-application-details-grid">

              <DetailItem
                icon={Mail}
                label="Email"
                value={
                  application.email
                }
              />

              <DetailItem
                icon={Phone}
                label="Phone"
                value={
                  application.phone
                }
              />

              <DetailItem
                icon={MapPin}
                label="City"
                value={
                  application.city
                }
              />

              <DetailItem
                icon={GraduationCap}
                label="Education"
                value={
                  application.education
                }
              />

            </div>

          </section>


          {/* ===============================================
              PROFESSIONAL INFORMATION
          =============================================== */}

          <section className="admin-application-section">

            <div className="admin-application-section-heading">
              <h3>
                Professional Information
              </h3>
            </div>

            <div className="admin-application-roles">

              <span className="admin-application-detail-label">
                Primary Roles
              </span>

              {roles.length > 0 ? (
                <div className="admin-application-role-list">

                  {roles.map(
                    (role, index) => (
                      <span
                        key={`${role}-${index}`}
                        className="admin-application-role"
                      >
                        {role}
                      </span>
                    )
                  )}

                </div>
              ) : (
                <span className="admin-application-empty">
                  No roles provided
                </span>
              )}

            </div>

          </section>


          {/* ===============================================
              LINKS
          =============================================== */}

          <section className="admin-application-section">

            <div className="admin-application-section-heading">
              <h3>
                Professional Links
              </h3>
            </div>

            <div className="admin-application-links">

              <LinkItem
                icon={Github}
                label="GitHub"
                url={
                  application.github_url
                }
              />

              <LinkItem
                icon={Linkedin}
                label="LinkedIn"
                url={
                  application.linkedin_url
                }
              />

              <LinkItem
                icon={Globe}
                label="Portfolio"
                url={
                  application.portfolio_url
                }
              />

            </div>

          </section>


          {/* ===============================================
              RESUME
          =============================================== */}

          <section className="admin-application-section">

            <div className="admin-application-section-heading">
              <h3>
                Resume
              </h3>
            </div>

            {resumeUrl ? (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-application-resume"
              >

                <div className="admin-application-resume-icon">
                  <FileText size={22} />
                </div>

                <div className="admin-application-resume-info">

                  <strong>
                    View Resume
                  </strong>

                  <span>
                    Open the applicant's resume
                  </span>

                </div>

                <ExternalLink size={18} />

              </a>
            ) : (
              <div className="admin-application-resume unavailable">

                <FileText size={22} />

                <span>
                  Resume unavailable
                </span>

              </div>
            )}

          </section>


          {/* ===============================================
              APPLICATION INFORMATION
          =============================================== */}

          <section className="admin-application-section">

            <div className="admin-application-section-heading">
              <h3>
                Application Information
              </h3>
            </div>

            <div className="admin-application-details-grid">

              <DetailItem
                icon={CalendarDays}
                label="Applied"
                value={formatDate(
                  application.created_at
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Last Updated"
                value={formatDate(
                  application.updated_at
                )}
              />

              <DetailItem
                icon={ShieldCheck}
                label="Reviewed"
                value={formatDate(
                  application.reviewed_at
                )}
              />

              <DetailItem
                icon={User}
                label="Developer User ID"
                value={
                  application.developer_user_id ||
                  "Not created"
                }
              />

            </div>


            {application.rejection_reason && (
              <div className="admin-application-rejection-history">

                <span className="admin-application-detail-label">
                  Rejection Reason
                </span>

                <p>
                  {application.rejection_reason}
                </p>

              </div>
            )}

          </section>


          {/* ===============================================
              REJECTION FORM
          =============================================== */}

          {showRejectForm &&
            status === "pending" && (
              <section className="admin-application-reject-form">

                <div className="admin-application-section-heading">

                  <div>

                    <h3>
                      Reject Application
                    </h3>

                    <p>
                      Provide a reason that can
                      be communicated to the applicant.
                    </p>

                  </div>

                </div>


                <textarea
                  value={
                    rejectionReason
                  }
                  onChange={(event) => {
                    setRejectionReason(
                      event.target.value
                    );

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Enter rejection reason..."
                  rows={5}
                  disabled={isRejecting}
                />


                <div className="admin-application-reject-form-actions">

                  <button
                    type="button"
                    onClick={
                      handleCancelReject
                    }
                    disabled={
                      isRejecting
                    }
                    className="admin-application-secondary-button"
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    onClick={
                      handleReject
                    }
                    disabled={
                      isRejecting ||
                      !rejectionReason.trim()
                    }
                    className="admin-application-danger-button"
                  >

                    {isRejecting ? (
                      <>
                        <Loader2
                          size={17}
                          className="spin"
                        />

                        Rejecting...
                      </>
                    ) : (
                      <>
                        <XCircle
                          size={17}
                        />

                        Confirm Rejection
                      </>
                    )}

                  </button>

                </div>

              </section>
            )}

        </div>


        {/* =================================================
            FOOTER ACTIONS
        ================================================= */}

        <div className="admin-review-details-footer">

          {status === "pending" ? (
            <>
              <button
                type="button"
                className="admin-application-reject-button"
                onClick={
                  handleOpenReject
                }
                disabled={isBusy}
              >
                <XCircle size={18} />

                Reject
              </button>


              <button
                type="button"
                className="admin-application-accept-button"
                onClick={
                  handleAccept
                }
                disabled={isBusy}
              >

                {isAccepting ? (
                  <>
                    <Loader2
                      size={18}
                      className="spin"
                    />

                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={18}
                    />

                    Accept Developer
                  </>
                )}

              </button>
            </>
          ) : (
            <div className="admin-application-final-status">

              {status === "accepted" ? (
                <>
                  <CheckCircle2
                    size={18}
                  />

                  <span>
                    Developer application accepted
                  </span>
                </>
              ) : status === "rejected" ? (
                <>
                  <XCircle
                    size={18}
                  />

                  <span>
                    Developer application rejected
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle
                    size={18}
                  />

                  <span>
                    Application status:{" "}
                    {getStatusLabel(
                      status
                    )}
                  </span>
                </>
              )}

            </div>
          )}


          {/* DELETE */}

          {onDelete && (
            <button
              type="button"
              className="admin-application-delete-button"
              onClick={() =>
                onDelete(
                  application.id
                )
              }
              disabled={isBusy}
            >
              Delete
            </button>
          )}

        </div>

      </aside>

    </div>
  );
}