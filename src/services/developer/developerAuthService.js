import { supabase } from "../../lib/supabase";

/*
=========================================================
DEVELOPER AUTH SERVICE

Handles:
- Login
- Logout
- Current developer
- Developer profile
- Developer status
=========================================================
*/

/* =======================================================
   LOGIN
======================================================= */

export async function loginDeveloper(email, password) {
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!cleanEmail) {
    throw new Error("Email address is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

  if (error) {
    throw new Error(
      error.message || "Invalid email or password."
    );
  }

  if (!data?.user) {
    throw new Error("Unable to authenticate account.");
  }

  const userId = data.user.id;

  /* -------------------------------------------------------
     PROFILE
  ------------------------------------------------------- */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    throw new Error("Unable to verify account.");
  }

  if (!profile) {
    await supabase.auth.signOut();
    throw new Error("Account profile not found.");
  }

  /* -------------------------------------------------------
     ROLE
  ------------------------------------------------------- */

  if (profile.role !== "developer") {
    await supabase.auth.signOut();

    if (profile.role === "admin") {
      throw new Error(
        "Admin accounts must use the admin login."
      );
    }

    throw new Error(
      "This account does not have developer access."
    );
  }

  /* -------------------------------------------------------
     DEVELOPER PROFILE
  ------------------------------------------------------- */

  const {
    data: developerProfile,
    error: developerError,
  } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (developerError) {
    throw new Error(
      "Unable to verify developer profile."
    );
  }

  return {
    user: data.user,
    profile,
    developerProfile,
  };
}

/* =======================================================
   LOGOUT
======================================================= */

export async function logoutDeveloper() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(
      error.message || "Unable to logout."
    );
  }

  return true;
}

/* =======================================================
   CURRENT SESSION
======================================================= */

export async function getDeveloperSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user) {
    return null;
  }

  return getDeveloperAccount(session.user.id);
}

/* =======================================================
   CURRENT DEVELOPER ACCOUNT
======================================================= */

export async function getDeveloperAccount(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return null;
  }

  const {
    data: developerProfile,
    error: developerError,
  } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (developerError) {
    throw developerError;
  }

  return {
    profile,
    developerProfile,
  };
}

/* =======================================================
   GET DEVELOPER PROFILE BY AUTH USER
======================================================= */

export async function getDeveloperProfile(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const { data, error } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* =======================================================
   GET AUTHENTICATED USER
======================================================= */

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}