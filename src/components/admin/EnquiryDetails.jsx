import {
  X,
  Mail,
  Phone,
  Trash2,
  MessageCircle,
} from "lucide-react";

import StatusBadge from "./StatusBadge";

export default function EnquiryDetails({
  enquiry,
  onClose,
  onStatusChange,
  onDelete,
}) {

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
    >

      <div
        className="admin-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="admin-modal-header">

          <div>

            <span className="eyebrow">
              Project Enquiry
            </span>

            <h2>
              {enquiry.customer_name}
            </h2>

          </div>

          <button
            className="admin-icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>

        </div>

        <div className="admin-detail-status">

          <StatusBadge
            status={enquiry.status}
          />

          <select
            value={enquiry.status}
            onChange={(e) =>
              onStatusChange(
                enquiry.id,
                e.target.value
              )
            }
          >
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="contacted">Contacted</option>
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

        </div>

        <div className="admin-detail-grid">

          <div className="admin-detail-item">
            <span>
              <Mail size={14} />
              Email
            </span>

            <a href={`mailto:${enquiry.email}`}>
              {enquiry.email}
            </a>
          </div>

          <div className="admin-detail-item">
            <span>
              <Phone size={14} />
              Phone
            </span>

            <a href={`tel:${enquiry.phone}`}>
              {enquiry.phone}
            </a>
          </div>

          <div className="admin-detail-item">
            <span>Service</span>
            <strong>{enquiry.service}</strong>
          </div>

          <div className="admin-detail-item">
            <span>Budget</span>
            <strong>
              {enquiry.estimated_budget || "Not specified"}
            </strong>
          </div>

          <div className="admin-detail-item">
            <span>Preferred Contact</span>
            <strong>
              {enquiry.preferred_contact || "Not specified"}
            </strong>
          </div>

          <div className="admin-detail-item">
            <span>Received</span>
            <strong>
              {new Date(
                enquiry.created_at
              ).toLocaleString()}
            </strong>
          </div>

        </div>

        <div className="admin-description">

          <span>PROJECT DESCRIPTION</span>

          <p>
            {enquiry.project_description}
          </p>

        </div>

        <div className="admin-modal-actions">

          {enquiry.phone && (
            <a
              href={`https://wa.me/${enquiry.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="admin-outline-button"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
          )}

          <button
            className="admin-danger-button"
            onClick={() =>
              onDelete(enquiry.id)
            }
          >
            <Trash2 size={15} />
            Delete
          </button>

        </div>

      </div>

    </div>
  );
}