import { supabase } from "../lib/supabase";

// ── REGISTRATION ────────────────────────────────────────────

export async function registerDeveloper({ full_name, email, password }) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
      },
    },
  });

  if (authError) throw authError;

  return {
    user: authData?.user || null,
    emailConfirmationRequired: !authData?.session,
  };
}

// ── SKILLS ──────────────────────────────────────────────────

export async function getAllSkills() {
  const { data, error } = await supabase.from("skills").select("*").order("name");
  if (error) throw error;
  return data;
}

// ── OPPORTUNITIES ────────────────────────────────────────────

export async function getOpenOpportunities() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ── APPLICATIONS ─────────────────────────────────────────────

export async function applyToOpportunity({ opportunityId, developerId, coverMessage, estimatedDays }) {
  // Check if already applied
  const { data: existing } = await supabase
    .from("opportunity_applications")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("developer_id", developerId)
    .single();
  if (existing) throw new Error("You have already applied to this opportunity.");

  const { error } = await supabase.from("opportunity_applications").insert({
    opportunity_id: opportunityId,
    developer_id: developerId,
    cover_message: coverMessage,
    estimated_days: estimatedDays || null,
    status: "pending",
  });
  if (error) throw error;
}

export async function getMyApplications(developerId) {
  const { data, error } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      opportunities (id, title, category, tech_stack, budget, deadline, status)
    `)
    .eq("developer_id", developerId)
    .order("applied_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ── ASSIGNMENTS ───────────────────────────────────────────────

export async function getMyAssignment(developerId, opportunityId) {
  const { data, error } = await supabase
    .from("project_assignments")
    .select("*")
    .eq("developer_id", developerId)
    .eq("opportunity_id", opportunityId)
    .single();
  if (error) return null;
  return data;
}

// ── SUBMISSIONS ───────────────────────────────────────────────

export async function submitWork({ assignmentId, developerId, githubUrl, notes }) {
  // Check if already submitted
  const { data: existing } = await supabase
    .from("project_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("project_submissions")
      .update({
        github_url: githubUrl,
        submission_notes: notes || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("assignment_id", assignmentId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("project_submissions").insert({
      assignment_id: assignmentId,
      developer_id: developerId,
      github_url: githubUrl,
      submission_notes: notes || null,
      status: "submitted",
    });
    if (error) throw error;
  }
}

export async function getMySubmissions(developerId) {
  const { data, error } = await supabase
    .from("project_submissions")
    .select(`
      *,
      project_assignments (
        id, opportunity_id, assigned_at, payment_status,
        opportunities (id, title, category)
      )
    `)
    .eq("developer_id", developerId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ── ADMIN: DEVELOPER MANAGEMENT ──────────────────────────────

export async function getAllDevelopers() {
  const { data, error } = await supabase
    .from("developer_profiles")
    .select(`
      *,
      developer_skills (
        skills (id, name)
      )
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateDeveloperStatus(devProfileId, status, rejectionReason = null) {
  const update = { status };
  if (rejectionReason) update.rejection_reason = rejectionReason;
  const { error } = await supabase
    .from("developer_profiles")
    .update(update)
    .eq("id", devProfileId);
  if (error) throw error;
}

// ── ADMIN: OPPORTUNITIES ─────────────────────────────────────

export async function getAllOpportunities() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createOpportunity(payload) {
  const { error } = await supabase.from("opportunities").insert(payload);
  if (error) throw error;
}

export async function updateOpportunity(id, payload) {
  const { error } = await supabase.from("opportunities").update(payload).eq("id", id);
  if (error) throw error;
}

export async function getOpportunityApplications(opportunityId) {
  const { data, error } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      developer_profiles (id, full_name, city, primary_roles, github_url, portfolio_url,
        developer_skills (skills (id, name))
      )
    `)
    .eq("opportunity_id", opportunityId)
    .order("applied_at", { ascending: false });
  if (error) throw error;
  return data;
}

// KEY BUSINESS LOGIC: assign developer → close opportunity → reject others
export async function assignDeveloper({ opportunityId, developerId, applicationId, adminId }) {
  // 1. Create assignment
  const { error: assignError } = await supabase.from("project_assignments").insert({
    opportunity_id: opportunityId,
    developer_id: developerId,
    assigned_by: adminId,
    payment_status: "pending",
  });
  if (assignError) throw assignError;

  // 2. Mark selected application as 'selected'
  await supabase
    .from("opportunity_applications")
    .update({ status: "selected" })
    .eq("id", applicationId);

  // 3. Reject all other applications for this opportunity
  await supabase
    .from("opportunity_applications")
    .update({ status: "rejected" })
    .eq("opportunity_id", opportunityId)
    .neq("id", applicationId);

  // 4. Close opportunity
  await supabase
    .from("opportunities")
    .update({ status: "assigned" })
    .eq("id", opportunityId);
}

// ── ADMIN: SUBMISSIONS ────────────────────────────────────────

export async function getAllAssignments() {
  const { data, error } = await supabase
    .from("project_assignments")
    .select(`
      *,
      opportunities (id, title, category),
      developer_profiles (id, full_name, city),
      project_submissions (*)
    `)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function reviewSubmission({ submissionId, status, reviewMessage, reviewerId, opportunityId }) {
  const { error } = await supabase
    .from("project_submissions")
    .update({
      status,
      review_message: reviewMessage || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", submissionId);
  if (error) throw error;

  // If approved → mark opportunity as completed
  if (status === "approved" && opportunityId) {
    await supabase
      .from("opportunities")
      .update({ status: "completed" })
      .eq("id", opportunityId);

    // Update payment status
    await supabase
      .from("project_assignments")
      .update({ payment_status: "due", completed_at: new Date().toISOString() })
      .eq("opportunity_id", opportunityId);
  }
}