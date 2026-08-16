import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminProtectedRoute() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Admin access check failed:", error);

          if (mounted) {
            setAllowed(false);
            setLoading(false);
          }

          return;
        }

        const isAdmin = profile?.role === "admin";

        if (mounted) {
          setAllowed(isAdmin);
          setLoading(false);
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          setAllowed(false);
          setLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="admin-auth-loading">
        Checking access...
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}