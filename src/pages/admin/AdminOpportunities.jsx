import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "../../styles/admin/admin-opportunities.css";

import {
  getAllOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity as deleteOpportunityService,
} from "../../services/admin/adminOpportunityService";

import {
  Plus,
  X,
  BriefcaseBusiness,
  CalendarDays,
  Users,
  Eye,
  Pencil,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  FileText,
  Trash2,
} from "lucide-react";

/* =========================================================
   INITIAL FORM
   ========================================================= */

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "",
  project_type: "",
  required_roles: [],
  required_skills: "",
  tech_stack: "",
  deliverables: "",
  deadline: "",
  application_deadline: "",
  budget: "",
  freelancer_payout: "",
};

/* =========================================================
   CATEGORIES
   ========================================================= */

const CATEGORIES = [
  "Website",
  "Web Application",
  "Android Application",
  "iOS Application",
  "Hybrid Application",
  "UI/UX Design",
  "Software Development",
  "Security Testing",
  "Other",
];

/* =========================================================
   ROLES
   ========================================================= */

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Java Developer",
  "Python Developer",
  "Mobile App Developer",
  "UI/UX Designer",
  "WordPress Developer",
  "DevOps Engineer",
  "QA / Tester",
  "Cyber Security",
];

/* =========================================================
   HELPERS
   ========================================================= */

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (status) => {
  switch (status) {
    case "open":
      return "status-badge status-success";

    case "assigned":
      return "status-badge status-warning";

    case "completed":
      return "status-badge status-success";

    case "cancelled":
    case "closed":
      return "status-badge status-danger";

    case "draft":
      return "status-badge status-neutral";

    default:
      return "status-badge";
  }
};

const submissionStatusClass = (status) => {
  switch (status) {
    case "submitted":
      return "applicant-status applicant-status-submitted";

    case "under_review":
      return "applicant-status applicant-status-review";

    case "changes_requested":
      return "applicant-status applicant-status-changes";

    case "approved":
      return "applicant-status applicant-status-approved";

    case "rejected":
      return "applicant-status applicant-status-rejected";

    case "completed":
      return "applicant-status applicant-status-completed";

    default:
      return "applicant-status";
  }
};

const submissionStatusIcon = (status) => {
  switch (status) {
    case "submitted":
      return <Clock3 size={14} />;

    case "under_review":
      return <Eye size={14} />;

    case "approved":
    case "completed":
      return <CheckCircle2 size={14} />;

    case "rejected":
    case "changes_requested":
      return <XCircle size={14} />;

    default:
      return null;
  }
};

/* =========================================================
   COMPONENT
   ========================================================= */

