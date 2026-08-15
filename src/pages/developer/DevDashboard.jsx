import { useState, useEffect } from "react";
import { LogOut, Briefcase, FileCheck, Send, User, X, ExternalLink, Calendar, DollarSign } from "lucide-react";
import ExcwaLogo from "../../components/common/ExcwaLogo";
import { useDeveloper } from "../../hooks/useDeveloper";
import {
  getOpenOpportunities, applyToOpportunity,
  getMyApplications, getMyAssignment,
  submitWork, getMySubmissions,
} from "../../services/developerService";

const TABS = [
  { id: "opportunities", label: "Opportunities",    icon: Briefcase },
  { id: "applications",  label: "My Applications",  icon: FileCheck },
  { id: "submissions",   label: "Submit Work",       icon: Send },
  { id: "profile",       label: "Profile",           icon: User },
];

const STATUS_COLORS = {
  pending:   { color: "#ffca70", bg: "rgba(255,202,112,.08)", border: "rgba(255,202,112,.2)" },
  selected:  { color: "#69e5b7", bg: "rgba(105,229,183,.08)", border: "rgba(105,229,183,.2)" },
  rejected:  { color: "#ff8292", bg: "rgba(255,130,146,.08)", border: "rgba(255,130,146,.2)" },
  withdrawn: { color: "#778899", bg: "rgba(119,136,153,.08)", border: "rgba(119,136,153,.2)" },
  submitted: { color: "#62e2ff", bg: "rgba(98,226,255,.08)",  border: "rgba(98,226,255,.2)"  },
  under_review:      { color: "#a98cff", bg: "rgba(169,140,255,.08)", border: "rgba(169,140,255,.2)" },
  changes_requested: { color: "#ffca70", bg: "rgba(255,202,112,.08)", border: "rgba(255,202,112,.2)" },
  approved:  { color: "#69e5b7", bg: "rgba(105,229,183,.08)", border: "rgba(105,229,183,.2)" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 999, fontSize: 10,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── OPPORTUNITIES TAB ─────────────────────────────────────────
function OpportunitiesTab({ devProfile }) {
  const [opps, setOpps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [applyModal, setApplyModal] = useState(null); // opportunity object
  const [form, setForm]         = useState({ cover_message: "", estimated_days: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  useEffect(() => {
    getOpenOpportunities().then(setOpps).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleApply() {
    setError(""); setSuccess("");
    if (!form.cover_message.trim()) return setError("Please write a cover message.");
    setSubmitting(true);
    try {
      await applyToOpportunity({
        opportunityId: applyModal.id,
        developerId: devProfile.id,
        coverMessage: form.cover_message,
        estimatedDays: form.estimated_days ? parseInt(form.estimated_days) : null,
      });
      setSuccess("Application submitted successfully!");
      setOpps(p => p.filter(o => o.id !== applyModal.id)); // hide applied opp
      setTimeout(() => { setApplyModal(null); setSuccess(""); }, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="dev-tab-empty">Loading opportunities...</div>;
  if (opps.length === 0) return (
    <div className="dev-tab-empty">
      <Briefcase size={32} style={{ opacity: .3, marginBottom: 12 }} />
      <p>No open opportunities right now.</p>
      <span>Check back soon — new projects are posted regularly.</span>
    </div>
  );

  return (
    <>
      <div className="dev-opp-grid">
        {opps.map(opp => (
          <div key={opp.id} className="dev-opp-card">
            <div className="dev-opp-card-top">
              <span className="dev-opp-category">{opp.category}</span>
              {opp.budget && (
                <span className="dev-opp-budget">
                  <DollarSign size={11} /> ₹{Number(opp.budget).toLocaleString()}
                </span>
              )}
            </div>
            <h3 className="dev-opp-title">{opp.title}</h3>
            <p className="dev-opp-desc">{opp.description?.slice(0, 130)}{opp.description?.length > 130 ? "..." : ""}</p>
            {opp.tech_stack?.length > 0 && (
              <div className="dev-opp-tags">
                {opp.tech_stack.map(t => <span key={t} className="dev-tag">{t}</span>)}
              </div>
            )}
            <div className="dev-opp-footer">
              {opp.deadline && (
                <span className="dev-opp-deadline">
                  <Calendar size={11} /> {new Date(opp.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              <button className="primary-btn" style={{ padding: "9px 16px", fontSize: 12 }}
                onClick={() => { setApplyModal(opp); setForm({ cover_message: "", estimated_days: "" }); setError(""); }}>
                Apply →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Apply Modal */}
      {applyModal && (
        <div className="dev-modal-overlay" onClick={() => setApplyModal(null)}>
          <div className="dev-modal" onClick={e => e.stopPropagation()}>
            <div className="dev-modal-header">
              <div>
                <p className="dev-opp-category" style={{ marginBottom: 4 }}>{applyModal.category}</p>
                <h2 style={{ font: "600 22px 'Space Grotesk'", margin: 0 }}>{applyModal.title}</h2>
              </div>
              <button onClick={() => setApplyModal(null)} className="dev-modal-close"><X size={18} /></button>
            </div>
            <div className="field" style={{ marginTop: 20 }}>
              <label>Cover Message <em>*</em></label>
              <textarea rows={5} placeholder="Why are you a good fit for this project? What's your approach?"
                value={form.cover_message}
                onChange={e => setForm(p => ({ ...p, cover_message: e.target.value }))} />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Estimated Days to Complete <em style={{ color: "#5e6a7b", fontStyle: "normal" }}>optional</em></label>
              <input type="number" placeholder="e.g. 14" min={1}
                value={form.estimated_days}
                onChange={e => setForm(p => ({ ...p, estimated_days: e.target.value }))} />
            </div>
            {error   && <p className="error"   style={{ marginTop: 10 }}>{error}</p>}
            {success && <p style={{ color: "#69e5b7", fontSize: 12, marginTop: 10 }}>{success}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="secondary-btn" onClick={() => setApplyModal(null)}>Cancel</button>
              <button className="primary-btn" style={{ flex: 1 }} onClick={handleApply} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── APPLICATIONS TAB ──────────────────────────────────────────
function ApplicationsTab({ devProfile }) {
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyApplications(devProfile.id).then(setApps).catch(console.error).finally(() => setLoading(false));
  }, [devProfile.id]);

  if (loading) return <div className="dev-tab-empty">Loading...</div>;
  if (apps.length === 0) return (
    <div className="dev-tab-empty">
      <FileCheck size={32} style={{ opacity: .3, marginBottom: 12 }} />
      <p>No applications yet.</p>
      <span>Go to Opportunities tab to apply for projects.</span>
    </div>
  );

  return (
    <div className="dev-app-list">
      {apps.map(app => (
        <div key={app.id} className="dev-app-card">
          <div className="dev-app-card-left">
            <span className="dev-opp-category">{app.opportunities?.category}</span>
            <h3 style={{ font: "600 16px 'Space Grotesk'", margin: "6px 0 4px", color: "#d7deea" }}>
              {app.opportunities?.title}
            </h3>
            <p style={{ fontSize: 11, color: "#667387", margin: 0 }}>
              Applied {new Date(app.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {app.estimated_days && ` · ${app.estimated_days} days estimated`}
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>
      ))}
    </div>
  );
}

// ── SUBMIT WORK TAB ───────────────────────────────────────────
function SubmitWorkTab({ devProfile, user }) {
  const [apps, setApps]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [form, setForm]           = useState({ github_url: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  useEffect(() => {
    getMyApplications(devProfile.id)
      .then(data => setApps(data.filter(a => a.status === "selected")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [devProfile.id]);

  async function loadAssignment(app) {
    setSelected(app); setError(""); setSuccess("");
    setForm({ github_url: "", notes: "" });
    const a = await getMyAssignment(devProfile.id, app.opportunity_id);
    setAssignment(a);
  }

  async function handleSubmit() {
    setError(""); setSuccess("");
    if (!form.github_url.trim()) return setError("GitHub URL is required.");
    if (!form.github_url.startsWith("http")) return setError("Enter a valid URL.");
    if (!assignment) return setError("Assignment not found.");
    setSubmitting(true);
    try {
      await submitWork({
        assignmentId: assignment.id,
        developerId: devProfile.id,
        githubUrl: form.github_url,
        notes: form.notes,
      });
      setSuccess("Work submitted successfully! We'll review it soon.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="dev-tab-empty">Loading...</div>;
  if (apps.length === 0) return (
    <div className="dev-tab-empty">
      <Send size={32} style={{ opacity: .3, marginBottom: 12 }} />
      <p>No assigned projects yet.</p>
      <span>Once you're selected for a project, you can submit your work here.</span>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.4fr" : "1fr", gap: 16 }}>
      {/* Project list */}
      <div className="dev-app-list">
        {apps.map(app => (
          <div key={app.id}
            className={`dev-app-card ${selected?.id === app.id ? "active" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => loadAssignment(app)}>
            <div>
              <span className="dev-opp-category">{app.opportunities?.category}</span>
              <h3 style={{ font: "600 15px 'Space Grotesk'", margin: "5px 0 0", color: "#d7deea" }}>
                {app.opportunities?.title}
              </h3>
            </div>
            <StatusBadge status="selected" />
          </div>
        ))}
      </div>

      {/* Submit form */}
      {selected && (
        <div className="dev-auth-card" style={{ padding: 24 }}>
          <h3 style={{ font: "600 17px 'Space Grotesk'", margin: "0 0 4px", color: "#d7deea" }}>
            {selected.opportunities?.title}
          </h3>
          <p style={{ color: "#667387", fontSize: 12, margin: "0 0 20px" }}>
            Assigned {assignment?.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString("en-IN") : ""}
          </p>
          <div className="field">
            <label>GitHub Repository URL <em>*</em></label>
            <input type="url" placeholder="https://github.com/username/repo"
              value={form.github_url}
              onChange={e => setForm(p => ({ ...p, github_url: e.target.value }))} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Submission Notes <em style={{ color: "#5e6a7b", fontStyle: "normal" }}>optional</em></label>
            <textarea rows={4} placeholder="Any notes about your implementation, setup instructions, etc."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          {error   && <p className="error"   style={{ marginTop: 10 }}>{error}</p>}
          {success && <p style={{ color: "#69e5b7", fontSize: 12, marginTop: 10 }}>{success}</p>}
          <button className="primary-btn form-submit" style={{ marginTop: 18 }}
            onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : <><Send size={14} /> Submit Work</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ── PROFILE TAB ───────────────────────────────────────────────
function ProfileTab({ profile, devProfile }) {
  return (
    <div className="dev-auth-card" style={{ padding: 28 }}>
      <h3 style={{ font: "600 18px 'Space Grotesk'", margin: "0 0 20px", color: "#d7deea" }}>Your Profile</h3>
      <div className="admin-detail-grid">
        {[
          ["Full Name", profile?.full_name || devProfile?.full_name],
          ["Email",     profile?.email],
          ["Phone",     devProfile?.phone || profile?.phone || "—"],
          ["City",      devProfile?.city || "—"],
          ["GitHub",    devProfile?.github_url],
          ["LinkedIn",  devProfile?.linkedin_url],
          ["Portfolio", devProfile?.portfolio_url],
          ["Status",    devProfile?.status],
        ].map(([label, val]) => (
          <div key={label} className="admin-detail-item">
            <span>{label}</span>
            {val?.startsWith?.("http")
              ? <a href={val} target="_blank" rel="noreferrer" style={{ color: "#62e2ff", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  {val.replace("https://", "")} <ExternalLink size={10} />
                </a>
              : <strong>{val || "—"}</strong>
            }
          </div>
        ))}
      </div>
      {devProfile?.primary_roles?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "#59677a", fontSize: 9, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Primary Roles</p>
          <div className="dev-opp-tags">
            {devProfile.primary_roles.map(r => <span key={r} className="dev-tag">{r}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────
export default function DevDashboard() {
  const { user, profile, devProfile, logout } = useDeveloper();
  const [tab, setTab] = useState("opportunities");
  const ActiveTab = { opportunities: OpportunitiesTab, applications: ApplicationsTab, submissions: SubmitWorkTab, profile: ProfileTab };
  const Component = ActiveTab[tab];

  return (
    <div className="dev-dashboard-shell">
      <div className="dev-dashboard-ambient">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="grid-lines" />
      </div>

      <header className="dev-dashboard-topbar">
        <div className="container dev-dashboard-topbar-inner">
          <div className="dev-dashboard-brand">
            <ExcwaLogo size={36} />
            <span>EXCWA <b>Developers</b></span>
          </div>

          <div className="dev-dashboard-userbar">
            <span className="dev-dashboard-user-name">
              {profile?.full_name || devProfile?.full_name || "Developer"}
            </span>
            <button className="secondary-btn dev-signout-btn" onClick={logout}>
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="container dev-dashboard-content">
        <section className="dev-dashboard-hero">
          <div className="dev-dashboard-hero-copy">
            <p className="eyebrow">Developer Portal</p>
            <h1>
              Welcome back, <span>{(profile?.full_name || devProfile?.full_name || "Developer").split(" ")[0]}</span>
            </h1>
            <p>Browse open projects, track your applications, and submit your work.</p>
          </div>

          <div className="dev-dashboard-hero-metrics">
            <div className="dev-metric-card">
              <span className="dev-metric-label">Status</span>
              <strong>{devProfile?.status || "pending"}</strong>
            </div>
            <div className="dev-metric-card">
              <span className="dev-metric-label">Portal</span>
              <strong>Active</strong>
            </div>
          </div>
        </section>

        <div className="dev-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`dev-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="dev-dashboard-panel">
          <Component devProfile={devProfile} profile={profile} user={user} />
        </div>
      </div>
    </div>
  );
}