import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  LogIn,
  Mail,
  AlertCircle,
} from "lucide-react";

import { loginClient } from "../../services/client/clientAuthService";
import ExcwaLogo from "../../components/common/ExcwaLogo";

import "../../styles/client-login.css";

export default function ClientLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      await loginClient(normalizedEmail, password);

      navigate("/client/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error("Client login failed:", err);

      setError(
        err?.message ||
          "Unable to sign in. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-login-page">

      {/* Background */}
      <div className="client-login-background">
        <div className="client-login-grid" />

        <div className="client-login-glow client-login-glow-one" />
        <div className="client-login-glow client-login-glow-two" />
      </div>

      {/* Login Container */}
      <main className="client-login-container">

        <section className="client-login-card">

          {/* =====================================================
              LOGO
          ====================================================== */}

          <div className="client-login-logo">
            <ExcwaLogo />
          </div>


          {/* =====================================================
              HEADING
          ====================================================== */}

          <div className="client-login-heading">

            <span className="client-login-eyebrow">
              EXCWA CLIENT PORTAL
            </span>

            <h1>
              Welcome Back
            </h1>

            <p>
              Sign in to securely manage your projects,
              enquiries and account.
            </p>

          </div>


          {/* =====================================================
              ERROR
          ====================================================== */}

          {error && (
            <div className="client-login-error">

              <AlertCircle size={18} />

              <span>
                {error}
              </span>

            </div>
          )}


          {/* =====================================================
              LOGIN FORM
          ====================================================== */}

          <form
            className="client-login-form"
            onSubmit={handleSubmit}
          >

            {/* Email */}

            <div className="client-login-field">

              <label htmlFor="client-email">
                Email Address
              </label>

              <div className="client-login-input">

                <Mail size={18} />

                <input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter your email address"
                  autoComplete="email"
                  disabled={loading}
                />

              </div>

            </div>


            {/* Password */}

            <div className="client-login-field">

              <label htmlFor="client-password">
                Password
              </label>

              <div className="client-login-input">

                <LockKeyhole size={18} />

                <input
                  id="client-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="client-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </div>


            {/* Submit */}

            <button
              type="submit"
              className="client-login-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="client-login-spinner"
                  />

                  Signing In...
                </>
              ) : (
                <>
                  <LogIn size={18} />

                  Sign In to Client Portal
                </>
              )}

            </button>

          </form>


          {/* =====================================================
              FOOTER
          ====================================================== */}

          

        </section>


        {/* Security text */}

        <div className="client-login-security">

          <LockKeyhole size={13} />

          <span>
            Secure client portal · Protected by EXCWA
          </span>

        </div>

      </main>

    </div>
  );
}