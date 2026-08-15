import { useEffect, useState } from "react";
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

import { supabase } from "../lib/supabase";

export default function AdminDevelopers() {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  /* =========================================================
     LOAD APPLICATIONS
     ========================================================= */

  async function loadApplications() {
    setLoading(true);

    try {
      let query = supabase
        .from("developer_applications")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setApplications(data || []);
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

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  /* =========================================================
     SEARCH
     ========================================================= */

  const filteredApplications = applications.filter(
    (application) => {
      const value = search.trim().toLowerCase();

      if (!value) {
        return true;
      }

      return (
        application.full_name
          ?.toLowerCase()
          .includes(value) ||
        application.email
          ?.toLowerCase()
          .includes(value) ||
        application.phone
          ?.toLowerCase()
          .includes(value) ||
        application.city
          ?.toLowerCase()
          .includes(value)
      );
    }
  );

  /* =========================================================
     ACCEPT APPLICATION
     ========================================================= */

  async function acceptApplication() {
    if (!selectedApplication) {
      return;
    }

    setActionLoading(true);

    try {
      const { data, error } = await supabase
        .from("developer_applications")
        .update({
          status: "accepted",
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", selectedApplication.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setApplications((previous) =>
        previous.map((item) =>
          item.id === data.id ? data : item
        )
      );

      setSelectedApplication(data);

      alert(
        "Developer application accepted."
      );
    } catch (error) {
      console.error(
        "Failed to accept application:",
        error
      );

      alert(
        error?.message ||
          "Unable to accept application."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =========================================================
     DELETE STORAGE FILES
     ========================================================= */

  async function deleteApplicationFiles(
    application
  ) {
    const storageErrors = [];

    /*
     * Profile photo
     */
    if (application.profile_photo_path) {
      const { error } =
        await supabase.storage
          .from("profile-photos")
          .remove([
            application.profile_photo_path,
          ]);

      if (error) {
        console.error(
          "Profile photo deletion failed:",
          error
        );

        storageErrors.push(
          "profile photo"
        );
      }
    }

    /*
     * Resume
     */
    if (application.resume_path) {
      const { error } =
        await supabase.storage
          .from("developer-resumes")
          .remove([
            application.resume_path,
          ]);

      if (error) {
        console.error(
          "Resume deletion failed:",
          error
        );

        storageErrors.push("resume");
      }
    }

    return storageErrors;
  }

  /* =========================================================
     REJECT APPLICATION
     
     Rejecting means:
     
     1. Remove profile photo
     2. Remove resume
     3. Delete database application
     
     ========================================================= */

  async function rejectApplication() {
    if (!selectedApplication) {
      return;
    }

    const reason =
      rejectionReason.trim() ||
      "Application rejected.";

    const confirmed = window.confirm(
      `Reject ${selectedApplication.full_name}'s application?\n\nReason: ${reason}\n\nThe application will be permanently deleted.`
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      const application =
        selectedApplication;

      /*
       * Delete uploaded files first.
       */
      await deleteApplicationFiles(
        application
      );

      /*
       * Delete database record.
       */
      const { error } =
        await supabase
          .from("developer_applications")
          .delete()
          .eq("id", application.id);

      if (error) {
        throw error;
      }

      /*
       * Remove from UI.
       */
      setApplications((previous) =>
        previous.filter(
          (item) =>
            item.id !== application.id
        )
      );

      setSelectedApplication(null);
      setShowRejectBox(false);
      setRejectionReason("");

      alert(
        "Application rejected and permanently removed."
      );
    } catch (error) {
      console.error(
        "Failed to reject application:",
        error
      );

      alert(
        error?.message ||
          "Unable to reject application."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =========================================================
     MANUAL DELETE
     ========================================================= */

  async function deleteApplication() {
    if (!selectedApplication) {
      return;
    }

    const confirmed = window.confirm(
      `Delete the application from ${selectedApplication.full_name}?\n\nThis will permanently remove the application and uploaded documents.`
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      const application =
        selectedApplication;

      /*
       * Remove profile photo and resume.
       */
      await deleteApplicationFiles(
        application
      );

      /*
       * Remove database record.
       */
      const { error } =
        await supabase
          .from("developer_applications")
          .delete()
          .eq("id", application.id);

      if (error) {
        throw error;
      }

      /*
       * Update table.
       */
      setApplications((previous) =>
        previous.filter(
          (item) =>
            item.id !== application.id
        )
      );

      setSelectedApplication(null);

      alert(
        "Application deleted successfully."
      );
    } catch (error) {
      console.error(
        "Failed to delete application:",
        error
      );

      alert(
        error?.message ||
          "Unable to delete application."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =========================================================
     MODAL
     ========================================================= */

  function openApplication(application) {
    setSelectedApplication(application);
    setShowRejectBox(false);
    setRejectionReason("");
  }

  function closeApplication() {
    if (actionLoading) {
      return;
    }

    setSelectedApplication(null);
    setShowRejectBox(false);
    setRejectionReason("");
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  function getStatusClass(status) {
    return `developer-status developer-status-${status}`;
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

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
          className="admin-refresh-button"
          onClick={loadApplications}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading ? "spin" : ""
            }
          />

          Refresh
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
            placeholder="Search by name, email, phone or city..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
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

        ) : filteredApplications.length ===
          0 ? (

          <div className="developer-empty">
            No developer applications found.
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
                            application.full_name
                          }
                        </div>

                        <div className="developer-email">
                          {
                            application.email
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
                            application.primary_roles ||
                            []
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
                            application.primary_roles ||
                            []
                          ).length > 2 && (

                            <span className="developer-role">
                              +
                              {application
                                .primary_roles
                                .length -
                                2}
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

                        {new Date(
                          application.created_at
                        ).toLocaleDateString(
                          "en-IN"
                        )}

                      </td>

                      {/* VIEW */}

                      <td>

                        <button
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
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="developer-modal-header">

              <div>

                <h2>
                  {
                    selectedApplication.full_name
                  }
                </h2>

                <p>
                  Developer Application
                </p>

              </div>

              <button
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
                    selectedApplication.full_name
                  }
                  className="developer-profile-photo"
                />

              ) : (

                <div className="developer-profile-placeholder">

                  {
                    selectedApplication
                      .full_name
                      ?.charAt(0)
                      .toUpperCase()
                  }

                </div>

              )}

              <div className="developer-profile-main">

                <h3>
                  {
                    selectedApplication.full_name
                  }
                </h3>

                <div className="developer-profile-contact">

                  <span>
                    <Mail size={14} />
                    {
                      selectedApplication.email
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
              icon={<User size={18} />}
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
                    selectedApplication.primary_roles ||
                    []
                  ).map((role) => (

                    <span
                      key={role}
                      className="developer-role"
                    >
                      {role}
                    </span>

                  ))}

                </div>

              </div>

            </ApplicationSection>

            {/* =================================================
                ONLINE PROFILES
                ================================================= */}

            <ApplicationSection
              icon={<Globe size={18} />}
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

                {!selectedApplication
                  .profile_photo_url &&
                  !selectedApplication
                    .resume_url && (

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

            </ApplicationSection>

            {/* =================================================
                REJECTION BOX
                ================================================= */}

            {selectedApplication.status ===
              "pending" && (

              <div className="developer-actions">

                {!showRejectBox ? (

                  <>

                    <button
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
                      onChange={(e) =>
                        setRejectionReason(
                          e.target.value
                        )
                      }
                      placeholder="Enter reason for rejection..."
                      rows={4}
                      disabled={
                        actionLoading
                      }
                    />

                    <p>
                      Rejecting the application
                      will permanently delete
                      the application and its
                      uploaded documents.
                    </p>

                    <div className="developer-reject-actions">

                      <button
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
