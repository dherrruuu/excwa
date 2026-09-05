import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MessageSquare,
  Send,
  Loader2,
  Headphones,
  FolderKanban,
  UserRound,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "../../styles/admin/admin-messages.css";

/* ============================================================
   HELPERS
   ============================================================ */

function getClientDisplayName(client) {
  if (!client) {
    return "Unknown Client";
  }

  return (
    client.company_name?.trim() ||
    client.contact_name?.trim() ||
    client.email?.trim() ||
    "Unknown Client"
  );
}

function getConversationTitle(conversation) {
  if (conversation.conversation_type === "project") {
    return (
      conversation.project?.title ||
      conversation.subject?.trim() ||
      "Project Conversation"
    );
  }

  return "General Support";
}

function getConversationSubtitle(conversation) {
  if (conversation.conversation_type === "project") {
    return (
      conversation.project?.title ||
      conversation.subject?.trim() ||
      "Project conversation"
    );
  }

  return "Client support conversation";
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/*
 * Conversation date:
 *
 * Today      → Today
 * Yesterday  → Yesterday
 * Older      → 02 Sep 2026
 */
function formatConversationDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();

  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(
    yesterdayStart.getDate() - 1
  );

  if (dateStart.getTime() === todayStart.getTime()) {
    return "Today";
  }

  if (
    dateStart.getTime() ===
    yesterdayStart.getTime()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/*
 * Clean one-line preview for the conversation list.
 */
function getMessagePreview(message) {
  if (!message?.message) {
    return "No messages yet";
  }

  const normalized = message.message
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "No messages yet";
  }

  if (normalized.length <= 72) {
    return normalized;
  }

  return `${normalized.slice(0, 72)}…`;
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function AdminMessages() {
  const [adminUser, setAdminUser] = useState(null);

  const [clients, setClients] = useState([]);
  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] =
    useState(null);

  const [expandedClients, setExpandedClients] = useState({});

  const [messages, setMessages] = useState([]);

  /*
   * Latest message for every conversation.
   *
   * conversationId -> latest message
   */
  const [latestMessages, setLatestMessages] =
    useState({});

  const [messageText, setMessageText] = useState("");

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  /* ==========================================================
     MESSAGE THREAD REFS
     ========================================================== */

  const messagesThreadRef = useRef(null);

  /*
   * true:
   * Admin is at / near bottom.
   *
   * false:
   * Admin is reading older messages.
   */
  const shouldAutoScrollRef = useRef(true);

  /* ==========================================================
     CURRENT ADMIN
     ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadAdmin() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (authError) {
        setError(authError.message);
        return;
      }

      setAdminUser(user || null);
    }

    loadAdmin();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     LOAD CLIENTS + CONVERSATIONS + LATEST PREVIEWS
     ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadConversations() {
      setLoading(true);
      setError("");

      try {
        /*
         * Load clients and conversations together.
         */
        const [
          clientsResult,
          conversationsResult,
        ] = await Promise.all([
          supabase
            .from("clients")
            .select(
              "id, company_name, contact_name, email"
            )
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("client_conversations")
            .select(
              `
                id,
                client_id,
                project_id,
                conversation_type,
                subject,
                last_message_at,
                created_at,
                updated_at
              `
            )
            .order("last_message_at", {
              ascending: false,
            }),
        ]);

        if (clientsResult.error) {
          throw clientsResult.error;
        }

        if (conversationsResult.error) {
          throw conversationsResult.error;
        }

        const clientRows =
          clientsResult.data || [];

        const conversationRows =
          conversationsResult.data || [];

        /* ======================================================
           CLIENT MAP
           ====================================================== */

        const clientMap = new Map();

        clientRows.forEach((client) => {
          if (client?.id) {
            clientMap.set(
              String(client.id),
              client
            );
          }
        });

        /* ======================================================
           PROJECT MAP
           ====================================================== */

        const projectIds = [
          ...new Set(
            conversationRows
              .map(
                (conversation) =>
                  conversation.project_id
              )
              .filter(Boolean)
              .map(String)
          ),
        ];

        let projectMap = new Map();

        if (projectIds.length > 0) {
          const {
            data: projectRows,
            error: projectError,
          } = await supabase
            .from("opportunities")
            .select("id, title")
            .in("id", projectIds);

          if (projectError) {
            throw projectError;
          }

          projectMap = new Map(
            (projectRows || []).map(
              (project) => [
                String(project.id),
                project,
              ]
            )
          );
        }

        /* ======================================================
           ENRICH CONVERSATIONS
           ====================================================== */

        const enrichedConversations =
          conversationRows.map(
            (conversation) => {
              const client =
                conversation.client_id
                  ? clientMap.get(
                      String(
                        conversation.client_id
                      )
                    ) || null
                  : null;

              const project =
                conversation.project_id
                  ? projectMap.get(
                      String(
                        conversation.project_id
                      )
                    ) || null
                  : null;

              return {
                ...conversation,
                client,
                project,
              };
            }
          );

        /* ======================================================
           LOAD ALL LATEST MESSAGE PREVIEWS
           
           This is one query instead of one query per
           conversation.
           ====================================================== */

        const conversationIds =
          conversationRows
            .map(
              (conversation) =>
                conversation.id
            )
            .filter(Boolean);

        let latestMessageMap = {};

        if (conversationIds.length > 0) {
          const {
            data: messageRows,
            error: latestMessagesError,
          } = await supabase
            .from("client_messages")
            .select(
              `
                id,
                conversation_id,
                sender_id,
                sender_type,
                message,
                created_at
              `
            )
            .in(
              "conversation_id",
              conversationIds
            )
            .order("created_at", {
              ascending: false,
            });

          if (latestMessagesError) {
            throw latestMessagesError;
          }

          /*
           * Because messages are ordered newest-first,
           * the first message we encounter for each
           * conversation is its latest message.
           */
          (messageRows || []).forEach(
            (message) => {
              if (
                !latestMessageMap[
                  message.conversation_id
                ]
              ) {
                latestMessageMap[
                  message.conversation_id
                ] = message;
              }
            }
          );
        }

        if (!mounted) {
          return;
        }

        setClients(clientRows);

        setConversations(
          enrichedConversations
        );

        setLatestMessages(
          latestMessageMap
        );

        /*
         * Do not automatically open the first
         * conversation.
         */
        setSelectedConversation(null);
        setExpandedClients({});
        setMessages([]);
        setMessageText("");

        shouldAutoScrollRef.current = true;
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        console.error(
          "Admin messages load error:",
          loadError
        );

        setError(
          loadError?.message ||
            "Unable to load client conversations."
        );

        setClients([]);
        setConversations([]);
        setLatestMessages({});
        setSelectedConversation(null);
        setExpandedClients({});
        setMessages([]);
        setMessageText("");

        shouldAutoScrollRef.current = true;
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadConversations();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     GROUP CONVERSATIONS BY CLIENT
     ========================================================== */

  const clientGroups = useMemo(() => {
    const groups = new Map();

    clients.forEach((client) => {
      if (!client?.id) {
        return;
      }

      groups.set(String(client.id), {
        clientId: String(client.id),
        client,
        conversations: [],
      });
    });

    conversations.forEach((conversation) => {
      if (!conversation?.client_id) {
        return;
      }

      const clientId = String(
        conversation.client_id
      );

      if (!groups.has(clientId)) {
        groups.set(clientId, {
          clientId,
          client:
            conversation.client || null,
          conversations: [],
        });
      }

      groups
        .get(clientId)
        .conversations.push(
          conversation
        );
    });

    return Array.from(groups.values())
      .filter(
        (group) =>
          group.conversations.length > 0
      )
      .sort((a, b) => {
        const aLatest =
          a.conversations.reduce(
            (latest, conversation) => {
              const time = new Date(
                conversation.last_message_at ||
                  conversation.updated_at ||
                  conversation.created_at
              ).getTime();

              return Math.max(
                latest,
                time
              );
            },
            0
          );

        const bLatest =
          b.conversations.reduce(
            (latest, conversation) => {
              const time = new Date(
                conversation.last_message_at ||
                  conversation.updated_at ||
                  conversation.created_at
              ).getTime();

              return Math.max(
                latest,
                time
              );
            },
            0
          );

        return bLatest - aLatest;
      });
  }, [clients, conversations]);

  /* ==========================================================
     TOGGLE CLIENT
     ========================================================== */

  function toggleClient(clientId) {
    setExpandedClients((previous) => ({
      ...previous,
      [clientId]: !previous[clientId],
    }));
  }

  /* ==========================================================
     SELECT CONVERSATION
     ========================================================== */

  function selectConversation(
    conversation
  ) {
    /*
     * Opening a conversation should always
     * start at the newest message.
     */
    shouldAutoScrollRef.current = true;

    setSelectedConversation(
      conversation
    );

    setMessages([]);

    setMessageText("");
  }

  /* ==========================================================
     CLOSE CHAT
     ========================================================== */

  function closeConversation() {
    /*
     * Completely close the currently open
     * conversation without deleting anything.
     */
    setSelectedConversation(null);

    setMessages([]);

    setMessageText("");

    shouldAutoScrollRef.current = true;
  }

  /* ==========================================================
     LOAD SELECTED CONVERSATION MESSAGES
     ========================================================== */

  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      return undefined;
    }

    let mounted = true;

    async function loadMessages() {
      setMessagesLoading(true);
      setError("");

      const {
        data,
        error: messagesError,
      } = await supabase
        .from("client_messages")
        .select(
          `
            id,
            conversation_id,
            sender_id,
            sender_type,
            message,
            created_at
          `
        )
        .eq(
          "conversation_id",
          selectedConversation.id
        )
        .order("created_at", {
          ascending: true,
        });

      if (!mounted) {
        return;
      }

      if (messagesError) {
        console.error(
          "Conversation messages load error:",
          messagesError
        );

        setError(
          messagesError.message ||
            "Unable to load conversation messages."
        );

        setMessages([]);
      } else {
        setMessages(data || []);

        /*
         * Keep the sidebar preview synchronized
         * with the actual conversation.
         */
        if (data?.length > 0) {
          const latest =
            data[data.length - 1];

          setLatestMessages(
            (previous) => ({
              ...previous,
              [selectedConversation.id]:
                latest,
            })
          );
        }
      }

      setMessagesLoading(false);
    }

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [selectedConversation?.id]);

  /* ==========================================================
     REALTIME — SELECTED CHAT
     ========================================================== */

  useEffect(() => {
    if (!selectedConversation?.id) {
      return undefined;
    }

    const conversationId =
      selectedConversation.id;

    const channel = supabase
      .channel(
        `admin-client-messages-${conversationId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage =
            payload.new;

          /*
           * Update chat thread.
           */
          setMessages((previous) => {
            const alreadyExists =
              previous.some(
                (message) =>
                  message.id ===
                  newMessage.id
              );

            if (alreadyExists) {
              return previous;
            }

            return [
              ...previous,
              newMessage,
            ];
          });

          /*
           * Update latest preview.
           */
          setLatestMessages(
            (previous) => ({
              ...previous,
              [conversationId]:
                newMessage,
            })
          );

          /*
           * Update conversation date.
           */
          setConversations(
            (previous) =>
              previous
                .map((conversation) =>
                  conversation.id ===
                  conversationId
                    ? {
                        ...conversation,
                        last_message_at:
                          newMessage.created_at,
                        updated_at:
                          newMessage.created_at,
                      }
                    : conversation
                )
                .sort(
                  (a, b) =>
                    new Date(
                      b.last_message_at
                    ) -
                    new Date(
                      a.last_message_at
                    )
                )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [selectedConversation?.id]);

  /* ==========================================================
     REALTIME — SIDEBAR PREVIEWS
     
     Listens to every client message so a new message in
     another conversation updates the sidebar immediately.
     ========================================================== */

  useEffect(() => {
    const channel = supabase
      .channel(
        "admin-client-message-previews"
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_messages",
        },
        (payload) => {
          const newMessage =
            payload.new;

          if (!newMessage?.conversation_id) {
            return;
          }

          const conversationId =
            newMessage.conversation_id;

          /*
           * Update preview.
           */
          setLatestMessages(
            (previous) => ({
              ...previous,
              [conversationId]:
                newMessage,
            })
          );

          /*
           * Update sidebar ordering.
           */
          setConversations(
            (previous) =>
              previous
                .map((conversation) =>
                  conversation.id ===
                  conversationId
                    ? {
                        ...conversation,
                        last_message_at:
                          newMessage.created_at,
                        updated_at:
                          newMessage.created_at,
                      }
                    : conversation
                )
                .sort(
                  (a, b) =>
                    new Date(
                      b.last_message_at
                    ) -
                    new Date(
                      a.last_message_at
                    )
                )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  /* ==========================================================
     SILENT 5-SECOND POLLING FALLBACK
     ========================================================== */

  useEffect(() => {
    if (!selectedConversation?.id) {
      return undefined;
    }

    const conversationId =
      selectedConversation.id;

    async function refreshMessagesSilently() {
      const {
        data,
        error: messagesError,
      } = await supabase
        .from("client_messages")
        .select(
          `
            id,
            conversation_id,
            sender_id,
            sender_type,
            message,
            created_at
          `
        )
        .eq(
          "conversation_id",
          conversationId
        )
        .order("created_at", {
          ascending: true,
        });

      if (messagesError || !data) {
        return;
      }

      /*
       * Update thread only if message IDs changed.
       */
      setMessages((previous) => {
        if (
          previous.length ===
            data.length &&
          previous.every(
            (message, index) =>
              message.id ===
              data[index].id
          )
        ) {
          return previous;
        }

        return data;
      });

      /*
       * Update latest preview.
       */
      if (data.length > 0) {
        const latest =
          data[data.length - 1];

        setLatestMessages(
          (previous) => ({
            ...previous,
            [conversationId]:
              latest,
          })
        );

        setConversations(
          (previous) =>
            previous
              .map((conversation) =>
                conversation.id ===
                conversationId
                  ? {
                      ...conversation,
                      last_message_at:
                        latest.created_at,
                      updated_at:
                        latest.created_at,
                    }
                  : conversation
              )
              .sort(
                (a, b) =>
                  new Date(
                    b.last_message_at
                  ) -
                  new Date(
                    a.last_message_at
                  )
              )
        );

        setSelectedConversation(
          (previous) =>
            previous?.id ===
            conversationId
              ? {
                  ...previous,
                  last_message_at:
                    latest.created_at,
                  updated_at:
                    latest.created_at,
                }
              : previous
        );
      }
    }

    const interval = setInterval(
      refreshMessagesSilently,
      5000
    );

    return () => {
      clearInterval(interval);
    };
  }, [selectedConversation?.id]);

  /* ==========================================================
     SMART AUTO-SCROLL
     ========================================================== */

  useEffect(() => {
    const thread =
      messagesThreadRef.current;

    if (
      !thread ||
      messages.length === 0 ||
      messagesLoading
    ) {
      return;
    }

    /*
     * If admin has deliberately scrolled upward,
     * do not move the thread.
     */
    if (!shouldAutoScrollRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      thread.scrollTo({
        top: thread.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, messagesLoading]);

  /* ==========================================================
     TRACK CHAT SCROLL POSITION
     ========================================================== */

  useEffect(() => {
    const thread =
      messagesThreadRef.current;

    if (!thread) {
      return undefined;
    }

    function handleThreadScroll() {
      const distanceFromBottom =
        thread.scrollHeight -
        thread.scrollTop -
        thread.clientHeight;

      /*
       * 120px bottom buffer.
       */
      shouldAutoScrollRef.current =
        distanceFromBottom <= 120;
    }

    thread.addEventListener(
      "scroll",
      handleThreadScroll,
      { passive: true }
    );

    handleThreadScroll();

    return () => {
      thread.removeEventListener(
        "scroll",
        handleThreadScroll
      );
    };
  }, [selectedConversation?.id]);

  /* ==========================================================
     SEND MESSAGE
     ========================================================== */

  async function handleSendMessage(
    event
  ) {
    event?.preventDefault();

    const trimmedMessage =
      messageText.trim();

    if (
      !trimmedMessage ||
      !selectedConversation?.id ||
      !adminUser?.id ||
      sending
    ) {
      return;
    }

    /*
     * Admin intentionally sends a message,
     * therefore stay at the bottom.
     */
    shouldAutoScrollRef.current = true;

    setSending(true);
    setError("");

    try {
      const {
        data: newMessage,
        error: insertError,
      } = await supabase
        .from("client_messages")
        .insert({
          conversation_id:
            selectedConversation.id,
          sender_id: adminUser.id,
          sender_type: "admin",
          message: trimmedMessage,
        })
        .select(
          `
            id,
            conversation_id,
            sender_id,
            sender_type,
            message,
            created_at
          `
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      /*
       * Add to thread immediately.
       */
      setMessages((previous) => {
        const alreadyExists =
          previous.some(
            (message) =>
              message.id ===
              newMessage.id
          );

        if (alreadyExists) {
          return previous;
        }

        return [
          ...previous,
          newMessage,
        ];
      });

      /*
       * Update sidebar preview immediately.
       */
      setLatestMessages(
        (previous) => ({
          ...previous,
          [selectedConversation.id]:
            newMessage,
        })
      );

      const timestamp =
        newMessage.created_at;

      /*
       * Keep conversation timestamp
       * synchronized.
       */
      const {
        error:
          conversationUpdateError,
      } = await supabase
        .from("client_conversations")
        .update({
          last_message_at:
            timestamp,
          updated_at: timestamp,
        })
        .eq(
          "id",
          selectedConversation.id
        );

      if (conversationUpdateError) {
        console.warn(
          "Conversation timestamp update failed:",
          conversationUpdateError
        );
      }

      setConversations(
        (previous) =>
          previous
            .map((conversation) =>
              conversation.id ===
              selectedConversation.id
                ? {
                    ...conversation,
                    last_message_at:
                      timestamp,
                    updated_at:
                      timestamp,
                  }
                : conversation
            )
            .sort(
              (a, b) =>
                new Date(
                  b.last_message_at
                ) -
                new Date(
                  a.last_message_at
                )
            )
      );

      setSelectedConversation(
        (previous) =>
          previous
            ? {
                ...previous,
                last_message_at:
                  timestamp,
                updated_at:
                  timestamp,
              }
            : previous
      );

      setMessageText("");
    } catch (sendError) {
      console.error(
        "Admin message send error:",
        sendError
      );

      setError(
        sendError?.message ||
          "Unable to send the message."
      );
    } finally {
      setSending(false);
    }
  }

  /* ==========================================================
     LOADING STATE
     ========================================================== */

  if (loading) {
    return (
      <section className="admin-messages-page">
        <div className="admin-messages-header">
          <div>
            <span className="admin-page-eyebrow">
              CLIENT COMMUNICATION
            </span>

            <h1>Messages</h1>

            <p>
              Manage conversations between
              clients and the EXCWA team.
            </p>
          </div>
        </div>

        <div className="admin-messages-shell admin-messages-loading">
          <Loader2
            size={22}
            className="admin-messages-spinner"
          />

          <span>
            Loading conversations...
          </span>
        </div>
      </section>
    );
  }

  /* ==========================================================
     MAIN PAGE
     ========================================================== */

  return (
    <section className="admin-messages-page">
      {/* ======================================================
          PAGE HEADER
          ====================================================== */}

      <div className="admin-messages-header">
        <div>
          <span className="admin-page-eyebrow">
            CLIENT COMMUNICATION
          </span>

          <h1>Messages</h1>

          <p>
            Manage conversations between
            clients and the EXCWA team.
          </p>
        </div>

        <div className="admin-messages-header-stat">
          <MessageSquare size={17} />

          <span>
            {conversations.length}{" "}
            {conversations.length === 1
              ? "conversation"
              : "conversations"}
          </span>
        </div>
      </div>

      {error && (
        <div className="admin-messages-error">
          <span>{error}</span>
        </div>
      )}

      {/* ======================================================
          MESSAGES SHELL
          ====================================================== */}

      <div className="admin-messages-shell">
        {/* ====================================================
            LEFT — CLIENT / CONVERSATION LIST
            ==================================================== */}

        <aside className="admin-messages-sidebar">
          <div className="admin-messages-sidebar-header">
            <div>
              <span>CLIENTS</span>

              <strong>
                {clientGroups.length}
              </strong>
            </div>
          </div>

          <div className="admin-messages-client-list">
            {clientGroups.length === 0 ? (
              <div className="admin-messages-list-empty">
                <UserRound size={22} />

                <span>
                  No client conversations
                </span>
              </div>
            ) : (
              clientGroups.map((group) => {
                const isExpanded =
                  Boolean(
                    expandedClients[
                      group.clientId
                    ]
                  );

                const clientName =
                  getClientDisplayName(
                    group.client
                  );

                return (
                  <div
                    className="admin-message-client-group"
                    key={group.clientId}
                  >
                    {/* ==========================================
                        CLIENT ROW
                        ========================================== */}

                    <button
                      type="button"
                      className="admin-message-client-row"
                      onClick={() =>
                        toggleClient(
                          group.clientId
                        )
                      }
                    >
                      <span className="admin-message-client-icon">
                        <UserRound size={16} />
                      </span>

                      <span className="admin-message-client-info">
                        <strong>
                          {clientName}
                        </strong>

                        <small>
                          {
                            group
                              .conversations
                              .length
                          }{" "}
                          {group
                            .conversations
                            .length === 1
                            ? "conversation"
                            : "conversations"}
                        </small>
                      </span>

                      <span className="admin-message-client-chevron">
                        {isExpanded ? (
                          <ChevronDown
                            size={17}
                          />
                        ) : (
                          <ChevronRight
                            size={17}
                          />
                        )}
                      </span>
                    </button>

                    {/* ==========================================
                        CLIENT CONVERSATIONS
                        ========================================== */}

                    {isExpanded && (
                      <div className="admin-message-conversation-list">
                        {group.conversations.map(
                          (
                            conversation
                          ) => {
                            const isSelected =
                              selectedConversation?.id ===
                              conversation.id;

                            const isProject =
                              conversation.conversation_type ===
                              "project";

                            const latestMessage =
                              latestMessages[
                                conversation
                                  .id
                              ];

                            const preview =
                              getMessagePreview(
                                latestMessage
                              );

                            const previewSender =
                              latestMessage
                                ?.sender_type ===
                              "admin"
                                ? "You"
                                : latestMessage
                                    ?.sender_type ===
                                  "client"
                                ? "Client"
                                : "";

                            return (
                              <button
                                type="button"
                                key={
                                  conversation.id
                                }
                                className={
                                  isSelected
                                    ? "admin-message-conversation active"
                                    : "admin-message-conversation"
                                }
                                onClick={() =>
                                  selectConversation(
                                    conversation
                                  )
                                }
                              >
                                <span className="admin-message-conversation-icon">
                                  {isProject ? (
                                    <FolderKanban
                                      size={15}
                                    />
                                  ) : (
                                    <Headphones
                                      size={15}
                                    />
                                  )}
                                </span>

                                <span className="admin-message-conversation-info">
                                  <strong>
                                    {getConversationTitle(
                                      conversation
                                    )}
                                  </strong>

                                  <small className="admin-message-preview">
                                    {previewSender && (
                                      <span className="admin-message-preview-sender">
                                        {previewSender}:
                                      </span>
                                    )}

                                    {preview}
                                  </small>
                                </span>

                                <span className="admin-message-conversation-date">
                                  {formatConversationDate(
                                    conversation.last_message_at ||
                                      conversation.updated_at ||
                                      conversation.created_at
                                  )}
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ====================================================
            RIGHT — CHAT
            ==================================================== */}

        <section className="admin-messages-chat">
          {!selectedConversation ? (
            <div className="admin-messages-chat-empty">
              <div className="admin-messages-chat-empty-icon">
                <MessageSquare size={28} />
              </div>

              <h2>
                Select a conversation
              </h2>

              <p>
                Choose a client and conversation
                from the left panel to open the
                chat.
              </p>
            </div>
          ) : (
            <>
              {/* ==============================================
                  CHAT HEADER
                  ============================================== */}

              <header className="admin-messages-chat-header">
                <div className="admin-messages-chat-header-icon">
                  {selectedConversation.conversation_type ===
                  "project" ? (
                    <FolderKanban size={19} />
                  ) : (
                    <Headphones size={19} />
                  )}
                </div>

                <div className="admin-messages-chat-header-info">
                  <h2>
                    {getConversationTitle(
                      selectedConversation
                    )}
                  </h2>

                  <p>
                    {getClientDisplayName(
                      selectedConversation.client
                    )}

                    {" · "}

                    {getConversationSubtitle(
                      selectedConversation
                    )}
                  </p>
                </div>

                {/* ============================================
                    CLOSE CHAT
                    ============================================ */}

                <button
                  type="button"
                  className="admin-messages-chat-close"
                  onClick={
                    closeConversation
                  }
                  aria-label="Close conversation"
                  title="Close conversation"
                >
                  <X size={18} />
                </button>
              </header>

              {/* ==============================================
                  MESSAGE THREAD
                  ============================================== */}

              <div
                ref={messagesThreadRef}
                className="admin-messages-thread"
              >
                {messagesLoading ? (
                  <div className="admin-messages-thread-loading">
                    <Loader2
                      size={20}
                      className="admin-messages-spinner"
                    />

                    <span>
                      Loading messages...
                    </span>
                  </div>
                ) : messages.length ===
                  0 ? (
                  <div className="admin-messages-thread-empty">
                    <MessageSquare size={22} />

                    <span>
                      No messages in this
                      conversation yet.
                    </span>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isAdmin =
                      message.sender_type ===
                      "admin";

                    return (
                      <div
                        key={message.id}
                        className={
                          isAdmin
                            ? "admin-message-row admin"
                            : "admin-message-row client"
                        }
                      >
                        <div
                          className={
                            isAdmin
                              ? "admin-message-bubble admin"
                              : "admin-message-bubble client"
                          }
                        >
                          <div className="admin-message-content">
                            {message.message}
                          </div>

                          <div className="admin-message-meta">
                            <span>
                              {isAdmin
                                ? "EXCWA"
                                : "Client"}
                            </span>

                            <span>
                              {formatTime(
                                message.created_at
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ==============================================
                  COMPOSER
                  ============================================== */}

              <form
                className="admin-messages-composer"
                onSubmit={
                  handleSendMessage
                }
              >
                <textarea
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(
                      event.target.value
                    )
                  }
                  placeholder="Write a message..."
                  rows={1}
                  disabled={sending}
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      if (
                        messageText.trim() &&
                        !sending
                      ) {
                        handleSendMessage(
                          event
                        );
                      }
                    }
                  }}
                />

                <button
                  type="submit"
                  disabled={
                    sending ||
                    !messageText.trim()
                  }
                  aria-label="Send message"
                  title="Send message"
                >
                  {sending ? (
                    <Loader2
                      size={18}
                      className="admin-messages-spinner"
                    />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
