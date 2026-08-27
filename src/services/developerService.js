import { supabase } from "../lib/supabase";

import {
  submitProject,
  getMySubmission,
  getMySubmissions as getDeveloperSubmissions,
} from "./developer/developerSubmissionService";

/* =========================================================
   EXCWA DEVELOPER SERVICE
========================================================= */

/* =========================================================
   CONSTANTS
========================================================= */

const ACTIVE_ASSIGNMENT_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "submitted",
  "under_review",
  "changes_requested",
];

const COMPLETED_ASSIGNMENT_STATUSES = [
  "completed",
];

const DEVELOPER_STATUSES = [
  "pending",
  "approved",
  "rejected",
];

const SUBMISSION_REVIEW_STATUSES = [
  "completed",
  "rejected",
  "changes_requested",
];

/* =========================================================
   AUTH HELPERS
========================================================= */

async function getCurrentUser() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    console.error(
      "EXCWA: Failed to get current user:",
      error
    );

    throw error;
  }

  if (!data?.user) {
    throw new Error("You must be signed in.");
  }

  return data.user;
}

async function getCurrentUserRole() {
  const user = await getCurrentUser();

  return (
    user.app_metadata?.role ||
    user.user_metadata?.role ||
    null
  );
}

async function requireAdmin() {
  const role = await getCurrentUserRole();

  if (role !== "admin") {
    throw new Error(
      "You are not authorized to perform this action."
    );
  }

  return role;
}

async function requireAdminOrReviewer() {
  const role = await getCurrentUserRole();

  if (
    role !== "admin" &&
    role !== "reviewer"
  ) {
    throw new Error(
      "You are not authorized to perform this action."
    );
  }

  return role;
}

/* =========================================================
   SMALL HELPERS
========================================================= */

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeOptionalNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeOptionalText(value) {
  const text = String(value || "").trim();

  return text || null;
}

function isActiveAssignment(assignment) {
  if (!assignment) {
    return false;
  }

  return (
    ACTIVE_ASSIGNMENT_STATUSES.includes(
      normalizeStatus(assignment.status)
    ) &&
    !assignment.completed_at
  );
}

function isCompletedAssignment(assignment) {
  if (!assignment) {
    return false;
  }

  return (
    COMPLETED_ASSIGNMENT_STATUSES.includes(
      normalizeStatus(assignment.status)
    ) ||
    Boolean(assignment.completed_at)
  );
}

/* =========================================================
   PROFILE IMAGE HELPER
========================================================= */

/**
 * Converts a stored profile photo path into a usable
 * public URL when possible.
 *
 * Expected storage bucket:
 * developer-profile-photos
 *
 * If profile_photo_url already exists, it is preferred.
 */
function resolveProfilePhotoUrl(profile) {
  if (!profile) {
    return null;
  }

  /* -------------------------------------------------------
     EXISTING URL
  ------------------------------------------------------- */

  if (
    profile.profile_photo_url &&
    String(profile.profile_photo_url).trim()
  ) {
    return profile.profile_photo_url;
  }

  /* -------------------------------------------------------
     STORAGE PATH
  ------------------------------------------------------- */

  if (
    profile.profile_photo_path &&
    String(profile.profile_photo_path).trim()
  ) {
    const {
      data,
    } = supabase.storage
      .from("developer-profile-photos")
      .getPublicUrl(
        profile.profile_photo_path
      );

    return data?.publicUrl || null;
  }

  return null;
}

/**
 * Adds a normalized profile_photo_url to a developer.
 */
function normalizeDeveloperProfile(
  profile,
  email = null
) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,

    email:
      email ||
      profile.email ||
      null,

    profile_photo_url:
      resolveProfilePhotoUrl(profile),
  };
}

/**
 * Normalize an array of developer profiles.
 */
function normalizeDeveloperProfiles(
  developers
) {
  return asArray(developers).map(
    (developer) =>
      normalizeDeveloperProfile(
        developer
      )
  );
}

/* =========================================================
   CURRENT DEVELOPER PROFILE
========================================================= */
export async function getCurrentDeveloperProfile() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      user_id,
      full_name,
      phone,
      city,

      profile_photo_url,

      resume_path,
      resume_url,

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
      "EXCWA: Developer profile query failed:",
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

