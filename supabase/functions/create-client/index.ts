import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
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
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { enquiry_id } = await req.json();

    if (!enquiry_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "enquiry_id is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: enquiry, error: enquiryError } =
      await supabase
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

    const cleanName = String(
      enquiry.customer_name || ""
    )
      .replace(/[^a-zA-Z0-9]/g, "")
      .trim();

    const cleanPhone = String(
      enquiry.phone || ""
    ).replace(/\D/g, "");

    const lastFour = cleanPhone.slice(-4);

    if (!cleanName) {
      throw new Error(
        "Customer name is required."
      );
    }

    if (lastFour.length < 4) {
      throw new Error(
        "A valid phone number with at least 4 digits is required."
      );
    }

    const email = String(
      enquiry.email || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      throw new Error(
        "Customer email is required."
      );
    }

    const password = `${cleanName}${lastFour}`;

    /* =========================================
       CREATE AUTH ACCOUNT
       ========================================= */

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData?.user) {
      throw new Error(
        authError?.message ||
          "Failed to create authentication account."
      );
    }

    const userId = authData.user.id;

    /* =========================================
       CREATE CLIENT
       ========================================= */

    const {
      data: client,
      error: clientError,
    } = await supabase
      .from("clients")
      .insert({
        company_name: null,
        contact_name: enquiry.customer_name.trim(),
        email,
        phone: enquiry.phone || null,
        status: "active",
      })
      .select()
      .single();

    if (clientError || !client) {
      await supabase.auth.admin.deleteUser(
        userId
      );

      throw new Error(
        clientError?.message ||
          "Failed to create client."
      );
    }

    /* =========================================
       LINK USER TO CLIENT
       ========================================= */

    const {
      error: clientUserError,
    } = await supabase
      .from("client_users")
      .insert({
        client_id: client.id,
        user_id: userId,
        role: "client",
      });

    if (clientUserError) {
      await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);

      await supabase.auth.admin.deleteUser(
        userId
      );

      throw new Error(
        clientUserError.message
      );
    }

    /* =========================================
       LINK ENQUIRY TO CLIENT
       ========================================= */

    const {
      error: enquiryUpdateError,
    } = await supabase
      .from("enquiries")
      .update({
        client_id: client.id,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiry.id);

    if (enquiryUpdateError) {
      throw new Error(
        enquiryUpdateError.message
      );
    }

    /* =========================================
       SUCCESS
       ========================================= */

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
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Create client account error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create client.";

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});