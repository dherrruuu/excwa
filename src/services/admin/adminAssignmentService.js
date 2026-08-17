import { supabase } from "../../lib/supabase";

/* =========================================================
   GET CURRENT ADMIN
   ========================================================= */

async function getCurrentAdmin() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      "You must be logged in as an administrator."
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile || profile.role !== "admin") {
    throw new Error("Administrator access required.");
  }

  return user;
}

/* =========================================================
   GET CURRENT ASSIGNMENT
   ========================================================= */

export async function getOpportunityAssignment(opportunityId) {
  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  await getCurrentAdmin();

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
        primary_roles,
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

  return data || null;
}

/* =========================================================
   GET AVAILABLE DEVELOPERS
   ========================================================= */

export async function getAvailableDevelopers() {
  await getCurrentAdmin();

  const { data: developers, error: developerError } =
    await supabase
      .from("developer_profiles")
      .select(`
        id,
        user_id,
        full_name,
        primary_roles,
        status,
        profile_photo_url
      `)
      .eq("status", "approved")
      .order("full_name", {
        ascending: true,
      });

  if (developerError) {
    throw developerError;
  }

  if (!developers?.length) {
    return [];
  }

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from("project_assignments")
    .select("id, developer_id, status");

  if (assignmentError) {
    throw assignmentError;
  }

  const activeStatuses = new Set([
    "assigned",
    "in_progress",
    "submitted",
    "under_review",
    "changes_requested",
    "approved",
  ]);

  const busy = new Set(
    (assignments || [])
      .filter(
        (assignment) =>
          !assignment.status ||
          activeStatuses.has(assignment.status)
      )
      .map(
        (assignment) =>
          assignment.developer_id
      )
  );

  return developers.filter(
    (developer) =>
      !busy.has(developer.id)
  );
}

/* =========================================================
   CHANGE OPPORTUNITY DEVELOPER
   ========================================================= */

export async function changeOpportunityDeveloper(
  opportunityId,
  newDeveloperId
) {
  if (!opportunityId || !newDeveloperId) {
    throw new Error(
      "Opportunity and developer are required."
    );
  }

  await getCurrentAdmin();

  const assignment =
    await getOpportunityAssignment(
      opportunityId
    );

  if (!assignment) {
    throw new Error(
      "This opportunity has no active developer assignment."
    );
  }

  if (
    assignment.developer_id ===
    newDeveloperId
  ) {
    throw new Error(
      "This developer is already assigned to the opportunity."
    );
  }

  const {
    data: developer,
    error: developerError,
  } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      full_name,
      status
    `)
    .eq("id", newDeveloperId)
    .maybeSingle();

  if (developerError) {
    throw developerError;
  }

  if (!developer) {
    throw new Error(
      "Developer not found."
    );
  }

  if (developer.status !== "approved") {
    throw new Error(
      "Selected developer is not approved."
    );
  }

  /* Check whether developer already has an active assignment */

  const {
    data: existingAssignments,
    error: existingError,
  } = await supabase
    .from("project_assignments")
    .select("id, opportunity_id, status")
    .eq(
      "developer_id",
      newDeveloperId
    );

  if (existingError) {
    throw existingError;
  }

  const activeStatuses = new Set([
    "assigned",
    "in_progress",
    "submitted",
    "under_review",
    "changes_requested",
    "approved",
  ]);

  const hasActiveAssignment =
    (existingAssignments || []).some(
      (item) =>
        !item.status ||
        activeStatuses.has(item.status)
    );

  if (hasActiveAssignment) {
    throw new Error(
      "Selected developer already has an active project."
    );
  }

  /* IMPORTANT:
     project_assignments primary key is `id`,
     NOT `assignment_id`.
  */

  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .update({
      developer_id: newDeveloperId,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", assignment.id)
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
        primary_roles,
        profile_photo_url,
        status
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
}