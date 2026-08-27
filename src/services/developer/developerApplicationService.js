import { supabase } from "../../lib/supabase";

/*
=========================================================
 EXCWA TECH
 DEVELOPER APPLICATION SERVICE
=========================================================

PUBLIC DEVELOPER APPLICATION FLOW

Developer
    ↓
Validate application
    ↓
Upload profile photo
    ↓
Upload resume
    ↓
INSERT developer_applications
    ↓
status = pending
    ↓
Admin reviews application
    ↓
Admin approval is handled separately

IMPORTANT:

This service DOES NOT:

- create Auth users
- create developer_profiles
- approve applications
- send activation emails
- assign developers
- use service_role credentials
- SELECT developer_applications after public submission

=========================================================
*/


/* =========================================================
   STORAGE
========================================================= */

const PHOTO_BUCKET = "profile-photos";
const RESUME_BUCKET = "developer-resumes";

const PHOTO_FOLDER = "applications";
const RESUME_FOLDER = "applications";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_RESUME_SIZE = 10 * 1024 * 1024;

const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_RESUME_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
];


/* =========================================================
   VALIDATE APPLICATION
========================================================= */

export function validateDeveloperApplication(
  form,
  profilePhoto,
  resume
) {
  if (!form) {
    return "Application data is required.";
  }

  /* -------------------------------------------------------
     BASIC INFORMATION
  ------------------------------------------------------- */

  if (!form.full_name?.trim()) {
    return "Please enter your full name.";
  }

  if (!form.phone?.trim()) {
    return "Please enter your phone number.";
  }

  if (!form.email?.trim()) {
    return "Please enter your email address.";
  }

  if (!form.city?.trim()) {
    return "Please enter your city.";
  }

  if (!form.education?.trim()) {
    return "Please enter your education.";
  }


  /* -------------------------------------------------------
     PROFESSIONAL PROFILES
  ------------------------------------------------------- */

  if (!form.github_url?.trim()) {
    return "Please enter your GitHub profile.";
  }

  if (!form.linkedin_url?.trim()) {
    return "Please enter your LinkedIn profile.";
  }


  /* -------------------------------------------------------
     ROLES
  ------------------------------------------------------- */

  if (
    !Array.isArray(form.primary_roles) ||
    form.primary_roles.length === 0
  ) {
    return "Please select at least one developer role.";
  }


  /* -------------------------------------------------------
     PROFILE PHOTO
  ------------------------------------------------------- */

  if (!profilePhoto) {
    return "Please upload your profile photo.";
  }

  if (!(profilePhoto instanceof File)) {
    return "Invalid profile photo.";
  }

  if (!profilePhoto.type?.startsWith("image/")) {
    return "Please upload a valid profile photo.";
  }

  if (profilePhoto.size > MAX_PHOTO_SIZE) {
    return "Profile photo must be less than 5MB.";
  }


  /* -------------------------------------------------------
     RESUME
  ------------------------------------------------------- */

  if (!resume) {
    return "Please upload your resume.";
  }

  if (!(resume instanceof File)) {
    return "Invalid resume file.";
  }

  const resumeName =
    resume.name?.toLowerCase() || "";

  const resumeExtension =
    resumeName.includes(".")
      ? `.${resumeName.split(".").pop()}`
      : "";

  const validResumeType =
    ALLOWED_RESUME_TYPES.includes(resume.type);

  const validResumeExtension =
    ALLOWED_RESUME_EXTENSIONS.includes(
      resumeExtension
    );

  if (
    !validResumeType &&
    !validResumeExtension
  ) {
    return "Resume must be PDF, DOC, or DOCX.";
  }

  if (resume.size > MAX_RESUME_SIZE) {
    return "Resume must be less than 10MB.";
  }


  return "";
}


/* =========================================================
   CREATE UNIQUE FILE PATH
========================================================= */

function createFilePath(file, folder) {
  const originalName =
    file?.name || "";

  const extension =
    originalName.includes(".")
      ? originalName
          .split(".")
          .pop()
          .toLowerCase()
      : "";

  const uniqueName =
    crypto.randomUUID();

  return `${folder}/${uniqueName}${
    extension
      ? `.${extension}`
      : ""
  }`;
}


/* =========================================================
   UPLOAD FILE
========================================================= */

async function uploadFile(
  file,
  bucket,
  folder
) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const filePath =
    createFilePath(
      file,
      folder
    );

  const {
    data,
    error,
  } = await supabase.storage
    .from(bucket)
    .upload(
      filePath,
      file,
      {
        cacheControl: "3600",
        contentType:
          file.type ||
          "application/octet-stream",
        upsert: false,
      }
    );

  if (error) {
    console.error(
      "Developer application upload failed:",
      {
        bucket,
        filePath,
        error,
      }
    );

    throw new Error(
      error.message ||
        `Unable to upload ${file.name}.`
    );
  }

  return {
    path: filePath,
    data,
  };
}


