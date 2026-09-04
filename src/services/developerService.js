import { supabase } from "../lib/supabase";

import {
  submitProject,
  getMySubmission,
  getMySubmissions as getDeveloperSubmissions,
} from "./developer/developerSubmissionService";

/* ============================================================
   STATUS CONSTANTS
   ============================================================ */

const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  "pending",
  "assigned",
  "in_progress",
  "submitted",
  "under_review",
  "changes_requested",
]);

const COMPLETED_ASSIGNMENT_STATUSES = new Set([
  "completed",
  "finalized",
]);

const DEVELOPER_STATUSES = new Set([
  "pending",
  "approved",
  "rejected",
]);

const SUBMISSION_REVIEW_STATUSES = new Set([
  "completed",
  "rejected",
  "changes_requested",
]);

/* ============================================================
   GENERIC HELPERS
   ============================================================ */

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return [];
  }

  return [value];
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
}

function normalizeDeveloperProfile(profile, user = null) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    status: normalizeStatus(profile.status),
    email: profile.email || user?.email || null,
    primary_roles: asArray(profile.primary_roles),
    skills: asArray(profile.skills),
  };
}

function isActiveAssignment(assignment) {
  if (!assignment) {
    return false;
  }

  const status = normalizeStatus(assignment.status);

  if (COMPLETED_ASSIGNMENT_STATUSES.has(status)) {
    return false;
  }

  if (assignment.completed_at) {
    return false;
  }

  return ACTIVE_ASSIGNMENT_STATUSES.has(status);
}

function isCompletedAssignment(assignment) {
  if (!assignment) {
    return false;
  }

  const status = normalizeStatus(assignment.status);

  return (
    COMPLETED_ASSIGNMENT_STATUSES.has(status) ||
    Boolean(assignment.completed_at)
  );
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("getCurrentUser error:", error);
    throw error;
  }

  return user || null;
}

export async function getCurrentUserRole() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getCurrentUserRole error:", error);
    throw error;
  }

  return data?.role || null;
}

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.role !== "admin") {
    throw new Error("Admin access required");
  }

  return {
    user,
    profile: data,
  };
}

async function requireAdminOrReviewer() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const role = normalizeStatus(data?.role);

  if (!["admin", "reviewer"].includes(role)) {
    throw new Error("Admin or reviewer access required");
  }

  return {
    user,
    profile: data,
  };
}

/* ============================================================
   DEVELOPER PROFILE
   ============================================================ */

export async function getCurrentDeveloperProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      user_id,
      full_name,
      phone,
      email,
      city,
      education,
      github_url,
      linkedin_url,
      portfolio_url,
      resume_url,
      profile_photo_url,
      profile_photo_path,
      status,
      primary_roles,
      created_at,
      updated_at
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getCurrentDeveloperProfile error:", error);
    throw error;
  }

  return normalizeDeveloperProfile(data, user);
}

/* ============================================================
   DEVELOPER REGISTRATION
   ============================================================ */

export async function registerDeveloper({
  email,
  password,
  fullName,
}) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const normalizedFullName = String(fullName || "").trim();

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  if (!normalizedFullName) {
    throw new Error("Full name is required");
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: normalizedFullName,
      },
    },
  });

  if (error) {
    console.error("registerDeveloper error:", error);
    throw error;
  }

  return data;
}

/* ============================================================
   SKILLS
   ============================================================ */

export async function getAllSkills() {
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("getAllSkills error:", error);
    throw error;
  }

  return data || [];
}

/* ============================================================
   ACTIVE ASSIGNMENT
   ============================================================ */

/*
  IMPORTANT:

  Do NOT filter assignment status inside Supabase here.

  The database currently contains values such as:

      ASSIGNED
      IN_PROGRESS
      SUBMITTED
      UNDER_REVIEW
      CHANGES_REQUESTED

  while the frontend works with lowercase values.

  We therefore fetch the developer's assignments first and normalize
  the status in JavaScript.

  This also avoids relying on a nested `opportunities` relationship
  just to determine whether the developer has an active assignment.
*/

