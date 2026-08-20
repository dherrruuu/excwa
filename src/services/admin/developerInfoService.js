import { supabase } from "../../lib/supabase";

/*
=========================================================
 EXCWA TECH
 ADMIN DEVELOPER INFO SERVICE
=========================================================
*/

const PROFILE_PHOTO_BUCKET = "profile-photos";
const RESUME_BUCKET = "developer-resumes";

/*
=========================================================
 DEVELOPER PROFILE COLUMNS

 IMPORTANT:
 profile_photo_path DOES NOT EXIST in
 developer_profiles.

 The application photo path is stored in:

 developer_applications.profile_photo_path
=========================================================
*/

const PROFILE_COLUMNS = `
  id,
  user_id,
  full_name,
  phone,
  city,
  primary_roles,
  linkedin_url,
  github_url,
  portfolio_url,
  resume_path,
  resume_url,
  profile_photo_url,
  status,
  rejection_reason,
  created_at,
  updated_at
`;


/*
=========================================================
 CLEAN STORAGE PATH
=========================================================
*/

function cleanStoragePath(value, bucket) {
  if (!value) {
    return null;
  }

  let path = String(value).trim();

  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  path = path.replace(/^\/+/, "");

  const bucketPrefix = `${bucket}/`;

  if (
    path
      .toLowerCase()
      .startsWith(
        bucketPrefix.toLowerCase()
      )
  ) {
    path = path.slice(
      bucketPrefix.length
    );
  }

  return path || null;
}


/*
=========================================================
 RESOLVE PROFILE PHOTO
=========================================================
*/

async function getProfilePhotoUrl(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^https?:\/\//i.test(value.trim())
  ) {
    return value.trim();
  }

  const cleanPath = cleanStoragePath(
    value,
    PROFILE_PHOTO_BUCKET
  );

  if (!cleanPath) {
    return null;
  }

  console.log(
    "[DeveloperInfo] Resolving profile photo:",
    {
      original: value,
      cleanPath,
      bucket: PROFILE_PHOTO_BUCKET,
    }
  );

  /*
  -------------------------------------------------------
  TRY PUBLIC URL
  -------------------------------------------------------
  */

  try {
    const {
      data,
    } = supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .getPublicUrl(cleanPath);

    if (data?.publicUrl) {
      console.log(
        "[DeveloperInfo] Photo URL:",
        data.publicUrl
      );

      return data.publicUrl;
    }
  } catch (error) {
    console.warn(
      "[DeveloperInfo] Public photo URL failed:",
      error
    );
  }

  /*
  -------------------------------------------------------
  TRY SIGNED URL

  This works if profile-photos is private.
  -------------------------------------------------------
  */

  try {
    const {
      data,
      error,
    } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .createSignedUrl(
        cleanPath,
        60 * 60
      );

    if (error) {
      console.warn(
        "[DeveloperInfo] Signed photo URL failed:",
        error
      );

      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error(
      "[DeveloperInfo] Photo URL exception:",
      error
    );

    return null;
  }
}


/*
=========================================================
 FIND APPLICATION PHOTO
=========================================================

developer_profiles.profile_photo_url is NULL.

The original application stores:

developer_applications.profile_photo_path

Example:

applications/abc123.jpg
=========================================================
*/

async function getApplicationPhotoPath(userId) {
  if (!userId) {
    return null;
  }

  try {
    const {
      data,
      error,
    } = await supabase
      .from("developer_applications")
      .select(`
        id,
        developer_user_id,
        profile_photo_path,
        created_at
      `)
      .eq(
        "developer_user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(
        "[DeveloperInfo] Application photo lookup failed:",
        error
      );

      return null;
    }

    console.log(
      "[DeveloperInfo] Application photo path:",
      data?.profile_photo_path
    );

    return (
      data?.profile_photo_path ||
      null
    );
  } catch (error) {
    console.error(
      "[DeveloperInfo] Application photo exception:",
      error
    );

    return null;
  }
}


/*
=========================================================
 NORMALIZE DEVELOPER
=========================================================
*/

async function normalizeDeveloper(
  developer
) {
  if (!developer) {
    return null;
  }

  let photoValue =
    developer.profile_photo_url ||
    null;

  /*
  If developer_profiles has no photo URL,
  get it from the original application.
  */

  if (
    !photoValue &&
    developer.user_id
  ) {
    photoValue =
      await getApplicationPhotoPath(
        developer.user_id
      );
  }

  console.log(
    "[DeveloperInfo] Photo source:",
    photoValue
  );

  const profilePhotoUrl =
    await getProfilePhotoUrl(
      photoValue
    );

  console.log(
    "[DeveloperInfo] Final photo URL:",
    profilePhotoUrl
  );

  return {
    ...developer,

    profile_photo_url:
      profilePhotoUrl,

    resume_view_url:
      null,

    account:
      developer.account || null,

    applications:
      Array.isArray(
        developer.applications
      )
        ? developer.applications
        : [],
  };
}


/*
=========================================================
 GET ALL DEVELOPERS
=========================================================
*/

export async function getDeveloperInfoList() {
  console.log(
    "[DeveloperInfo] Loading developer list..."
  );

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select(PROFILE_COLUMNS)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "[DeveloperInfo] getDeveloperInfoList:",
      error
    );

    throw error;
  }

  const developers =
    Array.isArray(data)
      ? data
      : [];

  return Promise.all(
    developers.map(
      normalizeDeveloper
    )
  );
}