/* =========================================================
   DELETE FILE
========================================================= */

async function deleteFile(
  bucket,
  path
) {
  if (!path) {
    return;
  }

  const {
    error,
  } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error(
      `Failed to delete ${path} from ${bucket}:`,
      error
    );
  }
}


/* =========================================================
   CREATE DEVELOPER APPLICATION
========================================================= */

export async function createDeveloperApplication(
  form
) {
  if (!form) {
    throw new Error(
      "Application data is required."
    );
  }

  const profilePhoto =
    form.profilePhoto;

  const resume =
    form.resume;


  /* =======================================================
     1. VALIDATE
  ======================================================= */

  const validationError =
    validateDeveloperApplication(
      form,
      profilePhoto,
      resume
    );

  if (validationError) {
    throw new Error(
      validationError
    );
  }


  /* =======================================================
     2. NORMALIZE DATA
  ======================================================= */

  const full_name =
    form.full_name.trim();

  const phone =
    form.phone.trim();

  const email =
    form.email
      .trim()
      .toLowerCase();

  const city =
    form.city.trim();

  const education =
    form.education.trim();

  const github_url =
    form.github_url?.trim() || null;

  const linkedin_url =
    form.linkedin_url?.trim() || null;

  const portfolio_url =
    form.portfolio_url?.trim() || null;

  const primary_roles =
    Array.isArray(form.primary_roles)
      ? form.primary_roles
      : [];


  /* =======================================================
     3. STORAGE TRACKING
  ======================================================= */

  let profilePhotoPath = null;
  let resumePath = null;


  try {

    /* =====================================================
       4. UPLOAD PROFILE PHOTO
    ===================================================== */

    const photoUpload =
      await uploadFile(
        profilePhoto,
        PHOTO_BUCKET,
        PHOTO_FOLDER
      );

    profilePhotoPath =
      photoUpload.path;


    /* =====================================================
       5. UPLOAD RESUME
    ===================================================== */

    const resumeUpload =
      await uploadFile(
        resume,
        RESUME_BUCKET,
        RESUME_FOLDER
      );

    resumePath =
      resumeUpload.path;


    /* =====================================================
       6. APPLICATION PAYLOAD
    ===================================================== */

    const applicationPayload = {

      full_name,

      phone,

      email,

      city,

      education,

      github_url,

      linkedin_url,

      portfolio_url,

      primary_roles,

      profile_photo_path:
        profilePhotoPath,

      /*
       * Profile photo bucket is public,
       * but we still store the path as the
       * canonical database value.
       */

      profile_photo_url:
        null,

      /*
       * Resume bucket is PRIVATE.
       */

      resume_path:
        resumePath,

      /*
       * No permanent resume URL.
       */

      resume_url:
        null,

      /*
       * New application always starts pending.
       */

      status:
        "pending",

      rejection_reason:
        null,

      reviewed_by:
        null,

      reviewed_at:
        null,

      /*
       * IMPORTANT:
       *
       * The developer does not have an Auth
       * account yet.
       */

      developer_user_id:
        null,
    };


    /* =====================================================
       7. INSERT
    ===================================================== */

    /*
     * IMPORTANT:
     *
     * Do NOT use:
     *
     * .select()
     * .single()
     *
     * Public users have INSERT permission,
     * not SELECT permission.
     */

    const {
      error,
    } = await supabase
      .from(
        "developer_applications"
      )
      .insert(
        applicationPayload
      );

    if (error) {
      console.error(
        "Developer application insert failed:",
        error
      );

      throw new Error(
        error.message ||
          "Unable to submit developer application."
      );
    }


    /* =====================================================
       8. SUCCESS
    ===================================================== */

    return {
      success: true,
      message:
        "Developer application submitted successfully.",
    };

  } catch (error) {

    /* =====================================================
       9. CLEANUP
    ===================================================== */

    if (profilePhotoPath) {
      await deleteFile(
        PHOTO_BUCKET,
        profilePhotoPath
      );
    }

    if (resumePath) {
      await deleteFile(
        RESUME_BUCKET,
        resumePath
      );
    }

    console.error(
      "Developer application submission failed:",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to submit your developer application."
    );
  }
}


/* =========================================================
   ALIAS
========================================================= */

export const submitDeveloperApplication =
  createDeveloperApplication;


/* =========================================================
   STORAGE CONSTANTS
========================================================= */

export {
  PHOTO_BUCKET,
  RESUME_BUCKET,
  MAX_PHOTO_SIZE,
  MAX_RESUME_SIZE,
};