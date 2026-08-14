import { Bell, Search } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function AdminTopbar() {
  const { user } = useAuth();

  return (
    <header className="admin-topbar">

      <div>
        <span className="admin-topbar-eyebrow">
          EXCWA / ADMIN
        </span>

        <h2>Management Console</h2>
      </div>

      <div className="admin-topbar-actions">

        <button className="admin-icon-button">
          <Search size={18} />
        </button>

        <button className="admin-icon-button">
          <Bell size={18} />
        </button>

        <div className="admin-user">

          <div className="admin-avatar">
            {(user?.email?.[0] || "A").toUpperCase()}
          </div>

          <div>
            <strong>Administrator</strong>
            <span>{user?.email}</span>
          </div>

        </div>

      </div>

    </header>
  );
}