export default function AdminOpportunities() {
  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showApplicants, setShowApplicants] = useState(false);

  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================================
     LOAD OPPORTUNITIES
     ========================================================= */

  const loadOpportunities = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAllOpportunities();

      setOpportunities(data || []);
    } catch (err) {
      console.error("Load opportunities error:", err);

      setError(
        err?.message ||
          "Unable to load opportunities."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  /* =========================================================
     FORM CHANGE
     ========================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================================
     ROLE TOGGLE
     ========================================================= */

  const toggleRole = (role) => {
    setForm((prev) => ({
      ...prev,

      required_roles: prev.required_roles.includes(role)
        ? prev.required_roles.filter(
            (item) => item !== role
          )
        : [...prev.required_roles, role],
    }));
  };

  /* =========================================================
     RESET FORM
     ========================================================= */

  const resetForm = () => {
    setForm({
      ...INITIAL_FORM,
      required_roles: [],
    });

    setError("");
  };

  /* =========================================================
     CLOSE FORM
     ========================================================= */

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingOpportunity(null);

    resetForm();
  };

  /* =========================================================
     CONVERT OPPORTUNITY TO FORM
     ========================================================= */

  const opportunityToForm = (opportunity) => {
    return {
      title: opportunity.title || "",

      description:
        opportunity.description || "",

      category:
        opportunity.category || "",

      project_type:
        opportunity.project_type || "",

      required_roles:
        Array.isArray(opportunity.required_roles)
          ? opportunity.required_roles
          : [],

      required_skills:
        Array.isArray(opportunity.required_skills)
          ? opportunity.required_skills.join(", ")
          : opportunity.required_skills || "",

      tech_stack:
        Array.isArray(opportunity.tech_stack)
          ? opportunity.tech_stack.join(", ")
          : opportunity.tech_stack || "",

      deliverables:
        opportunity.deliverables || "",

      deadline:
        opportunity.deadline
          ? String(opportunity.deadline).slice(0, 10)
          : "",

      application_deadline:
        opportunity.application_deadline
          ? String(
              opportunity.application_deadline
            ).slice(0, 10)
          : "",

      budget:
        opportunity.budget ?? "",

      freelancer_payout:
        opportunity.freelancer_payout ?? "",
    };
  };

  /* =========================================================
     OPEN CREATE
     ========================================================= */

  const openCreate = () => {
    setError("");
    setSuccess("");

    setEditingOpportunity(null);

    resetForm();

    setShowForm(true);
  };

  /* =========================================================
     OPEN EDIT
     ========================================================= */

  const openEdit = (opportunity) => {
    if (!opportunity) return;

    setError("");
    setSuccess("");

    setShowView(false);

    setEditingOpportunity(opportunity);

    setForm(opportunityToForm(opportunity));

    setShowForm(true);
  };

  /* =========================================================
     SAVE OPPORTUNITY
     ========================================================= */

  const saveOpportunity = async (publish = false) => {
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Project title is required.");
      return;
    }

    if (!form.description.trim()) {
      setError("Project description is required.");
      return;
    }

    if (!form.category) {
      setError("Please select a category.");
      return;
    }

    if (!form.deliverables.trim()) {
      setError("Please enter the deliverables.");
      return;
    }

    if (!form.freelancer_payout) {
      setError("Developer payout is required.");
      return;
    }

    if (
      publish &&
      form.required_roles.length === 0
    ) {
      setError(
        "Select at least one required developer role."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Admin session not found."
        );
      }

      const payload = {
        title: form.title.trim(),

        description:
          form.description.trim(),

        category: form.category,

        project_type:
          form.project_type.trim() ||
          form.category,

        required_roles:
          form.required_roles,

        required_skills:
          form.required_skills
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),

        tech_stack:
          form.tech_stack
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),

        deliverables:
          form.deliverables.trim(),

        deadline:
          form.deadline || null,

        application_deadline:
          form.application_deadline || null,

        budget:
          form.budget
            ? Number(form.budget)
            : null,

        freelancer_payout:
          Number(form.freelancer_payout),
      };

      /* =====================================================
         UPDATE
         ===================================================== */

      if (editingOpportunity) {
        await updateOpportunity(
          editingOpportunity.id,
          payload
        );

        setSuccess(
          "Opportunity updated successfully."
        );
      }

      /* =====================================================
         CREATE
         ===================================================== */

      else {
        await createOpportunity({
          ...payload,

          status: publish
            ? "open"
            : "draft",

          created_by: user.id,
        });

        setSuccess(
          publish
            ? "Opportunity published successfully."
            : "Opportunity saved as draft."
        );
      }

      setShowForm(false);
      setEditingOpportunity(null);

      resetForm();

      await loadOpportunities();
    } catch (err) {
      console.error(
        "Save opportunity error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save opportunity."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     VIEW OPPORTUNITY
     ========================================================= */

  const openView = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowView(true);
    setError("");
  };

  const closeView = () => {
    setShowView(false);
    setSelectedOpportunity(null);
  };

  /* =========================================================
     LOAD APPLICANTS
     ========================================================= */

  const loadApplicants = async (opportunity) => {
    if (!opportunity?.id) return;

    setSelectedOpportunity(opportunity);

    setShowView(false);
    setShowApplicants(true);

    setApplicants([]);

    setApplicantsLoading(true);

    setError("");

    try {
      const {
        data,
        error: fetchError,
      } = await supabase
        .from("project_submissions")
        .select(
          `
          id,
          assignment_id,
          developer_id,
          zip_path,
          github_url,
          submission_notes,
          status,
          review_message,
          submitted_at,
          reviewed_at,
          reviewed_by
          `
        )
        .eq(
          "assignment_id",
          opportunity.id
        )
        .order("submitted_at", {
          ascending: false,
        });

      if (fetchError) {
        throw fetchError;
      }

      setApplicants(data || []);
    } catch (err) {
      console.error(
        "Load applicants error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load applicants."
      );
    } finally {
      setApplicantsLoading(false);
    }
  };

  /* =========================================================
     CLOSE APPLICANTS
     ========================================================= */

  const closeApplicants = () => {
    setShowApplicants(false);

    setSelectedOpportunity(null);

    setApplicants([]);

    setError("");
  };

  /* =========================================================
     DELETE OPPORTUNITY
     ========================================================= */

  const deleteOpportunity = async (
    opportunity
  ) => {
    if (!opportunity?.id) {
      setError("Invalid opportunity.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${opportunity.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await deleteOpportunityService(
        opportunity.id
      );

      setOpportunities((prev) =>
        prev.filter(
          (item) =>
            item.id !== opportunity.id
        )
      );

      setShowView(false);
      setSelectedOpportunity(null);

      setSuccess(
        "Opportunity deleted successfully."
      );

      await loadOpportunities();
    } catch (err) {
      console.error(
        "Delete opportunity error:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete opportunity."
      );
    }
  };

  /* =========================================================
     DELETE APPLICATION
     ========================================================= */

  const deleteApplication = async (
    application
  ) => {
    if (!application?.id) return;

    const confirmed = window.confirm(
      "Delete this application?\n\nThis action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const {
        error: deleteError,
      } = await supabase
        .from("project_submissions")
        .delete()
        .eq("id", application.id);

      if (deleteError) {
        throw deleteError;
      }

      setApplicants((prev) =>
        prev.filter(
          (item) =>
            item.id !== application.id
        )
      );

      setSuccess(
        "Application deleted successfully."
      );
    } catch (err) {
      console.error(
        "Delete application error:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete application."
      );
    }
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="admin-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="admin-page-header">
        <div>
          <h1>
            Opportunities
          </h1>

          <p>
            Create and manage development opportunities.
          </p>
        </div>

        <button
          type="button"
          className="admin-primary-btn"
          onClick={openCreate}
        >
          <Plus size={18} />
          Create Opportunity
        </button>
      </div>

      {/* =====================================================
          SUCCESS
          ===================================================== */}

      {success && (
        <div className="admin-success-message">
          {success}
        </div>
      )}

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error &&
        !showForm &&
        !showView &&
        !showApplicants && (
          <div className="admin-error-message">
            {error}
          </div>
        )}

      {/* =====================================================
          OPPORTUNITIES LIST
          ===================================================== */}

      <div className="admin-card">

        <div className="admin-card-header">
          <div>
            <h2>
              All Opportunities
            </h2>

            <span>
              {opportunities.length} total
            </span>
          </div>

          <BriefcaseBusiness size={20} />
        </div>

        {loading ? (
          <div className="admin-loading">
            Loading opportunities...
          </div>
        ) : opportunities.length === 0 ? (
          <div className="admin-empty-state">

            <BriefcaseBusiness size={40} />

            <h3>
              No opportunities yet
            </h3>

            <p>
              Create your first development opportunity.
            </p>

          </div>
        ) : (
          <div className="admin-table-wrapper">

            <table className="admin-table">

              <thead>
                <tr>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Developer Payout</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {opportunities.map(
                  (opportunity) => (
                    <tr
                      key={
                        opportunity.id
                      }
                    >

                      <td>
                        <strong>
                          {
                            opportunity.title
                          }
                        </strong>

                        <small>
                          {
                            opportunity.project_type
                          }
                        </small>
                      </td>

                      <td>
                        {
                          opportunity.category
                        }
                      </td>

                      <td>
                        ₹
                        {Number(
                          opportunity.freelancer_payout ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        <span className="admin-date">

                          <CalendarDays
                            size={14}
                          />

                          {formatDate(
                            opportunity.deadline
                          )}

                        </span>
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            opportunity.status
                          )}
                        >
                          {String(
                            opportunity.status ||
                              "unknown"
                          ).replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          opportunity.created_at
                        )}
                      </td>

                      <td>
                        <div className="admin-opportunity-actions">

                          {/* VIEW */}

                          <button
                            type="button"
                            className="admin-opportunity-action-btn admin-opportunity-view-btn"
                            onClick={() =>
                              openView(
                                opportunity
                              )
                            }
                          >
                            <Eye size={16} />

                            <span>
                              View
                            </span>
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            className="admin-opportunity-action-btn admin-opportunity-edit-btn"
                            onClick={() =>
                              openEdit(
                                opportunity
                              )
                            }
                          >
                            <Pencil size={16} />

                            <span>
                              Edit
                            </span>
                          </button>

                          {/* APPLICANTS */}

                          <button
                            type="button"
                            className="admin-opportunity-action-btn admin-opportunity-applicants-btn"
                            onClick={() =>
                              loadApplicants(
                                opportunity
                              )
                            }
                          >
                            <Users size={16} />

                            <span>
                              Applicants
                            </span>
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            className="admin-opportunity-action-btn admin-opportunity-delete-action-btn"
                            data-tooltip="Delete"
                            aria-label="Delete opportunity"
                            onClick={() =>
                              deleteOpportunity(
                                opportunity
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
          ===================================================== */}

      {showForm && (
        <div className="admin-modal-overlay">

          <div className="admin-modal admin-opportunity-modal">

            <div className="admin-modal-header">

              <div>
                <h2>
                  {editingOpportunity
                    ? "Edit Opportunity"
                    : "Create Opportunity"}
                </h2>

                <p>
                  {editingOpportunity
                    ? "Update the development project details."
                    : "Add a new development project."}
                </p>
              </div>

              <button
                type="button"
                className="admin-icon-btn"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={20} />
              </button>

            </div>

            <div className="admin-modal-body">

              {error && (
                <div className="admin-error-message">
                  {error}
                </div>
              )}

              {/* PROJECT INFORMATION */}

              <div className="admin-form-section">

                <h3>
                  Project Information
                </h3>

                <div className="admin-form-grid">

                  <div className="admin-form-field full-width">

                    <label>
                      Project Title *
                    </label>

                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. E-commerce Website"
                      disabled={saving}
                    />

                  </div>

                  <div className="admin-form-field">

                    <label>
                      Category *
                    </label>

                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      disabled={saving}
                    >

                      <option value="">
                        Select category
                      </option>

                      {CATEGORIES.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div className="admin-form-field">

                    <label>
                      Project Type
                    </label>

                    <input
                      type="text"
                      name="project_type"
                      value={
                        form.project_type
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. React + Node.js"
                      disabled={saving}
                    />

                  </div>

                  <div className="admin-form-field full-width">

                    <label>
                      Description *
                    </label>

                    <textarea
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleChange
                      }
                      rows="5"
                      placeholder="Describe the project..."
                      disabled={saving}
                    />

                  </div>

                </div>

              </div>

              {/* DEVELOPER REQUIREMENTS */}

              <div className="admin-form-section">

                <h3>
                  Developer Requirements
                </h3>

                <label>
                  Required Roles *
                </label>

                <div className="admin-role-grid">

                  {ROLES.map((role) => {

                    const selected =
                      form.required_roles.includes(
                        role
                      );

                    return (
                      <button
                        key={role}
                        type="button"
                        className={`admin-role-chip ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          toggleRole(role)
                        }
                        disabled={saving}
                      >
                        {role}
                      </button>
                    );
                  })}

                </div>

                <div className="admin-form-grid">

                  <div className="admin-form-field">

                    <label>
                      Required Skills
                    </label>

                    <input
                      type="text"
                      name="required_skills"
                      value={
                        form.required_skills
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="React, API, PostgreSQL"
                      disabled={saving}
                    />

                    <small>
                      Separate skills with commas.
                    </small>

                  </div>

                  <div className="admin-form-field">

                    <label>
                      Technology Stack
                    </label>

                    <input
                      type="text"
                      name="tech_stack"
                      value={
                        form.tech_stack
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="React, Node.js, Supabase"
                      disabled={saving}
                    />

                  </div>

                </div>

              </div>

              {/* DELIVERABLES */}

              <div className="admin-form-section">

                <h3>
                  Deliverables
                </h3>

                <textarea
                  name="deliverables"
                  value={
                    form.deliverables
                  }
                  onChange={handleChange}
                  rows="4"
                  placeholder="List the expected project deliverables..."
                  disabled={saving}
                />

              </div>

              {/* FINANCIAL */}

              <div className="admin-form-section">

                <h3>
                  Project & Developer Payment
                </h3>

                <div className="admin-form-grid">

                  <div className="admin-form-field">

                    <label>
                      Internal Project Budget
                    </label>

                    <input
                      type="number"
                      name="budget"
                      value={form.budget}
                      onChange={handleChange}
                      placeholder="50000"
                      min="0"
                      disabled={saving}
                    />

                    <small>
                      Internal admin information.
                    </small>

                  </div>

                  <div className="admin-form-field">

                    <label>
                      Developer Payout *
                    </label>

                    <input
                      type="number"
                      name="freelancer_payout"
                      value={
                        form.freelancer_payout
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="32000"
                      min="0"
                      disabled={saving}
                    />

                    <small>
                      This is the amount shown to developers.
                    </small>

                  </div>

                </div>

              </div>

              {/* DATES */}

              <div className="admin-form-section">

                <h3>
                  Timeline
                </h3>

                <div className="admin-form-grid">

                  <div className="admin-form-field">

                    <label>
                      Application Deadline
                    </label>

                    <input
                      type="date"
                      name="application_deadline"
                      value={
                        form.application_deadline
                      }
                      onChange={
                        handleChange
                      }
                      disabled={saving}
                    />

                  </div>

                  <div className="admin-form-field">

                    <label>
                      Project Deadline
                    </label>

                    <input
                      type="date"
                      name="deadline"
                      value={
                        form.deadline
                      }
                      onChange={
                        handleChange
                      }
                      disabled={saving}
                    />

                  </div>

                </div>

              </div>

            </div>

            <div className="admin-modal-footer">

              <button
                type="button"
                className="admin-secondary-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              {!editingOpportunity && (
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() =>
                    saveOpportunity(false)
                  }
                  disabled={saving}
                >
                  Save Draft
                </button>
              )}

              <button
                type="button"
                className="admin-primary-btn"
                onClick={() =>
                  saveOpportunity(
                    editingOpportunity
                      ? false
                      : true
                  )
                }
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingOpportunity
                    ? "Save Changes"
                    : "Publish Opportunity"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          VIEW OPPORTUNITY MODAL
          ===================================================== */}

      {showView &&
        selectedOpportunity && (
          <div className="admin-modal-overlay">

            <div className="admin-modal admin-opportunity-view-modal">

              <div className="admin-modal-header">

                <div>
                  <h2>
                    {
                      selectedOpportunity.title
                    }
                  </h2>

                  <p>
                    Opportunity details
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-icon-btn"
                  onClick={closeView}
                >
                  <X size={20} />
                </button>

              </div>

              <div className="admin-modal-body">

                {/* STATUS */}

                <div className="opportunity-view-status-row">

                  <span
                    className={statusClass(
                      selectedOpportunity.status
                    )}
                  >
                    {String(
                      selectedOpportunity.status ||
                        "unknown"
                    ).replaceAll(
                      "_",
                      " "
                    )}
                  </span>

                  <span>
                    Created{" "}
                    {formatDate(
                      selectedOpportunity.created_at
                    )}
                  </span>

                </div>

                {/* PROJECT INFORMATION */}

                <div className="opportunity-view-section">

                  <h3>
                    Project Information
                  </h3>

                  <div className="opportunity-view-grid">

                    <div className="opportunity-view-info">

                      <span>
                        Category
                      </span>

                      <strong>
                        {
                          selectedOpportunity.category ||
                          "—"
                        }
                      </strong>

                    </div>

                    <div className="opportunity-view-info">

                      <span>
                        Project Type
                      </span>

                      <strong>
                        {
                          selectedOpportunity.project_type ||
                          "—"
                        }
                      </strong>

                    </div>

                    <div className="opportunity-view-info full">

                      <span>
                        Description
                      </span>

                      <p>
                        {
                          selectedOpportunity.description ||
                          "—"
                        }
                      </p>

                    </div>

                  </div>

                </div>

                {/* DEVELOPER REQUIREMENTS */}

                <div className="opportunity-view-section">

                  <h3>
                    Developer Requirements
                  </h3>

                  <div className="opportunity-view-block">

                    <span>
                      Required Roles
                    </span>

                    <div className="admin-role-grid">

                      {Array.isArray(
                        selectedOpportunity.required_roles
                      ) &&
                      selectedOpportunity
                        .required_roles
                        .length > 0 ? (
                        selectedOpportunity.required_roles.map(
                          (role) => (
                            <span
                              key={role}
                              className="admin-role-chip selected"
                            >
                              {role}
                            </span>
                          )
                        )
                      ) : (
                        <p>
                          No roles specified.
                        </p>
                      )}

                    </div>

                  </div>

                  <div className="opportunity-view-grid">

                    <div className="opportunity-view-info">

                      <span>
                        Required Skills
                      </span>

                      <strong>
                        {Array.isArray(
                          selectedOpportunity.required_skills
                        )
                          ? selectedOpportunity.required_skills.join(
                              ", "
                            )
                          : selectedOpportunity.required_skills ||
                            "—"}
                      </strong>

                    </div>

                    <div className="opportunity-view-info">

                      <span>
                        Technology Stack
                      </span>

                      <strong>
                        {Array.isArray(
                          selectedOpportunity.tech_stack
                        )
                          ? selectedOpportunity.tech_stack.join(
                              ", "
                            )
                          : selectedOpportunity.tech_stack ||
                            "—"}
                      </strong>

                    </div>

                  </div>

                </div>

                {/* DELIVERABLES */}

                <div className="opportunity-view-section">

                  <h3>
                    Deliverables
                  </h3>

                  <p className="opportunity-view-text">
                    {
                      selectedOpportunity.deliverables ||
                      "—"
                    }
                  </p>

                </div>

                {/* PAYMENT */}

                <div className="opportunity-view-section">

                  <h3>
                    Payment & Timeline
                  </h3>

                  <div className="opportunity-view-grid">

                    <div className="opportunity-view-info">

                      <span>
                        Internal Budget
                      </span>

                      <strong>
                        {selectedOpportunity.budget
                          ? `₹${Number(
                              selectedOpportunity.budget
                            ).toLocaleString(
                              "en-IN"
                            )}`
                          : "—"}
                      </strong>

                    </div>

                    <div className="opportunity-view-info">

                      <span>
                        Developer Payout
                      </span>

                      <strong>
                        ₹
                        {Number(
                          selectedOpportunity.freelancer_payout ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>

                    <div className="opportunity-view-info">

                      <span>
                        Application Deadline
                      </span>

                      <strong>
                        {formatDate(
                          selectedOpportunity.application_deadline
                        )}
                      </strong>

                    </div>

                    <div className="opportunity-view-info">

                      <span>
                        Project Deadline
                      </span>

                      <strong>
                        {formatDate(
                          selectedOpportunity.deadline
                        )}
                      </strong>

                    </div>

                  </div>

                </div>

              </div>

              <div className="admin-modal-footer admin-opportunity-view-footer">

                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={closeView}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="admin-primary-btn admin-opportunity-edit-btn"
                  onClick={() =>
                    openEdit(
                      selectedOpportunity
                    )
                  }
                >
                  <Pencil size={16} />
                  Edit Opportunity
                </button>

                <button
                  type="button"
                  className="admin-primary-btn admin-opportunity-applicants-btn"
                  onClick={() =>
                    loadApplicants(
                      selectedOpportunity
                    )
                  }
                >
                  <Users size={16} />
                  View Applicants
                </button>

                <button
                  type="button"
                  className="admin-opportunity-delete-btn"
                  onClick={() =>
                    deleteOpportunity(
                      selectedOpportunity
                    )
                  }
                >
                  <Trash2 size={16} />
                  Delete Opportunity
                </button>

              </div>

            </div>

          </div>
        )}

      {/* =====================================================
          APPLICANTS MODAL
          ===================================================== */}

      {showApplicants &&
        selectedOpportunity && (
          <div className="admin-modal-overlay">

            <div className="admin-modal admin-applicants-modal">

              <div className="admin-modal-header">

                <div>
                  <h2>
                    Applicants
                  </h2>

                  <p>
                    {
                      selectedOpportunity.title
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-icon-btn"
                  onClick={closeApplicants}
                >
                  <X size={20} />
                </button>

              </div>

              <div className="admin-modal-body">

                {error && (
                  <div className="admin-error-message">
                    {error}
                  </div>
                )}

                {applicantsLoading ? (
                  <div className="admin-loading">

                    <RefreshCw
                      size={20}
                      className="spin"
                    />

                    Loading applicants...

                  </div>
                ) : applicants.length === 0 ? (
                  <div className="admin-empty-state">

                    <Users size={42} />

                    <h3>
                      No applications yet
                    </h3>

                    <p>
                      There are currently no developer
                      submissions for this opportunity.
                    </p>

                  </div>
                ) : (
                  <div className="admin-applicants-list">

                    {/* SUMMARY */}

                    <div className="admin-applicants-summary">

                      <div>
                        <strong>
                          {
                            applicants.length
                          }
                        </strong>

                        <span>
                          {applicants.length ===
                          1
                            ? "Applicant"
                            : "Applicants"}
                        </span>
                      </div>

                      <div>
                        <strong>
                          {
                            applicants.filter(
                              (item) =>
                                item.status ===
                                "submitted"
                            ).length
                          }
                        </strong>

                        <span>
                          Submitted
                        </span>
                      </div>

                      <div>
                        <strong>
                          {
                            applicants.filter(
                              (item) =>
                                item.status ===
                                "under_review"
                            ).length
                          }
                        </strong>

                        <span>
                          Under Review
                        </span>
                      </div>

                      <div>
                        <strong>
                          {
                            applicants.filter(
                              (item) =>
                                item.status ===
                                "approved"
                            ).length
                          }
                        </strong>

                        <span>
                          Approved
                        </span>
                      </div>

                    </div>

                    {/* APPLICANTS TABLE */}

                    <div className="admin-applicants-table-wrapper">

                      <table className="admin-table admin-applicants-table">

                        <thead>

                          <tr>
                            <th>
                              Developer
                            </th>

                            <th>
                              Status
                            </th>

                            <th>
                              Submitted
                            </th>

                            <th>
                              GitHub
                            </th>

                            <th>
                              Files
                            </th>

                            <th>
                              Notes
                            </th>

                            <th>
                              Actions
                            </th>
                          </tr>

                        </thead>

                        <tbody>

                          {applicants.map(
                            (applicant) => (
                              <tr
                                key={
                                  applicant.id
                                }
                              >

                                {/* DEVELOPER */}

                                <td>

                                  <div className="applicant-developer">

                                    <div className="applicant-avatar">

                                      {String(
                                        applicant.developer_id ||
                                          "D"
                                      )
                                        .slice(
                                          0,
                                          2
                                        )
                                        .toUpperCase()}

                                    </div>

                                    <div>

                                      <strong>
                                        Developer
                                      </strong>

                                      <small>
                                        {
                                          applicant.developer_id
                                        }
                                      </small>

                                    </div>

                                  </div>

                                </td>

                                {/* STATUS */}

                                <td>

                                  <span
                                    className={submissionStatusClass(
                                      applicant.status
                                    )}
                                  >

                                    {submissionStatusIcon(
                                      applicant.status
                                    )}

                                    {String(
                                      applicant.status ||
                                        "unknown"
                                    ).replaceAll(
                                      "_",
                                      " "
                                    )}

                                  </span>

                                </td>

                                {/* SUBMITTED */}

                                <td>

                                  <span className="admin-date">

                                    <CalendarDays
                                      size={14}
                                    />

                                    {formatDateTime(
                                      applicant.submitted_at
                                    )}

                                  </span>

                                </td>

                                {/* GITHUB */}

                                <td>

                                  {applicant.github_url ? (
                                    <a
                                      href={
                                        applicant.github_url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="admin-link-btn"
                                    >

                                      <ExternalLink
                                        size={15}
                                      />

                                      GitHub

                                      <ExternalLink
                                        size={12}
                                      />

                                    </a>
                                  ) : (
                                    <span className="admin-muted">
                                      —
                                    </span>
                                  )}

                                </td>

                                {/* ZIP */}

                                <td>

                                  {applicant.zip_path ? (
                                    <span className="admin-file-status">

                                      <FileText
                                        size={15}
                                      />

                                      Submitted

                                    </span>
                                  ) : (
                                    <span className="admin-muted">
                                      No ZIP
                                    </span>
                                  )}

                                </td>

                                {/* NOTES */}

                                <td>

                                  {applicant.submission_notes ? (
                                    <span
                                      className="applicant-notes"
                                      title={
                                        applicant.submission_notes
                                      }
                                    >
                                      {
                                        applicant.submission_notes
                                      }
                                    </span>
                                  ) : (
                                    <span className="admin-muted">
                                      —
                                    </span>
                                  )}

                                </td>

                                {/* DELETE */}

                                <td>

                                  <button
                                    type="button"
                                    className="admin-application-delete-btn"
                                    onClick={() =>
                                      deleteApplication(
                                        applicant
                                      )
                                    }
                                    title="Delete application"
                                  >
                                    <Trash2
                                      size={15}
                                    />

                                    Delete
                                  </button>

                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>
                )}

              </div>

              <div className="admin-modal-footer">

                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={closeApplicants}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() =>
                    loadApplicants(
                      selectedOpportunity
                    )
                  }
                  disabled={
                    applicantsLoading
                  }
                >

                  <RefreshCw
                    size={15}
                    className={
                      applicantsLoading
                        ? "spin"
                        : ""
                    }
                  />

                  Refresh

                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}