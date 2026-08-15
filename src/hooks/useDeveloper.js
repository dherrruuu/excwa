import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useDeveloper() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);      // profiles table
  const [devProfile, setDevProfile] = useState(null); // developer_profiles table
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfiles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfiles(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setDevProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfiles(userId) {
    setLoading(true);
    try {
      const [{ data: prof }, { data: devProf }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("developer_profiles").select("*").eq("user_id", userId).single(),
      ]);
      setProfile(prof || null);
      setDevProfile(devProf || null);
    } catch (e) {
      console.log("fetchProfiles error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return { user, profile, devProfile, loading, logout, refetch: () => user && fetchProfiles(user.id) };
}