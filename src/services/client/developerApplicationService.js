import { supabase } from "../../lib/supabase";

/*
=========================================================
 EXCWA TECH
 DEVELOPER APPLICATION SERVICE
=========================================================

PUBLIC APPLICATION FLOW

Public user
    ↓
Validate form
    ↓
Upload profile photo
    ↓
Upload resume
    ↓
INSERT developer_applications
    ↓
status = pending
    ↓
Success

IMPORTANT:

This service DOES NOT:

- create Supabase Auth users
- approve applications
- create developer_profiles
- assign freelancer roles
- use service_role credentials
- SELECT developer_applications from the public browser

Those operations belong to the secure admin/server-side
approval flow.

=========================================================
*/


/* =========================================================
   STORAGE CONFIGURATION
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
    throw new Error(
      "No file selected."
    );
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
      "Developer application file upload failed:",
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

  try {
    const {
      error,
    } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error(
        `Failed to remove file from ${bucket}:`,
        error
      );
    }
  } catch (error) {
    console.error(
      `Storage cleanup failed for ${bucket}:`,
      error
    );
  }
}


/* =========================================================
   CREATE DEVELOPER APPLICATION
=========================================================

This is the function used by:

DeveloperApplicationForm.jsx

IMPORTANT:

There is intentionally NO:

.select()
.single()

after the INSERT.

The public user has INSERT permission only.
They do not have SELECT permission on
developer_applications.

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
    form.full_name
      .trim();

  const phone =
    form.phone
      .trim();

  const email =
    form.email
      .trim()
      .toLowerCase();

  const city =
    form.city
      .trim();

  const education =
    form.education
      .trim();

  const github_url =
    form.github_url
      ?.trim() || null;

  const linkedin_url =
    form.linkedin_url
      ?.trim() || null;

  const portfolio_url =
    form.portfolio_url
      ?.trim() || null;

  const primary_roles =
    Array.isArray(
      form.primary_roles
    )
      ? form.primary_roles
      : [];


  /* =======================================================
     3. STORAGE PATH TRACKING
  ======================================================= */

  let profilePhotoPath =
    null;

  let resumePath =
    null;


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
       6. BUILD APPLICATION PAYLOAD
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
       * Keep this NULL.
       *
       * The application files should not expose
       * permanent public URLs from the client.
       */

      profile_photo_url:
        null,

      resume_path:
        resumePath,

      /*
       * IMPORTANT:
       *
       * Public RLS allows INSERT only when the
       * application is pending.
       */

      status:
        "pending",

      rejection_reason:
        null,

      reviewed_by:
        null,

      reviewed_at:
        null,

      developer_user_id:
        null,
    };


    /* =====================================================
       7. INSERT APPLICATION
    =====================================================

    IMPORTANT:

    DO NOT use:

        .select()
        .single()

    The public user does not have SELECT permission
    on developer_applications.

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


    /* =====================================================
       8. DATABASE ERROR
    ===================================================== */

    if (error) {
      console.error(
        "Developer application database insert failed:",
        error
      );

      throw new Error(
        error.message ||
          "Unable to submit developer application."
      );
    }


    /* =====================================================
       9. SUCCESS
    ===================================================== */

    return true;

  } catch (error) {

    /* =====================================================
       10. CLEANUP STORAGE
    =====================================================

    If the database INSERT fails after the files
    were uploaded, remove those files.

    */

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
=========================================================

Allows other parts of the application to use:

submitDeveloperApplication()

without breaking the existing form.

========================================================= */

export const submitDeveloperApplication =
  createDeveloperApplication;


/* =========================================================
   GET APPLICATION
=========================================================

IMPORTANT:

This function is NOT intended for public application
submission.

The public user should NOT call this function because
developer_applications SELECT is restricted by RLS.

Use this from admin-side code only, where the logged-in
user satisfies is_excwa_admin().
========================================================= */

export async function getDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "developer_applications"
    )
    .select("*")
    .eq(
      "id",
      applicationId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to load developer application:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load developer application."
    );
  }

  return data;
}


/* =========================================================
   CHECK APPLICATION BY EMAIL
=========================================================

IMPORTANT:

This is ADMIN-SIDE ONLY.

Do NOT call this from the public application form.

Public users do not have SELECT permission on
developer_applications.

========================================================= */

export async function checkDeveloperApplication(
  email
) {
  const normalizedEmail =
    email
      ?.trim()
      .toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "developer_applications"
    )
    .select(
      `
        id,
        full_name,
        email,
        status,
        rejection_reason,
        developer_user_id,
        created_at,
        updated_at
      `
    )
    .eq(
      "email",
      normalizedEmail
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to check developer application:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to check application status."
    );
  }

  return data;
}


/* =========================================================
   EXPORTED CONSTANTS
========================================================= */

export {
  PHOTO_BUCKET,
  RESUME_BUCKET,
  MAX_PHOTO_SIZE,
  MAX_RESUME_SIZE,
};