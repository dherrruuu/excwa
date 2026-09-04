import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail } from "lucide-react";

import "../../styles/admin/admin-auth.css";
import ExcwaLogo from "../../components/common/ExcwaLogo";
import { supabase } from "../../lib/supabase";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      /* 1. Sign in through Supabase Authentication */
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) throw loginError;
      if (!data?.user) throw new Error("Unable to authenticate administrator.");

      /* 2. Verify administrator profile & role */
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) throw new Error("Unable to verify administrator profile.");
      if (!profile) throw new Error("No administrator profile was found for this account.");

      if (profile.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("Access denied. This account is not an administrator.");
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      console.error("Admin login error:", err);
      setError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        
        {/* Larger & Center-Aligned Logo */}
        <div className="admin-brand-icon">
          <ExcwaLogo size={52} />
        </div>

        {/* Card Header (Center Aligned) */}
        <div className="admin-login-header">
          <span className="admin-badge">EXCWA TECH</span>
          <h1>Admin Login</h1>
          <p>Login to access your EXCWA admin workspace.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          
          {/* Email Input Frame */}
          <div className="admin-field">
            <label>EMAIL ADDRESS</label>
            <div className="admin-input-wrap">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@excwa.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input Frame */}
          <div className="admin-field">
            <label>PASSWORD</label>
            <div className="admin-input-wrap">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="admin-login-error">
              <span>!</span>
              {error}
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="admin-spinner" />
                Logging in...
              </>
            ) : (
              <>
                Login
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div className="admin-card-footer">
          <span>Protected by EXCWA Security</span>
        </div>

      </div>
    </div>
  );
}