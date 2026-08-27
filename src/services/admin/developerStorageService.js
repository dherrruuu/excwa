import { supabase } from "../../lib/supabase";

/* =========================================================
   EXCWA TECH
   DEVELOPER STORAGE SERVICE

   STORAGE

   profile-photos
   → PUBLIC
   → profile_photo_path
   → Public URL

   developer-resumes
   → PRIVATE
   → resume_path
   → Signed URL
========================================================= */

const PROFILE_PHOTO_BUCKET = "profile-photos";
const RESUME_BUCKET = "developer-resumes";

/* =========================================================
   PROFILE PHOTO
========================================================= */

export function getProfilePhotoUrl(path) {
  if (!path) return null;

  const value = String(path).trim();

  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  const { data, error } = supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .getPublicUrl(value);

  if (error) {
    console.error(
      "EXCWA: Failed to generate profile photo URL:",
      error
    );

    return null;
  }

  return data?.publicUrl || null;
}

/* =========================================================
   RESUME
========================================================= */

export async function getResumeUrl(path) {
  if (!path) return null;

  const value = String(path).trim();

  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(value, 60 * 60);

  if (error) {
    console.error(
      "EXCWA: Failed to generate resume signed URL:",
      error
    );

    return null;
  }

  return data?.signedUrl || null;
}

/* =========================================================
   RESOLVE DEVELOPER STORAGE
========================================================= */

export async function resolveDeveloperStorage(
  developer
) {
  if (!developer) {
    return developer;
  }

  const profilePhotoUrl = getProfilePhotoUrl(
    developer.profile_photo_path
  );

  const resumeUrl = await getResumeUrl(
    developer.resume_path
  );

  return {
    ...developer,

    resolved_profile_photo_url:
      profilePhotoUrl,

    resolved_resume_url:
      resumeUrl,
  };
}