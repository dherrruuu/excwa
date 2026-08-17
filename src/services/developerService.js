import { supabase } from "../lib/supabase";

import {
  submitProject,
  getMySubmission,
  getMySubmissions as getDeveloperSubmissions,
  uploadProjectZip,
} from "./developer/developerSubmissionService";

/*
============================================================
EXCWA DEVELOPER SERVICE
============================================================

Responsibilities:
- Authentication
- Developer profile
- Skills
- Opportunities
- Applications
- Current assignments
- Developer workload
- Admin developer management
- Admin opportunity management
- Submission/review management

IMPORTANT
------------------------------------------------------------
developer_profiles DOES NOT contain an email column.

Developer email comes from:
    auth.users.email

Developer information comes from:
    developer_profiles

Therefore we NEVER request:

    developer_profiles.email
============================================================
*/


/* ==========================================================
   ASSIGNMENT STATUS DEFINITIONS
========================================================== */

/*
 * IMPORTANT:
 *
 * An assignment is considered ACTIVE only when its status is:
 *
 *     assigned
 *     in_progress
 *
 * A completed assignment must NEVER appear as the developer's
 * current project, even if completed_at is accidentally NULL.
 *
 * This protects the frontend from stale/inconsistent database
 * data.
 */

const ACTIVE_ASSIGNMENT_STATUSES = [
  "assigned",
  "in_progress",
];

const COMPLETED_ASSIGNMENT_STATUSES = [
  "completed",
];


/* ==========================================================
   AUTH HELPERS
========================================================== */

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user;
}


/* ==========================================================
   CURRENT DEVELOPER PROFILE
========================================================== */

async function getCurrentDeveloperProfile() {
  const user = await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      user_id,
      full_name,
      phone,
      city,
      github_url,
      linkedin_url,
      portfolio_url,
      status,
      rejection_reason,
      primary_roles,
      created_at,
      updated_at
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Developer profile query failed:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Developer profile not found for the current user."
    );
  }

  return {
    ...data,
    email: user.email || null,
  };
}


/* ==========================================================
   ROLE HELPERS
========================================================== */

async function getCurrentUserRole() {
  const user = await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.role || null;
}


async function requireAdmin() {
  const role = await getCurrentUserRole();

  if (role !== "admin") {
    throw new Error(
      "You are not authorized to perform this action."
    );
  }
}


async function requireAdminOrReviewer() {
  const role = await getCurrentUserRole();

  if (!["admin", "reviewer"].includes(role)) {
    throw new Error(
      "You are not authorized to perform this action."
    );
  }

  return role;
}


/* ==========================================================
   REGISTRATION
========================================================== */

export async function registerDeveloper({
  full_name,
  email,
  password,
}) {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
      },
    },
  });

  if (authError) {
    throw authError;
  }

  return {
    user: authData?.user || null,
    emailConfirmationRequired: !authData?.session,
  };
}


/* ==========================================================
   SKILLS
========================================================== */

export async function getAllSkills() {
  const {
    data,
    error,
  } = await supabase
    .from("skills")
    .select("*")
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data || [];
}


/* ==========================================================
   ACTIVE ASSIGNMENT CHECK
========================================================== */

export async function hasActiveAssignment() {
  const developer =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      status,
      completed_at,
      assigned_at
    `)
    .eq(
      "developer_id",
      developer.id
    )
    .in(
      "status",
      ACTIVE_ASSIGNMENT_STATUSES
    )
    .is(
      "completed_at",
      null
    )
    .order(
      "assigned_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}


/* ==========================================================
   OPEN OPPORTUNITIES
========================================================== */

export async function getOpenOpportunities() {
  const developer =
    await getCurrentDeveloperProfile();

  /*
   * Only approved developers can see opportunities.
   */

  if (developer.status !== "approved") {
    return [];
  }

  /*
   * A developer can only have one active project.
   *
   * IMPORTANT:
   * We check STATUS as well as completed_at.
   *
   * This prevents a broken/stale completed assignment from
   * blocking or appearing as an active project.
   */

  const {
    data: activeAssignment,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      status,
      completed_at
    `)
    .eq(
      "developer_id",
      developer.id
    )
    .in(
      "status",
      ACTIVE_ASSIGNMENT_STATUSES
    )
    .is(
      "completed_at",
      null
    )
    .limit(1)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  /*
   * Developer already has an active project.
   */

  if (activeAssignment) {
    return [];
  }

  /*
   * Developer is available.
   */

  const {
    data,
    error,
  } = await supabase
    .from("opportunities")
    .select(`
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
    `)
    .eq(
      "status",
      "open"
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "Open opportunities query failed:",
      error
    );

    throw error;
  }

  return data || [];
}


