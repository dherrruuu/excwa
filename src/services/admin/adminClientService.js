import { supabase } from "../../lib/supabase";

export async function createClientFromEnquiry(enquiry) {
  const enquiryId =
    typeof enquiry === "string"
      ? enquiry
      : enquiry?.id;

  if (!enquiryId) {
    throw new Error("Enquiry ID is required.");
  }

  const { data, error } =
    await supabase.functions.invoke(
      "convert-enquiry-to-client",
      {
        body: {
          enquiry_id: enquiryId,
        },
      }
    );

  if (error) {
    console.error(
      "Client creation function error:",
      error
    );

    let details = "";

    try {
      if (error.context) {
        const response = error.context;

        if (typeof response.json === "function") {
          const body = await response.json();
          details =
            body?.error ||
            body?.message ||
            "";
        }
      }
    } catch (parseError) {
      console.error(
        "Could not parse function error:",
        parseError
      );
    }

    throw new Error(
      details ||
        error.message ||
        "Failed to create client account."
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        "Failed to create client account."
    );
  }

  return data;
}