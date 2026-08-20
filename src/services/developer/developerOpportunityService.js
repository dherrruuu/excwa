import { supabase } from "../../lib/supabase";

/*
============================================================
EXCWA DEVELOPER OPPORTUNITY SERVICE
============================================================

Responsibilities:
- Load available opportunities
- Get opportunity details
- Apply to opportunities
- Get developer applications
- Get one application
- Withdraw applications

IMPORTANT BUSINESS RULES
------------------------------------------------------------
1. Only OPEN opportunities are displayed.
2. An active assignment does NOT hide all opportunities.
3. A developer with an active assignment cannot apply.
4. A developer cannot apply twice to the same opportunity.
5. An opportunity that is already assigned cannot be applied to.
6. Final business validation should also happen in Supabase/RPC.

DATABASE RELATIONSHIP
------------------------------------------------------------
project_assignments.id
        ↓
project_submissions.assignment_id

IMPORTANT:
- project_assignments DOES NOT have assignment_id.
- project_assignments.id is the assignment ID.
- project_submissions.assignment_id stores that assignment ID.
============================================================
*/


/* =========================================================
   ACTIVE ASSIGNMENT STATUSES
========================================================= */

const ACTIVE_ASSIGNMENT_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "submitted",
  "under_review",
  "changes_requested",
];


/* =========================================================
   AUTH
========================================================= */

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(
      "getCurrentUser error:",
      error
    );

    throw error;
  }

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  return user;
}


/* =========================================================
   CURRENT DEVELOPER
========================================================= */

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
      "Developer profile query error:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Developer profile not found."
    );
  }

  return {
    ...data,
    email: user.email || null,
  };
}


/* =========================================================
   CHECK ACTIVE ASSIGNMENT
========================================================= */

/**
 * project_assignments schema:
 *
 * id
 * opportunity_id
 * developer_id
 * assigned_by
 * assigned_at
 * started_at
 * completed_at
 * payment_status
 * status
 * reviewer_id
 * reviewer_notes
 * updated_at
 *
 * IMPORTANT:
 * There is NO assignment_id column here.
 *
 * The assignment ID is:
 *
 * project_assignments.id
 */
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
      developer_id,
      opportunity_id,
      status,
      assigned_at,
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
    .order(
      "assigned_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "getMyActiveAssignment error:",
      error
    );

    throw error;
  }

  return data || null;
}


/* =========================================================
   HAS ACTIVE ASSIGNMENT
========================================================= */

export async function hasActiveAssignment() {
  const assignment =
    await getMyActiveAssignment();

  return Boolean(assignment);
}


/* =========================================================
   GET OPEN OPPORTUNITIES
=========================================================

IMPORTANT:

DO NOT check developer approval here.

DO NOT check active assignment here.

The developer should still be able to SEE available
opportunities.

Eligibility is checked when APPLY is pressed.

This prevents the dashboard from becoming empty simply
because the developer currently has an assignment.
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
      deadline,
      application_deadline,
      budget,
      freelancer_payout,
      attachment_path,
      status,
      created_at,
      updated_at
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
      "getOpenOpportunities error:",
      error
    );

    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
}


/* =========================================================
   GET OPPORTUNITY BY ID
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
    .eq(
      "id",
      opportunityId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "getOpportunityById error:",
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
   CHECK OPPORTUNITY ASSIGNMENT
========================================================= */

/**
 * project_assignments.id is the assignment ID.
 *
 * DO NOT use:
 *
 * assignment_id
 *
 * because project_assignments does not contain that column.
 */
async function getOpportunityAssignment(
  opportunityId
) {
  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      id,
      developer_id,
      opportunity_id,
      status
    `)
    .eq(
      "opportunity_id",
      opportunityId
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "getOpportunityAssignment error:",
      error
    );

    throw error;
  }

  return data || null;
}


/* =========================================================
   CHECK EXISTING APPLICATION
========================================================= */

async function getExistingApplication(
  developerId,
  opportunityId
) {
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
      "getExistingApplication error:",
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
     DEVELOPER APPROVAL
  ------------------------------------------------------- */

  const developerStatus =
    String(
      developer.status || ""
    )
      .trim()
      .toLowerCase();

  if (
    developerStatus !==
    "approved"
  ) {
    throw new Error(
      "Only approved developers can apply for opportunities."
    );
  }


  /* -------------------------------------------------------
     ACTIVE ASSIGNMENT
  ------------------------------------------------------- */

  const activeAssignment =
    await getMyActiveAssignment();

  if (activeAssignment) {
    throw new Error(
      "You already have an active project. Complete or finish the current project before applying for another opportunity."
    );
  }


  /* -------------------------------------------------------
     GET OPPORTUNITY
  ------------------------------------------------------- */

  const opportunity =
    await getOpportunityById(
      opportunityId
    );


  /* -------------------------------------------------------
     OPPORTUNITY MUST BE OPEN
  ------------------------------------------------------- */

  const opportunityStatus =
    String(
      opportunity.status || ""
    )
      .trim()
      .toLowerCase();

  if (
    opportunityStatus !==
    "open"
  ) {
    throw new Error(
      "This opportunity is no longer open."
    );
  }


  /* -------------------------------------------------------
     CHECK EXISTING ASSIGNMENT
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
     CHECK DUPLICATE APPLICATION
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
     APPLY USING DATABASE RPC
  -------------------------------------------------------

     The RPC remains the final authority for application
     creation and assignment rules.
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
        coverMessage?.trim() ||
        null,

      p_estimated_days:
        estimatedDays !== null &&
        estimatedDays !== undefined &&
        estimatedDays !== ""
          ? Number(
              estimatedDays
            )
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
    ...(
      typeof data === "object"
        ? data
        : {}
    ),

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
   GET MY APPLICATIONS
========================================================= */

export async function getMyOpportunityApplications() {
  const developer =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      opportunity:opportunities(*)
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
      "getMyOpportunityApplications error:",
      error
    );

    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
}


/* =========================================================
   GET MY APPLICATION
========================================================= */

export async function getMyApplication(
  opportunityId
) {
  if (!opportunityId) {
    throw new Error(
      "Opportunity ID is required."
    );
  }

  const developer =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      opportunity:opportunities(*)
    `)
    .eq(
      "opportunity_id",
      opportunityId
    )
    .eq(
      "developer_id",
      developer.id
    )
    .maybeSingle();

  if (error) {
    console.error(
      "getMyApplication error:",
      error
    );

    throw error;
  }

  return data || null;
}


/* =========================================================
   WITHDRAW APPLICATION
========================================================= */

export async function withdrawApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      "Application ID is required."
    );
  }

  const developer =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .update({
      status: "withdrawn",
    })
    .eq(
      "id",
      applicationId
    )
    .eq(
      "developer_id",
      developer.id
    )
    .eq(
      "status",
      "pending"
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error(
      "withdrawApplication error:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Application could not be withdrawn."
    );
  }

  return data;
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
  getMyOpportunityApplications,
  getMyApplication,
  withdrawApplication,
};