import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  Users,
  AlertCircle,
} from "lucide-react";

import {
  getDeveloperApplications,
  markApplicationUnderReview,
  approveDeveloperApplication,
  rejectDeveloperApplication,
  deleteDeveloperApplication,
} from "../../services/admin/adminReviewService";

import DeveloperApplicationRow from "./DeveloperApplicationRow";
import DeveloperApplicationDetails from "./DeveloperApplicationDetails";

export default function DeveloperApplicationTable() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [selectedApplication, setSelectedApplication] =
    useState(null);

  const [error, setError] = useState("");

  /*
   * =========================================================
   * FETCH APPLICATIONS
   * =========================================================
   */

  const fetchApplications = async (showRefresh = false) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getDeveloperApplications();

      setApplications(data);
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

  useEffect(() => {
    fetchApplications();
  }, []);

  /*
   * =========================================================
   * FILTER
   * =========================================================
   */

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus =
        statusFilter === "all" ||
        application.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
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

      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        city.includes(query)
      );
    });
  }, [
    applications,
    search,
    statusFilter,
  ]);

  /*
   * =========================================================
   * STATUS CHANGE
   * =========================================================
   */

  const handleStatusChange = async (
    applicationId,
    status
  ) => {
    try {
      setError("");

      let updatedApplication;

      if (status === "approved") {
        updatedApplication =
          await approveDeveloperApplication(
            applicationId
          );
      } else if (status === "rejected") {
        const reason = window.prompt(
          "Reason for rejection (optional):"
        );

        if (reason === null) {
          return;
        }

        updatedApplication =
          await rejectDeveloperApplication(
            applicationId,
            reason
          );
      } else if (status === "under_review") {
        updatedApplication =
          await markApplicationUnderReview(
            applicationId
          );
      } else {
        throw new Error(
          `Unsupported application status: ${status}`
        );
      }

      setApplications((prev) =>
        prev.map((application) =>
          application.id === applicationId
            ? updatedApplication
            : application
        )
      );

      setSelectedApplication(
        updatedApplication
      );
    } catch (err) {
      console.error(
        "Failed to update application:",
        err
      );

      setError(
        err?.message ||
          "Unable to update application."
      );
    }
  };

  /*
   * =========================================================
   * DELETE
   * =========================================================
   */

  const handleDelete = async (
    applicationId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteDeveloperApplication(
        applicationId
      );

      setApplications((prev) =>
        prev.filter(
          (application) =>
            application.id !== applicationId
        )
      );

      setSelectedApplication(null);
    } catch (err) {
      console.error(
        "Failed to delete application:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete application."
      );
    }
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

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

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="developer-applications-container">

      <div className="developer-applications-toolbar">

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

        <div className="developer-application-search">

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
          className="developer-application-filter"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="pending">
            Pending
          </option>

          <option value="under_review">
            Under Review
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

      {error && (
        <div className="developer-application-admin-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

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
              : "There are currently no applications matching this status."}
          </p>

        </div>
      ) : (
        <div className="developer-application-table-wrapper">

          <table className="developer-application-table">

            <thead>
              <tr>
                <th>Applicant</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Roles</th>
                <th>Applied</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredApplications.map(
                (application) => (
                  <DeveloperApplicationRow
                    key={application.id}
                    application={application}
                    onView={() =>
                      setSelectedApplication(
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

      {selectedApplication && (
        <DeveloperApplicationDetails
          application={selectedApplication}
          onClose={() =>
            setSelectedApplication(null)
          }
          onStatusChange={
            handleStatusChange
          }
          onDelete={handleDelete}
        />
      )}

    </div>
  );
}

