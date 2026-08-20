import { supabase } from "../../lib/supabase";

/* =========================================================
   ADMIN OPPORTUNITY SERVICE
   =========================================================

   Responsibilities:
   - Get opportunities
   - Filter opportunities
   - Create opportunity
   - Update opportunity
   - Update opportunity status
   - Get applicants
   - Get current assignment
   - Get available developers
   - Reassign developer
   - Delete opportunity

   IMPORTANT DELETE FLOW

   Admin deletes opportunity
          ↓
   admin_delete_opportunity RPC
          ↓
   Delete related submissions
          ↓
   Delete related assignments
          ↓
   Delete related applications
          ↓
   Delete opportunity

   This means an opportunity can be deleted even if
   developers have already applied.

   The database RPC MUST implement the deletion in
   the correct dependency order.
========================================================= */


/* =========================================================
   GET ALL OPPORTUNITIES
========================================================= */

/**
 * Get all opportunities.
 *
 * Default:
 * - Returns every opportunity.
 * - Newest opportunities first.
 *
 * Optional status:
 * getAllOpportunities("pending")
 * getAllOpportunities("open")
 * getAllOpportunities("assigned")
 *
 * Pass null / "all" to get everything.
 */
export const getAllOpportunities = async (
  status = null
) => {
  let query = supabase
    .from("opportunities")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (
    status &&
    status !== "all"
  ) {
    query = query.eq(
      "status",
      status
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      "getAllOpportunities error:",
      error
    );

    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
};


/* =========================================================
   GET COMPLETE OPPORTUNITY DETAILS
========================================================= */

export const getOpportunityDetails = async (
  opportunityId
) => {
  if (!opportunityId) {
    throw new Error(
      "Invalid opportunity."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_get_opportunity",
    {
      p_opportunity_id:
        opportunityId,
    }
  );

  if (error) {
    console.error(
      "getOpportunityDetails error:",
      error
    );

    throw error;
  }

  return data;
};


/* =========================================================
   CREATE OPPORTUNITY
========================================================= */

export const createOpportunity = async (
  payload
) => {
  if (!payload) {
    throw new Error(
      "Opportunity data is required."
    );
  }

  if (
    !payload.title ||
    !String(payload.title).trim()
  ) {
    throw new Error(
      "Opportunity title is required."
    );
  }

  if (
    !payload.description ||
    !String(payload.description).trim()
  ) {
    throw new Error(
      "Opportunity description is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("opportunities")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error(
      "createOpportunity error:",
      error
    );

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
    throw new Error(
      "Invalid opportunity."
    );
  }

  if (!payload) {
    throw new Error(
      "Opportunity update data is required."
    );
  }

  /*
   * The database RPC expects individual parameters.
   */

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_update_opportunity",
    {
      p_opportunity_id:
        opportunityId,

      p_title:
        payload.title ?? null,

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
        payload.application_deadline ??
        null,

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
    console.error(
      "updateOpportunity error:",
      error
    );

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
    throw new Error(
      "Invalid opportunity."
    );
  }

  if (!status) {
    throw new Error(
      "Status is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_update_opportunity_status",
    {
      p_opportunity_id:
        opportunityId,

      p_status:
        status,
    }
  );

  if (error) {
    console.error(
      "updateOpportunityStatus error:",
      error
    );

    throw error;
  }

  return data;
};


/* =========================================================
   GET OPPORTUNITY APPLICANTS
========================================================= */

export const getOpportunityApplicant = async (
  opportunityId
) => {
  if (!opportunityId) {
    throw new Error(
      "Invalid opportunity."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_get_opportunity_applicants",
    {
      p_opportunity_id:
        opportunityId,
    }
  );

  if (error) {
    console.error(
      "getOpportunityApplicant error:",
      error
    );

    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
};

/* =========================================================
   APPROVE OPPORTUNITY APPLICATION
========================================================= */

/**
 * Approve a pending developer application.
 *
 * Database RPC handles:
 *
 * 1. Admin authentication
 * 2. Admin authorization
 * 3. Pending application validation
 * 4. Developer active-assignment check
 * 5. Opportunity availability check
 * 6. Project assignment creation
 * 7. Application status -> approved
 * 8. Opportunity status -> assigned
 *
 * Expected flow:
 *
 * pending application
 *        ↓
 * Admin clicks Approve
 *        ↓
 * admin_approve_application RPC
 *        ↓
 * application = approved
 *        ↓
 * project_assignment created
 *        ↓
 * opportunity = assigned
 */
export const approveOpportunityApplication = async (
  applicationId
) => {
  if (!applicationId) {
    throw new Error(
      "Application ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_approve_application",
    {
      p_application_id:
        applicationId,
    }
  );

  if (error) {
    console.error(
      "approveOpportunityApplication error:",
      error
    );

    throw error;
  }

  if (!data?.success) {
    throw new Error(
      data?.message ||
        "Application approval failed."
    );
  }

  return data;
};

/* =========================================================
   GET CURRENT OPPORTUNITY ASSIGNMENT
========================================================= */

export const getOpportunityAssignment = async (
  opportunityId
) => {
  if (!opportunityId) {
    throw new Error(
      "Invalid opportunity."
    );
  }

  const {
    data,
    error,
  } = await supabase
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
    .eq(
      "opportunity_id",
      opportunityId
    )
    .order("assigned_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "getOpportunityAssignment error:",
      error
    );

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
    throw new Error(
      "Invalid opportunity."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_get_available_developers",
    {
      p_opportunity_id:
        opportunityId,
    }
  );

  if (error) {
    console.error(
      "getAvailableDevelopers error:",
      error
    );

    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
};


/* =========================================================
   CHANGE / REASSIGN DEVELOPER
========================================================= */

export const reassignOpportunity = async (
  opportunityId,
  newDeveloperId
) => {
  if (!opportunityId) {
    throw new Error(
      "Invalid opportunity."
    );
  }

  if (!newDeveloperId) {
    throw new Error(
      "Please select a developer."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_reassign_opportunity",
    {
      p_opportunity_id:
        opportunityId,

      p_new_developer_id:
        newDeveloperId,
    }
  );

  if (error) {
    console.error(
      "reassignOpportunity error:",
      error
    );

    throw error;
  }

  return data;
};


/* =========================================================
   DELETE OPPORTUNITY
========================================================= */

/**
 * IMPORTANT:
 *
 * Admin is allowed to delete an opportunity even when:
 *
 * - Developers have applied
 * - An application is under review
 * - A developer was assigned
 * - A project assignment exists
 * - A project submission exists
 *
 * The database RPC is responsible for deleting the
 * dependent records first.
 *
 * Expected database deletion order:
 *
 * project_submissions
 *        ↓
 * project_assignments
 *        ↓
 * opportunity_applications
 *        ↓
 * opportunities
 *
 * This is a HARD DELETE.
 *
 * After successful deletion:
 *
 * Admin Dashboard
 *      ↓
 * Opportunity disappears
 *
 * Developer Dashboard
 *      ↓
 * Existing application disappears
 *      ↓
 * Developer has no active assignment
 *      ↓
 * Developer can apply for another opportunity
 */
export const deleteOpportunity = async (
  opportunityId
) => {
  if (!opportunityId) {
    throw new Error(
      "Invalid opportunity."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_delete_opportunity",
    {
      p_opportunity_id:
        opportunityId,
    }
  );

  if (error) {
    console.error(
      "deleteOpportunity error:",
      error
    );

    throw error;
  }

  return data;
};


/* =========================================================
   DELETE APPLICATION
========================================================= */

export const deleteOpportunityApplication = async (
  applicationId
) => {
  if (!applicationId) {
    throw new Error(
      "Invalid application."
    );
  }

  const {
    error,
  } = await supabase
    .from("opportunity_applications")
    .delete()
    .eq(
      "id",
      applicationId
    );

  if (error) {
    console.error(
      "deleteOpportunityApplication error:",
      error
    );

    throw error;
  }

  return true;
};


/* =========================================================
   FILTER HELPERS
========================================================= */

/**
 * Available opportunity filters.
 *
 * The UI can use:
 *
 * "all"
 * "pending"
 * "open"
 * "assigned"
 * "in_progress"
 * "submitted"
 * "under_review"
 * "changes_requested"
 * "approved"
 * "completed"
 * "closed"
 * "cancelled"
 * "draft"
 */
export const OPPORTUNITY_FILTERS = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "open",
    label: "Open",
  },
  {
    value: "assigned",
    label: "Assigned",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "submitted",
    label: "Submitted",
  },
  {
    value: "under_review",
    label: "Under Review",
  },
  {
    value: "changes_requested",
    label: "Changes Requested",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "closed",
    label: "Closed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "all",
    label: "All",
  },
];


/* =========================================================
   FILTER OPPORTUNITIES CLIENT-SIDE
========================================================= */

/**
 * Useful when opportunities are already loaded.
 *
 * Example:
 *
 * filterOpportunities(
 *   opportunities,
 *   "pending"
 * )
 */
export const filterOpportunities = (
  opportunities,
  status
) => {
  if (!Array.isArray(opportunities)) {
    return [];
  }

  if (
    !status ||
    status === "all"
  ) {
    return opportunities;
  }

  return opportunities.filter(
    (opportunity) =>
      opportunity.status === status
  );
};