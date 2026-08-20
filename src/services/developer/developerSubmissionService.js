import { supabase } from "../../lib/supabase";


/*
============================================================
DEVELOPER SUBMISSION SERVICE
============================================================

Submission history is immutable.

Every submission creates a NEW row.

Example:

submission #1
    submitted
        ↓
    changes_requested

submission #2
    submitted
        ↓
    changes_requested

submission #3
    submitted
        ↓
    approved

The previous rows are never overwritten.

The developer can resubmit only when the latest
submission has status = changes_requested.

The developer cannot submit after the project
has been completed/rejected/closed.
============================================================
*/


/* =========================================================
   CURRENT DEVELOPER
========================================================= */

async function getCurrentDeveloper() {
  const {
    data: {
      user,
    },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const {
    data: developer,
    error,
  } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      user_id,
      full_name,
      status
    `)
    .eq(
      "user_id",
      user.id
    )
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
  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      developer_id,
      opportunity_id,
      assigned_by,
      assigned_at,
      started_at,
      completed_at,
      status,
      payment_status,
      reviewer_id,
      reviewer_notes,
      updated_at,

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
    .eq(
      "id",
      assignmentId
    )
    .eq(
      "developer_id",
      developerId
    )
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
   VALIDATE GITHUB URL
========================================================= */

function validateGithubUrl(
  githubUrl
) {
  const cleanUrl =
    githubUrl?.trim();

  if (!cleanUrl) {
    throw new Error(
      "Please provide your GitHub repository URL."
    );
  }

  let parsedUrl;

  try {
    parsedUrl =
      new URL(cleanUrl);
  } catch {
    throw new Error(
      "Please enter a valid GitHub repository URL."
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

  const pathParts =
    parsedUrl.pathname
      .split("/")
      .filter(Boolean);

  if (
    pathParts.length < 2
  ) {
    throw new Error(
      "Please provide the complete GitHub repository URL."
    );
  }

  return cleanUrl;
}


/* =========================================================
   GET LATEST SUBMISSION
========================================================= */

async function getLatestSubmission(
  assignmentId,
  developerId
) {
  const {
    data,
    error,
  } = await supabase
    .from("project_submissions")
    .select(`
      id,
      assignment_id,
      developer_id,
      github_url,
      zip_path,
      submission_notes,
      status,
      submitted_at,
      review_message,
      reviewed_at,
      reviewed_by
    `)
    .eq(
      "assignment_id",
      assignmentId
    )
    .eq(
      "developer_id",
      developerId
    )
    .order("submitted_at", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}


/* =========================================================
   GET SUBMISSION HISTORY
========================================================= */

export async function getSubmissionHistory(
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
    .select(`
      id,
      assignment_id,
      developer_id,
      github_url,
      zip_path,
      submission_notes,
      status,
      submitted_at,
      review_message,
      reviewed_at,
      reviewed_by
    `)
    .eq(
      "assignment_id",
      assignmentId
    )
    .eq(
      "developer_id",
      developer.id
    )
    .order("submitted_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}


/* =========================================================
   SUBMIT / RESUBMIT PROJECT
========================================================= */

export async function submitProject({
  assignmentId,
  githubUrl,
  submissionNotes = null,
  zipPath = null,
}) {
  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
  }

  /*
   * Validate repository first.
   */
  const cleanGithubUrl =
    validateGithubUrl(
      githubUrl
    );

  /*
   * Get developer.
   */
  const developer =
    await getCurrentDeveloper();

  if (
    developer.status !==
    "approved"
  ) {
    throw new Error(
      "Your developer account is not approved."
    );
  }

  /*
   * Get assignment.
   */
  const assignment =
    await getDeveloperAssignment(
      assignmentId,
      developer.id
    );

  const assignmentStatus =
    String(
      assignment.status || ""
    ).toLowerCase();


  /* =======================================================
     PROJECT COMPLETION CHECK
  ======================================================= */

  if (
    assignment.completed_at ||
    assignmentStatus ===
      "completed"
  ) {
    throw new Error(
      "This project has already been completed. You cannot submit another revision."
    );
  }


  /* =======================================================
     PROJECT REJECTION / CLOSURE CHECK
  ======================================================= */

  if (
    assignmentStatus ===
      "rejected" ||
    assignmentStatus ===
      "closed" ||
    assignmentStatus ===
      "cancelled"
  ) {
    throw new Error(
      "This project is closed and cannot receive another submission."
    );
  }


  /* =======================================================
     VALID ASSIGNMENT STATES
  =======================================================

  New project:

      assigned
      in_progress

  Revision:

      changes_requested

  We also tolerate submitted/under_review when checking
  the database, but the latest submission must be
  changes_requested before another submission is allowed.
  ======================================================= */

  const allowedAssignmentStatuses = [
    "assigned",
    "in_progress",
    "submitted",
    "under_review",
    "changes_requested",
  ];

  if (
    !allowedAssignmentStatuses.includes(
      assignmentStatus
    )
  ) {
    throw new Error(
      `This project cannot receive a submission while its status is "${assignmentStatus}".`
    );
  }


  /* =======================================================
     GET LATEST SUBMISSION
  ======================================================= */

  const existingSubmission =
    await getLatestSubmission(
      assignmentId,
      developer.id
    );


  /* =======================================================
     DETERMINE WHETHER THIS IS A FIRST SUBMISSION
     OR A RESUBMISSION
  ======================================================= */

  let isResubmission =
    false;

  if (
    existingSubmission
  ) {
    const latestSubmissionStatus =
      String(
        existingSubmission.status ||
          ""
      ).toLowerCase();

    /*
     * ONLY changes_requested allows another submission.
     */
    if (
      latestSubmissionStatus ===
      "changes_requested"
    ) {
      isResubmission =
        true;
    } else {
      /*
       * submitted
       * under_review
       * approved
       * rejected
       * completed
       *
       * All block another submission.
       */
      throw new Error(
        "Your latest submission is still active. You can submit a new revision only after the reviewer requests changes."
      );
    }
  }


  /* =======================================================
     CREATE NEW SUBMISSION
  =======================================================

  IMPORTANT:

  We INSERT.

  We NEVER update the old submission.

  This gives us complete revision history.
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

      github_url:
        cleanGithubUrl,

      zip_path:
        zipPath || null,

      submission_notes:
        submissionNotes?.trim() ||
        null,

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
    .select(`
      id,
      assignment_id,
      developer_id,
      github_url,
      zip_path,
      submission_notes,
      status,
      submitted_at,
      review_message,
      reviewed_at,
      reviewed_by
    `)
    .single();

  if (submissionError) {
    throw submissionError;
  }


  /* =======================================================
     UPDATE ASSIGNMENT
  ======================================================= */

  const {
    data: updatedAssignment,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .update({
      status:
        "submitted",

      updated_at:
        new Date().toISOString(),

      /*
       * If this was previously marked completed
       * accidentally, clear completed_at.
       */
      completed_at:
        null,
    })
    .eq(
      "id",
      assignmentId
    )
    .eq(
      "developer_id",
      developer.id
    )
    .select(`
      id,
      opportunity_id,
      developer_id,
      status,
      assigned_at,
      started_at,
      completed_at,
      updated_at
    `)
    .single();

  if (assignmentError) {
    /*
     * The submission was inserted but assignment update
     * failed. We do NOT silently continue.
     */
    console.error(
      "Assignment status update failed:",
      assignmentError
    );

    throw assignmentError;
  }


  /* =======================================================
     UPDATE OPPORTUNITY STATUS
  ======================================================= */

  if (
    assignment.opportunity_id
  ) {
    const {
      error:
        opportunityError,
    } = await supabase
      .from("opportunities")
      .update({
        status:
          "submitted",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        assignment.opportunity_id
      );

    if (opportunityError) {
      console.error(
        "Opportunity status update failed:",
        opportunityError
      );

      throw opportunityError;
    }
  }


  /* =======================================================
     RETURN
  ======================================================= */

  return {
    ...submission,

    isResubmission,

    previousSubmissionId:
      isResubmission
        ? existingSubmission.id
        : null,

    assignment:
      updatedAssignment,
  };
}


/* =========================================================
   GET MY LATEST SUBMISSION
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

  return getLatestSubmission(
    assignmentId,
    developer.id
  );
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
      id,
      assignment_id,
      developer_id,
      github_url,
      zip_path,
      submission_notes,
      status,
      submitted_at,
      review_message,
      reviewed_at,
      reviewed_by,

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
          project_type,
          status
        )
      )
    `)
    .eq(
      "developer_id",
      developer.id
    )
    .order("submitted_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}


/* =========================================================
   GET CURRENT ASSIGNMENT
========================================================= */

export async function getMyCurrentAssignment() {
  const developer =
    await getCurrentDeveloper();

  /*
   * IMPORTANT:
   *
   * These are the only states that make a developer busy.
   *
   * changes_requested stays here intentionally.
   *
   * The developer must remain assigned while fixing
   * requested changes.
   */
  const activeStatuses = [
    "assigned",
    "in_progress",
    "submitted",
    "under_review",
    "changes_requested",
  ];

  const {
    data: assignments,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      developer_id,
      opportunity_id,
      assigned_by,
      assigned_at,
      started_at,
      completed_at,
      status,
      payment_status,
      reviewer_id,
      reviewer_notes,
      updated_at,

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
        status,
        created_at
      )
    `)
    .eq(
      "developer_id",
      developer.id
    )
    .in(
      "status",
      activeStatuses
    )
    .is(
      "completed_at",
      null
    )
    .order("assigned_at", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    throw error;
  }

  const assignment =
    assignments?.[0] ||
    null;

  if (!assignment) {
    return null;
  }


  /* =======================================================
     LATEST SUBMISSION
  ======================================================= */

  const latestSubmission =
    await getLatestSubmission(
      assignment.id,
      developer.id
    );


  /* =======================================================
     RETURN
  ======================================================= */

  return {
    ...assignment,

    opportunity:
      assignment.opportunities ||
      null,

    /*
     * Compatibility with existing components.
     */
    opportunities:
      assignment.opportunities ||
      null,

    submission:
      latestSubmission,

    project_submissions:
      latestSubmission
        ? [latestSubmission]
        : [],
  };
}


/* =========================================================
   EXPORT ALIASES
========================================================= */

export {
  getLatestSubmission,
};