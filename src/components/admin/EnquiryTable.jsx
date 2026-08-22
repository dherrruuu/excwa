import EnquiryRow from "./EnquiryRow";

export default function EnquiryTable({
  enquiries = [],
  onSelect,
}) {
  return (
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
          {enquiries.map((enquiry) => (
            <EnquiryRow
              key={enquiry.id}
              enquiry={enquiry}
              onClick={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}