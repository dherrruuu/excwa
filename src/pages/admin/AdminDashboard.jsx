import { useEffect, useState } from "react";

import {
  MessageSquareText,
  Clock3,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  Eye,
  BriefcaseBusiness,
  FileCheck2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "../../styles/admin/admin-dashboard.css";

import {
  getEnquiries,
} from "../../services/client/enquiryService";

import StatCard from "../../components/admin/StatCard";
import StatusBadge from "../../components/admin/StatusBadge";

import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  /* =========================================================
     ENQUIRIES
  ========================================================= */

  const [enquiries, setEnquiries] = useState([]);

  const [enquiriesLoading, setEnquiriesLoading] =
    useState(true);

  /* =========================================================
     DEVELOPER WORK
  ========================================================= */

  const [workReviews, setWorkReviews] = useState([]);

  const [workLoading, setWorkLoading] =
    useState(true);

  const [workError, setWorkError] =
    useState("");

  const navigate = useNavigate();

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    await Promise.all([
      loadEnquiries(),
      loadDeveloperWork(),
    ]);
  }

  /* =========================================================
     LOAD ENQUIRIES
  ========================================================= */

  async function loadEnquiries() {
    setEnquiriesLoading(true);

    try {
      const data = await getEnquiries();

      setEnquiries(data || []);
    } catch (error) {
      console.error(
        "Failed to load enquiries:",
        error
      );

      setEnquiries([]);
    } finally {
      setEnquiriesLoading(false);
    }
  }

  /* =========================================================
     LOAD DEVELOPER WORK
  ========================================================= */

  async function loadDeveloperWork() {
    setWorkLoading(true);
    setWorkError("");

    try {
      /* =====================================================
         1. GET ASSIGNMENTS
      ===================================================== */

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

      if (
        !assignments ||
        assignments.length === 0
      ) {
        setWorkReviews([]);
        return;
      }

      /* =====================================================
         2. COLLECT IDS
      ===================================================== */

      const opportunityIds = [
        ...new Set(
          assignments
            .map(
              (item) =>
                item.opportunity_id
            )
            .filter(Boolean)
        ),
      ];

      const developerIds = [
        ...new Set(
          assignments
            .map(
              (item) =>
                item.developer_id
            )
            .filter(Boolean)
        ),
      ];

      const assignmentIds =
        assignments
          .map((item) => item.id)
          .filter(Boolean);

      /* =====================================================
         3. LOAD RELATED DATA
      ===================================================== */

      const [
        opportunityResponse,
        developerResponse,
        submissionResponse,
      ] = await Promise.all([
        opportunityIds.length
          ? supabase
              .from("opportunities")
              .select(`
                id,
                title,
                category
              `)
              .in(
                "id",
                opportunityIds
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),

        developerIds.length
          ? supabase
              .from("developer_profiles")
              .select(`
                id,
                user_id,
                full_name
              `)
              .in(
                "id",
                developerIds
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),

        assignmentIds.length
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
              .in(
                "assignment_id",
                assignmentIds
              )
              .order(
                "submitted_at",
                {
                  ascending: false,
                }
              )
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

      /* =====================================================
         4. MAP DATA
      ===================================================== */

      const opportunityMap =
        new Map(
          (opportunityResponse.data || []).map(
            (item) => [
              item.id,
              item,
            ]
          )
        );

      const developerMap =
        new Map(
          (developerResponse.data || []).map(
            (item) => [
              item.id,
              item,
            ]
          )
        );

      /*
       * Multiple submissions can exist for one assignment.
       *
       * Since submissions are ordered newest first,
       * the first submission for each assignment is
       * the latest submission.
       */

      const latestSubmissionMap =
        new Map();

      for (
        const submission of
        submissionResponse.data || []
      ) {
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

      /* =====================================================
         5. BUILD DASHBOARD DATA
      ===================================================== */

      const formatted =
        assignments.map(
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

              projectTitle:
                opportunity?.title ||
                "Unknown Project",

              projectCategory:
                opportunity?.category ||
                "",

              developerName:
                developer?.full_name ||
                "Unknown Developer",

              submission,

              submissionStatus:
                submission?.status ||
                null,

              githubUrl:
                submission?.github_url ||
                "",

              submissionNotes:
                submission?.submission_notes ||
                "",

              submittedAt:
                submission?.submitted_at ||
                null,

              hasSubmission:
                Boolean(submission),
            };
          }
        );

      setWorkReviews(formatted);
    } catch (error) {
      console.error(
        "Failed to load developer work:",
        error
      );

      setWorkError(
        error?.message ||
          "Unable to load developer work."
      );

      setWorkReviews([]);
    } finally {
      setWorkLoading(false);
    }
  }

  /* =========================================================
     ENQUIRY COUNTS
  ========================================================= */

  const newCount =
    enquiries.filter(
      (x) => x.status === "new"
    ).length;

  const contactedCount =
    enquiries.filter(
      (x) => x.status === "contacted"
    ).length;

  const completedCount =
    enquiries.filter(
      (x) => x.status === "completed"
    ).length;

  /* =========================================================
     WORK COUNTS
  ========================================================= */

  const submittedWorkCount =
    workReviews.filter(
      (item) =>
        item.hasSubmission
    ).length;

  const pendingReviewCount =
    workReviews.filter(
      (item) => {
        const status =
          String(
            item.submissionStatus ||
              item.status ||
              ""
          ).toLowerCase();

        return (
          status === "submitted" ||
          status === "under_review"
        );
      }
    ).length;

  const completedWorkCount =
    workReviews.filter(
      (item) => {
        const status =
          String(
            item.submissionStatus ||
              item.status ||
              ""
          ).toLowerCase();

        return (
          status === "completed" ||
          status === "approved"
        );
      }
    ).length;

  /* =========================================================
     STATUS FORMAT
  ========================================================= */

  function formatStatus(status) {
    if (!status) {
      return "UNKNOWN";
    }

    return String(status)
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .toUpperCase();
  }

  function getWorkStatus(item) {
    return (
      item.submissionStatus ||
      item.status ||
      "unknown"
    );
  }

  function getWorkStatusClass(status) {
    const normalized =
      String(status || "")
        .toLowerCase()
        .replaceAll(" ", "_")
        .replaceAll("-", "_");

    return `admin-work-status status-${normalized}`;
  }

  /* =========================================================
     OPEN REVIEWS
  ========================================================= */

  function openReview(review) {
    /*
     * Navigate to the complete Work Reviews page.
     *
     * AdminReviews will handle opening the detail panel.
     */

    navigate("/admin/reviews", {
      state: {
        selectedAssignmentId:
          review.id,
      },
    });
  }

  /* =========================================================
     REFRESH
  ========================================================= */

  async function refreshDashboard() {
    await loadDashboard();
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="admin-dashboard">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="admin-page-heading">

        <div>
          <span className="eyebrow">
            <MessageSquareText size={13} />
            Overview
          </span>

          <h1>Dashboard</h1>

          <p>
            Monitor project enquiries,
            developer assignments and
            submitted work.
          </p>
        </div>

        <button
          type="button"
          className="admin-outline-button"
          onClick={refreshDashboard}
          disabled={
            enquiriesLoading ||
            workLoading
          }
        >
          <RefreshCw
            size={15}
            className={
              enquiriesLoading ||
              workLoading
                ? "spin"
                : ""
            }
          />

          Refresh
        </button>

      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

      <div className="admin-stats-grid">

        <StatCard
          label="Total Enquiries"
          value={enquiries.length}
          icon={MessageSquareText}
        />

        <StatCard
          label="New Enquiries"
          value={newCount}
          icon={Clock3}
          accent="cyan"
        />

        <StatCard
          label="Contacted"
          value={contactedCount}
          icon={PhoneCall}
          accent="violet"
        />

        <StatCard
          label="Completed Enquiries"
          value={completedCount}
          icon={CheckCircle2}
          accent="green"
        />

      </div>

      {/* =====================================================
          DEVELOPER WORK STATS
      ===================================================== */}

      <div className="admin-stats-grid">

        <StatCard
          label="Developer Assignments"
          value={workReviews.length}
          icon={BriefcaseBusiness}
        />

        <StatCard
          label="Submitted Work"
          value={submittedWorkCount}
          icon={FileCheck2}
          accent="cyan"
        />

        <StatCard
          label="Pending Reviews"
          value={pendingReviewCount}
          icon={Clock3}
          accent="violet"
        />

        <StatCard
          label="Completed Work"
          value={completedWorkCount}
          icon={CheckCircle2}
          accent="green"
        />

      </div>

      {/* =====================================================
          DEVELOPER WORK REVIEW PANEL
      ===================================================== */}

      <section className="admin-panel">

        <div className="admin-panel-header">

          <div>
            <h2>
              Developer Work Reviews
            </h2>

            <p>
              Review work submitted by
              developers.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/reviews"
              )
            }
            className="admin-outline-button"
          >
            View All

            <ArrowRight size={15} />
          </button>

        </div>

        {workLoading ? (

          <div className="admin-empty">

            <RefreshCw
              size={20}
              className="spin"
            />

            Loading developer work...

          </div>

        ) : workError ? (

          <div className="admin-empty">

            <AlertCircle
              size={20}
            />

            <span>
              {workError}
            </span>

          </div>

        ) : workReviews.length === 0 ? (

          <div className="admin-empty">

            <BriefcaseBusiness
              size={24}
            />

            <span>
              No developer assignments
              found yet.
            </span>

          </div>

        ) : (

          <div className="admin-table-wrap">

            <table className="admin-table">

              <thead>

                <tr>
                  <th>Project</th>
                  <th>Developer</th>
                  <th>Submitted Work</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody>

                {workReviews
                  .slice(0, 8)
                  .map((item) => {

                    const status =
                      getWorkStatus(
                        item
                      );

                    return (
                      <tr
                        key={item.id}
                      >

                        {/* PROJECT */}

                        <td>

                          <strong>
                            {
                              item.projectTitle
                            }
                          </strong>

                          {item.projectCategory && (
                            <small>
                              {
                                item.projectCategory
                              }
                            </small>
                          )}

                        </td>

                        {/* DEVELOPER */}

                        <td>

                          <strong>
                            {
                              item.developerName
                            }
                          </strong>

                          <small>
                            ID:{" "}
                            {item.developer_id
                              ? item.developer_id.slice(
                                  0,
                                  8
                                )
                              : "—"}
                          </small>

                        </td>

                        {/* SUBMISSION */}

                        <td>

                          {item.hasSubmission ? (

                            <div className="admin-submission-info">

                              <span className="admin-submission-submitted">

                                <CheckCircle2
                                  size={15}
                                />

                                Submitted

                              </span>

                              {item.githubUrl && (
                                <a
                                  href={
                                    item.githubUrl
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) =>
                                    event.stopPropagation()
                                  }
                                >
                                  View Repository
                                </a>
                              )}

                            </div>

                          ) : (

                            <span className="admin-submission-pending">

                              <Clock3
                                size={14}
                              />

                              No submission yet

                            </span>

                          )}

                        </td>

                        {/* STATUS */}

                        <td>

                          <span
                            className={getWorkStatusClass(
                              status
                            )}
                          >
                            {formatStatus(
                              status
                            )}
                          </span>

                        </td>

                        {/* UPDATED */}

                        <td>

                          {item.updated_at
                            ? new Date(
                                item.updated_at
                              ).toLocaleString(
                                "en-IN"
                              )
                            : "—"}

                        </td>

                        {/* ACTION */}

                        <td>

                          <button
                            type="button"
                            className="admin-outline-button admin-review-button"
                            onClick={() =>
                              openReview(
                                item
                              )
                            }
                          >

                            <Eye
                              size={15}
                            />

                            Review

                          </button>

                        </td>

                      </tr>
                    );
                  })}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {/* =====================================================
          RECENT ENQUIRIES
      ===================================================== */}

      <section className="admin-panel">

        <div className="admin-panel-header">

          <div>
            <h2>
              Recent Enquiries
            </h2>

            <p>
              Latest project requests
              received.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/enquiries"
              )
            }
            className="admin-outline-button"
          >
            View All

            <ArrowRight
              size={15}
            />
          </button>

        </div>

        {enquiriesLoading ? (

          <div className="admin-empty">
            Loading enquiries...
          </div>

        ) : enquiries.length === 0 ? (

          <div className="admin-empty">
            No enquiries received yet.
          </div>

        ) : (

          <div className="admin-table-wrap">

            <table className="admin-table">

              <thead>

                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>

              </thead>

              <tbody>

                {enquiries
                  .slice(0, 8)
                  .map((item) => (

                    <tr
                      key={item.id}
                    >

                      <td>

                        <strong>
                          {
                            item.customer_name
                          }
                        </strong>

                        <small>
                          {item.email}
                        </small>

                      </td>

                      <td>
                        {item.service}
                      </td>

                      <td>
                        {item.phone}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            item.status
                          }
                        />
                      </td>

                      <td>

                        {item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleDateString()
                          : "—"}

                      </td>

                    </tr>

                  ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}