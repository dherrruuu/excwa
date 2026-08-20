import { supabase } from "../lib/supabase";

import {
  submitProject,
  getMySubmission,
  getMySubmissions as getDeveloperSubmissions,
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
- Current assignment
- Developer workload
- Project submissions
- Admin developer management
- Submission review

IMPORTANT
------------------------------------------------------------
developer_profiles DOES NOT contain email.

Developer email comes from:
    Supabase Auth -> auth.users

Developer information comes from:
    developer_profiles

Therefore NEVER request:
    developer_profiles.email
============================================================
*/


/* ==========================================================
   ASSIGNMENT STATUS DEFINITIONS
========================================================== */

const ACTIVE_ASSIGNMENT_STATUSES = [
  "assigned",
  "in_progress",
  "submitted",
  "changes_requested",
  "rejected",
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
    console.error("getCurrentUser error:", error);
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

export async function getCurrentDeveloperProfile() {
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

  return (
    user.user_metadata?.role ||
    user.app_metadata?.role ||
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
  if (!full_name?.trim()) {
    throw new Error("Full name is required.");
  }

  if (!email?.trim()) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: full_name.trim(),
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    user: data?.user || null,
    emailConfirmationRequired: !data?.session,
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
    console.error("getAllSkills error:", error);
    throw error;
  }

  return data || [];
}


/* ==========================================================
   ACTIVE ASSIGNMENT
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
    .eq("developer_id", developer.id)
    .in(
      "status",
      ACTIVE_ASSIGNMENT_STATUSES
    )
    .is("completed_at", null)
    .order("assigned_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "hasActiveAssignment error:",
      error
    );
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

  if (developer.status !== "approved") {
    return [];
  }

  const active =
    await hasActiveAssignment();

  if (active) {
    return [];
  }

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
    .eq("status", "open")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getOpenOpportunities error:",
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

  if (developer.status !== "approved") {
    throw new Error(
      "Your developer account is not approved."
    );
  }

  const active =
    await hasActiveAssignment();

  if (active) {
    throw new Error(
      "You already have an active project."
    );
  }

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
      "apply_to_opportunity RPC error:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Application could not be created."
    );
  }

  if (data.success === false) {
    throw new Error(
      data.message ||
        "Unable to apply for this opportunity."
    );
  }

  return {
    ...data,

    success:
      data.success !== false,

    application:
      data.application || null,

    assignment:
      data.assignment || null,
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
    .eq("developer_id", developer.id)
    .order("applied_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getMyApplications error:",
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
      reviewer_id,
      reviewer_notes,
      updated_at
    `)
    .eq("developer_id", developer.id)
    .in(
      "status",
      ACTIVE_ASSIGNMENT_STATUSES
    )
    .is("completed_at", null)
    .order("assigned_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (assignmentError) {
    console.error(
      "getMyCurrentAssignment assignment error:",
      assignmentError
    );

    throw assignmentError;
  }

  if (!assignment) {
    return null;
  }


  /* ========================================================
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
        "getMyCurrentAssignment opportunity error:",
        error
      );

      throw error;
    }

    opportunity = data || null;
  }


  /* ========================================================
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
    .order("submitted_at", {
      ascending: false,
    })
    .limit(1);

  if (submissionError) {
    console.error(
      "getMyCurrentAssignment submission error:",
      submissionError
    );

    throw submissionError;
  }

  const submission =
    submissions?.[0] || null;


  /* ========================================================
     FINAL RESULT
  ======================================================== */

  return {
    ...assignment,

    opportunity,

    // Compatibility with existing components
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
   SUBMISSION
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


/* ==========================================================
   MY SUBMISSIONS
========================================================== */

export { getMySubmission };

export async function getMySubmissions() {
  return getDeveloperSubmissions();
}


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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getAllDevelopers error:",
      error
    );

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
    .eq("id", developerId)
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
    .eq("developer_id", developerId)
    .order("assigned_at", {
      ascending: false,
    });

  if (assignmentError) {
    throw assignmentError;
  }

  const allAssignments =
    assignments || [];

  const currentProjects =
    allAssignments.filter(
      (assignment) =>
        ACTIVE_ASSIGNMENT_STATUSES.includes(
          assignment.status
        ) &&
        !assignment.completed_at
    );

  const completedProjects =
    allAssignments.filter(
      (assignment) =>
        COMPLETED_ASSIGNMENT_STATUSES.includes(
          assignment.status
        ) ||
        Boolean(assignment.completed_at)
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
    .order("assigned_at", {
      ascending: false,
    });

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

  if (!devProfileId) {
    throw new Error(
      "Developer ID is required."
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
    .eq("id", devProfileId)
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


  /* ========================================================
     CHECK PROJECT HISTORY
  ======================================================== */

  const {
    count: assignmentCount,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
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

  if ((assignmentCount || 0) > 0) {
    throw new Error(
      "This developer has project history and cannot be removed."
    );
  }


  /* ========================================================
     CHECK APPLICATION HISTORY
  ======================================================== */

  const {
    count: applicationCount,
    error: applicationError,
  } = await supabase
    .from("opportunity_applications")
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

  if ((applicationCount || 0) > 0) {
    throw new Error(
      "This developer has application history and cannot be removed."
    );
  }


  /* ========================================================
     DELETE SKILLS
  ======================================================== */

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


  /* ========================================================
     DELETE PROFILE
  ======================================================== */

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
    .order("assigned_at", {
      ascending: false,
    });

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


  /* ========================================================
     GET SUBMISSION
  ======================================================== */

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

  const assignment =
    submission.project_assignments;

  if (!assignment) {
    throw new Error(
      "Assignment not found."
    );
  }


  /* ========================================================
     CHECK COMPLETION
  ======================================================== */

  if (
    assignment.completed_at ||
    assignment.status === "completed"
  ) {
    throw new Error(
      "This project has already been completed."
    );
  }


  /* ========================================================
     UPDATE SUBMISSION
  ======================================================== */

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
    .eq("id", submissionId)
    .select()
    .single();

  if (error) {
    throw error;
  }


  /* ========================================================
     COMPLETED
  ======================================================== */

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


  /* ========================================================
     CHANGES REQUESTED
  ======================================================== */

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


  /* ========================================================
     REJECTED
  ======================================================== */

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
   ADMIN: DELETE SUBMISSION
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
    submission.project_assignments
      ?.completed_at ||
    submission.project_assignments
      ?.status === "completed"
  ) {
    throw new Error(
      "This submission belongs to a completed project and cannot be deleted."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("project_submissions")
    .delete()
    .eq("id", submissionId)
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


  /* ========================================================
     AUTH SESSION
  ======================================================== */

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


  /* ========================================================
     CURRENT USER
  ======================================================== */

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


  /* ========================================================
     CURRENT DEVELOPER
  ======================================================== */

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


  /* ========================================================
     OPPORTUNITIES
  ======================================================== */

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
    .order("created_at", {
      ascending: false,
    });

  console.log(
    "OPPORTUNITIES:",
    opportunities
  );

  console.log(
    "OPPORTUNITIES ERROR:",
    opportunitiesError
  );


  /* ========================================================
     ALL ASSIGNMENTS
  ======================================================== */

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


  /* ========================================================
     CURRENT DEVELOPER ASSIGNMENTS
  ======================================================== */

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
      .order("assigned_at", {
        ascending: false,
      });

    developerAssignments =
      data || [];

    console.log(
      "DEVELOPER ASSIGNMENTS:",
      data
    );

    console.log(
      "DEVELOPER ASSIGNMENTS ERROR:",
      error
    );
  }


  /* ========================================================
     ACTIVE ASSIGNMENT
  ======================================================== */

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


  /* ========================================================
     OPEN OPPORTUNITIES
  ======================================================== */

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


  /* ========================================================
     FINAL RESULT
  ======================================================== */

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
