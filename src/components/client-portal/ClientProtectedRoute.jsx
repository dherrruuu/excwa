import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { supabase } from "../../lib/supabase";

export default function ClientProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  /* =========================================================
     CHECK CLIENT ACCESS
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const checkClientAccess = async () => {
      console.log(
        "========================================"
      );

      console.log(
        "🔐 CLIENT PROTECTED ROUTE - AUTH CHECK"
      );

      console.log(
        "========================================"
      );

      try {
        /* =====================================================
           STEP 1 — GET AUTHENTICATED USER
        ===================================================== */

        console.log(
          "STEP 1 → Checking Supabase session..."
        );

        const {
          data: {
            session,
          },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log(
          "STEP 1 → Session:",
          session
        );

        console.log(
          "STEP 1 → Error:",
          sessionError
        );

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          console.log(
            "❌ STEP 1 → NO AUTH SESSION"
          );

          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        const userId =
          session.user.id;

        console.log(
          "✅ STEP 1 → AUTHENTICATED"
        );

        console.log(
          "AUTH USER ID:",
          userId
        );

        console.log(
          "AUTH EMAIL:",
          session.user.email
        );

        /* =====================================================
           STEP 2 — DIRECTLY CHECK CLIENT_USERS
        ===================================================== */

        console.log(
          "STEP 2 → Querying client_users..."
        );

        const {
          data: clientUser,
          error: clientUserError,
        } = await supabase
          .from("client_users")
          .select(
            "id, user_id, client_id, role"
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

        console.log(
          "STEP 2 → client_users data:",
          clientUser
        );

        console.log(
          "STEP 2 → client_users error:",
          clientUserError
        );

        /* =====================================================
           RLS / QUERY ERROR
        ===================================================== */

        if (clientUserError) {
          console.error(
            "❌ STEP 2 → CLIENT_USERS QUERY FAILED"
          );

          console.error(
            "ERROR:",
            clientUserError
          );

          throw clientUserError;
        }

        /* =====================================================
           NO CLIENT USER
        ===================================================== */

        if (!clientUser) {
          console.error(
            "❌ STEP 2 → NO CLIENT_USERS ROW RETURNED"
          );

          console.error(
            "IMPORTANT USER ID:",
            userId
          );

          console.error(
            "This usually means the row exists in the DB, "
            + "but RLS is preventing this authenticated user "
            + "from reading it."
          );

          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        console.log(
          "✅ STEP 2 → CLIENT_USERS FOUND"
        );

        console.log(
          "CLIENT USER ID:",
          clientUser.id
        );

        console.log(
          "CLIENT USER_ID:",
          clientUser.user_id
        );

        console.log(
          "CLIENT ID:",
          clientUser.client_id
        );

        console.log(
          "CLIENT ROLE:",
          clientUser.role
        );

        /* =====================================================
           STEP 3 — VALIDATE ROLE
        ===================================================== */

        console.log(
          "STEP 3 → Checking client role..."
        );

        const allowedRoles = [
          "owner",
          "admin",
          "member",
          "client",
        ];

        if (
          clientUser.role &&
          !allowedRoles.includes(
            clientUser.role
          )
        ) {
          console.error(
            "❌ STEP 3 → ROLE REJECTED:",
            clientUser.role
          );

          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        console.log(
          "✅ STEP 3 → ROLE ACCEPTED:",
          clientUser.role
        );

        /* =====================================================
           STEP 4 — CHECK CLIENT RECORD
        ===================================================== */

        console.log(
          "STEP 4 → Querying clients..."
        );

        const {
          data: client,
          error: clientError,
        } = await supabase
          .from("clients")
          .select(
            `
              id,
              company_name,
              contact_name,
              email,
              phone,
              status
            `
          )
          .eq(
            "id",
            clientUser.client_id
          )
          .maybeSingle();

        console.log(
          "STEP 4 → Client:",
          client
        );

        console.log(
          "STEP 4 → Error:",
          clientError
        );

        if (clientError) {
          console.error(
            "❌ STEP 4 → CLIENT QUERY FAILED"
          );

          throw clientError;
        }

        if (!client) {
          console.error(
            "❌ STEP 4 → CLIENT RECORD NOT FOUND"
          );

          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        console.log(
          "✅ STEP 4 → CLIENT FOUND"
        );

        console.log(
          "COMPANY:",
          client.company_name
        );

        console.log(
          "CLIENT STATUS:",
          client.status
        );

        /* =====================================================
           STEP 5 — CHECK CLIENT STATUS
        ===================================================== */

        console.log(
          "STEP 5 → Checking client status..."
        );

        const allowedStatuses = [
          "active",
          "approved",
        ];

        if (
          client.status &&
          !allowedStatuses.includes(
            client.status
          )
        ) {
          console.error(
            "❌ STEP 5 → CLIENT STATUS REJECTED:",
            client.status
          );

          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }

          return;
        }

        console.log(
          "✅ STEP 5 → CLIENT STATUS ACCEPTED"
        );

        /* =====================================================
           SUCCESS
        ===================================================== */

        console.log(
          "========================================"
        );

        console.log(
          "🎉 CLIENT ACCESS AUTHORIZED"
        );

        console.log(
          "========================================"
        );

        if (mounted) {
          setAuthorized(true);
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "========================================"
        );

        console.error(
          "❌ CLIENT PROTECTED ROUTE ERROR"
        );

        console.error(
          "ERROR:",
          error
        );

        console.error(
          "MESSAGE:",
          error?.message
        );

        console.error(
          "CODE:",
          error?.code
        );

        console.error(
          "DETAILS:",
          error?.details
        );

        console.error(
          "HINT:",
          error?.hint
        );

        console.error(
          "========================================"
        );

        if (mounted) {
          setAuthorized(false);
          setLoading(false);
        }
      }
    };

    /* =========================================================
       INITIAL CHECK
    ========================================================= */

    checkClientAccess();

    /* =========================================================
       AUTH STATE LISTENER
    ========================================================= */

    const {
      data: authSubscription,
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          "🔄 CLIENT AUTH EVENT:",
          event
        );

        console.log(
          "AUTH EVENT SESSION:",
          session
        );

        if (!mounted) {
          return;
        }

        if (
          event === "SIGNED_OUT"
        ) {
          console.log(
            "CLIENT SIGNED OUT"
          );

          setAuthorized(false);
          setLoading(false);

          return;
        }

        if (
          event === "SIGNED_IN"
        ) {
          console.log(
            "CLIENT SIGNED IN → RECHECKING ACCESS"
          );

          setLoading(true);

          /*
             Don't directly call Supabase queries inside
             the auth callback before the auth state has
             settled. A small delay avoids race conditions.
          */

          setTimeout(() => {
            if (mounted) {
              checkClientAccess();
            }
          }, 100);
        }
      }
    );

    /* =========================================================
       CLEANUP
    ========================================================= */

    return () => {
      mounted = false;

      authSubscription?.subscription?.unsubscribe();
    };
  }, []);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="client-portal-loading">
        <div className="client-loading-spinner" />

        <p>
          Checking client access...
        </p>
      </div>
    );
  }

  /* =========================================================
     REDIRECT
  ========================================================= */

  if (!authorized) {
    console.log(
      "🚫 CLIENT ACCESS DENIED → /client/login"
    );

    return (
      <Navigate
        to="/client/login"
        replace
      />
    );
  }

  /* =========================================================
     AUTHORIZED
  ========================================================= */

  console.log(
    "✅ CLIENT PROTECTED ROUTE → OUTLET"
  );

  return <Outlet />;
}
