import { supabase } from "../../lib/supabase";

/*
============================================================
ADMIN WORK REVIEW SERVICE
============================================================

Responsibilities:

- Get all project assignments
- Get latest submission for each assignment
- Get project information
- Get developer information
- Keep assignment + submission status synchronized
- Support developer resubmission after changes_requested

IMPORTANT STATUS MODEL

Assignment status:

assigned
in_progress
submitted
under_review
changes_requested
approved
completed
rejected

Submission status:

submitted
under_review
changes_requested
approved
rejected

The assignment represents the overall project lifecycle.

The submission represents one specific submitted version.

Previous submissions are NEVER overwritten.
============================================================
*/


/* =========================================================
   STATUS CONSTANTS
========================================================= */

export const ASSIGNMENT_STATUSES = [
  "assigned",
  "in_progress",
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "completed",
  "rejected",
];

export const SUBMISSION_STATUSES = [
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "rejected",
];


/* =========================================================
   ADMIN AUTH
========================================================= */

async function requireAdmin() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
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
    throw profileError;
  }

  if (!profile) {
    throw new Error(
      "Administrator profile was not found."
    );
  }

  if (profile.role !== "admin") {
    throw new Error(
      "Administrator access required."
    );
  }

  return user;
}


/* =========================================================
   GET ALL WORK REVIEWS
========================================================= */

export async function getAdminWorkReviews() {
  await requireAdmin();

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      developer_id,
      status,
      assigned_by,
      assigned_at,
      started_at,
      completed_at,
      payment_status,
      reviewer_id,
      reviewer_notes,
      updated_at
    `)
    .order("updated_at", {
      ascending: false,
    });

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignments?.length) {
    return [];
  }

  const assignmentIds = assignments
    .map((item) => item.id)
    .filter(Boolean);

  const opportunityIds = [
    ...new Set(
      assignments
        .map((item) => item.opportunity_id)
        .filter(Boolean)
    ),
  ];

  const developerIds = [
    ...new Set(
      assignments
        .map((item) => item.developer_id)
        .filter(Boolean)
    ),
  ];

  const [
    opportunityResponse,
    developerResponse,
    submissionResponse,
  ] = await Promise.all([
    opportunityIds.length
      ? supabase
          .from("opportunities")
          .select(`
            id,
            title,
            description,
            category,
            project_type,
            status,
            deadline,
            application_deadline,
            budget,
            freelancer_payout
          `)
          .in("id", opportunityIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    developerIds.length
      ? supabase
          .from("developer_profiles")
          .select(`
            id,
            user_id,
            full_name,
            primary_roles,
            profile_photo_url,
            github_url,
            linkedin_url
          `)
          .in("id", developerIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    assignmentIds.length
      ? supabase
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
          .in("assignment_id", assignmentIds)
          .order("submitted_at", {
            ascending: false,
          })
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (opportunityResponse.error) {
    throw opportunityResponse.error;
  }

  if (developerResponse.error) {
    throw developerResponse.error;
  }

  if (submissionResponse.error) {
    throw submissionResponse.error;
  }

  const opportunityMap = new Map(
    (opportunityResponse.data || []).map(
      (item) => [item.id, item]
    )
  );

  const developerMap = new Map(
    (developerResponse.data || []).map(
      (item) => [item.id, item]
    )
  );

  /*
   * Because submissions are ordered newest first,
   * the first submission encountered for each assignment
   * is the latest submission.
   */
  const latestSubmissionMap = new Map();

  for (const submission of
    submissionResponse.data || []) {
    if (
      !latestSubmissionMap.has(
        submission.assignment_id
      )
    ) {
      latestSubmissionMap.set(
        submission.assignment_id,
        submission
      );
    }
  }

  return assignments.map(
    (assignment) => {
      const opportunity =
        opportunityMap.get(
          assignment.opportunity_id
        ) || null;

      const developer =
        developerMap.get(
          assignment.developer_id
        ) || null;

      const submission =
        latestSubmissionMap.get(
          assignment.id
        ) || null;

      return {
        ...assignment,

        projectTitle:
          opportunity?.title ||
          "Unknown Project",

        projectDescription:
          opportunity?.description ||
          "",

        projectCategory:
          opportunity?.category ||
          "",

        projectType:
          opportunity?.project_type ||
          "",

        opportunityStatus:
          opportunity?.status ||
          null,

        deadline:
          opportunity?.deadline ||
          null,

        developerName:
          developer?.full_name ||
          "Unknown Developer",

        developerUserId:
          developer?.user_id ||
          null,

        developerRoles:
          developer?.primary_roles ||
          [],

        developerPhoto:
          developer?.profile_photo_url ||
          null,

        submission,

        submissionId:
          submission?.id ||
          null,

        githubUrl:
          submission?.github_url ||
          "",

        zipPath:
          submission?.zip_path ||
          null,

        submissionNotes:
          submission?.submission_notes ||
          "",

        submissionStatus:
          submission?.status ||
          null,

        submittedAt:
          submission?.submitted_at ||
          null,

        reviewMessage:
          submission?.review_message ||
          "",

        reviewedAt:
          submission?.reviewed_at ||
          null,

        reviewedBy:
          submission?.reviewed_by ||
          null,

        hasSubmission:
          Boolean(submission),
      };
    }
  );
}


/* =========================================================
   GET SINGLE WORK REVIEW
========================================================= */

export async function getAdminWorkReview(
  assignmentId
) {
  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
  }

  await requireAdmin();

  const reviews =
    await getAdminWorkReviews();

  return (
    reviews.find(
      (review) =>
        review.id === assignmentId
    ) || null
  );
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

  await requireAdmin();

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
    .order("submitted_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}


/* =========================================================
   UPDATE ASSIGNMENT STATUS
=========================================================

This function should be used for project lifecycle changes.

IMPORTANT:

For review-related statuses, use
reviewSubmission() instead.

That prevents the assignment and submission
from getting out of sync.
========================================================= */

export async function updateAssignmentStatus(
  assignmentId,
  status
) {
  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
  }

  if (
    !ASSIGNMENT_STATUSES.includes(status)
  ) {
    throw new Error(
      `Invalid assignment status: ${status}`
    );
  }

  await requireAdmin();

  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      developer_id,
      status,
      completed_at
    `)
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    throw new Error(
      "Assignment not found."
    );
  }

  const now =
    new Date().toISOString();

  const updatePayload = {
    status,
    updated_at: now,
  };

  /*
   * Completed means the developer is no longer busy.
   */
  if (status === "completed") {
    updatePayload.completed_at = now;
  }

  /*
   * If moving away from completed,
   * clear completed_at.
   */
  if (
    status !== "completed" &&
    assignment.completed_at
  ) {
    updatePayload.completed_at = null;
  }

  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .update(updatePayload)
    .eq("id", assignmentId)
    .select(`
      id,
      opportunity_id,
      developer_id,
      status,
      assigned_at,
      started_at,
      completed_at,
      payment_status,
      reviewer_id,
      reviewer_notes,
      updated_at
    `)
    .single();

  if (error) {
    throw error;
  }

  /*
   * Keep opportunity status synchronized.
   */
  await syncOpportunityStatus(
    data.opportunity_id,
    status
  );

  return data;
}