/* =========================================================
   REGISTRATION
========================================================= */

export async function registerDeveloper({
  full_name,
  email,
  password,
}) {
  const name =
    String(full_name || "").trim();

  const userEmail =
    String(email || "").trim();

  if (!name) {
    throw new Error(
      "Full name is required."
    );
  }

  if (!userEmail) {
    throw new Error(
      "Email is required."
    );
  }

  if (!password) {
    throw new Error(
      "Password is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email: userEmail,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    console.error(
      "EXCWA: Developer registration failed:",
      error
    );

    throw error;
  }

  return {
    user: data?.user || null,

    emailConfirmationRequired:
      !data?.session,
  };
}

/* =========================================================
   SKILLS
========================================================= */

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
    console.error(
      "EXCWA: Failed to load skills:",
      error
    );

    throw error;
  }

  return asArray(data);
}

/* =========================================================
   ACTIVE ASSIGNMENT
========================================================= */

export async function getMyActiveAssignment() {
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
      developer_id,
      assigned_by,
      assigned_at,
      started_at,
      completed_at,
      status,
      payment_status,
      reviewer_id,
      reviewer_notes,
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
    .order("assigned_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "EXCWA: Failed to load active assignment:",
      error
    );

    throw error;
  }

  return data || null;
}

export async function hasActiveAssignment() {
  const assignment =
    await getMyActiveAssignment();

  return Boolean(assignment);
}

/* =========================================================
   OPEN OPPORTUNITIES
========================================================= */

export async function getOpenOpportunities() {
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
      budget,
      freelancer_payout,
      deadline,
      application_deadline,
      status,
      assigned_developer_id,
      created_at,
      updated_at
    `)
    .eq("status", "open")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "EXCWA: Failed to load open opportunities:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load available opportunities."
    );
  }

  return asArray(data);
}

/* =========================================================
   OPPORTUNITY BY ID
========================================================= */

export async function getOpportunityById(
  opportunityId
) {
  if (!opportunityId) {
    throw new Error(
      "Opportunity ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .maybeSingle();

  if (error) {
    console.error(
      "EXCWA: Failed to load opportunity:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Opportunity not found."
    );
  }

  return data;
}

/* =========================================================
   OPPORTUNITY ASSIGNMENT
========================================================= */

async function getOpportunityAssignment(
  opportunityId
) {
  if (!opportunityId) {
    return null;
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
      status,
      assigned_at,
      completed_at
    `)
    .eq(
      "opportunity_id",
      opportunityId
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "EXCWA: Failed to check opportunity assignment:",
      error
    );

    throw error;
  }

  return data || null;
}

/* =========================================================
   EXISTING APPLICATION
========================================================= */

