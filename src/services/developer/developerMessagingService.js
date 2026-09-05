import { supabase } from "../../lib/supabase";

/* ============================================================
   EXCWA TECH — DEVELOPER ↔ ADMIN MESSAGING SERVICE
   ============================================================ */


/* ============================================================
   HELPERS
   ============================================================ */

function normalizeText(value) {
  return String(value ?? "").trim();
}


/* ============================================================
   CURRENT DEVELOPER
   ============================================================ */

export async function getCurrentDeveloper() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "getCurrentDeveloper auth error:",
      userError
    );

    throw userError;
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("developer_profiles")
    .select(`
      id,
      user_id,
      full_name,
      email,
      status,
      profile_photo_url
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "getCurrentDeveloper profile error:",
      error
    );

    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    auth_user_id: user.id,
  };
}


/* ============================================================
   GET DEVELOPER CONVERSATIONS
   ============================================================ */

export async function getMyDeveloperConversations() {
  const developer = await getCurrentDeveloper();

  if (!developer?.id) {
    return [];
  }

  const { data, error } = await supabase
    .from("developer_conversations")
    .select(`
      id,
      developer_id,
      project_id,
      conversation_type,
      subject,
      last_message_at,
      created_at,
      updated_at
    `)
    .eq("developer_id", developer.id)
    .order("last_message_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getMyDeveloperConversations error:",
      error
    );

    throw error;
  }

  return data || [];
}


/* ============================================================
   GET SINGLE CONVERSATION
   ============================================================ */

export async function getDeveloperConversation(
  conversationId
) {
  if (!conversationId) {
    return null;
  }

  const { data, error } = await supabase
    .from("developer_conversations")
    .select(`
      id,
      developer_id,
      project_id,
      conversation_type,
      subject,
      last_message_at,
      created_at,
      updated_at
    `)
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    console.error(
      "getDeveloperConversation error:",
      error
    );

    throw error;
  }

  return data || null;
}


/* ============================================================
   GET OR CREATE GENERAL SUPPORT CONVERSATION
   ============================================================ */

/*
  IMPORTANT:

  There should only be ONE general support conversation
  per developer.

  Clicking "New Conversation" repeatedly will therefore
  return the existing General Support conversation instead
  of creating another database row.
*/

export async function createGeneralDeveloperConversation({
  subject = "General Support",
} = {}) {
  const developer = await getCurrentDeveloper();

  if (!developer?.id) {
    throw new Error(
      "Developer profile not found"
    );
  }

  const normalizedSubject =
    normalizeText(subject) || "General Support";

  /* ----------------------------------------------------------
     FIRST: CHECK FOR EXISTING GENERAL CONVERSATION
     ---------------------------------------------------------- */

  const {
    data: existingConversation,
    error: existingError,
  } = await supabase
    .from("developer_conversations")
    .select(`
      id,
      developer_id,
      project_id,
      conversation_type,
      subject,
      last_message_at,
      created_at,
      updated_at
    `)
    .eq("developer_id", developer.id)
    .eq("conversation_type", "general")
    .is("project_id", null)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error(
      "createGeneralDeveloperConversation lookup error:",
      existingError
    );

    throw existingError;
  }

  /* ----------------------------------------------------------
     EXISTING GENERAL SUPPORT FOUND
     ---------------------------------------------------------- */

  if (existingConversation) {
    return existingConversation;
  }

  /* ----------------------------------------------------------
     NO GENERAL SUPPORT EXISTS → CREATE IT
     ---------------------------------------------------------- */

  const { data, error } = await supabase
    .from("developer_conversations")
    .insert({
      developer_id: developer.id,
      project_id: null,
      conversation_type: "general",
      subject: normalizedSubject,
    })
    .select(`
      id,
      developer_id,
      project_id,
      conversation_type,
      subject,
      last_message_at,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    console.error(
      "createGeneralDeveloperConversation error:",
      error
    );

    throw error;
  }

  return data;
}


/* ============================================================
   CREATE / GET PROJECT CONVERSATION
   ============================================================ */

