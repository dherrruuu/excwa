export default function StatusBadge({ status }) {

  const labels = {
    new: "New",
    read: "Read",
    contacted: "Contacted",
    in_progress: "In Progress",
    completed: "Completed",
    archived: "Archived",
  };

  return (
    <span className={`status-badge status-${status}`}>
      <span />
      {labels[status] || status}
    </span>
  );
}