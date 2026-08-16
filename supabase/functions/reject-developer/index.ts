import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

/* =========================================================
   EDGE FUNCTION
========================================================= */

Deno.serve(async (req) => {
  /* =======================================================
     CORS
  ======================================================= */

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  /* =======================================================
     ONLY POST
  ======================================================= */

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed.",
      },
      405
    );
  }

  try {
    /* =====================================================
       ENVIRONMENT
    ===================================================== */

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Supabase environment variables are missing."
      );
    }

    /* =====================================================
       SERVICE-ROLE CLIENT
    ===================================================== */

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /* =====================================================
       AUTHENTICATED ADMIN VERIFICATION
    ===================================================== */

    const authorization =
      req.headers.get(
        "Authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      throw new Error(
        "Authentication is required."
      );
    }

    const accessToken =
      authorization
        .replace(
          "Bearer ",
          ""
        )
        .trim();

    if (!accessToken) {
      throw new Error(
        "Authentication token is missing."
      );
    }

    /* -----------------------------------------------------
       Verify JWT
    ----------------------------------------------------- */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !authData?.user
    ) {
      throw new Error(
        "Invalid or expired authentication token."
      );
    }

    const reviewer =
      authData.user;

    /* -----------------------------------------------------
       Verify ADMIN ROLE
    ----------------------------------------------------- */

    const {
      data: reviewerProfile,
      error:
        reviewerProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, role"
        )
        .eq(
          "id",
          reviewer.id
        )
        .maybeSingle();

    if (
      reviewerProfileError
    ) {
      throw reviewerProfileError;
    }

    if (
      !reviewerProfile ||
      reviewerProfile.role !==
        "admin"
    ) {
      throw new Error(
        "Administrator access is required."
      );
    }

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body;

    try {
      body = await req.json();
    } catch {
      throw new Error(
        "Invalid JSON request body."
      );
    }

    const applicationId =
      body?.application_id;

    const rejectionReason =
      typeof body?.rejection_reason ===
      "string"
        ? body.rejection_reason.trim()
        : "";

    /* =====================================================
       VALIDATE APPLICATION ID
    ===================================================== */

    if (!applicationId) {
      throw new Error(
        "application_id is required."
      );
    }

    /* =====================================================
       VALIDATE REJECTION REASON
    ===================================================== */

    if (!rejectionReason) {
      throw new Error(
        "rejection_reason is required."
      );
    }

    /* =====================================================
       LOAD APPLICATION
    ===================================================== */

    const {
      data: application,
      error:
        applicationError,
    } =
      await supabaseAdmin
        .from(
          "developer_applications"
        )
        .select("*")
        .eq(
          "id",
          applicationId
        )
        .maybeSingle();

    if (
      applicationError
    ) {
      throw applicationError;
    }

    if (!application) {
      throw new Error(
        "Developer application not found."
      );
    }

    /* =====================================================
       VALIDATE STATUS TRANSITION
    ===================================================== */

    if (
      application.status !==
      "pending"
    ) {
      throw new Error(
        `This application cannot be rejected because its current status is "${application.status}".`
      );
    }

    /* =====================================================
       UPDATE APPLICATION
    ===================================================== */

    const now =
      new Date().toISOString();

    const {
      data:
        updatedApplication,
      error:
        applicationUpdateError,
    } =
      await supabaseAdmin
        .from(
          "developer_applications"
        )
        .update({
          status: "rejected",

          rejection_reason:
            rejectionReason,

          reviewed_by:
            reviewer.id,

          reviewed_at: now,

          updated_at: now,
        })
        .eq(
          "id",
          applicationId
        )
        .eq(
          "status",
          "pending"
        )
        .select("*")
        .single();

    if (
      applicationUpdateError
    ) {
      throw applicationUpdateError;
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    return jsonResponse({
      success: true,

      message:
        "Developer application rejected successfully.",

      application:
        updatedApplication,

      reviewer_id:
        reviewer.id,
    });
  } catch (error) {
    console.error(
      "reject-developer error:",
      error
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to reject developer application.",
      },
      400
    );
  }
});