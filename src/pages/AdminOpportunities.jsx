import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/admin-opportunities.css";
import {
  Plus,
  X,
  BriefcaseBusiness,
  CalendarDays,
  Users,
  Eye,
} from "lucide-react";

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

export default function AdminOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOpportunities = async () => {
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setError(fetchError.message);
    } else {
      setOpportunities(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleRole = (role) => {
    setForm((prev) => ({
      ...prev,
      required_roles: prev.required_roles.includes(role)
        ? prev.required_roles.filter((item) => item !== role)
        : [...prev.required_roles, role],
    }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setError("");
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };

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

    if (publish && form.required_roles.length === 0) {
      setError("Select at least one required developer role.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Admin session not found.");
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        project_type: form.project_type.trim() || form.category,

        required_roles: form.required_roles,

        required_skills: form.required_skills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

        tech_stack: form.tech_stack
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

        deliverables: form.deliverables.trim(),

        deadline: form.deadline || null,

        application_deadline:
          form.application_deadline || null,

        budget: form.budget
          ? Number(form.budget)
          : null,

        freelancer_payout:
          Number(form.freelancer_payout),

        status: publish ? "open" : "draft",

        created_by: user.id,
      };

      const { error: insertError } = await supabase
        .from("opportunities")
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      setSuccess(
        publish
          ? "Opportunity published successfully."
          : "Opportunity saved as draft."
      );

      setShowForm(false);
      resetForm();

      await loadOpportunities();

    } catch (err) {
      console.error("Create opportunity error:", err);

      setError(
        err?.message ||
          "Unable to create opportunity."
      );
    } finally {
      setSaving(false);
    }
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

      default:
        return "status-badge";
    }
  };

  return (
    <div className="admin-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="admin-page-header">

        <div>
          <h1>Opportunities</h1>

          <p>
            Create and manage development opportunities.
          </p>
        </div>

        <button
          className="admin-primary-btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
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

      {error && !showForm && (
        <div className="admin-error-message">
          {error}
        </div>
      )}


      {/* =====================================================
          LIST
          ===================================================== */}

      <div className="admin-card">

        <div className="admin-card-header">

          <div>
            <h2>All Opportunities</h2>

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

            <h3>No opportunities yet</h3>

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
                </tr>
              </thead>

              <tbody>

                {opportunities.map((opportunity) => (

                  <tr key={opportunity.id}>

                    <td>
                      <strong>
                        {opportunity.title}
                      </strong>

                      <small>
                        {opportunity.project_type}
                      </small>
                    </td>

                    <td>
                      {opportunity.category}
                    </td>

                    <td>
                      ₹
                      {Number(
                        opportunity.freelancer_payout || 0
                      ).toLocaleString("en-IN")}
                    </td>

                    <td>
                      <span className="admin-date">

                        <CalendarDays size={14} />

                        {opportunity.deadline
                          ? new Date(
                              opportunity.deadline
                            ).toLocaleDateString("en-IN")
                          : "—"}

                      </span>
                    </td>

                    <td>
                      <span className={statusClass(opportunity.status)}>
                        {String(
                          opportunity.status
                        ).replaceAll("_", " ")}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        opportunity.created_at
                      ).toLocaleDateString("en-IN")}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* =====================================================
          CREATE MODAL
          ===================================================== */}

      {showForm && (

        <div className="admin-modal-overlay">

          <div className="admin-modal admin-opportunity-modal">

            <div className="admin-modal-header">

              <div>
                <h2>Create Opportunity</h2>

                <p>
                  Add a new development project.
                </p>
              </div>

              <button
                className="admin-icon-btn"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={20} />
              </button>

            </div>


            <div className="admin-modal-body">

              {/* ERROR */}

              {error && (
                <div className="admin-error-message">
                  {error}
                </div>
              )}


              {/* BASIC INFORMATION */}

              <div className="admin-form-section">

                <h3>Project Information</h3>

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

                      {CATEGORIES.map((category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      ))}

                    </select>

                  </div>


                  <div className="admin-form-field">

                    <label>
                      Project Type
                    </label>

                    <input
                      type="text"
                      name="project_type"
                      value={form.project_type}
                      onChange={handleChange}
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
                      value={form.description}
                      onChange={handleChange}
                      rows="5"
                      placeholder="Describe the project..."
                      disabled={saving}
                    />

                  </div>

                </div>

              </div>


              {/* DEVELOPER REQUIREMENTS */}

              <div className="admin-form-section">

                <h3>Developer Requirements</h3>

                <label>
                  Required Roles *
                </label>

                <div className="admin-role-grid">

                  {ROLES.map((role) => {

                    const selected =
                      form.required_roles.includes(role);

                    return (
                      <button
                        key={role}
                        type="button"
                        className={`admin-role-chip ${
                          selected ? "selected" : ""
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
                      value={form.required_skills}
                      onChange={handleChange}
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
                      value={form.tech_stack}
                      onChange={handleChange}
                      placeholder="React, Node.js, Supabase"
                      disabled={saving}
                    />

                  </div>

                </div>

              </div>


              {/* DELIVERABLES */}

              <div className="admin-form-section">

                <h3>Deliverables</h3>

                <textarea
                  name="deliverables"
                  value={form.deliverables}
                  onChange={handleChange}
                  rows="4"
                  placeholder="List the expected project deliverables..."
                  disabled={saving}
                />

              </div>


              {/* FINANCIAL */}

              <div className="admin-form-section">

                <h3>Project & Developer Payment</h3>

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
                      value={form.freelancer_payout}
                      onChange={handleChange}
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

                <h3>Timeline</h3>

                <div className="admin-form-grid">

                  <div className="admin-form-field">

                    <label>
                      Application Deadline
                    </label>

                    <input
                      type="date"
                      name="application_deadline"
                      value={form.application_deadline}
                      onChange={handleChange}
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
                      value={form.deadline}
                      onChange={handleChange}
                      disabled={saving}
                    />

                  </div>

                </div>

              </div>

            </div>


            {/* MODAL FOOTER */}

            <div className="admin-modal-footer">

              <button
                className="admin-secondary-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="admin-secondary-btn"
                onClick={() => saveOpportunity(false)}
                disabled={saving}
              >
                Save Draft
              </button>

              <button
                className="admin-primary-btn"
                onClick={() => saveOpportunity(true)}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Publish Opportunity"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
