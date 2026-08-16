import { useEffect, useMemo, useState } from "react";

import "../../styles/admin/admin-enquiries.css";

import {
  Search,
  RefreshCcw,
  Filter,
} from "lucide-react";

import {
  getEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} from "../../services/client/enquiryService";

import StatusBadge from "../../components/admin/StatusBadge";
import EnquiryDetails from "../../components/admin/EnquiryDetails";

export default function AdminEnquiries() {

  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const data = await getEnquiries();
      setEnquiries(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {

    return enquiries.filter((item) => {

      const query = search.toLowerCase();

      const matchesSearch =
        item.customer_name
          ?.toLowerCase()
          .includes(query) ||
        item.email
          ?.toLowerCase()
          .includes(query) ||
        item.phone
          ?.toLowerCase()
          .includes(query) ||
        item.service
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "all" ||
        item.status === status;

      return matchesSearch && matchesStatus;
    });

  }, [enquiries, search, status]);

  async function changeStatus(id, newStatus) {

    try {

      const updated =
        await updateEnquiryStatus(
          id,
          newStatus
        );

      setEnquiries((prev) =>
        prev.map((item) =>
          item.id === id
            ? updated
            : item
        )
      );

      setSelected(updated);

    } catch (error) {
      console.error(error);
    }
  }

  async function remove(id) {

    if (!window.confirm(
      "Delete this enquiry permanently?"
    )) {
      return;
    }

    try {

      await deleteEnquiry(id);

      setEnquiries((prev) =>
        prev.filter((item) => item.id !== id)
      );

      setSelected(null);

    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="admin-dashboard">

      <div className="admin-page-heading">

        <div>
          <span className="eyebrow">
            <Filter size={13} />
            Customer Requests
          </span>

          <h1>Project Enquiries</h1>

          <p>
            View and manage all enquiries submitted
            through the EXCWA Tech website.
          </p>
        </div>

      </div>

      <div className="admin-toolbar">

        <div className="admin-search">

          <Search size={17} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search customer, email or service..."
          />

        </div>

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="contacted">Contacted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>

        <button
          className="admin-icon-button"
          onClick={load}
        >
          <RefreshCcw size={17} />
        </button>

      </div>

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

          <div className="admin-table-wrap">

            <table className="admin-table">

              <thead>

                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Budget</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>

              </thead>

              <tbody>

                {filtered.map((item) => (

                  <tr
                    key={item.id}
                    className="clickable-row"
                    onClick={() =>
                      setSelected(item)
                    }
                  >

                    <td>
                      <strong>
                        {item.customer_name}
                      </strong>

                      <small>
                        {item.email}
                      </small>
                    </td>

                    <td>
                      {item.service}
                    </td>

                    <td>
                      {item.estimated_budget || "—"}
                    </td>

                    <td>
                      {item.preferred_contact || "—"}
                    </td>

                    <td>
                      <StatusBadge
                        status={item.status}
                      />
                    </td>

                    <td>
                      {new Date(
                        item.created_at
                      ).toLocaleString()}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {selected && (
        <EnquiryDetails
          enquiry={selected}
          onClose={() => setSelected(null)}
          onStatusChange={changeStatus}
          onDelete={remove}
        />
      )}

    </div>
  );
}