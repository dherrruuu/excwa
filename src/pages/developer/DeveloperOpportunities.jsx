import { useEffect, useState } from "react";
import {
  Briefcase,
  Calendar,
  Clock,
  RefreshCw,
  Send,
  AlertCircle,
} from "lucide-react";

import "../../styles/developer.css";

import {
  getOpenOpportunities,
  applyToOpportunity,
} from "../../services/developerService";

export default function DeveloperOpportunities({
  devProfile,
  onAssignmentCreated,
}) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedOpportunity, setSelectedOpportunity] =
    useState(null);

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");

  // ============================================================
  // LOAD OPPORTUNITIES
  // ============================================================

  async function loadOpportunities(showRefresh = false) {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getOpenOpportunities();

      setOpportunities(data || []);
    } catch (err) {
      console.error(
        "Failed to load opportunities:",
        err
      );

      setError(
        err?.message ||
          "Unable to load opportunities."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    if (!devProfile?.id) return;

    loadOpportunities();
  }, [devProfile?.id]);

  // ============================================================
  // APPLY
  // ============================================================

  async function handleApply() {
    if (!selectedOpportunity) return;

    if (!devProfile?.id) {
      setApplyError(
        "Developer profile not found."
      );
      return;
    }

    try {
      setApplying(true);
      setApplyError("");

      await applyToOpportunity({
        opportunityId: selectedOpportunity.id,
        developerId: devProfile.id,
      });

      setSelectedOpportunity(null);

      // Refresh available projects
      await loadOpportunities();

      // Tell dashboard to refresh assignment
      if (onAssignmentCreated) {
        await onAssignmentCreated();
      }
    } catch (err) {
      console.error(
        "Application failed:",
        err
      );

      setApplyError(
        err?.message ||
          "Unable to apply for this opportunity."
      );
    } finally {
      setApplying(false);
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
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

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
      return "—";
    }

    return `₹${numericAmount.toLocaleString(
      "en-IN"
    )}`;
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <section className="dev-opportunities">
        <div className="dev-opportunities-header">
          <div>
            <span className="dev-opportunities-eyebrow">
              AVAILABLE WORK
            </span>

            <h2>Opportunities</h2>

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

  // ============================================================
  // PAGE
  // ============================================================

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

          <h2>Opportunities</h2>

          <p>
            Browse projects currently available
            for developers.
          </p>
        </div>

        <button
          type="button"
          className="dev-opportunities-refresh"
          onClick={() =>
            loadOpportunities(true)
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

          <span>{error}</span>
        </div>
      )}

      {/* ======================================================
          EMPTY STATE
          ====================================================== */}

      {!error && opportunities.length === 0 && (
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
              loadOpportunities(true)
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

          {opportunities.map((opportunity) => (
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

                <span className="dev-opportunity-status">
                  Open
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

              {Array.isArray(
                opportunity.tech_stack
              ) &&
                opportunity.tech_stack.length >
                  0 && (
                  <div className="dev-opportunity-tags">
                    {opportunity.tech_stack
                      .slice(0, 5)
                      .map((tech) => (
                        <span
                          key={tech}
                          className="dev-opportunity-tag"
                        >
                          {tech}
                        </span>
                      ))}
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
                      opportunity.freelancer_payout
                    )}
                  </strong>
                </div>

              </div>

              {/* APPLY BUTTON */}

              <button
                type="button"
                className="dev-opportunity-apply"
                onClick={() => {
                  setSelectedOpportunity(
                    opportunity
                  );

                  setApplyError("");
                }}
              >
                <Send size={14} />

                View & Apply
              </button>

            </article>
          ))}

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
              setSelectedOpportunity(null);
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
                  setSelectedOpportunity(null);
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
                    selectedOpportunity.freelancer_payout
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

            {Array.isArray(
              selectedOpportunity.required_skills
            ) &&
              selectedOpportunity.required_skills
                .length > 0 && (
                <div className="dev-opportunity-modal-section">
                  <span>
                    Required Skills
                  </span>

                  <div className="dev-opportunity-tags">
                    {selectedOpportunity.required_skills.map(
                      (skill) => (
                        <span
                          key={skill}
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

            {Array.isArray(
              selectedOpportunity.tech_stack
            ) &&
              selectedOpportunity.tech_stack
                .length > 0 && (
                <div className="dev-opportunity-modal-section">
                  <span>
                    Technology Stack
                  </span>

                  <div className="dev-opportunity-tags">
                    {selectedOpportunity.tech_stack.map(
                      (tech) => (
                        <span
                          key={tech}
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

            {selectedOpportunity.deliverables && (
              <div className="dev-opportunity-modal-section">
                <span>
                  Deliverables
                </span>

                <p>
                  {selectedOpportunity.deliverables}
                </p>
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
                  setSelectedOpportunity(null);
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