export async function createProjectDeveloperConversation({
  projectId,
  subject = null,
} = {}) {
  const developer = await getCurrentDeveloper();

  if (!developer?.id) {
    throw new Error(
      "Developer profile not found"
    );
  }

  if (!projectId) {
    throw new Error(
      "Project ID is required"
    );
  }

  /*
    Prevent duplicate project conversations.

    One developer should have one dedicated conversation
    per project.
  */

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("developer_conversations")
    .select(`
      id,
      developer_id,
      project_id,
      conversation_type,
      subject,
      last_message_at,
      created_at,
      updated_at
    `)
    .eq("developer_id", developer.id)
    .eq("project_id", projectId)
    .eq("conversation_type", "project")
    .maybeSingle();

  if (existingError) {
    console.error(
      "createProjectDeveloperConversation lookup error:",
      existingError
    );

    throw existingError;
  }

  if (existing) {
    return existing;
  }

  const normalizedSubject =
    normalizeText(subject) || null;

  const { data, error } = await supabase
    .from("developer_conversations")
    .insert({
      developer_id: developer.id,
      project_id: projectId,
      conversation_type: "project",
      subject: normalizedSubject,
    })
    .select(`
      id,
      developer_id,
      project_id,
      conversation_type,
      subject,
      last_message_at,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    console.error(
      "createProjectDeveloperConversation error:",
      error
    );

    throw error;
  }

  return data;
}


/* ============================================================
   GET OR CREATE PROJECT CONVERSATION
   ============================================================ */

export async function getOrCreateProjectConversation(
  projectId,
  subject = null
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required"
    );
  }

  return createProjectDeveloperConversation({
    projectId,
    subject,
  });
}


/* ============================================================
   GET MESSAGES
   ============================================================ */

export async function getDeveloperMessages(
  conversationId
) {
  if (!conversationId) {
    return [];
  }

  const { data, error } = await supabase
    .from("developer_messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      sender_type,
      message,
      is_read,
      created_at
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "getDeveloperMessages error:",
      error
    );

    throw error;
  }

  return data || [];
}


/* ============================================================
   SEND MESSAGE
   ============================================================ */

export async function sendDeveloperMessage({
  conversationId,
  message,
}) {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required"
    );
  }

  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    throw new Error(
      "Message cannot be empty"
    );
  }

  /* ----------------------------------------------------------
     GET CURRENT AUTH USER
     ---------------------------------------------------------- */

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "sendDeveloperMessage auth error:",
      userError
    );

    throw userError;
  }

  if (!user) {
    throw new Error(
      "Not authenticated"
    );
  }

  /* ----------------------------------------------------------
     DETERMINE SENDER TYPE
     ----------------------------------------------------------

     Admin:
       sender_id   = auth.uid()
       sender_type = "admin"

     Developer:
       sender_id   = auth.uid()
       sender_type = "developer"
  */

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "sendDeveloperMessage profile lookup error:",
      profileError
    );

    throw profileError;
  }

  if (!profile?.role) {
    throw new Error(
      "User profile or role not found"
    );
  }

  const normalizedRole =
    String(profile.role).toLowerCase().trim();

  let senderType;

  if (normalizedRole === "admin") {
    senderType = "admin";
  } else if (normalizedRole === "developer") {
    senderType = "developer";
  } else {
    throw new Error(
      `Messaging is not available for role: ${profile.role}`
    );
  }

  /* ----------------------------------------------------------
     SEND MESSAGE
     ---------------------------------------------------------- */

  const { data, error } = await supabase
    .from("developer_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_type: senderType,
      message: normalizedMessage,
    })
    .select(`
      id,
      conversation_id,
      sender_id,
      sender_type,
      message,
      is_read,
      created_at
    `)
    .single();

  if (error) {
    console.error(
      "sendDeveloperMessage error:",
      error
    );

    throw error;
  }

  return data;
}


/* ============================================================
   REALTIME — CONVERSATION MESSAGES
   ============================================================ */

export function subscribeToDeveloperMessages(
  conversationId,
  onMessage
) {
  if (!conversationId) {
    return null;
  }

  const channelName =
    `developer-messages-${conversationId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "developer_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (
          typeof onMessage === "function"
        ) {
          onMessage(payload.new);
        }
      }
    )
    .subscribe((status) => {
      console.log(
        `Developer messaging realtime [${conversationId}]:`,
        status
      );
    });

  return channel;
}


/* ============================================================
   REMOVE REALTIME SUBSCRIPTION
   ============================================================ */

export async function unsubscribeFromDeveloperMessages(
  channel
) {
  if (!channel) {
    return;
  }

  await supabase.removeChannel(channel);
}


/* ============================================================
   DEFAULT EXPORT
   ============================================================ */

export default {
  getCurrentDeveloper,
  getMyDeveloperConversations,
  getDeveloperConversation,

  createGeneralDeveloperConversation,
  createProjectDeveloperConversation,
  getOrCreateProjectConversation,

  getDeveloperMessages,
  sendDeveloperMessage,

  subscribeToDeveloperMessages,
  unsubscribeFromDeveloperMessages,
};