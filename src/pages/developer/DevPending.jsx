import { Clock, LogOut } from "lucide-react";
import ExcwaLogo from "../../components/common/ExcwaLogo";
import { useDeveloper } from "../../hooks/useDeveloper";

export default function DevPending() {
  const { profile, devProfile, logout } = useDeveloper();

  return (
    <div className="dev-auth-page">
      <div className="ambient">
        <div className="orb orb-a" /><div className="orb orb-b" /><div className="orb orb-c" />
        <div className="grid-lines" />
      </div>
      <div className="dev-auth-wrap" style={{ textAlign: "center" }}>
        <div className="dev-auth-brand" style={{ justifyContent: "center" }}>
          <ExcwaLogo size={42} />
          <span>EXCWA <b>Developers</b></span>
        </div>

        <div className="dev-auth-card" style={{ marginTop: 24, padding: "48px 32px" }}>
          <div className="dev-status-icon" style={{ background: "rgba(255,200,60,.07)", border: "1px solid rgba(255,200,60,.2)", color: "#ffc83c" }}>
            <Clock size={28} />
          </div>

          <h2 className="dev-auth-title" style={{ marginTop: 20 }}>Profile submitted.</h2>
          <p style={{ color: "#8995a6", fontSize: 14, lineHeight: 1.75, margin: "0 0 24px" }}>
            {profile?.full_name?.split(" ")[0] || devProfile?.full_name?.split(" ")[0] || "Your developer"} profile is currently under review by the EXCWA team.
            Project opportunities will become available once your profile is approved.
          </p>

          <div className="dev-status-info-card" style={{ display: "grid", gap: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>PROFILE CREATED</span>
              <strong style={{ color: "#69e5b7" }}>✓</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>PROFILE COMPLETED</span>
              <strong style={{ color: "#69e5b7" }}>✓</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>UNDER REVIEW</span>
              <strong style={{ color: "#69e5b7" }}>✓</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>APPROVAL PENDING</span>
              <strong style={{ color: "#ffca70" }}>•</strong>
            </div>
          </div>

          <button className="secondary-btn" style={{ width: "100%", marginTop: 24, justifyContent: "center" }} onClick={logout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}