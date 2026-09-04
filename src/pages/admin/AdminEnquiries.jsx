import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  RefreshCcw,
  Filter,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "../../styles/admin/admin-enquiries.css";

import {
  getEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} from "../../services/client/enquiryService";

import {
  createClientFromEnquiry,
} from "../../services/admin/adminClientService";

import EnquiryTable from "../../components/admin/EnquiryTable";
import EnquiryDetails from "../../components/admin/EnquiryDetails";

export default function AdminEnquiries() {
  const navigate = useNavigate();

  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [convertingToOpportunity, setConvertingToOpportunity] =
    useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getEnquiries();

      const enquiryList = Array.isArray(data)
        ? data
        : [];

      setEnquiries(enquiryList);

      setSelected((current) => {
        if (!current) return null;

        return (
          enquiryList.find(
            (item) => item.id === current.id
          ) || null
        );
      });
    } catch (error) {
      console.error(
        "Failed to load enquiries:",
        error
      );

      setEnquiries([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enquiries.filter((item) => {
      if (!item) return false;

      const matchesSearch =
        !query ||
        String(item.customer_name || "")
          .toLowerCase()
          .includes(query) ||
        String(item.email || "")
          .toLowerCase()
          .includes(query) ||
        String(item.phone || "")
          .toLowerCase()
          .includes(query) ||
        String(item.service || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "all" ||
        item.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [enquiries, search, status]);

  const handleSelect = useCallback((enquiry) => {
    if (!enquiry) return;

    setSelected(enquiry);
  }, []);

  const changeStatus = async (
    id,
    newStatus
  ) => {
    if (!id || !newStatus) return;

    try {
      const updated =
        await updateEnquiryStatus(
          id,
          newStatus
        );

      setEnquiries((previous) =>
        previous.map((item) =>
          item.id === id
            ? updated
            : item
        )
      );

      setSelected(updated);
    } catch (error) {
      console.error(
        "Failed to update enquiry status:",
        error
      );

      alert(
        error?.message ||
          "Failed to update enquiry status."
      );
    }
  };

  const remove = async (id) => {
    if (!id) return;

    const confirmed = window.confirm(
      "Delete this enquiry permanently?"
    );

    if (!confirmed) return;

    try {
      await deleteEnquiry(id);

      setEnquiries((previous) =>
        previous.filter(
          (item) => item.id !== id
        )
      );

      setSelected(null);
    } catch (error) {
      console.error(
        "Failed to delete enquiry:",
        error
      );

      alert(
        error?.message ||
          "Failed to delete enquiry."
      );
    }
  };

  /*
   * =========================================================
   * CONVERT ENQUIRY → CLIENT
   * =========================================================
   */

  const convertToClient = async (
    enquiry
  ) => {
    if (!enquiry?.id || converting) {
      return;
    }

    if (enquiry.client_id) {
      alert(
        "This enquiry is already converted to a client."
      );
      return;
    }

    const confirmed = window.confirm(
      `Convert "${enquiry.customer_name}" to a client?`
    );

    if (!confirmed) return;

    setConverting(true);

    try {
      const result =
        await createClientFromEnquiry(
          enquiry.id
        );

      if (!result?.success) {
        throw new Error(
          result?.error ||
            "Failed to create client account."
        );
      }

      alert(
        `Client account created successfully!\n\n` +
          `Email: ${result.email}\n` +
          `Password: ${result.temporary_password}`
      );

      const updatedEnquiry = {
        ...enquiry,
        client_id: result.client_id,
        status: "completed",
      };

      setEnquiries((previous) =>
        previous.map((item) =>
          item.id === enquiry.id
            ? updatedEnquiry
            : item
        )
      );

      setSelected(updatedEnquiry);
    } catch (error) {
      console.error(
        "Client conversion failed:",
        error
      );

      alert(
        error?.message ||
          "Failed to convert enquiry to client."
      );
    } finally {
      setConverting(false);
    }
  };

  /*
   * =========================================================
   * CONVERT CLIENT/ENQUIRY → OPPORTUNITY FORM
   *
   * This DOES NOT create an opportunity.
   * It opens Admin Opportunities with pre-filled data.
   * =========================================================
   */

  const convertToOpportunity = useCallback(
    async (enquiry) => {
      if (
        !enquiry?.id ||
        convertingToOpportunity
      ) {
        return;
      }

      if (!enquiry.client_id) {
        alert(
          "Please convert this enquiry to a client first."
        );
        return;
      }

      setConvertingToOpportunity(true);

      try {
        navigate("/admin/opportunities", {
          state: {
            createFromEnquiry: true,

            enquiry: {
              id: enquiry.id,
              client_id: enquiry.client_id,

              customer_name:
                enquiry.customer_name || "",

              email:
                enquiry.email || "",

              phone:
                enquiry.phone || "",

              service:
                enquiry.service || "",

              estimated_budget:
                enquiry.estimated_budget || "",

              project_description:
                enquiry.project_description || "",

              preferred_contact:
                enquiry.preferred_contact || "",

              created_at:
                enquiry.created_at || null,
            },
          },
        });
      } catch (error) {
        console.error(
          "Failed to open opportunity form:",
          error
        );

        alert(
          "Failed to open the opportunity form."
        );
      } finally {
        setConvertingToOpportunity(false);
      }
    },
    [
      navigate,
      convertingToOpportunity,
    ]
  );

  return (
    <div className="admin-dashboard">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">
            <Filter size={13} />
            Customer Requests
          </span>

          <h1>
            Project Enquiries
          </h1>

          <p>
            View and manage all enquiries
            submitted through the EXCWA Tech
            website.
          </p>
        </div>
      </div>

      {/* =====================================================
          TOOLBAR
      ===================================================== */}

      <div className="admin-toolbar">

        <div className="admin-search">
          <Search size={17} />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search customer, email or service..."
            aria-label="Search enquiries"
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value
            )
          }
          aria-label="Filter enquiries by status"
        >
          <option value="all">
            All Status
          </option>

          <option value="new">
            New
          </option>

          <option value="read">
            Read
          </option>

          <option value="contacted">
            Contacted
          </option>

          <option value="in_progress">
            In Progress
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="archived">
            Archived
          </option>
        </select>

        <button
          type="button"
          className="admin-icon-button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh enquiries"
          title="Refresh enquiries"
        >
          <RefreshCcw
            size={17}
            className={
              loading
                ? "refresh-spinning"
                : ""
            }
          />
        </button>

      </div>

      {/* =====================================================
          ENQUIRY TABLE
      ===================================================== */}

      <section className="admin-panel">

        {loading ? (
          <div className="admin-empty">
            Loading enquiries...
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            No enquiries found.
          </div>
        ) : (
          <EnquiryTable
            enquiries={filtered}
            onSelect={handleSelect}
          />
        )}

      </section>

      {/* =====================================================
          ENQUIRY DETAILS
      ===================================================== */}

      {selected && (
        <EnquiryDetails
          enquiry={selected}

          onClose={() =>
            setSelected(null)
          }

          onStatusChange={
            changeStatus
          }

          onDelete={remove}

          onConvertToClient={
            convertToClient
          }

          converting={
            converting
          }

          onConvertToOpportunity={
            convertToOpportunity
          }

          convertingToOpportunity={
            convertingToOpportunity
          }
        />
      )}

    </div>
  );
}