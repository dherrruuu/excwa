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

import "../../styles/admin/admin-auth.css";

import ExcwaLogo from "../../components/common/ExcwaLogo";
import { supabase } from "../../lib/supabase";

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
      /*
       * ---------------------------------------------------------
       * 1. Sign in through Supabase Authentication
       * ---------------------------------------------------------
       */
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

      /*
       * ---------------------------------------------------------
       * 2. Get the actual persisted session
       * ---------------------------------------------------------
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session || !session.user) {
        throw new Error(
          "Login succeeded, but no active session was created."
        );
      }

      console.log("========== ADMIN AUTH ==========");
      console.log("Session exists:", !!session);
      console.log("User ID:", session.user.id);
      console.log("Email:", session.user.email);
      console.log(
        "Access token exists:",
        !!session.access_token
      );
      console.log("================================");

      /*
       * ---------------------------------------------------------
       * 3. Verify administrator profile
       * ---------------------------------------------------------
       *
       * Your RLS policies require:
       *
       * profiles.id = auth.uid()
       * profiles.role = 'admin'
       *
       * Therefore we verify that before entering the panel.
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        throw new Error(
          "Unable to verify administrator profile."
        );
      }

      if (!profile) {
        throw new Error(
          "No administrator profile was found for this account."
        );
      }

      console.log("========== ADMIN PROFILE ==========");
      console.log("Profile ID:", profile.id);
      console.log("Role:", profile.role);
      console.log("===================================");

      /*
       * ---------------------------------------------------------
       * 4. Verify admin role
       * ---------------------------------------------------------
       */
      if (profile.role !== "admin") {
        await supabase.auth.signOut();

        throw new Error(
          "Access denied. This account is not an administrator."
        );
      }

      /*
       * ---------------------------------------------------------
       * 5. Everything is valid
       * ---------------------------------------------------------
       */
      navigate("/admin", { replace: true });

    } catch (err) {
      console.error("Admin login error:", err);

      setError(
        err?.message ||
          "Unable to sign in. Please try again."
      );
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
          <ExcwaLogo size={46} />

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
                Sign in to access the EXCWA Tech
                administration panel.
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
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
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
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  tabIndex={-1}
                  disabled={loading}
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

          {/* Security note */}
          <div className="admin-security-note">
            <ShieldCheck size={14} />

            <span>
              Protected by Supabase Authentication
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="admin-login-footer">
          <span>EXCWA Tech Administration</span>
          <span>© 2026 EXCWA Tech</span>
        </div>

      </div>
    </div>
  );
}
