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

  const { data, error } = await supabase
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
  const { data: authData, error: authError } =
    await supabase.auth.signUp({
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
  const { data, error } = await supabase
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
// OPPORTUNITIES
// ============================================================

export async function getOpenOpportunities() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "open")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
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
  // ----------------------------------------------------------
  // Make sure the user is authenticated
  // ----------------------------------------------------------

  const user = await getCurrentUser();

  // ----------------------------------------------------------
  // Get developer profile belonging to current auth user
  // ----------------------------------------------------------

  const { data: developerProfile, error: profileError } =
    await supabase
      .from("developer_profiles")
      .select("id, user_id, full_name")
      .eq("id", developerId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!developerProfile) {
    throw new Error(
      "You are not authorized to apply with this developer profile."
    );
  }

  // ----------------------------------------------------------
  // Check opportunity exists and is open
  // ----------------------------------------------------------

  const { data: opportunity, error: opportunityError } =
    await supabase
      .from("opportunities")
      .select("id, title, status")
      .eq("id", opportunityId)
      .maybeSingle();

  if (opportunityError) {
    throw opportunityError;
  }

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  if (opportunity.status !== "open") {
    throw new Error(
      "This opportunity is no longer accepting applications."
    );
  }

  // ----------------------------------------------------------
  // Check if already applied
  //
  // IMPORTANT:
  // Do NOT use .single() here.
  // .single() returns 406 when zero rows exist.
  // ----------------------------------------------------------

  const { data: existing, error: existingError } =
    await supabase
      .from("opportunity_applications")
      .select("id, status")
      .eq("opportunity_id", opportunityId)
      .eq("developer_id", developerId)
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    throw new Error(
      "You have already applied to this opportunity."
    );
  }

  // ----------------------------------------------------------
  // Insert application
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("opportunity_applications")
    .insert({
      opportunity_id: opportunityId,
      developer_id: developerId,
      cover_message:
        coverMessage?.trim() || null,
      estimated_days:
        estimatedDays
          ? Number(estimatedDays)
          : null,
      status: "pending",
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

export async function getMyApplications(developerId) {
  const user = await getCurrentUser();

  // Verify developer profile belongs to logged-in user
  const { data: developerProfile, error: profileError } =
    await supabase
      .from("developer_profiles")
      .select("id")
      .eq("id", developerId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!developerProfile) {
    throw new Error(
      "You are not authorized to view these applications."
    );
  }

  const { data, error } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      opportunities (
        id,
        title,
        category,
        tech_stack,
        budget,
        deadline,
        status
      )
    `)
    .eq("developer_id", developerId)
    .order("applied_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// ASSIGNMENTS
// ============================================================

export async function getMyAssignment(
  developerId,
  opportunityId
) {
  const user = await getCurrentUser();

  // Verify ownership
  const { data: developerProfile, error: profileError } =
    await supabase
      .from("developer_profiles")
      .select("id")
      .eq("id", developerId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!developerProfile) {
    return null;
  }

  const { data, error } = await supabase
    .from("project_assignments")
    .select("*")
    .eq("developer_id", developerId)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

// ============================================================
// SUBMISSIONS
// ============================================================

export async function submitWork({
  assignmentId,
  developerId,
  githubUrl,
  notes,
}) {
  const user = await getCurrentUser();

  // ----------------------------------------------------------
  // Verify developer profile belongs to current user
  // ----------------------------------------------------------

  const { data: developerProfile, error: profileError } =
    await supabase
      .from("developer_profiles")
      .select("id")
      .eq("id", developerId)
      .eq("user_id", user.id)
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
  // Verify assignment belongs to developer
  // ----------------------------------------------------------

  const { data: assignment, error: assignmentError } =
    await supabase
      .from("project_assignments")
      .select("id, developer_id, opportunity_id")
      .eq("id", assignmentId)
      .eq("developer_id", developerId)
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
  // Check existing submission
  // ----------------------------------------------------------

  const { data: existing, error: existingError } =
    await supabase
      .from("project_submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  // ----------------------------------------------------------
  // UPDATE existing submission
  // ----------------------------------------------------------

  if (existing) {
    const { data, error } = await supabase
      .from("project_submissions")
      .update({
        github_url:
          githubUrl?.trim() || null,
        submission_notes:
          notes?.trim() || null,
        status: "submitted",
        submitted_at:
          new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // ----------------------------------------------------------
  // INSERT new submission
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("project_submissions")
    .insert({
      assignment_id: assignmentId,
      developer_id: developerId,
      github_url:
        githubUrl?.trim() || null,
      submission_notes:
        notes?.trim() || null,
      status: "submitted",
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

export async function getMySubmissions(developerId) {
  const user = await getCurrentUser();

  // Verify developer ownership
  const { data: developerProfile, error: profileError } =
    await supabase
      .from("developer_profiles")
      .select("id")
      .eq("id", developerId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!developerProfile) {
    throw new Error(
      "You are not authorized to view these submissions."
    );
  }

  const { data, error } = await supabase
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
    .eq("developer_id", developerId)
    .order("submitted_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// ADMIN: DEVELOPER MANAGEMENT
// ============================================================

export async function getAllDevelopers() {
  const { data, error } = await supabase
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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateDeveloperStatus(
  devProfileId,
  status,
  rejectionReason = null
) {
  const update = {
    status,
  };

  if (rejectionReason) {
    update.rejection_reason = rejectionReason;
  } else {
    update.rejection_reason = null;
  }

  const { data, error } = await supabase
    .from("developer_profiles")
    .update(update)
    .eq("id", devProfileId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================
// ADMIN: OPPORTUNITIES
// ============================================================

export async function getAllOpportunities() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createOpportunity(payload) {
  const { data, error } = await supabase
    .from("opportunities")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateOpportunity(
  id,
  payload
) {
  const { data, error } = await supabase
    .from("opportunities")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOpportunityApplications(
  opportunityId
) {
  const { data, error } = await supabase
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
    .eq("opportunity_id", opportunityId)
    .order("applied_at", {
      ascending: false,
    });

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
  // 1. Create assignment
  // ----------------------------------------------------------

  const { data: assignment, error: assignError } =
    await supabase
      .from("project_assignments")
      .insert({
        opportunity_id: opportunityId,
        developer_id: developerId,
        assigned_by: adminId,
        payment_status: "pending",
      })
      .select()
      .single();

  if (assignError) {
    throw assignError;
  }

  // ----------------------------------------------------------
  // 2. Mark selected application
  // ----------------------------------------------------------

  const { error: selectedError } =
    await supabase
      .from("opportunity_applications")
      .update({
        status: "selected",
      })
      .eq("id", applicationId)
      .eq("opportunity_id", opportunityId);

  if (selectedError) {
    throw selectedError;
  }

  // ----------------------------------------------------------
  // 3. Reject other applications
  // ----------------------------------------------------------

  const { error: rejectedError } =
    await supabase
      .from("opportunity_applications")
      .update({
        status: "rejected",
      })
      .eq("opportunity_id", opportunityId)
      .neq("id", applicationId);

  if (rejectedError) {
    throw rejectedError;
  }

  // ----------------------------------------------------------
  // 4. Close opportunity
  // ----------------------------------------------------------

  const { error: opportunityError } =
    await supabase
      .from("opportunities")
      .update({
        status: "assigned",
      })
      .eq("id", opportunityId);

  if (opportunityError) {
    throw opportunityError;
  }

  return assignment;
}

// ============================================================
// ADMIN: ALL ASSIGNMENTS
// ============================================================

export async function getAllAssignments() {
  const { data, error } = await supabase
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
    .order("assigned_at", {
      ascending: false,
    });

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
  // 1. Update submission
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("project_submissions")
    .update({
      status,
      review_message:
        reviewMessage?.trim() || null,
      reviewed_at:
        new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", submissionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // ----------------------------------------------------------
  // 2. If approved, complete opportunity
  // ----------------------------------------------------------

  if (
    status === "approved" &&
    opportunityId
  ) {
    const {
      error: opportunityError,
    } = await supabase
      .from("opportunities")
      .update({
        status: "completed",
      })
      .eq("id", opportunityId);

    if (opportunityError) {
      throw opportunityError;
    }

    // --------------------------------------------------------
    // 3. Mark payment as due
    // --------------------------------------------------------

    const {
      error: paymentError,
    } = await supabase
      .from("project_assignments")
      .update({
        payment_status: "due",
        completed_at:
          new Date().toISOString(),
      })
      .eq("opportunity_id", opportunityId);

    if (paymentError) {
      throw paymentError;
    }
  }

  return data;
}
