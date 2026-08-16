import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useDeveloper() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [devProfile, setDevProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
   * ==========================================================
   * FETCH USER + DEVELOPER PROFILE
   * ==========================================================
   */

  const fetchProfiles = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setDevProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        { data: userProfile, error: profileError },
        { data: developerProfile, error: devProfileError },
      ] = await Promise.all([
        /*
         * Main application profile
         * Contains role: admin / developer
         */
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle(),

        /*
         * Developer-specific profile
         * Created automatically after approval
         */
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

      setProfile(userProfile || null);
      setDevProfile(developerProfile || null);
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

  /*
   * ==========================================================
   * AUTH INITIALIZATION
   * ==========================================================
   */

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
            setUser(null);
            setProfile(null);
            setDevProfile(null);
            setLoading(false);
          }

          return;
        }

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);

          await fetchProfiles(
            session.user.id
          );
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
          setUser(null);
          setProfile(null);
          setDevProfile(null);
          setLoading(false);
        }
      }
    }

    initializeAuth();

    /*
     * ========================================================
     * AUTH STATE CHANGES
     * ========================================================
     */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);

          await fetchProfiles(
            session.user.id
          );
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

  /*
   * ==========================================================
   * LOGOUT
   * ==========================================================
   */

  async function logout() {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

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

  /*
   * ==========================================================
   * REFETCH
   * ==========================================================
   */

  const refetch = useCallback(() => {
    if (!user?.id) {
      return Promise.resolve();
    }

    return fetchProfiles(user.id);
  }, [user?.id, fetchProfiles]);

  /*
   * ==========================================================
   * RETURN
   * ==========================================================
   */

  return {
    user,
    profile,
    devProfile,
    loading,
    logout,
    refetch,
  };
}
