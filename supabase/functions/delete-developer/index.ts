import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

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
        "Content-Type":
          "application/json",
      },
    }
  );
}

Deno.serve(async (req) => {
  /* =======================================================
     CORS
  ======================================================= */

  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error:
          "Only POST requests are allowed.",
      },
      405
    );
  }

  try {
    /* =====================================================
       ENVIRONMENT
    ===================================================== */

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Supabase server environment variables are not configured."
      );
    }

    /* =====================================================
       CLIENTS
    ===================================================== */

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,
            persistSession: false,
          },
        }
      );

    /* =====================================================
       VERIFY REQUESTING USER
    ===================================================== */

    const authorization =
      req.headers.get(
        "Authorization"
      );

    if (!authorization) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authorization header is required.",
        },
        401
      );
    }

    const token =
      authorization.replace(
        /^Bearer\s+/i,
        ""
      ).trim();

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authentication token is missing.",
        },
        401
      );
    }

    const {
      data: {
        user: requestingUser,
      },
      error: requestingUserError,
    } =
      await adminClient.auth.getUser(
        token
      );

    if (
      requestingUserError ||
      !requestingUser
    ) {
      console.error(
        "Failed to verify requesting user:",
        requestingUserError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Invalid or expired administrator session.",
        },
        401
      );
    }

    /* =====================================================
       VERIFY ADMIN PROFILE
    ===================================================== */

    const {
      data: adminProfile,
      error: adminProfileError,
    } =
      await adminClient
        .from("profiles")
        .select(
          "id, role, email"
        )
        .eq(
          "id",
          requestingUser.id
        )
        .maybeSingle();

    if (adminProfileError) {
      console.error(
        "Failed to load admin profile:",
        adminProfileError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to verify administrator profile.",
        },
        500
      );
    }

    if (!adminProfile) {
      return jsonResponse(
        {
          success: false,
          error:
            "Administrator profile not found.",
        },
        403
      );
    }

    if (
      adminProfile.role !==
      "admin"
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
       READ REQUEST BODY
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

    /*
     * Frontend sends:
     *
     * developer_user_id
     *
     * This is the UUID from auth.users
     * and profiles.id.
     */

    const developerUserId =
      typeof body?.developer_user_id ===
      "string"
        ? body.developer_user_id.trim()
        : "";

    if (!developerUserId) {
      return jsonResponse(
        {
          success: false,
          error:
            "developer_user_id is required.",
        },
        400
      );
    }

    /* =====================================================
       PROTECT ADMIN ACCOUNT
    ===================================================== */

    if (
      developerUserId ===
      requestingUser.id
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "You cannot delete your own administrator account.",
        },
        403
      );
    }

    /* =====================================================
       LOAD PROFILE
    ===================================================== */

    const {
      data: profile,
      error: profileError,
    } =
      await adminClient
        .from("profiles")
        .select(
          "id, full_name, email, role"
        )
        .eq(
          "id",
          developerUserId
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "Failed to load developer profile:",
        profileError
      );

      return jsonResponse(
        {
          success: false,
          error:
            profileError.message ||
            "Unable to load developer profile.",
        },
        500
      );
    }

    if (!profile) {
      return jsonResponse(
        {
          success: false,
          error:
            "Developer profile not found.",
        },
        404
      );
    }

    /*
     * Extra protection:
     *
     * This function is intended for deleting developers.
     * Never allow the admin panel's developer delete
     * operation to delete an admin account.
     */

    if (
      profile.role ===
      "admin"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Administrator accounts cannot be deleted through the developer removal action.",
        },
        403
      );
    }

    /* =====================================================
       LOAD DEVELOPER PROFILE
    ===================================================== */

    const {
      data: developerProfile,
      error:
        developerProfileError,
    } =
      await adminClient
        .from("developer_profiles")
        .select(
          "id, user_id"
        )
        .eq(
          "user_id",
          developerUserId
        )
        .maybeSingle();

    if (
      developerProfileError
    ) {
      console.error(
        "Failed to load developer profile record:",
        developerProfileError
      );

      return jsonResponse(
        {
          success: false,
          error:
            developerProfileError.message ||
            "Unable to load developer profile.",
        },
        500
      );
    }

    if (!developerProfile) {
      return jsonResponse(
        {
          success: false,
          error:
            "Developer profile record not found.",
        },
        404
      );
    }

    const developerId =
      developerProfile.id;

    /* =====================================================
       LOAD APPLICATION DOCUMENT PATHS
    ===================================================== */

    const {
      data: applications,
      error:
        applicationsError,
    } =
      await adminClient
        .from(
          "developer_applications"
        )
        .select(
          "id, profile_photo_path, resume_path, developer_user_id"
        )
        .eq(
          "developer_user_id",
          developerUserId
        );

    if (
      applicationsError
    ) {
      console.error(
        "Failed to load developer applications:",
        applicationsError
      );

      return jsonResponse(
        {
          success: false,
          error:
            applicationsError.message ||
            "Unable to load developer applications.",
        },
        500
      );
    }

    /* =====================================================
       STORAGE CLEANUP
    ===================================================== */

    const storageErrors: string[] = [];

    const profilePhotoPaths =
      (applications || [])
        .map(
          (item) =>
            item.profile_photo_path
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        );

    const resumePaths =
      (applications || [])
        .map(
          (item) =>
            item.resume_path
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        );

    /*
     * Remove profile photos.
     */

    if (
      profilePhotoPaths.length
    ) {
      const {
        error,
      } =
        await adminClient.storage
          .from(
            "profile-photos"
          )
          .remove(
            profilePhotoPaths
          );

      if (error) {
        console.error(
          "Failed to remove profile photos:",
          error
        );

        storageErrors.push(
          "profile photos"
        );
      }
    }

    /*
     * Remove resumes.
     */

    if (
      resumePaths.length
    ) {
      const {
        error,
      } =
        await adminClient.storage
          .from(
            "developer-resumes"
          )
          .remove(
            resumePaths
          );

      if (error) {
        console.error(
          "Failed to remove developer resumes:",
          error
        );

        storageErrors.push(
          "developer resumes"
        );
      }
    }

    /* =====================================================
       DATABASE DELETE ORDER
    =====================================================

    IMPORTANT:

    project_assignments.developer_id
    has ON DELETE RESTRICT.

    Therefore project assignments MUST be deleted
    before developer_profiles.

    ===================================================== */

    /* -----------------------------------------------------
       1. DEVELOPER SKILLS
    ----------------------------------------------------- */

    {
      const {
        error,
      } =
        await adminClient
          .from(
            "developer_skills"
          )
          .delete()
          .eq(
            "developer_id",
            developerId
          );

      if (error) {
        throw new Error(
          `Failed to delete developer skills: ${error.message}`
        );
      }
    }

    /* -----------------------------------------------------
       2. OPPORTUNITY APPLICATIONS
    ----------------------------------------------------- */

    {
      const {
        error,
      } =
        await adminClient
          .from(
            "opportunity_applications"
          )
          .delete()
          .eq(
            "developer_id",
            developerId
          );

      if (error) {
        throw new Error(
          `Failed to delete opportunity applications: ${error.message}`
        );
      }
    }

    /* -----------------------------------------------------
       3. PROJECT SUBMISSIONS
    ----------------------------------------------------- */

    {
      const {
        error,
      } =
        await adminClient
          .from(
            "project_submissions"
          )
          .delete()
          .eq(
            "developer_id",
            developerId
          );

      if (error) {
        throw new Error(
          `Failed to delete project submissions: ${error.message}`
        );
      }
    }

    /* -----------------------------------------------------
       4. PROJECT ASSIGNMENTS
    -----------------------------------------------------

       This MUST happen before developer_profiles
       because the FK is ON DELETE RESTRICT.
    */

    {
      const {
        error,
      } =
        await adminClient
          .from(
            "project_assignments"
          )
          .delete()
          .eq(
            "developer_id",
            developerId
          );

      if (error) {
        throw new Error(
          `Failed to delete project assignments: ${error.message}`
        );
      }
    }

    /* -----------------------------------------------------
       5. DEVELOPER APPLICATIONS
    ----------------------------------------------------- */

    {
      const {
        error,
      } =
        await adminClient
          .from(
            "developer_applications"
          )
          .delete()
          .eq(
            "developer_user_id",
            developerUserId
          );

      if (error) {
        throw new Error(
          `Failed to delete developer applications: ${error.message}`
        );
      }
    }

    /* -----------------------------------------------------
       6. DEVELOPER PROFILE
    ----------------------------------------------------- */

    {
      const {
        error,
      } =
        await adminClient
          .from(
            "developer_profiles"
          )
          .delete()
          .eq(
            "id",
            developerId
          );

      if (error) {
        throw new Error(
          `Failed to delete developer profile: ${error.message}`
        );
      }
    }

    /* -----------------------------------------------------
       7. PROFILE
    -----------------------------------------------------

       developer_profiles.user_id -> profiles.id
       has ON DELETE CASCADE.

       At this point all developer-specific records
       have already been removed.
    */

    {
      const {
        error,
      } =
        await adminClient
          .from(
            "profiles"
          )
          .delete()
          .eq(
            "id",
            developerUserId
          );

      if (error) {
        throw new Error(
          `Failed to delete developer profile account: ${error.message}`
        );
      }
    }

    /* -----------------------------------------------------
       8. AUTH USER
    ----------------------------------------------------- */

    {
      const {
        error,
      } =
        await adminClient.auth.admin.deleteUser(
          developerUserId
        );

      if (error) {
        throw new Error(
          `Failed to delete authentication account: ${error.message}`
        );
      }
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    return jsonResponse({
      success: true,

      developer_id:
        developerId,

      user_id:
        developerUserId,

      email:
        profile.email,

      storage_errors:
        storageErrors,

      message:
        "Developer account deleted successfully.",
    });

  } catch (error) {
    console.error(
      "Delete developer error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete developer account.",
      },
      500
    );
  }
});