export async function getMyActiveAssignment() {
  const profile = await getCurrentDeveloperProfile();

  if (!profile?.id) {
    console.warn(
      "getMyActiveAssignment: no developer profile found for current user"
    );

    return null;
  }

  const { data, error } = await supabase
    .from("project_assignments")
    .select("*")
    .eq("developer_id", profile.id)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("getMyActiveAssignment error:", error);
    throw error;
  }

  const assignments = Array.isArray(data) ? data : [];

  const activeAssignment = assignments.find((assignment) =>
    isActiveAssignment(assignment)
  );

  if (!activeAssignment) {
    return null;
  }

  return {
    ...activeAssignment,
    status: normalizeStatus(activeAssignment.status),
  };
}

export async function hasActiveAssignment() {
  const assignment = await getMyActiveAssignment();

  return Boolean(assignment);
}

/* ============================================================
   OPPORTUNITIES
   ============================================================ */

export async function getOpenOpportunities() {
  const { data, error } = await supabase
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
      status,
      assigned_developer_id,
      assigned_at,
      created_at,
      updated_at
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getOpenOpportunities error:", error);
    throw error;
  }

  return (data || []).map((opportunity) => ({
    ...opportunity,
    status: normalizeStatus(opportunity.status),
    required_roles: asArray(opportunity.required_roles),
    required_skills: asArray(opportunity.required_skills),
    tech_stack: asArray(opportunity.tech_stack),
    deliverables: asArray(opportunity.deliverables),
  }));
}

export async function getOpportunityById(opportunityId) {
  if (!opportunityId) {
    return null;
  }

  const { data, error } = await supabase
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
      status,
      assigned_developer_id,
      assigned_at,
      created_at,
      updated_at
    `)
    .eq("id", opportunityId)
    .maybeSingle();

  if (error) {
    console.error("getOpportunityById error:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    status: normalizeStatus(data.status),
    required_roles: asArray(data.required_roles),
    required_skills: asArray(data.required_skills),
    tech_stack: asArray(data.tech_stack),
    deliverables: asArray(data.deliverables),
  };
}

export async function getOpportunityAssignment(opportunityId) {
  if (!opportunityId) {
    return null;
  }

  const { data, error } = await supabase
    .from("project_assignments")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getOpportunityAssignment error:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    status: normalizeStatus(data.status),
  };
}

/* ============================================================
   APPLICATIONS
   ============================================================ */

export async function getExistingApplication(opportunityId) {
  const profile = await getCurrentDeveloperProfile();

  if (!profile?.id || !opportunityId) {
    return null;
  }

  const { data, error } = await supabase
    .from("opportunity_applications")
    .select("*")
    .eq("developer_id", profile.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (error) {
    console.error("getExistingApplication error:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    status: normalizeStatus(data.status),
  };
}

export async function applyToOpportunity({
  opportunityId,
  developerId,
  coverMessage = "",
  estimatedDays = null,
}) {
  const profile = await getCurrentDeveloperProfile();

  if (!profile?.id) {
    throw new Error("Developer profile not found");
  }

  const resolvedDeveloperId = developerId || profile.id;

  if (resolvedDeveloperId !== profile.id) {
    throw new Error("Developer identity mismatch");
  }

  if (normalizeStatus(profile.status) !== "approved") {
    throw new Error("Your developer profile is not approved");
  }

  /*
    A developer can have multiple applications,
    but only ONE active assignment.
  */
  const activeAssignment = await getMyActiveAssignment();

  if (activeAssignment) {
    throw new Error(
      "You already have an active project assignment. Complete it before applying for another project."
    );
  }

  const opportunity = await getOpportunityById(opportunityId);

  if (!opportunity) {
    throw new Error("Opportunity not found");
  }

  if (normalizeStatus(opportunity.status) !== "open") {
    throw new Error("This opportunity is no longer open");
  }

  if (opportunity.assigned_developer_id) {
    throw new Error("This opportunity has already been assigned");
  }

  const existingAssignment = await getOpportunityAssignment(opportunityId);

  if (existingAssignment) {
    throw new Error("This opportunity has already been assigned");
  }

  const existingApplication = await getExistingApplication(opportunityId);

  if (existingApplication) {
    throw new Error("You have already applied to this opportunity");
  }

  const normalizedCoverMessage =
    normalizeOptionalText(coverMessage) || "";

  const normalizedEstimatedDays =
    normalizeOptionalNumber(estimatedDays);

  /*
    Use the existing database RPC so application creation
    remains atomic and follows the database rules.
  */
  const { data, error } = await supabase.rpc("apply_to_opportunity", {
    p_opportunity_id: opportunityId,
    p_cover_message: normalizedCoverMessage,
    p_estimated_days: normalizedEstimatedDays,
  });

  if (error) {
    console.error("applyToOpportunity RPC error:", error);
    throw error;
  }

  return {
    success: true,
    application: data?.application || data || null,
    assignment: data?.assignment || null,
    result: data,
  };
}

export async function getMyApplications() {
  const profile = await getCurrentDeveloperProfile();

  if (!profile?.id) {
    return [];
  }

  const { data, error } = await supabase
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
        status,
        assigned_developer_id,
        assigned_at
      )
    `)
    .eq("developer_id", profile.id)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("getMyApplications error:", error);
    throw error;
  }

  return (data || []).map((application) => ({
    ...application,

    status: normalizeStatus(application.status),

    opportunity: application.opportunities
      ? {
          ...application.opportunities,
          status: normalizeStatus(
            application.opportunities.status
          ),
          required_roles: asArray(
            application.opportunities.required_roles
          ),
          required_skills: asArray(
            application.opportunities.required_skills
          ),
          tech_stack: asArray(
            application.opportunities.tech_stack
          ),
          deliverables: asArray(
            application.opportunities.deliverables
          ),
        }
      : null,
  }));
}

