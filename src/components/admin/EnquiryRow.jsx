import StatusBadge from "./StatusBadge";

export default function EnquiryRow({
  enquiry,
  onClick,
}) {
  if (!enquiry) return null;

  return (
    <tr
      className="admin-table-row clickable-row"
      onClick={() => onClick?.(enquiry)}
    >
      {/* CUSTOMER */}
      <td>
        <div className="admin-customer-cell">
          <strong>
            {enquiry.customer_name || "Unknown Customer"}
          </strong>

          {enquiry.email && (
            <span>
              {enquiry.email}
            </span>
          )}
        </div>
      </td>

      {/* SERVICE */}
      <td>
        <span className="admin-service-text">
          {enquiry.service || "—"}
        </span>
      </td>

      {/* BUDGET */}
      <td>
        <span className="admin-muted-text">
          {enquiry.estimated_budget || "—"}
        </span>
      </td>

      {/* CONTACT */}
      <td>
        <span className="admin-muted-text">
          {enquiry.preferred_contact || "—"}
        </span>
      </td>

      {/* STATUS */}
      <td>
        <StatusBadge
          status={enquiry.status}
        />
      </td>

      {/* DATE */}
      <td>
        <span className="admin-date">
          {enquiry.created_at
            ? new Date(
                enquiry.created_at
              ).toLocaleString()
            : "—"}
        </span>
      </td>
    </tr>
  );
}