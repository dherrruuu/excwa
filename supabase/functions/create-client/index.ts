import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const APP_URL =
  Deno.env.get("APP_URL") ||
  "https://excwa.vercel.app";

Deno.serve(async (req) => {
  /* =========================================================
     CORS
  ========================================================= */

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  /* =========================================================
     METHOD CHECK
  ========================================================= */

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    /* =======================================================
       AUTHENTICATE CALLER
    ======================================================= */

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error("Authentication required.");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      throw new Error("Invalid authentication token.");
    }

    /*
      Use the user's JWT to identify the caller.
      The service-role client is NOT used to authenticate
      the caller.
    */
    const {
      data: {
        user,
      },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid or expired authentication token.");
    }

    /* =======================================================
       ADMIN AUTHORIZATION
    =======================================================

       IMPORTANT:

       This assumes your profiles table has a role column
       containing "admin".

       If your admin role is stored somewhere else,
       change this query accordingly.
    ======================================================= */

    const {
      data: adminProfile,
      error: adminProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) {
      throw new Error(
        "Unable to verify administrator permissions.",
      );
    }

    if (
      !adminProfile ||
      adminProfile.role !== "admin"
    ) {
      throw new Error(
        "Administrator access required.",
      );
    }

    /* =======================================================
       READ REQUEST
    ======================================================= */

    const body = await req.json();

    const enquiryId = body?.enquiry_id;

    if (!enquiryId) {
      throw new Error(
        "enquiry_id is required.",
      );
    }

    /* =======================================================
       GET ENQUIRY
    ======================================================= */

    const {
      data: enquiry,
      error: enquiryError,
    } = await supabaseAdmin
      .from("enquiries")
      .select("*")
      .eq("id", enquiryId)
      .single();

    if (enquiryError || !enquiry) {
      throw new Error(
        "Enquiry not found.",
      );
    }

    /* =======================================================
       PREVENT DUPLICATE CONVERSION
    ======================================================= */

    if (enquiry.client_id) {
      throw new Error(
        "This enquiry is already converted to a client.",
      );
    }

    /* =======================================================
       VALIDATE CUSTOMER DATA
    ======================================================= */

    const email = String(
      enquiry.email || "",
    )
      .trim()
      .toLowerCase();

    const fullName = String(
      enquiry.customer_name || "",
    ).trim();

    const phone = enquiry.phone
      ? String(enquiry.phone).trim()
      : null;

    if (!email) {
      throw new Error(
        "Customer email is required.",
      );
    }

    if (!fullName) {
      throw new Error(
        "Customer name is required.",
      );
    }

    /* =======================================================
       CHECK EXISTING AUTH ACCOUNT
    ======================================================= */

    /*
      Avoid accidentally creating duplicate client accounts
      for the same email.
    */

    const {
      data: existingUsers,
      error: existingUserError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (existingUserError) {
      throw new Error(
        "Unable to check existing client account.",
      );
    }

    const existingUser = existingUsers.users.find(
      (existing) =>
        existing.email?.toLowerCase() === email,
    );

    if (existingUser) {
      throw new Error(
        "An authentication account already exists for this email.",
      );
    }

    /* =======================================================
       CREATE AUTH ACCOUNT
    ======================================================= */

    /*
      This password is only an internal bootstrap password.

      The client does NOT receive it.

      The client activates the account through the
      password-reset/recovery flow and chooses their own
      permanent password.
    */

    const bootstrapPassword =
      `${crypto.randomUUID()}${crypto.randomUUID()}`;

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: bootstrapPassword,
        email_confirm: true,

        user_metadata: {
          full_name: fullName,
          account_type: "client",
        },
      });

    if (authError) {
      throw authError;
    }

    const userId = authData?.user?.id;

    if (!userId) {
      throw new Error(
        "Failed to create authentication account.",
      );
    }

    /* =======================================================
       CREATE PROFILE
    ======================================================= */

    const {
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: "client",
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

      throw profileError;
    }

    /* =======================================================
       CREATE CLIENT
    ======================================================= */

    const {
      data: client,
      error: clientError,
    } = await supabaseAdmin
      .from("clients")
      .insert({
        company_name: null,
        contact_name: fullName,
        email,
        phone,
        status: "active",
      })
      .select()
      .single();

    if (clientError || !client) {
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

      throw (
        clientError ||
        new Error("Failed to create client.")
      );
    }

    /* =======================================================
       CONNECT AUTH USER → CLIENT
    ======================================================= */

    const {
      error: clientUserError,
    } = await supabaseAdmin
      .from("client_users")
      .insert({
        client_id: client.id,
        user_id: userId,
        role: "owner",
      });

    if (clientUserError) {
      await supabaseAdmin
        .from("clients")
        .delete()
        .eq("id", client.id);

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

      throw clientUserError;
    }

    /* =======================================================
       UPDATE ENQUIRY
    ======================================================= */

    const {
      error: enquiryUpdateError,
    } = await supabaseAdmin
      .from("enquiries")
      .update({
        client_id: client.id,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiry.id);

    if (enquiryUpdateError) {
      await supabaseAdmin
        .from("client_users")
        .delete()
        .eq("client_id", client.id);

      await supabaseAdmin
        .from("clients")
        .delete()
        .eq("id", client.id);

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

      throw enquiryUpdateError;
    }

    /* =======================================================
       GENERATE CLIENT ACTIVATION LINK
    ======================================================= */

    const redirectTo =
      `${APP_URL}/client/activate`;

    const {
      data: activationData,
      error: activationError,
    } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,

        options: {
          redirectTo,
        },
      });

    if (activationError) {
      /*
        Roll back because the account exists but the
        activation link could not be generated.
      */

      await supabaseAdmin
        .from("enquiries")
        .update({
          client_id: null,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", enquiry.id);

      await supabaseAdmin
        .from("client_users")
        .delete()
        .eq("client_id", client.id);

      await supabaseAdmin
        .from("clients")
        .delete()
        .eq("id", client.id);

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

      throw activationError;
    }

    const activationLink =
      activationData?.properties?.action_link;

    if (!activationLink) {
      throw new Error(
        "Failed to generate client activation link.",
      );
    }

    /* =======================================================
       SUCCESS
    ======================================================= */

    return jsonResponse({
      success: true,

      client_id: client.id,

      user_id: userId,

      email,

      client_name: fullName,

      activation_link: activationLink,

      message:
        "Client account created successfully.",
    });
  } catch (error) {
    console.error(
      "Convert enquiry to client error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create client.",
      },
      400,
    );
  }
});

/* =========================================================
   JSON RESPONSE HELPER
========================================================= */

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    },
  );
}