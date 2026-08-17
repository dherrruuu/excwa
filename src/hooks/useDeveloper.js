import {
  useState,
  useEffect,
  useCallback,
} from "react";

import { supabase } from "../lib/supabase";

export function useDeveloper() {
  const [user, setUser] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [devProfile, setDevProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  /* =========================================================
     FETCH PROFILES
  ========================================================= */

  const fetchProfiles =
    useCallback(async (userId) => {
      if (!userId) {
        setProfile(null);
        setDevProfile(null);
        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        const profileResult =
          await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (profileResult.error) {
          console.error(
            "profiles fetch error:",
            profileResult.error
          );
        }

        const developerResult =
          await supabase
            .from("developer_profiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (developerResult.error) {
          console.error(
            "developer_profiles fetch error:",
            developerResult.error
          );
        }

        setProfile(
          profileResult.data || null
        );

        setDevProfile(
          developerResult.data || null
        );
      } catch (error) {
        console.error(
          "fetchProfiles error:",
          error
        );

        setProfile(null);
        setDevProfile(null);
      } finally {
        setLoading(false);
      }
    }, []);

  /* =========================================================
     AUTH INITIALIZATION
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "getSession error:",
            error
          );

          setUser(null);
          setProfile(null);
          setDevProfile(null);
          setLoading(false);

          return;
        }

        const currentUser =
          data?.session?.user || null;

        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setDevProfile(null);
          setLoading(false);

          return;
        }

        setUser(currentUser);

        await fetchProfiles(
          currentUser.id
        );
      } catch (error) {
        console.error(
          "Authentication initialization error:",
          error
        );

        if (mounted) {
          setUser(null);
          setProfile(null);
          setDevProfile(null);
          setLoading(false);
        }
      }
    }

    initialize();

    /* =======================================================
       AUTH LISTENER
    ======================================================= */

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

          const currentUser =
            session?.user || null;

          if (!currentUser) {
            setUser(null);
            setProfile(null);
            setDevProfile(null);
            setLoading(false);

            return;
          }

          setUser(currentUser);

          /*
           * Defer the profile request so that the auth
           * callback doesn't compete with Supabase's
           * internal auth state update.
           */
          setTimeout(() => {
            if (mounted) {
              fetchProfiles(
                currentUser.id
              );
            }
          }, 0);
        }
      );

    return () => {
      mounted = false;

      authListener?.subscription?.unsubscribe();
    };
  }, [fetchProfiles]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  const logout = useCallback(
    async () => {
      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Logout error:",
          error
        );

        throw error;
      }

      setUser(null);
      setProfile(null);
      setDevProfile(null);
    },
    []
  );

  /* =========================================================
     REFRESH
  ========================================================= */

  const refetch = useCallback(
    async () => {
      if (!user?.id) {
        return;
      }

      await fetchProfiles(
        user.id
      );
    },
    [
      user?.id,
      fetchProfiles,
    ]
  );

  /* =========================================================
     RETURN
  ========================================================= */

  return {
    user,
    profile,
    devProfile,
    loading,
    logout,
    refetch,
  };
}