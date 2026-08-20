import { supabase } from "../../lib/supabase";

/**
 * =========================================================
 * DEVELOPER STORAGE SERVICE
 * =========================================================
 *
 * profile-photos      -> PUBLIC bucket
 * developer-resumes   -> PRIVATE bucket
 *
 * Photos:
 *   Public URL
 *
 * Resumes:
 *   Signed URL
 * =========================================================
 */

const PROFILE_PHOTO_BUCKET = "profile-photos";
const RESUME_BUCKET = "developer-resumes";

/**
 * Get public profile photo URL.
 */
export function getProfilePhotoUrl(path) {
  if (!path) return null;

  // Already a complete URL
  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  const { data } = supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .getPublicUrl(path);

  return data?.publicUrl || null;
}

/**
 * Get a temporary signed resume URL.
 *
 * 1 hour validity.
 */
export async function getResumeUrl(path) {
  if (!path) return null;

  // Already a complete URL
  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error("getResumeUrl:", error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Resolve all developer storage URLs.
 */
export async function resolveDeveloperStorage(developer) {
  if (!developer) return developer;

  const photoPath =
    developer.profile_photo_path ||
    developer.profile_photo_url;

  const resumePath =
    developer.resume_path ||
    developer.resume_url;

  const profilePhotoUrl =
    getProfilePhotoUrl(photoPath);

  const resumeUrl =
    await getResumeUrl(resumePath);

  return {
    ...developer,
    resolved_profile_photo_url:
      profilePhotoUrl,
    resolved_resume_url:
      resumeUrl,
  };
}