import { supabase } from "../lib/supabase";

export async function createEnquiry(form) {
  const { data, error } = await supabase
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
    ])
    .select()
    .single();

  if (error) {
    console.error("Supabase enquiry error:", error);
    throw error;
  }

  return data;
}

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