/*
=========================================================
 GET SINGLE DEVELOPER
=========================================================
*/

export async function getDeveloperInfoById(
  developerId
) {
  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  console.log(
    "[DeveloperInfo] Loading developer:",
    developerId
  );

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select(PROFILE_COLUMNS)
    .eq(
      "id",
      developerId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[DeveloperInfo] getDeveloperInfoById:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Developer profile was not found."
    );
  }

  const developer =
    await normalizeDeveloper(data);

  const account =
    await getDeveloperAccount(
      data.user_id
    );

  const applications =
    await getDeveloperApplications(
      data.user_id
    );

  return {
    ...developer,
    account,
    applications,
  };
}


/*
=========================================================
 GET ACCOUNT
=========================================================
*/

export async function getDeveloperAccount(
  userId
) {
  if (!userId) {
    return null;
  }

  try {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        role,
        created_at,
        updated_at
      `)
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    if (error) {
      console.warn(
        "[DeveloperInfo] Account lookup failed:",
        error
      );

      return null;
    }

    return data || null;
  } catch (error) {
    console.error(
      "[DeveloperInfo] Account exception:",
      error
    );

    return null;
  }
}


/*
=========================================================
 GET APPLICATIONS
=========================================================
*/

export async function getDeveloperApplications(
  userId
) {
  if (!userId) {
    return [];
  }

  try {
    const {
      data,
      error,
    } = await supabase
      .from("developer_applications")
      .select(`
        id,
        full_name,
        email,
        city,
        education,
        primary_roles,
        github_url,
        linkedin_url,
        portfolio_url,
        profile_photo_path,
        resume_path,
        status,
        rejection_reason,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        developer_user_id
      `)
      .eq(
        "developer_user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.warn(
        "[DeveloperInfo] Applications lookup failed:",
        error
      );

      return [];
    }

    return data || [];
  } catch (error) {
    console.error(
      "[DeveloperInfo] Applications exception:",
      error
    );

    return [];
  }
}


/*
=========================================================
 UPDATE DEVELOPER
=========================================================
*/

export async function updateDeveloperInfo(
  developerId,
  updates
) {
  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  const allowedFields = [
    "full_name",
    "phone",
    "city",
    "primary_roles",
    "linkedin_url",
    "github_url",
    "portfolio_url",
    "profile_photo_url",
    "resume_path",
    "resume_url",
  ];

  const cleanUpdates = {};

  for (
    const field of allowedFields
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates || {},
        field
      )
    ) {
      cleanUpdates[field] =
        updates[field];
    }
  }

  cleanUpdates.updated_at =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .update(cleanUpdates)
    .eq(
      "id",
      developerId
    )
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    console.error(
      "[DeveloperInfo] updateDeveloperInfo:",
      error
    );

    throw error;
  }

  return normalizeDeveloper(data);
}


/*
=========================================================
 STATUS UPDATE
=========================================================
*/

async function updateDeveloperStatus(
  developerId,
  status,
  rejectionReason = undefined
) {
  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  const payload = {
    status,
    updated_at:
      new Date().toISOString(),
  };

  if (
    rejectionReason !== undefined
  ) {
    payload.rejection_reason =
      rejectionReason;
  }

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .update(payload)
    .eq(
      "id",
      developerId
    )
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    console.error(
      "[DeveloperInfo] Status update failed:",
      error
    );

    throw error;
  }

  return normalizeDeveloper(data);
}


/*
=========================================================
 SUSPEND
=========================================================
*/

export async function suspendDeveloper(
  developerId
) {
  return updateDeveloperStatus(
    developerId,
    "suspended"
  );
}


/*
=========================================================
 REACTIVATE
=========================================================
*/

export async function reactivateDeveloper(
  developerId
) {
  return updateDeveloperStatus(
    developerId,
    "approved",
    null
  );
}


/*
=========================================================
 DEACTIVATE
=========================================================
*/

export async function deactivateDeveloper(
  developerId
) {
  return updateDeveloperStatus(
    developerId,
    "deactivated"
  );
}


/*
/* =========================================================
   RESUME URL
========================================================= */

export async function getDeveloperResumeUrl(path) {
  if (!path) {
    return null;
  }

  const value = String(path).trim();

  if (!value) {
    return null;
  }

  /* -------------------------------------------------------
     ALREADY A URL
  ------------------------------------------------------- */

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  /* -------------------------------------------------------
     CLEAN STORAGE PATH
  ------------------------------------------------------- */

  const cleanPath = value
    .replace(/^\/+/, "")
    .replace(/^developer-resumes\//i, "");

  console.log(
    "[DeveloperInfo] Creating resume signed URL:",
    cleanPath
  );

  try {
    const {
      data,
      error,
    } = await supabase.storage
      .from("developer-resumes")
      .createSignedUrl(
        cleanPath,
        60 * 60
      );

    if (error) {
      console.error(
        "[DeveloperInfo] Resume signed URL error:",
        error
      );

      return null;
    }

    console.log(
      "[DeveloperInfo] Resume signed URL created:",
      !!data?.signedUrl
    );

    return data?.signedUrl || null;

  } catch (error) {
    console.error(
      "[DeveloperInfo] Resume URL exception:",
      error
    );

    return null;
  }
}


/*
=========================================================
 EXPORTS
=========================================================
*/

export {
  PROFILE_PHOTO_BUCKET,
  RESUME_BUCKET,
};