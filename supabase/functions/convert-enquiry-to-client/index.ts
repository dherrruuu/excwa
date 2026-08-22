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

    const body = await req.json();
    const enquiry_id = body?.enquiry_id;

    if (!enquiry_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "enquiry_id is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
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

    const cleanName = String(
      enquiry.customer_name || ""
    )
      .replace(/[^a-zA-Z0-9]/g, "")
      .trim();

    const cleanPhone = String(
      enquiry.phone || ""
    ).replace(/\D/g, "");

    const lastFour = cleanPhone.slice(-4);

    const email = String(
      enquiry.email || ""
    )
      .trim()
      .toLowerCase();

    if (!cleanName) {
      throw new Error(
        "Customer name is required."
      );
    }

    if (!email) {
      throw new Error(
        "Customer email is required."
      );
    }

    if (lastFour.length < 4) {
      throw new Error(
        "A valid phone number with at least 4 digits is required."
      );
    }

    /*
     * Default password:
     *
     * CustomerName + last 4 phone digits
     *
     * Example:
     * Dheeraj Suthar + 9876
     *
     * => DheerajSuthar9876
     */

    const password =
      `${cleanName}${lastFour}`;

    /* =====================================================
       CREATE AUTH USER
       ===================================================== */

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      throw authError;
    }

    if (!authData?.user?.id) {
      throw new Error(
        "Failed to create authentication account."
      );
    }

    const userId = authData.user.id;

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
        full_name:
          enquiry.customer_name.trim(),
      });

    if (profileError) {
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
        contact_name:
          enquiry.customer_name.trim(),
        email,
        phone:
          enquiry.phone || null,
        status: "active",
      })
      .select()
      .single();

    if (clientError) {
      await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabase.auth.admin.deleteUser(
        userId
      );

      throw clientError;
    }

    /* =====================================================
       CONNECT USER TO CLIENT
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
       ===================================================== */

    return new Response(
      JSON.stringify({
        success: true,
        client_id: client.id,
        user_id: userId,
        email,
        temporary_password: password,
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