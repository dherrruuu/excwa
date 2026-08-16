import { supabase } from "../../lib/supabase";

/*
=========================================================
DEVELOPER OPPORTUNITY SERVICE

Handles:
- Available opportunities
- Opportunity details
- Developer applications
- Apply to opportunity
- Withdraw application
- My applications
=========================================================
*/

/* =======================================================
   GET OPEN OPPORTUNITIES
======================================================= */

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

/* =======================================================
   GET SINGLE OPPORTUNITY
======================================================= */

export async function getOpportunityById(opportunityId) {
  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =======================================================
   GET CURRENT DEVELOPER PROFILE
======================================================= */

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

  return developer;
}

/* =======================================================
   APPLY TO OPPORTUNITY
======================================================= */

export async function applyToOpportunity(
  opportunityId,
  applicationData = {}
) {
  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  const developer =
    await getCurrentDeveloperProfile();

  if (developer.status !== "approved") {
    throw new Error(
      "Only approved developers can apply for opportunities."
    );
  }

  /* -------------------------------------------------------
     Check opportunity
  ------------------------------------------------------- */

  const opportunity =
    await getOpportunityById(opportunityId);

  if (opportunity.status !== "open") {
    throw new Error(
      "This opportunity is no longer open."
    );
  }

  /* -------------------------------------------------------
     Check existing application
  ------------------------------------------------------- */

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("opportunity_applications")
    .select("id,status")
    .eq("opportunity_id", opportunityId)
    .eq("developer_id", developer.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    throw new Error(
      "You have already applied for this opportunity."
    );
  }

  /* -------------------------------------------------------
     INSERT APPLICATION
  ------------------------------------------------------- */

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .insert({
      opportunity_id: opportunityId,
      developer_id: developer.id,
      cover_message:
        applicationData.cover_message ||
        applicationData.coverMessage ||
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

/* =======================================================
   GET MY APPLICATIONS
======================================================= */

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
    .eq("developer_id", developer.id)
    .order("applied_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

/* =======================================================
   GET MY APPLICATION FOR OPPORTUNITY
======================================================= */

export async function getMyApplication(
  opportunityId
) {
  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  const developer =
    await getCurrentDeveloperProfile();

  const {
    data,
    error,
  } = await supabase
    .from("opportunity_applications")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("developer_id", developer.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* =======================================================
   WITHDRAW APPLICATION
======================================================= */

export async function withdrawApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error("Application ID is required.");
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
    .eq("developer_id", developer.id)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}