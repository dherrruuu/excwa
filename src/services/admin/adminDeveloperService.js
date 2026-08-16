import { supabase } from "../../lib/supabase";

/* =========================================================
   EXCWA TECH
   ADMIN DEVELOPER SERVICE
========================================================= */

/* =========================================================
   APPLICATION STATUS CONSTANTS
========================================================= */

export const DEVELOPER_APPLICATION_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
};

/* =========================================================
   DEVELOPER PROFILE STATUS CONSTANTS
========================================================= */

export const DEVELOPER_PROFILE_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
};

/* =========================================================
   STORAGE CONSTANTS
========================================================= */

const PROFILE_PHOTO_BUCKET =
  "profile-photos";

const DEVELOPER_RESUME_BUCKET =
  "developer-resumes";

/* =========================================================
   GET CURRENT ADMIN
========================================================= */

async function getCurrentAdmin() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error(
      "Failed to get current authenticated user:",
      authError
    );

    throw new Error(
      "Unable to verify your administrator session."
    );
  }

  if (!user) {
    throw new Error(
      "You must be logged in as an administrator."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Failed to verify administrator profile:",
      profileError
    );

    throw new Error(
      profileError.message ||
        "Unable to verify administrator."
    );
  }

  if (!profile) {
    throw new Error(
      "Administrator profile not found."
    );
  }

  if (profile.role !== "admin") {
    throw new Error(
      "Administrator access is required."
    );
  }

  return user;
}

/* =========================================================
   GET ALL DEVELOPER APPLICATIONS
========================================================= */

export async function getDeveloperApplications() {
  await getCurrentAdmin();

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
    console.error(
      "Failed to load developer applications:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load developer applications."
    );
  }

  return data || [];
}

/* =========================================================
   GET SINGLE DEVELOPER APPLICATION
========================================================= */

export async function getDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  await getCurrentAdmin();

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

  if (!data) {
    throw new Error(
      "Developer application not found."
    );
  }

  return data;
}

/* =========================================================
   APPROVE DEVELOPER APPLICATION
========================================================= */

export async function approveDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  await getCurrentAdmin();

  const application =
    await getDeveloperApplication(
      applicationId
    );

  if (
    application.status ===
    DEVELOPER_APPLICATION_STATUSES.ACCEPTED
  ) {
    throw new Error(
      "This developer application has already been accepted."
    );
  }

  if (
    application.status ===
    DEVELOPER_APPLICATION_STATUSES.REJECTED
  ) {
    throw new Error(
      "A rejected application cannot be accepted directly."
    );
  }

  if (
    application.status !==
    DEVELOPER_APPLICATION_STATUSES.PENDING
  ) {
    throw new Error(
      `Cannot accept an application with status "${application.status}".`
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    "approve-developer",
    {
      body: {
        application_id: applicationId,
      },
    }
  );

  if (error) {
    console.error(
      "Approve developer Edge Function failed:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to approve developer application."
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        "Unable to approve developer application."
    );
  }

  if (!data?.application) {
    throw new Error(
      "Developer approval completed, but no updated application was returned."
    );
  }

  return {
    success: true,
    application: data.application,
    user_id: data.user_id || null,
    activation_link:
      data.activation_link || null,
    message:
      data.message ||
      "Developer application accepted successfully.",
  };
}

/* =========================================================
   REJECT DEVELOPER APPLICATION
========================================================= */

