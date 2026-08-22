import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Briefcase,
  Calendar,
  DollarSign,
  Send,
  Loader2,
  Code2,
  Layers3,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import "../../styles/developer.css";

import {
  getOpenOpportunities,
  applyToOpportunity,
} from "../../services/developerService";


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


function formatAmount(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not specified";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "Not specified";
  }

  return `₹${number.toLocaleString(
    "en-IN"
  )}`;
}


function formatArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean);
  }

  return [];
}


/* =========================================================
   COMPONENT
========================================================= */

export default function OpportunitiesTab({
  devProfile,
  onAssignmentCreated,
}) {
  const [
    opportunities,
    setOpportunities,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    applyingId,
    setApplyingId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  /* =======================================================
     LOAD OPPORTUNITIES
  ======================================================= */

  const loadOpportunities =
    useCallback(
      async ({
        refresh = false,
      } = {}) => {
        try {
          setError("");

          setSuccess("");

          if (refresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          /*
           * IMPORTANT:
           *
           * We intentionally DO NOT check:
           *
           * devProfile.status
           * active assignment
           *
           * here.
           *
           * A developer should be able to see open
           * opportunities.
           *
           * Eligibility is checked during APPLY.
           */

          const data =
            await getOpenOpportunities();

          setOpportunities(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (err) {
          console.error(
            "Failed to load opportunities:",
            err
          );

          setOpportunities([]);

          setError(
            err?.message ||
              "Unable to load available opportunities."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    /*
     * We only need the authenticated developer profile
     * to exist before loading the page.
     *
     * We do NOT require status === approved here.
     */

    if (!devProfile?.id) {
      setOpportunities([]);
      setLoading(false);
      return;
    }

    loadOpportunities();
  }, [
    devProfile?.id,
    loadOpportunities,
  ]);


  /* =======================================================
     APPLY
  ======================================================= */

  const handleApply =
    useCallback(
      async (opportunity) => {
        if (!opportunity?.id) {
          setError(
            "Invalid opportunity."
          );

          return;
        }

        if (!devProfile?.id) {
          setError(
            "Developer profile not found."
          );

          return;
        }

        try {
          setApplyingId(
            opportunity.id
          );

          setError("");

          setSuccess("");

          const result =
            await applyToOpportunity({
              opportunityId:
                opportunity.id,

              coverMessage:
                "",

              estimatedDays:
                null,
            });


          console.log(
            "Application result:",
            result
          );


          /*
           * Remove the opportunity immediately.
           */

          setOpportunities(
            (current) =>
              current.filter(
                (item) =>
                  item.id !==
                  opportunity.id
              )
          );


          setSuccess(
            `Your application for "${opportunity.title}" has been submitted successfully.`
          );


          /*
           * Refresh dashboard assignment.
           */

          if (
            onAssignmentCreated
          ) {
            await onAssignmentCreated();
          }


          /*
           * Refresh opportunities from DB
           * because the opportunity may now have
           * changed state.
           */

          await loadOpportunities({
            refresh: true,
          });
        } catch (err) {
          console.error(
            "Application failed:",
            err
          );

          const message =
            err?.message ||
            "Unable to apply for this opportunity.";

          setError(message);


          /*
           * If another developer got it,
           * refresh the list.
           */

          const normalized =
            message.toLowerCase();

          if (
            normalized.includes(
              "already been assigned"
            ) ||
            normalized.includes(
              "no longer open"
            ) ||
            normalized.includes(
              "already applied"
            ) ||
            normalized.includes(
              "no longer available"
            )
          ) {
            await loadOpportunities({
              refresh: true,
            });
          }
        } finally {
          setApplyingId(null);
        }
      },
      [
        devProfile?.id,
        loadOpportunities,
        onAssignmentCreated,
      ]
    );


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <section className="developer-opportunities-page">

        <div className="developer-opportunities-loading">

          <Loader2
            size={28}
            className="spin"
          />

          <span>
            Loading available projects...
          </span>

        </div>

      </section>
    );
  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <section className="developer-opportunities-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="developer-opportunities-header">

        <div>

          <div className="developer-section-label">

            <Briefcase size={15} />

            Available Projects

          </div>

          <h1>
            Opportunities
          </h1>

          <p>
            Browse projects currently
            available for developers.
          </p>

        </div>


        <div className="developer-opportunity-count">

          <strong>
            {opportunities.length}
          </strong>

          <span>
            {opportunities.length === 1
              ? "Opportunity"
              : "Opportunities"}
          </span>

        </div>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="developer-opportunity-alert error">

          <AlertCircle size={18} />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              loadOpportunities({
                refresh: true,
              })
            }
          >
            <RefreshCw size={16} />

            Retry
          </button>

        </div>
      )}


      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {success && (
        <div className="developer-opportunity-alert success">

          <CheckCircle2 size={18} />

          <span>
            {success}
          </span>

        </div>
      )}


      {/* =====================================================
          REFRESH
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px",
        }}
      >

        <button
          type="button"
          className="developer-refresh-button"
          disabled={refreshing}
          onClick={() =>
            loadOpportunities({
              refresh: true,
            })
          }
        >

          <RefreshCw
            size={16}
            className={
              refreshing
                ? "spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </div>


      {/* =====================================================
          EMPTY
      ===================================================== */}

      {opportunities.length === 0 &&
        !error && (

          <div className="developer-opportunities-empty">

            <div className="developer-empty-icon">

              <Briefcase size={30} />

            </div>

            <h2>
              No opportunities available
            </h2>

            <p>
              There are currently no open
              projects available. New
              opportunities will appear here
              when the admin publishes them.
            </p>

            <button
              type="button"
              className="developer-refresh-button"
              onClick={() =>
                loadOpportunities({
                  refresh: true,
                })
              }
            >

              <RefreshCw size={16} />

              Refresh Opportunities

            </button>

          </div>
        )}


      {/* =====================================================
          OPPORTUNITIES
      ===================================================== */}

      {opportunities.length > 0 && (

        <div className="developer-opportunities-grid">

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

              const roles =
                formatArray(
                  opportunity.required_roles
                );

              const deliverables =
                formatArray(
                  opportunity.deliverables
                );

              const isApplying =
                applyingId ===
                opportunity.id;


              return (
                <article
                  key={
                    opportunity.id
                  }
                  className="opportunity-card"
                >

                  {/* =================================================
                      TOP
                  ================================================= */}

                  <div className="opportunity-card-top">

                    <div>

                      <span className="developer-section-label">

                        <Briefcase
                          size={14}
                        />

                        {opportunity.category ||
                          "Project"}

                      </span>

                      <h2>
                        {opportunity.title ||
                          "Untitled Opportunity"}
                      </h2>

                    </div>

                    <span className="opportunity-status">
                      Open
                    </span>

                  </div>


                  {/* =================================================
                      DESCRIPTION
                  ================================================= */}

                  <p className="opportunity-description">

                    {opportunity.description ||
                      "No project description provided."}

                  </p>


                  {/* =================================================
                      PROJECT INFORMATION
                  ================================================= */}

                  <div className="opportunity-meta-grid">

                    <div className="opportunity-meta-item">

                      <Layers3
                        size={17}
                      />

                      <div>

                        <span>
                          Project Type
                        </span>

                        <strong>
                          {opportunity.project_type ||
                            "Not specified"}
                        </strong>

                      </div>

                    </div>


                    <div className="opportunity-meta-item">

                      <DollarSign
                        size={17}
                      />

                      <div>

                        <span>
                          Budget
                        </span>

                        <strong>
                          {formatAmount(
                            opportunity.budget ??
                              opportunity.freelancer_payout
                          )}
                        </strong>

                      </div>

                    </div>


                    <div className="opportunity-meta-item">

                      <Calendar
                        size={17}
                      />

                      <div>

                        <span>
                          Deadline
                        </span>

                        <strong>
                          {formatDate(
                            opportunity.deadline ||
                              opportunity.application_deadline
                          )}
                        </strong>

                      </div>

                    </div>

                  </div>


                  {/* =================================================
                      ROLES
                  ================================================= */}

                  {roles.length > 0 && (

                    <div className="opportunity-section">

                      <div className="opportunity-section-title">

                        <Layers3
                          size={15}
                        />

                        Required Roles

                      </div>

                      <div className="opportunity-tags">

                        {roles.map(
                          (
                            role,
                            index
                          ) => (
                            <span
                              key={`${role}-${index}`}
                              className="opportunity-tag"
                            >
                              {role}
                            </span>
                          )
                        )}

                      </div>

                    </div>

                  )}


                  {/* =================================================
                      SKILLS
                  ================================================= */}

                  {skills.length > 0 && (

                    <div className="opportunity-section">

                      <div className="opportunity-section-title">

                        <Code2
                          size={15}
                        />

                        Required Skills

                      </div>

                      <div className="opportunity-tags">

                        {skills.map(
                          (
                            skill,
                            index
                          ) => (
                            <span
                              key={`${skill}-${index}`}
                              className="opportunity-tag"
                            >
                              {skill}
                            </span>
                          )
                        )}

                      </div>

                    </div>

                  )}


                  {/* =================================================
                      TECHNOLOGIES
                  ================================================= */}

                  {technologies.length > 0 && (

                    <div className="opportunity-section">

                      <div className="opportunity-section-title">

                        <Code2
                          size={15}
                        />

                        Tech Stack

                      </div>

                      <div className="opportunity-tags">

                        {technologies.map(
                          (
                            technology,
                            index
                          ) => (
                            <span
                              key={`${technology}-${index}`}
                              className="opportunity-tag"
                            >
                              {technology}
                            </span>
                          )
                        )}

                      </div>

                    </div>

                  )}


                  {/* =================================================
                      DELIVERABLES
                  ================================================= */}

                  {deliverables.length > 0 && (

                    <div className="opportunity-section">

                      <div className="opportunity-section-title">

                        <CheckCircle2
                          size={15}
                        />

                        Deliverables

                      </div>

                      <ul className="opportunity-deliverables">

                        {deliverables.map(
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


                  {/* =================================================
                      APPLY
                  ================================================= */}

                  <div className="opportunity-card-footer">

                    <button
                      type="button"
                      className="primary-btn"
                      disabled={isApplying}
                      onClick={() =>
                        handleApply(
                          opportunity
                        )
                      }
                    >

                      {isApplying ? (
                        <>
                          <Loader2
                            size={17}
                            className="spin"
                          />

                          Applying...
                        </>
                      ) : (
                        <>
                          <Send
                            size={17}
                          />

                          Apply Now
                        </>
                      )}

                    </button>

                  </div>

                </article>
              );
            }
          )}

        </div>
      )}

    </section>
  );
}