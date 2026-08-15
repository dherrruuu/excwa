import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ExcwaLogo from "../../components/common/ExcwaLogo";
import { registerDeveloper } from "../../services/developerService";

export default function DevRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setError("");

    if (!form.full_name.trim()) return setError("Full name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (!form.password) return setError("Password is required.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");

    setLoading(true);

    try {
      const result = await registerDeveloper({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      const message = result.emailConfirmationRequired
        ? "Account created. Please verify your email before signing in."
        : "Account created successfully. Please sign in to continue your developer profile.";

      navigate("/developer/login", {
        replace: true,
        state: {
          registrationSuccess: true,
          message,
        },
      });
    } catch (e) {
      const message = (e?.message || "").toLowerCase();

      if (message.includes("rate limit") || message.includes("over_email_send_rate_limit") || message.includes("429") || message.includes("too many requests")) {
        setError("Too many authentication requests. Please wait a few minutes and try again.");
      } else if (message.includes("already registered") || message.includes("already exists") || message.includes("user_already_exists")) {
        setError("An account with this email already exists.");
      } else {
        setError(e.message || "Registration failed. Please try again.");
      }
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
        <Link to="/" className="dev-back-link">
          <ArrowLeft size={14} /> Back to EXCWA
        </Link>

        <div className="dev-auth-brand">
          <ExcwaLogo size={42} />
          <span>EXCWA <b>Developers</b></span>
        </div>

        <h1 className="dev-auth-title">Join EXCWA</h1>
        <p className="dev-auth-sub">Create your account to start building your developer profile.</p>

        <div className="dev-auth-card">
          <div className="field">
            <label>Full Name <em>*</em></label>
            <input
              type="text"
              placeholder="Your full name"
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Email <em>*</em></label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Password <em>*</em></label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Confirm Password <em>*</em></label>
            <input
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}

          <button className="primary-btn form-submit" style={{ marginTop: 20 }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating account..." : <>Create Account <ArrowRight size={15} /></>}
          </button>

          <p className="dev-auth-footer-text">
            Already have an account? <Link to="/developer/login" className="dev-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}