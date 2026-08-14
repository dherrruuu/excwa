import { useEffect, useState } from "react";

import {
  MessageSquareText,
  Clock3,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import { getEnquiries } from "../services/enquiryService";
import StatCard from "../components/admin/StatCard";
import StatusBadge from "../components/admin/StatusBadge";

import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getEnquiries();
      setEnquiries(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const newCount = enquiries.filter(
    (x) => x.status === "new"
  ).length;

  const contactedCount = enquiries.filter(
    (x) => x.status === "contacted"
  ).length;

  const completedCount = enquiries.filter(
    (x) => x.status === "completed"
  ).length;

  return (
    <div className="admin-dashboard">

      <div className="admin-page-heading">

        <div>
          <span className="eyebrow">
            <MessageSquareText size={13} />
            Overview
          </span>

          <h1>Dashboard</h1>

          <p>
            Monitor project enquiries and customer requests.
          </p>
        </div>

      </div>

      <div className="admin-stats-grid">

        <StatCard
          label="Total Enquiries"
          value={enquiries.length}
          icon={MessageSquareText}
        />

        <StatCard
          label="New Enquiries"
          value={newCount}
          icon={Clock3}
          accent="cyan"
        />

        <StatCard
          label="Contacted"
          value={contactedCount}
          icon={PhoneCall}
          accent="violet"
        />

        <StatCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          accent="green"
        />

      </div>

      <section className="admin-panel">

        <div className="admin-panel-header">

          <div>
            <h2>Recent Enquiries</h2>
            <p>Latest project requests received.</p>
          </div>

          <button
            onClick={() => navigate("/admin/enquiries")}
            className="admin-outline-button"
          >
            View All
            <ArrowRight size={15} />
          </button>

        </div>

        {loading ? (
          <div className="admin-empty">
            Loading enquiries...
          </div>
        ) : enquiries.length === 0 ? (
          <div className="admin-empty">
            No enquiries received yet.
          </div>
        ) : (
          <div className="admin-table-wrap">

            <table className="admin-table">

              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>

                {enquiries.slice(0, 8).map((item) => (

                  <tr key={item.id}>

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
                      {item.phone}
                    </td>

                    <td>
                      <StatusBadge status={item.status} />
                    </td>

                    <td>
                      {new Date(
                        item.created_at
                      ).toLocaleDateString()}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}