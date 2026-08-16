import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import AdminReviewDetails from "../../components/admin/AdminReviewDetails";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    setLoading(true);
    setError("");

    try {
      const { data: assignments, error: assignmentError } =
        await supabase
          .from("project_assignments")
          .select(`
            id,
            opportunity_id,
            developer_id,
            status,
            assigned_at,
            updated_at
          `)
          .order("updated_at", { ascending: false });

      if (assignmentError) {
        throw assignmentError;
      }

      if (!assignments || assignments.length === 0) {
        setReviews([]);
        return;
      }

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

      const assignmentIds = assignments.map(
        (item) => item.id
      );

      const [
        { data: opportunities, error: opportunityError },
        { data: developers, error: developerError },
        { data: submissions, error: submissionError },
      ] = await Promise.all([
        supabase
          .from("opportunities")
          .select("id, title")
          .in("id", opportunityIds),

        supabase
          .from("developer_profiles")
          .select("id, user_id, full_name")
          .in("id", developerIds),

        supabase
          .from("project_submissions")
          .select(`
            id,
            assignment_id,
            developer_id,
            github_url,
            submission_notes,
            status
          `)
          .in("assignment_id", assignmentIds),
      ]);

      if (opportunityError) {
        throw opportunityError;
      }

      if (developerError) {
        throw developerError;
      }

      if (submissionError) {
        throw submissionError;
      }

      const opportunityMap = Object.fromEntries(
        (opportunities || []).map((item) => [
          item.id,
          item,
        ])
      );

      const developerMap = Object.fromEntries(
        (developers || []).map((item) => [
          item.id,
          item,
        ])
      );

      const submissionMap = Object.fromEntries(
        (submissions || []).map((item) => [
          item.assignment_id,
          item,
        ])
      );

      const formattedReviews = assignments.map(
        (assignment) => {
          const opportunity =
            opportunityMap[
              assignment.opportunity_id
            ];

          const developer =
            developerMap[
              assignment.developer_id
            ];

          const submission =
            submissionMap[assignment.id];

          return {
            ...assignment,

            projectTitle:
              opportunity?.title ||
              "Unknown Project",

            developerName:
              developer?.full_name ||
              "Unknown Developer",

            githubUrl:
              submission?.github_url || "",

            submissionStatus:
              submission?.status || "",

            submissionNotes:
              submission?.submission_notes || "",

            submission:
              submission || null,
          };
        }
      );

      setReviews(formattedReviews);

      /*
       * Keep the currently opened detail panel
       * synchronized after refreshing the table.
       */
      setSelectedReview((current) => {
        if (!current) {
          return null;
        }

        const updated =
          formattedReviews.find(
            (item) => item.id === current.id
          );

        return updated || null;
      });
    } catch (err) {
      console.error(
        "Failed to load reviews:",
        err
      );

      setError(
        err.message ||
          "Failed to load reviews."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredReviews = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    if (!query) {
      return reviews;
    }

    return reviews.filter((review) => {
      return (
        review.projectTitle
          ?.toLowerCase()
          .includes(query) ||

        review.developerName
          ?.toLowerCase()
          .includes(query) ||

        review.id
          ?.toLowerCase()
          .includes(query) ||

        review.developer_id
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [reviews, search]);

  function getStatusClass(status) {
    if (!status) {
      return "review-status";
    }

    return `review-status status-${status
      .toLowerCase()
      .replaceAll("_", "-")}`;
  }

  function formatStatus(status) {
    if (!status) {
      return "UNKNOWN";
    }

    return status
      .replaceAll("_", " ")
      .toUpperCase();
  }

  function handleReviewClick(review) {
    setSelectedReview(review);
  }

  function handleCloseReview() {
    setSelectedReview(null);
  }

  function handleStatusUpdated(updatedReview) {
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
      previous
        ? {
            ...previous,
            ...updatedReview,
          }
        : null
    );
  }

  return (
    <div className="admin-reviews-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="admin-page-header">

        <div>
          <h1>Work Reviews</h1>

          <p>
            Review submitted projects and manage
            assignment progress.
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

          Refresh
        </button>

      </div>


      {/* =====================================================
          SEARCH
          ===================================================== */}

      <div className="admin-review-toolbar">

        <div className="admin-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search project, developer or ID..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

        <div className="review-count">
          {filteredReviews.length} project
          {filteredReviews.length !== 1
            ? "s"
            : ""}
        </div>

      </div>


      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}


      {/* =====================================================
          CONTENT
          ===================================================== */}

      {loading ? (

        <div className="admin-empty-state">
          Loading work reviews...
        </div>

      ) : filteredReviews.length === 0 ? (

        <div className="admin-empty-state">

          <h3>
            No projects to review
          </h3>

          <p>
            Submitted assignments will appear here.
          </p>

        </div>

      ) : (

        <div className="admin-review-table-wrap">

          <table className="admin-review-table">

            <thead>
              <tr>
                <th>Project ID</th>
                <th>Developer ID</th>
                <th>Developer</th>
                <th>GitHub Repository</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredReviews.map(
                (review) => (

                  <tr
                    key={review.id}
                    className="clickable-row"
                    onClick={() =>
                      handleReviewClick(
                        review
                      )
                    }
                  >

                    {/* PROJECT ID */}

                    <td>
                      <div className="review-id">
                        {review.id?.slice(
                          0,
                          8
                        ) || "—"}
                      </div>
                    </td>


                    {/* DEVELOPER ID */}

                    <td>
                      <div className="review-id">
                        {review.developer_id?.slice(
                          0,
                          8
                        ) || "—"}
                      </div>
                    </td>


                    {/* DEVELOPER */}

                    <td>
                      <div className="review-developer">

                        <strong>
                          {review.developerName}
                        </strong>

                        <span>
                          {review.projectTitle}
                        </span>

                      </div>
                    </td>


                    {/* GITHUB */}

                    <td>

                      {review.githubUrl ? (

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
                            {review.githubUrl.replace(
                              "https://github.com/",
                              ""
                            )}
                          </span>

                          <ExternalLink
                            size={14}
                          />

                        </a>

                      ) : (

                        <span className="no-github">
                          Not submitted
                        </span>

                      )}

                    </td>


                    {/* STATUS */}

                    <td>

                      <span
                        className={getStatusClass(
                          review.status
                        )}
                      >
                        {formatStatus(
                          review.status
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
                        Review
                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}


      {/* =====================================================
          REVIEW DETAIL MINI PANEL
          ===================================================== */}

      {selectedReview && (
        <AdminReviewDetails
          review={selectedReview}
          onClose={handleCloseReview}
          onStatusUpdated={
            handleStatusUpdated
          }
        />
      )}

    </div>
  );
}
