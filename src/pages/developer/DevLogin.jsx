import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useDeveloper } from "../../hooks/useDeveloper";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import "../../styles/DeveloperLogin.css"
export default function DevLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    profile,
    devProfile,
    loading: developerLoading,
  } = useDeveloper();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * =========================================================
   * HANDLE LOGIN REDIRECT
   *
   * If the developer is already authenticated, determine
   * where they should go based on role + developer status.
   * =========================================================
   */

  useEffect(() => {
    if (developerLoading || !user) {
      return;
    }

    /*
     * ---------------------------------------------------------
     * ADMIN
     * ---------------------------------------------------------
     */

    if (profile?.role === "admin") {
      navigate("/admin", {
        replace: true,
      });

      return;
    }

    /*
     * ---------------------------------------------------------
     * ONLY DEVELOPER ROLE
     * ---------------------------------------------------------
     */

    if (profile?.role !== "developer") {
      setError(
        "This account does not have developer access."
      );

      return;
    }

    /*
     * ---------------------------------------------------------
     * NO DEVELOPER PROFILE
     * ---------------------------------------------------------
     *
     * This can happen when an approved application has not
     * yet produced its developer profile.
     *
     * Do NOT send the user to a profile creation page.
     * ---------------------------------------------------------
     */

    if (!devProfile) {
      navigate("/developer/pending", {
        replace: true,
      });

      return;
    }

    /*
     * ---------------------------------------------------------
     * DEVELOPER STATUS
     * ---------------------------------------------------------
     */

    if (devProfile.status === "pending") {
      navigate("/developer/pending", {
        replace: true,
      });

      return;
    }

    if (devProfile.status === "rejected") {
      navigate("/developer/rejected", {
        replace: true,
      });

      return;
    }

    if (devProfile.status === "suspended") {
      navigate("/developer/suspended", {
        replace: true,
      });

      return;
    }

    if (devProfile.status === "approved") {
      navigate("/developer/dashboard", {
        replace: true,
      });

      return;
    }

    /*
     * Unknown status
     */

    setError(
      "Your developer account has an invalid status. Please contact EXCWA Tech."
    );
  }, [
    user,
    profile,
    devProfile,
    developerLoading,
    navigate,
  ]);

  /*
   * =========================================================
   * LOGIN
   * =========================================================
   */

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      /*
       * -------------------------------------------------------
       * SUPABASE AUTH LOGIN
       * -------------------------------------------------------
       */

      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        throw new Error(
          loginError.message ||
            "Invalid email or password."
        );
      }

      if (!data?.user) {
        throw new Error(
          "Unable to authenticate your account."
        );
      }

      /*
       * -------------------------------------------------------
       * Fetch application profile immediately
       * -------------------------------------------------------
       */

      const {
        data: userProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Developer login profile error:",
          profileError
        );

        throw new Error(
          "Unable to verify your account role."
        );
      }

      /*
       * -------------------------------------------------------
       * ROLE CHECK
       * -------------------------------------------------------
       */

      if (!userProfile) {
        await supabase.auth.signOut();

        throw new Error(
          "Your account profile could not be found."
        );
      }

      /*
       * ADMIN
       *
       * Developer login should not be used for admin.
       * Send admin to admin login/dashboard.
       * -------------------------------------------------------
       */

      if (userProfile.role === "admin") {
        await supabase.auth.signOut();

        navigate("/admin/login", {
          replace: true,
          state: {
            error:
              "Admin accounts must use the admin login.",
          },
        });

        return;
      }

      /*
       * -------------------------------------------------------
       * ONLY DEVELOPER
       * -------------------------------------------------------
       */

      if (userProfile.role !== "developer") {
        await supabase.auth.signOut();

        throw new Error(
          "This account does not have developer access."
        );
      }

      /*
       * -------------------------------------------------------
       * FETCH DEVELOPER PROFILE
       * -------------------------------------------------------
       */

      const {
        data: developerProfile,
        error: developerProfileError,
      } = await supabase
        .from("developer_profiles")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (developerProfileError) {
        console.error(
          "Developer profile fetch error:",
          developerProfileError
        );

        throw new Error(
          "Unable to verify developer account."
        );
      }

      /*
       * -------------------------------------------------------
       * PROFILE NOT CREATED
       * -------------------------------------------------------
       */

      if (!developerProfile) {
        navigate("/developer/pending", {
          replace: true,
        });

        return;
      }

      /*
       * -------------------------------------------------------
       * STATUS
       * -------------------------------------------------------
       */

      switch (developerProfile.status) {
        case "pending":
          navigate("/developer/pending", {
            replace: true,
          });
          return;

        case "rejected":
          navigate("/developer/rejected", {
            replace: true,
          });
          return;

        case "suspended":
          navigate("/developer/suspended", {
            replace: true,
          });
          return;

        case "approved":
          navigate("/developer/dashboard", {
            replace: true,
          });
          return;

        default:
          throw new Error(
            "Your developer account has an invalid status."
          );
      }
    } catch (err) {
      console.error(
        "Developer login error:",
        err
      );

      setError(
        err?.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * LOADING SCREEN
   * =========================================================
   */

  if (developerLoading && user) {
    return (
      <div className="admin-loading">
        <div
          className="admin-spinner"
          style={{
            margin: "0 auto 12px",
          }}
        />

        Checking developer account...
      </div>
    );
  }

  /*
   * =========================================================
   * LOGIN UI
   * =========================================================
   */

  return (
    <div className="developer-login-page">

      <div className="developer-login-card">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="developer-login-header">

          <span className="developer-login-eyebrow">
            EXCWA TECH
          </span>

          <h1>
            Developer Login
          </h1>

          <p>
            Login to access your EXCWA developer
            workspace.
          </p>

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="developer-login-error">
            {error}
          </div>
        )}

        {/* ===================================================
            FORM
        =================================================== */}

        <form onSubmit={handleLogin}>

          {/* EMAIL */}

          <div className="developer-login-field">

            <label>
              Email Address
            </label>

            <div className="developer-login-input">

              <Mail size={18} />

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />

            </div>

          </div>

          {/* PASSWORD */}

          <div className="developer-login-field">

            <label>
              Password
            </label>

            <div className="developer-login-input">

              <LockKeyhole size={18} />

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />

            </div>

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="primary-btn developer-login-btn"
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="admin-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Login
                <ArrowRight size={18} />
              </>
            )}

          </button>

        </form>

        {/* ===================================================
            REGISTER
        =================================================== */}

        <div className="developer-login-register">

          <span>
            Don't have a developer account?
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/developer/register")
            }
            disabled={loading}
          >
            Register as Developer
          </button>

        </div>

      </div>

    </div>
  );
}
