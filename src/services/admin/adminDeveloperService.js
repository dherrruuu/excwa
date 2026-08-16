import { supabase } from "../../lib/supabase";

/*
=========================================================
 ADMIN DEVELOPER SERVICE
=========================================================

Responsibilities:

1. Get developer applications
2. Get single application
3. Approve application
4. Reject application
5. Suspend developer
6. Get developer profiles
7. Get single developer profile

IMPORTANT:
The actual Supabase Auth user creation must NOT happen
from the browser using the service-role key.

The approval flow will eventually be:

developer_application
        ↓
     accepted
        ↓
create Auth user
        ↓
create developer_profiles row
        ↓
developer_status = approved
        ↓
developer can login
=========================================================
*/


/* =========================================================
   GET ALL DEVELOPER APPLICATIONS
========================================================= */

export async function getDeveloperApplications() {
  const { data, error } = await supabase
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
   GET SINGLE APPLICATION
========================================================= */

export async function getDeveloperApplication(applicationId) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  const { data, error } = await supabase
    .from("developer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

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

  /*
   * Get currently logged-in admin.
   */

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      "You must be logged in as an administrator."
    );
  }

  /*
   * Get application.
   */

  const application =
    await getDeveloperApplication(applicationId);

  if (application.status === "accepted") {
    throw new Error(
      "This application has already been approved."
    );
  }

  if (application.status === "rejected") {
    throw new Error(
      "A rejected application cannot be approved directly."
    );
  }

  /*
   * Update application status.
   *
   * app_status enum:
   *
   * pending
   * under_review
   * accepted
   * rejected
   */

  const { data, error } = await supabase
    .from("developer_applications")
    .update({
      status: "accepted",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select()
    .single();

  if (error) {
    console.error(
      "Failed to approve developer application:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to approve developer application."
    );
  }

  /*
   * IMPORTANT
   *
   * We DO NOT create auth.users here.
   *
   * That must be handled by a secure server-side
   * Edge Function using the Supabase service role.
   */

  return data;
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      "You must be logged in as an administrator."
    );
  }

  const { data, error } = await supabase
    .from("developer_applications")
    .update({
      status: "rejected",
      rejection_reason:
        rejectionReason?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select()
    .single();

  if (error) {
    console.error(
      "Failed to reject developer application:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to reject developer application."
    );
  }

  return data;
}


/* =========================================================
   SET APPLICATION UNDER REVIEW
========================================================= */

export async function markApplicationUnderReview(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "You must be logged in as an administrator."
    );
  }

  const { data, error } = await supabase
    .from("developer_applications")
    .update({
      status: "under_review",
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message ||
        "Unable to update application status."
    );
  }

  return data;
}


/* =========================================================
   GET ALL DEVELOPERS
========================================================= */

export async function getDevelopers() {
  const { data, error } = await supabase
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

export async function getDeveloper(developerId) {
  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  const { data, error } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("id", developerId)
    .single();

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

  return data;
}


/* =========================================================
   GET DEVELOPER BY USER ID
========================================================= */

export async function getDeveloperByUserId(userId) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const { data, error } = await supabase
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

  const allowedStatuses = [
    "pending",
    "approved",
    "rejected",
    "suspended",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid developer status: ${status}`
    );
  }

  const update = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "rejected") {
    update.rejection_reason =
      rejectionReason?.trim() || null;
  } else {
    update.rejection_reason = null;
  }

  const { data, error } = await supabase
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
    "suspended"
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
    "approved"
  );
}


/* =========================================================
   DELETE DEVELOPER PROFILE
========================================================= */

export async function deleteDeveloper(
  developerId
) {
  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  const { error } = await supabase
    .from("developer_profiles")
    .delete()
    .eq("id", developerId);

  if (error) {
    console.error(
      "Failed to delete developer:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to delete developer."
    );
  }

  return true;
}