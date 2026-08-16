import { useEffect, useState } from "react";

import "../../styles/admin/admin-developers.css";

import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Calendar,
  User,
  Globe,
  Trash2,
  UserX,
} from "lucide-react";

import {
  getDeveloperApplications,
  approveDeveloperApplication,
  rejectDeveloperApplication,
  deleteDeveloperApplication,
  deleteDeveloper,
} from "../../services/admin/adminDeveloperService";

export default function AdminDevelopers() {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("pending");

  const [showRejectBox, setShowRejectBox] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  /* =========================================================
     LOAD APPLICATIONS
  ========================================================= */

  async function loadApplications() {
    setLoading(true);

    try {
      const data = await getDeveloperApplications();

      setApplications(data || []);

      setSelectedApplication((current) => {
        if (!current) {
          return null;
        }

        const updated = (data || []).find(
          (item) => item.id === current.id
        );

        return updated || null;
      });
    } catch (error) {
      console.error(
        "Failed to load developer applications:",
        error
      );

      alert(
        error?.message ||
          "Unable to load developer applications."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadApplications();
  }, []);

  /* =========================================================
     SEARCH + FILTER
  ========================================================= */

  const filteredApplications = applications.filter(
    (application) => {
      const value = search.trim().toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        application.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!value) {
        return true;
      }

      const name =
        application.full_name?.toLowerCase() || "";

      const email =
        application.email?.toLowerCase() || "";

      const phone =
        application.phone?.toLowerCase() || "";

      const city =
        application.city?.toLowerCase() || "";

      const education =
        application.education?.toLowerCase() || "";

      const roles = Array.isArray(
        application.primary_roles
      )
        ? application.primary_roles
            .join(" ")
            .toLowerCase()
        : String(
            application.primary_roles || ""
          ).toLowerCase();

      return (
        name.includes(value) ||
        email.includes(value) ||
        phone.includes(value) ||
        city.includes(value) ||
        education.includes(value) ||
        roles.includes(value)
      );
    }
  );

  /* =========================================================
     ACCEPT APPLICATION
  ========================================================= */

  async function acceptApplication() {
    if (!selectedApplication?.id) {
      return;
    }

    setActionLoading(true);

    try {
      const result =
        await approveDeveloperApplication(
          selectedApplication.id
        );

      const updatedApplication =
        result.application;

      setApplications((previous) =>
        previous.map((item) =>
          item.id === updatedApplication.id
            ? updatedApplication
            : item
        )
      );

      setSelectedApplication(
        updatedApplication
      );

      alert(
        result.message ||
          "Developer application accepted successfully."
      );
    } catch (error) {
      console.error(
        "Failed to accept developer application:",
        error
      );

      alert(
        error?.message ||
          "Unable to accept developer application."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =========================================================
     REJECT APPLICATION
  ========================================================= */

  async function rejectApplication() {
    if (!selectedApplication?.id) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (!reason) {
      alert(
        "Please enter a rejection reason."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Reject ${
          selectedApplication.full_name ||
          "this applicant"
        }'s application?\n\nReason: ${reason}`
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      const result =
        await rejectDeveloperApplication(
          selectedApplication.id,
          reason
        );

      const updatedApplication =
        result.application;

      setApplications((previous) =>
        previous.map((item) =>
          item.id === updatedApplication.id
            ? updatedApplication
            : item
        )
      );

      setSelectedApplication(
        updatedApplication
      );

      setShowRejectBox(false);
      setRejectionReason("");

      alert(
        result.message ||
          "Developer application rejected successfully."
      );
    } catch (error) {
      console.error(
        "Failed to reject developer application:",
        error
      );

      alert(
        error?.message ||
          "Unable to reject developer application."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =========================================================
     DELETE APPLICATION
  ========================================================= */

  async function deleteApplication() {
    if (!selectedApplication?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete the application from ${
          selectedApplication.full_name ||
          "this applicant"
        }?\n\nThis will permanently remove the application and uploaded documents.\n\nThis does NOT delete an existing developer account.`
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      const applicationId =
        selectedApplication.id;

      const result =
        await deleteDeveloperApplication(
          applicationId
        );

      setApplications((previous) =>
        previous.filter(
          (item) =>
            item.id !== applicationId
        )
      );

      setSelectedApplication(null);
      setShowRejectBox(false);
      setRejectionReason("");

      if (
        result.storageErrors?.length
      ) {
        alert(
          `Application deleted successfully.\n\nHowever, these files could not be removed:\n${result.storageErrors.join(
            ", "
          )}`
        );
      } else {
        alert(
          "Application deleted successfully."
        );
      }
    } catch (error) {
      console.error(
        "Failed to delete developer application:",
        error
      );

      alert(
        error?.message ||
          "Unable to delete developer application."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =========================================================
     REMOVE DEVELOPER ACCOUNT
  ========================================================= */

  async function removeDeveloper() {
    if (!selectedApplication) {
      return;
    }

    if (
      selectedApplication.status !==
      "accepted"
    ) {
      alert(
        "Only an accepted developer can be removed from EXCWA."
      );

      return;
    }

    const developerUserId =
      selectedApplication.developer_user_id;

    if (!developerUserId) {
      alert(
        "This developer does not have a linked authentication user ID."
      );

      return;
    }

    const developerName =
      selectedApplication.full_name ||
      "this developer";

    const developerEmail =
      selectedApplication.email ||
      "";

    const firstConfirmation =
      window.confirm(
        `PERMANENTLY REMOVE DEVELOPER\n\n` +
          `${developerName}\n` +
          `${developerEmail}\n\n` +
          `This will permanently delete the developer's EXCWA account, including:\n\n` +
          `• Authentication account\n` +
          `• Profile\n` +
          `• Developer profile\n` +
          `• Developer skills\n` +
          `• Opportunity applications\n` +
          `• Project assignments\n` +
          `• Project submissions\n\n` +
          `This action cannot be undone.\n\n` +
          `Continue?`
      );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation =
      window.confirm(
        `FINAL CONFIRMATION\n\n` +
          `You are about to permanently delete:\n\n` +
          `${developerName}\n` +
          `${developerEmail}\n\n` +
          `Delete this developer account permanently?`
      );

    if (!secondConfirmation) {
      return;
    }

    setActionLoading(true);

    try {
      const result =
        await deleteDeveloper(
          developerUserId
        );

      setApplications((previous) =>
        previous.filter(
          (item) =>
            item.developer_user_id !==
            developerUserId
        )
      );

      setSelectedApplication(null);
      setShowRejectBox(false);
      setRejectionReason("");

      if (
        result.storage_errors?.length
      ) {
        alert(
          `Developer account deleted successfully.\n\n` +
            `However, these storage items could not be removed:\n` +
            result.storage_errors.join(
              ", "
            )
        );
      } else {
        alert(
          result.message ||
            "Developer account deleted successfully."
        );
      }
    } catch (error) {
      console.error(
        "Failed to remove developer account:",
        error
      );

      alert(
        error?.message ||
          "Unable to remove developer account."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =========================================================
     OPEN APPLICATION
  ========================================================= */

  function openApplication(
    application
  ) {
    setSelectedApplication(
      application
    );

    setShowRejectBox(false);
    setRejectionReason("");
  }

  /* =========================================================
     CLOSE APPLICATION
  ========================================================= */

  function closeApplication() {
    if (actionLoading) {
      return;
    }

    setSelectedApplication(null);
    setShowRejectBox(false);
    setRejectionReason("");
  }

  /* =========================================================
     STATUS CLASS
  ========================================================= */

  function getStatusClass(status) {
    return `developer-status developer-status-${status}`;
  }

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="admin-developers-page">

      <div className="admin-page-header">

        <div>
          <h1>
            Developer Applications
          </h1>

          <p>
            Review and manage freelancers
            who want to join EXCWA Tech.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={loadApplications}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "spin"
                : ""
            }
          />

          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>

      <div className="developer-controls">

        <div className="developer-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search by name, email, phone, city or role..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          className="developer-status-filter"
        >
          <option value="pending">
            Pending
          </option>

          <option value="accepted">
            Accepted
          </option>

          <option value="rejected">
            Rejected
          </option>

          <option value="all">
            All Applications
          </option>
        </select>

      </div>

      <div className="developer-table-card">

        {loading ? (

          <div className="developer-empty">
            Loading applications...
          </div>

        ) : filteredApplications.length === 0 ? (

          <div className="developer-empty">

            <div>
              No developer applications found.
            </div>

            <p>
              {search
                ? "Try changing your search."
                : statusFilter === "pending"
                  ? "There are currently no pending developer applications."
                  : statusFilter === "accepted"
                    ? "There are currently no accepted developer applications."
                    : statusFilter === "rejected"
                      ? "There are currently no rejected developer applications."
                      : "There are currently no developer applications."}
            </p>

          </div>

        ) : (

          <div className="developer-table-wrapper">

            <table className="developer-table">

              <thead>
                <tr>

                  <th>
                    Applicant
                  </th>

                  <th>
                    Contact
                  </th>

                  <th>
                    Location
                  </th>

                  <th>
                    Roles
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Submitted
                  </th>

                  <th>
                    Action
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredApplications.map(
                  (application) => (

                    <tr
                      key={
                        application.id
                      }
                    >

                      <td>

                        <div className="developer-name">
                          {
                            application.full_name ||
                            "—"
                          }
                        </div>

                        <div className="developer-email">
                          {
                            application.email ||
                            "—"
                          }
                        </div>

                      </td>

                      <td>
                        {
                          application.phone ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          application.city ||
                          "—"
                        }
                      </td>

                      <td>

                        <div className="developer-role-list">

                          {(
                            Array.isArray(
                              application.primary_roles
                            )
                              ? application.primary_roles
                              : []
                          )
                            .slice(0, 2)
                            .map(
                              (role) => (

                                <span
                                  key={role}
                                  className="developer-role"
                                >
                                  {role}
                                </span>

                              )
                            )}

                          {(
                            Array.isArray(
                              application.primary_roles
                            )
                              ? application.primary_roles
                              : []
                          ).length > 2 && (

                            <span className="developer-role">

                              +
                              {(
                                application.primary_roles
                                  .length -
                                2
                              )}

                            </span>

                          )}

                        </div>

                      </td>

                      <td>

                        <span
                          className={getStatusClass(
                            application.status
                          )}
                        >
                          {
                            application.status
                          }
                        </span>

                      </td>

                      <td>
                        {formatDate(
                          application.created_at
                        )}
                      </td>

                      <td>

                        <button
                          type="button"
                          className="developer-view-button"
                          onClick={() =>
                            openApplication(
                              application
                            )
                          }
                        >

                          <Eye
                            size={16}
                          />

                          View

                        </button>

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
          APPLICATION DETAILS MODAL
      ===================================================== */}

      {selectedApplication && (

        <div
          className="developer-modal-overlay"
          onClick={
            closeApplication
          }
        >

          <div
            className="developer-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="developer-modal-header">

              <div>

                <h2>
                  {
                    selectedApplication.full_name ||
                    "Developer Application"
                  }
                </h2>

                <p>
                  Developer Application
                </p>

              </div>

              <button
                type="button"
                className="developer-modal-close"
                onClick={
                  closeApplication
                }
                disabled={
                  actionLoading
                }
              >
                ×
              </button>

            </div>

            <div className="developer-profile-section">

              {selectedApplication.profile_photo_url ? (

                <img
                  src={
                    selectedApplication.profile_photo_url
                  }
                  alt={
                    selectedApplication.full_name ||
                    "Developer"
                  }
                  className="developer-profile-photo"
                />

              ) : (

                <div className="developer-profile-placeholder">

                  {selectedApplication
                    .full_name
                    ?.charAt(0)
                    .toUpperCase() || "D"}

                </div>

              )}

              <div className="developer-profile-main">

                <h3>
                  {
                    selectedApplication.full_name ||
                    "—"
                  }
                </h3>

                <div className="developer-profile-contact">

                  <span>
                    <Mail size={14} />

                    {
                      selectedApplication.email ||
                      "—"
                    }
                  </span>

                  <span>
                    <Phone size={14} />

                    {
                      selectedApplication.phone ||
                      "—"
                    }
                  </span>

                  <span>
                    <MapPin size={14} />

                    {
                      selectedApplication.city ||
                      "—"
                    }
                  </span>

                </div>

                <span
                  className={getStatusClass(
                    selectedApplication.status
                  )}
                >
                  {
                    selectedApplication.status
                  }
                </span>

              </div>

            </div>

            <ApplicationSection
              icon={
                <User size={18} />
              }
              title="Personal Information"
            >

              <Detail
                label="Full Name"
                value={
                  selectedApplication.full_name
                }
              />

              <Detail
                label="Email"
                value={
                  selectedApplication.email
                }
              />

              <Detail
                label="Phone"
                value={
                  selectedApplication.phone
                }
              />

              <Detail
                label="City"
                value={
                  selectedApplication.city
                }
              />

            </ApplicationSection>

            <ApplicationSection
              icon={
                <Briefcase size={18} />
              }
              title="Professional Information"
            >

              <Detail
                icon={
                  <GraduationCap
                    size={15}
                  />
                }
                label="Education"
                value={
                  selectedApplication.education
                }
              />

              <div className="developer-detail-full">

                <span>
                  Freelancer Roles
                </span>

                <div className="developer-role-list developer-role-list-large">

                  {(
                    Array.isArray(
                      selectedApplication.primary_roles
                    )
                      ? selectedApplication.primary_roles
                      : []
                  ).map(
                    (role) => (

                      <span
                        key={role}
                        className="developer-role"
                      >
                        {role}
                      </span>

                    )
                  )}

                </div>

              </div>

            </ApplicationSection>

            <ApplicationSection
              icon={
                <Globe size={18} />
              }
              title="Online Profiles"
            >

              <div className="developer-links-grid">

                {selectedApplication.github_url ? (

                  <ProfileLink
                    label="GitHub"
                    url={
                      selectedApplication.github_url
                    }
                  />

                ) : (

                  <UnavailableLink
                    label="GitHub"
                  />

                )}

                {selectedApplication.linkedin_url ? (

                  <ProfileLink
                    label="LinkedIn"
                    url={
                      selectedApplication.linkedin_url
                    }
                  />

                ) : (

                  <UnavailableLink
                    label="LinkedIn"
                  />

                )}

                {selectedApplication.portfolio_url ? (

                  <ProfileLink
                    label="Portfolio"
                    url={
                      selectedApplication.portfolio_url
                    }
                  />

                ) : (

                  <UnavailableLink
                    label="Portfolio"
                  />

                )}

              </div>

            </ApplicationSection>

            <ApplicationSection
              icon={
                <FileText size={18} />
              }
              title="Submitted Documents"
            >

              <div className="developer-files">

                {selectedApplication.profile_photo_url && (

                  <a
                    href={
                      selectedApplication.profile_photo_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="developer-file-button"
                  >

                    <User size={15} />

                    View Profile Photo

                    <ExternalLink
                      size={14}
                    />

                  </a>

                )}

                {selectedApplication.resume_url && (

                  <a
                    href={
                      selectedApplication.resume_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="developer-file-button"
                  >

                    <FileText
                      size={15}
                    />

                    View Resume

                    <ExternalLink
                      size={14}
                    />

                  </a>

                )}

                {!selectedApplication.profile_photo_url &&
                  !selectedApplication.resume_url && (

                    <p>
                      No documents
                      available.
                    </p>

                  )}

              </div>

            </ApplicationSection>

            <ApplicationSection
              icon={
                <Calendar size={18} />
              }
              title="Application Information"
            >

              <Detail
                label="Application ID"
                value={
                  selectedApplication.id
                }
              />

              <Detail
                label="Developer User ID"
                value={
                  selectedApplication.developer_user_id
                }
              />

              <Detail
                label="Status"
                value={
                  selectedApplication.status
                }
              />

              <Detail
                label="Submitted On"
                value={formatDate(
                  selectedApplication.created_at
                )}
              />

              <Detail
                label="Last Updated"
                value={formatDate(
                  selectedApplication.updated_at
                )}
              />

              {selectedApplication.reviewed_at && (

                <Detail
                  label="Reviewed On"
                  value={formatDate(
                    selectedApplication.reviewed_at
                  )}
                />

              )}

              {selectedApplication.rejection_reason && (

                <div className="developer-detail-full">

                  <span>
                    Rejection Reason
                  </span>

                  <strong>
                    {
                      selectedApplication.rejection_reason
                    }
                  </strong>

                </div>

              )}

            </ApplicationSection>

            {/* =================================================
                PENDING ACTIONS
            ================================================= */}

            {selectedApplication.status ===
              "pending" && (

              <div className="developer-actions">

                {!showRejectBox ? (

                  <>

                    <button
                      type="button"
                      className="developer-reject-button"
                      onClick={() =>
                        setShowRejectBox(
                          true
                        )
                      }
                      disabled={
                        actionLoading
                      }
                    >

                      <XCircle
                        size={17}
                      />

                      Reject

                    </button>

                    <button
                      type="button"
                      className="developer-accept-button"
                      onClick={
                        acceptApplication
                      }
                      disabled={
                        actionLoading
                      }
                    >

                      <CheckCircle
                        size={17}
                      />

                      {actionLoading
                        ? "Processing..."
                        : "Accept"}

                    </button>

                  </>

                ) : (

                  <div className="developer-reject-box">

                    <label>
                      Rejection Reason
                    </label>

                    <textarea
                      value={
                        rejectionReason
                      }
                      onChange={(event) =>
                        setRejectionReason(
                          event.target.value
                        )
                      }
                      placeholder="Enter reason for rejection..."
                      rows={4}
                      disabled={
                        actionLoading
                      }
                    />

                    <p>
                      The application will be
                      marked as rejected and the
                      rejection reason will be
                      preserved.
                    </p>

                    <div className="developer-reject-actions">

                      <button
                        type="button"
                        onClick={() => {
                          setShowRejectBox(
                            false
                          );

                          setRejectionReason(
                            ""
                          );
                        }}
                        disabled={
                          actionLoading
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="developer-confirm-reject"
                        onClick={
                          rejectApplication
                        }
                        disabled={
                          actionLoading
                        }
                      >

                        {actionLoading
                          ? "Rejecting..."
                          : "Confirm Rejection"}

                      </button>

                    </div>

                  </div>

                )}

              </div>

            )}

            {/* =================================================
                ACCEPTED DEVELOPER ACCOUNT ACTION
            ================================================= */}

            {selectedApplication.status ===
              "accepted" && (

              <div className="developer-account-section">

                <div className="developer-account-warning">

                  <UserX
                    size={20}
                  />

                  <div>

                    <strong>
                      Developer Account
                    </strong>

                    <p>
                      This application belongs to
                      an active EXCWA developer account.
                      Removing the account permanently
                      deletes the developer and related
                      project data.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className="developer-remove-account-button"
                  onClick={
                    removeDeveloper
                  }
                  disabled={
                    actionLoading ||
                    !selectedApplication.developer_user_id
                  }
                >

                  <UserX
                    size={17}
                  />

                  {actionLoading
                    ? "Removing Developer..."
                    : "Remove Developer Account"}

                </button>

                {!selectedApplication.developer_user_id && (

                  <p className="developer-account-error">
                    Developer user ID is missing.
                    This account cannot be removed
                    until the application is linked
                    to its authentication user.
                  </p>

                )}

              </div>

            )}

            {/* =================================================
                DELETE APPLICATION
            ================================================= */}

            <div className="developer-delete-section">

              <button
                type="button"
                className="developer-delete-button"
                onClick={
                  deleteApplication
                }
                disabled={
                  actionLoading
                }
              >

                <Trash2
                  size={16}
                />

                Delete Application

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

/* =============================================================
   APPLICATION SECTION
============================================================= */

function ApplicationSection({
  icon,
  title,
  children,
}) {
  return (
    <section className="developer-application-section">

      <div className="developer-section-title">

        {icon}

        <h3>
          {title}
        </h3>

      </div>

      <div className="developer-section-content">

        {children}

      </div>

    </section>
  );
}

/* =============================================================
   DETAIL
============================================================= */

function Detail({
  label,
  value,
  icon,
}) {
  return (
    <div className="developer-detail">

      <span>

        {icon}

        {label}

      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}

/* =============================================================
   PROFILE LINK
============================================================= */

function ProfileLink({
  label,
  url,
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="developer-profile-link"
    >

      <span>
        {label}
      </span>

      <ExternalLink
        size={14}
      />

    </a>
  );
}

/* =============================================================
   UNAVAILABLE LINK
============================================================= */

function UnavailableLink({
  label,
}) {
  return (
    <div className="developer-profile-link developer-profile-link-disabled">

      <span>
        {label}
      </span>

      <span>
        Not provided
      </span>

    </div>
  );
}