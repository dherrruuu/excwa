import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useDeveloper } from "../../hooks/useDeveloper";

export default function DevProtectedRoute() {
  const {
    user,
    profile,
    devProfile,
    loading,
  } = useDeveloper();

  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    /*
     * =========================================================
     * STEP 1
     * USER MUST BE AUTHENTICATED
     * =========================================================
     */

    if (!user) {
      navigate("/developer/login", {
        replace: true,
      });

      return;
    }

    /*
     * =========================================================
     * STEP 2
     * ONLY DEVELOPER ROLE CAN ACCESS
     *
     * admin    -> denied
     * developer -> continue
     * =========================================================
     */

    if (profile?.role !== "developer") {
      console.warn(
        `Developer access denied. User role: ${
          profile?.role || "unknown"
        }`
      );

      navigate("/developer/login", {
        replace: true,
        state: {
          error:
            "This account does not have developer access.",
        },
      });

      return;
    }

    /*
     * =========================================================
     * STEP 3
     * DEVELOPER PROFILE MUST EXIST
     *
     * The profile is created automatically after
     * the application is approved.
     *
     * There is NO profile completion page.
     * =========================================================
     */

    if (!devProfile) {
      navigate("/developer/pending", {
        replace: true,
      });

      return;
    }

    /*
     * =========================================================
     * STEP 4
     * CHECK DEVELOPER STATUS
     * =========================================================
     */

    const status = devProfile.status;

    if (status === "pending") {
      navigate("/developer/pending", {
        replace: true,
      });

      return;
    }

    if (status === "rejected") {
      navigate("/developer/rejected", {
        replace: true,
      });

      return;
    }

    if (status === "suspended") {
      navigate("/developer/suspended", {
        replace: true,
      });

      return;
    }

    /*
     * =========================================================
     * STEP 5
     * ONLY APPROVED DEVELOPERS CAN ACCESS DASHBOARD
     * =========================================================
     */

    if (status !== "approved") {
      navigate("/developer/pending", {
        replace: true,
      });

      return;
    }
  }, [
    user,
    profile,
    devProfile,
    loading,
    navigate,
  ]);

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <div className="admin-loading">
        <div
          className="admin-spinner"
          style={{
            margin: "0 auto 12px",
          }}
        />

        Loading...
      </div>
    );
  }

  /*
   * =========================================================
   * FINAL SECURITY CHECK
   *
   * Dashboard renders ONLY when:
   *
   * 1. User exists
   * 2. Role = developer
   * 3. Developer profile exists
   * 4. Status = approved
   *
   * NO profile completeness check.
   * =========================================================
   */

  if (
    !user ||
    profile?.role !== "developer" ||
    !devProfile ||
    devProfile.status !== "approved"
  ) {
    return null;
  }

  /*
   * =========================================================
   * APPROVED DEVELOPER
   * =========================================================
   */

  return <Outlet />;
}
