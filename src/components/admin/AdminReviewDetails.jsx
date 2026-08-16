import { useEffect, useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  Save,
  X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "../../styles/admin/admin-review-detail.css";

export default function AdminReviewDetails({
  review,
  onClose,
  onStatusUpdated,
}) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * ============================================================
   * SYNC WHEN DIFFERENT REVIEW IS OPENED
   * ============================================================
   */

  useEffect(() => {
    if (!review) {
      return;
    }

    setSelectedStatus(review.status || "");
    setError("");
    setSuccess("");
  }, [review]);

  if (!review) {
    return null;
  }

  /*
   * ============================================================
   * DATA
   * ============================================================
   *
   * AdminReviews passes the project_assignments row directly.
   *
   * Therefore:
   *
   * review.id = project_assignments.id
   */

  const assignmentId = review.id;

  const projectTitle =
    review.projectTitle || "Unknown Project";

  const developerName =
    review.developerName || "Unknown Developer";

  const developerId =
    review.developer_id || "—";

  const currentStatus =
    review.status || "unknown";

  const submission =
    review.submission || null;

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  function formatStatus(status) {
    if (!status) {
      return "Unknown";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function getStatusClass(status) {
    if (!status) {
      return "review-status";
    }

    return `review-status status-${status
      .toLowerCase()
      .replaceAll("_", "-")}`;
  }

  /*
   * ============================================================
   * UPDATE STATUS
   * ============================================================
   */

  async function updateStatus() {
    /*
     * ----------------------------------------------------------
     * VALIDATION
     * ----------------------------------------------------------
     */

    if (!assignmentId) {
      setError(
        "Assignment ID is missing."
      );

      console.error(
        "Missing assignment ID:",
        review
      );

      return;
    }

    if (!selectedStatus) {
      setError(
        "Please select a status."
      );

      return;
    }

    if (
      selectedStatus === currentStatus
    ) {
      setError(
        "Please select a different status."
      );

      return;
    }

    /*
     * Make absolutely sure this is a UUID.
     */

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(assignmentId)) {
      setError(
        "Invalid assignment ID."
      );

      console.error(
        "Invalid assignment ID:",
        assignmentId
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      /*
       * ========================================================
       * STEP 1
       * CHECK CURRENT AUTH SESSION
       * ========================================================
       */

      const {
        data: {
          session,
        },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user?.id) {
        throw new Error(
          "You are not authenticated. Please log in again."
        );
      }

      console.log(
        "Authenticated admin:",
        session.user.id
      );

      /*
       * ========================================================
       * STEP 2
       * CHECK ADMIN PROFILE
       * ========================================================
       *
       * Your RLS policy requires:
       *
       * profiles.id = auth.uid()
       * profiles.role = 'admin'
       */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error(
          "Your user profile was not found."
        );
      }

      if (profile.role !== "admin") {
        throw new Error(
          `Admin access required. Current role: ${profile.role}`
        );
      }

      console.log(
        "Admin profile verified:",
        profile
      );

      /*
       * ========================================================
       * STEP 3
       * UPDATE PROJECT ASSIGNMENT
       * ========================================================
       */

      const updatedAt =
        new Date().toISOString();

      console.log(
        "Updating assignment:",
        assignmentId
      );

      console.log(
        "New status:",
        selectedStatus
      );

      const {
        error: updateError,
      } = await supabase
        .from("project_assignments")
        .update({
          status: selectedStatus,
          updated_at: updatedAt,
        })
        .eq("id", assignmentId);

      /*
       * IMPORTANT:
       *
       * Supabase may return no rows from UPDATE.
       * That does NOT automatically mean the update failed.
       */

      if (updateError) {
        console.error(
          "Supabase UPDATE error:",
          updateError
        );

        throw updateError;
      }

      /*
       * ========================================================
       * STEP 4
       * VERIFY THE DATABASE
       * ========================================================
       */

      const {
        data: verifiedAssignment,
        error: verifyError,
      } = await supabase
        .from("project_assignments")
        .select(`
          id,
          opportunity_id,
          developer_id,
          status,
          assigned_at,
          updated_at
        `)
        .eq("id", assignmentId)
        .maybeSingle();

      if (verifyError) {
        console.error(
          "Verification error:",
          verifyError
        );

        throw verifyError;
      }

      /*
       * If the row cannot be read, RLS is preventing
       * the authenticated admin from seeing it.
       */

      if (!verifiedAssignment) {
        throw new Error(
          "The assignment could not be verified after the update. Check the project_assignments SELECT RLS policy."
        );
      }

      console.log(
        "Verified assignment:",
        verifiedAssignment
      );

      /*
       * ========================================================
       * STEP 5
       * VERIFY STATUS
       * ========================================================
       */

      if (
        verifiedAssignment.status !==
        selectedStatus
      ) {
        throw new Error(
          `Status update failed. Database returned "${verifiedAssignment.status}" instead of "${selectedStatus}".`
        );
      }

      /*
       * ========================================================
       * STEP 6
       * UPDATE LOCAL TABLE
       * ========================================================
       */

      const updatedReview = {
        ...review,

        id: verifiedAssignment.id,

        opportunity_id:
          verifiedAssignment.opportunity_id,

        developer_id:
          verifiedAssignment.developer_id,

        status:
          verifiedAssignment.status,

        assigned_at:
          verifiedAssignment.assigned_at,

        updated_at:
          verifiedAssignment.updated_at,
      };

      /*
       * Update parent AdminReviews.jsx
       */

      if (onStatusUpdated) {
        onStatusUpdated(
          updatedReview
        );
      }

      /*
       * Update dropdown
       */

      setSelectedStatus(
        verifiedAssignment.status
      );

      /*
       * Success
       */

      setSuccess(
        "Status updated successfully."
      );

      /*
       * Remove success after a few seconds
       */

      setTimeout(() => {
        setSuccess("");
      }, 3000);

    } catch (err) {
      console.error(
        "STATUS UPDATE FAILED:",
        err
      );

      let message =
        err?.message ||
        "Failed to update status.";

      /*
       * Friendly RLS message
       */

      if (
        message
          .toLowerCase()
          .includes("row-level security")
      ) {
        message =
          "Permission denied by Supabase RLS. Make sure the logged-in user has role = admin in profiles.";
      }

      setError(message);

    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

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

        {/* ====================================================
            HEADER
            ==================================================== */}

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


        {/* ====================================================
            CONTENT
            ==================================================== */}

        <div className="admin-review-drawer-content">

          {/* ==================================================
              CURRENT STATUS
              ================================================== */}

          <div className="review-panel-status-row">

            <span>
              Current Status
            </span>

            <span
              className={getStatusClass(
                currentStatus
              )}
            >
              {formatStatus(
                currentStatus
              )}
            </span>

          </div>


          {/* ==================================================
              DEVELOPER
              ================================================== */}

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


          {/* ==================================================
              PROJECT
              ================================================== */}

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


          {/* ==================================================
              ASSIGNMENT
              ================================================== */}

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
                  {review.assigned_at
                    ? new Date(
                        review.assigned_at
                      ).toLocaleString()
                    : "—"}
                </strong>

              </div>

              <div>

                <span>
                  Last Updated
                </span>

                <strong>
                  {review.updated_at
                    ? new Date(
                        review.updated_at
                      ).toLocaleString()
                    : "—"}
                </strong>

              </div>

            </div>

          </section>


          {/* ==================================================
              SUBMITTED WORK
              ================================================== */}

          <section className="review-panel-section">

            <span className="review-detail-label">
              SUBMITTED WORK
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

              </div>

            )}

          </section>


          {/* ==================================================
              STATUS MANAGEMENT
              ================================================== */}

          <section className="review-panel-section">

            <span className="review-detail-label">
              STATUS MANAGEMENT
            </span>

            <h3>
              Update Work Status
            </h3>

            <p className="review-panel-description">
              Change the assignment status after
              reviewing the developer's submitted work.
            </p>


            <div className="review-status-control">

              <select
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(
                    event.target.value
                  )
                }
                className="review-status-select"
                disabled={saving}
              >

                <option value="">
                  Select Status
                </option>

                <option value="assigned">
                  Assigned
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="submitted">
                  Submitted
                </option>

                <option value="under_review">
                  Under Review
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="rejected">
                  Rejected
                </option>

                <option value="completed">
                  Completed
                </option>

              </select>


              <button
                type="button"
                className="review-approve-btn"
                onClick={updateStatus}
                disabled={
                  saving ||
                  !selectedStatus ||
                  selectedStatus ===
                    currentStatus
                }
              >

                {saving ? (

                  <>
                    <RefreshCw
                      size={16}
                      className="spin"
                    />

                    Saving...
                  </>

                ) : (

                  <>
                    <Save size={16} />

                    Save Status
                  </>

                )}

              </button>

            </div>

          </section>


          {/* ==================================================
              ERROR
              ================================================== */}

          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}


          {/* ==================================================
              SUCCESS
              ================================================== */}

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