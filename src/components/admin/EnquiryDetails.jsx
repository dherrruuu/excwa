import {
  X,
  Mail,
  Phone,
  Trash2,
  MessageCircle,
  UserPlus,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import StatusBadge from "./StatusBadge";

export default function EnquiryDetails({
  enquiry,
  onClose,
  onStatusChange,
  onDelete,
  onConvertToClient,
  converting = false,
}) {
  if (!enquiry) {
    return null;
  }

  const isClient = Boolean(enquiry.client_id);

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="admin-modal"
        onClick={(event) =>
          event.stopPropagation()
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
            type="button"
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
            value={enquiry.status || "new"}
            onChange={(event) =>
              onStatusChange(
                enquiry.id,
                event.target.value
              )
            }
            disabled={converting}
          >
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
        </div>

        <div className="admin-client-conversion">

          {isClient ? (
            <div className="admin-client-created">
              <CheckCircle2 size={16} />

              <div>
                <strong>
                  Client Account Created
                </strong>

                <span>
                  This enquiry is already
                  linked to a client account.
                </span>
              </div>
            </div>
          ) : (
            <div className="admin-client-create-box">

              <div>
                <span className="eyebrow">
                  Client Portal
                </span>

                <strong>
                  Convert this enquiry into a client
                </strong>

                <p>
                  Create a client portal account
                  using this customer's enquiry
                  details.
                </p>
              </div>

              <button
                type="button"
                className="admin-primary-button"
                onClick={() =>
                  onConvertToClient?.(
                    enquiry
                  )
                }
                disabled={converting}
              >
                {converting ? (
                  <>
                    <Loader2
                      size={15}
                      className="refresh-spinning"
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    Convert to Client
                  </>
                )}
              </button>

            </div>
          )}

        </div>

        <div className="admin-detail-grid">

          <div className="admin-detail-item">
            <span>
              <Mail size={14} />
              Email
            </span>

            <a
              href={`mailto:${enquiry.email}`}
            >
              {enquiry.email}
            </a>
          </div>

          <div className="admin-detail-item">
            <span>
              <Phone size={14} />
              Phone
            </span>

            <a
              href={`tel:${enquiry.phone}`}
            >
              {enquiry.phone}
            </a>
          </div>

          <div className="admin-detail-item">
            <span>
              Service
            </span>

            <strong>
              {enquiry.service}
            </strong>
          </div>

          <div className="admin-detail-item">
            <span>
              Budget
            </span>

            <strong>
              {enquiry.estimated_budget ||
                "Not specified"}
            </strong>
          </div>

          <div className="admin-detail-item">
            <span>
              Preferred Contact
            </span>

            <strong>
              {enquiry.preferred_contact ||
                "Not specified"}
            </strong>
          </div>

          <div className="admin-detail-item">
            <span>
              Received
            </span>

            <strong>
              {enquiry.created_at
                ? new Date(
                    enquiry.created_at
                  ).toLocaleString()
                : "—"}
            </strong>
          </div>

        </div>

        <div className="admin-description">
          <span>
            PROJECT DESCRIPTION
          </span>

          <p>
            {enquiry.project_description ||
              "No description provided."}
          </p>
        </div>

        <div className="admin-modal-actions">

          {enquiry.phone && (
            <a
              href={`https://wa.me/${String(
                enquiry.phone
              ).replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="admin-outline-button"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
          )}

          <button
            type="button"
            className="admin-danger-button"
            onClick={() =>
              onDelete(enquiry.id)
            }
            disabled={converting}
          >
            <Trash2 size={15} />
            Delete
          </button>

        </div>

      </div>
    </div>
  );
}