/* ==========================================================
   APPLY TO OPPORTUNITY
========================================================== */

export async function applyToOpportunity({
  opportunityId,
  coverMessage = "",
  estimatedDays = null,
}) {
  if (!opportunityId) {
    throw new Error(
      "Opportunity ID is required."
    );
  }

  const developer =
    await getCurrentDeveloperProfile();

  /*
   * Developer must be approved.
   */

  if (developer.status !== "approved") {
    throw new Error(
      "Your developer account is not approved."
    );
  }

  /*
   * The database RPC handles:
   *
   * - authentication
   * - developer verification
   * - approval check
   * - active assignment check
   * - opportunity locking
   * - opportunity status check
   * - application deadline
   * - duplicate application
   * - application creation
   * - assignment creation
   * - opportunity assignment
   */

  const {
    data,
    error,
  } = await supabase.rpc(
    "apply_to_opportunity",
    {
      p_opportunity_id: opportunityId,

      p_cover_message:
        coverMessage?.trim() || null,

      p_estimated_days:
        estimatedDays !== null &&
        estimatedDays !== undefined &&
        estimatedDays !== ""
          ? Number(estimatedDays)
          : null,
    }
  );

  if (error) {
    console.error(
      "apply_to_opportunity RPC failed:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Application could not be created."
    );
  }

  /*
   * Handle RPC failure response.
   */

  if (data.success === false) {
    throw new Error(
      data.message ||
        "Unable to apply for this opportunity."
    );
  }

  /*
   * APPLICATION
   */

  let application =
    data.application || null;

  if (
    !application &&
    data.application_id
  ) {
    const {
      data: applicationData,
      error: applicationError,
    } = await supabase
      .from("opportunity_applications")
      .select(`
        id,
        opportunity_id,
        developer_id,
        cover_message,
        estimated_days,
        status,
        applied_at
      `)
      .eq(
        "id",
        data.application_id
      )
      .maybeSingle();

    if (applicationError) {
      throw applicationError;
    }

    application =
      applicationData || null;
  }

  /*
   * ASSIGNMENT
   */

  let assignment =
    data.assignment || null;

  if (
    !assignment &&
    data.assignment_id
  ) {
    const {
      data: assignmentData,
      error: assignmentError,
    } = await supabase
      .from("project_assignments")
      .select("*")
      .eq(
        "id",
        data.assignment_id
      )
      .maybeSingle();

    if (assignmentError) {
      throw assignmentError;
    }

    assignment =
      assignmentData || null;
  }

  return {
    ...data,

    success:
      data.success !== false,

    application,

    assignment,
  };
}


/* ==========================================================
   MY APPLICATIONS
========================================================== */