/* ============================================================
   CURRENT PROJECT
   ============================================================ */

/*
  ROBUST ASSIGNMENT FLOW

  We intentionally do NOT do this:

      project_assignments
        -> opportunities
        -> determine active assignment

  Instead:

      1. Find developer profile.
      2. Find assignment directly using developer_id.
      3. Normalize assignment status.
      4. Determine active assignment.
      5. Fetch opportunity separately using opportunity_id.
      6. Merge the two objects.

  Therefore even if the Supabase foreign-key relationship or nested
  select changes, assignment detection still works.
*/

export async function getMyCurrentAssignment() {
  const profile = await getCurrentDeveloperProfile();

  if (!profile?.id) {
    console.warn(
      "getMyCurrentAssignment: developer profile not found"
    );

    return null;
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("project_assignments")
    .select("*")
    .eq("developer_id", profile.id)
    .order("assigned_at", { ascending: false });

  if (assignmentError) {
    console.error(
      "getMyCurrentAssignment assignment query error:",
      assignmentError
    );

    throw assignmentError;
  }

  const allAssignments = Array.isArray(assignments)
    ? assignments
    : [];

  /*
    This is the critical part.

    The database currently returns:

        ASSIGNED

    but the frontend works with:

        assigned

    isActiveAssignment() normalizes the value internally.
  */
  const assignment = allAssignments.find((item) =>
    isActiveAssignment(item)
  );

  if (!assignment) {
    return null;
  }

  const normalizedAssignment = {
    ...assignment,
    assignment_id: assignment.id,
    status: normalizeStatus(assignment.status),
  };

  if (!assignment.opportunity_id) {
    console.error(
      "Active assignment exists without opportunity_id:",
      assignment
    );

    return {
      ...normalizedAssignment,

      opportunity_id: null,

      title: "Assigned Project",
      description: "",
      category: "",
      project_type: "",
      deadline: null,
      application_deadline: null,
      budget: null,
      freelancer_payout: null,

      required_roles: [],
      required_skills: [],
      tech_stack: [],
      deliverables: [],

      assigned_developer_id: assignment.developer_id,
      opportunity_status: "assigned",

      opportunity: null,
      opportunities: null,
    };
  }

  /*
    Fetch the opportunity separately.
  */
  const opportunity = await getOpportunityById(
    assignment.opportunity_id
  );

  if (!opportunity) {
    console.warn(
      "Assignment exists but its opportunity could not be loaded:",
      {
        assignmentId: assignment.id,
        opportunityId: assignment.opportunity_id,
      }
    );

    /*
      Still return the assignment.

      This is important: the dashboard should know that a project
      exists even if opportunity data temporarily fails to load.
    */
    return {
      ...normalizedAssignment,

      assignment_id: assignment.id,
      opportunity_id: assignment.opportunity_id,

      title: "Assigned Project",
      description: "",
      category: "",
      project_type: "",
      deadline: null,
      application_deadline: null,
      budget: null,
      freelancer_payout: null,

      required_roles: [],
      required_skills: [],
      tech_stack: [],
      deliverables: [],

      assigned_developer_id: assignment.developer_id,
      opportunity_status: "assigned",

      opportunity: null,
      opportunities: null,
    };
  }

  /*
    Return a flattened object because existing dashboard components
    expect both assignment fields and opportunity fields directly.
  */
  return {
    ...normalizedAssignment,

    /* Assignment */
    assignment_id: assignment.id,
    developer_id: assignment.developer_id,
    assigned_by: assignment.assigned_by,
    assigned_at: assignment.assigned_at,
    started_at: assignment.started_at,
    completed_at: assignment.completed_at,

    /* Normalized assignment status */
    status: normalizeStatus(assignment.status),

    /* Opportunity */
    opportunity_id: opportunity.id,
    title: opportunity.title || "Untitled Project",
    description: opportunity.description || "",
    category: opportunity.category || "",
    project_type: opportunity.project_type || "",

    deadline: opportunity.deadline || null,
    application_deadline:
      opportunity.application_deadline || null,

    budget: opportunity.budget ?? null,
    freelancer_payout:
      opportunity.freelancer_payout ?? null,

    required_roles: asArray(opportunity.required_roles),
    required_skills: asArray(opportunity.required_skills),
    tech_stack: asArray(opportunity.tech_stack),
    deliverables: asArray(opportunity.deliverables),

    assigned_developer_id:
      opportunity.assigned_developer_id ||
      assignment.developer_id,

    opportunity_status:
      normalizeStatus(opportunity.status),

    /*
      Preserve both names for compatibility with existing code.
    */
    opportunity,
    opportunities: opportunity,
  };
}

/* ============================================================
   SUBMISSIONS
   ============================================================ */

export async function submitWork({
  assignmentId,
  githubUrl,
  notes = "",
  zipPath = null,
}) {
  if (!assignmentId) {
    throw new Error("Assignment ID is required");
  }

  return submitProject({
    assignmentId,
    githubUrl,
    submissionNotes: notes,
    zipPath,
  });
}

export async function getMyLatestSubmission(assignmentId) {
  if (!assignmentId) {
    return null;
  }

  const submission = await getMySubmission(assignmentId);

  return submission || null;
}

export async function getMySubmissions() {
  return getDeveloperSubmissions();
}

/* ============================================================
   ADMIN — DEVELOPERS
   ============================================================ */

export async function getAllDevelopers() {
  await requireAdmin();

  const { data, error } = await supabase
    .from("developer_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllDevelopers error:", error);
    throw error;
  }

  return (data || []).map((developer) => ({
    ...developer,
    status: normalizeStatus(developer.status),
    primary_roles: asArray(developer.primary_roles),
  }));
}

