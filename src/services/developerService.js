import { supabase } from "../lib/supabase";

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
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: full_name.trim(),
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
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// OPPORTUNITIES - DEVELOPER
// ============================================================

export async function getOpenOpportunities() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// APPLICATIONS - DEVELOPER
// ============================================================

export async function applyToOpportunity({
  opportunityId,
  developerId,
  coverMessage,
  estimatedDays,
}) {
  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  if (!developerId) {
    throw new Error("Developer ID is required.");
  }

  // ----------------------------------------------------------
  // Check whether the developer has already applied.
  //
  // IMPORTANT:
  // Use maybeSingle() instead of single().
  // single() returns a 406 when zero rows exist.
  // ----------------------------------------------------------

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("opportunity_applications")
    .select("id")
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
  // Create application
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("opportunity_applications")
    .insert({
      opportunity_id: opportunityId,
      developer_id: developerId,
      cover_message: coverMessage?.trim() || null,
      estimated_days: estimatedDays || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getMyApplications(developerId) {
  if (!developerId) {
    throw new Error("Developer ID is required.");
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
    .order("applied_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// ASSIGNMENTS - DEVELOPER
// ============================================================

export async function getMyAssignment(
  developerId,
  opportunityId
) {
  if (!developerId || !opportunityId) {
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
// SUBMISSIONS - DEVELOPER
// ============================================================

export async function submitWork({
  assignmentId,
  developerId,
  githubUrl,
  notes,
}) {
  if (!assignmentId) {
    throw new Error("Assignment ID is required.");
  }

  if (!developerId) {
    throw new Error("Developer ID is required.");
  }

  if (!githubUrl?.trim()) {
    throw new Error("GitHub URL is required.");
  }

  // ----------------------------------------------------------
  // Check whether a submission already exists.
  // ----------------------------------------------------------

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("project_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  // ----------------------------------------------------------
  // Update existing submission
  // ----------------------------------------------------------

  if (existing) {
    const { data, error } = await supabase
      .from("project_submissions")
      .update({
        github_url: githubUrl.trim(),
        submission_notes: notes?.trim() || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("assignment_id", assignmentId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // ----------------------------------------------------------
  // Create new submission
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("project_submissions")
    .insert({
      assignment_id: assignmentId,
      developer_id: developerId,
      github_url: githubUrl.trim(),
      submission_notes: notes?.trim() || null,
      status: "submitted",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getMySubmissions(developerId) {
  if (!developerId) {
    throw new Error("Developer ID is required.");
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
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// ADMIN - DEVELOPER MANAGEMENT
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
    .order("created_at", { ascending: false });

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
  if (!devProfileId) {
    throw new Error("Developer profile ID is required.");
  }

  if (!status) {
    throw new Error("Developer status is required.");
  }

  const update = {
    status,
  };

  if (status === "rejected") {
    update.rejection_reason =
      rejectionReason?.trim() || null;
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
// ADMIN - OPPORTUNITIES
// ============================================================

export async function getAllOpportunities() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createOpportunity(payload) {
  if (!payload) {
    throw new Error("Opportunity data is required.");
  }

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

export async function updateOpportunity(id, payload) {
  if (!id) {
    throw new Error("Opportunity ID is required.");
  }

  if (!payload) {
    throw new Error("Opportunity update data is required.");
  }

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

// ============================================================
// ADMIN - OPPORTUNITY APPLICATIONS
// ============================================================

export async function getOpportunityApplications(
  opportunityId
) {
  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  const { data, error } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      developer_profiles (
        id,
        user_id,
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
    .order("applied_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// ADMIN - ASSIGN DEVELOPER
// ============================================================
//
// Flow:
//
// 1. Create project assignment
// 2. Mark selected application as selected
// 3. Reject all other applications
// 4. Close opportunity as assigned
//
// ============================================================

export async function assignDeveloper({
  opportunityId,
  developerId,
  applicationId,
  adminId,
}) {
  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  if (!developerId) {
    throw new Error("Developer ID is required.");
  }

  if (!applicationId) {
    throw new Error("Application ID is required.");
  }

  if (!adminId) {
    throw new Error("Admin ID is required.");
  }

  // ----------------------------------------------------------
  // 1. Create assignment
  // ----------------------------------------------------------

  const {
    data: assignment,
    error: assignError,
  } = await supabase
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

  const {
    error: selectedError,
  } = await supabase
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
  // 3. Reject all other applications
  // ----------------------------------------------------------

  const {
    error: rejectedError,
  } = await supabase
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

  const {
    error: opportunityError,
  } = await supabase
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
// ADMIN - ASSIGNMENTS
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
    .order("assigned_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

// ============================================================
// ADMIN - SUBMISSION REVIEW
// ============================================================

export async function reviewSubmission({
  submissionId,
  status,
  reviewMessage,
  reviewerId,
  opportunityId,
}) {
  if (!submissionId) {
    throw new Error("Submission ID is required.");
  }

  if (!status) {
    throw new Error("Submission status is required.");
  }

  if (!reviewerId) {
    throw new Error("Reviewer ID is required.");
  }

  // ----------------------------------------------------------
  // 1. Update submission
  // ----------------------------------------------------------

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("project_submissions")
    .update({
      status,
      review_message: reviewMessage?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", submissionId)
    .select()
    .single();

  if (submissionError) {
    throw submissionError;
  }

  // ----------------------------------------------------------
  // 2. If approved, complete opportunity and mark payment due
  // ----------------------------------------------------------

  if (status === "approved" && opportunityId) {
    const { error: opportunityError } =
      await supabase
        .from("opportunities")
        .update({
          status: "completed",
        })
        .eq("id", opportunityId);

    if (opportunityError) {
      throw opportunityError;
    }

    const { error: assignmentError } =
      await supabase
        .from("project_assignments")
        .update({
          payment_status: "due",
          completed_at: new Date().toISOString(),
        })
        .eq("opportunity_id", opportunityId);

    if (assignmentError) {
      throw assignmentError;
    }
  }

  return submission;
}
