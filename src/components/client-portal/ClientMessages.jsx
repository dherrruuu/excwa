import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  Plus,
  Loader2,
  Headphones,
  FolderKanban,
  X,
} from "lucide-react";

import "../../styles/client-portal/messages.css";
import { supabase } from "../../lib/supabase";

export default function ClientMessages({ client, projects = [] }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] =
    useState(null);
  const [messages, setMessages] = useState([]);

  const [messageText, setMessageText] = useState("");

  const [loadingConversations, setLoadingConversations] =
    useState(true);
  const [loadingMessages, setLoadingMessages] =
    useState(false);
  const [sending, setSending] = useState(false);
  const [creatingConversation, setCreatingConversation] =
    useState(false);

  const [error, setError] = useState("");

  // ============================================================
  // MESSAGE THREAD REFS
  // ============================================================

  const messagesThreadRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  // ============================================================
  // LOAD CONVERSATIONS
  // ============================================================

  useEffect(() => {
    if (!client?.id) return;

    loadConversations();
  }, [client?.id]);

  // ============================================================
  // LOAD MESSAGES WHEN CONVERSATION CHANGES
  // ============================================================

  useEffect(() => {
    if (!selectedConversation?.id) return;

    loadMessages(selectedConversation.id);
  }, [selectedConversation?.id]);

  // ============================================================
  // LOAD CONVERSATIONS
  // ============================================================

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      setError("");

      const { data, error: conversationsError } =
        await supabase
          .from("client_conversations")
          .select(`
            id,
            client_id,
            project_id,
            conversation_type,
            subject,
            last_message_at,
            created_at,
            updated_at
          `)
          .eq("client_id", client.id)
          .order("last_message_at", {
            ascending: false,
          });

      if (conversationsError) {
        throw conversationsError;
      }

      setConversations(data || []);

      if (data?.length > 0) {
        shouldAutoScrollRef.current = true;
        setSelectedConversation(data[0]);
      }
    } catch (err) {
      console.error(
        "Failed to load conversations:",
        err
      );

      setError(
        "Unable to load your conversations."
      );
    } finally {
      setLoadingConversations(false);
    }
  };

  // ============================================================
  // LOAD MESSAGES
  // ============================================================

  const loadMessages = async (conversationId) => {
    try {
      setLoadingMessages(true);
      setError("");

      const { data, error: messagesError } =
        await supabase
          .from("client_messages")
          .select(`
            id,
            conversation_id,
            sender_id,
            sender_type,
            message,
            attachment_url,
            attachment_name,
            is_read,
            created_at
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", {
            ascending: true,
          });

      if (messagesError) {
        throw messagesError;
      }

      shouldAutoScrollRef.current = true;
      setMessages(data || []);
    } catch (err) {
      console.error(
        "Failed to load messages:",
        err
      );

      setError("Unable to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  // ============================================================
  // SMART AUTO-SCROLL
  //
  // Automatically moves to the newest message when:
  // - Opening a conversation
  // - Sending a message
  // - Receiving a new message while at the bottom
  //
  // If the user scrolls upward, automatic scrolling pauses.
  // ============================================================

  useEffect(() => {
    const thread = messagesThreadRef.current;

    if (
      !thread ||
      messages.length === 0 ||
      loadingMessages ||
      !shouldAutoScrollRef.current
    ) {
      return;
    }

    requestAnimationFrame(() => {
      thread.scrollTo({
        top: thread.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, loadingMessages]);

  // ============================================================
  // MESSAGE SCROLL POSITION
  // ============================================================

  useEffect(() => {
    const thread = messagesThreadRef.current;

    if (!thread) {
      return undefined;
    }

    function handleThreadScroll() {
      const distanceFromBottom =
        thread.scrollHeight -
        thread.scrollTop -
        thread.clientHeight;

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

  // ============================================================
  // REALTIME MESSAGE SUBSCRIPTION
  // ============================================================

  useEffect(() => {
    if (!selectedConversation?.id) return;

    const conversationId =
      selectedConversation.id;

    const channel = supabase
      .channel(
        `client-messages-${conversationId}`
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
          const newMessage = payload.new;

          setMessages((previous) => {
            const alreadyExists =
              previous.some(
                (message) =>
                  message.id === newMessage.id
              );

            if (alreadyExists) {
              return previous;
            }

            return [...previous, newMessage];
          });

          setConversations((previous) =>
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
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id]);

  // ============================================================
  // SILENT 5-SECOND POLLING FALLBACK
  //
  // Realtime remains the primary live-update mechanism.
  // Polling silently checks the current conversation
  // in case a Realtime event is missed.
  //
  // No page reload.
  // No loading spinner.
  // No conversation reset.
  // No input reset.
  // ============================================================

  useEffect(() => {
    if (!selectedConversation?.id) return;

    const conversationId =
      selectedConversation.id;

    const refreshMessagesSilently =
      async () => {
        const { data, error: messagesError } =
          await supabase
            .from("client_messages")
            .select(`
              id,
              conversation_id,
              sender_id,
              sender_type,
              message,
              attachment_url,
              attachment_name,
              is_read,
              created_at
            `)
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

        setMessages((previous) => {
          if (
            previous.length === data.length &&
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

        if (data.length > 0) {
          const latestMessage =
            data[data.length - 1];

          setConversations((previous) =>
            previous
              .map((conversation) =>
                conversation.id ===
                conversationId
                  ? {
                      ...conversation,
                      last_message_at:
                        latestMessage.created_at,
                      updated_at:
                        latestMessage.created_at,
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
      };

    const interval = setInterval(
      refreshMessagesSilently,
      5000
    );

    return () => {
      clearInterval(interval);
    };
  }, [selectedConversation?.id]);

  // ============================================================
  // CREATE GENERAL CONVERSATION
  // ============================================================

  const createGeneralConversation =
    async () => {
      try {
        setCreatingConversation(true);
        setError("");

        const existingGeneral =
          conversations.find(
            (conversation) =>
              conversation.conversation_type ===
                "general" &&
              !conversation.project_id
          );

        if (existingGeneral) {
          shouldAutoScrollRef.current = true;
          setSelectedConversation(
            existingGeneral
          );
          return;
        }

        const { data, error: createError } =
          await supabase
            .from("client_conversations")
            .insert({
              client_id: client.id,
              conversation_type: "general",
              subject: "General Support",
            })
            .select()
            .single();

        if (createError) {
          throw createError;
        }

        setConversations((previous) => [
          data,
          ...previous,
        ]);

        shouldAutoScrollRef.current = true;
        setSelectedConversation(data);
      } catch (err) {
        console.error(
          "Failed to create conversation:",
          err
        );

        setError(
          "Unable to start a conversation."
        );
      } finally {
        setCreatingConversation(false);
      }
    };

  // ============================================================
  // CREATE PROJECT CONVERSATION
  // ============================================================

  const createProjectConversation =
    async (project) => {
      if (!project?.id) return;

      try {
        setCreatingConversation(true);
        setError("");

        const existingProject =
          conversations.find(
            (conversation) =>
              conversation.project_id ===
                project.id &&
              conversation.conversation_type ===
                "project"
          );

        if (existingProject) {
          shouldAutoScrollRef.current = true;
          setSelectedConversation(
            existingProject
          );
          return;
        }

        const { data, error: createError } =
          await supabase
            .from("client_conversations")
            .insert({
              client_id: client.id,
              project_id: project.id,
              conversation_type: "project",
              subject:
                project.title ||
                "Project Discussion",
            })
            .select()
            .single();

        if (createError) {
          throw createError;
        }

        setConversations((previous) => [
          data,
          ...previous,
        ]);

        shouldAutoScrollRef.current = true;
        setSelectedConversation(data);
      } catch (err) {
        console.error(
          "Failed to create project conversation:",
          err
        );

        setError(
          "Unable to start the project conversation."
        );
      } finally {
        setCreatingConversation(false);
      }
    };

  // ============================================================
  // SELECT CONVERSATION
  // ============================================================

  const selectConversation = (
    conversation
  ) => {
    shouldAutoScrollRef.current = true;
    setMessages([]);
    setMessageText("");
    setSelectedConversation(conversation);
  };

  // ============================================================
  // CLOSE CONVERSATION
  // ============================================================

  const closeConversation = () => {
    shouldAutoScrollRef.current = true;
    setSelectedConversation(null);
    setMessages([]);
    setMessageText("");
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async () => {
    const trimmedMessage =
      messageText.trim();

    if (
      !trimmedMessage ||
      !selectedConversation?.id ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "User is not authenticated."
        );
      }

      const { data, error: sendError } =
        await supabase
          .from("client_messages")
          .insert({
            conversation_id:
              selectedConversation.id,
            sender_id: user.id,
            sender_type: "client",
            message: trimmedMessage,
          })
          .select()
          .single();

      if (sendError) {
        throw sendError;
      }

      shouldAutoScrollRef.current = true;

      setMessages((previous) => {
        const alreadyExists =
          previous.some(
            (message) =>
              message.id === data.id
          );

        if (alreadyExists) {
          return previous;
        }

        return [...previous, data];
      });

      setMessageText("");

      const now =
        new Date().toISOString();

      await supabase
        .from("client_conversations")
        .update({
          last_message_at: now,
          updated_at: now,
        })
        .eq(
          "id",
          selectedConversation.id
        );

      setConversations((previous) =>
        previous
          .map((conversation) =>
            conversation.id ===
            selectedConversation.id
              ? {
                  ...conversation,
                  last_message_at: now,
                  updated_at: now,
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
    } catch (err) {
      console.error(
        "Failed to send message:",
        err
      );

      setError(
        "Unable to send your message."
      );
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // ENTER TO SEND
  // ============================================================

  const handleMessageKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  // ============================================================
  // PROJECT LOOKUP
  // ============================================================

  const getProject = (projectId) => {
    return projects.find(
      (project) =>
        project.id === projectId
    );
  };

  // ============================================================
  // CONVERSATION TITLE
  // ============================================================

  const getConversationTitle = (
    conversation
  ) => {
    if (
      conversation.conversation_type ===
      "project"
    ) {
      const project = getProject(
        conversation.project_id
      );

      return (
        project?.title ||
        conversation.subject ||
        "Project Discussion"
      );
    }

    return (
      conversation.subject ||
      "General Support"
    );
  };

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(
      date
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // FORMAT CONVERSATION DATE
  // ============================================================

  const formatConversationDate = (
    value
  ) => {
    if (!value) return "";

    const date = new Date(value);
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const startOfYesterday =
      new Date(startOfToday);

    startOfYesterday.setDate(
      startOfYesterday.getDate() - 1
    );

    if (date >= startOfToday) {
      return "Today";
    }

    if (date >= startOfYesterday) {
      return "Yesterday";
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ============================================================
  // MESSAGE PREVIEW
  // ============================================================

  const getMessagePreview = (
    conversation
  ) => {
    const preview =
      conversation.latestMessage?.message ||
      "";

    if (!preview) {
      return "No messages yet";
    }

    return preview.length > 72
      ? `${preview.slice(0, 72)}...`
      : preview;
  };

  // ============================================================
  // GET LATEST MESSAGE
  // ============================================================

  const getLatestMessage = (
    conversation
  ) => {
    return conversation.latestMessage;
  };

  // ============================================================
  // ENRICH CONVERSATIONS WITH LATEST MESSAGE
  //
  // This runs from the currently loaded message state
  // without changing the database structure.
  // ============================================================

  const conversationsWithPreview =
    conversations.map(
      (conversation) => {
        if (
          selectedConversation?.id ===
          conversation.id &&
          messages.length > 0
        ) {
          return {
            ...conversation,
            latestMessage:
              messages[messages.length - 1],
          };
        }

        return conversation;
      }
    );

  // ============================================================
  // UI
  // ============================================================

  return (
    <section className="client-portal-section client-messages-section">
      <div className="client-messages-header">
        <div>
          <span className="client-portal-eyebrow">
            COMMUNICATION CENTER
          </span>

          <h2>Messages</h2>

          <p>
            Communicate directly with the EXCWA
            team about your projects and
            support requests.
          </p>
        </div>

        <button
          type="button"
          className="client-messages-new-btn"
          onClick={
            createGeneralConversation
          }
          disabled={
            creatingConversation
          }
        >
          {creatingConversation ? (
            <Loader2
              size={17}
              className="client-message-spin"
            />
          ) : (
            <Plus size={17} />
          )}

          New Conversation
        </button>
      </div>

      {error && (
        <div className="client-messages-error">
          {error}
        </div>
      )}

      <div className="client-messages-layout">
        {/* =====================================================
            CONVERSATION LIST
           ===================================================== */}

        <aside className="client-conversations-panel">
          <div className="client-conversations-heading">
            <div>
              <span>
                CONVERSATIONS
              </span>

              <strong>
                {conversations.length}
              </strong>
            </div>
          </div>

          <div className="client-conversations-list">
            {loadingConversations ? (
              <div className="client-messages-loading">
                <Loader2
                  size={22}
                  className="client-message-spin"
                />

                <span>
                  Loading conversations...
                </span>
              </div>
            ) : conversations.length ===
              0 ? (
              <div className="client-conversations-empty">
                <MessageSquare size={22} />

                <strong>
                  No conversations yet
                </strong>

                <span>
                  Start a conversation with
                  the EXCWA team.
                </span>
              </div>
            ) : (
              conversationsWithPreview.map(
                (conversation) => {
                  const project =
                    getProject(
                      conversation.project_id
                    );

                  const isActive =
                    selectedConversation?.id ===
                    conversation.id;

                  const latestMessage =
                    getLatestMessage(
                      conversation
                    );

                  return (
                    <button
                      key={
                        conversation.id
                      }
                      type="button"
                      className={`client-conversation-item ${
                        isActive
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        selectConversation(
                          conversation
                        )
                      }
                    >
                      <div className="client-conversation-icon">
                        {conversation.conversation_type ===
                        "project" ? (
                          <FolderKanban
                            size={18}
                          />
                        ) : (
                          <Headphones
                            size={18}
                          />
                        )}
                      </div>

                      <div className="client-conversation-info">
                        <strong>
                          {getConversationTitle(
                            conversation
                          )}
                        </strong>

                        <span>
                          {latestMessage
                            ? `${
                                latestMessage.sender_type ===
                                "client"
                                  ? "You: "
                                  : "EXCWA: "
                              }${getMessagePreview(
                                conversation
                              )}`
                            : conversation.conversation_type ===
                              "project"
                            ? project?.category ||
                              "Project conversation"
                            : "EXCWA Support"}
                        </span>
                      </div>

                      <time>
                        {formatConversationDate(
                          conversation.last_message_at
                        )}
                      </time>
                    </button>
                  );
                }
              )
            )}
          </div>

          {/* =================================================
              PROJECT CONVERSATION SHORTCUTS
             ================================================= */}

          {projects.length > 0 && (
            <div className="client-project-message-shortcuts">
              <div className="client-project-shortcuts-heading">
                <span>
                  PROJECTS
                </span>
              </div>

              {projects
                .slice(0, 5)
                .map((project) => {
                  const hasConversation =
                    conversations.some(
                      (conversation) =>
                        conversation.project_id ===
                          project.id &&
                        conversation.conversation_type ===
                          "project"
                    );

                  return (
                    <button
                      key={project.id}
                      type="button"
                      className="client-project-message-shortcut"
                      onClick={() =>
                        createProjectConversation(
                          project
                        )
                      }
                      disabled={
                        creatingConversation
                      }
                    >
                      <FolderKanban
                        size={15}
                      />

                      <span>
                        {project.title}
                      </span>

                      {!hasConversation && (
                        <Plus size={14} />
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </aside>

        {/* =====================================================
            MESSAGE AREA
           ===================================================== */}

        <div className="client-message-thread">
          {!selectedConversation ? (
            <div className="client-message-thread-empty">
              <div className="client-portal-empty-icon">
                <MessageSquare
                  size={25}
                />
              </div>

              <h3>
                Start a conversation
              </h3>

              <p>
                Select a conversation or
                start a new one with the
                EXCWA team.
              </p>
            </div>
          ) : (
            <>
              <header className="client-message-thread-header">
                <div className="client-message-thread-title">
                  <div className="client-message-thread-icon">
                    {selectedConversation.conversation_type ===
                    "project" ? (
                      <FolderKanban
                        size={19}
                      />
                    ) : (
                      <Headphones
                        size={19}
                      />
                    )}
                  </div>

                  <div>
                    <h3>
                      {getConversationTitle(
                        selectedConversation
                      )}
                    </h3>

                    <span>
                      {selectedConversation.conversation_type ===
                      "project"
                        ? "Project communication"
                        : "EXCWA Support"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="client-message-thread-close"
                  onClick={
                    closeConversation
                  }
                  aria-label="Close conversation"
                  title="Close conversation"
                >
                  <X size={18} />
                </button>
              </header>

              <div
                ref={messagesThreadRef}
                className="client-message-list"
              >
                {loadingMessages ? (
                  <div className="client-messages-loading">
                    <Loader2
                      size={22}
                      className="client-message-spin"
                    />

                    <span>
                      Loading messages...
                    </span>
                  </div>
                ) : messages.length ===
                  0 ? (
                  <div className="client-message-thread-empty">
                    <div className="client-portal-empty-icon">
                      <MessageSquare
                        size={22}
                      />
                    </div>

                    <h3>
                      No messages yet
                    </h3>

                    <p>
                      Send the first message
                      to the EXCWA team.
                    </p>
                  </div>
                ) : (
                  messages.map(
                    (message) => {
                      const isClient =
                        message.sender_type ===
                        "client";

                      return (
                        <div
                          key={
                            message.id
                          }
                          className={`client-message-row ${
                            isClient
                              ? "client"
                              : "admin"
                          }`}
                        >
                          <div className="client-message-bubble">
                            <p>
                              {
                                message.message
                              }
                            </p>

                            <time>
                              {formatTime(
                                message.created_at
                              )}
                            </time>
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>

              <div className="client-message-composer">
                <textarea
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleMessageKeyDown
                  }
                  placeholder="Write a message to the EXCWA team..."
                  rows={1}
                  disabled={sending}
                />

                <button
                  type="button"
                  onClick={
                    sendMessage
                  }
                  disabled={
                    sending ||
                    !messageText.trim()
                  }
                  aria-label="Send message"
                >
                  {sending ? (
                    <Loader2
                      size={18}
                      className="client-message-spin"
                    />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}