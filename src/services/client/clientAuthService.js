import { supabase } from "../../lib/supabase";

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_CLIENT_ROLES = ["owner", "admin", "member", "client"];
const ALLOWED_CLIENT_STATUSES = ["active", "approved"];

/* =========================================================
   CLIENT LOGIN
========================================================= */

export async function loginClient(email, password) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error("Please enter your email and password.");
  }

  /* -------------------------------------------------------
     STEP 1 — AUTHENTICATE
  ------------------------------------------------------- */

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (authError) {
    throw new Error(
      authError.message || "Invalid email or password."
    );
  }

  const user = authData?.user;

  if (!user) {
    await supabase.auth.signOut();
    throw new Error("Unable to authenticate your account.");
  }

  /* -------------------------------------------------------
     STEP 2 — VERIFY SESSION
  ------------------------------------------------------- */

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    await supabase.auth.signOut();

    throw new Error(
      "Authentication succeeded, but your session could not be established."
    );
  }

  /* -------------------------------------------------------
     STEP 3 — VERIFY CLIENT USER RELATIONSHIP
  ------------------------------------------------------- */

  const { data: clientUser, error: clientUserError } =
    await supabase
      .from("client_users")
      .select(`
        id,
        client_id,
        user_id,
        role
      `)
      .eq("user_id", user.id)
      .maybeSingle();

  if (clientUserError) {
    await supabase.auth.signOut();
    throw clientUserError;
  }

  if (!clientUser) {
    await supabase.auth.signOut();

    throw new Error(
      "This account is not registered as a client."
    );
  }

  /* -------------------------------------------------------
     STEP 4 — VERIFY CLIENT ROLE
  ------------------------------------------------------- */

  if (!ALLOWED_CLIENT_ROLES.includes(clientUser.role)) {
    await supabase.auth.signOut();

    throw new Error(
      "Your account does not have permission to access the client portal."
    );
  }

  /* -------------------------------------------------------
     STEP 5 — VERIFY CLIENT ID THROUGH RPC
  ------------------------------------------------------- */

  const {
    data: rpcClientId,
    error: rpcError,
  } = await supabase.rpc("get_my_client_id");

  if (rpcError) {
    await supabase.auth.signOut();

    throw new Error(
      "Unable to verify your client account."
    );
  }

  if (!rpcClientId) {
    await supabase.auth.signOut();

    throw new Error(
      "Your client account could not be verified."
    );
  }

  if (rpcClientId !== clientUser.client_id) {
    await supabase.auth.signOut();

    throw new Error(
      "Your client account verification failed."
    );
  }

  /* -------------------------------------------------------
     STEP 6 — GET CLIENT
  ------------------------------------------------------- */

  const { data: client, error: clientError } =
    await supabase
      .from("clients")
      .select(`
        id,
        company_name,
        contact_name,
        email,
        phone,
        status
      `)
      .eq("id", clientUser.client_id)
      .maybeSingle();

  if (clientError) {
    await supabase.auth.signOut();
    throw clientError;
  }

  if (!client) {
    await supabase.auth.signOut();

    throw new Error(
      "Your client account could not be found."
    );
  }

  /* -------------------------------------------------------
     STEP 7 — VERIFY CLIENT STATUS
  ------------------------------------------------------- */

  if (!ALLOWED_CLIENT_STATUSES.includes(client.status)) {
    await supabase.auth.signOut();

    throw new Error(
      `Your client account is currently ${client.status || "inactive"}.`
    );
  }

  /* -------------------------------------------------------
     LOGIN SUCCESS
  ------------------------------------------------------- */

  return {
    user,
    clientUser,
    client,
  };
}

/* =========================================================
   GET CURRENT CLIENT
========================================================= */

export async function getCurrentClient() {
  /* -------------------------------------------------------
     STEP 1 — AUTH USER
  ------------------------------------------------------- */

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  /* -------------------------------------------------------
     STEP 2 — CLIENT USER
  ------------------------------------------------------- */

  const { data: clientUser, error: clientUserError } =
    await supabase
      .from("client_users")
      .select(`
        id,
        client_id,
        user_id,
        role
      `)
      .eq("user_id", user.id)
      .maybeSingle();

  if (clientUserError) {
    throw clientUserError;
  }

  if (!clientUser) {
    return null;
  }

  /* -------------------------------------------------------
     STEP 3 — VERIFY ROLE
  ------------------------------------------------------- */

  if (!ALLOWED_CLIENT_ROLES.includes(clientUser.role)) {
    return null;
  }

  /* -------------------------------------------------------
     STEP 4 — VERIFY CLIENT ID
  ------------------------------------------------------- */

  const {
    data: rpcClientId,
    error: rpcError,
  } = await supabase.rpc("get_my_client_id");

  if (rpcError) {
    throw rpcError;
  }

  if (!rpcClientId || rpcClientId !== clientUser.client_id) {
    return null;
  }

  /* -------------------------------------------------------
     STEP 5 — CLIENT
  ------------------------------------------------------- */

  const { data: client, error: clientError } =
    await supabase
      .from("clients")
      .select(`
        id,
        company_name,
        contact_name,
        email,
        phone,
        status
      `)
      .eq("id", clientUser.client_id)
      .maybeSingle();

  if (clientError) {
    throw clientError;
  }

  if (!client) {
    return null;
  }

  /* -------------------------------------------------------
     STEP 6 — STATUS
  ------------------------------------------------------- */

  if (!ALLOWED_CLIENT_STATUSES.includes(client.status)) {
    return null;
  }

  return {
    user,
    clientUser,
    client,
  };
}

/* =========================================================
   CLIENT LOGOUT
========================================================= */

export async function logoutClient() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}