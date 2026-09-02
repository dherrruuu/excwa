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

import "../../styles/client-activation.css";

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
     INITIALIZE CLIENT ACTIVATION
  ========================================================= */

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const initializeActivation = async () => {
      try {
        setLoading(true);
        setError("");

        /* =====================================================
           AUTH STATE LISTENER
        ===================================================== */

        const { data: authListener } =
          supabase.auth.onAuthStateChange(
            (event, currentSession) => {
              if (!mounted) return;

              console.log(
                "Client activation auth event:",
                event
              );

              if (
                currentSession &&
                (
                  event === "PASSWORD_RECOVERY" ||
                  event === "SIGNED_IN" ||
                  event === "INITIAL_SESSION"
                )
              ) {
                setSessionReady(true);
                setLoading(false);
              }
            }
          );

        subscription =
          authListener?.subscription || null;

        /* =====================================================
           CHECK EXISTING SESSION
        ===================================================== */

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        if (sessionData?.session) {
          setSessionReady(true);
          setLoading(false);
          return;
        }

        /* =====================================================
           PROCESS INVITATION / RECOVERY HASH
        ===================================================== */

        const hash = window.location.hash || "";

        if (hash) {
          const hashParams = new URLSearchParams(
            hash.substring(1)
          );

          const accessToken =
            hashParams.get("access_token");

          const refreshToken =
            hashParams.get("refresh_token");

          const tokenType =
            hashParams.get("type");

          console.log(
            "Client activation token detected:",
            {
              hasAccessToken: Boolean(accessToken),
              hasRefreshToken: Boolean(refreshToken),
              type: tokenType,
            }
          );

          if (accessToken && refreshToken) {
            const {
              data: activationData,
              error: activationError,
            } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (activationError) {
              throw activationError;
            }

            if (
              activationData?.session &&
              mounted
            ) {
              setSessionReady(true);
              setLoading(false);

              /*
               * Remove sensitive tokens from
               * the browser URL.
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
           FINAL SESSION CHECK
        ===================================================== */

        await new Promise((resolve) =>
          setTimeout(resolve, 800)
        );

        if (!mounted) return;

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
           INVALID / EXPIRED ACTIVATION
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

        if (!mounted) return;

        setSessionReady(false);
        setLoading(false);

        setError(
          err?.message ||
            "Unable to open the client activation link."
        );
      }
    };

    initializeActivation();

    return () => {
      mounted = false;

      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  /* =========================================================
     PASSWORD VALIDATION
  ========================================================= */

  const validatePassword = () => {
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
  };

  /* =========================================================
     ACTIVATE CLIENT ACCOUNT
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");

    const validationError = validatePassword();

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
         UPDATE AUTH PASSWORD
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
         SUCCESS
      ===================================================== */

      setSuccess(
        "Your EXCWA client account has been activated successfully."
      );

      setPassword("");
      setConfirmPassword("");

      /*
       * Give the user time to see the success message,
       * then send them to the permanent login page.
       */

      setTimeout(() => {
        navigate("/client/login", {
          replace: true,
        });
      }, 1500);
    } catch (err) {
      console.error(
        "Client account activation failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to activate your client account."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (loading) {
    return (
      <div className="client-activation-page">
        <div className="client-activation-container">
          <div className="client-activation-card">

            <div className="client-activation-logo">
              <ExcwaLogo />
            </div>

            <div className="client-activation-loading">

              <Loader2
                size={30}
                className="client-activation-spinner"
              />

              <h2>
                Verifying Activation Link
              </h2>

              <p>
                Please wait while we securely verify
                your EXCWA client account.
              </p>

            </div>

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
      <div className="client-activation-page">
        <div className="client-activation-container">
          <div className="client-activation-card">

            <div className="client-activation-logo">
              <ExcwaLogo />
            </div>

            <div className="client-activation-icon error">
              <AlertCircle size={32} />
            </div>

            <div className="client-activation-header">

              <h1>
                Activation Link Unavailable
              </h1>

              <p>
                {error ||
                  "This activation link is invalid or has expired."}
              </p>

            </div>

            <div className="client-activation-actions">

              <Link
                to="/client/login"
                className="client-activation-button primary"
              >
                Go to Client Login
              </Link>

              <Link
                to="/"
                className="client-activation-button secondary"
              >
                Back to EXCWA
              </Link>

            </div>

          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     ACTIVATION FORM
  ========================================================= */

  return (
    <div className="client-activation-page">
      <div className="client-activation-container">
        <div className="client-activation-card">

          {/* =================================================
              LOGO
          ================================================= */}

          <div className="client-activation-logo">
            <ExcwaLogo />
          </div>

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="client-activation-header">

            <div className="client-activation-icon success">
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

          {/* =================================================
              SUCCESS MESSAGE
          ================================================= */}

          {success && (
            <div className="client-activation-success">
              <CheckCircle2 size={18} />

              <span>
                {success}
              </span>
            </div>
          )}

          {/* =================================================
              ERROR MESSAGE
          ================================================= */}

          {error && (
            <div className="client-activation-error">
              <AlertCircle size={18} />

              <span>
                {error}
              </span>
            </div>
          )}

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="client-activation-form"
          >

            {/* =================================================
                PASSWORD
            ================================================= */}

            <div className="client-activation-field">

              <label htmlFor="client-password">
                Create Password
              </label>

              <div className="client-activation-input-wrapper">

                <LockKeyhole
                  size={18}
                  className="client-activation-input-icon"
                />

                <input
                  id="client-password"
                  className="client-activation-input"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  disabled={submitting}
                  minLength={8}
                />

                <button
                  type="button"
                  className="client-activation-password-toggle"
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
                  disabled={submitting}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

              <small className="client-activation-password-hint">
                Password must contain at least 8 characters.
              </small>

            </div>

            {/* =================================================
                CONFIRM PASSWORD
            ================================================= */}

            <div className="client-activation-field">

              <label htmlFor="client-confirm-password">
                Confirm Password
              </label>

              <div className="client-activation-input-wrapper">

                <LockKeyhole
                  size={18}
                  className="client-activation-input-icon"
                />

                <input
                  id="client-confirm-password"
                  className="client-activation-input"
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
                  minLength={8}
                />

                <button
                  type="button"
                  className="client-activation-password-toggle"
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
                  disabled={submitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </div>

            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
              type="submit"
              className="client-activation-button primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2
                    size={18}
                    className="client-activation-spinner"
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

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="client-activation-footer">

            <span>
              Already activated?
            </span>

            <Link to="/client/login">
              Sign in to Client Portal
            </Link>

          </div>

        </div>
      </div>
    </div>
  );
}