import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Briefcase,
  Calendar,
  Clock,
  RefreshCw,
  Send,
  AlertCircle,
  Check,
} from "lucide-react";

import "../../styles/developer/opportunities.css";
import "../../styles/developer/components.css";

import {
  getOpenOpportunities,
  getMyApplications,
  applyToOpportunity,
} from "../../services/developerService";

export default function DeveloperOpportunities({
  devProfile,
}) {
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [applyError, setApplyError] = useState("");

  const [selectedOpportunity, setSelectedOpportunity] =
    useState(null);

  const [applying, setApplying] = useState(false);

  /* ============================================================
     NORMALIZE APPLICATION STATUS
  ============================================================ */

  const normalizeStatus = useCallback((status) => {
    return String(status || "")
      .trim()
      .toLowerCase();
  }, []);

  /* ============================================================
     APPLIED OPPORTUNITY MAP

     Maps opportunity_id -> application status.

     Example:
     {
       "uuid-1": "pending",
       "uuid-2": "approved"
     }
  ============================================================ */

  const appliedOpportunityMap = useMemo(() => {
    const map = new Map();

    if (!Array.isArray(applications)) {
      return map;
    }

    applications.forEach((application) => {
      if (!application?.opportunity_id) {
        return;
      }

      map.set(
        application.opportunity_id,
        normalizeStatus(application.status)
      );
    });

    return map;
  }, [applications, normalizeStatus]);

  /* ============================================================
     LOAD OPPORTUNITIES + APPLICATIONS
  ============================================================ */

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        console.log(
          "EXCWA: Loading opportunities and applications..."
        );

        const [
          opportunitiesResult,
          applicationsResult,
        ] = await Promise.all([
          getOpenOpportunities(),
          getMyApplications(),
        ]);

        const openOpportunities = Array.isArray(
          opportunitiesResult
        )
          ? opportunitiesResult
          : [];

        const myApplications = Array.isArray(
          applicationsResult
        )
          ? applicationsResult
          : [];

        console.log(
          "EXCWA: Open opportunities received:",
          openOpportunities
        );

        console.log(
          "EXCWA: Developer applications received:",
          myApplications
        );

        setOpportunities(openOpportunities);
        setApplications(myApplications);
      } catch (err) {
        console.error(
          "EXCWA: Failed to load opportunities:",
          err
        );

        setOpportunities([]);
        setApplications([]);

        setError(
          err?.message ||
            "Unable to load opportunities."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* ============================================================
     INITIAL LOAD

     Do not wait for devProfile.id.

     Both service functions already determine the
     authenticated developer internally.
  ============================================================ */

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ============================================================
     APPLY
  ============================================================ */

  const handleApply = useCallback(async () => {
    if (!selectedOpportunity?.id) {
      setApplyError("Invalid opportunity.");
      return;
    }

    if (!devProfile?.id) {
      setApplyError(
        "Developer profile is still loading. Please try again."
      );
      return;
    }

    const opportunityId =
      selectedOpportunity.id;

    /* ========================================================
       FRONTEND DUPLICATE PROTECTION

       Do not allow the modal to submit if the developer
       has already applied.
    ======================================================== */

    if (
      appliedOpportunityMap.has(
        opportunityId
      )
    ) {
      setApplyError(
        "You have already applied to this opportunity."
      );
      return;
    }

    try {
      setApplying(true);
      setApplyError("");
      setError("");

      console.log(
        "EXCWA: Applying for opportunity:",
        opportunityId
      );

      const result =
        await applyToOpportunity({
          opportunityId,
          developerId: devProfile.id,
        });

      console.log(
        "EXCWA: Application result:",
        result
      );

      /* ======================================================
         KEEP THE OPPORTUNITY VISIBLE

         Instead of removing it from the list, we add the
         application locally so the button immediately becomes
         "Applied ✓".
      ====================================================== */

      const newApplication = {
        id:
          result?.application_id ||
          result?.id ||
          `local-${opportunityId}`,
        opportunity_id:
          result?.opportunity_id ||
          opportunityId,
        developer_id:
          result?.developer_id ||
          devProfile.id,
        status:
          normalizeStatus(
            result?.application_status
          ) || "pending",
      };

      setApplications((current) => {
        const alreadyExists = current.some(
          (application) =>
            application?.opportunity_id ===
            opportunityId
        );

        if (alreadyExists) {
          return current;
        }

        return [
          ...current,
          newApplication,
        ];
      });

      setSelectedOpportunity(null);
      setApplyError("");

      /*
       * Re-check the database so the UI is synchronized
       * with the actual application record.
       */
      await loadData();
    } catch (err) {
      console.error(
        "EXCWA: Application failed:",
        err
      );

      setApplyError(
        err?.message ||
          "Unable to apply for this opportunity."
      );

      /*
       * Refresh because the opportunity or application
       * may have changed while the request was running.
       */
      await loadData(true);
    } finally {
      setApplying(false);
    }
  }, [
    selectedOpportunity,
    devProfile?.id,
    appliedOpportunityMap,
    normalizeStatus,
    loadData,
  ]);

  /* ============================================================
     HELPERS
  ============================================================ */

  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatAmount(amount) {
    if (
      amount === null ||
      amount === undefined ||
      amount === ""
    ) {
      return "—";
    }

    const numericAmount =
      Number(amount);

    if (
      Number.isNaN(numericAmount)
    ) {
      return "—";
    }

    return `₹${numericAmount.toLocaleString(
      "en-IN"
    )}`;
  }

  function formatArray(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <section className="dev-opportunities">
        <div className="dev-opportunities-header">
          <div>
            <span className="dev-opportunities-eyebrow">
              AVAILABLE WORK
            </span>

            <h2>
              Opportunities
            </h2>

            <p>
              Find projects that match your skills.
            </p>
          </div>
        </div>

        <div className="dev-opportunities-loading">
          <div className="dev-opportunities-spinner" />

          <span>
            Loading opportunities...
          </span>
        </div>
      </section>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <section className="dev-opportunities">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="dev-opportunities-header">
        <div>
          <span className="dev-opportunities-eyebrow">
            AVAILABLE WORK
          </span>

          <h2>
            Opportunities
          </h2>

          <p>
            Browse projects currently available
            for developers.
          </p>
        </div>

        <button
          type="button"
          className="dev-opportunities-refresh"
          onClick={() =>
            loadData(true)
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={14}
            className={
              refreshing
                ? "dev-refresh-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="dev-opportunities-error">
          <AlertCircle size={16} />

          <span>
            {error}
          </span>

          <button
            type="button"
            className="dev-opportunities-empty-refresh"
            onClick={() =>
              loadData(true)
            }
            disabled={refreshing}
          >
            <RefreshCw size={14} />

            Retry
          </button>
        </div>
      )}

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {!error &&
        opportunities.length === 0 && (
          <div className="dev-opportunities-empty">
            <div className="dev-opportunities-empty-icon">
              <Briefcase size={24} />
            </div>

            <h3>
              No opportunities available
            </h3>

            <p>
              New projects will appear here when
              they become available.
            </p>

            <button
              type="button"
              className="dev-opportunities-empty-refresh"
              onClick={() =>
                loadData(true)
              }
              disabled={refreshing}
            >
              <RefreshCw size={14} />

              Check Again
            </button>
          </div>
        )}

      {/* ======================================================
          OPPORTUNITY GRID
      ====================================================== */}

      {opportunities.length > 0 && (
        <div className="dev-opportunities-grid">

          {opportunities.map(
            (opportunity) => {
              const technologies =
                formatArray(
                  opportunity.tech_stack
                );

              const skills =
                formatArray(
                  opportunity.required_skills
                );

              const deliverables =
                formatArray(
                  opportunity.deliverables
                );

              const hasApplied =
                appliedOpportunityMap.has(
                  opportunity.id
                );

              const applicationStatus =
                appliedOpportunityMap.get(
                  opportunity.id
                );

              return (
                <article
                  className="dev-opportunity-card"
                  key={opportunity.id}
                >

                  {/* TOP */}

                  <div className="dev-opportunity-top">
                    <span className="dev-opportunity-category">
                      {opportunity.category ||
                        "Project"}
                    </span>

                    <span
                      className={
                        hasApplied
                          ? "dev-opportunity-status dev-opportunity-status-applied"
                          : "dev-opportunity-status"
                      }
                    >
                      {hasApplied
                        ? "Applied"
                        : "Open"}
                    </span>
                  </div>

                  {/* TITLE */}

                  <h3>
                    {opportunity.title ||
                      "Untitled Project"}
                  </h3>

                  {/* DESCRIPTION */}

                  <p className="dev-opportunity-description">
                    {opportunity.description ||
                      "No project description provided."}
                  </p>

                  {/* TECHNOLOGIES */}

                  {technologies.length > 0 && (
                    <div className="dev-opportunity-tags">
                      {technologies
                        .slice(0, 5)
                        .map(
                          (
                            tech,
                            index
                          ) => (
                            <span
                              key={`${tech}-${index}`}
                              className="dev-opportunity-tag"
                            >
                              {tech}
                            </span>
                          )
                        )}
                    </div>
                  )}

                  {/* DETAILS */}

                  <div className="dev-opportunity-details">

                    <div>
                      <span>
                        <Briefcase size={12} />
                        Project Type
                      </span>

                      <strong>
                        {opportunity.project_type ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        <Calendar size={12} />
                        Deadline
                      </span>

                      <strong>
                        {formatDate(
                          opportunity.deadline
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        <Clock size={12} />
                        Applications Until
                      </span>

                      <strong>
                        {formatDate(
                          opportunity.application_deadline
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Freelancer Payout
                      </span>

                      <strong className="dev-opportunity-payout">
                        {formatAmount(
                          opportunity.freelancer_payout ??
                            opportunity.budget
                        )}
                      </strong>
                    </div>

                  </div>

                  {/* ==================================================
                      APPLY BUTTON

                      Applied:
                      - remains visible
                      - disabled
                      - cannot open modal

                      Not applied:
                      - opens modal
                  ================================================== */}

                  <button
                    type="button"
                    className={
                      hasApplied
                        ? "dev-opportunity-apply dev-opportunity-apply-applied"
                        : "dev-opportunity-apply"
                    }
                    onClick={() => {
                      if (hasApplied) {
                        return;
                      }

                      setSelectedOpportunity(
                        opportunity
                      );

                      setApplyError("");
                    }}
                    disabled={hasApplied}
                    aria-disabled={hasApplied}
                  >
                    {hasApplied ? (
                      <>
                        <Check size={14} />

                        Applied ✓
                      </>
                    ) : (
                      <>
                        <Send size={14} />

                        View & Apply
                      </>
                    )}
                  </button>

                  {/* APPLICATION STATUS */}

                  {hasApplied && (
                    <span className="dev-opportunity-application-status">
                      Application status:{" "}
                      <strong>
                        {applicationStatus ||
                          "pending"}
                      </strong>
                    </span>
                  )}

                </article>
              );
            }
          )}

        </div>
      )}

      {/* ======================================================
          APPLICATION MODAL
      ====================================================== */}

      {selectedOpportunity && (
        <div
          className="dev-opportunity-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !applying
            ) {
              setSelectedOpportunity(
                null
              );

              setApplyError("");
            }
          }}
        >

          <div className="dev-opportunity-modal">

            {/* MODAL HEADER */}

            <div className="dev-opportunity-modal-header">
              <div>
                <span className="dev-opportunity-category">
                  {selectedOpportunity.category ||
                    "Project"}
                </span>

                <h3>
                  {selectedOpportunity.title ||
                    "Untitled Project"}
                </h3>
              </div>

              <button
                type="button"
                className="dev-opportunity-modal-close"
                onClick={() => {
                  setSelectedOpportunity(
                    null
                  );

                  setApplyError("");
                }}
                disabled={applying}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* DESCRIPTION */}

            <div className="dev-opportunity-modal-section">
              <span>
                Project Requirement
              </span>

              <p>
                {selectedOpportunity.description ||
                  "No description provided."}
              </p>
            </div>

            {/* DETAILS */}

            <div className="dev-opportunity-modal-grid">

              <div>
                <span>
                  Project Type
                </span>

                <strong>
                  {selectedOpportunity.project_type ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Deadline
                </span>

                <strong>
                  {formatDate(
                    selectedOpportunity.deadline
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Freelancer Payout
                </span>

                <strong className="dev-opportunity-payout">
                  {formatAmount(
                    selectedOpportunity.freelancer_payout ??
                      selectedOpportunity.budget
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Application Deadline
                </span>

                <strong>
                  {formatDate(
                    selectedOpportunity.application_deadline
                  )}
                </strong>
              </div>

            </div>

            {/* REQUIRED SKILLS */}

            {formatArray(
              selectedOpportunity.required_skills
            ).length > 0 && (
              <div className="dev-opportunity-modal-section">
                <span>
                  Required Skills
                </span>

                <div className="dev-opportunity-tags">
                  {formatArray(
                    selectedOpportunity.required_skills
                  ).map(
                    (
                      skill,
                      index
                    ) => (
                      <span
                        key={`${skill}-${index}`}
                        className="dev-opportunity-tag"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* TECHNOLOGY STACK */}

            {formatArray(
              selectedOpportunity.tech_stack
            ).length > 0 && (
              <div className="dev-opportunity-modal-section">
                <span>
                  Technology Stack
                </span>

                <div className="dev-opportunity-tags">
                  {formatArray(
                    selectedOpportunity.tech_stack
                  ).map(
                    (
                      tech,
                      index
                    ) => (
                      <span
                        key={`${tech}-${index}`}
                        className="dev-opportunity-tag"
                      >
                        {tech}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* DELIVERABLES */}

            {formatArray(
              selectedOpportunity.deliverables
            ).length > 0 && (
              <div className="dev-opportunity-modal-section">
                <span>
                  Deliverables
                </span>

                <ul>
                  {formatArray(
                    selectedOpportunity.deliverables
                  ).map(
                    (
                      deliverable,
                      index
                    ) => (
                      <li
                        key={`${deliverable}-${index}`}
                      >
                        {deliverable}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* APPLICATION ERROR */}

            {applyError && (
              <div className="dev-opportunities-error">
                <AlertCircle size={16} />

                <span>
                  {applyError}
                </span>
              </div>
            )}

            {/* ACTIONS */}

            <div className="dev-opportunity-modal-actions">

              <button
                type="button"
                className="dev-opportunity-cancel"
                onClick={() => {
                  setSelectedOpportunity(
                    null
                  );

                  setApplyError("");
                }}
                disabled={applying}
              >
                Cancel
              </button>

              <button
                type="button"
                className="dev-opportunity-confirm"
                onClick={handleApply}
                disabled={applying}
              >
                <Send size={14} />

                {applying
                  ? "Applying..."
                  : "Apply for Project"}
              </button>

            </div>

          </div>
        </div>
      )}

    </section>
  );
}