/* =========================================================
   REVIEW SUBMISSION
=========================================================

This is the IMPORTANT function.

Reviewer actions:

under_review
changes_requested
approved
rejected

The latest submission is updated.

The assignment is updated to the corresponding
project lifecycle status.

Previous submissions remain untouched.
========================================================= */

export async function reviewSubmission({
  assignmentId,
  submissionId,
  status,
  reviewMessage = "",
}) {
  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
  }

  if (!submissionId) {
    throw new Error(
      "Submission ID is required."
    );
  }

  const allowedStatuses = [
    "under_review",
    "changes_requested",
    "approved",
    "rejected",
  ];

  if (
    !allowedStatuses.includes(status)
  ) {
    throw new Error(
      `Invalid review status: ${status}`
    );
  }

  const user =
    await requireAdmin();

  /*
   * Load assignment.
   */
  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      developer_id,
      status,
      completed_at
    `)
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    throw new Error(
      "Assignment not found."
    );
  }

  /*
   * Load submission.
   */
  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("project_submissions")
    .select(`
      id,
      assignment_id,
      developer_id,
      status,
      submitted_at
    `)
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new Error(
      "Submission not found."
    );
  }

  if (
    submission.assignment_id !==
    assignmentId
  ) {
    throw new Error(
      "This submission does not belong to the selected assignment."
    );
  }

  if (
    submission.developer_id !==
    assignment.developer_id
  ) {
    throw new Error(
      "This submission does not belong to the assigned developer."
    );
  }

  /*
   * A completed assignment cannot be reviewed again.
   */
  if (
    assignment.status ===
      "completed" ||
    assignment.completed_at
  ) {
    throw new Error(
      "This project has already been completed."
    );
  }

  const now =
    new Date().toISOString();

  /*
   * Update the specific submission.
   */
  const {
    data: updatedSubmission,
    error: updateSubmissionError,
  } = await supabase
    .from("project_submissions")
    .update({
      status,

      review_message:
        reviewMessage?.trim() ||
        null,

      reviewed_at: now,

      reviewed_by: user.id,
    })
    .eq("id", submissionId)
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

  if (updateSubmissionError) {
    throw updateSubmissionError;
  }

  /*
   * Map review status → assignment status.
   */
  let assignmentStatus;

  switch (status) {
    case "under_review":
      assignmentStatus =
        "under_review";
      break;

    case "changes_requested":
      /*
       * VERY IMPORTANT:
       *
       * Developer remains assigned.
       *
       * They are allowed to submit another
       * submission while the assignment is
       * changes_requested.
       */
      assignmentStatus =
        "changes_requested";
      break;

    case "approved":
      /*
       * Approved means the submitted work
       * passed review.
       *
       * We mark the assignment completed
       * because this is the point at which
       * the developer becomes available again.
       */
      assignmentStatus =
        "completed";
      break;

    case "rejected":
      assignmentStatus =
        "rejected";
      break;

    default:
      throw new Error(
        "Unsupported review status."
      );
  }

  const assignmentPayload = {
    status: assignmentStatus,
    updated_at: now,
  };

  if (
    assignmentStatus === "completed"
  ) {
    assignmentPayload.completed_at =
      now;
  }

  if (
    assignmentStatus !== "completed" &&
    assignment.completed_at
  ) {
    assignmentPayload.completed_at =
      null;
  }

  /*
   * Update assignment.
   */
  const {
    data: updatedAssignment,
    error: updateAssignmentError,
  } = await supabase
    .from("project_assignments")
    .update(assignmentPayload)
    .eq("id", assignmentId)
    .select(`
      id,
      opportunity_id,
      developer_id,
      status,
      assigned_at,
      started_at,
      completed_at,
      payment_status,
      reviewer_id,
      reviewer_notes,
      updated_at
    `)
    .single();

  if (updateAssignmentError) {
    throw updateAssignmentError;
  }

  /*
   * Synchronize opportunity.
   */
  await syncOpportunityStatus(
    assignment.opportunity_id,
    assignmentStatus
  );

  return {
    assignment:
      updatedAssignment,

    submission:
      updatedSubmission,
  };
}


/* =========================================================
   UPDATE SUBMISSION STATUS
=========================================================

Backward-compatible helper.

New code should prefer reviewSubmission().
========================================================= */

export async function updateSubmissionStatus(
  submissionId,
  status,
  reviewMessage = null
) {
  if (!submissionId) {
    throw new Error(
      "Submission ID is required."
    );
  }

  await requireAdmin();

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("project_submissions")
    .select(`
      id,
      assignment_id
    `)
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new Error(
      "Submission not found."
    );
  }

  return reviewSubmission({
    assignmentId:
      submission.assignment_id,

    submissionId,

    status,

    reviewMessage,
  });
}


/* =========================================================
   SYNCHRONIZE OPPORTUNITY STATUS
========================================================= */

async function syncOpportunityStatus(
  opportunityId,
  assignmentStatus
) {
  if (!opportunityId) {
    return null;
  }

  let opportunityStatus =
    null;

  switch (assignmentStatus) {
    case "assigned":
      opportunityStatus =
        "assigned";
      break;

    case "in_progress":
      opportunityStatus =
        "in_progress";
      break;

    case "submitted":
      opportunityStatus =
        "submitted";
      break;

    case "under_review":
      opportunityStatus =
        "under_review";
      break;

    case "changes_requested":
      opportunityStatus =
        "changes_requested";
      break;

    case "approved":
      opportunityStatus =
        "approved";
      break;

    case "completed":
      opportunityStatus =
        "completed";
      break;

    case "rejected":
      opportunityStatus =
        "closed";
      break;

    default:
      return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from("opportunities")
    .update({
      status:
        opportunityStatus,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", opportunityId)
    .select(`
      id,
      status
    `)
    .maybeSingle();

  if (error) {
    /*
     * Do not hide the synchronization problem.
     *
     * Assignment/submission state should never silently
     * succeed while the opportunity remains stale.
     */
    throw error;
  }

  return data || null;
}