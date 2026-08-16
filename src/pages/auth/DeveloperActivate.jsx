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

import "../../styles/DeveloperLogin.css";

export default function DeveloperActivate() {
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

        /*
         * Listen for Supabase auth events before checking
         * the existing session.
         */
        const {
          data: authListener,
        } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            if (!mounted) {
              return;
            }

            console.log(
              "Developer activation auth event:",
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

        /*
         * -------------------------------------------------------
         * FIRST: CHECK EXISTING SESSION
         * -------------------------------------------------------
         */

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

        /*
         * -------------------------------------------------------
         * SECOND: PROCESS RECOVERY HASH
         * -------------------------------------------------------
         *
         * Supabase recovery links may arrive as:
         *
         * /developer/activate
         * #access_token=...
         * &refresh_token=...
         * &type=recovery
         */

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
            "Developer activation hash detected:",
            {
              hasAccessToken:
                Boolean(accessToken),

              hasRefreshToken:
                Boolean(refreshToken),

              type: recoveryType,
            }
          );

          /*
           * Only attempt to create a session when both
           * tokens exist.
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
               * Remove tokens from the address bar.
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

        /*
         * -------------------------------------------------------
         * THIRD: FINAL SESSION CHECK
         * -------------------------------------------------------
         *
         * Give Supabase a moment to process the URL.
         */

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

        /*
         * No valid session.
         */
        setSessionReady(false);
        setLoading(false);

        setError(
          "This activation link is invalid, expired, or has already been used."
        );
      } catch (err) {
        console.error(
          "Developer activation initialization failed:",
          err
        );

        if (!mounted) {
          return;
        }

        setSessionReady(false);
        setLoading(false);

        setError(
          err?.message ||
            "Unable to open the developer activation link."
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
     ACTIVATE ACCOUNT
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

      /*
       * Set the user's password.
       */
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

      /*
       * Password successfully created.
       */
      setSuccess(
        "Your developer account has been activated successfully."
      );

      setPassword("");
      setConfirmPassword("");

      /*
       * IMPORTANT:
       *
       * Do NOT navigate to /developer.
       *
       * The developer must explicitly log in using
       * the newly created password.
       */
      setTimeout(() => {
        navigate("/developer/login", {
          replace: true,
        });
      }, 1200);
    } catch (err) {
      console.error(
        "Developer password activation failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to activate your developer account."
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
      <div className="developer-auth-page">
        <div className="developer-auth-card">

          <div className="developer-auth-logo">
            <ExcwaLogo />
          </div>

          <div className="developer-auth-loading">
            <Loader2
              size={28}
              className="developer-auth-spinner"
            />

            <h2>
              Verifying activation link
            </h2>

            <p>
              Please wait while we securely verify
              your developer account.
            </p>
          </div>

        </div>
      </div>
    );
  }

  /* =========================================================
     INVALID / EXPIRED ACTIVATION LINK
  ========================================================= */

  if (!sessionReady) {
    return (
      <div className="developer-auth-page">
        <div className="developer-auth-card">

          <div className="developer-auth-logo">
            <ExcwaLogo />
          </div>

          <div className="developer-auth-icon error">
            <AlertCircle size={32} />
          </div>

          <h1>
            Activation link unavailable
          </h1>

          <p className="developer-auth-description">
            {error ||
              "This activation link is invalid or has expired."}
          </p>

          <div className="developer-auth-actions">

            <Link
              to="/developer/login"
              className="developer-auth-primary-button"
            >
              Go to Developer Login
            </Link>

            <Link
              to="/"
              className="developer-auth-secondary-button"
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
    <div className="developer-auth-page">

      <div className="developer-auth-card">

        {/* ===================================================
            LOGO
        =================================================== */}

        <div className="developer-auth-logo">
          <ExcwaLogo />
        </div>

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="developer-auth-header">

          <div className="developer-auth-icon success">
            <CheckCircle2 size={30} />
          </div>

          <h1>
            Activate Your Developer Account
          </h1>

          <p>
            Your developer application has been
            approved. Create a password to activate
            your EXCWA developer account.
          </p>

        </div>

        {/* ===================================================
            ERROR MESSAGE
        =================================================== */}

        {error && (
          <div className="developer-auth-message error">

            <AlertCircle size={18} />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* ===================================================
            SUCCESS MESSAGE
        =================================================== */}

        {success && (
          <div className="developer-auth-message success">

            <CheckCircle2 size={18} />

            <span>
              {success}
            </span>

          </div>
        )}

        {/* ===================================================
            FORM
        =================================================== */}

        <form
          onSubmit={handleSubmit}
          className="developer-auth-form"
        >

          {/* =================================================
              PASSWORD
          ================================================= */}

          <div className="developer-auth-field">

            <label htmlFor="developer-password">
              Create Password
            </label>

            <div className="developer-auth-input-wrapper">

              <LockKeyhole size={18} />

              <input
                id="developer-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value
                  );

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="Enter your password"
                autoComplete="new-password"
                disabled={submitting}
              />

              <button
                type="button"
                className="developer-auth-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                disabled={submitting}
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

            <span className="developer-auth-field-hint">
              Use at least 8 characters.
            </span>

          </div>

          {/* =================================================
              CONFIRM PASSWORD
          ================================================= */}

          <div className="developer-auth-field">

            <label htmlFor="developer-confirm-password">
              Confirm Password
            </label>

            <div className="developer-auth-input-wrapper">

              <LockKeyhole size={18} />

              <input
                id="developer-confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(
                    event.target.value
                  );

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={submitting}
              />

              <button
                type="button"
                className="developer-auth-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
                disabled={submitting}
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

          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="submit"
            className="developer-auth-primary-button"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2
                  size={18}
                  className="developer-auth-spinner"
                />

                Activating Account...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />

                Activate Developer Account
              </>
            )}
          </button>

        </form>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <div className="developer-auth-footer">

          <span>
            Already activated your account?
          </span>

          <Link to="/developer/login">
            Developer Login
          </Link>

        </div>

      </div>

    </div>
  );
}