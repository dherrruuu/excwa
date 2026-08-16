import { supabase } from "../../lib/supabase";

/* =========================================================
   DEVELOPER APPLICATION SERVICE
   Public developer application
   ========================================================= */


/* =========================================================
   CREATE APPLICATION
   ========================================================= */

export async function createDeveloperApplication(form) {
  if (!form) {
    throw new Error("Application data is required.");
  }

  const full_name = String(
    form.full_name ?? form.fullName ?? ""
  ).trim();

  const phone = String(
    form.phone ?? ""
  ).trim();

  const email = String(
    form.email ?? ""
  ).trim()
    .toLowerCase();

  const city = String(
    form.city ?? ""
  ).trim();

  const education = String(
    form.education ?? ""
  ).trim();

  const github_url = String(
    form.github_url ?? form.githubUrl ?? ""
  ).trim();

  const linkedin_url = String(
    form.linkedin_url ?? form.linkedinUrl ?? ""
  ).trim();

  const portfolio_url = String(
    form.portfolio_url ?? form.portfolioUrl ?? ""
  ).trim();

  const profile_photo_path = String(
    form.profile_photo_path ??
    form.profilePhotoPath ??
    ""
  ).trim();

  const profile_photo_url = String(
    form.profile_photo_url ??
    form.profilePhotoUrl ??
    ""
  ).trim();

  const resume_path = String(
    form.resume_path ??
    form.resumePath ??
    ""
  ).trim();

  /* ---------------------------------------------------------
     PRIMARY ROLES
     --------------------------------------------------------- */

  let primary_roles =
    form.primary_roles ??
    form.primaryRoles ??
    [];

  if (typeof primary_roles === "string") {
    primary_roles = primary_roles
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(primary_roles)) {
    primary_roles = [];
  }

  /* ---------------------------------------------------------
     VALIDATION
     --------------------------------------------------------- */

  if (!full_name) {
    throw new Error("Full name is required.");
  }

  if (!phone) {
    throw new Error("Phone number is required.");
  }

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!city) {
    throw new Error("City is required.");
  }

  if (!education) {
    throw new Error("Education is required.");
  }

  if (primary_roles.length === 0) {
    throw new Error("Please select at least one primary role.");
  }

  if (!resume_path) {
    throw new Error("Resume is required.");
  }

  /* ---------------------------------------------------------
     INSERT
     --------------------------------------------------------- */

  const { data, error } = await supabase
    .from("developer_applications")
    .insert({
      full_name,
      phone,
      email,
      city,
      education,

      github_url: github_url || null,
      linkedin_url: linkedin_url || null,
      portfolio_url: portfolio_url || null,

      primary_roles,

      profile_photo_path:
        profile_photo_path || null,

      profile_photo_url:
        profile_photo_url || null,

      resume_path,

      status: "pending",
    })
    .select()
    .single();

  /* ---------------------------------------------------------
     ERROR
     --------------------------------------------------------- */

  if (error) {
    console.error(
      "Developer application submission failed:",
      error
    );

    throw new Error(
      error.message ||
      "Failed to submit developer application."
    );
  }

  return data;
}


/* =========================================================
   GET ALL APPLICATIONS
   Admin only through RLS
   ========================================================= */

export async function getDeveloperApplications() {
  const { data, error } = await supabase
    .from("developer_applications")
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
   GET SINGLE APPLICATION
   Admin only through RLS
   ========================================================= */

export async function getDeveloperApplication(id) {
  if (!id) {
    throw new Error("Application ID is required.");
  }

  const { data, error } = await supabase
    .from("developer_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   UPDATE APPLICATION STATUS
   Admin only through RLS
   ========================================================= */

export async function updateDeveloperApplicationStatus(
  id,
  status,
  rejectionReason = null
) {
  if (!id) {
    throw new Error("Application ID is required.");
  }

  if (!status) {
    throw new Error("Application status is required.");
  }

  const update = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "rejected") {
    update.rejection_reason =
      rejectionReason || null;
  } else {
    update.rejection_reason = null;
  }

  const { data, error } = await supabase
    .from("developer_applications")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   DELETE APPLICATION
   Admin only through RLS
   ========================================================= */

export async function deleteDeveloperApplication(id) {
  if (!id) {
    throw new Error("Application ID is required.");
  }

  const { error } = await supabase
    .from("developer_applications")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}