export async function getDeveloperWorkload(developerId) {
  await requireAdmin();

  if (!developerId) {
    return {
      active: 0,
      completed: 0,
      assignments: [],
    };
  }

  const { data, error } = await supabase
    .from("project_assignments")
    .select(`
      *,
      opportunities (
        id,
        title,
        status
      )
    `)
    .eq("developer_id", developerId)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("getDeveloperWorkload error:", error);
    throw error;
  }

  const assignments = data || [];

  const activeAssignments = assignments.filter((assignment) =>
    isActiveAssignment(assignment)
  );

  const completedAssignments = assignments.filter((assignment) =>
    isCompletedAssignment(assignment)
  );

  return {
    active: activeAssignments.length,
    completed: completedAssignments.length,
    assignments: assignments.map((assignment) => ({
      ...assignment,
      status: normalizeStatus(assignment.status),
      opportunity: assignment.opportunities || null,
    })),
  };
}

export async function getAllDeveloperWorkloads() {
  await requireAdmin();

  const { data, error } = await supabase
    .from("project_assignments")
    .select(`
      *,
      opportunities (
        id,
        title,
        status
      )
    `)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("getAllDeveloperWorkloads error:", error);
    throw error;
  }

  const workloadMap = new Map();

  for (const assignment of data || []) {
    const developerId = assignment.developer_id;

    if (!developerId) {
      continue;
    }

    if (!workloadMap.has(developerId)) {
      workloadMap.set(developerId, {
        developer_id: developerId,
        active: 0,
        completed: 0,
        assignments: [],
      });
    }

    const workload = workloadMap.get(developerId);

    const normalizedAssignment = {
      ...assignment,
      status: normalizeStatus(assignment.status),
      opportunity: assignment.opportunities || null,
    };

    workload.assignments.push(normalizedAssignment);

    if (isActiveAssignment(assignment)) {
      workload.active += 1;
    }

    if (isCompletedAssignment(assignment)) {
      workload.completed += 1;
    }
  }

  return Array.from(workloadMap.values());
}

