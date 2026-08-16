import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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

      if (assignmentError) throw assignmentError;

      if (!assignments?.length) {
        setReviews([]);
        return;
      }

      const opportunityIds = [
        ...new Set(assignments.map((item) => item.opportunity_id)),
      ];

      const developerIds = [
        ...new Set(assignments.map((item) => item.developer_id)),
      ];

      const assignmentIds = assignments.map((item) => item.id);

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

      if (opportunityError) throw opportunityError;
      if (developerError) throw developerError;
      if (submissionError) throw submissionError;

      const opportunityMap = Object.fromEntries(
        (opportunities || []).map((item) => [item.id, item])
      );

      const developerMap = Object.fromEntries(
        (developers || []).map((item) => [item.id, item])
      );

      const submissionMap = Object.fromEntries(
        (submissions || []).map((item) => [item.assignment_id, item])
      );

      const formatted = assignments.map((assignment) => {
        const opportunity = opportunityMap[assignment.opportunity_id];
        const developer = developerMap[assignment.developer_id];
        const submission = submissionMap[assignment.id];

        return {
          ...assignment,
          projectTitle: opportunity?.title || "Unknown Project",
          developerName: developer?.full_name || "Unknown Developer",
          githubUrl: submission?.github_url || "",
          submissionStatus: submission?.status || "",
          submissionNotes: submission?.submission_notes || "",
        };
      });

      setReviews(formatted);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  const filteredReviews = reviews.filter((review) => {
    const query = search.toLowerCase();

    return (
      review.projectTitle.toLowerCase().includes(query) ||
      review.developerName.toLowerCase().includes(query) ||
      review.id.toLowerCase().includes(query) ||
      review.developer_id?.toLowerCase().includes(query)
    );
  });

  function getStatusClass(status) {
    return `review-status status-${status
      ?.toLowerCase()
      .replaceAll("_", "-")}`;
  }

  return (
    <div className="admin-reviews-page">

      {/* HEADER */}
      <div className="admin-page-header">
        <div>
          <h1>Work Reviews</h1>
          <p>
            Review submitted projects and manage assignment progress.
          </p>
        </div>

        <button
          className="admin-refresh-btn"
          onClick={fetchReviews}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* SEARCH */}
      <div className="admin-review-toolbar">
        <div className="admin-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search project, developer or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="review-count">
          {filteredReviews.length} project
          {filteredReviews.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="admin-empty-state">
          Loading work reviews...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="admin-empty-state">
          <h3>No projects to review</h3>
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
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredReviews.map((review) => (

                <tr key={review.id}>

                  {/* PROJECT ID */}
                  <td>
                    <div className="review-id">
                      {review.id.slice(0, 8)}
                    </div>
                  </td>

                  {/* DEVELOPER ID */}
                  <td>
                    <div className="review-id">
                      {review.developer_id?.slice(0, 8)}
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
                        href={review.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="github-link"
                      >
                        <span>
                          {review.githubUrl.replace(
                            "https://github.com/",
                            ""
                          )}
                        </span>

                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="no-github">
                        Not submitted
                      </span>
                    )}
                  </td>

                  {/* STATUS */}
                  <td>
                    <span className={getStatusClass(review.status)}>
                      {review.status?.replaceAll("_", " ") || "UNKNOWN"}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td>
                    <button
                      className="review-action-btn"
                      onClick={() =>
                        window.location.href =
                          `/admin/reviews/${review.id}`
                      }
                    >
                      Review
                    </button>
                  </td>

                </tr>

              ))}
            </tbody>

          </table>

        </div>
      )}

    </div>
  );
}