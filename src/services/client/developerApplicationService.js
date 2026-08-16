import { supabase } from "../../lib/supabase";

/* =========================================================
   DEVELOPER APPLICATION SERVICE

   Public developer application

   Flow:
   1. Validate application
   2. Upload profile photo
   3. Upload resume
   4. Save storage paths
   5. Create developer_applications row
   ========================================================= */


/* =========================================================
   STORAGE CONFIGURATION
   ========================================================= */

/*
 * IMPORTANT:
 *
 * These bucket names must exactly match the buckets
 * you created in Supabase Storage.
 *
 * If your bucket names are different, change them here.
 */

const PROFILE_PHOTO_BUCKET = "profile-photos";
const RESUME_BUCKET = "developer-resumes";


/* =========================================================
   CREATE APPLICATION
   ========================================================= */

export async function createDeveloperApplication(form) {
  if (!form) {
    throw new Error("Application data is required.");
  }

  /* ---------------------------------------------------------
     BASIC DATA
     --------------------------------------------------------- */

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


  /* ---------------------------------------------------------
     FILES
     --------------------------------------------------------- */

  const profilePhoto = form.profilePhoto;
  const resume = form.resume;


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


  /* =========================================================
     VALIDATION
     ========================================================= */

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

  if (!github_url) {
    throw new Error("GitHub profile is required.");
  }

  if (!linkedin_url) {
    throw new Error("LinkedIn profile is required.");
  }

  if (primary_roles.length === 0) {
    throw new Error(
      "Please select at least one primary role."
    );
  }

  if (!profilePhoto) {
    throw new Error("Profile photo is required.");
  }

  if (!(profilePhoto instanceof File)) {
    throw new Error("Invalid profile photo.");
  }

  if (!resume) {
    throw new Error("Resume is required.");
  }

  if (!(resume instanceof File)) {
    throw new Error("Invalid resume file.");
  }


  /* =========================================================
     FILE VALIDATION
     ========================================================= */

  /* PROFILE PHOTO */

  if (!profilePhoto.type.startsWith("image/")) {
    throw new Error(
      "Profile photo must be an image."
    );
  }

  if (profilePhoto.size > 5 * 1024 * 1024) {
    throw new Error(
      "Profile photo must be less than 5MB."
    );
  }


  /* RESUME */

  const allowedResumeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const resumeExtension =
    `.${resume.name.split(".").pop()?.toLowerCase()}`;

  const allowedResumeExtensions = [
    ".pdf",
    ".doc",
    ".docx",
  ];

  const validResumeType =
    allowedResumeTypes.includes(resume.type) ||
    allowedResumeExtensions.includes(resumeExtension);

  if (!validResumeType) {
    throw new Error(
      "Resume must be PDF, DOC, or DOCX."
    );
  }

  if (resume.size > 10 * 1024 * 1024) {
    throw new Error(
      "Resume must be less than 10MB."
    );
  }


  /* =========================================================
     UNIQUE FILE ID
  ========================================================= */

  const applicationId =
    crypto.randomUUID();


  /* =========================================================
     FILE PATHS
  ========================================================= */

  const safeName = full_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const photoExtension =
    profilePhoto.name
      .split(".")
      .pop()
      ?.toLowerCase() || "jpg";

  const resumeExtensionClean =
    resume.name
      .split(".")
      .pop()
      ?.toLowerCase() || "pdf";


  const profilePhotoPath =
    `${applicationId}/${safeName}-profile.${photoExtension}`;

  const resumePath =
    `${applicationId}/${safeName}-resume.${resumeExtensionClean}`;


  /* =========================================================
     UPLOAD PROFILE PHOTO
  ========================================================= */

  const {
    error: profilePhotoUploadError,
  } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(
      profilePhotoPath,
      profilePhoto,
      {
        cacheControl: "3600",
        upsert: false,
        contentType: profilePhoto.type,
      }
    );

  if (profilePhotoUploadError) {
    console.error(
      "Profile photo upload failed:",
      profilePhotoUploadError
    );

    throw new Error(
      profilePhotoUploadError.message ||
      "Failed to upload profile photo."
    );
  }


  /* =========================================================
     UPLOAD RESUME
  ========================================================= */

  const {
    error: resumeUploadError,
  } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(
      resumePath,
      resume,
      {
        cacheControl: "3600",
        upsert: false,
        contentType:
          resume.type ||
          "application/octet-stream",
      }
    );


  /* =========================================================
     RESUME UPLOAD ERROR
  ========================================================= */

  if (resumeUploadError) {

    console.error(
      "Resume upload failed:",
      resumeUploadError
    );

    /*
     * Clean up the profile photo if resume upload
     * failed so we don't leave an orphaned file.
     */

    await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .remove([profilePhotoPath]);

    throw new Error(
      resumeUploadError.message ||
      "Failed to upload resume."
    );
  }


  /* =========================================================
     SAVE APPLICATION
  ========================================================= */

  const {
    data,
    error,
  } = await supabase
    .from("developer_applications")
    .insert({
      full_name,
      phone,
      email,
      city,
      education,

      github_url,
      linkedin_url,
      portfolio_url:
        portfolio_url || null,

      primary_roles,

      profile_photo_path:
        profilePhotoPath,

      profile_photo_url:
        null,

      resume_path:
        resumePath,

      status: "pending",
    })
    .select()
    .single();


  /* =========================================================
     DATABASE ERROR
  ========================================================= */

  if (error) {

    console.error(
      "Developer application database insert failed:",
      error
    );

    /*
     * Clean up uploaded files if database insertion fails.
     */

    await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .remove([profilePhotoPath]);

    await supabase.storage
      .from(RESUME_BUCKET)
      .remove([resumePath]);

    throw new Error(
      error.message ||
      "Failed to submit developer application."
    );
  }


  /* =========================================================
     SUCCESS
  ========================================================= */

  return data;
}


/* =========================================================
   GET ALL APPLICATIONS
   Admin only through RLS
   ========================================================= */

export async function getDeveloperApplications() {
  const {
    data,
    error,
  } = await supabase
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
   ========================================================= */

export async function getDeveloperApplication(id) {
  if (!id) {
    throw new Error(
      "Application ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
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
   ========================================================= */

export async function updateDeveloperApplicationStatus(
  id,
  status,
  rejectionReason = null
) {
  if (!id) {
    throw new Error(
      "Application ID is required."
    );
  }

  if (!status) {
    throw new Error(
      "Application status is required."
    );
  }

  const update = {
    status,
    updated_at:
      new Date().toISOString(),
  };

  if (status === "rejected") {
    update.rejection_reason =
      rejectionReason || null;
  } else {
    update.rejection_reason = null;
  }

  const {
    data,
    error,
  } = await supabase
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
   ========================================================= */

export async function deleteDeveloperApplication(id) {
  if (!id) {
    throw new Error(
      "Application ID is required."
    );
  }

  const {
    error,
  } = await supabase
    .from("developer_applications")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}