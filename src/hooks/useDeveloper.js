import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useDeveloper() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [devProfile, setDevProfile] = useState(null);
  const [loading, setLoading] = useState(true);


  // ==========================================================
  // FETCH PROFILES
  // ==========================================================

  const fetchProfiles = useCallback(async (userId) => {
    if (!userId) {
      return;
    }

    try {
      const [
        { data: prof, error: profileError },
        { data: devProf, error: devProfileError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle(),

        supabase
          .from("developer_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);


      if (profileError) {
        console.error(
          "profiles fetch error:",
          profileError
        );
      }


      if (devProfileError) {
        console.error(
          "developer_profiles fetch error:",
          devProfileError
        );
      }


      setProfile(prof || null);
      setDevProfile(devProf || null);

    } catch (error) {

      console.error(
        "fetchProfiles error:",
        error
      );

    } finally {

      setLoading(false);

    }
  }, []);


  // ==========================================================
  // AUTH INITIALIZATION
  // ==========================================================

  useEffect(() => {
    let mounted = true;


    async function initializeAuth() {
      try {

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();


        if (error) {
          console.error(
            "getSession error:",
            error
          );

          if (mounted) {
            setLoading(false);
          }

          return;
        }


        if (!mounted) {
          return;
        }


        if (session?.user) {

          setUser(session.user);

          /*
           * Profile fetching happens in the background.
           * The dashboard does not need to wait for it
           * before rendering.
           */
          fetchProfiles(session.user.id);

        } else {

          setUser(null);
          setProfile(null);
          setDevProfile(null);
          setLoading(false);

        }

      } catch (error) {

        console.error(
          "Authentication initialization error:",
          error
        );

        if (mounted) {
          setLoading(false);
        }

      }
    }


    initializeAuth();


    // ========================================================
    // AUTH STATE CHANGES
    // ========================================================

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {

        if (!mounted) {
          return;
        }


        if (session?.user) {

          setUser(session.user);

          /*
           * Don't unnecessarily wipe the existing
           * profile while refreshing.
           */
          fetchProfiles(session.user.id);

        } else {

          setUser(null);
          setProfile(null);
          setDevProfile(null);
          setLoading(false);

        }

      }
    );


    return () => {
      mounted = false;
      subscription.unsubscribe();
    };

  }, [fetchProfiles]);


  // ==========================================================
  // LOGOUT
  // ==========================================================

  async function logout() {
    try {

      await supabase.auth.signOut();

      setUser(null);
      setProfile(null);
      setDevProfile(null);

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }
  }


  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    user,
    profile,
    devProfile,
    loading,
    logout,

    refetch: () => {
      if (user?.id) {
        return fetchProfiles(user.id);
      }

      return Promise.resolve();
    },
  };
}