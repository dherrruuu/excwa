import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";

import {
  getDeveloperInfoById,
  getDeveloperAccount,
  getDeveloperApplications,
  getDeveloperResumeUrl,
  updateDeveloperInfo,
  suspendDeveloper,
  reactivateDeveloper,
  deactivateDeveloper,
} from "../../services/admin/developerInfoService";

import "../../styles/admin/admin-developer-info.css";

export default function DeveloperInfoDetails({
  developerId,
  onBack,
  onUpdated,
}) {
  const [developer, setDeveloper] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  const [resumeUrl, setResumeUrl] = useState(null);

  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    city: "",
    primary_roles: [],
    github_url: "",
    linkedin_url: "",
    portfolio_url: "",
  });

  /* =========================================================
     LOAD DEVELOPER
  ========================================================= */

  useEffect(() => {
    if (!developerId) {
      setDeveloper(null);
      setLoading(false);
      setError("No developer ID was provided.");
      return;
    }

    loadDeveloper();
  }, [developerId]);

  async function loadDeveloper() {
    try {
      setLoading(true);
      setError("");
      setResumeUrl(null);

      console.log(
        "[DeveloperInfoDetails] Loading developer:",
        developerId
      );

      const data = await getDeveloperInfoById(developerId);

      if (!data) {
        throw new Error(
          "Developer profile was not found."
        );
      }

      console.log(
        "[DeveloperInfoDetails] Developer loaded:",
        data
      );

      setDeveloper(data);

      setForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        city: data.city || "",
        primary_roles: Array.isArray(data.primary_roles)
          ? data.primary_roles
          : [],
        github_url: data.github_url || "",
        linkedin_url: data.linkedin_url || "",
        portfolio_url: data.portfolio_url || "",
      });

      /*
       * Main profile is ready.
       */
      setLoading(false);

      /*
       * Load optional information independently.
       */
      if (data.user_id) {
        loadOptionalData(data.user_id);
      }

      /*
       * Load private resume independently.
       */
      if (data.resume_path || data.resume_url) {
        loadResume(
          data.resume_path || data.resume_url
        );
      }
    } catch (err) {
      console.error(
        "[DeveloperInfoDetails] Load error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load developer information."
      );

      setLoading(false);
    }
  }

  /* =========================================================
     LOAD OPTIONAL DATA
  ========================================================= */

  async function loadOptionalData(userId) {
    try {
      setLoadingExtras(true);

      const [
        account,
        applications,
      ] = await Promise.all([
        getDeveloperAccount(userId),
        getDeveloperApplications(userId),
      ]);

      console.log(
        "[DeveloperInfoDetails] Account:",
        account
      );

      console.log(
        "[DeveloperInfoDetails] Applications:",
        applications
      );

      setDeveloper((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          account: account || null,
          applications: applications || [],
        };
      });
    } catch (err) {
      /*
       * Optional data should never prevent
       * the main developer profile from loading.
       */
      console.error(
        "[DeveloperInfoDetails] Optional data error:",
        err
      );
    } finally {
      setLoadingExtras(false);
    }
  }

  /* =========================================================
     LOAD RESUME
  ========================================================= */

  async function loadResume(path) {
    try {
      setResumeLoading(true);
      setResumeUrl(null);

      console.log(
        "[DeveloperInfoDetails] Loading resume:",
        path
      );

      const url = await getDeveloperResumeUrl(path);

      if (url) {
        console.log(
          "[DeveloperInfoDetails] Resume URL created."
        );
      } else {
        console.warn(
          "[DeveloperInfoDetails] Resume URL could not be created."
        );
      }

      setResumeUrl(url);
    } catch (err) {
      console.error(
        "[DeveloperInfoDetails] Resume error:",
        err
      );

      setResumeUrl(null);
    } finally {
      setResumeLoading(false);
    }
  }

  /* =========================================================
     FORM
  ========================================================= */

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      const updated = await updateDeveloperInfo(
        developerId,
        form
      );

      setDeveloper((current) => ({
        ...current,
        ...updated,
      }));

      setEditing(false);

      onUpdated?.(updated);
    } catch (err) {
      console.error(
        "[DeveloperInfoDetails] Save error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update developer information."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     STATUS ACTIONS
  ========================================================= */

  async function handleStatusAction(action) {
    const labels = {
      suspend: "suspend this developer",
      reactivate: "reactivate this developer",
      deactivate: "deactivate this developer",
    };

    const confirmed = window.confirm(
      `Are you sure you want to ${labels[action]}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      let updated = null;

      if (action === "suspend") {
        updated = await suspendDeveloper(
          developerId
        );
      }

      if (action === "reactivate") {
        updated = await reactivateDeveloper(
          developerId
        );
      }

      if (action === "deactivate") {
        updated = await deactivateDeveloper(
          developerId
        );
      }

      if (!updated) {
        throw new Error(
          "Developer status was not updated."
        );
      }

      setDeveloper((current) => ({
        ...current,
        ...updated,
      }));

      onUpdated?.(updated);
    } catch (err) {
      console.error(
        "[DeveloperInfoDetails] Status error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update developer status."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =========================================================
     HELPERS
  ========================================================= */

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatStatus(status) {
    if (!status) {
      return "Unknown";
    }

    return status
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) => letter.toUpperCase()
      );
  }

  function getInitials(name) {
    if (!name) {
      return "D";
    }

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("");
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="developer-info-details-loading">
        <Loader2
          size={25}
          className="spin"
        />

        <span>
          Loading developer details...
        </span>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error && !developer) {
    return (
      <div className="developer-info-details-error">
        <ShieldAlert size={25} />

        <h3>
          Unable to load developer
        </h3>

        <p>{error}</p>

        <button
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back to Developers
        </button>
      </div>
    );
  }

  if (!developer) {
    return null;
  }

  /* =========================================================
     DATA
  ========================================================= */

  const roles = Array.isArray(
    developer.primary_roles
  )
    ? developer.primary_roles
    : [];

  const account =
    developer.account || null;

  const applications = Array.isArray(
    developer.applications
  )
    ? developer.applications
    : [];

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="developer-info-details">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="developer-details-header">

        <button
          type="button"
          className="developer-details-back"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Developers
        </button>

        <div className="developer-details-actions">

          {/* EDIT */}

          <button
            type="button"
            className="developer-details-edit"
            onClick={() =>
              setEditing((value) => !value)
            }
            disabled={
              saving ||
              actionLoading
            }
          >
            {editing ? (
              <>
                <X size={16} />
                Cancel
              </>
            ) : (
              <>
                <Pencil size={16} />
                Edit
              </>
            )}
          </button>

          {/* SUSPEND */}

          {developer.status === "approved" && (
            <button
              type="button"
              className="developer-details-warning"
              disabled={actionLoading}
              onClick={() =>
                handleStatusAction("suspend")
              }
            >
              <ShieldAlert size={16} />
              Suspend
            </button>
          )}

          {/* REACTIVATE */}

          {developer.status === "suspended" && (
            <button
              type="button"
              className="developer-details-success"
              disabled={actionLoading}
              onClick={() =>
                handleStatusAction("reactivate")
              }
            >
              <CheckCircle2 size={16} />
              Reactivate
            </button>
          )}

          {/* DEACTIVATE */}

          {developer.status !== "deactivated" && (
            <button
              type="button"
              className="developer-details-danger"
              disabled={actionLoading}
              onClick={() =>
                handleStatusAction("deactivate")
              }
            >
              <ShieldAlert size={16} />
              Deactivate
            </button>
          )}

        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="developer-details-inline-error">
          <ShieldAlert size={17} />
          <span>{error}</span>
        </div>
      )}

      {/* =====================================================
          HERO
      ===================================================== */}

      <div className="developer-details-hero">

        <div className="developer-details-profile">

          {developer.profile_photo_url ? (
            <img
              src={developer.profile_photo_url}
              alt={
                developer.full_name ||
                "Developer"
              }
              className="developer-details-avatar"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />
          ) : (
            <div className="developer-details-avatar developer-details-avatar-fallback">
              {getInitials(
                developer.full_name
              )}
            </div>
          )}

          <div>

            <div className="developer-details-name-row">

              <h1>
                {developer.full_name ||
                  "Unnamed Developer"}
              </h1>

              <span
                className={`developer-info-status status-${developer.status}`}
              >
                {formatStatus(
                  developer.status
                )}
              </span>

            </div>

            <p>
              Developer ID:{" "}
              <code>
                {developer.id}
              </code>
            </p>

          </div>
        </div>

        <div className="developer-details-joined">

          <CalendarDays size={16} />

          <div>
            <span>
              Joined
            </span>

            <strong>
              {formatDate(
                developer.created_at
              )}
            </strong>
          </div>

        </div>
      </div>

      {/* =====================================================
          EDIT FORM
      ===================================================== */}

      {editing && (
        <section className="developer-details-card">

          <CardHeader
            label="PROFILE MANAGEMENT"
            title="Edit Developer"
            icon={<Pencil size={19} />}
          />

          <div className="developer-details-form-grid">

            <FormField
              label="Full Name"
              value={form.full_name}
              onChange={(value) =>
                updateField(
                  "full_name",
                  value
                )
              }
            />

            <FormField
              label="Phone"
              value={form.phone}
              onChange={(value) =>
                updateField(
                  "phone",
                  value
                )
              }
            />

            <FormField
              label="City"
              value={form.city}
              onChange={(value) =>
                updateField(
                  "city",
                  value
                )
              }
            />

            <FormField
              label="Primary Roles"
              value={form.primary_roles.join(
                ", "
              )}
              onChange={(value) =>
                updateField(
                  "primary_roles",
                  value
                    .split(",")
                    .map((role) =>
                      role.trim()
                    )
                    .filter(Boolean)
                )
              }
              placeholder="React Developer, Full Stack Developer"
            />

            <FormField
              label="GitHub URL"
              value={form.github_url}
              onChange={(value) =>
                updateField(
                  "github_url",
                  value
                )
              }
            />

            <FormField
              label="LinkedIn URL"
              value={form.linkedin_url}
              onChange={(value) =>
                updateField(
                  "linkedin_url",
                  value
                )
              }
            />

            <FormField
              label="Portfolio URL"
              value={form.portfolio_url}
              onChange={(value) =>
                updateField(
                  "portfolio_url",
                  value
                )
              }
              full
            />

          </div>

          <div className="developer-details-save-row">

            <button
              type="button"
              className="developer-details-cancel"
              disabled={saving}
              onClick={() =>
                setEditing(false)
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="developer-details-save"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? (
                <>
                  <Loader2
                    size={16}
                    className="spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={16}
                  />
                  Save Changes
                </>
              )}
            </button>

          </div>

        </section>
      )}

      {/* =====================================================
          BASIC INFORMATION
      ===================================================== */}

      <section className="developer-details-card">

        <CardHeader
          label="DEVELOPER PROFILE"
          title="Basic Information"
          icon={<UserRound size={19} />}
        />

        <div className="developer-details-info-grid">

          <InfoItem
            icon={<UserRound size={16} />}
            label="Full Name"
            value={developer.full_name}
          />

          <InfoItem
            icon={<Phone size={16} />}
            label="Phone"
            value={developer.phone}
          />

          <InfoItem
            icon={<MapPin size={16} />}
            label="City"
            value={developer.city}
          />

          <InfoItem
            icon={<BriefcaseBusiness size={16} />}
            label="Primary Roles"
            value={
              roles.length > 0
                ? roles.join(", ")
                : "Not available"
            }
          />

          <InfoItem
            icon={<Code2 size={16} />}
            label="Developer ID"
            value={developer.id}
            mono
          />

          <InfoItem
            icon={<Code2 size={16} />}
            label="User ID"
            value={developer.user_id}
            mono
          />

        </div>

      </section>

      {/* =====================================================
          ACCOUNT
      ===================================================== */}

      <section className="developer-details-card">

        <CardHeader
          label="ACCOUNT"
          title="Account Information"
          icon={<Shield size={19} />}
        />

        <div className="developer-details-info-grid">

          <InfoItem
            icon={<Mail size={16} />}
            label="Email"
            value={
              account?.email ||
              applications[0]?.email
            }
          />

          <InfoItem
            icon={<Shield size={16} />}
            label="Account Role"
            value={account?.role}
          />

          <InfoItem
            icon={<CalendarDays size={16} />}
            label="Account Created"
            value={formatDateTime(
              account?.created_at
            )}
          />

          <InfoItem
            icon={<CalendarDays size={16} />}
            label="Last Profile Update"
            value={formatDateTime(
              developer.updated_at
            )}
          />

        </div>

        {loadingExtras && (
          <div className="developer-details-loading-small">

            <Loader2
              size={14}
              className="spin"
            />

            Loading account information...

          </div>
        )}

      </section>

      {/* =====================================================
          PROFESSIONAL
      ===================================================== */}

      <section className="developer-details-card">

        <CardHeader
          label="PROFESSIONAL"
          title="Developer Links & Skills"
          icon={
            <BriefcaseBusiness size={19} />
          }
        />

        {/* ROLES */}

        <div className="developer-details-role-block">

          <span>
            Primary Roles
          </span>

          <div className="developer-details-role-list">

            {roles.length > 0 ? (
              roles.map((role) => (
                <span key={role}>
                  {role}
                </span>
              ))
            ) : (
              <small>
                No roles listed
              </small>
            )}

          </div>

        </div>

        {/* LINKS */}

        <div className="developer-details-links">

          <ExternalLinkItem
            icon={<Code2 size={17} />}
            label="GitHub"
            value={developer.github_url}
          />

          <ExternalLinkItem
            icon={<Code2 size={17} />}
            label="LinkedIn"
            value={developer.linkedin_url}
          />

          <ExternalLinkItem
            icon={<ExternalLink size={17} />}
            label="Portfolio"
            value={developer.portfolio_url}
          />

          {/* RESUME */}

          <ResumeLinkItem
            icon={<FileText size={17} />}
            label="Resume"
            url={resumeUrl}
            loading={resumeLoading}
            uploaded={Boolean(
              developer.resume_path ||
              developer.resume_url
            )}
          />

        </div>

      </section>

      {/* =====================================================
          APPLICATION HISTORY
      ===================================================== */}

      <section className="developer-details-card">

        <CardHeader
          label="HISTORY"
          title="Application History"
          icon={
            <BriefcaseBusiness size={19} />
          }
        />

        {applications.length === 0 ? (
          <div className="developer-details-empty">

            {loadingExtras
              ? "Loading application history..."
              : "No application history found."}

          </div>
        ) : (
          <div className="developer-details-history">

            {applications.map(
              (application) => (
                <div
                  key={application.id}
                  className="developer-details-history-row"
                >

                  <div>

                    <strong>
                      {application.email ||
                        application.full_name ||
                        "Developer Application"}
                    </strong>

                    <span>
                      Submitted{" "}
                      {formatDate(
                        application.created_at
                      )}
                    </span>

                  </div>

                  <span
                    className={`developer-info-status status-${application.status}`}
                  >
                    {formatStatus(
                      application.status
                    )}
                  </span>

                </div>
              )
            )}

          </div>
        )}

      </section>

      {/* =====================================================
          STATUS
      ===================================================== */}

      <section className="developer-details-status-card">

        <div>

          <span>
            Current Developer Status
          </span>

          <strong>
            {formatStatus(
              developer.status
            )}
          </strong>

          <small>
            Updated{" "}
            {formatDateTime(
              developer.updated_at
            )}
          </small>

        </div>

        <div className="developer-details-status-icon">

          {developer.status ===
          "approved" ? (
            <CheckCircle2 size={22} />
          ) : (
            <ShieldAlert size={22} />
          )}

        </div>

      </section>

    </div>
  );
}

/* =========================================================
   CARD HEADER
========================================================= */

function CardHeader({
  label,
  title,
  icon,
}) {
  return (
    <div className="developer-details-card-header">

      <div>

        <span className="developer-details-section-label">
          {label}
        </span>

        <h2>
          {title}
        </h2>

      </div>

      <div className="developer-details-card-icon">
        {icon}
      </div>

    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  value,
  onChange,
  placeholder = "",
  full = false,
}) {
  return (
    <label
      className={
        full
          ? "developer-details-form-field developer-details-form-full"
          : "developer-details-form-field"
      }
    >

      <span>
        {label}
      </span>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />

    </label>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  icon,
  label,
  value,
  mono = false,
}) {
  return (
    <div className="developer-details-info-item">

      <div className="developer-details-info-icon">
        {icon}
      </div>

      <div className="developer-details-info-content">

        <span>
          {label}
        </span>

        <strong
          className={
            mono ? "mono" : ""
          }
        >
          {value || "—"}
        </strong>

      </div>

    </div>
  );
}

/* =========================================================
   EXTERNAL LINK
========================================================= */

function ExternalLinkItem({
  icon,
  label,
  value,
  emptyText = "Not provided",
}) {
  function normalizeUrl(url) {
    if (!url) {
      return null;
    }

    const clean = String(url).trim();

    if (!clean) {
      return null;
    }

    if (
      clean.startsWith("http://") ||
      clean.startsWith("https://")
    ) {
      return clean;
    }

    return `https://${clean}`;
  }

  const href = normalizeUrl(value);

  return (
    <div className="developer-details-link-item">

      <div className="developer-details-link-icon">
        {icon}
      </div>

      <div className="developer-details-link-content">

        <span>
          {label}
        </span>

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="developer-details-open-link"
          >
            Open
            <ExternalLink size={12} />
          </a>
        ) : (
          <small>
            {emptyText}
          </small>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   RESUME LINK
========================================================= */

function ResumeLinkItem({
  icon,
  label,
  url,
  loading,
  uploaded,
}) {
  return (
    <div className="developer-details-link-item">

      <div className="developer-details-link-icon">
        {icon}
      </div>

      <div className="developer-details-link-content">

        <span>
          {label}
        </span>

        {loading ? (
          <small
            className="developer-details-loading-link"
          >
            <Loader2
              size={13}
              className="spin"
            />

            Loading...
          </small>
        ) : url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="developer-details-open-link"
          >
            Open Resume
            <ExternalLink size={12} />
          </a>
        ) : uploaded ? (
          <small>
            Resume uploaded, but unavailable.
          </small>
        ) : (
          <small>
            Resume not uploaded
          </small>
        )}

      </div>

    </div>
  );
}