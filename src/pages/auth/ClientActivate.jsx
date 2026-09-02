import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import ExcwaLogo from "../../components/common/ExcwaLogo";

import "../../styles/client-portal.css";

export default function ClientActivate() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================================
     CHECK ACTIVATION / RECOVERY SESSION
  ========================================================= */

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    async function initializeActivation() {
      try {
        setLoading(true);
        setError("");

        /* =====================================================
           AUTH STATE LISTENER
        ===================================================== */

        const {
          data: authListener,
        } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            if (!mounted) {
              return;
            }

            console.log(
              "Client activation auth event:",
              event
            );

            if (
              (event === "PASSWORD_RECOVERY" ||
                event === "SIGNED_IN" ||
                event === "INITIAL_SESSION") &&
              currentSession
            ) {
              setSessionReady(true);
              setLoading(false);
            }
          }
        );

        authSubscription =
          authListener?.subscription || null;

        /* =====================================================
           FIRST: CHECK EXISTING SESSION
        ===================================================== */

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) {
          return;
        }

        if (sessionData?.session) {
          setSessionReady(true);
          setLoading(false);
          return;
        }

        /* =====================================================
           SECOND: PROCESS SUPABASE RECOVERY HASH

           Example:

           /client/activate
           #access_token=...
           &refresh_token=...
           &type=recovery
        ===================================================== */

        const hash = window.location.hash || "";

        if (hash) {
          const hashParams = new URLSearchParams(
            hash.replace(/^#/, "")
          );

          const accessToken =
            hashParams.get("access_token");

          const refreshToken =
            hashParams.get("refresh_token");

          const recoveryType =
            hashParams.get("type");

          console.log(
            "Client activation hash detected:",
            {
              hasAccessToken:
                Boolean(accessToken),

              hasRefreshToken:
                Boolean(refreshToken),

              type: recoveryType,
            }
          );

          /*
           * Only create a session when both
           * tokens are available.
           */

          if (accessToken && refreshToken) {
            const {
              data: recoverySession,
              error: recoveryError,
            } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (recoveryError) {
              throw recoveryError;
            }

            if (
              recoverySession?.session &&
              mounted
            ) {
              setSessionReady(true);
              setLoading(false);

              /*
               * Remove tokens from browser URL.
               */

              window.history.replaceState(
                {},
                document.title,
                window.location.pathname +
                  window.location.search
              );

              return;
            }
          }
        }

        /* =====================================================
           THIRD: FINAL SESSION CHECK
        ===================================================== */

        await new Promise((resolve) =>
          setTimeout(resolve, 800)
        );

        if (!mounted) {
          return;
        }

        const {
          data: latestSessionData,
          error: latestSessionError,
        } = await supabase.auth.getSession();

        if (latestSessionError) {
          throw latestSessionError;
        }

        if (latestSessionData?.session) {
          setSessionReady(true);
          setLoading(false);
          return;
        }

        /* =====================================================
           NO VALID SESSION
        ===================================================== */

        setSessionReady(false);
        setLoading(false);

        setError(
          "This activation link is invalid, expired, or has already been used."
        );
      } catch (err) {
        console.error(
          "Client activation initialization failed:",
          err
        );

        if (!mounted) {
          return;
        }

        setSessionReady(false);
        setLoading(false);

        setError(
          err?.message ||
            "Unable to open the client activation link."
        );
      }
    }

    initializeActivation();

    return () => {
      mounted = false;

      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  /* =========================================================
     PASSWORD VALIDATION
  ========================================================= */

  function validatePassword() {
    if (!password) {
      return "Please enter a password.";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      return "Please confirm your password.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  }

  /* =========================================================
     ACTIVATE CLIENT ACCOUNT
  ========================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setSuccess("");

    const validationError =
      validatePassword();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!sessionReady) {
      setError(
        "Your activation session is not ready. Please reopen the activation email."
      );

      return;
    }

    try {
      setSubmitting(true);

      /* =====================================================
         SET PERMANENT PASSWORD
      ===================================================== */

      const {
        data,
        error: updateError,
      } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      if (!data?.user) {
        throw new Error(
          "Password could not be created."
        );
      }

      /* =====================================================
         ACTIVATION SUCCESS
      ===================================================== */

      setSuccess(
        "Your EXCWA client account has been activated successfully."
      );

      setPassword("");
      setConfirmPassword("");

      /*
       * Do NOT automatically open the dashboard.
       *
       * Client explicitly logs in using
       * the newly created permanent password.
       */

      setTimeout(() => {
        navigate("/client/login", {
          replace: true,
        });
      }, 1500);
    } catch (err) {
      console.error(
        "Client password activation failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to activate your client account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (loading) {
    return (
      <div className="client-auth-page">
        <div className="client-auth-card">

          <div className="client-auth-logo">
            <ExcwaLogo />
          </div>

          <div className="client-auth-loading">

            <Loader2
              size={28}
              className="client-auth-spinner"
            />

            <h2>
              Verifying activation link
            </h2>

            <p>
              Please wait while we securely verify
              your EXCWA client account.
            </p>

          </div>

        </div>
      </div>
    );
  }

  /* =========================================================
     INVALID / EXPIRED LINK
  ========================================================= */

  if (!sessionReady) {
    return (
      <div className="client-auth-page">
        <div className="client-auth-card">

          <div className="client-auth-logo">
            <ExcwaLogo />
          </div>

          <div className="client-auth-icon error">
            <AlertCircle size={32} />
          </div>

          <h1>
            Activation Link Unavailable
          </h1>

          <p className="client-auth-description">
            {error ||
              "This activation link is invalid or has expired."}
          </p>

          <div className="client-auth-actions">

            <Link
              to="/client/login"
              className="client-auth-primary-button"
            >
              Go to Client Login
            </Link>

            <Link
              to="/"
              className="client-auth-secondary-button"
            >
              Back to EXCWA
            </Link>

          </div>

        </div>
      </div>
    );
  }

  /* =========================================================
     ACTIVATION FORM
  ========================================================= */

  return (
    <div className="client-auth-page">

      <div className="client-auth-card">

        {/* LOGO */}

        <div className="client-auth-logo">
          <ExcwaLogo />
        </div>

        {/* HEADER */}

        <div className="client-auth-header">

          <div className="client-auth-icon success">
            <CheckCircle2 size={30} />
          </div>

          <h1>
            Activate Your Client Account
          </h1>

          <p>
            Your EXCWA client account is ready.
            Create a permanent password to access
            your client portal.
          </p>

        </div>

        {/* SUCCESS */}

        {success && (
          <div className="client-auth-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="client-auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="client-auth-form"
        >

          {/* PASSWORD */}

          <div className="client-auth-field">

            <label htmlFor="password">
              Create Password
            </label>

            <div className="client-auth-input-wrapper">

              <LockKeyhole size={18} />

              <input
                id="password"
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
                autoComplete="new-password"
                disabled={submitting}
              />

              <button
                type="button"
                className="client-auth-password-toggle"
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
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

            <small>
              Password must contain at least 8 characters.
            </small>

          </div>

          {/* CONFIRM PASSWORD */}

          <div className="client-auth-field">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="client-auth-input-wrapper">

              <LockKeyhole size={18} />

              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={submitting}
              />

              <button
                type="button"
                className="client-auth-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) => !value
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="client-auth-primary-button"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2
                  size={18}
                  className="client-auth-spinner"
                />

                Activating Account...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />

                Activate Client Account
              </>
            )}
          </button>

        </form>

        {/* FOOTER */}

        <div className="client-auth-footer">

          <span>
            Already activated?
          </span>

          <Link to="/client/login">
            Sign in to Client Portal
          </Link>

        </div>

      </div>
    </div>
  );
}