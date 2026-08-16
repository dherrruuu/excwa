import { supabase } from "../../lib/supabase";

/*
=========================================================
DEVELOPER SUBMISSION SERVICE

Handles:
- Submit project
- Upload ZIP
- GitHub submission
- Submission notes
- Get submission
- Resubmit after changes
=========================================================
*/

/* =======================================================
   CURRENT DEVELOPER
======================================================= */

async function getCurrentDeveloper() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const {
    data: developer,
    error,
  } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return developer;
}

/* =======================================================
   GET ASSIGNMENT
======================================================= */

async function getDeveloperAssignment(
  assignmentId,
  developerId
) {
  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      *,
      opportunity:opportunities(*)
    `)
    .eq("id", assignmentId)
    .eq("developer_id", developerId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =======================================================
   UPLOAD ZIP
======================================================= */

export async function uploadProjectZip(
  file,
  assignmentId
) {
  if (!file) {
    throw new Error("Project ZIP file is required.");
  }

  if (!assignmentId) {
    throw new Error("Assignment ID is required.");
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  if (extension !== "zip") {
    throw new Error(
      "Only ZIP files are allowed."
    );
  }

  if (file.size > 100 * 1024 * 1024) {
    throw new Error(
      "Project ZIP must be less than 100MB."
    );
  }

  const developer =
    await getCurrentDeveloper();

  const fileName =
    `${crypto.randomUUID()}.zip`;

  const filePath =
    `${developer.id}/${assignmentId}/${fileName}`;

  /*
   * Bucket name can be changed later if your
   * Supabase storage bucket uses another name.
   */

  const {
    error,
  } = await supabase.storage
    .from("project-submissions")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/zip",
    });

  if (error) {
    throw new Error(
      error.message ||
      "Unable to upload project ZIP."
    );
  }

  return filePath;
}

/* =======================================================
   SUBMIT PROJECT
======================================================= */

export async function submitProject({
  assignmentId,
  zipPath = null,
  githubUrl = null,
  submissionNotes = null,
}) {
  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
  }

  if (!zipPath && !githubUrl) {
    throw new Error(
      "Please provide a project ZIP or GitHub URL."
    );
  }

  const developer =
    await getCurrentDeveloper();

  if (developer.status !== "approved") {
    throw new Error(
      "Your developer account is not approved."
    );
  }

  const assignment =
    await getDeveloperAssignment(
      assignmentId,
      developer.id
    );

  if (
    assignment.status !== "IN_PROGRESS" &&
    assignment.status !== "in_progress"
  ) {
    throw new Error(
      "This project is not currently in progress."
    );
  }

  /* -------------------------------------------------------
     Check existing submission
  ------------------------------------------------------- */

  const {
    data: existingSubmission,
    error: existingError,
  } = await supabase
    .from("project_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("developer_id", developer.id)
    .order("submitted_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  /*
   * Allow a new submission if previous review requested
   * changes. Otherwise prevent accidental duplicate submits.
   */

  if (
    existingSubmission &&
    existingSubmission.status !==
      "changes_requested"
  ) {
    throw new Error(
      "A submission already exists for this project."
    );
  }

  /* -------------------------------------------------------
     Create submission
  ------------------------------------------------------- */

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("project_submissions")
    .insert({
      assignment_id: assignmentId,
      developer_id: developer.id,
      zip_path: zipPath || null,
      github_url:
        githubUrl?.trim() || null,
      submission_notes:
        submissionNotes?.trim() || null,
      status: "submitted",
    })
    .select()
    .single();

  if (submissionError) {
    throw submissionError;
  }

  /* -------------------------------------------------------
     Update assignment
  ------------------------------------------------------- */

  const {
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .update({
      status: "SUBMITTED",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("developer_id", developer.id);

  if (assignmentError) {
    console.error(
      "Assignment status update failed:",
      assignmentError
    );
  }

  return submission;
}

/* =======================================================
   GET MY SUBMISSION
======================================================= */

export async function getMySubmission(
  assignmentId
) {
  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
  }

  const developer =
    await getCurrentDeveloper();

  const {
    data,
    error,
  } = await supabase
    .from("project_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("developer_id", developer.id)
    .order("submitted_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* =======================================================
   GET ALL MY SUBMISSIONS
======================================================= */

export async function getMySubmissions() {
  const developer =
    await getCurrentDeveloper();

  const {
    data,
    error,
  } = await supabase
    .from("project_submissions")
    .select(`
      *,
      assignment:project_assignments(
        *,
        opportunity:opportunities(*)
      )
    `)
    .eq("developer_id", developer.id)
    .order("submitted_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}