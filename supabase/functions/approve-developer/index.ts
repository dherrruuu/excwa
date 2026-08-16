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

    const siteUrl =
      Deno.env.get("SITE_URL") ||
      "https://excwa.vercel.app";


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
       ADMIN CLIENT
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
       VERIFY AUTHENTICATED USER
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
       VERIFY ADMIN PROFILE
    ===================================================== */

    const {
      data: currentProfile,
      error:
        currentProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();


    if (
      currentProfileError
    ) {
      throw currentProfileError;
    }


    if (
      !currentProfile ||
      currentProfile.role !== "admin"
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

    let body;

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
      error:
        applicationError,
    } =
      await supabaseAdmin
        .from("developer_applications")
        .select("*")
        .eq(
          "id",
          applicationId
        )
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
       
       ONLY:
       
       pending → accepted
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


    if (!application.resume_path) {
      throw new Error(
        "Applicant resume is missing."
      );
    }


    /* =====================================================
       FIND EXISTING AUTH USER
    ===================================================== */

    let authUser = null;


    /* -----------------------------------------------------
       FIRST:
       developer_user_id
    ----------------------------------------------------- */

    if (
      application.developer_user_id
    ) {
      const {
        data:
          existingAuthUser,
        error:
          existingAuthUserError,
      } =
        await supabaseAdmin.auth.admin
          .getUserById(
            application.developer_user_id
          );


      if (
        !existingAuthUserError &&
        existingAuthUser?.user
      ) {
        authUser =
          existingAuthUser.user;
      }
    }


    /* -----------------------------------------------------
       SECOND:
       profiles.email
    ----------------------------------------------------- */

    if (!authUser) {
      const {
        data: profileByEmail,
        error:
          profileByEmailError,
      } =
        await supabaseAdmin
          .from("profiles")
          .select(
            "id, email"
          )
          .ilike(
            "email",
            email
          )
          .maybeSingle();


      if (profileByEmailError) {
        throw profileByEmailError;
      }


      if (profileByEmail?.id) {
        const {
          data:
            profileAuthUser,
          error:
            profileAuthUserError,
        } =
          await supabaseAdmin.auth.admin
            .getUserById(
              profileByEmail.id
            );


        if (
          !profileAuthUserError &&
          profileAuthUser?.user
        ) {
          authUser =
            profileAuthUser.user;
        }
      }
    }


    /* -----------------------------------------------------
       THIRD:
       SEARCH AUTH USERS
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
       CREATE AUTH USER
    ===================================================== */

    if (!authUser) {
      const {
        data: createdUser,
        error:
          createUserError,
      } =
        await supabaseAdmin.auth.admin
          .createUser({
            email,

            /*
             * The admin has already approved
             * this developer.
             *
             * Supabase Auth therefore does not
             * need to wait for email confirmation.
             *
             * The password will be established
             * through the recovery email below.
             */
            email_confirm: true,

            user_metadata: {
              full_name:
                fullName,
            },
          });


      if (createUserError) {
        throw createUserError;
      }


      authUser =
        createdUser?.user ||
        null;
    }


    if (!authUser) {
      throw new Error(
        "Unable to create or locate developer Auth user."
      );
    }


    /* =====================================================
       CREATE / UPDATE MAIN PROFILE
    ===================================================== */

    const {
      data: existingProfile,
      error:
        existingProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq(
          "id",
          authUser.id
        )
        .maybeSingle();


    if (existingProfileError) {
      throw existingProfileError;
    }


    const now =
      new Date().toISOString();


    const profileData = {
      id:
        authUser.id,

      full_name:
        fullName,

      email,

      phone:
        application.phone || null,

      role:
        "developer",

      /*
       * This is a storage PATH.
       */
      profile_photo_path:
        application.profile_photo_path ||
        null,

      /*
       * Resume URL is intentionally
       * not made permanent here.
       */
      resume_url:
        null,

      updated_at:
        now,
    };


    if (!existingProfile) {
      const {
        error:
          profileInsertError,
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
        error:
          profileUpdateError,
      } =
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name:
              profileData.full_name,

            email:
              profileData.email,

            phone:
              profileData.phone,

            role:
              profileData.role,

            profile_photo_path:
              profileData.profile_photo_path,

            resume_url:
              profileData.resume_url,

            updated_at:
              profileData.updated_at,
          })
          .eq(
            "id",
            authUser.id
          );


      if (profileUpdateError) {
        throw profileUpdateError;
      }
    }


    /* =====================================================
       CREATE / UPDATE DEVELOPER PROFILE
    ===================================================== */

    const {
      data:
        existingDeveloperProfile,
      error:
        developerProfileLookupError,
    } =
      await supabaseAdmin
        .from("developer_profiles")
        .select("id")
        .eq(
          "user_id",
          authUser.id
        )
        .maybeSingle();


    if (
      developerProfileLookupError
    ) {
      throw developerProfileLookupError;
    }


    const developerProfileData = {
      user_id:
        authUser.id,

      full_name:
        fullName,

      phone:
        application.phone || null,

      city:
        application.city || null,

      primary_roles:
        Array.isArray(
          application.primary_roles
        )
          ? application.primary_roles
          : [],

      linkedin_url:
        application.linkedin_url ||
        null,

      github_url:
        application.github_url ||
        null,

      portfolio_url:
        application.portfolio_url ||
        null,

      /*
       * Keep the original storage path.
       */
      resume_path:
        application.resume_path,

      /*
       * No permanent public URL.
       */
      resume_url:
        null,

      profile_photo_url:
        null,

      /*
       * Admin approval means
       * the developer is approved.
       */
      status:
        "approved",

      rejection_reason:
        null,

      updated_at:
        now,
    };


    if (
      !existingDeveloperProfile
    ) {
      const {
        error:
          developerProfileInsertError,
      } =
        await supabaseAdmin
          .from("developer_profiles")
          .insert({
            ...developerProfileData,

            created_at:
              now,
          });


      if (
        developerProfileInsertError
      ) {
        throw developerProfileInsertError;
      }
    } else {
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
            authUser.id
          );


      if (
        developerProfileUpdateError
      ) {
        throw developerProfileUpdateError;
      }
    }


    /* =====================================================
       SEND DEVELOPER ACTIVATION EMAIL
       
       IMPORTANT
       
       This is the part that was previously missing.
       
       We use Supabase Auth's recovery email system.
       
       Because your Supabase project already has
       Custom SMTP configured, Supabase will send
       the email through your existing SMTP provider.
       
       The developer will receive a recovery/password
       setup email containing a ConfirmationURL.
    ===================================================== */

    const {
      error:
        recoveryEmailError,
    } =
      await supabaseAdmin.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${siteUrl}/activate`,
          }
        );


    if (recoveryEmailError) {
      throw new Error(
        `Developer account was created, but the activation email could not be sent: ${recoveryEmailError.message}`
      );
    }


    /* =====================================================
       MARK APPLICATION ACCEPTED
       
       IMPORTANT:
       
       pending → accepted
       
       We also store:
       
       developer_user_id
       reviewed_by
       reviewed_at
    ===================================================== */

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
          status:
            "accepted",

          developer_user_id:
            authUser.id,

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
        "Developer application accepted successfully. Activation email sent.",

      application:
        updatedApplication,

      user_id:
        authUser.id,

      /*
       * We intentionally DO NOT return the
       * activation/recovery URL.
       *
       * Supabase Auth has sent it through
       * your configured SMTP service.
       */
      activation_email_sent:
        true,
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