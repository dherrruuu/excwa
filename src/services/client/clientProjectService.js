import { supabase } from "../../lib/supabase";

const PROJECT_FIELDS = `
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
  budget,
  status,
  client_preview_enabled,
  preview_status,
  preview_url,
  created_at
`;

async function getClientId() {
  const { data, error } = await supabase.rpc("get_my_client_id");

  if (error) throw error;
  if (!data) throw new Error("Client account is not connected.");

  return data;
}

async function addLatestSubmissions(projects) {
  const projectIds = projects.map((project) => project.id);

  if (!projectIds.length) return projects;

  const { data: assignments, error: assignmentError } = await supabase
    .from("project_assignments")
    .select("id, opportunity_id, developer_id, status, completed_at")
    .in("opportunity_id", projectIds);

  if (assignmentError) throw assignmentError;

  const assignmentIds = (assignments || []).map((assignment) => assignment.id);
  const { data: submissions, error: submissionError } = assignmentIds.length
    ? await supabase
        .from("project_submissions")
        .select("id, assignment_id, status, submission_notes, submitted_at, review_message")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false })
    : { data: [], error: null };

  if (submissionError) throw submissionError;

  const assignmentMap = new Map();
  (assignments || []).forEach((assignment) => {
    assignmentMap.set(assignment.opportunity_id, assignment);
  });

  const submissionMap = new Map();
  (submissions || []).forEach((submission) => {
    const assignment = (assignments || []).find(
      (item) => item.id === submission.assignment_id
    );
    if (assignment && !submissionMap.has(assignment.opportunity_id)) {
      submissionMap.set(assignment.opportunity_id, submission);
    }
  });

  return projects.map((project) => ({
    ...project,
    assignment: assignmentMap.get(project.id) || null,
    latest_submission: submissionMap.get(project.id) || null,
  }));
}

export async function getClientProjects() {
  const clientId = await getClientId();
  const { data, error } = await supabase
    .from("opportunities")
    .select(PROJECT_FIELDS)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return addLatestSubmissions(data || []);
}

export async function getClientProject(projectId) {
  if (!projectId) throw new Error("Project is required.");

  const projects = await getClientProjects();
  const project = projects.find((item) => item.id === projectId);

  if (!project) throw new Error("Project could not be found.");
  return project;
}