/* ============================================================
   ADMIN — DEVELOPER STATUS
   ============================================================ */

export async function updateDeveloperStatus(
  developerId,
  status
) {
  await requireAdmin();

  if (!developerId) {
    throw new Error("Developer ID is required");
  }

  const normalizedStatus = normalizeStatus(status);

  if (!DEVELOPER_STATUSES.has(normalizedStatus)) {
    throw new Error(
      `Invalid developer status: ${status}`
    );
  }

  const { data, error } = await supabase
    .from("developer_profiles")
    .update({
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", developerId)
    .select("*")
    .single();

  if (error) {
    console.error("updateDeveloperStatus error:", error);
    throw error;
  }

  return {
    ...data,
    status: normalizeStatus(data.status),
  };
}

export async function removeUnusedDeveloper(developerId) {
  await requireAdmin();

  if (!developerId) {
    throw new Error("Developer ID is required");
  }

  const { data: assignments, error: assignmentError } =
    await supabase
      .from("project_assignments")
      .select("id, status, completed_at")
      .eq("developer_id", developerId);

  if (assignmentError) {
    throw assignmentError;
  }

  const hasAssignments = (assignments || []).length > 0;

  if (hasAssignments) {
    throw new Error(
      "Developer cannot be removed because project assignments exist."
    );
  }

  const { error } = await supabase
    .from("developer_profiles")
    .delete()
    .eq("id", developerId);

  if (error) {
    console.error("removeUnusedDeveloper error:", error);
    throw error;
  }

  return {
    success: true,
    developerId,
  };
}

/* ============================================================
   ADMIN — ASSIGNMENTS
   ============================================================ */

export async function getAllAssignments() {
  await requireAdmin();

  const { data, error } = await supabase
    .from("project_assignments")
    .select(`
      *,
      opportunities (
        id,
        title,
        description,
        category,
        project_type,
        status,
        deadline,
        freelancer_payout
      ),
      developer_profiles (
        id,
        full_name,
        email,
        status
      )
    `)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("getAllAssignments error:", error);
    throw error;
  }

  return (data || []).map((assignment) => ({
    ...assignment,

    status: normalizeStatus(assignment.status),

    opportunity: assignment.opportunities || null,
    developer: assignment.developer_profiles || null,
  }));
}

/* ============================================================
   ADMIN / REVIEWER — REVIEW SUBMISSION
   ============================================================ */

export async function reviewSubmission({
  submissionId,
  status,
  reviewMessage = "",
}) {
  const { user } = await requireAdminOrReviewer();

  if (!submissionId) {
    throw new Error("Submission ID is required");
  }

  const normalizedStatus = normalizeStatus(status);

  if (!SUBMISSION_REVIEW_STATUSES.has(normalizedStatus)) {
    throw new Error(
      "Invalid review status. Allowed: completed, rejected, changes_requested."
    );
  }

  /*
    Load submission and its assignment.
  */
  const { data: submission, error: submissionError } =
    await supabase
      .from("project_submissions")
      .select(`
        *,
        project_assignments (
          id,
          opportunity_id,
          developer_id,
          status,
          completed_at
        )
      `)
      .eq("id", submissionId)
      .maybeSingle();

  if (submissionError) {
    console.error(
      "reviewSubmission load error:",
      submissionError
    );

    throw submissionError;
  }

  if (!submission) {
    throw new Error("Submission not found");
  }

  const assignment =
    submission.project_assignments;

  if (!assignment) {
    throw new Error(
      "The submission is not linked to a project assignment"
    );
  }

  if (isCompletedAssignment(assignment)) {
    throw new Error(
      "This project has already been completed and cannot be reviewed again."
    );
  }

  const normalizedReviewMessage =
    normalizeOptionalText(reviewMessage);

  /*
    Update submission first.
  */
  const { data: updatedSubmission, error: updateError } =
    await supabase
      .from("project_submissions")
      .update({
        status: normalizedStatus,
        review_message: normalizedReviewMessage,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", submissionId)
      .select("*")
      .single();

  if (updateError) {
    console.error(
      "reviewSubmission submission update error:",
      updateError
    );

    throw updateError;
  }

  /*
    COMPLETED
  */
  if (normalizedStatus === "completed") {
    const { error: assignmentError } = await supabase
      .from("project_assignments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);

    if (assignmentError) {
      console.error(
        "reviewSubmission assignment completion error:",
        assignmentError
      );

      throw assignmentError;
    }

    const { error: opportunityError } = await supabase
      .from("opportunities")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.opportunity_id);

    if (opportunityError) {
      console.error(
        "reviewSubmission opportunity completion error:",
        opportunityError
      );

      throw opportunityError;
    }
  }

  /*
    CHANGES REQUESTED / REJECTED

    The project becomes active again and the developer can
    submit another version.
  */
  if (
    normalizedStatus === "changes_requested" ||
    normalizedStatus === "rejected"
  ) {
    const { error: assignmentError } = await supabase
      .from("project_assignments")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);

    if (assignmentError) {
      console.error(
        "reviewSubmission assignment reset error:",
        assignmentError
      );

      throw assignmentError;
    }

    /*
      Do not change the opportunity back to open.

      The developer still owns the assignment.
    */
  }

  return {
    success: true,
    submission: updatedSubmission,
    assignmentId: assignment.id,
    status: normalizedStatus,
  };
}

/* ============================================================
   DELETE SUBMISSION
   ============================================================ */

export async function deleteSubmission(submissionId) {
  if (!submissionId) {
    throw new Error("Submission ID is required");
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const developerProfile =
    await getCurrentDeveloperProfile();

  if (!developerProfile?.id) {
    throw new Error("Developer profile not found");
  }

  const { data: submission, error: submissionError } =
    await supabase
      .from("project_submissions")
      .select(`
        *,
        project_assignments (
          id,
          developer_id,
          status,
          completed_at
        )
      `)
      .eq("id", submissionId)
      .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new Error("Submission not found");
  }

  const assignment =
    submission.project_assignments;

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  if (assignment.developer_id !== developerProfile.id) {
    throw new Error(
      "You are not authorized to delete this submission"
    );
  }

  if (isCompletedAssignment(assignment)) {
    throw new Error(
      "Completed project submissions cannot be deleted."
    );
  }

  const { error } = await supabase
    .from("project_submissions")
    .delete()
    .eq("id", submissionId);

  if (error) {
    console.error("deleteSubmission error:", error);
    throw error;
  }

  return {
    success: true,
    submissionId,
  };
}

/* ============================================================
   DATABASE DEBUG
   ============================================================ */

export async function debugDatabaseConnection() {
  console.group("EXCWA Developer Database Debug");

  try {
    const user = await getCurrentUser();

    console.log("Authenticated user:", user);

    if (!user) {
      console.warn("No authenticated user");
      return {
        success: false,
        reason: "not_authenticated",
      };
    }

    const profile =
      await getCurrentDeveloperProfile();

    console.log("Developer profile:", profile);

    const { data: opportunities, error: opportunitiesError } =
      await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

    console.log(
      "All opportunities:",
      opportunities,
      opportunitiesError
    );

    const { data: assignments, error: assignmentsError } =
      await supabase
        .from("project_assignments")
        .select("*")
        .order("assigned_at", { ascending: false });

    console.log(
      "All assignments:",
      assignments,
      assignmentsError
    );

    let developerAssignments = [];

    if (profile?.id) {
      const { data, error } = await supabase
        .from("project_assignments")
        .select("*")
        .eq("developer_id", profile.id)
        .order("assigned_at", { ascending: false });

      developerAssignments = data || [];

      console.log(
        "Current developer assignments:",
        developerAssignments,
        error
      );
    }

    const activeAssignment =
      await getMyActiveAssignment();

    console.log(
      "Resolved active assignment:",
      activeAssignment
    );

    const currentAssignment =
      await getMyCurrentAssignment();

    console.log(
      "Resolved current assignment:",
      currentAssignment
    );

    const openOpportunities =
      await getOpenOpportunities();

    console.log(
      "Open opportunities:",
      openOpportunities
    );

    return {
      success: true,
      user,
      profile,
      opportunities,
      assignments,
      developerAssignments,
      activeAssignment,
      currentAssignment,
      openOpportunities,
    };
  } catch (error) {
    console.error(
      "debugDatabaseConnection error:",
      error
    );

    return {
      success: false,
      error,
    };
  } finally {
    console.groupEnd();
  }
}

/* ============================================================
   DEFAULT EXPORT
   ============================================================ */

export default {
  /* Auth */
  getCurrentUser,
  getCurrentUserRole,

  /* Developer */
  getCurrentDeveloperProfile,
  registerDeveloper,
  getAllSkills,

  /* Assignments */
  getMyActiveAssignment,
  hasActiveAssignment,
  getMyCurrentAssignment,
  getOpportunityAssignment,

  /* Opportunities */
  getOpenOpportunities,
  getOpportunityById,

  /* Applications */
  getExistingApplication,
  applyToOpportunity,
  getMyApplications,

  /* Submissions */
  submitWork,
  getMyLatestSubmission,
  getMySubmission,
  getMySubmissions,

  /* Admin */
  getAllDevelopers,
  getDeveloperWorkload,
  getAllDeveloperWorkloads,
  updateDeveloperStatus,
  removeUnusedDeveloper,
  getAllAssignments,

  /* Review */
  reviewSubmission,
  deleteSubmission,

  /* Debug */
  debugDatabaseConnection,
};