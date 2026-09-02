
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from "lucide-react";

import { loginClient } from "../../services/client/clientAuthService";
import "../../styles/client-portal.css";

export default function ClientLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     LOGIN
  ========================================================= */

  const handleLogin = async (e) => {
    e.preventDefault();

    console.log(
      "🔥 CLIENT LOGIN FORM SUBMITTED"
    );

    setError("");

    if (!email.trim() || !password) {
      console.log(
        "❌ CLIENT LOGIN VALIDATION FAILED"
      );

      setError(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setLoading(true);

      console.log(
        "================================="
      );

      console.log(
        "CLIENT LOGIN UI → CALLING loginClient()"
      );

      console.log(
        "EMAIL:",
        email.trim()
      );

      console.log(
        "================================="
      );

      const result = await loginClient(
        email,
        password
      );

      console.log(
        "================================="
      );

      console.log(
        "✅ CLIENT LOGIN UI → loginClient SUCCESS"
      );

      console.log(
        "LOGIN RESULT:",
        result
      );

      console.log(
        "CLIENT USER:",
        result?.clientUser
      );

      console.log(
        "CLIENT:",
        result?.client
      );

      console.log(
        "================================="
      );

      /* -------------------------------------------------------
         NAVIGATE TO CLIENT DASHBOARD
      ------------------------------------------------------- */

      console.log(
        "CLIENT LOGIN UI → navigating to dashboard..."
      );

      navigate(
        "/client/dashboard",
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error(
        "================================="
      );

      console.error(
        "❌ CLIENT LOGIN UI ERROR"
      );

      console.error(
        "ERROR OBJECT:",
        err
      );

      console.error(
        "ERROR MESSAGE:",
        err?.message
      );

      console.error(
        "================================="
      );

      setError(
        err?.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="client-portal-page">

      <div className="client-login-card">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="client-login-header">

          <span className="client-eyebrow">
            EXCWA TECH
          </span>

          <h1>
            Client Portal
          </h1>

          <p>
            Sign in to manage your projects,
            enquiries and account.
          </p>

        </div>

        {/* =====================================================
            FORM
        ===================================================== */}

        <form
          className="client-login-form"
          onSubmit={handleLogin}
        >

          {/* ---------------------------------------------------
              ERROR
          --------------------------------------------------- */}

          {error && (
            <div className="client-login-error">
              {error}
            </div>
          )}

          {/* ---------------------------------------------------
              EMAIL
          --------------------------------------------------- */}

          <div className="client-field">

            <label htmlFor="client-email">
              Email
            </label>

            <div className="client-input-wrapper">

              <Mail size={16} />

              <input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
              />

            </div>

          </div>

          {/* ---------------------------------------------------
              PASSWORD
          --------------------------------------------------- */}

          <div className="client-field">

            <label htmlFor="client-password">
              Password
            </label>

            <div className="client-input-wrapper">

              <Lock size={16} />

              <input
                id="client-password"
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
                className="client-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (previous) =>
                      !previous
                  )
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>

            </div>

          </div>

          {/* ---------------------------------------------------
              LOGIN BUTTON
          --------------------------------------------------- */}

          <button
            type="submit"
            className="client-login-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <Loader2
                  size={16}
                  className="client-spin"
                />

                Signing in...
              </>
            ) : (
              <>
                Sign in

                <ArrowRight
                  size={16}
                />
              </>
            )}

          </button>

        </form>

      </div>

    </div>
  );
}
