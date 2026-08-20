import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import {
  ExternalLink,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import AdminReviewDetails from "../../components/admin/AdminReviewDetails";

import "../../styles/admin/admin-review-detail.css";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selectedReview, setSelectedReview] = useState(null);

  /* ============================================================
     LOAD REVIEWS
  ============================================================ */

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      /* ========================================================
         1. LOAD ASSIGNMENTS
      ======================================================== */

      const {
        data: assignments,
        error: assignmentError,
      } = await supabase
        .from("project_assignments")
        .select(`
          id,
          opportunity_id,
          developer_id,
          status,
          assigned_at,
          started_at,
          completed_at,
          updated_at
        `)
        .order("updated_at", {
          ascending: false,
        });

      if (assignmentError) {
        throw assignmentError;
      }

      if (!assignments || assignments.length === 0) {
        setReviews([]);
        return;
      }

      /* ========================================================
         2. COLLECT IDS
      ======================================================== */

      const opportunityIds = [
        ...new Set(
          assignments
            .map((item) => item.opportunity_id)
            .filter(Boolean)
        ),
      ];

      const developerIds = [
        ...new Set(
          assignments
            .map((item) => item.developer_id)
            .filter(Boolean)
        ),
      ];

      const assignmentIds = assignments
        .map((item) => item.id)
        .filter(Boolean);

      /* ========================================================
         3. LOAD RELATED DATA

         IMPORTANT:

         project_submissions.assignment_id
         is used to connect the submission to the assignment.

         We do NOT rely on developer_id for this relationship.
      ======================================================== */

      const [
        opportunityResponse,
        developerResponse,
        submissionResponse,
      ] = await Promise.all([
        /* OPPORTUNITIES */

        opportunityIds.length > 0
          ? supabase
              .from("opportunities")
              .select(`
                id,
                title,
                description,
                category,
                project_type,
                status,
                deadline,
                budget,
                freelancer_payout
              `)
              .in("id", opportunityIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        /* DEVELOPERS */

        developerIds.length > 0
          ? supabase
              .from("developer_profiles")
              .select(`
                id,
                user_id,
                full_name
              `)
              .in("id", developerIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        /* SUBMISSIONS */

        assignmentIds.length > 0
          ? supabase
              .from("project_submissions")
              .select(`
                id,
                assignment_id,
                developer_id,
                github_url,
                submission_notes,
                status,
                submitted_at,
                review_message,
                reviewed_at,
                reviewed_by
              `)
              .in("assignment_id", assignmentIds)
              .order("submitted_at", {
                ascending: false,
              })
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

      if (opportunityResponse.error) {
        throw opportunityResponse.error;
      }

      if (developerResponse.error) {
        throw developerResponse.error;
      }

      if (submissionResponse.error) {
        throw submissionResponse.error;
      }

      const opportunities =
        opportunityResponse.data || [];

      const developers =
        developerResponse.data || [];

      const submissions =
        submissionResponse.data || [];

      /* ========================================================
         4. CREATE LOOKUP MAPS
      ======================================================== */

      const opportunityMap = new Map(
        opportunities.map((item) => [
          item.id,
          item,
        ])
      );

      const developerMap = new Map(
        developers.map((item) => [
          item.id,
          item,
        ])
      );

      /* ========================================================
         5. FIND LATEST SUBMISSION

         Multiple submissions are allowed.

         Example:

         Submission #1 → changes_requested
         Submission #2 → submitted

         We display #2 because it is newest.
      ======================================================== */

      const latestSubmissionMap = new Map();

      for (const submission of submissions) {
        if (
          !latestSubmissionMap.has(
            submission.assignment_id
          )
        ) {
          latestSubmissionMap.set(
            submission.assignment_id,
            submission
          );
        }
      }

      /* ========================================================
         6. FORMAT ADMIN DATA
      ======================================================== */

      const formattedReviews = assignments.map(
        (assignment) => {
          const opportunity =
            opportunityMap.get(
              assignment.opportunity_id
            );

          const developer =
            developerMap.get(
              assignment.developer_id
            );

          const submission =
            latestSubmissionMap.get(
              assignment.id
            ) || null;

          return {
            ...assignment,

            /* PROJECT */

            projectTitle:
              opportunity?.title ||
              "Unknown Project",

            projectDescription:
              opportunity?.description ||
              "",

            projectCategory:
              opportunity?.category ||
              "",

            projectType:
              opportunity?.project_type ||
              "",

            opportunityStatus:
              opportunity?.status ||
              "",

            projectDeadline:
              opportunity?.deadline ||
              null,

            projectBudget:
              opportunity?.budget ||
              null,

            freelancerPayout:
              opportunity?.freelancer_payout ||
              null,

            /* DEVELOPER */

            developerName:
              developer?.full_name ||
              "Unknown Developer",

            developerUserId:
              developer?.user_id ||
              null,

            /* SUBMISSION */

            submission,

            submissionId:
              submission?.id ||
              null,

            githubUrl:
              submission?.github_url ||
              "",

            submissionNotes:
              submission?.submission_notes ||
              "",

            submissionStatus:
              submission?.status ||
              null,

            submittedAt:
              submission?.submitted_at ||
              null,

            reviewMessage:
              submission?.review_message ||
              "",

            reviewedAt:
              submission?.reviewed_at ||
              null,

            reviewedBy:
              submission?.reviewed_by ||
              null,

            hasSubmission:
              Boolean(submission),
          };
        }
      );

      setReviews(formattedReviews);

      /* ========================================================
         KEEP OPEN REVIEW UPDATED
      ======================================================== */

      setSelectedReview((current) => {
        if (!current) {
          return null;
        }

        return (
          formattedReviews.find(
            (item) =>
              item.id === current.id
          ) || null
        );
      });
    } catch (err) {
      console.error(
        "Failed to load work reviews:",
        err
      );

      setError(
        err?.message ||
          "Failed to load work reviews."
      );

      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* ============================================================
     SEARCH
  ============================================================ */

  const filteredReviews = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    if (!query) {
      return reviews;
    }

    return reviews.filter((review) => {
      return [
        review.projectTitle,
        review.developerName,
        review.id,
        review.developer_id,
        review.opportunity_id,
        review.submissionId,
        review.githubUrl,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [reviews, search]);

  /* ============================================================
     STATUS HELPERS
  ============================================================ */

  function normalizeStatus(status) {
    return String(status || "")
      .trim()
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("-", "_");
  }

  function formatStatus(status) {
    if (!status) {
      return "UNKNOWN";
    }

    return String(status)
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .toUpperCase();
  }

  function getStatusClass(status) {
    const normalized =
      normalizeStatus(status);

    return `review-status status-${
      normalized || "unknown"
    }`;
  }

  function getSubmissionStatus(review) {
    /*
     * Submission status takes priority.
     *
     * Example:
     *
     * assignment = submitted
     * submission = submitted
     *
     * assignment = changes_requested
     * submission = changes_requested
     */

    if (review.submissionStatus) {
      return review.submissionStatus;
    }

    return review.status;
  }

  /* ============================================================
     DATE
  ============================================================ */

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  /* ============================================================
     GITHUB LABEL
  ============================================================ */

  function getGithubLabel(url) {
    if (!url) {
      return "";
    }

    return url
      .replace(
        /^https?:\/\/(www\.)?github\.com\//i,
        ""
      )
      .replace(/\/$/, "");
  }

  /* ============================================================
     OPEN REVIEW
  ============================================================ */

  function handleReviewClick(review) {
    setSelectedReview(review);
  }

  function handleCloseReview() {
    setSelectedReview(null);
  }

  /* ============================================================
     STATUS UPDATED
  ============================================================ */

  function handleStatusUpdated(updatedReview) {
    if (!updatedReview?.id) {
      return;
    }

    setReviews((previous) =>
      previous.map((item) =>
        item.id === updatedReview.id
          ? {
              ...item,
              ...updatedReview,
            }
          : item
      )
    );

    setSelectedReview((previous) =>
      previous &&
      previous.id === updatedReview.id
        ? {
            ...previous,
            ...updatedReview,
          }
        : previous
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="admin-reviews-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="admin-page-header">

        <div>
          <h1>Work Reviews</h1>

          <p>
            Review developer submissions and
            manage project assignment status.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-btn"
          onClick={fetchReviews}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading ? "spin" : ""
            }
          />

          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>

      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div className="admin-review-toolbar">

        <div className="admin-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search project, developer, assignment or ID..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>

        <div className="review-count">
          {filteredReviews.length} assignment
          {filteredReviews.length !== 1
            ? "s"
            : ""}
        </div>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="admin-error">

          <AlertCircle size={18} />

          <span>{error}</span>

        </div>
      )}

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading ? (

        <div className="admin-empty-state">

          <RefreshCw
            size={24}
            className="spin"
          />

          <h3>
            Loading work reviews...
          </h3>

          <p>
            Fetching assignments and
            developer submissions.
          </p>

        </div>

      ) : filteredReviews.length === 0 ? (

        <div className="admin-empty-state">

          <Clock3 size={28} />

          <h3>
            No work reviews found
          </h3>

          <p>
            Developer assignments and
            submitted work will appear here.
          </p>

        </div>

      ) : (

        <div className="admin-review-table-wrap">

          <table className="admin-review-table">

            <thead>

              <tr>
                <th>Project</th>
                <th>Developer</th>
                <th>Assignment ID</th>
                <th>Submitted Work</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>

            </thead>

            <tbody>

              {filteredReviews.map(
                (review) => {

                  const displayStatus =
                    getSubmissionStatus(
                      review
                    );

                  return (
                    <tr
                      key={review.id}
                      className="clickable-row"
                      onClick={() =>
                        handleReviewClick(
                          review
                        )
                      }
                    >

                      {/* PROJECT */}

                      <td>

                        <div className="review-project">

                          <strong>
                            {review.projectTitle}
                          </strong>

                          {review.projectCategory && (
                            <span>
                              {
                                review.projectCategory
                              }
                            </span>
                          )}

                        </div>

                      </td>

                      {/* DEVELOPER */}

                      <td>

                        <div className="review-developer">

                          <strong>
                            {review.developerName}
                          </strong>

                          <span>
                            ID:{" "}
                            {review.developer_id
                              ? review.developer_id.slice(
                                  0,
                                  8
                                )
                              : "—"}
                          </span>

                        </div>

                      </td>

                      {/* ASSIGNMENT */}

                      <td>

                        <div className="review-id">

                          {review.id
                            ? review.id.slice(
                                0,
                                8
                              )
                            : "—"}

                        </div>

                      </td>

                      {/* SUBMISSION */}

                      <td>

                        {review.hasSubmission ? (

                          <div className="review-submission-cell">

                            <div className="submission-ready">

                              <CheckCircle2
                                size={16}
                              />

                              <span>
                                Submitted
                              </span>

                            </div>

                            {review.githubUrl && (
                              <a
                                href={
                                  review.githubUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="github-link"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                              >

                                <span>
                                  {getGithubLabel(
                                    review.githubUrl
                                  )}
                                </span>

                                <ExternalLink
                                  size={13}
                                />

                              </a>
                            )}

                          </div>

                        ) : (

                          <div className="submission-missing">

                            <Clock3
                              size={15}
                            />

                            <span>
                              No submission
                            </span>

                          </div>

                        )}

                      </td>

                      {/* STATUS */}

                      <td>

                        <span
                          className={getStatusClass(
                            displayStatus
                          )}
                        >
                          {formatStatus(
                            displayStatus
                          )}
                        </span>

                      </td>

                      {/* UPDATED */}

                      <td>

                        <span className="review-date">
                          {formatDate(
                            review.updated_at
                          )}
                        </span>

                      </td>

                      {/* ACTION */}

                      <td>

                        <button
                          type="button"
                          className="review-action-btn"
                          onClick={(event) => {
                            event.stopPropagation();

                            handleReviewClick(
                              review
                            );
                          }}
                        >

                          <Eye size={15} />

                          Review

                        </button>

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

      )}

      {/* ======================================================
          REVIEW DETAILS
      ====================================================== */}

      {selectedReview && (
        <AdminReviewDetails
          review={selectedReview}
          onClose={
            handleCloseReview
          }
          onStatusUpdated={
            handleStatusUpdated
          }
        />
      )}

    </div>
  );
}