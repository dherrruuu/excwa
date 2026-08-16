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
    emailConfirmationRequired:
      !authData?.session,
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
      assigned_at,
      started_at,
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


  // Developer already has a project.
  // No new opportunities should be shown.
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


  // ----------------------------------------------------------
  // GET APPLICATIONS MADE BY THIS DEVELOPER
  // ----------------------------------------------------------

  const {
    data: applications,
    error: applicationsError,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      opportunity_id,
      status
    `)
    .eq(
      "developer_id",
      developerProfile.id
    );


  if (applicationsError) {
    throw applicationsError;
  }


  // ----------------------------------------------------------
  // BUILD SET OF ALREADY APPLIED OPPORTUNITIES
  // ----------------------------------------------------------

  const appliedOpportunityIds =
    new Set(
      (applications || []).map(
        (application) =>
          application.opportunity_id
      )
    );


  // ----------------------------------------------------------
  // REMOVE ALREADY APPLIED OPPORTUNITIES
  // ----------------------------------------------------------

  const availableOpportunities =
    (opportunities || []).filter(
      (opportunity) =>
        !appliedOpportunityIds.has(
          opportunity.id
        )
    );


  return availableOpportunities;
}


// ============================================================
// MY CURRENT PROJECT
// ============================================================

export async function getMyCurrentAssignment(
  developerId
) {
  const user =
    await getCurrentUser();


  // ----------------------------------------------------------
  // VERIFY DEVELOPER OWNERSHIP
  // ----------------------------------------------------------

  const {
    data: developerProfile,
    error: profileError,
  } = await supabase
    .from("developer_profiles")
    .select("id")
    .eq(
      "id",
      developerId
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();


  if (profileError) {
    throw profileError;
  }


  if (!developerProfile) {
    throw new Error(
      "You are not authorized to view this project."
    );
  }


  // ----------------------------------------------------------
  // GET ACTIVE ASSIGNMENT
  // ----------------------------------------------------------

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
        status
      )
    `)
    .eq(
      "developer_id",
      developerId
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
// APPLY TO OPPORTUNITY
// ============================================================

export async function applyToOpportunity({
  opportunityId,
  developerId,
  coverMessage,
  estimatedDays,
}) {
  const user =
    await getCurrentUser();


  // ----------------------------------------------------------
  // VERIFY DEVELOPER OWNERSHIP
  // ----------------------------------------------------------

  const {
    data: developerProfile,
    error: profileError,
  } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      user_id,
      full_name,
      status
    `)
    .eq(
      "id",
      developerId
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();


  if (profileError) {
    throw profileError;
  }


  if (!developerProfile) {
    throw new Error(
      "Developer profile not found."
    );
  }


  // ----------------------------------------------------------
  // CHECK APPROVAL
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
  // CHECK ACTIVE PROJECT
  // ----------------------------------------------------------

  const {
    data: activeAssignment,
    error: activeAssignmentError,
  } = await supabase
    .from("project_assignments")
    .select("id")
    .eq(
      "developer_id",
      developerId
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
      "You already have an active project."
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
      status
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
  // CHECK DUPLICATE APPLICATION
  // ----------------------------------------------------------

  const {
    data: existingApplication,
    error: existingApplicationError,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      id,
      status
    `)
    .eq(
      "opportunity_id",
      opportunityId
    )
    .eq(
      "developer_id",
      developerId
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
  // CREATE APPLICATION
  //
  // IMPORTANT:
  // This does NOT assign the project.
  //
  // Flow:
  //
  // Developer applies
  //       ↓
  // Admin reviews
  //       ↓
  // Admin assigns developer
  //
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .insert({
      opportunity_id:
        opportunityId,

      developer_id:
        developerId,

      cover_message:
        coverMessage?.trim() ||
        null,

      estimated_days:
        estimatedDays
          ? Number(
              estimatedDays
            )
          : null,

      status:
        "pending",
    })
    .select()
    .single();


  if (error) {
    throw error;
  }


  return data;
}


// ============================================================
// MY APPLICATIONS
// ============================================================

export async function getMyApplications(
  developerId
) {
  const user =
    await getCurrentUser();


  // ----------------------------------------------------------
  // VERIFY OWNERSHIP
  // ----------------------------------------------------------

  const {
    data: developerProfile,
    error: profileError,
  } = await supabase
    .from("developer_profiles")
    .select("id")
    .eq(
      "id",
      developerId
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();


  if (profileError) {
    throw profileError;
  }


  if (!developerProfile) {
    throw new Error(
      "You are not authorized to view these applications."
    );
  }


  // ----------------------------------------------------------
  // GET APPLICATIONS
  // ----------------------------------------------------------

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
      developerId
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
// MY ASSIGNMENT
// ============================================================

export async function getMyAssignment(
  developerId,
  opportunityId
) {
  const user =
    await getCurrentUser();


  // ----------------------------------------------------------
  // VERIFY OWNERSHIP
  // ----------------------------------------------------------

  const {
    data: developerProfile,
    error: profileError,
  } = await supabase
    .from("developer_profiles")
    .select("id")
    .eq(
      "id",
      developerId
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();


  if (profileError) {
    throw profileError;
  }


  if (!developerProfile) {
    return null;
  }


  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select("*")
    .eq(
      "developer_id",
      developerId
    )
    .eq(
      "opportunity_id",
      opportunityId
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
  developerId,
  githubUrl,
  notes,
}) {
  const user =
    await getCurrentUser();


  // ----------------------------------------------------------
  // VERIFY DEVELOPER OWNERSHIP
  // ----------------------------------------------------------

  const {
    data: developerProfile,
    error: profileError,
  } = await supabase
    .from("developer_profiles")
    .select("id")
    .eq(
      "id",
      developerId
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();


  if (profileError) {
    throw profileError;
  }


  if (!developerProfile) {
    throw new Error(
      "You are not authorized to submit work for this developer profile."
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
      opportunity_id
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


  if (assignmentError) {
    throw assignmentError;
  }


  if (!assignment) {
    throw new Error(
      "Assignment not found or does not belong to you."
    );
  }


  // ----------------------------------------------------------
  // CHECK EXISTING SUBMISSION
  // ----------------------------------------------------------

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("project_submissions")
    .select("id")
    .eq(
      "assignment_id",
      assignmentId
    )
    .maybeSingle();


  if (existingError) {
    throw existingError;
  }


  // ----------------------------------------------------------
  // UPDATE EXISTING SUBMISSION
  // ----------------------------------------------------------

  if (existing) {
    const {
      data,
      error,
    } = await supabase
      .from("project_submissions")
      .update({
        github_url:
          githubUrl?.trim() ||
          null,

        submission_notes:
          notes?.trim() ||
          null,

        status:
          "submitted",

        submitted_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        existing.id
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
        developerId,

      github_url:
        githubUrl?.trim() ||
        null,

      submission_notes:
        notes?.trim() ||
        null,

      status:
        "submitted",
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

export async function getMySubmissions(
  developerId
) {
  const user =
    await getCurrentUser();


  // ----------------------------------------------------------
  // VERIFY OWNERSHIP
  // ----------------------------------------------------------

  const {
    data: developerProfile,
    error: profileError,
  } = await supabase
    .from("developer_profiles")
    .select("id")
    .eq(
      "id",
      developerId
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();


  if (profileError) {
    throw profileError;
  }


  if (!developerProfile) {
    throw new Error(
      "You are not authorized to view these submissions."
    );
  }


  // ----------------------------------------------------------
  // GET SUBMISSIONS
  // ----------------------------------------------------------

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
        opportunities (
          id,
          title,
          category
        )
      )
    `)
    .eq(
      "developer_id",
      developerId
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
// ADMIN: DEVELOPER MANAGEMENT
// ============================================================

export async function getAllDevelopers() {
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
  const update = {
    status,
    rejection_reason:
      rejectionReason || null,
  };


  const {
    data,
    error,
  } = await supabase
    .from("developer_profiles")
    .update(update)
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
// ADMIN: OPPORTUNITY APPLICATIONS
// ============================================================

export async function getOpportunityApplications(
  opportunityId
) {
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
// ADMIN: ASSIGN DEVELOPER
// ============================================================

export async function assignDeveloper({
  opportunityId,
  developerId,
  applicationId,
  adminId,
}) {

  // ----------------------------------------------------------
  // CREATE ASSIGNMENT
  // ----------------------------------------------------------

  const {
    data: assignment,
    error: assignError,
  } = await supabase
    .from("project_assignments")
    .insert({
      opportunity_id:
        opportunityId,

      developer_id:
        developerId,

      assigned_by:
        adminId,

      payment_status:
        "pending",
    })
    .select()
    .single();


  if (assignError) {
    throw assignError;
  }


  // ----------------------------------------------------------
  // SELECT APPLICATION
  // ----------------------------------------------------------

  const {
    error: selectedError,
  } = await supabase
    .from("opportunity_applications")
    .update({
      status:
        "selected",
    })
    .eq(
      "id",
      applicationId
    )
    .eq(
      "opportunity_id",
      opportunityId
    );


  if (selectedError) {
    throw selectedError;
  }


  // ----------------------------------------------------------
  // REJECT OTHER APPLICATIONS
  // ----------------------------------------------------------

  const {
    error: rejectedError,
  } = await supabase
    .from("opportunity_applications")
    .update({
      status:
        "rejected",
    })
    .eq(
      "opportunity_id",
      opportunityId
    )
    .neq(
      "id",
      applicationId
    );


  if (rejectedError) {
    throw rejectedError;
  }


  // ----------------------------------------------------------
  // CLOSE OPPORTUNITY
  // ----------------------------------------------------------

  const {
    error: opportunityError,
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


  if (opportunityError) {
    throw opportunityError;
  }


  return assignment;
}


// ============================================================
// ADMIN: ALL ASSIGNMENTS
// ============================================================

export async function getAllAssignments() {
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
        category
      ),
      developer_profiles (
        id,
        full_name,
        city
      ),
      project_submissions (*)
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
// ADMIN: REVIEW SUBMISSION
// ============================================================

export async function reviewSubmission({
  submissionId,
  status,
  reviewMessage,
  reviewerId,
  opportunityId,
}) {

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
        reviewerId,
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
  // APPROVED
  // ----------------------------------------------------------

  if (
    status === "approved" &&
    opportunityId
  ) {

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
        opportunityId
      );


    if (opportunityError) {
      throw opportunityError;
    }


    // --------------------------------------------------------
    // MARK PAYMENT DUE
    // --------------------------------------------------------

    const {
      error: paymentError,
    } = await supabase
      .from("project_assignments")
      .update({
        payment_status:
          "due",

        completed_at:
          new Date().toISOString(),
      })
      .eq(
        "opportunity_id",
        opportunityId
      );


    if (paymentError) {
      throw paymentError;
    }
  }


  return data;
}