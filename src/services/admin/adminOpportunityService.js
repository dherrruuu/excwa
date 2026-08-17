import { supabase } from "../../lib/supabase";

/* =========================================================
   GET ALL OPPORTUNITIES
   ========================================================= */

export const getAllOpportunities = async () => {
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
};


/* =========================================================
   GET COMPLETE OPPORTUNITY DETAILS
   ========================================================= */

export const getOpportunityDetails = async (opportunityId) => {
  if (!opportunityId) {
    throw new Error("Invalid opportunity.");
  }

  const { data, error } = await supabase.rpc(
    "admin_get_opportunity",
    {
      p_opportunity_id: opportunityId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
};


/* =========================================================
   CREATE OPPORTUNITY
   ========================================================= */

export const createOpportunity = async (payload) => {
  const { data, error } = await supabase
    .from("opportunities")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};


/* =========================================================
   UPDATE OPPORTUNITY
   ========================================================= */

export const updateOpportunity = async (
  opportunityId,
  payload
) => {
  if (!opportunityId) {
    throw new Error("Invalid opportunity.");
  }

  /*
   * The admin_update_opportunity RPC expects these values
   * individually rather than a generic payload.
   */

  const { data, error } = await supabase.rpc(
    "admin_update_opportunity",
    {
      p_opportunity_id: opportunityId,

      p_title: payload.title ?? null,

      p_description:
        payload.description ?? null,

      p_required_roles:
        payload.required_roles ?? [],

      p_required_skills:
        payload.required_skills ?? [],

      p_tech_stack:
        payload.tech_stack ?? [],

      p_deliverables:
        payload.deliverables ?? null,

      p_deadline:
        payload.deadline ?? null,

      p_application_deadline:
        payload.application_deadline ?? null,

      p_budget:
        payload.budget ?? null,

      p_project_type:
        payload.project_type ?? null,

      p_freelancer_payout:
        payload.freelancer_payout ?? null,

      p_attachment_path:
        payload.attachment_path ?? null,
    }
  );

  if (error) {
    throw error;
  }

  return data;
};


/* =========================================================
   UPDATE OPPORTUNITY STATUS
   ========================================================= */

export const updateOpportunityStatus = async (
  opportunityId,
  status
) => {
  if (!opportunityId) {
    throw new Error("Invalid opportunity.");
  }

  if (!status) {
    throw new Error("Status is required.");
  }

  const { data, error } = await supabase.rpc(
    "admin_update_opportunity_status",
    {
      p_opportunity_id: opportunityId,
      p_status: status,
    }
  );

  if (error) {
    throw error;
  }

  return data;
};


/* =========================================================
   GET APPLICANT
   ========================================================= */

/* =========================================================
   GET APPLICANTS
   ========================================================= */

export const getOpportunityApplicant = async (opportunityId) => {
  if (!opportunityId) {
    throw new Error("Invalid opportunity.");
  }

  const { data, error } = await supabase.rpc(
    "admin_get_opportunity_applicants",
    {
      p_opportunity_id: opportunityId,
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
};


/* =========================================================
   GET CURRENT ASSIGNMENT
   ========================================================= */

export const getOpportunityAssignment = async (
  opportunityId
) => {
  if (!opportunityId) {
    throw new Error("Invalid opportunity.");
  }

  const { data, error } = await supabase
    .from("project_assignments")
    .select(`
      id,
      opportunity_id,
      developer_id,
      assigned_by,
      assigned_at,
      started_at,
      completed_at,
      payment_status,
      status,
      reviewer_id,
      reviewer_notes,
      updated_at,
      developer_profiles (
        id,
        full_name,
        phone,
        city,
        primary_roles,
        github_url,
        linkedin_url,
        portfolio_url,
        resume_url,
        profile_photo_url,
        status
      )
    `)
    .eq("opportunity_id", opportunityId)
    .order("assigned_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};


/* =========================================================
   GET AVAILABLE DEVELOPERS
   ========================================================= */

export const getAvailableDevelopers = async (
  opportunityId
) => {
  if (!opportunityId) {
    throw new Error("Invalid opportunity.");
  }

  const { data, error } = await supabase.rpc(
    "admin_get_available_developers",
    {
      p_opportunity_id: opportunityId,
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
};


/* =========================================================
   CHANGE / REASSIGN DEVELOPER
   ========================================================= */

export const reassignOpportunity = async (
  opportunityId,
  newDeveloperId
) => {
  if (!opportunityId) {
    throw new Error("Invalid opportunity.");
  }

  if (!newDeveloperId) {
    throw new Error("Please select a developer.");
  }

  const { data, error } = await supabase.rpc(
    "admin_reassign_opportunity",
    {
      p_opportunity_id: opportunityId,
      p_new_developer_id: newDeveloperId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
};


/* =========================================================
   DELETE OPPORTUNITY
   ========================================================= */

export const deleteOpportunity = async (
  opportunityId
) => {
  if (!opportunityId) {
    throw new Error("Invalid opportunity.");
  }

  /*
   * Use the admin RPC.
   *
   * The database function correctly handles:
   *
   * project_submissions
   *        ↓
   * project_assignments
   *        ↓
   * opportunity_applications
   *        ↓
   * opportunities
   *
   * The old frontend implementation incorrectly queried
   * project_assignments.assignment_id.
   *
   * The actual primary key is:
   *
   * project_assignments.id
   */

  const { data, error } = await supabase.rpc(
    "admin_delete_opportunity",
    {
      p_opportunity_id: opportunityId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
};