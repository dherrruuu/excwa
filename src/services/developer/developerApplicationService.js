import { supabase } from "../../lib/supabase";

/*
=========================================================
 DEVELOPER APPLICATION SERVICE
=========================================================

Public developer registration/application service.

Responsibilities:
- Validate application data
- Upload profile photo
- Upload resume
- Create developer_applications record
- Check existing applications

This service does NOT:
- Create Auth users
- Approve applications
- Create developer_profiles
- Assign developer roles
- Use service_role credentials

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

  if (
    !Array.isArray(form.primary_roles) ||
    form.primary_roles.length === 0
  ) {
    return "Please select at least one developer role.";
  }

  if (!profilePhoto) {
    return "Please upload your profile photo.";
  }

  if (!resume) {
    return "Please upload your resume.";
  }

  if (!profilePhoto.type?.startsWith("image/")) {
    return "Please upload a valid profile photo.";
  }

  if (profilePhoto.size > MAX_PHOTO_SIZE) {
    return "Profile photo must be less than 5MB.";
  }

  if (!ALLOWED_RESUME_TYPES.includes(resume.type)) {
    return "Resume must be PDF, DOC, or DOCX.";
  }

  if (resume.size > MAX_RESUME_SIZE) {
    return "Resume must be less than 10MB.";
  }

  return "";
}


/* =========================================================
   GENERATE UNIQUE FILE PATH
========================================================= */

function createFilePath(file, folder) {
  const originalName = file?.name || "";

  const extension = originalName.includes(".")
    ? originalName
        .split(".")
        .pop()
        .toLowerCase()
    : "";

  const uniqueName = crypto.randomUUID();

  return `${folder}/${uniqueName}${
    extension ? `.${extension}` : ""
  }`;
}


/* =========================================================
   UPLOAD FILE
========================================================= */

async function uploadFile(file, bucket, folder) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const filePath = createFilePath(file, folder);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

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

async function deleteFile(bucket, path) {
  if (!path) {
    return;
  }

  try {
    const { error } = await supabase.storage
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
   SUBMIT DEVELOPER APPLICATION
========================================================= */

export async function submitDeveloperApplication({
  form,
  profilePhoto,
  resume,
}) {
  /*
   * -------------------------------------------------------
   * 1. VALIDATE
   * -------------------------------------------------------
   */

  const validationError =
    validateDeveloperApplication(
      form,
      profilePhoto,
      resume
    );

  if (validationError) {
    throw new Error(validationError);
  }


  /*
   * -------------------------------------------------------
   * File paths are kept so they can be deleted if the
   * database insert fails.
   * -------------------------------------------------------
   */

  let profilePhotoPath = null;
  let resumePath = null;


  try {
    /*
     * -----------------------------------------------------
     * 2. CHECK FOR EXISTING APPLICATION
     * -----------------------------------------------------
     */

    const normalizedEmail =
      form.email.trim().toLowerCase();

    const { data: existingApplication, error: existingError } =
      await supabase
        .from("developer_applications")
        .select(
          "id, status, developer_user_id"
        )
        .eq("email", normalizedEmail)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Existing developer application check failed:",
        existingError
      );

      throw new Error(
        existingError.message ||
          "Unable to verify existing application."
      );
    }

    if (existingApplication) {
      if (
        existingApplication.status ===
        "pending"
      ) {
        throw new Error(
          "An application with this email is already under review."
        );
      }

      if (
        existingApplication.status ===
        "under_review"
      ) {
        throw new Error(
          "Your application is already being reviewed by EXCWA."
        );
      }

      if (
        existingApplication.status ===
        "accepted"
      ) {
        throw new Error(
          "An approved developer account already exists for this email."
        );
      }

      /*
       * Rejected applications are also blocked here.
       * If EXCWA later wants to allow re-application,
       * this rule can be changed centrally.
       */

      if (
        existingApplication.status ===
        "rejected"
      ) {
        throw new Error(
          "A previous application with this email was rejected. Please contact EXCWA Tech if you wish to re-apply."
        );
      }
    }


    /*
     * -----------------------------------------------------
     * 3. UPLOAD PROFILE PHOTO
     * -----------------------------------------------------
     */

    const photoUpload = await uploadFile(
      profilePhoto,
      PHOTO_BUCKET,
      PHOTO_FOLDER
    );

    profilePhotoPath = photoUpload.path;


    /*
     * -----------------------------------------------------
     * 4. UPLOAD RESUME
     * -----------------------------------------------------
     */

    const resumeUpload = await uploadFile(
      resume,
      RESUME_BUCKET,
      RESUME_FOLDER
    );

    resumePath = resumeUpload.path;


    /*
     * -----------------------------------------------------
     * 5. BUILD DATABASE RECORD
     * -----------------------------------------------------
     *
     * Matches the actual developer_applications table:
     *
     * full_name
     * phone
     * email
     * city
     * education
     * github_url
     * linkedin_url
     * portfolio_url
     * primary_roles
     * profile_photo_path
     * profile_photo_url
     * resume_path
     * status
     * rejection_reason
     * reviewed_by
     * reviewed_at
     * developer_user_id
     *
     * The following fields are intentionally left out:
     *
     * id
     * created_at
     * updated_at
     *
     * because PostgreSQL generates them.
     *
     * developer_user_id remains NULL until approval.
     * -----------------------------------------------------
     */

    const applicationPayload = {
      full_name:
        form.full_name.trim(),

      phone:
        form.phone.trim(),

      email:
        normalizedEmail,

      city:
        form.city.trim(),

      education:
        form.education.trim(),

      github_url:
        form.github_url?.trim() || null,

      linkedin_url:
        form.linkedin_url?.trim() || null,

      portfolio_url:
        form.portfolio_url?.trim() || null,

      primary_roles:
        form.primary_roles,

      profile_photo_path:
        profilePhotoPath,

      /*
       * We intentionally keep this NULL.
       *
       * The bucket should remain private and the admin
       * side can generate signed URLs when needed.
       */

      profile_photo_url:
        null,

      resume_path:
        resumePath,

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


    /*
     * -----------------------------------------------------
     * 6. INSERT APPLICATION
     * -----------------------------------------------------
     */

    const {
      data,
      error,
    } = await supabase
      .from("developer_applications")
      .insert(applicationPayload)
      .select()
      .single();


    /*
     * -----------------------------------------------------
     * 7. DATABASE ERROR
     * -----------------------------------------------------
     */

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


    /*
     * -----------------------------------------------------
     * 8. SUCCESS
     * -----------------------------------------------------
     */

    return data;

  } catch (error) {

    /*
     * -----------------------------------------------------
     * 9. CLEANUP
     * -----------------------------------------------------
     *
     * If either upload succeeded but the database insert
     * failed, remove the uploaded files.
     * -----------------------------------------------------
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
   GET APPLICATION
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
    .from("developer_applications")
    .select("*")
    .eq("id", applicationId)
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
========================================================= */

export async function checkDeveloperApplication(
  email
) {
  const normalizedEmail =
    email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from("developer_applications")
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
    .eq("email", normalizedEmail)
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