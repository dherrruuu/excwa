export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
}) {
  return (
    <div className={`admin-stat-card ${accent}`}>

      <div className="admin-stat-top">

        <div className="admin-stat-icon">
          <Icon size={19} />
        </div>

        <span className="admin-stat-label">
          {label}
        </span>

      </div>

      <strong>{value}</strong>

    </div>
  );
}