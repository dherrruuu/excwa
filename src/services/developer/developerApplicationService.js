import { supabase } from "../../lib/supabase";

/* ============================================================
   GET DEVELOPER APPLICATIONS
   ============================================================ */

export async function getDeveloperApplications() {
  const { data, error } = await supabase
    .from("developer_applications")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Failed to fetch developer applications:",
      error
    );

    throw error;
  }

  return data || [];
}

/* ============================================================
   GET SINGLE DEVELOPER APPLICATION
   ============================================================ */

export async function getDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Application ID is required."
    );
  }

  const { data, error } = await supabase
    .from("developer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (error) {
    console.error(
      "Failed to fetch developer application:",
      error
    );

    throw error;
  }

  return data;
}

/* ============================================================
   ACCEPT DEVELOPER APPLICATION
   ============================================================
   
   IMPORTANT:
   The actual account creation / developer profile creation /
   activation-link generation will happen inside the secure
   Edge Function.

   We do NOT create auth users from the browser.
   ============================================================ */

export async function acceptDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Application ID is required."
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
      "Failed to accept developer application:",
      error
    );

    throw error;
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        "Unable to accept developer application."
    );
  }

  return data;
}

/* ============================================================
   REJECT DEVELOPER APPLICATION
   ============================================================
   
   Rejection keeps the application record.

   Workflow:

   pending → rejected

   We do NOT permanently delete the application when rejecting.
   ============================================================ */

export async function rejectDeveloperApplication(
  applicationId,
  rejectionReason = null
) {
  if (!applicationId) {
    throw new Error(
      "Application ID is required."
    );
  }

  const reason =
    rejectionReason?.trim() ||
    "Application rejected.";

  const {
    data,
    error,
  } = await supabase
    .from("developer_applications")
    .update({
      status: "rejected",
      rejection_reason: reason,
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

    throw error;
  }

  return data;
}

/* ============================================================
   DELETE DEVELOPER APPLICATION
   ============================================================
   
   This is a separate manual delete action.

   It removes:
   - profile photo
   - resume
   - database record
   ============================================================ */

export async function deleteDeveloperApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Application ID is required."
    );
  }

  /* ----------------------------------------------------------
     Get application first
     ---------------------------------------------------------- */

  const {
    data: application,
    error: fetchError,
  } = await supabase
    .from("developer_applications")
    .select(
      "id, profile_photo_path, resume_path"
    )
    .eq("id", applicationId)
    .single();

  if (fetchError) {
    console.error(
      "Failed to fetch application before deletion:",
      fetchError
    );

    throw fetchError;
  }

  if (!application) {
    throw new Error(
      "Developer application not found."
    );
  }

  /* ----------------------------------------------------------
     Delete profile photo
     ---------------------------------------------------------- */

  if (application.profile_photo_path) {
    const {
      error: photoError,
    } = await supabase.storage
      .from("profile-photos")
      .remove([
        application.profile_photo_path,
      ]);

    if (photoError) {
      console.error(
        "Failed to delete profile photo:",
        photoError
      );

      throw photoError;
    }
  }

  /* ----------------------------------------------------------
     Delete resume
     ---------------------------------------------------------- */

  if (application.resume_path) {
    const {
      error: resumeError,
    } = await supabase.storage
      .from("developer-resumes")
      .remove([
        application.resume_path,
      ]);

    if (resumeError) {
      console.error(
        "Failed to delete resume:",
        resumeError
      );

      throw resumeError;
    }
  }

  /* ----------------------------------------------------------
     Delete application
     ---------------------------------------------------------- */

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

    throw deleteError;
  }

  return {
    success: true,
    application_id: applicationId,
  };
}