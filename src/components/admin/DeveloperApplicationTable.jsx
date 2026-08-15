import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  RefreshCw,
  Search,
  Users,
  AlertCircle,
} from "lucide-react";

import DeveloperApplicationRow from "./DeveloperApplicationRow";
import DeveloperApplicationDetails from "./DeveloperApplicationDetails";

export default function DeveloperApplicationTable() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [selectedApplication, setSelectedApplication] = useState(null);

  const [error, setError] = useState("");

  // =========================================================
  // FETCH APPLICATIONS
  // =========================================================

  const fetchApplications = async (showRefresh = false) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error: fetchError } = await supabase
        .from("developer_applications")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (fetchError) {
        throw fetchError;
      }

      setApplications(data || []);
    } catch (err) {
      console.error("Failed to fetch developer applications:", err);

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

  // =========================================================
  // FILTER
  // =========================================================

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
  }, [applications, search, statusFilter]);

  // =========================================================
  // UPDATE APPLICATION
  // =========================================================

  const handleStatusChange = async (applicationId, status) => {
    try {
      const { data, error: updateError } = await supabase
        .from("developer_applications")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setApplications((prev) =>
        prev.map((application) =>
          application.id === applicationId
            ? data
            : application
        )
      );

      setSelectedApplication(data);
    } catch (err) {
      console.error(
        "Failed to update developer application:",
        err
      );

      alert(
        err?.message ||
          "Unable to update application status."
      );
    }
  };

  // =========================================================
  // DELETE APPLICATION
  // =========================================================

  const handleDelete = async (applicationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("developer_applications")
        .delete()
        .eq("id", applicationId);

      if (deleteError) {
        throw deleteError;
      }

      setApplications((prev) =>
        prev.filter(
          (application) =>
            application.id !== applicationId
        )
      );

      setSelectedApplication(null);
    } catch (err) {
      console.error(
        "Failed to delete developer application:",
        err
      );

      alert(
        err?.message ||
          "Unable to delete application."
      );
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="developer-applications-container">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="developer-applications-toolbar">

        <button
          type="button"
          className="admin-refresh-btn"
          onClick={() => fetchApplications(true)}
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

          <option value="approved">
            Approved
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

          <span>{error}</span>
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
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
              : "There are currently no applications matching this status."}
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

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

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