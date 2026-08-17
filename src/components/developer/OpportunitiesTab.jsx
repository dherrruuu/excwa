import { useEffect, useState } from "react";
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
} from "lucide-react";

import "../../styles/developer.css";

import {
  getOpenOpportunities,
  applyToOpportunity,
} from "../../services/developerService";

export default function OpportunitiesTab({
  devProfile,
  onAssignmentCreated,
}) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================================
     LOAD OPPORTUNITIES
  ========================================================= */

  useEffect(() => {
    if (!devProfile?.id) {
      setLoading(false);
      return;
    }

    loadOpportunities();
  }, [devProfile?.id]);

  async function loadOpportunities() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const data = await getOpenOpportunities();

      setOpportunities(data || []);
    } catch (err) {
      console.error(
        "Failed to load opportunities:",
        err
      );

      setError(
        err?.message ||
          "Unable to load available opportunities."
      );

      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     APPLY
  ========================================================= */

  async function handleApply(opportunity) {
    if (!devProfile?.id) {
      setError(
        "Developer profile not found."
      );
      return;
    }

    if (!opportunity?.id) {
      setError(
        "Invalid opportunity."
      );
      return;
    }

    try {
      setApplyingId(opportunity.id);
      setError("");
      setSuccess("");

      /*
       * IMPORTANT
       *
       * applyToOpportunity expects:
       *
       * applyToOpportunity(
       *   opportunityId,
       *   applicationData
       * )
       *
       * The developer ID is NOT passed here.
       * The service gets it from the authenticated
       * Supabase user.
       */

      const result =
        await applyToOpportunity(
          opportunity.id,
          {
            coverMessage: "",
            estimatedDays: null,
          }
        );

      console.log(
        "Application result:",
        result
      );

      /*
       * Remove immediately from this developer's
       * opportunity list.
       */

      setOpportunities((current) =>
        current.filter(
          (item) =>
            item.id !== opportunity.id
        )
      );

      setSuccess(
        `Your application for "${opportunity.title}" has been submitted.`
      );

      /*
       * Refresh dashboard assignment state.
       *
       * If the backend automatically creates an
       * assignment after application, the dashboard
       * can immediately switch to the project view.
       */

      if (onAssignmentCreated) {
        await onAssignmentCreated();
      }
    } catch (err) {
      console.error(
        "Application failed:",
        err
      );

      /*
       * If another developer claimed the project
       * between loading and clicking Apply,
       * refresh the opportunities list so the stale
       * card disappears.
       */

      if (
        err?.message?.toLowerCase().includes(
          "already been assigned"
        ) ||
        err?.message?.toLowerCase().includes(
          "no longer open"
        )
      ) {
        await loadOpportunities();
      }

      setError(
        err?.message ||
          "Unable to apply for this opportunity."
      );
    } finally {
      setApplyingId(null);
    }
  }

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  function formatDate(date) {
    if (!date) {
      return "Not specified";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  /* =========================================================
     FORMAT ARRAY
  ========================================================= */

  function formatArray(value) {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  /* =========================================================
     FORMAT AMOUNT
  ========================================================= */

  function formatAmount(amount) {
    if (
      amount === null ||
      amount === undefined ||
      amount === ""
    ) {
      return "₹0";
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
      return "₹0";
    }

    return `₹${numericAmount.toLocaleString(
      "en-IN"
    )}`;
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="developer-opportunities-page">
        <div className="developer-opportunities-loading">
          <Loader2
            className="spin"
            size={28}
          />

          <span>
            Loading available projects...
          </span>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="developer-opportunities-page">

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

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={loadOpportunities}
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
          EMPTY STATE
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
              There are currently no projects
              available for you. Check back
              later for new opportunities.
            </p>

            <button
              type="button"
              className="developer-refresh-button"
              onClick={loadOpportunities}
            >
              <RefreshCw size={16} />

              Refresh Opportunities
            </button>

          </div>
        )}


      {/* =====================================================
          OPPORTUNITY GRID
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

              const deliverables =
                formatArray(
                  opportunity.deliverables
                );

              const isApplying =
                applyingId ===
                opportunity.id;

              return (
                <article
                  className="opportunity-card"
                  key={opportunity.id}
                >

                  {/* =================================================
                      CARD TOP
                  ================================================= */}

                  <div className="opportunity-card-top">

                    <span className="opportunity-type">
                      {opportunity.project_type ||
                        opportunity.category ||
                        "Project"}
                    </span>

                    <span className="opportunity-status">
                      Open
                    </span>

                  </div>


                  {/* =================================================
                      TITLE
                  ================================================= */}

                  <div className="opportunity-card-title">

                    <h2>
                      {opportunity.title ||
                        "Untitled Project"}
                    </h2>

                    <p>
                      {opportunity.description ||
                        "No project description available."}
                    </p>

                  </div>


                  {/* =================================================
                      PROJECT INFO
                  ================================================= */}

                  <div className="opportunity-info-grid">

                    {/* PROJECT TYPE */}

                    <div className="opportunity-info-item">

                      <div className="opportunity-info-icon">
                        <Briefcase size={16} />
                      </div>

                      <div>
                        <span>
                          Project Type
                        </span>

                        <strong>
                          {opportunity.project_type ||
                            opportunity.category ||
                            "Not specified"}
                        </strong>
                      </div>

                    </div>


                    {/* DEADLINE */}

                    <div className="opportunity-info-item">

                      <div className="opportunity-info-icon">
                        <Calendar size={16} />
                      </div>

                      <div>
                        <span>
                          Deadline
                        </span>

                        <strong>
                          {formatDate(
                            opportunity.deadline
                          )}
                        </strong>
                      </div>

                    </div>


                    {/* PAYOUT */}

                    <div className="opportunity-info-item payout">

                      <div className="opportunity-info-icon">
                        <DollarSign size={16} />
                      </div>

                      <div>
                        <span>
                          Developer Payout
                        </span>

                        <strong>
                          {formatAmount(
                            opportunity.freelancer_payout
                          )}
                        </strong>
                      </div>

                    </div>

                  </div>


                  {/* =================================================
                      TECHNOLOGY
                  ================================================= */}

                  {technologies.length > 0 && (
                    <div className="opportunity-section">

                      <div className="opportunity-section-heading">

                        <Code2 size={16} />

                        <span>
                          Technology
                        </span>

                      </div>

                      <div className="opportunity-tags">

                        {technologies.map(
                          (
                            technology,
                            index
                          ) => (
                            <span
                              className="opportunity-tag"
                              key={`${technology}-${index}`}
                            >
                              {technology}
                            </span>
                          )
                        )}

                      </div>

                    </div>
                  )}


                  {/* =================================================
                      REQUIRED SKILLS
                  ================================================= */}

                  {skills.length > 0 && (
                    <div className="opportunity-section">

                      <div className="opportunity-section-heading">

                        <Layers3 size={16} />

                        <span>
                          Required Skills
                        </span>

                      </div>

                      <div className="opportunity-tags">

                        {skills.map(
                          (
                            skill,
                            index
                          ) => (
                            <span
                              className="opportunity-tag"
                              key={`${skill}-${index}`}
                            >
                              {skill}
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

                      <div className="opportunity-section-heading">

                        <CheckCircle2 size={16} />

                        <span>
                          Deliverables
                        </span>

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
                      FOOTER
                  ================================================= */}

                  <div className="opportunity-card-footer">

                    <span className="opportunity-posted">
                      Posted{" "}
                      {formatDate(
                        opportunity.created_at
                      )}
                    </span>

                    <button
                      type="button"
                      className="opportunity-apply-button"
                      onClick={() =>
                        handleApply(
                          opportunity
                        )
                      }
                      disabled={isApplying}
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
                          Apply

                          <Send
                            size={16}
                          />
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

    </div>
  );
}