import { supabase } from "../lib/supabase";

// ============================================================
// HELPERS
// ============================================================

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

async function getCurrentDeveloperProfile() {
  const user = await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Developer profile not found for the current user."
    );
  }

  return data;
}

// ============================================================
// ROLE HELPERS
// ============================================================

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

// ============================================================
// REGISTRATION
// ============================================================

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

// ============================================================
// SKILLS
// ============================================================

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

// ============================================================
// OPEN OPPORTUNITIES
// ============================================================

export async function getOpenOpportunities() {
  const developerProfile =
    await getCurrentDeveloperProfile();

  // ----------------------------------------------------------
  // CHECK ACTIVE ASSIGNMENT
  // ----------------------------------------------------------

  const {
    data: activeAssignment,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      completed_at
    `)
    .eq(
      "developer_id",
      developerProfile.id
    )
    .is(
      "completed_at",
      null
    )
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  // Developer can only work on one project at a time.
  if (activeAssignment) {
    return [];
  }

  // ----------------------------------------------------------
  // GET OPEN OPPORTUNITIES
  // ----------------------------------------------------------

  const {
    data: opportunities,
    error: opportunitiesError,
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

  if (opportunitiesError) {
    throw opportunitiesError;
  }

  return opportunities || [];
}

// ============================================================
// APPLY TO OPPORTUNITY
//
// FLOW:
//
// Developer applies
//       ↓
// Application automatically approved
//       ↓
// Assignment automatically created
//       ↓
// Opportunity becomes assigned
//       ↓
// Developer submits work
//       ↓
// Reviewer/Admin marks completed
//       ↓
// Developer can apply again
//
// IMPORTANT:
// There is only ONE applyToOpportunity function in this file.
// ============================================================

export async function applyToOpportunity({
  opportunityId,
  coverMessage,
  estimatedDays,
}) {
  const developerProfile =
    await getCurrentDeveloperProfile();

  // ----------------------------------------------------------
  // DEVELOPER ACCOUNT MUST BE APPROVED
  // ----------------------------------------------------------

  if (
    developerProfile.status !==
    "approved"
  ) {
    throw new Error(
      "Your developer account is not approved."
    );
  }

  // ----------------------------------------------------------
  // CHECK ACTIVE ASSIGNMENT
  // ----------------------------------------------------------

  const {
    data: activeAssignment,
    error: activeAssignmentError,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      completed_at
    `)
    .eq(
      "developer_id",
      developerProfile.id
    )
    .is(
      "completed_at",
      null
    )
    .maybeSingle();

  if (activeAssignmentError) {
    throw activeAssignmentError;
  }

  if (activeAssignment) {
    throw new Error(
      "You already have an active project. Complete it before applying for another opportunity."
    );
  }

  // ----------------------------------------------------------
  // CHECK ACTIVE APPLICATION
  //
  // Because applications are automatically approved,
  // an approved application represents the current project.
  // ----------------------------------------------------------

  const {
    data: activeApplications,
    error: activeApplicationsError,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      id,
      opportunity_id,
      status
    `)
    .eq(
      "developer_id",
      developerProfile.id
    )
    .in(
      "status",
      [
        "pending",
        "approved",
        "selected",
      ]
    );

  if (activeApplicationsError) {
    throw activeApplicationsError;
  }

  if (
    activeApplications &&
    activeApplications.length > 0
  ) {
    throw new Error(
      "You already have an active application. Complete your current project before applying again."
    );
  }

  // ----------------------------------------------------------
  // VERIFY OPPORTUNITY
  // ----------------------------------------------------------

  const {
    data: opportunity,
    error: opportunityError,
  } = await supabase
    .from("opportunities")
    .select(`
      id,
      title,
      status,
      application_deadline
    `)
    .eq(
      "id",
      opportunityId
    )
    .maybeSingle();

  if (opportunityError) {
    throw opportunityError;
  }

  if (!opportunity) {
    throw new Error(
      "Opportunity not found."
    );
  }

  if (
    opportunity.status !==
    "open"
  ) {
    throw new Error(
      "This opportunity is no longer available."
    );
  }

  // ----------------------------------------------------------
  // CHECK SAME OPPORTUNITY
  // ----------------------------------------------------------

  const {
    data: existingApplication,
    error: existingApplicationError,
  } = await supabase
    .from("opportunity_applications")
    .select("id")
    .eq(
      "opportunity_id",
      opportunityId
    )
    .eq(
      "developer_id",
      developerProfile.id
    )
    .maybeSingle();

  if (existingApplicationError) {
    throw existingApplicationError;
  }

  if (existingApplication) {
    throw new Error(
      "You have already applied for this opportunity."
    );
  }

  // ----------------------------------------------------------
  // CREATE AUTO-APPROVED APPLICATION
  // ----------------------------------------------------------

  const {
    data: application,
    error: applicationError,
  } = await supabase
    .from("opportunity_applications")
    .insert({
      opportunity_id:
        opportunityId,

      developer_id:
        developerProfile.id,

      cover_message:
        coverMessage?.trim() ||
        null,

      estimated_days:
        estimatedDays
          ? Number(estimatedDays)
          : null,

      status:
        "approved",
    })
    .select()
    .single();

  if (applicationError) {
    throw applicationError;
  }

  // ----------------------------------------------------------
  // CREATE ASSIGNMENT AUTOMATICALLY
  // ----------------------------------------------------------

  const user =
    await getCurrentUser();

  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .insert({
      opportunity_id:
        opportunityId,

      developer_id:
        developerProfile.id,

      assigned_by:
        user.id,

      payment_status:
        "pending",

      started_at:
        new Date().toISOString(),
    })
    .select()
    .single();

  if (assignmentError) {
    // Remove application if assignment creation fails.
    await supabase
      .from("opportunity_applications")
      .delete()
      .eq(
        "id",
        application.id
      );

    throw assignmentError;
  }

  // ----------------------------------------------------------
  // CLOSE OPPORTUNITY
  // ----------------------------------------------------------

  const {
    error: opportunityUpdateError,
  } = await supabase
    .from("opportunities")
    .update({
      status:
        "assigned",
    })
    .eq(
      "id",
      opportunityId
    );

  if (opportunityUpdateError) {
    throw opportunityUpdateError;
  }

  return {
    application,
    assignment,
  };
}

// ============================================================
// MY APPLICATIONS
// ============================================================

export async function getMyApplications() {
  const developerProfile =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      opportunities (
        id,
        title,
        category,
        tech_stack,
        budget,
        freelancer_payout,
        deadline,
        status
      )
    `)
    .eq(
      "developer_id",
      developerProfile.id
    )
    .order(
      "applied_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// MY CURRENT ASSIGNMENT
// ============================================================

export async function getMyCurrentAssignment() {
  const developerProfile =
    await getCurrentDeveloperProfile();

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
      ),
      project_submissions (
        id,
        github_url,
        submission_notes,
        status,
        submitted_at,
        review_message,
        reviewed_at
      )
    `)
    .eq(
      "developer_id",
      developerProfile.id
    )
    .is(
      "completed_at",
      null
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

// ============================================================
// SUBMIT WORK
// ============================================================

export async function submitWork({
  assignmentId,
  githubUrl,
  notes,
}) {
  const developerProfile =
    await getCurrentDeveloperProfile();

  // ----------------------------------------------------------
  // CHECK DEVELOPER APPROVAL
  // ----------------------------------------------------------

  if (
    developerProfile.status !==
    "approved"
  ) {
    throw new Error(
      "Your developer account is not approved."
    );
  }

  // ----------------------------------------------------------
  // VERIFY ASSIGNMENT
  // ----------------------------------------------------------

  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      developer_id,
      opportunity_id,
      completed_at
    `)
    .eq(
      "id",
      assignmentId
    )
    .eq(
      "developer_id",
      developerProfile.id
    )
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    throw new Error(
      "Assignment not found or does not belong to you."
    );
  }

  // ----------------------------------------------------------
  // PROJECT ALREADY COMPLETED
  // ----------------------------------------------------------

  if (assignment.completed_at) {
    throw new Error(
      "This project has already been completed."
    );
  }

  // ----------------------------------------------------------
  // VALIDATE GITHUB URL
  // ----------------------------------------------------------

  const cleanGithubUrl =
    githubUrl?.trim();

  if (!cleanGithubUrl) {
    throw new Error(
      "GitHub repository URL is required."
    );
  }

  let parsedUrl;

  try {
    parsedUrl =
      new URL(cleanGithubUrl);
  } catch {
    throw new Error(
      "Please enter a valid GitHub URL."
    );
  }

  if (
    parsedUrl.hostname !==
      "github.com" &&
    parsedUrl.hostname !==
      "www.github.com"
  ) {
    throw new Error(
      "Please submit a valid GitHub repository URL."
    );
  }

  // ----------------------------------------------------------
  // CHECK EXISTING SUBMISSION
  // ----------------------------------------------------------

  const {
    data: existingSubmission,
    error: existingError,
  } = await supabase
    .from("project_submissions")
    .select(`
      id,
      status
    `)
    .eq(
      "assignment_id",
      assignmentId
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  // ----------------------------------------------------------
  // DO NOT EDIT COMPLETED SUBMISSION
  // ----------------------------------------------------------

  if (
    existingSubmission &&
    existingSubmission.status ===
      "completed"
  ) {
    throw new Error(
      "This submission has already been completed."
    );
  }

  // ----------------------------------------------------------
  // UPDATE EXISTING SUBMISSION
  // ----------------------------------------------------------

  if (existingSubmission) {
    const {
      data,
      error,
    } = await supabase
      .from("project_submissions")
      .update({
        github_url:
          cleanGithubUrl,

        submission_notes:
          notes?.trim() ||
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
      .eq(
        "id",
        existingSubmission.id
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // ----------------------------------------------------------
  // CREATE SUBMISSION
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabase
    .from("project_submissions")
    .insert({
      assignment_id:
        assignmentId,

      developer_id:
        developerProfile.id,

      github_url:
        cleanGithubUrl,

      submission_notes:
        notes?.trim() ||
        null,

      status:
        "submitted",

      submitted_at:
        new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================
// MY SUBMISSIONS
// ============================================================

export async function getMySubmissions() {
  const developerProfile =
    await getCurrentDeveloperProfile();

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
        payment_status,
        completed_at,
        opportunities (
          id,
          title,
          category
        )
      )
    `)
    .eq(
      "developer_id",
      developerProfile.id
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

// ============================================================
// ADMIN: GET DEVELOPERS
// ============================================================

export async function getAllDevelopers() {
  await requireAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .select(`
      *,
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

// ============================================================
// ADMIN: UPDATE DEVELOPER STATUS
// ============================================================

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

  if (
    !allowedStatuses.includes(status)
  ) {
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
          ? rejectionReason?.trim() ||
            null
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

// ============================================================
// ADMIN: ALL OPPORTUNITIES
// ============================================================

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

// ============================================================
// ADMIN: CREATE OPPORTUNITY
// ============================================================

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

// ============================================================
// ADMIN: UPDATE OPPORTUNITY
// ============================================================

export async function updateOpportunity(
  id,
  payload
) {
  await requireAdmin();

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

// ============================================================
// ADMIN: APPLICATIONS
// ============================================================

export async function getOpportunityApplications(
  opportunityId
) {
  await requireAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      developer_profiles (
        id,
        full_name,
        city,
        primary_roles,
        github_url,
        portfolio_url,
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
    throw error;
  }

  return data || [];
}

// ============================================================
// ADMIN: ALL ASSIGNMENTS
// ============================================================

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
        full_name,
        city
      ),
      project_submissions (
        id,
        github_url,
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

// ============================================================
// ADMIN / REVIEWER: REVIEW SUBMISSION
//
// submitted
//    ↓
// reviewer/admin
//    ↓
// completed
//    ↓
// assignment completed
//    ↓
// developer can apply again
// ============================================================

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

  if (
    !allowedStatuses.includes(status)
  ) {
    throw new Error(
      "Invalid submission status."
    );
  }

  const user =
    await getCurrentUser();

  // ----------------------------------------------------------
  // GET SUBMISSION
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // DO NOT REVIEW COMPLETED PROJECT
  // ----------------------------------------------------------

  if (
    assignment.completed_at
  ) {
    throw new Error(
      "This project has already been completed."
    );
  }

  // ----------------------------------------------------------
  // UPDATE SUBMISSION
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabase
    .from("project_submissions")
    .update({
      status,

      review_message:
        reviewMessage?.trim() ||
        null,

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

  // ----------------------------------------------------------
  // COMPLETED
  // ----------------------------------------------------------

  if (status === "completed") {
    // --------------------------------------------------------
    // COMPLETE ASSIGNMENT
    // --------------------------------------------------------

    const {
      error: assignmentError,
    } = await supabase
      .from("project_assignments")
      .update({
        completed_at:
          new Date().toISOString(),

        payment_status:
          "due",
      })
      .eq(
        "id",
        assignment.id
      );

    if (assignmentError) {
      throw assignmentError;
    }

    // --------------------------------------------------------
    // COMPLETE OPPORTUNITY
    // --------------------------------------------------------

    const {
      error: opportunityError,
    } = await supabase
      .from("opportunities")
      .update({
        status:
          "completed",
      })
      .eq(
        "id",
        assignment.opportunity_id
      );

    if (opportunityError) {
      throw opportunityError;
    }
  }

  return {
    submission: data,
    reviewerRole,
  };
}