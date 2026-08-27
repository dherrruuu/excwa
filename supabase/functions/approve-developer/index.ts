import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   CORS
========================================================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

/* =========================================================
   JSON RESPONSE
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

    const siteUrl = (
      Deno.env.get("SITE_URL") ||
      "https://excwa.vercel.app"
    ).replace(/\/+$/, "");

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Supabase environment variables are missing."
      );
    }

    /* =====================================================
       AUTHORIZATION HEADER
    ===================================================== */

    const authHeader =
      req.headers.get("Authorization");

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authorization header is required.",
        },
        401
      );
    }

    const accessToken =
      authHeader
        .replace("Bearer ", "")
        .trim();

    if (!accessToken) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authentication token is missing.",
        },
        401
      );
    }

    /* =====================================================
       SERVICE ROLE CLIENT
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
       VERIFY CURRENT USER
    ===================================================== */

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
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid or expired authentication token.",
        },
        401
      );
    }

    const currentUser =
      authData.user;

    /* =====================================================
       VERIFY ADMIN
    ===================================================== */

    const {
      data: adminProfile,
      error: adminProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (adminProfileError) {
      throw adminProfileError;
    }

    if (
      !adminProfile ||
      adminProfile.role !== "admin"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Administrator access is required.",
        },
        403
      );
    }

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body: Record<string, any>;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        400
      );
    }

    const applicationId =
      body?.application_id;

    if (!applicationId) {
      return jsonResponse(
        {
          success: false,
          error:
            "application_id is required.",
        },
        400
      );
    }

    /* =====================================================
       LOAD APPLICATION
    ===================================================== */

    const {
      data: application,
      error: applicationError,
    } =
      await supabaseAdmin
        .from("developer_applications")
        .select("*")
        .eq("id", applicationId)
        .maybeSingle();

    if (applicationError) {
      throw applicationError;
    }

    if (!application) {
      return jsonResponse(
        {
          success: false,
          error:
            "Developer application not found.",
        },
        404
      );
    }

    /* =====================================================
       APPLICATION STATUS
    ===================================================== */

    if (
      application.status ===
      "accepted"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "This developer application has already been accepted.",
        },
        409
      );
    }

    if (
      application.status ===
      "rejected"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "A rejected application cannot be approved.",
        },
        409
      );
    }

    if (
      application.status !==
      "pending"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            `Application cannot be approved from status "${application.status}".`,
        },
        409
      );
    }

    /* =====================================================
       REQUIRED APPLICATION DATA
    ===================================================== */

    const email =
      application.email
        ?.trim()
        .toLowerCase();

    const fullName =
      application.full_name
        ?.trim();

    if (!email) {
      throw new Error(
        "Application email is missing."
      );
    }

    if (!fullName) {
      throw new Error(
        "Applicant full name is missing."
      );
    }

    /* =====================================================
       FIND EXISTING AUTH USER
    ===================================================== */

    let authUser = null;

    /* -----------------------------------------------------
       FIRST: developer_user_id
    ----------------------------------------------------- */

    if (
      application.developer_user_id
    ) {
      const {
        data: existingUserData,
        error: existingUserError,
      } =
        await supabaseAdmin.auth.admin
          .getUserById(
            application.developer_user_id
          );

      if (
        !existingUserError &&
        existingUserData?.user
      ) {
        authUser =
          existingUserData.user;
      }
    }

    /* -----------------------------------------------------
       SECOND: SEARCH AUTH USERS BY EMAIL
    ----------------------------------------------------- */

    if (!authUser) {
      let page = 1;
      const perPage = 1000;

      while (!authUser) {
        const {
          data: usersData,
          error: usersError,
        } =
          await supabaseAdmin.auth.admin
            .listUsers({
              page,
              perPage,
            });

        if (usersError) {
          throw usersError;
        }

        const users =
          usersData?.users || [];

        authUser =
          users.find(
            (user) =>
              user.email
                ?.trim()
                .toLowerCase() ===
              email
          ) || null;

        if (
          users.length <
          perPage
        ) {
          break;
        }

        page++;
      }
    }

    /* =====================================================
       CREATE AUTH USER IF NECESSARY
    ===================================================== */

    if (!authUser) {
      const {
        data: createdUserData,
        error: createUserError,
      } =
        await supabaseAdmin.auth.admin
          .createUser({
            email,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
            },
          });

      if (createUserError) {
        throw createUserError;
      }

      authUser =
        createdUserData?.user ||
        null;
    }

    if (!authUser) {
      throw new Error(
        "Unable to create or locate developer Auth user."
      );
    }

    const developerUserId =
      authUser.id;

    /* =====================================================
       UPDATE AUTH METADATA
    ===================================================== */

    const {
      error: metadataError,
    } =
      await supabaseAdmin.auth.admin
        .updateUserById(
          developerUserId,
          {
            user_metadata: {
              full_name: fullName,
              role: "developer",
            },
          }
        );

    if (metadataError) {
      throw metadataError;
    }

    /* =====================================================
       MAIN PROFILE
    ===================================================== */

    const now =
      new Date().toISOString();

    const profileData = {
      id: developerUserId,

      full_name:
        fullName,

      email,

      phone:
        application.phone ||
        null,

      role:
        "developer",

      profile_photo_path:
        application.profile_photo_path ||
        null,

      updated_at:
        now,
    };

    const {
      data: existingProfile,
      error: existingProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", developerUserId)
        .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (!existingProfile) {
      const {
        error: profileInsertError,
      } =
        await supabaseAdmin
          .from("profiles")
          .insert(
            profileData
          );

      if (profileInsertError) {
        throw profileInsertError;
      }
    } else {
      const {
        error: profileUpdateError,
      } =
        await supabaseAdmin
          .from("profiles")
          .update(
            profileData
          )
          .eq(
            "id",
            developerUserId
          );

      if (profileUpdateError) {
        throw profileUpdateError;
      }
    }

    /* =====================================================
       DEVELOPER PROFILE
    ===================================================== */

    const primaryRoles =
      Array.isArray(
        application.primary_roles
      )
        ? application.primary_roles
        : [];

    const developerProfileData = {
      user_id:
        developerUserId,

      full_name:
        fullName,

      phone:
        application.phone ||
        null,

      email,

      city:
        application.city ||
        null,

      education:
        application.education ||
        null,

      primary_roles:
        primaryRoles,

      linkedin_url:
        application.linkedin_url ||
        null,

      github_url:
        application.github_url ||
        null,

      portfolio_url:
        application.portfolio_url ||
        null,

      profile_photo_path:
        application.profile_photo_path ||
        null,

      profile_photo_url:
        null,

      resume_path:
        application.resume_path ||
        null,

      resume_url:
        null,

      status:
        "approved",

      rejection_reason:
        null,

      updated_at:
        now,
    };

    const {
      data: existingDeveloperProfile,
      error:
        developerProfileLookupError,
    } =
      await supabaseAdmin
        .from("developer_profiles")
        .select("id")
        .eq(
          "user_id",
          developerUserId
        )
        .maybeSingle();

    if (
      developerProfileLookupError
    ) {
      throw developerProfileLookupError;
    }

    if (
      existingDeveloperProfile
    ) {
      const {
        error:
          developerProfileUpdateError,
      } =
        await supabaseAdmin
          .from("developer_profiles")
          .update(
            developerProfileData
          )
          .eq(
            "user_id",
            developerUserId
          );

      if (
        developerProfileUpdateError
      ) {
        throw developerProfileUpdateError;
      }
    } else {
      const {
        error:
          developerProfileInsertError,
      } =
        await supabaseAdmin
          .from("developer_profiles")
          .insert(
            {
              ...developerProfileData,
              created_at: now,
            }
          );

      if (
        developerProfileInsertError
      ) {
        throw developerProfileInsertError;
      }
    }

    /* =====================================================
       SEND ACTIVATION EMAIL
    ===================================================== */

    const activationRedirectUrl =
      `${siteUrl}/activate`;

    const {
      error: recoveryEmailError,
    } =
      await supabaseAdmin.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo:
              activationRedirectUrl,
          }
        );

    if (recoveryEmailError) {
      throw new Error(
        `Developer account was created, but the activation email could not be sent: ${recoveryEmailError.message}`
      );
    }

    /* =====================================================
       MARK APPLICATION ACCEPTED
    ===================================================== */

    const {
      data: updatedApplication,
      error: applicationUpdateError,
    } =
      await supabaseAdmin
        .from("developer_applications")
        .update({
          status:
            "accepted",

          developer_user_id:
            developerUserId,

          reviewed_by:
            currentUser.id,

          reviewed_at:
            now,

          rejection_reason:
            null,

          updated_at:
            now,
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
        .maybeSingle();

    if (applicationUpdateError) {
      throw applicationUpdateError;
    }

    if (!updatedApplication) {
      throw new Error(
        "Application could not be marked as accepted."
      );
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    return jsonResponse({
      success: true,

      message:
        "Developer application accepted successfully. Activation email sent.",

      application:
        updatedApplication,

      user_id:
        developerUserId,

      activation_email_sent:
        true,

      activation_redirect:
        activationRedirectUrl,
    });

  } catch (error) {
    console.error(
      "approve-developer error:",
      error
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to approve developer application.",
      },
      400
    );
  }
});