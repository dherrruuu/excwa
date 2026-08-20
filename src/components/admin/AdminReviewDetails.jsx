import { useEffect, useMemo, useState } from "react";

import {
  ExternalLink,
  RefreshCw,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react";

import {
  reviewSubmission,
} from "../../services/admin/adminWorkReviewService";

import "../../styles/admin/admin-review-detail.css";


/* =========================================================
   REVIEW STATUS OPTIONS
========================================================= */

const REVIEW_STATUSES = [
  {
    value: "under_review",
    label: "Under Review",
  },
  {
    value: "changes_requested",
    label: "Request Changes",
  },
  {
    value: "approved",
    label: "Approve & Complete",
  },
  {
    value: "rejected",
    label: "Reject Submission",
  },
];


/* =========================================================
   HELPERS
========================================================= */

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function getStatusClass(status) {
  if (!status) {
    return "review-status";
  }

  return `review-status status-${String(
    status
  )
    .toLowerCase()
    .replaceAll("_", "-")}`;
}


function formatDate(value) {
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


/* =========================================================
   COMPONENT
========================================================= */

export default function AdminReviewDetails({
  review,
  onClose,
  onStatusUpdated,
}) {
  const [selectedStatus, setSelectedStatus] =
    useState("");

  const [reviewMessage, setReviewMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /* =======================================================
     RESET WHEN REVIEW CHANGES
  ======================================================= */

  useEffect(() => {
    if (!review) {
      return;
    }

    setSelectedStatus("");

    setReviewMessage("");

    setError("");

    setSuccess("");
  }, [review]);


  /* =======================================================
     NO REVIEW
  ======================================================= */

  if (!review) {
    return null;
  }


  /* =======================================================
     DATA
  ======================================================= */

  const assignmentId =
    review.id;

  const projectTitle =
    review.projectTitle ||
    "Unknown Project";

  const developerName =
    review.developerName ||
    "Unknown Developer";

  const developerId =
    review.developer_id ||
    "—";

  const currentAssignmentStatus =
    review.status ||
    "unknown";

  const submission =
    review.submission ||
    null;

  const submissionStatus =
    submission?.status ||
    review.submissionStatus ||
    null;


  /* =======================================================
     CAN REVIEW?
  ======================================================= */

  const canReview =
    Boolean(submission) &&
    ![
      "completed",
    ].includes(
      currentAssignmentStatus
    );


  /* =======================================================
     REVIEW DESCRIPTION
  ======================================================= */

  const actionDescription =
    useMemo(() => {
      switch (selectedStatus) {
        case "under_review":
          return "Marks this submission as currently being reviewed.";

        case "changes_requested":
          return "The developer remains assigned and will be allowed to submit a new revision.";

        case "approved":
          return "Approves this submission and completes the project. The developer becomes available again.";

        case "rejected":
          return "Rejects this submission and closes the project workflow.";

        default:
          return "Choose what should happen to the latest submission.";
      }
    }, [selectedStatus]);


  /* =======================================================
     UPDATE REVIEW
  ======================================================= */

  async function updateStatus() {
    if (!assignmentId) {
      setError(
        "Assignment ID is missing."
      );
      return;
    }

    if (!submission?.id) {
      setError(
        "There is no submission to review."
      );
      return;
    }

    if (!selectedStatus) {
      setError(
        "Please select a review action."
      );
      return;
    }

    if (
      saving
    ) {
      return;
    }

    if (
      selectedStatus ===
      "changes_requested"
    ) {
      if (
        !reviewMessage.trim()
      ) {
        setError(
          "Please provide feedback describing the changes required."
        );
        return;
      }
    }

    let confirmationMessage =
      "";

    switch (selectedStatus) {
      case "changes_requested":
        confirmationMessage =
          `Request changes from ${developerName}?\n\nThe developer will remain assigned and can resubmit the project.`;
        break;

      case "approved":
        confirmationMessage =
          `Approve "${projectTitle}"?\n\nThis will complete the project and release ${developerName} for new opportunities.`;
        break;

      case "rejected":
        confirmationMessage =
          `Reject the current submission?\n\nThis will close the project workflow.`;
        break;

      default:
        confirmationMessage =
          `Update this submission to "${formatStatus(
            selectedStatus
          )}"?`;
    }

    if (
      !window.confirm(
        confirmationMessage
      )
    ) {
      return;
    }

    setSaving(true);

    setError("");

    setSuccess("");

    try {
      const result =
        await reviewSubmission({
          assignmentId,

          submissionId:
            submission.id,

          status:
            selectedStatus,

          reviewMessage:
            reviewMessage.trim() ||
            null,
        });

      /*
       * Update parent immediately.
       */
      if (
        onStatusUpdated
      ) {
        onStatusUpdated({
          ...review,

          ...result.assignment,

          status:
            result.assignment.status,

          submission:
            result.submission,

          submissionId:
            result.submission.id,

          submissionStatus:
            result.submission.status,

          reviewMessage:
            result.submission
              .review_message,

          reviewedAt:
            result.submission
              .reviewed_at,

          reviewedBy:
            result.submission
              .reviewed_by,
        });
      }

      setSuccess(
        getSuccessMessage(
          selectedStatus
        )
      );

      setSelectedStatus("");

      setReviewMessage("");
    } catch (err) {
      console.error(
        "Review update failed:",
        err
      );

      let message =
        err?.message ||
        "Failed to update the project review.";

      if (
        message
          .toLowerCase()
          .includes(
            "row-level security"
          )
      ) {
        message =
          "Supabase RLS blocked the admin update. Check the admin policies for project_assignments and project_submissions.";
      }

      setError(message);
    } finally {
      setSaving(false);
    }
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="admin-review-overlay"
      onClick={onClose}
    >
      <aside
        className="admin-review-drawer"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="admin-review-drawer-header">

          <div>
            <span className="review-detail-label">
              WORK REVIEW
            </span>

            <h2>
              {projectTitle}
            </h2>

            <p>
              {developerName}
            </p>
          </div>

          <button
            type="button"
            className="admin-review-close"
            onClick={onClose}
            aria-label="Close review"
          >
            <X size={20} />
          </button>

        </div>


        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="admin-review-drawer-content">

          {/* ===============================================
              CURRENT STATUS
          =============================================== */}

          <div className="review-panel-status-row">

            <span>
              Project Status
            </span>

            <span
              className={getStatusClass(
                currentAssignmentStatus
              )}
            >
              {formatStatus(
                currentAssignmentStatus
              )}
            </span>

          </div>


          {/* ===============================================
              SUBMISSION STATUS
          =============================================== */}

          {submissionStatus && (
            <div className="review-panel-status-row">

              <span>
                Latest Submission
              </span>

              <span
                className={getStatusClass(
                  submissionStatus
                )}
              >
                {formatStatus(
                  submissionStatus
                )}
              </span>

            </div>
          )}


          {/* ===============================================
              DEVELOPER
          =============================================== */}

          <section className="review-panel-section">

            <span className="review-detail-label">
              DEVELOPER
            </span>

            <div className="review-panel-info">

              <div>
                <span>
                  Name
                </span>

                <strong>
                  {developerName}
                </strong>
              </div>

              <div>
                <span>
                  Developer ID
                </span>

                <strong>
                  {developerId}
                </strong>
              </div>

            </div>

          </section>


          {/* ===============================================
              PROJECT
          =============================================== */}

          <section className="review-panel-section">

            <span className="review-detail-label">
              PROJECT
            </span>

            <div className="review-panel-info">

              <div>
                <span>
                  Project
                </span>

                <strong>
                  {projectTitle}
                </strong>
              </div>

              <div>
                <span>
                  Assignment ID
                </span>

                <strong>
                  {assignmentId}
                </strong>
              </div>

            </div>

          </section>


          {/* ===============================================
              TIMELINE
          =============================================== */}

          <section className="review-panel-section">

            <span className="review-detail-label">
              ASSIGNMENT
            </span>

            <div className="review-panel-info">

              <div>
                <span>
                  Assigned
                </span>

                <strong>
                  {formatDate(
                    review.assigned_at
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Last Updated
                </span>

                <strong>
                  {formatDate(
                    review.updated_at
                  )}
                </strong>
              </div>

            </div>

          </section>


          {/* ===============================================
              SUBMITTED WORK
          =============================================== */}

          <section className="review-panel-section">

            <span className="review-detail-label">
              LATEST SUBMISSION
            </span>

            {!submission ? (
              <div className="review-no-submission">

                <h3>
                  No submission yet
                </h3>

                <p>
                  The developer has not
                  submitted their work.
                </p>

              </div>
            ) : (
              <div className="review-submission-content">

                {/* SUBMISSION META */}

                <div className="review-panel-info">

                  <div>
                    <span>
                      Submitted
                    </span>

                    <strong>
                      {formatDate(
                        submission.submitted_at
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Submission Status
                    </span>

                    <strong>
                      {formatStatus(
                        submission.status
                      )}
                    </strong>
                  </div>

                </div>


                {/* GITHUB */}

                <div className="review-submission-block">

                  <span className="review-detail-label">
                    GITHUB REPOSITORY
                  </span>

                  {submission.github_url ? (
                    <a
                      href={
                        submission.github_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="review-github-large"
                    >
                      <span>
                        {
                          submission.github_url
                        }
                      </span>

                      <ExternalLink
                        size={16}
                      />
                    </a>
                  ) : (
                    <span className="no-github">
                      No GitHub repository
                      submitted.
                    </span>
                  )}

                </div>


                {/* NOTES */}

                <div className="review-submission-block">

                  <span className="review-detail-label">
                    SUBMISSION NOTES
                  </span>

                  <div className="review-notes">
                    {submission.submission_notes ||
                      "No submission notes provided."}
                  </div>

                </div>


                {/* PREVIOUS REVIEW */}

                {submission.review_message && (
                  <div className="review-submission-block">

                    <span className="review-detail-label">
                      PREVIOUS REVIEW
                    </span>

                    <div className="review-notes">
                      {
                        submission.review_message
                      }
                    </div>

                  </div>
                )}

              </div>
            )}

          </section>


          {/* ===============================================
              STATUS MANAGEMENT
          =============================================== */}

          <section className="review-panel-section">

            <span className="review-detail-label">
              REVIEW ACTION
            </span>

            {!submission ? (
              <div className="review-no-submission">

                <h3>
                  Waiting for developer submission
                </h3>

                <p>
                  Status actions become available
                  after the developer submits their
                  work.
                </p>

              </div>
            ) : (
              <>

                <h3>
                  Review Latest Submission
                </h3>

                <p className="review-panel-description">
                  Select an action for the latest
                  submission. Previous submissions
                  remain preserved.
                </p>


                <div className="review-status-control">

                  <select
                    value={
                      selectedStatus
                    }
                    onChange={(event) =>
                      setSelectedStatus(
                        event.target.value
                      )
                    }
                    className="review-status-select"
                    disabled={
                      saving ||
                      !canReview
                    }
                  >

                    <option value="">
                      Select Review Action
                    </option>

                    {REVIEW_STATUSES.map(
                      (status) => (
                        <option
                          key={
                            status.value
                          }
                          value={
                            status.value
                          }
                        >
                          {
                            status.label
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>


                {/* ACTION DESCRIPTION */}

                {selectedStatus && (
                  <div className="review-panel-info">

                    <div>
                      <span>
                        Action
                      </span>

                      <strong>
                        {formatStatus(
                          selectedStatus
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Result
                      </span>

                      <strong>
                        {
                          actionDescription
                        }
                      </strong>
                    </div>

                  </div>
                )}


                {/* CHANGE REQUEST MESSAGE */}

                {selectedStatus ===
                  "changes_requested" && (
                  <div className="review-submission-block">

                    <span className="review-detail-label">
                      REQUIRED CHANGES
                    </span>

                    <textarea
                      value={
                        reviewMessage
                      }
                      onChange={(event) =>
                        setReviewMessage(
                          event.target.value
                        )
                      }
                      rows={5}
                      placeholder="Explain clearly what the developer needs to change before resubmitting..."
                      disabled={saving}
                      className="review-notes"
                    />

                  </div>
                )}


                {/* REVIEW BUTTON */}

                <button
                  type="button"
                  className="review-approve-btn"
                  onClick={
                    updateStatus
                  }
                  disabled={
                    saving ||
                    !selectedStatus ||
                    !canReview
                  }
                >

                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="spin"
                      />

                      Processing...
                    </>
                  ) : (
                    <>
                      {selectedStatus ===
                      "changes_requested" ? (
                        <AlertTriangle
                          size={16}
                        />
                      ) : selectedStatus ===
                        "approved" ? (
                        <CheckCircle2
                          size={16}
                        />
                      ) : (
                        <Save
                          size={16}
                        />
                      )}

                      {selectedStatus ===
                      "changes_requested"
                        ? "Request Changes"
                        : selectedStatus ===
                          "approved"
                          ? "Approve & Complete"
                          : selectedStatus ===
                            "rejected"
                            ? "Reject Submission"
                            : "Save Review"}
                    </>
                  )}

                </button>

              </>
            )}

          </section>


          {/* ===============================================
              ERROR
          =============================================== */}

          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}


          {/* ===============================================
              SUCCESS
          =============================================== */}

          {success && (
            <div className="admin-success">
              {success}
            </div>
          )}

        </div>

      </aside>
    </div>
  );
}


/* =========================================================
   SUCCESS MESSAGE
========================================================= */

function getSuccessMessage(
  status
) {
  switch (status) {
    case "under_review":
      return "Submission marked as under review.";

    case "changes_requested":
      return "Changes requested. The developer can now resubmit the project.";

    case "approved":
      return "Submission approved and project completed. The developer is available again.";

    case "rejected":
      return "Submission rejected and project workflow closed.";

    default:
      return "Review updated successfully.";
  }
}