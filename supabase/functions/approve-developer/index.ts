import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // ---------------------------------------------------------
  // CORS
  // ---------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // -------------------------------------------------------
    // ENVIRONMENT
    // -------------------------------------------------------

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase environment variables are missing."
      );
    }

    // -------------------------------------------------------
    // ADMIN CLIENT
    // -------------------------------------------------------

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // -------------------------------------------------------
    // REQUEST
    // -------------------------------------------------------

    const body = await req.json();

    const applicationId =
      body?.application_id;

    if (!applicationId) {
      throw new Error(
        "application_id is required."
      );
    }

    // -------------------------------------------------------
    // GET APPLICATION
    // -------------------------------------------------------

    const {
      data: application,
      error: applicationError,
    } = await supabaseAdmin
      .from("developer_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (applicationError) {
      throw applicationError;
    }

    if (!application) {
      throw new Error(
        "Developer application not found."
      );
    }

    // -------------------------------------------------------
    // PREVENT DOUBLE APPROVAL
    // -------------------------------------------------------

    if (application.status === "accepted") {
      throw new Error(
        "This developer application has already been accepted."
      );
    }

    // -------------------------------------------------------
    // CHECK IF AUTH USER ALREADY EXISTS
    // -------------------------------------------------------

    let authUser = null;

    const {
      data: existingUsers,
      error: usersError,
    } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      throw usersError;
    }

    authUser =
      existingUsers?.users?.find(
        (user) =>
          user.email?.toLowerCase() ===
          application.email?.toLowerCase()
      ) || null;

    // -------------------------------------------------------
    // CREATE AUTH USER
    // -------------------------------------------------------

    if (!authUser) {
      const {
        data,
        error,
      } =
        await supabaseAdmin.auth.admin.createUser({
          email: application.email,
          email_confirm: true,
          user_metadata: {
            full_name:
              application.full_name,
          },
        });

      if (error) {
        throw error;
      }

      authUser = data.user;
    }

    if (!authUser) {
      throw new Error(
        "Unable to create developer account."
      );
    }

    // -------------------------------------------------------
    // CREATE / UPDATE PROFILES
    // -------------------------------------------------------

    const {
      data: existingProfile,
      error: profileLookupError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", authUser.id)
        .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    if (!existingProfile) {
      const {
        error: profileInsertError,
      } =
        await supabaseAdmin
          .from("profiles")
          .insert({
            id: authUser.id,
            full_name:
              application.full_name,
            email:
              application.email,
            phone:
              application.phone,
            role: "developer",
          });

      if (profileInsertError) {
        throw profileInsertError;
      }
    } else {
      const {
        error: profileUpdateError,
      } =
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name:
              application.full_name,
            email:
              application.email,
            phone:
              application.phone,
            role: "developer",
          })
          .eq("id", authUser.id);

      if (profileUpdateError) {
        throw profileUpdateError;
      }
    }

    // -------------------------------------------------------
    // CREATE DEVELOPER PROFILE
    // -------------------------------------------------------

    const {
      data: existingDeveloperProfile,
      error:
        developerProfileLookupError,
    } =
      await supabaseAdmin
        .from("developer_profiles")
        .select("id")
        .eq("user_id", authUser.id)
        .maybeSingle();

    if (developerProfileLookupError) {
      throw developerProfileLookupError;
    }

    const developerProfileData = {
      user_id: authUser.id,
      full_name:
        application.full_name,
      phone:
        application.phone,
      city:
        application.city,
      primary_roles:
        application.primary_roles || [],
      linkedin_url:
        application.linkedin_url,
      github_url:
        application.github_url,
      portfolio_url:
        application.portfolio_url,
      resume_path:
        application.resume_path,
      resume_url:
        application.resume_url,
      profile_photo_url:
        application.profile_photo_url,
      status: "approved",
      rejection_reason: null,
      updated_at:
        new Date().toISOString(),
    };

    if (!existingDeveloperProfile) {
      const {
        error:
          developerProfileInsertError,
      } =
        await supabaseAdmin
          .from("developer_profiles")
          .insert({
            ...developerProfileData,
            created_at:
              new Date().toISOString(),
          });

      if (developerProfileInsertError) {
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

      if (developerProfileUpdateError) {
        throw developerProfileUpdateError;
      }
    }

    // -------------------------------------------------------
    // GENERATE ACTIVATION LINK
    // -------------------------------------------------------

    const siteUrl =
      Deno.env.get("SITE_URL") ||
      "https://excwa.vercel.app";

    const {
      data: linkData,
      error: linkError,
    } =
      await supabaseAdmin.auth.admin.generateLink(
        {
          type: "recovery",
          email:
            application.email,
          options: {
            redirectTo:
              `${siteUrl}/activate`,
          },
        }
      );

    if (linkError) {
      throw linkError;
    }

    const activationLink =
      linkData?.properties
        ?.action_link;

    if (!activationLink) {
      throw new Error(
        "Unable to generate activation link."
      );
    }

    // -------------------------------------------------------
    // MARK APPLICATION ACCEPTED
    // -------------------------------------------------------

    const {
      data: updatedApplication,
      error:
        applicationUpdateError,
    } =
      await supabaseAdmin
        .from("developer_applications")
        .update({
          status: "accepted",
          reviewed_at:
            new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", applicationId)
        .select()
        .single();

    if (applicationUpdateError) {
      throw applicationUpdateError;
    }

    // -------------------------------------------------------
    // RETURN
    // -------------------------------------------------------

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Developer approved successfully.",
        application:
          updatedApplication,
        user_id:
          authUser.id,
        activation_link:
          activationLink,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "approve-developer error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error?.message ||
          "Unable to approve developer.",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});