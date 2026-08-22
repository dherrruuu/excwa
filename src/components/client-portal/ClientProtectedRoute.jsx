import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { supabase } from "../../lib/supabase";

export default function ClientProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkClientAccess = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        const { data: clientUser, error } = await supabase
          .from("client_users")
          .select("id, client_id, user_id, role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error(
            "Client authorization error:",
            error
          );

          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        if (!clientUser) {
          await supabase.auth.signOut();

          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        if (
          clientUser.role &&
          clientUser.role !== "client"
        ) {
          await supabase.auth.signOut();

          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        if (mounted) {
          setAuthorized(true);
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "Client protected route error:",
          error
        );

        if (mounted) {
          setAuthorized(false);
          setLoading(false);
        }
      }
    };

    checkClientAccess();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="client-portal-loading">
        <div className="client-loading-spinner" />

        <p>
          Loading client portal...
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <Navigate
        to="/client/login"
        replace
      />
    );
  }

  return <Outlet />;
}