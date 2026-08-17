import { supabase } from "../../lib/supabase";

/*
===========================================================
DEVELOPER SUBMISSION SERVICE

Handles:
- Get current developer
- Get assignment
- Upload ZIP
- Submit project
- Get current submission
- Get all submissions
- Resubmit after changes

IMPORTANT:
This file owns submission logic.
Do not duplicate submission functions in
developerService.js.
===========================================================
*/

/* =========================================================
   CURRENT DEVELOPER
========================================================= */

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
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!developer) {
    throw new Error(
      "Developer profile not found."
    );
  }

  return developer;
}

/* =========================================================
   GET ASSIGNMENT
========================================================= */

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
      opportunities (
        id,
        title,
        description,
        category,
        project_type,
        required_roles,
        required_skills,
        tech_stack,
        deliverables,
        deadline,
        application_deadline,
        budget,
        freelancer_payout,
        attachment_path,
        status
      )
    `)
    .eq("id", assignmentId)
    .eq("developer_id", developerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Assignment not found or does not belong to you."
    );
  }

  return data;
}

/* =========================================================
   UPLOAD ZIP
========================================================= */

export async function uploadProjectZip(
  file,
  assignmentId
) {
  if (!file) {
    throw new Error(
      "Project ZIP file is required."
    );
  }

  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
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

  const {
    error,
  } = await supabase.storage
    .from("project-submissions")
    .upload(
      filePath,
      file,
      {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/zip",
      }
    );

  if (error) {
    throw new Error(
      error.message ||
      "Unable to upload project ZIP."
    );
  }

  return filePath;
}

/* =========================================================
   VALIDATE GITHUB URL
========================================================= */

function validateGithubUrl(githubUrl) {
  const cleanUrl =
    githubUrl?.trim();

  if (!cleanUrl) {
    return null;
  }

  let parsedUrl;

  try {
    parsedUrl =
      new URL(cleanUrl);
  } catch {
    throw new Error(
      "Please enter a valid GitHub URL."
    );
  }

  const hostname =
    parsedUrl.hostname.toLowerCase();

  if (
    hostname !== "github.com" &&
    hostname !== "www.github.com"
  ) {
    throw new Error(
      "Please submit a valid GitHub repository URL."
    );
  }

  return cleanUrl;
}

/* =========================================================
   SUBMIT PROJECT
========================================================= */

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

  const cleanGithubUrl =
    validateGithubUrl(githubUrl);

  if (!zipPath && !cleanGithubUrl) {
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

  /*
   * IMPORTANT:
   * A completed assignment can never be submitted again.
   */

  if (assignment.completed_at) {
    throw new Error(
      "This project has already been completed."
    );
  }

  /*
   * Allow:
   * IN_PROGRESS
   * SUBMITTED
   * CHANGES_REQUESTED
   *
   * The actual submission rules below decide whether
   * another submission is allowed.
   */

  const assignmentStatus =
    String(
      assignment.status || ""
    ).toLowerCase();

  if (
    assignmentStatus &&
    ![
      "in_progress",
      "submitted",
      "changes_requested",
    ].includes(assignmentStatus)
  ) {
    throw new Error(
      "This project is not currently available for submission."
    );
  }

  /* =======================================================
     FIND LATEST SUBMISSION
  ======================================================= */

  const {
    data: existingSubmission,
    error: existingError,
  } = await supabase
    .from("project_submissions")
    .select("*")
    .eq(
      "assignment_id",
      assignmentId
    )
    .eq(
      "developer_id",
      developer.id
    )
    .order(
      "submitted_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  /*
   * A developer can submit again only when the reviewer
   * requested changes.
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

  /* =======================================================
     CREATE SUBMISSION
  ======================================================= */

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("project_submissions")
    .insert({
      assignment_id:
        assignmentId,

      developer_id:
        developer.id,

      zip_path:
        zipPath || null,

      github_url:
        cleanGithubUrl || null,

      submission_notes:
        submissionNotes?.trim() || null,

      status:
        "submitted",

      submitted_at:
        new Date().toISOString(),

      review_message:
        null,

      reviewed_at:
        null,

      reviewed_by:
        null,
    })
    .select()
    .single();

  if (submissionError) {
    throw submissionError;
  }

  /* =======================================================
     UPDATE ASSIGNMENT
  ======================================================= */

  const {
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .update({
      status:
        "submitted",

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      assignmentId
    )
    .eq(
      "developer_id",
      developer.id
    );

  if (assignmentError) {
    /*
     * Submission exists even if status update failed.
     * Log it rather than pretending submission failed.
     */
    console.error(
      "Assignment status update failed:",
      assignmentError
    );
  }

  return submission;
}

/* =========================================================
   GET MY SUBMISSION
========================================================= */

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
    .eq(
      "assignment_id",
      assignmentId
    )
    .eq(
      "developer_id",
      developer.id
    )
    .order(
      "submitted_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

/* =========================================================
   GET ALL MY SUBMISSIONS
========================================================= */

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
      project_assignments (
        id,
        opportunity_id,
        assigned_at,
        started_at,
        status,
        payment_status,
        completed_at,
        opportunities (
          id,
          title,
          category,
          status
        )
      )
    `)
    .eq(
      "developer_id",
      developer.id
    )
    .order(
      "submitted_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}