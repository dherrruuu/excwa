import { XCircle, LogOut, Mail } from "lucide-react";
import ExcwaLogo from "../../components/common/ExcwaLogo";
import { useDeveloper } from "../../hooks/useDeveloper";

export default function DevRejected() {
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
          <div className="dev-status-icon" style={{ background: "rgba(255,80,100,.07)", border: "1px solid rgba(255,80,100,.2)", color: "#ff6b7a" }}>
            <XCircle size={28} />
          </div>
          <h2 className="dev-auth-title" style={{ marginTop: 20 }}>Application Not Approved</h2>
          <p style={{ color: "#8995a6", fontSize: 14, lineHeight: 1.75, margin: "0 0 20px" }}>
            Hi {profile?.full_name?.split(" ")[0] || "there"} — after reviewing your application, we're unable to onboard you at this time.
          </p>

          {devProfile?.rejection_reason && (
            <div className="dev-status-info-card" style={{ borderColor: "rgba(255,80,100,.15)", background: "rgba(255,80,100,.04)", marginBottom: 20 }}>
              <span style={{ color: "#c4cedc", fontSize: 12 }}><b>Reason: </b>{devProfile.rejection_reason}</span>
            </div>
          )}

          <div className="dev-status-info-card">
            <Mail size={14} />
            <span>For queries, reach us at <a href="mailto:hello@excwa.com" className="dev-link">hello@excwa.com</a></span>
          </div>

          <button className="secondary-btn" style={{ width: "100%", marginTop: 24, justifyContent: "center" }} onClick={logout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}