async function getExistingApplication(
  developerId,
  opportunityId
) {
  if (
    !developerId ||
    !opportunityId
  ) {
    return null;
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
      status,
      applied_at
    `)
    .eq(
      "developer_id",
      developerId
    )
    .eq(
      "opportunity_id",
      opportunityId
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "EXCWA: Failed to check existing application:",
      error
    );

    throw error;
  }

  return data || null;
}

/* =========================================================
   APPLY TO OPPORTUNITY
========================================================= */

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

  /* -------------------------------------------------------
     APPROVAL CHECK
  ------------------------------------------------------- */

  const developerStatus =
    normalizeStatus(
      developer.status
    );

  if (
    developerStatus !==
    "approved"
  ) {
    throw new Error(
      "Only approved developers can apply for opportunities."
    );
  }

  /* -------------------------------------------------------
     ONE ACTIVE PROJECT PER DEVELOPER
  ------------------------------------------------------- */

  const activeAssignment =
    await getMyActiveAssignment();

  if (activeAssignment) {
    throw new Error(
      "You already have an active project. Complete the current project before applying for another opportunity."
    );
  }

  /* -------------------------------------------------------
     OPPORTUNITY VALIDATION
  ------------------------------------------------------- */

  const opportunity =
    await getOpportunityById(
      opportunityId
    );

  const opportunityStatus =
    normalizeStatus(
      opportunity.status
    );

  if (
    opportunityStatus !==
    "open"
  ) {
    throw new Error(
      "This opportunity is no longer open."
    );
  }

  if (
    opportunity.assigned_developer_id
  ) {
    throw new Error(
      "This opportunity has already been assigned to another developer."
    );
  }

  /* -------------------------------------------------------
     ASSIGNMENT SAFETY CHECK
  ------------------------------------------------------- */

  const existingAssignment =
    await getOpportunityAssignment(
      opportunityId
    );

  if (existingAssignment) {
    throw new Error(
      "This opportunity has already been assigned to another developer."
    );
  }

  /* -------------------------------------------------------
     DUPLICATE APPLICATION CHECK
  ------------------------------------------------------- */

  const existingApplication =
    await getExistingApplication(
      developer.id,
      opportunityId
    );

  if (existingApplication) {
    throw new Error(
      "You have already applied for this opportunity."
    );
  }

  /* -------------------------------------------------------
     NORMALIZE INPUT
  ------------------------------------------------------- */

  const normalizedCoverMessage =
    normalizeOptionalText(
      coverMessage
    );

  const normalizedEstimatedDays =
    normalizeOptionalNumber(
      estimatedDays
    );

  /* -------------------------------------------------------
     APPLY THROUGH RPC
  ------------------------------------------------------- */

  const {
    data,
    error,
  } = await supabase.rpc(
    "apply_to_opportunity",
    {
      p_opportunity_id:
        opportunityId,

      p_cover_message:
        normalizedCoverMessage,

      p_estimated_days:
        normalizedEstimatedDays,
    }
  );

  if (error) {
    console.error(
      "EXCWA: apply_to_opportunity RPC failed:",
      error
    );

    throw error;
  }

  if (
    data === null ||
    data === undefined
  ) {
    throw new Error(
      "Application could not be created."
    );
  }

  if (
    typeof data === "object" &&
    data.success === false
  ) {
    throw new Error(
      data.message ||
        "Unable to apply for this opportunity."
    );
  }

  return {
    ...(typeof data ===
    "object"
      ? data
      : {}),

    success: true,

    application:
      data?.application ||
      null,

    assignment:
      data?.assignment ||
      null,
  };
}

/* =========================================================
   MY APPLICATIONS
========================================================= */

export async function getMyApplications() {
  const developer =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from(
      "opportunity_applications"
    )
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
    .order("applied_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "EXCWA: Failed to load applications:",
      error
    );

    throw error;
  }

  return asArray(data);
}

/* =========================================================
   CURRENT ASSIGNMENT WITH OPPORTUNITY
========================================================= */

export async function getMyCurrentAssignment() {
  const developer =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from(
      "project_assignments"
    )
    .select(`
      id,
      opportunity_id,
      developer_id,
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
        assigned_developer_id,
        status
      )
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
    .order("assigned_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "EXCWA: Failed to load current assignment:",
      error
    );

    throw error;
  }

  if (!data) {
    return null;
  }

  const opportunity =
    data.opportunities ||
    {};

  return {
    ...data,

    assignment_id:
      data.id,

    status:
      data.status ||
      "assigned",

    opportunity_id:
      data.opportunity_id ||
      opportunity.id ||
      null,

    title:
      opportunity.title ||
      null,

    description:
      opportunity.description ||
      null,

    category:
      opportunity.category ||
      null,

    project_type:
      opportunity.project_type ||
      null,

    deadline:
      opportunity.deadline ||
      null,

    application_deadline:
      opportunity.application_deadline ||
      null,

    budget:
      opportunity.budget ??
      null,

    freelancer_payout:
      opportunity.freelancer_payout ??
      null,

    required_roles:
      opportunity.required_roles ||
      [],

    required_skills:
      opportunity.required_skills ||
      [],

    tech_stack:
      opportunity.tech_stack ||
      [],

    deliverables:
      opportunity.deliverables ||
      null,

    assigned_developer_id:
      opportunity.assigned_developer_id ||
      null,

    opportunity_status:
      opportunity.status ||
      null,

    opportunities:
      data.opportunities ||
      null,
  };
}

