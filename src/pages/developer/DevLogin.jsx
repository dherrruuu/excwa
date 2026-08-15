import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import ExcwaLogo from "../../components/common/ExcwaLogo";
import { supabase } from "../../lib/supabase";

function isProfileComplete(profile) {
  if (!profile) return false;
  const required = [
    "full_name",
    "phone",
    "city",
    "profile_photo_url",
    "github_url",
    "linkedin_url",
    "resume_url",
  ];

  return required.every((key) => {
    const value = profile[key];
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

export default function DevLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const successMessage = location.state?.message || "";

  async function handleLogin() {
    setError("");
    if (!form.email || !form.password) return setError("Both fields are required.");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (authError) {
        const message = (authError.message || "").toLowerCase();
        if (message.includes("rate limit") || message.includes("too many requests") || message.includes("429")) {
          throw new Error("Too many authentication requests. Please wait a few minutes and try again.");
        }
        if (message.includes("email not confirmed") || message.includes("confirm your email") || message.includes("not confirmed")) {
          throw new Error("Account created. Please verify your email before signing in.");
        }
        if (message.includes("invalid login") || message.includes("invalid credentials") || message.includes("email or password")) {
          throw new Error("Invalid email or password.");
        }
        throw authError;
      }

      const { data: devProf, error: profileError } = await supabase
        .from("developer_profiles")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!devProf || !isProfileComplete(devProf)) {
        navigate("/developer/profile", { replace: true });
        return;
      }

      const routes = {
        pending: "/developer/pending",
        rejected: "/developer/rejected",
        suspended: "/developer/suspended",
        approved: "/developer/dashboard",
      };

      navigate(routes[devProf.status] || "/developer/profile", { replace: true });
    } catch (e) {
      setError(e.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dev-auth-page">
      <div className="ambient">
        <div className="orb orb-a" /><div className="orb orb-b" /><div className="orb orb-c" />
        <div className="grid-lines" />
      </div>

      <div className="dev-auth-wrap">
        <Link to="/" className="dev-back-link"><ArrowLeft size={14} /> Back to EXCWA</Link>

        <div className="dev-auth-brand">
          <ExcwaLogo size={42} />
          <span>EXCWA <b>Developers</b></span>
        </div>

        <h1 className="dev-auth-title">Welcome back</h1>
        <p className="dev-auth-sub">Sign in to access your developer dashboard and opportunities.</p>

        <div className="dev-auth-card">
          {successMessage && (
            <div className="dev-status-info-card" style={{ marginBottom: 18, borderColor: "rgba(105,229,183,.15)", background: "rgba(105,229,183,.04)" }}>
              <span style={{ color: "#d8efe6" }}>{successMessage}</span>
            </div>
          )}

          <div className="field">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              disabled={loading} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Password</label>
            <input type="password" placeholder="Your password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              disabled={loading} />
          </div>

          {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}

          <button className="primary-btn form-submit" style={{ marginTop: 20 }}
            onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : <><LogIn size={15} /> Sign In</>}
          </button>

          <p className="dev-auth-footer-text">
            Don't have an account? <Link to="/developer/register" className="dev-link">Join EXCWA</Link>
          </p>
        </div>
      </div>
    </div>
  );
}