export async function getMyApplications() {
  const developer =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      id,
      opportunity_id,
      developer_id,
      cover_message,
      estimated_days,
      status,
      applied_at,

      opportunities (
        id,
        title,
        category,
        project_type,
        tech_stack,
        budget,
        freelancer_payout,
        deadline,
        application_deadline,
        status
      )
    `)
    .eq(
      "developer_id",
      developer.id
    )
    .order(
      "applied_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "Applications query failed:",
      error
    );

    throw error;
  }

  return data || [];
}


/* ==========================================================
   CURRENT ASSIGNMENT
========================================================== */

export async function getMyCurrentAssignment() {
  const developer =
    await getCurrentDeveloperProfile();

  /*
   * --------------------------------------------------------
   * STEP 1
   * Find ONLY an ACTIVE assignment.
   *
   * IMPORTANT FIX:
   *
   * Previously this function only checked:
   *
   *     completed_at IS NULL
   *
   * That allowed an assignment with:
   *
   *     status = "completed"
   *     completed_at = NULL
   *
   * to appear as the current project.
   *
   * We now explicitly require:
   *
   *     status IN ("assigned", "in_progress")
   *
   * AND:
   *
   *     completed_at IS NULL
   * --------------------------------------------------------
   */

  const {
    data: assignment,
    error: assignmentError,
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
      updated_at
    `)
    .eq(
      "developer_id",
      developer.id
    )
    .in(
      "status",
      ACTIVE_ASSIGNMENT_STATUSES
    )
    .is(
      "completed_at",
      null
    )
    .order(
      "assigned_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (assignmentError) {
    console.error(
      "getMyCurrentAssignment - assignment query failed:",
      assignmentError
    );

    throw assignmentError;
  }

  /*
   * No active assignment.
   */

  if (!assignment) {
    console.log(
      "getMyCurrentAssignment - NO ACTIVE ASSIGNMENT",
      {
        developerId: developer.id,
      }
    );

    return null;
  }

  console.log(
    "getMyCurrentAssignment - ACTIVE ASSIGNMENT FOUND:",
    assignment
  );

  /* ========================================================
     STEP 2
     GET OPPORTUNITY
  ======================================================== */

  let opportunity = null;

  if (assignment.opportunity_id) {
    const {
      data,
      error,
    } = await supabase
      .from("opportunities")
      .select(`
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
      `)
      .eq(
        "id",
        assignment.opportunity_id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "getMyCurrentAssignment - opportunity query failed:",
        error
      );

      throw error;
    }

    opportunity = data || null;
  }

  /* ========================================================
     STEP 3
     GET LATEST SUBMISSION
  ======================================================== */

  const {
    data: submissions,
    error: submissionError,
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
      assignment.id
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
    .limit(1);

  if (submissionError) {
    console.error(
      "getMyCurrentAssignment - submission query failed:",
      submissionError
    );

    throw submissionError;
  }

  const submission =
    submissions?.[0] || null;

  /* ========================================================
     FINAL ASSIGNMENT OBJECT
  ======================================================== */

  return {
    ...assignment,

    opportunity,

    /*
     * Compatibility for components using either:
     *
     * assignment.opportunity
     *
     * or:
     *
     * assignment.opportunities
     */

    opportunities:
      opportunity || null,

    submission,

    project_submissions:
      submission
        ? [submission]
        : [],
  };
}


/* ==========================================================
   SUBMISSION COMPATIBILITY
========================================================== */

export async function submitWork({
  assignmentId,
  githubUrl,
  notes,
  zipPath = null,
}) {
  if (!assignmentId) {
    throw new Error(
      "Assignment ID is required."
    );
  }

  return submitProject({
    assignmentId,
    githubUrl,
    submissionNotes: notes,
    zipPath,
  });
}


export { getMySubmission };


export async function getMySubmissions() {
  return getDeveloperSubmissions();
}


export { uploadProjectZip };


/* ==========================================================
   ADMIN: GET DEVELOPERS
========================================================== */

