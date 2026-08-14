import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data?.user) {
        throw new Error("Unable to authenticate administrator.");
      }

      navigate("/admin", { replace: true });

    } catch (err) {
      console.error("Admin login error:", err);

      // Show the actual Supabase error
      setError(err?.message || "Unable to sign in.");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      {/* Ambient background */}
      <div className="admin-login-ambient">
        <div className="admin-login-orb orb-1" />
        <div className="admin-login-orb orb-2" />
        <div className="admin-login-grid" />
      </div>

      <div className="admin-login-container">

        {/* Brand */}
        <div className="admin-login-brand">
          <div className="admin-logo-mark">
            <span />
          </div>

          <div className="admin-brand-text">
            <strong>
              EXCWA <span>Tech</span>
            </strong>

            <small>ADMINISTRATOR</small>
          </div>
        </div>

        {/* Login Card */}
        <div className="admin-login-card">

          <div className="admin-login-header">
            <div className="admin-login-icon">
              <ShieldCheck size={25} />
            </div>

            <div>
              <span className="admin-eyebrow">
                <Sparkles size={12} />
                Secure Access
              </span>

              <h1>Welcome Back.</h1>

              <p>
                Sign in to access the EXCWA Tech administration panel.
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin}>

            {/* Email */}
            <div className="admin-field">
              <label>Administrator Email</label>

              <div className="admin-input-wrap">
                <Mail size={17} />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="excwa@admin.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="admin-field">
              <label>Password</label>

              <div className="admin-input-wrap">
                <Lock size={17} />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="admin-login-error">
                <span>!</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="admin-login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="admin-spinner" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Admin Panel
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </form>

          <div className="admin-security-note">
            <ShieldCheck size={14} />
            <span>Protected by Supabase Authentication</span>
          </div>

        </div>

        <div className="admin-login-footer">
          <span>EXCWA Tech Administration</span>
          <span>© 2026 EXCWA Tech</span>
        </div>

      </div>
    </div>
  );
}