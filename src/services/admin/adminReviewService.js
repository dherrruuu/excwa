import { supabase } from "../../lib/supabase";

/*
=========================================================
 ADMIN REVIEW SERVICE
=========================================================

Responsibilities:

1. Load developer applications
2. Load a single application
3. Mark application as under review
4. Approve application
5. Reject application
6. Delete application

IMPORTANT:

This service DOES NOT create Supabase Auth users.

Auth user creation must happen through a secure
Supabase Edge Function using the service-role key.

Application lifecycle:

pending
   ↓
under_review
   ↓
accepted / rejected

Developer profile lifecycle:

approved / rejected / suspended

=========================================================
*/


/* =========================================================
   GET ALL APPLICATIONS
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

export async function getDeveloperApplication(
  applicationId
) {
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
   GET CURRENT ADMIN USER
========================================================= */

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(
      "You must be logged in to perform this action."
    );
  }

  return user;
}


/* =========================================================
   MARK APPLICATION UNDER REVIEW
========================================================= */

export async function markApplicationUnderReview(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("developer_applications")
    .update({
      status: "under_review",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select()
    .single();

  if (error) {
    console.error(
      "Failed to mark application under review:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to update application status."
    );
  }

  return data;
}


/* =========================================================
   APPROVE APPLICATION
========================================================= */

export async function approveDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  const user = await getCurrentUser();

  const application =
    await getDeveloperApplication(applicationId);

  /*
   * Prevent duplicate approval.
   */

  if (application.status === "accepted") {
    throw new Error(
      "This application has already been accepted."
    );
  }

  /*
   * A rejected application should not be
   * approved directly.
   */

  if (application.status === "rejected") {
    throw new Error(
      "A rejected application cannot be approved directly."
    );
  }

  /*
   * Update application only.
   *
   * Auth user + developer profile creation
   * will be handled securely by the Edge Function.
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

  return data;
}


/* =========================================================
   REJECT APPLICATION
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

  const user = await getCurrentUser();

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
   DELETE APPLICATION
========================================================= */

export async function deleteDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Developer application ID is required."
    );
  }

  const { error } = await supabase
    .from("developer_applications")
    .delete()
    .eq("id", applicationId);

  if (error) {
    console.error(
      "Failed to delete developer application:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to delete developer application."
    );
  }

  return true;
}