/* =========================================================
   SUBMIT WORK
========================================================= */

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
    submissionNotes:
      notes,
    zipPath,
  });
}

/* =========================================================
   SUBMISSIONS
========================================================= */

export { getMySubmission };

export async function getMySubmissions() {
  return getDeveloperSubmissions();
}

/* =========================================================
   ADMIN: ALL DEVELOPERS
========================================================= */

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

      profile_photo_path,
      profile_photo_url,

      resume_path,
      resume_url,

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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "EXCWA: Failed to load developers:",
      error
    );

    throw error;
  }

  return normalizeDeveloperProfiles(
    data
  );
}

/* =========================================================
   ADMIN: DEVELOPER WORKLOAD
========================================================= */

export async function getDeveloperWorkload(
  developerId
) {
  await requireAdmin();

  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  /* -------------------------------------------------------
     DEVELOPER
  ------------------------------------------------------- */

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

      profile_photo_path,
      profile_photo_url,

      resume_path,
      resume_url,

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

  const normalizedDeveloper =
    normalizeDeveloperProfile(
      developer
    );

  /* -------------------------------------------------------
     ASSIGNMENTS
  ------------------------------------------------------- */

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from(
      "project_assignments"
    )
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
    .order("assigned_at", {
      ascending: false,
    });

  if (assignmentError) {
    throw assignmentError;
  }

  const allAssignments =
    asArray(assignments);

  const currentProjects =
    allAssignments.filter(
      isActiveAssignment
    );

  const completedProjects =
    allAssignments.filter(
      isCompletedAssignment
    );

  return {
    developer:
      normalizedDeveloper,

    totalProjects:
      allAssignments.length,

    completedProjects:
      completedProjects.length,

    currentProjects:
      currentProjects.length,

    isBusy:
      currentProjects.length >
      0,

    isAvailable:
      currentProjects.length ===
      0,

    hasWorked:
      allAssignments.length >
      0,

    assignments:
      allAssignments,
  };
}

/* =========================================================
   ADMIN: ALL DEVELOPER WORKLOADS
========================================================= */

export async function getAllDeveloperWorkloads() {
  await requireAdmin();

  const developers =
    await getAllDevelopers();

  const {
    data: assignments,
    error,
  } = await supabase
    .from(
      "project_assignments"
    )
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
    .order("assigned_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  const assignmentList =
    asArray(assignments);

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
          isActiveAssignment
        );

      const completedProjects =
        developerAssignments.filter(
          isCompletedAssignment
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
          currentProjects.length >
          0,

        isAvailable:
          currentProjects.length ===
          0,

        hasWorked:
          developerAssignments.length >
          0,

        assignments:
          developerAssignments,
      };
    }
  );
}

/* =========================================================
   ADMIN: UPDATE DEVELOPER STATUS
========================================================= */

