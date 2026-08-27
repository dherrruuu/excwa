import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

/* =========================================================
   STORAGE BUCKETS
========================================================= */

const PROFILE_PHOTO_BUCKET = "profile-photos";
const DEVELOPER_RESUME_BUCKET = "developer-resumes";

/* =========================================================
   HOOK
========================================================= */

export function useDeveloper() {
  const [user, setUser] = useState(null);

  const [profile, setProfile] = useState(null);

  const [devProfile, setDevProfile] =
    useState(null);

  const [loading, setLoading] = useState(true);

  /* =========================================================
     RESOLVE PROFILE PHOTO

     Bucket:
     profile-photos

     This bucket is PUBLIC.
  ========================================================= */

  const resolveProfilePhoto = useCallback(
    (profileData) => {
      if (!profileData) {
        return null;
      }

      const photoPath =
        profileData.profile_photo_path;

      if (
        typeof photoPath !== "string" ||
        !photoPath.trim()
      ) {
        return {
          ...profileData,
          profile_photo_url: null,
        };
      }

      const { data } =
        supabase.storage
          .from(PROFILE_PHOTO_BUCKET)
          .getPublicUrl(photoPath);

      return {
        ...profileData,
        profile_photo_url:
          data?.publicUrl || null,
      };
    },
    []
  );

  /* =========================================================
     RESOLVE RESUME

     Bucket:
     developer-resumes

     This bucket is PRIVATE.

     Therefore we generate a temporary signed URL.
  ========================================================= */

  const resolveResume = useCallback(
    async (developerData) => {
      if (!developerData) {
        return null;
      }

      const resumePath =
        developerData.resume_path;

      if (
        typeof resumePath !== "string" ||
        !resumePath.trim()
      ) {
        return {
          ...developerData,
          resume_url: null,
        };
      }

      const {
        data,
        error,
      } =
        await supabase.storage
          .from(DEVELOPER_RESUME_BUCKET)
          .createSignedUrl(
            resumePath,
            60 * 60
          );

      if (error) {
        console.error(
          "Resume URL error:",
          error
        );

        return {
          ...developerData,
          resume_url: null,
        };
      }

      return {
        ...developerData,
        resume_url:
          data?.signedUrl || null,
      };
    },
    []
  );

  /* =========================================================
     FETCH PROFILE DATA

     profiles
       ↓
     Common account information

     developer_profiles
       ↓
     Developer-specific information
  ========================================================= */

  const fetchProfiles = useCallback(
    async (userId) => {
      if (!userId) {
        setProfile(null);
        setDevProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        /* ===================================================
           FETCH BOTH TABLES IN PARALLEL
        =================================================== */

        const [
          profileResult,
          developerResult,
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

        /* ===================================================
           PROFILE ERROR
        =================================================== */

        if (profileResult.error) {
          console.error(
            "profiles fetch error:",
            profileResult.error
          );
        }

        /* ===================================================
           DEVELOPER PROFILE ERROR
        =================================================== */

        if (developerResult.error) {
          console.error(
            "developer_profiles fetch error:",
            developerResult.error
          );
        }

        /* ===================================================
           NORMALIZE COMMON PROFILE
        =================================================== */

        const normalizedProfile =
          resolveProfilePhoto(
            profileResult.data || null
          );

        /* ===================================================
           RESOLVE DEVELOPER RESUME

           Resume is stored in a PRIVATE bucket.
        =================================================== */

        const normalizedDeveloperProfile =
          await resolveResume(
            developerResult.data || null
          );

        /* ===================================================
           UPDATE STATE
        =================================================== */

        setProfile(
          normalizedProfile
        );

        setDevProfile(
          normalizedDeveloperProfile
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
    },
    [
      resolveProfilePhoto,
      resolveResume,
    ]
  );

  /* =========================================================
     AUTH INITIALIZATION
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        /* ===============================================
           SESSION ERROR
        =============================================== */

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

        /* ===============================================
           CURRENT USER
        =============================================== */

        const currentUser =
          data?.session?.user || null;

        /* ===============================================
           NO SESSION
        =============================================== */

        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setDevProfile(null);
          setLoading(false);

          return;
        }

        /* ===============================================
           SET USER
        =============================================== */

        setUser(currentUser);

        /* ===============================================
           FETCH PROFILE
        =============================================== */

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
    };

    initialize();

    /* =======================================================
       AUTH STATE LISTENER
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

          /* ===============================================
             LOGGED OUT
          =============================================== */

          if (!currentUser) {
            setUser(null);
            setProfile(null);
            setDevProfile(null);
            setLoading(false);

            return;
          }

          /* ===============================================
             LOGGED IN
          =============================================== */

          setUser(currentUser);

          /*
           * Defer profile fetching so it does not
           * compete with Supabase auth state updates.
           */

          setTimeout(() => {
            if (!mounted) {
              return;
            }

            fetchProfiles(
              currentUser.id
            );
          }, 0);
        }
      );

    /* =======================================================
       CLEANUP
    ======================================================= */

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
     REFRESH PROFILE
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
