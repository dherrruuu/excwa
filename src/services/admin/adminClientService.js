import { supabase } from "../../lib/supabase";

/* =========================================================
   CREATE CLIENT FROM ENQUIRY
========================================================= */

export async function createClientFromEnquiry(enquiry) {
  const enquiryId =
    typeof enquiry === "string"
      ? enquiry
      : enquiry?.id;

  if (!enquiryId) {
    throw new Error("Enquiry ID is required.");
  }

  console.log("=================================");
  console.log("CONVERT ENQUIRY TO CLIENT");
  console.log("ENQUIRY ID:", enquiryId);
  console.log("=================================");

  try {
    const { data, error } =
      await supabase.functions.invoke(
        "convert-enquiry-to-client",
        {
          body: {
            enquiry_id: enquiryId,
          },
        }
      );

    console.log(
      "CONVERT CLIENT FUNCTION RESPONSE:",
      data
    );

    console.log(
      "CONVERT CLIENT FUNCTION ERROR:",
      error
    );

    if (error) {
      let message =
        error.message ||
        "Failed to create client account.";

      try {
        if (error.context) {
          const errorBody =
            await error.context.json();

          console.error(
            "EDGE FUNCTION ERROR BODY:",
            errorBody
          );

          message =
            errorBody?.error ||
            errorBody?.message ||
            message;
        }
      } catch (parseError) {
        console.error(
          "Could not parse Edge Function error:",
          parseError
        );
      }

      throw new Error(message);
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Failed to create client account."
      );
    }

    console.log(
      "CLIENT CREATED SUCCESSFULLY:",
      data
    );

    return data;

  } catch (error) {
    console.error(
      "CREATE CLIENT FROM ENQUIRY ERROR:",
      error
    );

    throw error;
  }
}