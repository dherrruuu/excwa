import { supabase } from "../../lib/supabase";

/* =========================================================
   APPROVE APPLICATION
========================================================= */

export const approveApplication = async (
  applicationId
) => {
  if (!applicationId) {
    throw new Error("Invalid application.");
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_approve_application",
    {
      p_application_id: applicationId,
    }
  );

  if (error) {
    console.error(
      "approveApplication error:",
      error
    );

    throw error;
  }

  return data;
};


/* =========================================================
   REJECT APPLICATION
========================================================= */

export const rejectApplication = async (
  applicationId
) => {
  if (!applicationId) {
    throw new Error("Invalid application.");
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_reject_application",
    {
      p_application_id: applicationId,
    }
  );

  if (error) {
    console.error(
      "rejectApplication error:",
      error
    );

    throw error;
  }

  return data;
};