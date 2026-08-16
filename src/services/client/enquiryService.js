import { supabase } from "../../lib/supabase";


/* =========================================================
   CREATE ENQUIRY
   Public users can submit an enquiry without needing
   SELECT permission on the enquiries table.
   ========================================================= */

export async function createEnquiry(form) {
  const { error } = await supabase
    .from("enquiries")
    .insert([
      {
        customer_name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        service: form.service,
        project_description: form.description.trim(),
        estimated_budget: form.budget || null,
        preferred_contact: form.contact || null,
      },
    ]);

  if (error) {
    console.error("Supabase enquiry error:", error);
    throw error;
  }

  return true;
}


/* =========================================================
   GET ALL ENQUIRIES
   Admin / authenticated use
   ========================================================= */

export async function getEnquiries() {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}


/* =========================================================
   GET SINGLE ENQUIRY
   Admin / authenticated use
   ========================================================= */

export async function getEnquiry(id) {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   UPDATE ENQUIRY STATUS
   Admin / authenticated use
   ========================================================= */

export async function updateEnquiryStatus(id, status) {
  const { data, error } = await supabase
    .from("enquiries")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   DELETE ENQUIRY
   Admin / authenticated use
   ========================================================= */

export async function deleteEnquiry(id) {
  const { error } = await supabase
    .from("enquiries")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}