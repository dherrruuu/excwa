import { useEffect, useMemo, useState } from "react";

import {
  RefreshCw,
  Search,
  Users,
  AlertCircle,
} from "lucide-react";

import {
  getDeveloperApplications,
  approveDeveloperApplication,
  rejectDeveloperApplication,
  deleteDeveloperApplication,
} from "../../services/developer/adminDeveloperService";

import DeveloperApplicationRow from "./DeveloperApplicationRow";
import DeveloperApplicationDetails from "./DeveloperApplicationDetails";


export default function DeveloperApplicationTable() {
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("pending");

  const [selectedApplication, setSelectedApplication] =
    useState(null);

  const [error, setError] = useState("");


  /* =========================================================
     FETCH APPLICATIONS
  ========================================================= */

  const fetchApplications = async (
    showRefresh = false
  ) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data =
        await getDeveloperApplications();

      setApplications(data || []);

      /*
       * Keep the open modal synchronized if the same
       * application still exists after refresh.
       */

      setSelectedApplication((current) => {
        if (!current) {
          return null;
        }

        const updated =
          (data || []).find(
            (application) =>
              application.id === current.id
          );

        return updated || null;
      });
    } catch (err) {
      console.error(
        "Failed to fetch developer applications:",
        err
      );

      setError(
        err?.message ||
          "Unable to load developer applications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchApplications();
  }, []);


  /* =========================================================
     SEARCH + STATUS FILTER
  ========================================================= */

  const filteredApplications = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return applications.filter(
      (application) => {
        /*
         * STATUS
         */

        const matchesStatus =
          statusFilter === "all" ||
          application.status ===
            statusFilter;

        if (!matchesStatus) {
          return false;
        }

        /*
         * SEARCH
         */

        if (!query) {
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
          name.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          city.includes(query) ||
          education.includes(query) ||
          roles.includes(query)
        );
      }
    );
  }, [
    applications,
    search,
    statusFilter,
  ]);


  /* =========================================================
     APPROVE APPLICATION
  ========================================================= */

  const approveApplication = async (
    applicationId
  ) => {
    try {
      setError("");

      const result =
        await approveDeveloperApplication(
          applicationId
        );

      const updatedApplication =
        result.application;

      setApplications((previous) =>
        previous.map((application) =>
          application.id ===
          applicationId
            ? updatedApplication
            : application
        )
      );

      setSelectedApplication(
        updatedApplication
      );

      return result;
    } catch (err) {
      console.error(
        "Failed to approve developer application:",
        err
      );

      setError(
        err?.message ||
          "Unable to approve developer application."
      );

      throw err;
    }
  };


  /* =========================================================
     REJECT APPLICATION
  ========================================================= */

  const rejectApplication = async (
    applicationId,
    rejectionReason
  ) => {
    try {
      setError("");

      const result =
        await rejectDeveloperApplication(
          applicationId,
          rejectionReason
        );

      const updatedApplication =
        result.application;

      setApplications((previous) =>
        previous.map((application) =>
          application.id ===
          applicationId
            ? updatedApplication
            : application
        )
      );

      setSelectedApplication(
        updatedApplication
      );

      return result;
    } catch (err) {
      console.error(
        "Failed to reject developer application:",
        err
      );

      setError(
        err?.message ||
          "Unable to reject developer application."
      );

      throw err;
    }
  };


  /* =========================================================
     DELETE APPLICATION
  ========================================================= */

  const deleteApplication = async (
    applicationId
  ) => {
    const application =
      applications.find(
        (item) =>
          item.id === applicationId
      );

    if (!application) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${application.full_name || "this applicant"}'s application?\n\nThis will permanently remove the application record and uploaded files.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

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
    } catch (err) {
      console.error(
        "Failed to delete developer application:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete developer application."
      );

      throw err;
    }
  };


  /* =========================================================
     STATUS CHANGE
  =========================================================

  This is the ONLY status callback exposed to the modal.

  ACCEPT:
      onStatusChange("accepted")

  REJECT:
      onStatusChange("rejected", reason)

  The modal does not know anything about Supabase
  Edge Functions.

  ========================================================= */

  const handleStatusChange = async (
    newStatus,
    rejectionReason = ""
  ) => {
    if (!selectedApplication?.id) {
      throw new Error(
        "Developer application ID is missing."
      );
    }

    if (newStatus === "accepted") {
      return approveApplication(
        selectedApplication.id
      );
    }

    if (newStatus === "rejected") {
      return rejectApplication(
        selectedApplication.id,
        rejectionReason
      );
    }

    throw new Error(
      `Unsupported developer application status: ${newStatus}`
    );
  };


  /* =========================================================
     OPEN APPLICATION
  ========================================================= */

  const openApplication = (
    application
  ) => {
    setError("");
    setSelectedApplication(
      application
    );
  };


  /* =========================================================
     CLOSE APPLICATION
  ========================================================= */

  const closeApplication = () => {
    setSelectedApplication(null);
  };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="developer-applications-loading">
        <div className="admin-spinner" />

        <span>
          Loading developer applications...
        </span>
      </div>
    );
  }


  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="developer-applications-container">

      {/* =====================================================
          TOOLBAR
      ===================================================== */}

      <div className="developer-applications-toolbar">

        {/* REFRESH */}

        <button
          type="button"
          className="admin-refresh-btn"
          onClick={() =>
            fetchApplications(true)
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "refresh-spinning"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>


        {/* SEARCH */}

        <div className="developer-application-search">
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


        {/* STATUS FILTER */}

        <select
          className="developer-application-filter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
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
          ERROR
      ===================================================== */}

      {error && (
        <div className="developer-application-admin-error">
          <AlertCircle size={18} />

          <span>
            {error}
          </span>
        </div>
      )}


      {/* =====================================================
          EMPTY
      ===================================================== */}

      {filteredApplications.length === 0 ? (
        <div className="developer-applications-empty">

          <div className="developer-empty-icon">
            <Users size={30} />
          </div>

          <h3>
            No developer applications found.
          </h3>

          <p>
            {search
              ? "Try changing your search or filter."
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
        /* ===================================================
           TABLE
        =================================================== */

        <div className="developer-application-table-wrapper">

          <table className="developer-application-table">

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
                  Applied
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredApplications.map(
                (application) => (
                  <DeveloperApplicationRow
                    key={application.id}
                    application={
                      application
                    }
                    onView={() =>
                      openApplication(
                        application
                      )
                    }
                  />
                )
              )}
            </tbody>

          </table>

        </div>
      )}


      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selectedApplication && (
        <DeveloperApplicationDetails
          application={
            selectedApplication
          }
          onClose={
            closeApplication
          }
          onStatusChange={
            handleStatusChange
          }
          onDelete={
            deleteApplication
          }
        />
      )}

    </div>
  );
}