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
  const { data, error } = await supabase
    .from("opportunities")
    .update(payload)
    .eq("id", opportunityId)
    .select()
    .single();

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
  const { data, error } = await supabase
    .from("opportunities")
    .update({
      status,
    })
    .eq("id", opportunityId)
    .select()
    .single();

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
   * An assigned opportunity must not be deleted.
   */

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .limit(1);

  if (assignmentError) {
    throw assignmentError;
  }

  if (assignments?.length > 0) {
    throw new Error(
      "This opportunity cannot be deleted because it has already been assigned to a developer."
    );
  }

  /*
   * Remove applications first.
   */

  const {
    error: applicationsDeleteError,
  } = await supabase
    .from("opportunity_applications")
    .delete()
    .eq("opportunity_id", opportunityId);

  if (applicationsDeleteError) {
    throw applicationsDeleteError;
  }

  /*
   * Delete opportunity.
   */

  const {
    data,
    error: deleteError,
  } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", opportunityId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    throw deleteError;
  }

  if (!data) {
    throw new Error(
      "Opportunity was not deleted. Please verify that you are logged in as an admin."
    );
  }

  return data;
};