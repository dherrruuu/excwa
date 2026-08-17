import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    /*
     * ---------------------------------------------------------
     * Check whether the current Supabase session belongs
     * to an administrator.
     * ---------------------------------------------------------
     */
    const checkAdminAccess = async (session) => {
      if (!mounted) return;

      try {
        /*
         * No active session
         */
        if (!session?.user) {
          if (mounted) {
            setAllowed(false);
            setLoading(false);
          }

          return;
        }

        /*
         * Get the logged-in user's profile
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
          console.error(
            "Admin profile check failed:",
            profileError
          );

          if (mounted) {
            setAllowed(false);
            setLoading(false);
          }

          return;
        }

        /*
         * Only profiles with role = admin
         * are allowed into the admin panel.
         */
        const isAdmin = profile?.role === "admin";

        if (mounted) {
          setAllowed(isAdmin);
          setLoading(false);
        }

      } catch (error) {
        console.error(
          "Admin access check failed:",
          error
        );

        if (mounted) {
          setAllowed(false);
          setLoading(false);
        }
      }
    };

    /*
     * ---------------------------------------------------------
     * Initial session check
     * ---------------------------------------------------------
     *
     * getSession() reads the persisted Supabase session.
     */
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Initial session check failed:",
            error
          );

          if (mounted) {
            setAllowed(false);
            setLoading(false);
          }

          return;
        }

        await checkAdminAccess(session);

      } catch (error) {
        console.error(
          "Authentication initialization failed:",
          error
        );

        if (mounted) {
          setAllowed(false);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    /*
     * ---------------------------------------------------------
     * Listen for authentication changes
     * ---------------------------------------------------------
     *
     * This handles:
     *
     * SIGNED_IN
     * TOKEN_REFRESHED
     * SIGNED_OUT
     * INITIAL_SESSION
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          "Admin auth event:",
          event
        );

        /*
         * Do not perform Supabase database queries
         * directly inside the auth callback.
         *
         * Schedule the access check instead.
         */
        setTimeout(() => {
          checkAdminAccess(session);
        }, 0);
      }
    );

    /*
     * Cleanup
     */
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * Wait while Supabase restores the persisted session
   * ---------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="admin-auth-loading">
        Checking administrator access...
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * No valid administrator session
   * ---------------------------------------------------------
   */
  if (!allowed) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  /*
   * ---------------------------------------------------------
   * Valid administrator
   * ---------------------------------------------------------
   */
  return <Outlet />;
}
