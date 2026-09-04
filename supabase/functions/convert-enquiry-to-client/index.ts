import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const APP_URL =
  Deno.env.get("APP_URL") ||
  "https://excwa.vercel.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /* =====================================================
       PARSE REQUEST
    ===================================================== */

    const body = await req.json();

    const enquiry_id = body?.enquiry_id;

    if (!enquiry_id) {
      throw new Error("enquiry_id is required.");
    }

    /* =====================================================
       GET ENQUIRY
    ===================================================== */

    const {
      data: enquiry,
      error: enquiryError,
    } = await supabase
      .from("enquiries")
      .select("*")
      .eq("id", enquiry_id)
      .single();

    if (enquiryError || !enquiry) {
      throw new Error("Enquiry not found.");
    }

    if (enquiry.client_id) {
      throw new Error(
        "This enquiry is already converted to a client."
      );
    }

    /* =====================================================
       VALIDATE CUSTOMER DATA
    ===================================================== */

    const email = String(enquiry.email || "")
      .trim()
      .toLowerCase();

    const fullName = String(
      enquiry.customer_name || ""
    ).trim();

    if (!email) {
      throw new Error(
        "Customer email is required."
      );
    }

    if (!fullName) {
      throw new Error(
        "Customer name is required."
      );
    }

    /* =====================================================
       REDIRECT URL

       Supabase invitation email will send the client here
       after accepting the invitation.
    ===================================================== */

    const redirectTo =
      `${APP_URL}/client/activate`;

    /* =====================================================
       INVITE USER THROUGH SUPABASE AUTH

       inviteUserByEmail() creates the Auth user and
       sends the Supabase invitation email.

       No temporary password is required.
    ===================================================== */

    const {
      data: inviteData,
      error: inviteError,
    } =
      await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name: fullName,
            account_type: "client",
          },
          redirectTo,
        }
      );

    if (inviteError) {
      console.error(
        "Supabase client invitation failed:",
        inviteError
      );

      throw new Error(
        inviteError.message ||
          "Failed to send client invitation email."
      );
    }

    if (!inviteData?.user?.id) {
      throw new Error(
        "Supabase created the invitation but no user ID was returned."
      );
    }

    const userId =
      inviteData.user.id;

    /* =====================================================
       CREATE PROFILE
    ===================================================== */

    const {
      error: profileError,
    } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: "client",
      });

    if (profileError) {
      console.error(
        "Profile creation failed:",
        profileError
      );

      // Roll back Auth user
      await supabase.auth.admin.deleteUser(
        userId
      );

      throw profileError;
    }

    /* =====================================================
       CREATE CLIENT
    ===================================================== */

    const {
      data: client,
      error: clientError,
    } = await supabase
      .from("clients")
      .insert({
        company_name: null,
        contact_name: fullName,
        email,
        phone: enquiry.phone || null,
        status: "active",
      })
      .select()
      .single();

    if (clientError || !client) {
      console.error(
        "Client creation failed:",
        clientError
      );

      await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabase.auth.admin.deleteUser(
        userId
      );

      throw (
        clientError ||
        new Error(
          "Failed to create client record."
        )
      );
    }

    /* =====================================================
       CONNECT AUTH USER TO CLIENT
    ===================================================== */

    const {
      error: clientUserError,
    } = await supabase
      .from("client_users")
      .insert({
        client_id: client.id,
        user_id: userId,
        role: "owner",
      });

    if (clientUserError) {
      console.error(
        "Client user creation failed:",
        clientUserError
      );

      await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);

      await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabase.auth.admin.deleteUser(
        userId
      );

      throw clientUserError;
    }

    /* =====================================================
       UPDATE ENQUIRY

       IMPORTANT:
       We only connect the enquiry to the newly created
       client here.

       NO OPPORTUNITY IS CREATED AUTOMATICALLY.

       Admin will create the Opportunity separately so
       application dates, deadlines, developer payout,
       payment information, skills, tech stack, etc.
       can be configured manually.
    ===================================================== */

    const {
      error: enquiryUpdateError,
    } = await supabase
      .from("enquiries")
      .update({
        client_id: client.id,
        status: "completed",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", enquiry.id);

    if (enquiryUpdateError) {
      console.error(
        "Enquiry update failed:",
        enquiryUpdateError
      );

      /* ================================================
         ROLLBACK CLIENT
      ================================================ */

      await supabase
        .from("client_users")
        .delete()
        .eq("client_id", client.id);

      await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);

      await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabase.auth.admin.deleteUser(
        userId
      );

      throw enquiryUpdateError;
    }

    /* =====================================================
       SUCCESS

       Client account has been created.
       Enquiry is linked to the client.
       No Opportunity has been created.
    ===================================================== */

    return new Response(
      JSON.stringify({
        success: true,

        client_id:
          client.id,

        user_id:
          userId,

        enquiry_id:
          enquiry.id,

        email,

        client_name:
          fullName,

        opportunity_created:
          false,

        message:
          "Client account created successfully and invitation email sent. No opportunity was created.",
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
      "Convert enquiry to client error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error?.message ||
          "Failed to create client.",
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