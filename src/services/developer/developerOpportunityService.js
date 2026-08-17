import { supabase } from "../../lib/supabase";

/* =========================================================
   DEVELOPER OPPORTUNITY SERVICE

   Handles:
   - Available opportunities
   - Opportunity details
   - Developer applications
   - Apply to opportunity
   - Withdraw application
   - My applications

   IMPORTANT BUSINESS RULES:
   1. Only open opportunities are shown.
   2. Already-assigned opportunities are hidden.
   3. A developer cannot apply if they already have
      an active assignment.
   4. A developer cannot apply twice to the same opportunity.
   5. The database should also enforce one assignment
      per opportunity.
========================================================= */


/* =========================================================
   GET CURRENT DEVELOPER PROFILE
========================================================= */

async function getCurrentDeveloperProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const {
    data: developer,
    error,
  } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw error;
  }

  if (!developer) {
    throw new Error(
      "Developer profile not found."
    );
  }

  return developer;
}


/* =========================================================
   CHECK WHETHER OPPORTUNITY IS ALREADY ASSIGNED
========================================================= */

async function getOpportunityAssignment(
  opportunityId
) {
  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      assignment_id,
      developer_id,
      opportunity_id
    `)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}


/* =========================================================
   CHECK WHETHER DEVELOPER ALREADY HAS AN ASSIGNMENT
========================================================= */

async function getDeveloperAssignment(
  developerId
) {
  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      assignment_id,
      developer_id,
      opportunity_id
    `)
    .eq("developer_id", developerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}


/* =========================================================
   GET OPEN OPPORTUNITIES

   Returns ONLY opportunities that:

   - have status = open
   - have NO project assignment

   This prevents an already-assigned project from being
   displayed to other developers.
========================================================= */

export async function getOpenOpportunities() {
  const {
    data: opportunities,
    error,
  } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "open")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  if (!opportunities || opportunities.length === 0) {
    return [];
  }

  /* -------------------------------------------------------
     Get opportunity IDs
  ------------------------------------------------------- */

  const opportunityIds =
    opportunities.map(
      (opportunity) => opportunity.id
    );

  /* -------------------------------------------------------
     Find opportunities that already have assignments
  ------------------------------------------------------- */

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select("opportunity_id")
    .in(
      "opportunity_id",
      opportunityIds
    );

  if (assignmentError) {
    throw assignmentError;
  }

  const assignedOpportunityIds =
    new Set(
      (assignments || []).map(
        (assignment) =>
          assignment.opportunity_id
      )
    );

  /* -------------------------------------------------------
     Only return unassigned opportunities
  ------------------------------------------------------- */

  return opportunities.filter(
    (opportunity) =>
      !assignedOpportunityIds.has(
        opportunity.id
      )
  );
}


/* =========================================================
   GET SINGLE OPPORTUNITY
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
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   APPLY TO OPPORTUNITY
========================================================= */

export async function applyToOpportunity(
  opportunityId,
  applicationData = {}
) {
  /* -------------------------------------------------------
     Validate opportunity ID
  ------------------------------------------------------- */

  if (!opportunityId) {
    throw new Error(
      "Opportunity ID is required."
    );
  }

  /* -------------------------------------------------------
     Get logged-in developer
  ------------------------------------------------------- */

  const developer =
    await getCurrentDeveloperProfile();

  /* -------------------------------------------------------
     Developer must be approved
  ------------------------------------------------------- */

  if (developer.status !== "approved") {
    throw new Error(
      "Only approved developers can apply for opportunities."
    );
  }

  /* -------------------------------------------------------
     IMPORTANT:
     One developer can only work on one assignment
  ------------------------------------------------------- */

  const existingDeveloperAssignment =
    await getDeveloperAssignment(
      developer.id
    );

  if (existingDeveloperAssignment) {
    throw new Error(
      "You already have an active project. Complete your current project before applying for another opportunity."
    );
  }

  /* -------------------------------------------------------
     Get opportunity
  ------------------------------------------------------- */

  const opportunity =
    await getOpportunityById(
      opportunityId
    );

  /* -------------------------------------------------------
     Opportunity must still be open
  ------------------------------------------------------- */

  if (opportunity.status !== "open") {
    throw new Error(
      "This opportunity is no longer open."
    );
  }

  /* -------------------------------------------------------
     IMPORTANT:
     Check whether another developer already
     received this opportunity.
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
     Check whether THIS developer already applied
  ------------------------------------------------------- */

  const {
    data: existingApplication,
    error: existingApplicationError,
  } = await supabase
    .from("opportunity_applications")
    .select("id, status")
    .eq(
      "opportunity_id",
      opportunityId
    )
    .eq(
      "developer_id",
      developer.id
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

  /* -------------------------------------------------------
     Create application
  ------------------------------------------------------- */

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .insert({
      opportunity_id:
        opportunityId,

      developer_id:
        developer.id,

      cover_message:
        applicationData.cover_message ??
        applicationData.coverMessage ??
        null,

      estimated_days:
        applicationData.estimated_days ??
        applicationData.estimatedDays ??
        null,

      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
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
    .order("applied_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}


/* =========================================================
   GET MY APPLICATION FOR ONE OPPORTUNITY
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
    .select("*")
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
    .eq("id", applicationId)
    .eq(
      "developer_id",
      developer.id
    )
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}