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
} from "lucide-react";

import {
  getDeveloperApplications,
  approveDeveloperApplication,
  rejectDeveloperApplication,
  deleteDeveloperApplication,
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
      const data =
        await getDeveloperApplications();

      setApplications(data || []);

      /*
       * Keep the currently opened application
       * synchronized after refresh.
       */

      setSelectedApplication((current) => {
        if (!current) {
          return null;
        }

        const updated =
          (data || []).find(
            (item) =>
              item.id === current.id
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

  const filteredApplications =
    applications.filter(
      (application) => {
        const value =
          search.trim().toLowerCase();

        /*
         * Status is already filtered from the
         * database list in the UI below.
         */

        const matchesStatus =
          statusFilter === "all" ||
          application.status ===
            statusFilter;

        if (!matchesStatus) {
          return false;
        }

        if (!value) {
          return true;
        }

        const name =
          application.full_name
            ?.toLowerCase() || "";

        const email =
          application.email
            ?.toLowerCase() || "";

        const phone =
          application.phone
            ?.toLowerCase() || "";

        const city =
          application.city
            ?.toLowerCase() || "";

        const education =
          application.education
            ?.toLowerCase() || "";

        const roles =
          Array.isArray(
            application.primary_roles
          )
            ? application.primary_roles
                .join(" ")
                .toLowerCase()
            : String(
                application.primary_roles ||
                  ""
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
  =========================================================

     IMPORTANT:

     There is NO direct Supabase update here.

     This calls:

        approveDeveloperApplication()

     which calls:

        approve-developer

     Edge Function.

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

      /*
       * Update table.
       */

      setApplications((previous) =>
        previous.map((item) =>
          item.id ===
          updatedApplication.id
            ? updatedApplication
            : item
        )
      );

      /*
       * Update modal.
       */

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
  =========================================================

     IMPORTANT:

     Rejection DOES NOT delete the application.

     It changes:

        pending → rejected

     The rejection reason is preserved.

     The service calls:

        reject-developer

     Edge Function.

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
        `Reject ${selectedApplication.full_name || "this applicant"}'s application?\n\nReason: ${reason}`
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

      /*
       * Update the existing row.
       */

      setApplications((previous) =>
        previous.map((item) =>
          item.id ===
          updatedApplication.id
            ? updatedApplication
            : item
        )
      );

      /*
       * Keep modal open and show
       * the newly rejected application.
       */

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
  =========================================================

     Delete is a separate permanent action.

     This calls:

        deleteDeveloperApplication()

     The service removes:

        1. Profile photo
        2. Resume
        3. Application database record

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
        }?\n\nThis will permanently remove the application and uploaded documents.`
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

      /*
       * Remove from table.
       */

      setApplications((previous) =>
        previous.filter(
          (item) =>
            item.id !== applicationId
        )
      );

      /*
       * Close modal.
       */

      setSelectedApplication(null);
      setShowRejectBox(false);
      setRejectionReason("");

      if (
        result.storageErrors?.length
      ) {
        alert(
          `Application deleted successfully.\n\nHowever, these files could not be removed: ${result.storageErrors.join(
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

  function getStatusClass(
    status
  ) {
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

      {/* =====================================================
          HEADER
      ===================================================== */}

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


      {/* =====================================================
          SEARCH / FILTER
      ===================================================== */}

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


      {/* =====================================================
          TABLE
      ===================================================== */}

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

                      {/* APPLICANT */}

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


                      {/* CONTACT */}

                      <td>
                        {
                          application.phone ||
                          "—"
                        }
                      </td>


                      {/* LOCATION */}

                      <td>
                        {
                          application.city ||
                          "—"
                        }
                      </td>


                      {/* ROLES */}

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


                      {/* STATUS */}

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


                      {/* DATE */}

                      <td>

                        {formatDate(
                          application.created_at
                        )}

                      </td>


                      {/* VIEW */}

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

            {/* =================================================
                MODAL HEADER
            ================================================= */}

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


            {/* =================================================
                PROFILE
            ================================================= */}

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


            {/* =================================================
                PERSONAL INFORMATION
            ================================================= */}

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


            {/* =================================================
                PROFESSIONAL INFORMATION
            ================================================= */}

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


            {/* =================================================
                ONLINE PROFILES
            ================================================= */}

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


            {/* =================================================
                DOCUMENTS
            ================================================= */}

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


            {/* =================================================
                APPLICATION INFORMATION
            ================================================= */}

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
                MANUAL DELETE
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