export async function getAllDevelopers() {
  await requireAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      user_id,
      full_name,
      phone,
      city,
      github_url,
      linkedin_url,
      portfolio_url,
      status,
      rejection_reason,
      primary_roles,
      created_at,
      updated_at,

      developer_skills (
        skills (
          id,
          name
        )
      )
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/* ==========================================================
   ADMIN: DEVELOPER WORKLOAD
========================================================== */

export async function getDeveloperWorkload(
  developerId
) {
  await requireAdmin();

  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  const {
    data: developer,
    error: developerError,
  } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      user_id,
      full_name,
      phone,
      city,
      github_url,
      linkedin_url,
      portfolio_url,
      status,
      rejection_reason,
      primary_roles,

      developer_skills (
        skills (
          id,
          name
        )
      )
    `)
    .eq(
      "id",
      developerId
    )
    .maybeSingle();

  if (developerError) {
    throw developerError;
  }

  if (!developer) {
    throw new Error(
      "Developer not found."
    );
  }

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(`
      *,

      opportunities (
        id,
        title,
        category,
        status,
        deadline,
        freelancer_payout
      ),

      project_submissions (
        id,
        status,
        submitted_at,
        reviewed_at,
        review_message
      )
    `)
    .eq(
      "developer_id",
      developerId
    )
    .order(
      "assigned_at",
      {
        ascending: false,
      }
    );

  if (assignmentError) {
    throw assignmentError;
  }

  const allAssignments =
    assignments || [];

  /*
   * ACTIVE:
   *
   * status = assigned
   * OR
   * status = in_progress
   *
   * AND completed_at is NULL
   */

  const currentProjects =
    allAssignments.filter(
      (assignment) =>
        ACTIVE_ASSIGNMENT_STATUSES.includes(
          assignment.status
        ) &&
        !assignment.completed_at
    );

  /*
   * COMPLETED:
   *
   * Explicit completed status OR completed_at exists.
   */

  const completedProjects =
    allAssignments.filter(
      (assignment) =>
        COMPLETED_ASSIGNMENT_STATUSES.includes(
          assignment.status
        ) ||
        Boolean(
          assignment.completed_at
        )
    );

  return {
    developer,

    totalProjects:
      allAssignments.length,

    completedProjects:
      completedProjects.length,

    currentProjects:
      currentProjects.length,

    isBusy:
      currentProjects.length > 0,

    isAvailable:
      currentProjects.length === 0,

    hasWorked:
      allAssignments.length > 0,

    assignments:
      allAssignments,
  };
}


/* ==========================================================
   ADMIN: ALL DEVELOPER WORKLOADS
========================================================== */

export async function getAllDeveloperWorkloads() {
  await requireAdmin();

  const developers =
    await getAllDevelopers();

  const {
    data: assignments,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      developer_id,
      opportunity_id,
      status,
      assigned_at,
      started_at,
      completed_at,
      payment_status,

      opportunities (
        id,
        title,
        category,
        status
      )
    `)
    .order(
      "assigned_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  const assignmentList =
    assignments || [];

  return developers.map(
    (developer) => {
      const developerAssignments =
        assignmentList.filter(
          (assignment) =>
            assignment.developer_id ===
            developer.id
        );

      const currentProjects =
        developerAssignments.filter(
          (assignment) =>
            ACTIVE_ASSIGNMENT_STATUSES.includes(
              assignment.status
            ) &&
            !assignment.completed_at
        );

      const completedProjects =
        developerAssignments.filter(
          (assignment) =>
            COMPLETED_ASSIGNMENT_STATUSES.includes(
              assignment.status
            ) ||
            Boolean(
              assignment.completed_at
            )
        );

      return {
        ...developer,

        totalProjects:
          developerAssignments.length,

        completedProjects:
          completedProjects.length,

        currentProjects:
          currentProjects.length,

        isBusy:
          currentProjects.length > 0,

        isAvailable:
          currentProjects.length === 0,

        hasWorked:
          developerAssignments.length > 0,

        assignments:
          developerAssignments,
      };
    }
  );
}


/* ==========================================================
   ADMIN: UPDATE DEVELOPER STATUS
========================================================== */

export async function updateDeveloperStatus(
  devProfileId,
  status,
  rejectionReason = null
) {
  await requireAdmin();

  const allowedStatuses = [
    "pending",
    "approved",
    "rejected",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Invalid developer status."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .update({
      status,

      rejection_reason:
        status === "rejected"
          ? rejectionReason?.trim() || null
          : null,
    })
    .eq(
      "id",
      devProfileId
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ==========================================================
   ADMIN: REMOVE UNUSED DEVELOPER
========================================================== */

export async function removeUnusedDeveloper(
  developerId
) {
  await requireAdmin();

  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  /*
   * Check project history.
   */

  const {
    count,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "developer_id",
      developerId
    );

  if (assignmentError) {
    throw assignmentError;
  }

  if ((count || 0) > 0) {
    throw new Error(
      "This developer has project history and cannot be removed from this section."
    );
  }

  /*
   * Check application history.
   */

  const {
    count: applicationCount,
    error: applicationError,
  } = await supabase
    .from("opportunity_applications")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "developer_id",
      developerId
    );

  if (applicationError) {
    throw applicationError;
  }

  if ((applicationCount || 0) > 0) {
    throw new Error(
      "This developer has application history and cannot be removed from this section."
    );
  }

  /*
   * Delete developer skills first.
   */

  const {
    error: skillsError,
  } = await supabase
    .from("developer_skills")
    .delete()
    .eq(
      "developer_id",
      developerId
    );

  if (skillsError) {
    throw skillsError;
  }

  /*
   * Delete developer profile.
   */

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .delete()
    .eq(
      "id",
      developerId
    )
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Developer could not be removed."
    );
  }

  return data;
}


