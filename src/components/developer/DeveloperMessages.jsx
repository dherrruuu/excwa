import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MessageSquare,
  Send,
  RefreshCw,
  X,
} from "lucide-react";

import {
  createGeneralDeveloperConversation,
  getDeveloperMessages,
  getMyDeveloperConversations,
  sendDeveloperMessage,
  subscribeToDeveloperMessages,
  unsubscribeFromDeveloperMessages,
} from "../../services/developer/developerMessagingService";

import "../../styles/developer/developer-messages.css";

/* ============================================================
   HELPERS
   ============================================================ */

function formatConversationDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getConversationTitle(conversation) {
  if (conversation?.subject?.trim()) {
    return conversation.subject.trim();
  }

  if (conversation?.conversation_type === "project") {
    return "Project Discussion";
  }

  return "EXCWA Support";
}

function getMessagePreview(message) {
  if (!message?.message) {
    return "No messages yet";
  }

  const value = String(message.message)
    .replace(/\s+/g, " ")
    .trim();

  if (!value) {
    return "No messages yet";
  }

  if (value.length <= 70) {
    return value;
  }

  return value.slice(0, 67) + "...";
}

function sortConversations(items) {
  return [...items].sort(function (a, b) {
    const dateA = new Date(
      a?.last_message_at ||
        a?.updated_at ||
        a?.created_at ||
        0
    ).getTime();

    const dateB = new Date(
      b?.last_message_at ||
        b?.updated_at ||
        b?.created_at ||
        0
    ).getTime();

    return dateB - dateA;
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function DeveloperMessages() {
  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] =
    useState(null);

  /*
   * Stores the latest message for every conversation.
   *
   * This fixes the old behavior where only the currently
   * selected conversation had a sidebar preview.
   */
  const [conversationPreviews, setConversationPreviews] =
    useState({});

  const [messages, setMessages] = useState([]);

  const [messageText, setMessageText] = useState("");

  const [loading, setLoading] = useState(true);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");

  const [shouldAutoScroll, setShouldAutoScroll] =
    useState(true);

  const messagesThreadRef = useRef(null);

  const realtimeChannelRef = useRef(null);

  /* ==========================================================
     LOAD CONVERSATIONS
     ========================================================== */

  const loadConversations = useCallback(async function () {
    try {
      setLoading(true);
      setError("");

      const data = await getMyDeveloperConversations();

      const normalized = Array.isArray(data)
        ? sortConversations(data)
        : [];

      setConversations(normalized);
    } catch (err) {
      console.error(
        "Unable to load developer conversations:",
        err
      );

      setError(
        err?.message ||
          "Unable to load your conversations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(
    function () {
      loadConversations();
    },
    [loadConversations]
  );

  /* ==========================================================
     LOAD MESSAGES
     ========================================================== */

  const loadMessages = useCallback(
    async function (conversationId) {
      if (!conversationId) {
        setMessages([]);
        return;
      }

      try {
        setMessagesLoading(true);
        setError("");

        const data =
          await getDeveloperMessages(conversationId);

        const normalized = Array.isArray(data)
          ? data
          : [];

        setMessages(normalized);

        /*
         * Store the latest message for the sidebar.
         */
        if (normalized.length > 0) {
          const latest =
            normalized[normalized.length - 1];

          setConversationPreviews(
            function (current) {
              return {
                ...current,
                [conversationId]: latest,
              };
            }
          );

          setConversations(function (current) {
            return sortConversations(
              current.map(function (conversation) {
                if (
                  conversation.id !==
                  conversationId
                ) {
                  return conversation;
                }

                return {
                  ...conversation,
                  last_message_at:
                    latest.created_at,
                  updated_at:
                    latest.created_at,
                };
              })
            );
          });
        }
      } catch (err) {
        console.error(
          "Unable to load developer messages:",
          err
        );

        setError(
          err?.message ||
            "Unable to load messages."
        );
      } finally {
        setMessagesLoading(false);
      }
    },
    []
  );

  /* ==========================================================
     SELECT CONVERSATION
     ========================================================== */

  const handleSelectConversation =
    useCallback(
      async function (conversation) {
        if (!conversation?.id) {
          return;
        }

        setError("");
        setShouldAutoScroll(true);
        setMessageText("");
        setMessages([]);
        setSelectedConversation(conversation);

        await loadMessages(conversation.id);
      },
      [loadMessages]
    );

  /* ==========================================================
     REALTIME
     ========================================================== */

  useEffect(
    function () {
      if (!selectedConversation?.id) {
        return undefined;
      }

      let active = true;

      async function setupRealtime() {
        if (realtimeChannelRef.current) {
          await unsubscribeFromDeveloperMessages(
            realtimeChannelRef.current
          );

          realtimeChannelRef.current = null;
        }

        const conversationId =
          selectedConversation.id;

        const channel =
          subscribeToDeveloperMessages(
            conversationId,
            function (incomingMessage) {
              if (!active || !incomingMessage) {
                return;
              }

              /*
               * Add incoming message to the thread
               * only if it isn't already present.
               */
              setMessages(function (current) {
                const exists = current.some(
                  function (item) {
                    return (
                      item.id ===
                      incomingMessage.id
                    );
                  }
                );

                if (exists) {
                  return current;
                }

                return [
                  ...current,
                  incomingMessage,
                ];
              });

              /*
               * Update sidebar preview.
               */
              setConversationPreviews(
                function (current) {
                  return {
                    ...current,
                    [conversationId]:
                      incomingMessage,
                  };
                }
              );

              /*
               * Update conversation timestamp
               * and move conversation to the top.
               */
              setConversations(
                function (current) {
                  return sortConversations(
                    current.map(
                      function (conversation) {
                        if (
                          conversation.id !==
                          incomingMessage.conversation_id
                        ) {
                          return conversation;
                        }

                        return {
                          ...conversation,
                          last_message_at:
                            incomingMessage.created_at,
                          updated_at:
                            incomingMessage.created_at,
                        };
                      }
                    )
                  );
                }
              );

              setShouldAutoScroll(true);
            }
          );

        realtimeChannelRef.current = channel;
      }

      setupRealtime();

      return function () {
        active = false;

        if (realtimeChannelRef.current) {
          unsubscribeFromDeveloperMessages(
            realtimeChannelRef.current
          );

          realtimeChannelRef.current = null;
        }
      };
    },
    [selectedConversation?.id]
  );

  /* ==========================================================
     FALLBACK POLLING
     ========================================================== */

  useEffect(
    function () {
      if (!selectedConversation?.id) {
        return undefined;
      }

      const conversationId =
        selectedConversation.id;

      const interval = setInterval(
        async function () {
          try {
            const latest =
              await getDeveloperMessages(
                conversationId
              );

            if (!Array.isArray(latest)) {
              return;
            }

            setMessages(function (current) {
              const currentIds = current
                .map(function (item) {
                  return item.id;
                })
                .join("|");

              const latestIds = latest
                .map(function (item) {
                  return item.id;
                })
                .join("|");

              if (currentIds === latestIds) {
                return current;
              }

              return latest;
            });

            /*
             * Keep the sidebar preview in sync
             * even if Realtime is unavailable.
             */
            if (latest.length > 0) {
              const latestMessage =
                latest[latest.length - 1];

              setConversationPreviews(
                function (current) {
                  return {
                    ...current,
                    [conversationId]:
                      latestMessage,
                  };
                }
              );

              setConversations(
                function (current) {
                  return sortConversations(
                    current.map(
                      function (conversation) {
                        if (
                          conversation.id !==
                          conversationId
                        ) {
                          return conversation;
                        }

                        return {
                          ...conversation,
                          last_message_at:
                            latestMessage.created_at,
                          updated_at:
                            latestMessage.created_at,
                        };
                      }
                    )
                  );
                }
              );
            }
          } catch (err) {
            console.error(
              "Developer message polling failed:",
              err
            );
          }
        },
        5000
      );

      return function () {
        clearInterval(interval);
      };
    },
    [selectedConversation?.id]
  );

  /* ==========================================================
     AUTO SCROLL
     ========================================================== */

  useEffect(
    function () {
      if (
        !shouldAutoScroll ||
        !messagesThreadRef.current
      ) {
        return;
      }

      const element =
        messagesThreadRef.current;

      requestAnimationFrame(function () {
        element.scrollTop =
          element.scrollHeight;
      });
    },
    [messages, shouldAutoScroll]
  );

  /* ==========================================================
     SCROLL TRACKING
     ========================================================== */

  const handleMessagesScroll =
    function () {
      const element =
        messagesThreadRef.current;

      if (!element) {
        return;
      }

      const distanceFromBottom =
        element.scrollHeight -
        element.scrollTop -
        element.clientHeight;

      setShouldAutoScroll(
        distanceFromBottom < 100
      );
    };

  /* ==========================================================
     CREATE GENERAL CONVERSATION
     ========================================================== */

  const handleNewConversation =
    async function () {
      if (creating) {
        return;
      }

      try {
        setCreating(true);
        setError("");

        const conversation =
          await createGeneralDeveloperConversation(
            {
              subject: "General Support",
            }
          );

        if (!conversation?.id) {
          throw new Error(
            "Unable to create the conversation."
          );
        }

        setConversations(function (current) {
          return sortConversations([
            conversation,
            ...current.filter(
              function (item) {
                return (
                  item.id !== conversation.id
                );
              }
            ),
          ]);
        });

        setConversationPreviews(
          function (current) {
            return {
              ...current,
              [conversation.id]: null,
            };
          }
        );

        setShouldAutoScroll(true);
        setMessages([]);
        setMessageText("");
        setSelectedConversation(
          conversation
        );
      } catch (err) {
        console.error(
          "Unable to create developer conversation:",
          err
        );

        setError(
          err?.message ||
            "Unable to start a conversation."
        );
      } finally {
        setCreating(false);
      }
    };

  /* ==========================================================
     SEND MESSAGE
     ========================================================== */

  const handleSendMessage =
    async function () {
      const cleanMessage =
        messageText.trim();

      if (
        !cleanMessage ||
        !selectedConversation?.id ||
        sending
      ) {
        return;
      }

      try {
        setSending(true);
        setError("");
        setShouldAutoScroll(true);

        const newMessage =
          await sendDeveloperMessage({
            conversationId:
              selectedConversation.id,
            message: cleanMessage,
          });

        /*
         * Add immediately for a fast UI response.
         * Realtime will ignore the duplicate.
         */
        setMessages(function (current) {
          const exists = current.some(
            function (item) {
              return (
                item.id === newMessage.id
              );
            }
          );

          if (exists) {
            return current;
          }

          return [
            ...current,
            newMessage,
          ];
        });

        /*
         * Update sidebar preview immediately.
         */
        setConversationPreviews(
          function (current) {
            return {
              ...current,
              [selectedConversation.id]:
                newMessage,
            };
          }
        );

        /*
         * Move conversation to top.
         */
        setConversations(
          function (current) {
            return sortConversations(
              current.map(
                function (conversation) {
                  if (
                    conversation.id !==
                    selectedConversation.id
                  ) {
                    return conversation;
                  }

                  return {
                    ...conversation,
                    last_message_at:
                      newMessage.created_at,
                    updated_at:
                      newMessage.created_at,
                  };
                }
              )
            );
          }
        );

        setMessageText("");
      } catch (err) {
        console.error(
          "Unable to send developer message:",
          err
        );

        setError(
          err?.message ||
            "Unable to send message."
        );
      } finally {
        setSending(false);
      }
    };

  /* ==========================================================
     KEYBOARD
     ========================================================== */

  const handleComposerKeyDown =
    function (event) {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        handleSendMessage();
      }
    };

  /* ==========================================================
     SIDEBAR DATA
     ========================================================== */

  const conversationItems = useMemo(
    function () {
      return conversations.map(
        function (conversation) {
          return {
            ...conversation,
            latestMessage:
              conversationPreviews[
                conversation.id
              ] || null,
          };
        }
      );
    },
    [
      conversations,
      conversationPreviews,
    ]
  );

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="dev-messages-section">

      {/* ====================================================
          HEADER
          ==================================================== */}

      <div className="dev-messages-header">
        <div>
          <span className="eyebrow">
            Communication
          </span>

          <h2>Messages</h2>

          <p>
            Communicate directly with the
            EXCWA team about your work,
            projects and support requests.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn dev-messages-new-btn"
          onClick={handleNewConversation}
          disabled={creating}
        >
          <MessageSquare size={14} />

          {creating
            ? "Starting..."
            : "New Conversation"}
        </button>
      </div>

      {/* ====================================================
          ERROR
          ==================================================== */}

      {error && (
        <div className="dev-messages-error">
          {error}
        </div>
      )}

      {/* ====================================================
          MESSAGE WORKSPACE
          ==================================================== */}

      <div className="dev-messages-layout">

        {/* ==================================================
            CONVERSATIONS
            ================================================== */}

        <aside className="dev-conversations-panel">

          <div className="dev-conversations-heading">
            <span>Conversations</span>

            <button
              type="button"
              className="dev-conversation-refresh"
              onClick={loadConversations}
              title="Refresh conversations"
              aria-label="Refresh conversations"
              disabled={loading}
            >
              <RefreshCw
                size={14}
                className={
                  loading
                    ? "dev-loading-icon"
                    : ""
                }
              />
            </button>
          </div>

          <div className="dev-conversations-list">

            {loading ? (
              <div className="dev-messages-loading">
                <RefreshCw
                  size={18}
                  className="dev-loading-icon"
                />

                <span>
                  Loading conversations...
                </span>
              </div>
            ) : conversationItems.length ===
              0 ? (
              <div className="dev-conversations-empty">
                <MessageSquare size={22} />

                <span>
                  No conversations yet.
                </span>

                <small>
                  Start a conversation with
                  the EXCWA team.
                </small>
              </div>
            ) : (
              conversationItems.map(
                function (conversation) {
                  const isActive =
                    selectedConversation?.id ===
                    conversation.id;

                  const latestMessage =
                    conversation.latestMessage;

                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      className={
                        "dev-conversation-item" +
                        (isActive
                          ? " active"
                          : "")
                      }
                      onClick={function () {
                        handleSelectConversation(
                          conversation
                        );
                      }}
                    >
                      <div className="dev-conversation-icon">
                        <MessageSquare
                          size={15}
                        />
                      </div>

                      <div className="dev-conversation-info">

                        <div className="dev-conversation-topline">
                          <strong>
                            {getConversationTitle(
                              conversation
                            )}
                          </strong>

                          <span>
                            {formatConversationDate(
                              conversation.last_message_at
                            )}
                          </span>
                        </div>

                        <p>
                          {getMessagePreview(
                            latestMessage
                          )}
                        </p>

                      </div>
                    </button>
                  );
                }
              )
            )}

          </div>
        </aside>

        {/* ==================================================
            MESSAGE THREAD
            ================================================== */}

        <section className="dev-message-thread">

          {!selectedConversation ? (
            <div className="dev-message-thread-empty">
              <MessageSquare size={32} />

              <h3>
                Select a conversation
              </h3>

              <p>
                Choose a conversation from
                the left panel or start a new
                one with the EXCWA team.
              </p>
            </div>
          ) : (
            <>
              {/* ============================================
                  THREAD HEADER
                  ============================================ */}

              <header className="dev-message-thread-header">

                <div>
                  <span>
                    {selectedConversation.conversation_type ===
                    "project"
                      ? "Project Conversation"
                      : "General Support"}
                  </span>

                  <h3>
                    {getConversationTitle(
                      selectedConversation
                    )}
                  </h3>
                </div>

                <button
                  type="button"
                  className="dev-message-thread-close"
                  onClick={function () {
                    setSelectedConversation(
                      null
                    );

                    setMessages([]);
                    setMessageText("");
                    setError("");
                  }}
                  title="Close conversation"
                  aria-label="Close conversation"
                >
                  <X size={16} />
                </button>

              </header>

              {/* ==========================================
                  MESSAGES
                  ========================================== */}

              <div
                ref={messagesThreadRef}
                className="dev-message-list"
                onScroll={
                  handleMessagesScroll
                }
              >

                {messagesLoading ? (
                  <div className="dev-messages-loading">
                    <RefreshCw
                      size={18}
                      className="dev-loading-icon"
                    />

                    <span>
                      Loading messages...
                    </span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="dev-message-thread-empty">
                    <MessageSquare
                      size={26}
                    />

                    <h3>
                      Start the conversation
                    </h3>

                    <p>
                      Send a message to the
                      EXCWA team.
                    </p>
                  </div>
                ) : (
                  messages.map(
                    function (message) {
                      const isMine =
                        message.sender_type ===
                        "developer";

                      return (
                        <div
                          key={message.id}
                          className={
                            "dev-message-row" +
                            (isMine
                              ? " mine"
                              : " received")
                          }
                        >
                          <div className="dev-message-bubble">

                            <p>
                              {
                                message.message
                              }
                            </p>

                            <span>
                              {formatMessageTime(
                                message.created_at
                              )}
                            </span>

                          </div>
                        </div>
                      );
                    }
                  )
                )}

              </div>

              {/* ==========================================
                  COMPOSER
                  ========================================== */}

              <div className="dev-message-composer">

                <textarea
                  value={messageText}
                  onChange={function (
                    event
                  ) {
                    setMessageText(
                      event.target.value
                    );
                  }}
                  onKeyDown={
                    handleComposerKeyDown
                  }
                  placeholder="Write a message..."
                  rows={1}
                  disabled={sending}
                />

                <button
                  type="button"
                  onClick={
                    handleSendMessage
                  }
                  disabled={
                    sending ||
                    !messageText.trim()
                  }
                  title="Send message"
                  aria-label="Send message"
                >
                  {sending ? (
                    <RefreshCw
                      size={16}
                      className="dev-loading-icon"
                    />
                  ) : (
                    <Send size={16} />
                  )}
                </button>

              </div>
            </>
          )}

        </section>

      </div>
    </div>
  );
}