export async function rejectDeveloperApplication(
  applicationId,
  rejectionReason = ""
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  await getCurrentAdmin();

  const application =
    await getDeveloperApplication(
      applicationId
    );

  if (
    application.status ===
    DEVELOPER_APPLICATION_STATUSES.ACCEPTED
  ) {
    throw new Error(
      "An accepted developer application cannot be rejected."
    );
  }

  if (
    application.status ===
    DEVELOPER_APPLICATION_STATUSES.REJECTED
  ) {
    throw new Error(
      "This developer application is already rejected."
    );
  }

  if (
    application.status !==
    DEVELOPER_APPLICATION_STATUSES.PENDING
  ) {
    throw new Error(
      `Cannot reject an application with status "${application.status}".`
    );
  }

  const reason =
    typeof rejectionReason === "string"
      ? rejectionReason.trim()
      : "";

  if (!reason) {
    throw new Error(
      "A rejection reason is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    "reject-developer",
    {
      body: {
        application_id: applicationId,
        rejection_reason: reason,
      },
    }
  );

  if (error) {
    console.error(
      "Reject developer Edge Function failed:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to reject developer application."
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        "Unable to reject developer application."
    );
  }

  if (!data?.application) {
    throw new Error(
      "Developer rejection completed, but no updated application was returned."
    );
  }

  return {
    success: true,
    application: data.application,
    message:
      data.message ||
      "Developer application rejected successfully.",
  };
}

/* =========================================================
   DELETE DEVELOPER APPLICATION
========================================================= */

export async function deleteDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  await getCurrentAdmin();

  const {
    data: application,
    error: applicationError,
  } = await supabase
    .from("developer_applications")
    .select(
      "id, full_name, profile_photo_path, resume_path"
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError) {
    console.error(
      "Failed to load application for deletion:",
      applicationError
    );

    throw new Error(
      applicationError.message ||
        "Unable to load developer application."
    );
  }

  if (!application) {
    throw new Error(
      "Developer application not found."
    );
  }

  const storageErrors = [];

  if (application.profile_photo_path) {
    const {
      error,
    } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .remove([
        application.profile_photo_path,
      ]);

    if (error) {
      console.error(
        "Failed to delete developer profile photo:",
        error
      );

      storageErrors.push(
        "profile photo"
      );
    }
  }

  if (application.resume_path) {
    const {
      error,
    } = await supabase.storage
      .from(DEVELOPER_RESUME_BUCKET)
      .remove([
        application.resume_path,
      ]);

    if (error) {
      console.error(
        "Failed to delete developer resume:",
        error
      );

      storageErrors.push("resume");
    }
  }

  const {
    error: deleteError,
  } = await supabase
    .from("developer_applications")
    .delete()
    .eq("id", applicationId);

  if (deleteError) {
    console.error(
      "Failed to delete developer application:",
      deleteError
    );

    throw new Error(
      deleteError.message ||
        "Unable to delete developer application."
    );
  }

  return {
    success: true,
    applicationId,
    storageErrors,
  };
}

/* =========================================================
   GET ALL DEVELOPERS
========================================================= */

export async function getDevelopers() {
  await getCurrentAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Failed to load developers:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load developers."
    );
  }

  return data || [];
}

/* =========================================================
   GET SINGLE DEVELOPER
========================================================= */

export async function getDeveloper(
  developerId
) {
  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  await getCurrentAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("id", developerId)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to load developer:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load developer."
    );
  }

  if (!data) {
    throw new Error(
      "Developer not found."
    );
  }

  return data;
}

/* =========================================================
   GET DEVELOPER BY AUTH USER ID
========================================================= */

export async function getDeveloperByUserId(
  userId
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  await getCurrentAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to load developer profile:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load developer profile."
    );
  }

  return data;
}

/* =========================================================
   UPDATE DEVELOPER STATUS
========================================================= */

export async function updateDeveloperStatus(
  developerId,
  status,
  rejectionReason = null
) {
  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  await getCurrentAdmin();

  const allowedStatuses = [
    DEVELOPER_PROFILE_STATUSES.PENDING,
    DEVELOPER_PROFILE_STATUSES.APPROVED,
    DEVELOPER_PROFILE_STATUSES.REJECTED,
    DEVELOPER_PROFILE_STATUSES.SUSPENDED,
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid developer status: ${status}`
    );
  }

  const update = {
    status,
    updated_at:
      new Date().toISOString(),
  };

  if (
    status ===
    DEVELOPER_PROFILE_STATUSES.REJECTED
  ) {
    update.rejection_reason =
      typeof rejectionReason === "string"
        ? rejectionReason.trim() || null
        : null;
  } else {
    update.rejection_reason = null;
  }

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .update(update)
    .eq("id", developerId)
    .select()
    .single();

  if (error) {
    console.error(
      "Failed to update developer status:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to update developer status."
    );
  }

  return data;
}

/* =========================================================
   SUSPEND DEVELOPER
========================================================= */

export async function suspendDeveloper(
  developerId
) {
  return updateDeveloperStatus(
    developerId,
    DEVELOPER_PROFILE_STATUSES.SUSPENDED
  );
}

/* =========================================================
   REACTIVATE DEVELOPER
========================================================= */

export async function reactivateDeveloper(
  developerId
) {
  return updateDeveloperStatus(
    developerId,
    DEVELOPER_PROFILE_STATUSES.APPROVED
  );
}

/* =========================================================
   DELETE DEVELOPER ACCOUNT
========================================================= */

export async function deleteDeveloper(
  developerUserId
) {
  if (!developerUserId) {
    throw new Error(
      "Developer user ID is required."
    );
  }

  await getCurrentAdmin();

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    "delete-developer",
    {
      body: {
        developer_user_id:
          developerUserId,
      },
    }
  );

  if (error) {
    console.error(
      "Delete developer Edge Function failed:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to delete developer."
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        "Unable to delete developer."
    );
  }

  return {
    success: true,

    developer_id:
      data.developer_id ||
      null,

    user_id:
      data.user_id ||
      developerUserId,

    email:
      data.email ||
      null,

    storage_errors:
      data.storage_errors ||
      [],

    message:
      data.message ||
      "Developer account deleted successfully.",
  };
}