/* ==========================================================
   ADMIN: ALL OPPORTUNITIES
========================================================== */

export async function getAllOpportunities() {
  await requireAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("opportunities")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/* ==========================================================
   ADMIN: CREATE OPPORTUNITY
========================================================== */

export async function createOpportunity(
  payload
) {
  await requireAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("opportunities")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ==========================================================
   ADMIN: UPDATE OPPORTUNITY
========================================================== */

export async function updateOpportunity(
  id,
  payload
) {
  await requireAdmin();

  if (!id) {
    throw new Error(
      "Opportunity ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("opportunities")
    .update(payload)
    .eq(
      "id",
      id
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ==========================================================
   ADMIN: DELETE OPPORTUNITY
========================================================== */

export async function deleteOpportunity(
  opportunityId
) {
  await requireAdmin();

  if (!opportunityId) {
    throw new Error(
      "Opportunity ID is required."
    );
  }

  /*
   * Do not delete opportunities with project history.
   */

  const {
    count: assignmentCount,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "opportunity_id",
      opportunityId
    );

  if (assignmentError) {
    throw assignmentError;
  }

  if ((assignmentCount || 0) > 0) {
    throw new Error(
      "This opportunity has project history and cannot be deleted."
    );
  }

  /*
   * Delete applications.
   */

  const {
    error: applicationsError,
  } = await supabase
    .from("opportunity_applications")
    .delete()
    .eq(
      "opportunity_id",
      opportunityId
    );

  if (applicationsError) {
    throw applicationsError;
  }

  /*
   * Delete opportunity.
   */

  const {
    data,
    error,
  } = await supabase
    .from("opportunities")
    .delete()
    .eq(
      "id",
      opportunityId
    )
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Opportunity not found or could not be deleted."
    );
  }

  return data;
}


/* ==========================================================
   ADMIN: APPLICATIONS
========================================================== */

export async function getOpportunityApplications(
  opportunityId
) {
  await requireAdmin();

  if (!opportunityId) {
    throw new Error(
      "Opportunity ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      id,
      opportunity_id,
      developer_id,
      cover_message,
      estimated_days,
      status,
      applied_at,

      developer_profiles (
        id,
        user_id,
        full_name,
        city,
        primary_roles,
        github_url,
        linkedin_url,
        portfolio_url,
        status,

        developer_skills (
          skills (
            id,
            name
          )
        )
      )
    `)
    .eq(
      "opportunity_id",
      opportunityId
    )
    .order(
      "applied_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "Opportunity applications query failed:",
      error
    );

    throw error;
  }

  return data || [];
}


/* ==========================================================
   ADMIN: ALL ASSIGNMENTS
========================================================== */

export async function getAllAssignments() {
  await requireAdmin();

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
        category,
        freelancer_payout
      ),

      developer_profiles (
        id,
        user_id,
        full_name,
        city
      ),

      project_submissions (
        id,
        github_url,
        zip_path,
        submission_notes,
        status,
        submitted_at,
        review_message,
        reviewed_at
      )
    `)
    .order(
      "assigned_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/* ==========================================================
   ADMIN / REVIEWER: REVIEW SUBMISSION
========================================================== */

export async function reviewSubmission({
  submissionId,
  status,
  reviewMessage,
}) {
  const reviewerRole =
    await requireAdminOrReviewer();

  const allowedStatuses = [
    "completed",
    "rejected",
    "changes_requested",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Invalid submission status."
    );
  }

  if (!submissionId) {
    throw new Error(
      "Submission ID is required."
    );
  }

  const user =
    await getCurrentUser();

  /*
   * Get submission.
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

      project_assignments (
        id,
        opportunity_id,
        developer_id,
        completed_at,
        status
      )
    `)
    .eq(
      "id",
      submissionId
    )
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new Error(
      "Submission not found."
    );
  }

  const assignment =
    submission.project_assignments;

  if (!assignment) {
    throw new Error(
      "Assignment not found."
    );
  }

  if (
    assignment.completed_at ||
    assignment.status === "completed"
  ) {
    throw new Error(
      "This project has already been completed."
    );
  }

  /*
   * Update submission.
   */

  const {
    data,
    error,
  } = await supabase
    .from("project_submissions")
    .update({
      status,

      review_message:
        reviewMessage?.trim() || null,

      reviewed_at:
        new Date().toISOString(),

      reviewed_by:
        user.id,
    })
    .eq(
      "id",
      submissionId
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  /*
   * COMPLETED
   */

  if (status === "completed") {
    const completedAt =
      new Date().toISOString();

    const {
      error: assignmentError,
    } = await supabase
      .from("project_assignments")
      .update({
        status: "completed",

        completed_at:
          completedAt,

        payment_status:
          "partially_paid",

        updated_at:
          completedAt,
      })
      .eq(
        "id",
        assignment.id
      );

    if (assignmentError) {
      throw assignmentError;
    }

    /*
     * Mark opportunity completed.
     */

    const {
      error: opportunityError,
    } = await supabase
      .from("opportunities")
      .update({
        status: "completed",
      })
      .eq(
        "id",
        assignment.opportunity_id
      );

    if (opportunityError) {
      throw opportunityError;
    }
  }

  /*
   * CHANGES REQUESTED
   */

  if (status === "changes_requested") {
    const {
      error: assignmentError,
    } = await supabase
      .from("project_assignments")
      .update({
        status: "in_progress",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        assignment.id
      );

    if (assignmentError) {
      throw assignmentError;
    }
  }

  /*
   * REJECTED
   */

  if (status === "rejected") {
    const {
      error: assignmentError,
    } = await supabase
      .from("project_assignments")
      .update({
        status: "in_progress",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        assignment.id
      );

    if (assignmentError) {
      throw assignmentError;
    }
  }

  return {
    submission: data,
    reviewerRole,
  };
}


/* ==========================================================
   ADMIN: DELETE REVIEW / SUBMISSION
========================================================== */

export async function deleteSubmission(
  submissionId
) {
  await requireAdmin();

  if (!submissionId) {
    throw new Error(
      "Submission ID is required."
    );
  }

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("project_submissions")
    .select(`
      id,
      assignment_id,
      status,

      project_assignments (
        id,
        status,
        completed_at
      )
    `)
    .eq(
      "id",
      submissionId
    )
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new Error(
      "Review not found."
    );
  }

  /*
   * Prevent deleting a review belonging
   * to an already completed project.
   */

  if (
    submission.project_assignments?.completed_at ||
    submission.project_assignments?.status === "completed"
  ) {
    throw new Error(
      "This review belongs to a completed project and cannot be deleted."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("project_submissions")
    .delete()
    .eq(
      "id",
      submissionId
    )
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Review could not be deleted."
    );
  }

  return data;
}


/* ==========================================================
   DATABASE DEBUG
========================================================== */

export async function debugDatabaseConnection() {
  console.log(
    "================================================"
  );

  console.log(
    "EXCWA DATABASE CONNECTION DEBUG"
  );

  console.log(
    "================================================"
  );

  /*
   * --------------------------------------------------------
   * AUTH SESSION
   * --------------------------------------------------------
   */

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log(
    "AUTH SESSION:",
    sessionData
  );

  console.log(
    "AUTH ERROR:",
    sessionError
  );

  /*
   * --------------------------------------------------------
   * CURRENT USER
   * --------------------------------------------------------
   */

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  console.log(
    "CURRENT USER:",
    userData?.user || null
  );

  console.log(
    "CURRENT USER ERROR:",
    userError
  );

  /*
   * --------------------------------------------------------
   * CURRENT DEVELOPER
   * --------------------------------------------------------
   */

  let developer = null;

  if (userData?.user) {
    const {
      data,
      error,
    } = await supabase
      .from("developer_profiles")
      .select(`
        id,
        user_id,
        full_name,
        phone,
        city,
        github_url,
        linkedin_url,
        portfolio_url,
        status,
        rejection_reason,
        primary_roles
      `)
      .eq(
        "user_id",
        userData.user.id
      )
      .maybeSingle();

    developer = data
      ? {
          ...data,
          email:
            userData.user.email || null,
        }
      : null;

    console.log(
      "DEVELOPER PROFILE:",
      developer
    );

    console.log(
      "DEVELOPER PROFILE ERROR:",
      error
    );
  }

  /*
   * --------------------------------------------------------
   * OPPORTUNITIES
   * --------------------------------------------------------
   */

  const {
    data: opportunities,
    error: opportunitiesError,
  } = await supabase
    .from("opportunities")
    .select(`
      id,
      title,
      status,
      created_at
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  console.log(
    "OPPORTUNITIES:",
    opportunities
  );

  console.log(
    "OPPORTUNITIES ERROR:",
    opportunitiesError
  );

  /*
   * --------------------------------------------------------
   * ALL PROJECT ASSIGNMENTS
   * --------------------------------------------------------
   */

  const {
    data: assignments,
    error: assignmentsError,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      developer_id,
      assigned_by,
      status,
      assigned_at,
      started_at,
      completed_at,
      payment_status
    `)
    .order(
      "assigned_at",
      {
        ascending: false,
      }
    );

  console.log(
    "PROJECT ASSIGNMENTS:",
    assignments
  );

  console.log(
    "PROJECT ASSIGNMENTS ERROR:",
    assignmentsError
  );

  /*
   * --------------------------------------------------------
   * CURRENT DEVELOPER ASSIGNMENTS
   * --------------------------------------------------------
   */

  let developerAssignments = [];

  if (developer?.id) {
    const {
      data,
      error,
    } = await supabase
      .from("project_assignments")
      .select(`
        id,
        opportunity_id,
        developer_id,
        status,
        assigned_at,
        completed_at,
        payment_status
      `)
      .eq(
        "developer_id",
        developer.id
      )
      .order(
        "assigned_at",
        {
          ascending: false,
        }
      );

    developerAssignments =
      data || [];

    console.log(
      "ALL CURRENT DEVELOPER ASSIGNMENTS:",
      data
    );

    console.log(
      "CURRENT DEVELOPER ASSIGNMENTS ERROR:",
      error
    );
  }

  /*
   * --------------------------------------------------------
   * ACTIVE ASSIGNMENT
   * --------------------------------------------------------
   *
   * IMPORTANT:
   * Use the exact same active-status logic as
   * getMyCurrentAssignment().
   */

  let activeAssignment = null;

  if (developer?.id) {
    const {
      data,
      error,
    } = await supabase
      .from("project_assignments")
      .select(`
        id,
        opportunity_id,
        developer_id,
        status,
        assigned_at,
        completed_at,
        payment_status
      `)
      .eq(
        "developer_id",
        developer.id
      )
      .in(
        "status",
        ACTIVE_ASSIGNMENT_STATUSES
      )
      .is(
        "completed_at",
        null
      )
      .order(
        "assigned_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    activeAssignment =
      data || null;

    console.log(
      "ACTIVE ASSIGNMENT:",
      data
    );

    console.log(
      "ACTIVE ASSIGNMENT ERROR:",
      error
    );
  }

  /*
   * --------------------------------------------------------
   * OPEN OPPORTUNITIES
   * --------------------------------------------------------
   */

  const {
    data: openOpportunities,
    error: openOpportunitiesError,
  } = await supabase
    .from("opportunities")
    .select(`
      id,
      title,
      status
    `)
    .eq(
      "status",
      "open"
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  console.log(
    "OPEN OPPORTUNITIES:",
    openOpportunities
  );

  console.log(
    "OPEN OPPORTUNITIES ERROR:",
    openOpportunitiesError
  );

  /*
   * --------------------------------------------------------
   * FINAL RESULT
   * --------------------------------------------------------
   */

  const result = {
    session:
      sessionData,

    sessionError,

    user:
      userData?.user || null,

    userError,

    developer,

    opportunities,

    opportunitiesError,

    assignments,

    assignmentsError,

    developerAssignments,

    activeAssignment,

    openOpportunities,

    openOpportunitiesError,
  };

  console.log(
    "FINAL DATABASE DEBUG RESULT:",
    result
  );

  console.log(
    "================================================"
  );

  return result;
}