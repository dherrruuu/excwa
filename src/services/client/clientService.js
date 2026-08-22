import { supabase } from "../../lib/supabase";

/* =========================================================
   CREATE CLIENT FROM ENQUIRY
   ========================================================= */

export async function createClientFromEnquiry(enquiry) {
  if (!enquiry?.id) {
    throw new Error("Enquiry is required.");
  }

  const { data, error } =
    await supabase.functions.invoke(
      "convert-enquiry-to-client",
      {
        body: {
          enquiry_id: enquiry.id,
        },
      }
    );

  if (error) {
    console.error(
      "Client conversion error:",
      error
    );

    throw error;
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        "Failed to convert enquiry to client."
    );
  }

  return data;
}