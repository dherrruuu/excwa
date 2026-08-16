import { supabase } from "../../lib/supabase";

/*
=========================================================
DEVELOPER PROJECT SERVICE

Handles:
- Assigned projects
- Project details
- Start project
- Complete project
- Project status
=========================================================
*/

/* =======================================================
   CURRENT DEVELOPER
======================================================= */

async function getCurrentDeveloper() {
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
   GET MY ASSIGNED PROJECTS
======================================================= */

export async function getMyProjects() {
  const developer =
    await getCurrentDeveloper();

  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      *,
      opportunity:opportunities(*)
    `)
    .eq("developer_id", developer.id)
    .order("assigned_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

/* =======================================================
   GET PROJECT BY ID
======================================================= */

export async function getProjectById(
  assignmentId
) {
  if (!assignmentId) {
    throw new Error("Assignment ID is required.");
  }

  const developer =
    await getCurrentDeveloper();

  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .select(`
      *,
      opportunity:opportunities(*)
    `)
    .eq("id", assignmentId)
    .eq("developer_id", developer.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =======================================================
   START PROJECT
======================================================= */

export async function startProject(
  assignmentId
) {
  if (!assignmentId) {
    throw new Error("Assignment ID is required.");
  }

  const developer =
    await getCurrentDeveloper();

  const {
    data: assignment,
    error: fetchError,
  } = await supabase
    .from("project_assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("developer_id", developer.id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (
    assignment.status !== "ASSIGNED" &&
    assignment.status !== "assigned"
  ) {
    throw new Error(
      "This project cannot be started."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .update({
      status: "IN_PROGRESS",
      started_at:
        assignment.started_at ||
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("developer_id", developer.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =======================================================
   GET PROJECT STATUS
======================================================= */

export async function getProjectStatus(
  assignmentId
) {
  const project =
    await getProjectById(assignmentId);

  return project.status;
}

/* =======================================================
   MARK PROJECT COMPLETED
======================================================= */

export async function markProjectCompleted(
  assignmentId
) {
  if (!assignmentId) {
    throw new Error("Assignment ID is required.");
  }

  const developer =
    await getCurrentDeveloper();

  const {
    data,
    error,
  } = await supabase
    .from("project_assignments")
    .update({
      status: "COMPLETED",
      completed_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("developer_id", developer.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}