export async function updateDeveloperStatus(
  devProfileId,
  status,
  rejectionReason = null
) {
  await requireAdmin();

  if (!devProfileId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  if (
    !DEVELOPER_STATUSES.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid developer status."
    );
  }

  const normalizedReason =
    normalizeOptionalText(
      rejectionReason
    );

  const {
    data,
    error,
  } = await supabase
    .from(
      "developer_profiles"
    )
    .update({
      status,

      rejection_reason:
        status === "rejected"
          ? normalizedReason
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

  return normalizeDeveloperProfile(
    data
  );
}

/* =========================================================
   ADMIN: REMOVE UNUSED DEVELOPER
========================================================= */

export async function removeUnusedDeveloper(
  developerId
) {
  await requireAdmin();

  if (!developerId) {
    throw new Error(
      "Developer ID is required."
    );
  }

  /* -------------------------------------------------------
     PROJECT HISTORY CHECK
  ------------------------------------------------------- */

  const {
    count: assignmentCount,
    error: assignmentError,
  } = await supabase
    .from(
      "project_assignments"
    )
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "developer_id",
      developerId
    );

  if (assignmentError) {
    throw assignmentError;
  }

  if (
    (assignmentCount || 0) >
    0
  ) {
    throw new Error(
      "This developer has project history and cannot be removed."
    );
  }

  /* -------------------------------------------------------
     APPLICATION HISTORY CHECK
  ------------------------------------------------------- */

  const {
    count: applicationCount,
    error: applicationError,
  } = await supabase
    .from(
      "opportunity_applications"
    )
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "developer_id",
      developerId
    );

  if (applicationError) {
    throw applicationError;
  }

  if (
    (applicationCount || 0) >
    0
  ) {
    throw new Error(
      "This developer has application history and cannot be removed."
    );
  }

  /* -------------------------------------------------------
     DELETE DEVELOPER SKILLS
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     DELETE DEVELOPER PROFILE
  ------------------------------------------------------- */

  const {
    data,
    error,
  } = await supabase
    .from(
      "developer_profiles"
    )
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

/* =========================================================
   ADMIN: ALL ASSIGNMENTS
========================================================= */

export async function getAllAssignments() {
  await requireAdmin();

  const {
    data,
    error,
  } = await supabase
    .from(
      "project_assignments"
    )
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
        city,

        profile_photo_path,
        profile_photo_url
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
    .order("assigned_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return asArray(data).map(
    (assignment) => ({
      ...assignment,

      developer_profiles:
        normalizeDeveloperProfile(
          assignment.developer_profiles
        ),
    })
  );
}

/* =========================================================
   ADMIN / REVIEWER: REVIEW SUBMISSION
========================================================= */

export async function reviewSubmission({
  submissionId,
  status,
  reviewMessage,
}) {
  const reviewerRole =
    await requireAdminOrReviewer();

  if (!submissionId) {
    throw new Error(
      "Submission ID is required."
    );
  }

  if (
    !SUBMISSION_REVIEW_STATUSES.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid submission status."
    );
  }

  const user =
    await getCurrentUser();

  /* -------------------------------------------------------
     GET SUBMISSION
  ------------------------------------------------------- */

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from(
      "project_submissions"
    )
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

  /* -------------------------------------------------------
     COMPLETED PROJECT PROTECTION
  ------------------------------------------------------- */

  if (
    assignment.completed_at ||
    assignment.status ===
      "completed"
  ) {
    throw new Error(
      "This project has already been completed."
    );
  }

  /* -------------------------------------------------------
     UPDATE SUBMISSION
  ------------------------------------------------------- */

  const reviewedAt =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from(
      "project_submissions"
    )
    .update({
      status,

      review_message:
        normalizeOptionalText(
          reviewMessage
        ),

      reviewed_at:
        reviewedAt,

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

  /* -------------------------------------------------------
     COMPLETED
  ------------------------------------------------------- */

  if (status === "completed") {
    const completedAt =
      new Date().toISOString();

    const {
      error: assignmentError,
    } = await supabase
      .from(
        "project_assignments"
      )
      .update({
        status:
          "completed",

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

  /* -------------------------------------------------------
     CHANGES REQUESTED
  ------------------------------------------------------- */

  if (
    status ===
    "changes_requested"
  ) {
    const {
      error: assignmentError,
    } = await supabase
      .from(
        "project_assignments"
      )
      .update({
        status:
          "in_progress",

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

  /* -------------------------------------------------------
     REJECTED
  ------------------------------------------------------- */

  if (status === "rejected") {
    const {
      error: assignmentError,
    } = await supabase
      .from(
        "project_assignments"
      )
      .update({
        status:
          "in_progress",

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

/* =========================================================
   ADMIN: DELETE SUBMISSION
========================================================= */

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
    .from(
      "project_submissions"
    )
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
      "Submission not found."
    );
  }

  const assignment =
    submission.project_assignments;

  if (
    assignment?.completed_at ||
    assignment?.status ===
      "completed"
  ) {
    throw new Error(
      "This submission belongs to a completed project and cannot be deleted."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "project_submissions"
    )
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
      "Submission could not be deleted."
    );
  }

  return data;
}

/* =========================================================
   DATABASE DEBUG
========================================================= */

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

  /* -------------------------------------------------------
     SESSION
  ------------------------------------------------------- */

  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabase.auth.getSession();

  console.log(
    "AUTH SESSION:",
    sessionData
  );

  console.log(
    "AUTH ERROR:",
    sessionError
  );

  /* -------------------------------------------------------
     CURRENT USER
  ------------------------------------------------------- */

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();

  console.log(
    "CURRENT USER:",
    userData?.user ||
      null
  );

  console.log(
    "CURRENT USER ERROR:",
    userError
  );

  /* -------------------------------------------------------
     DEVELOPER PROFILE
  ------------------------------------------------------- */

  let developer = null;

  if (userData?.user) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "developer_profiles"
      )
      .select(`
        id,
        user_id,
        full_name,
        phone,
        city,

        profile_photo_path,
        profile_photo_url,

        resume_path,
        resume_url,

        github_url,
        linkedin_url,
        portfolio_url,

        status,
        rejection_reason,
        primary_roles,

        created_at,
        updated_at
      `)
      .eq(
        "user_id",
        userData.user.id
      )
      .maybeSingle();

    developer = data
      ? normalizeDeveloperProfile(
          data,
          userData.user.email ||
            null
        )
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

  /* -------------------------------------------------------
     ALL OPPORTUNITIES
  ------------------------------------------------------- */

  const {
    data: opportunities,
    error:
      opportunitiesError,
  } = await supabase
    .from(
      "opportunities"
    )
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  console.log(
    "ALL OPPORTUNITIES:",
    opportunities
  );

  console.log(
    "ALL OPPORTUNITIES ERROR:",
    opportunitiesError
  );

  /* -------------------------------------------------------
     ALL ASSIGNMENTS
  ------------------------------------------------------- */

  const {
    data: assignments,
    error:
      assignmentsError,
  } = await supabase
    .from(
      "project_assignments"
    )
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
    .order("assigned_at", {
      ascending: false,
    });

  console.log(
    "PROJECT ASSIGNMENTS:",
    assignments
  );

  console.log(
    "PROJECT ASSIGNMENTS ERROR:",
    assignmentsError
  );

  /* -------------------------------------------------------
     DEVELOPER ASSIGNMENTS
  ------------------------------------------------------- */

  let developerAssignments =
    [];

  if (developer?.id) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "project_assignments"
      )
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
      .order("assigned_at", {
        ascending: false,
      });

    developerAssignments =
      asArray(data);

    console.log(
      "DEVELOPER ASSIGNMENTS:",
      data
    );

    console.log(
      "DEVELOPER ASSIGNMENTS ERROR:",
      error
    );
  }

  /* -------------------------------------------------------
     ACTIVE ASSIGNMENT
  ------------------------------------------------------- */

  let activeAssignment =
    null;

  if (developer?.id) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "project_assignments"
      )
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
      .order("assigned_at", {
        ascending: false,
      })
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

  /* -------------------------------------------------------
     OPEN OPPORTUNITIES
  ------------------------------------------------------- */

  const {
    data: openOpportunities,
    error:
      openOpportunitiesError,
  } = await supabase
    .from(
      "opportunities"
    )
    .select("*")
    .eq(
      "status",
      "open"
    )
    .order("created_at", {
      ascending: false,
    });

  console.log(
    "OPEN OPPORTUNITIES:",
    openOpportunities
  );

  console.log(
    "OPEN OPPORTUNITIES ERROR:",
    openOpportunitiesError
  );

  /* -------------------------------------------------------
     FINAL RESULT
  ------------------------------------------------------- */

  const result = {
    session:
      sessionData,

    sessionError,

    user:
      userData?.user ||
      null,

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

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getCurrentDeveloperProfile,

  getMyActiveAssignment,
  hasActiveAssignment,

  getOpenOpportunities,
  getOpportunityById,
  applyToOpportunity,

  getMyApplications,
  getMyCurrentAssignment,

  submitWork,
  getMySubmission,
  getMySubmissions,

  getAllSkills,
  registerDeveloper,

  getAllDevelopers,
  getDeveloperWorkload,
  getAllDeveloperWorkloads,

  updateDeveloperStatus,
  removeUnusedDeveloper,

  getAllAssignments,

  reviewSubmission,
  deleteSubmission,

  debugDatabaseConnection,
};