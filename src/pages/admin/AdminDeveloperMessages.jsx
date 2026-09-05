import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import {
  getDeveloperMessages,
  sendDeveloperMessage,
} from "../../services/developer/developerMessagingService";

import "../../styles/admin/admin-developer-messages.css";

function formatConversationDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
}

function formatMessageTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getConversationTitle(conversation) {
  if (!conversation) return "Conversation";

  if (conversation.subject?.trim()) {
    return conversation.subject.trim();
  }

  if (conversation.conversation_type === "project") {
    return "Project Discussion";
  }

  return "General Support";
}

function getMessagePreview(conversation) {
  const latest = conversation?.latestMessage;

  if (!latest?.message) {
    return "No messages yet";
  }

  const text = latest.message.trim();

  if (text.length <= 52) {
    return text;
  }

  return `${text.slice(0, 52)}…`;
}

export default function AdminDeveloperMessages() {
  const [developers, setDevelopers] = useState([]);
  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const messagesThreadRef = useRef(null);
  const realtimeChannelRef = useRef(null);
  const globalRealtimeChannelRef = useRef(null);

  const shouldAutoScrollRef = useRef(true);

  const loadDevelopersAndConversations = useCallback(
    async function () {
      try {
        setError("");

        const [
          { data: developerData, error: developerError },
          { data: conversationData, error: conversationError },
        ] = await Promise.all([
          supabase
            .from("developer_profiles")
            .select(`
              id,
              user_id,
              full_name,
              email,
              profile_photo_url,
              status
            `)
            .order("full_name", {
              ascending: true,
            }),

          supabase
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
            .order("last_message_at", {
              ascending: false,
            }),
        ]);

        if (developerError) {
          throw developerError;
        }

        if (conversationError) {
          throw conversationError;
        }

        const safeDevelopers = developerData || [];
        const safeConversations = conversationData || [];

        setDevelopers(safeDevelopers);

        /*
         * Attach developer information to every conversation.
         */
        const developerMap = new Map(
          safeDevelopers.map(function (developer) {
            return [developer.id, developer];
          })
        );

        const enrichedConversations = safeConversations.map(
          function (conversation) {
            return {
              ...conversation,
              developer:
                developerMap.get(conversation.developer_id) || null,
              latestMessage: null,
            };
          }
        );

        /*
         * Load latest message for each conversation so the
         * admin sidebar can show useful previews.
         */
        if (enrichedConversations.length > 0) {
          const conversationIds = enrichedConversations.map(
            function (conversation) {
              return conversation.id;
            }
          );

          const { data: latestMessages, error: latestError } =
            await supabase
              .from("developer_messages")
              .select(`
                id,
                conversation_id,
                sender_id,
                sender_type,
                message,
                created_at
              `)
              .in("conversation_id", conversationIds)
              .order("created_at", {
                ascending: false,
              });

          if (latestError) {
            throw latestError;
          }

          const latestMap = new Map();

          (latestMessages || []).forEach(function (message) {
            if (!latestMap.has(message.conversation_id)) {
              latestMap.set(message.conversation_id, message);
            }
          });

          enrichedConversations.forEach(function (conversation) {
            conversation.latestMessage =
              latestMap.get(conversation.id) || null;
          });
        }

        setConversations(enrichedConversations);
      } catch (loadError) {
        console.error(
          "Admin developer messaging load error:",
          loadError
        );

        setError(
          loadError?.message ||
            "Unable to load developer conversations."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(
    function () {
      loadDevelopersAndConversations();
    },
    [loadDevelopersAndConversations]
  );

  const loadMessages = useCallback(async function (conversationId) {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setMessagesLoading(true);
      setError("");

      const data = await getDeveloperMessages(conversationId);

      setMessages(data || []);
    } catch (loadError) {
      console.error(
        "Admin developer messages load error:",
        loadError
      );

      setError(
        loadError?.message ||
          "Unable to load this conversation."
      );
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(
    function () {
      if (!selectedConversation?.id) {
        setMessages([]);
        return;
      }

      loadMessages(selectedConversation.id);
    },
    [selectedConversation?.id, loadMessages]
  );

  /*
   * Realtime subscription for the currently selected conversation.
   */
  useEffect(
    function () {
      if (!selectedConversation?.id) {
        return undefined;
      }

      if (realtimeChannelRef.current) {
        supabase.removeChannel(
          realtimeChannelRef.current
        );

        realtimeChannelRef.current = null;
      }

      const conversationId = selectedConversation.id;

      const channel = supabase
        .channel(
          `admin-developer-conversation-${conversationId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "developer_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          function (payload) {
            const incomingMessage = payload.new;

            setMessages(function (currentMessages) {
              const exists = currentMessages.some(
                function (message) {
                  return message.id === incomingMessage.id;
                }
              );

              if (exists) {
                return currentMessages;
              }

              return [
                ...currentMessages,
                incomingMessage,
              ];
            });

            setConversations(function (current) {
              return current
                .map(function (conversation) {
                  if (conversation.id !== conversationId) {
                    return conversation;
                  }

                  return {
                    ...conversation,
                    last_message_at:
                      incomingMessage.created_at,
                    updated_at:
                      incomingMessage.created_at,
                    latestMessage: incomingMessage,
                  };
                })
                .sort(function (a, b) {
                  return (
                    new Date(b.last_message_at || 0) -
                    new Date(a.last_message_at || 0)
                  );
                });
            });
          }
        )
        .subscribe();

      realtimeChannelRef.current = channel;

      return function () {
        if (realtimeChannelRef.current) {
          supabase.removeChannel(
            realtimeChannelRef.current
          );

          realtimeChannelRef.current = null;
        }
      };
    },
    [selectedConversation?.id]
  );

  /*
   * Global realtime listener.
   *
   * This updates conversation previews even when the admin
   * is currently viewing another developer.
   */
  useEffect(function () {
    const channel = supabase
      .channel("admin-developer-messages-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "developer_messages",
        },
        function (payload) {
          const incomingMessage = payload.new;

          setConversations(function (current) {
            const exists = current.some(
              function (conversation) {
                return (
                  conversation.id ===
                  incomingMessage.conversation_id
                );
              }
            );

            if (!exists) {
              return current;
            }

            return current
              .map(function (conversation) {
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
                  latestMessage: incomingMessage,
                };
              })
              .sort(function (a, b) {
                return (
                  new Date(b.last_message_at || 0) -
                  new Date(a.last_message_at || 0)
                );
              });
          });
        }
      )
      .subscribe();

    globalRealtimeChannelRef.current = channel;

    return function () {
      if (globalRealtimeChannelRef.current) {
        supabase.removeChannel(
          globalRealtimeChannelRef.current
        );

        globalRealtimeChannelRef.current = null;
      }
    };
  }, []);

  /*
   * Five-second fallback polling.
   */
  useEffect(
    function () {
      const interval = window.setInterval(function () {
        loadDevelopersAndConversations();
      }, 5000);

      return function () {
        window.clearInterval(interval);
      };
    },
    [loadDevelopersAndConversations]
  );

  /*
   * Smart auto-scroll.
   */
  useEffect(
    function () {
      const thread = messagesThreadRef.current;

      if (!thread || !shouldAutoScrollRef.current) {
        return;
      }

      requestAnimationFrame(function () {
        thread.scrollTop = thread.scrollHeight;
      });
    },
    [messages]
  );

  function handleThreadScroll() {
    const thread = messagesThreadRef.current;

    if (!thread) return;

    const distanceFromBottom =
      thread.scrollHeight -
      thread.scrollTop -
      thread.clientHeight;

    shouldAutoScrollRef.current =
      distanceFromBottom < 100;
  }

  function handleSelectConversation(conversation) {
    setSelectedConversation(conversation);
    setMessageText("");

    shouldAutoScrollRef.current = true;
  }

  async function handleSendMessage() {
    const text = messageText.trim();

    if (!text || !selectedConversation?.id || sending) {
      return;
    }

    try {
      setSending(true);
      setError("");

      shouldAutoScrollRef.current = true;

      const sentMessage = await sendDeveloperMessage({
        conversationId: selectedConversation.id,
        message: text,
      });

      setMessages(function (currentMessages) {
        const exists = currentMessages.some(
          function (message) {
            return message.id === sentMessage?.id;
          }
        );

        if (exists) {
          return currentMessages;
        }

        return [
          ...currentMessages,
          sentMessage,
        ];
      });

      setConversations(function (current) {
        return current
          .map(function (conversation) {
            if (
              conversation.id !==
              selectedConversation.id
            ) {
              return conversation;
            }

            return {
              ...conversation,
              last_message_at:
                sentMessage.created_at,
              updated_at:
                sentMessage.created_at,
              latestMessage: sentMessage,
            };
          })
          .sort(function (a, b) {
            return (
              new Date(b.last_message_at || 0) -
              new Date(a.last_message_at || 0)
            );
          });
      });

      setSelectedConversation(function (current) {
        if (!current) return current;

        return {
          ...current,
          last_message_at:
            sentMessage.created_at,
          updated_at:
            sentMessage.created_at,
          latestMessage: sentMessage,
        };
      });

      setMessageText("");
    } catch (sendError) {
      console.error(
        "Admin developer message send error:",
        sendError
      );

      setError(
        sendError?.message ||
          "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key !== "Enter") {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();

    handleSendMessage();
  }

  const filteredDevelopers = useMemo(
    function () {
      const value = search.trim().toLowerCase();

      if (!value) {
        return developers;
      }

      return developers.filter(function (developer) {
        return (
          developer.full_name
            ?.toLowerCase()
            .includes(value) ||
          developer.email
            ?.toLowerCase()
            .includes(value)
        );
      });
    },
    [developers, search]
  );

  const visibleConversations = useMemo(
    function () {
      const developerIds = new Set(
        filteredDevelopers.map(function (developer) {
          return developer.id;
        })
      );

      return conversations.filter(function (conversation) {
        return developerIds.has(
          conversation.developer_id
        );
      });
    },
    [conversations, filteredDevelopers]
  );

  const conversationCountByDeveloper = useMemo(
    function () {
      const counts = new Map();

      conversations.forEach(function (conversation) {
        counts.set(
          conversation.developer_id,
          (counts.get(conversation.developer_id) || 0) +
            1
        );
      });

      return counts;
    },
    [conversations]
  );

  const selectedDeveloper =
    selectedConversation?.developer || null;

  return (
    <section className="admin-developer-messages">
      <div className="admin-dev-messages-header">
        <div>
          <span className="admin-dev-messages-eyebrow">
            DEVELOPER COMMUNICATION
          </span>

          <h1>Developer Messages</h1>

          <p>
            Communicate directly with your EXCWA developers.
          </p>
        </div>

        <button
          type="button"
          className="admin-dev-messages-refresh"
          onClick={function () {
            setRefreshing(true);
            loadDevelopersAndConversations();
          }}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "admin-dev-refresh-spin"
                : ""
            }
          />
        </button>
      </div>

      {error ? (
        <div className="admin-dev-messages-error">
          {error}
        </div>
      ) : null}

      <div className="admin-dev-messages-layout">
        <aside className="admin-dev-developers-panel">
          <div className="admin-dev-panel-heading">
            <div>
              <span>Developers</span>
              <small>
                {developers.length} developer
                {developers.length === 1 ? "" : "s"}
              </small>
            </div>
          </div>

          <div className="admin-dev-search">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search developers..."
              value={search}
              onChange={function (event) {
                setSearch(event.target.value);
              }}
            />
          </div>

          <div className="admin-dev-conversation-list">
            {loading ? (
              <div className="admin-dev-list-loading">
                <RefreshCw
                  size={18}
                  className="admin-dev-refresh-spin"
                />
                Loading developers...
              </div>
            ) : filteredDevelopers.length === 0 ? (
              <div className="admin-dev-list-empty">
                <UserRound size={24} />
                <span>No developers found</span>
              </div>
            ) : (
              filteredDevelopers.map(function (developer) {
                const developerConversations =
                  visibleConversations.filter(
                    function (conversation) {
                      return (
                        conversation.developer_id ===
                        developer.id
                      );
                    }
                  );

                const latestConversation =
                  developerConversations.sort(
                    function (a, b) {
                      return (
                        new Date(
                          b.last_message_at || 0
                        ) -
                        new Date(
                          a.last_message_at || 0
                        )
                      );
                    }
                  )[0];

                const isActive =
                  selectedConversation?.developer_id ===
                  developer.id;

                return (
                  <button
                    type="button"
                    key={developer.id}
                    className={
                      isActive
                        ? "admin-dev-developer-item active"
                        : "admin-dev-developer-item"
                    }
                    onClick={function () {
                      if (latestConversation) {
                        handleSelectConversation(
                          latestConversation
                        );
                      }
                    }}
                  >
                    <div className="admin-dev-avatar">
                      {developer.profile_photo_url ? (
                        <img
                          src={
                            developer.profile_photo_url
                          }
                          alt=""
                        />
                      ) : (
                        <UserRound size={18} />
                      )}
                    </div>

                    <div className="admin-dev-developer-info">
                      <div className="admin-dev-developer-top">
                        <strong>
                          {developer.full_name ||
                            "Unnamed Developer"}
                        </strong>

                        <span>
                          {latestConversation
                            ? formatConversationDate(
                                latestConversation.last_message_at
                              )
                            : ""}
                        </span>
                      </div>

                      <div className="admin-dev-developer-bottom">
                        <span>
                          {latestConversation
                            ? getMessagePreview(
                                latestConversation
                              )
                            : "No conversation yet"}
                        </span>

                        {conversationCountByDeveloper.get(
                          developer.id
                        ) ? (
                          <b>
                            {conversationCountByDeveloper.get(
                              developer.id
                            )}
                          </b>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="admin-dev-message-panel">
          {!selectedConversation ? (
            <div className="admin-dev-message-empty">
              <div className="admin-dev-empty-icon">
                <MessageSquare size={27} />
              </div>

              <h2>Start a conversation</h2>

              <p>
                Select a developer from the left to view
                messages and communicate with them.
              </p>
            </div>
          ) : (
            <>
              <header className="admin-dev-thread-header">
                <div className="admin-dev-thread-person">
                  <div className="admin-dev-thread-avatar">
                    {selectedDeveloper?.profile_photo_url ? (
                      <img
                        src={
                          selectedDeveloper.profile_photo_url
                        }
                        alt=""
                      />
                    ) : (
                      <UserRound size={19} />
                    )}
                  </div>

                  <div>
                    <h2>
                      {selectedDeveloper?.full_name ||
                        "Developer"}
                    </h2>

                    <span>
                      {selectedDeveloper?.email ||
                        "Developer communication"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-dev-thread-close"
                  onClick={function () {
                    setSelectedConversation(null);
                    setMessages([]);
                    setMessageText("");
                  }}
                  title="Close conversation"
                >
                  <X size={18} />
                </button>
              </header>

              <div
                ref={messagesThreadRef}
                className="admin-dev-message-thread"
                onScroll={handleThreadScroll}
              >
                {messagesLoading ? (
                  <div className="admin-dev-thread-loading">
                    <RefreshCw
                      size={18}
                      className="admin-dev-refresh-spin"
                    />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="admin-dev-thread-no-messages">
                    <MessageSquare size={22} />
                    <span>
                      No messages in this conversation yet.
                    </span>
                  </div>
                ) : (
                  <div className="admin-dev-message-list">
                    {messages.map(function (message) {
                      const isAdmin =
                        message.sender_type === "admin";

                      return (
                        <div
                          key={message.id}
                          className={
                            isAdmin
                              ? "admin-dev-message-row mine"
                              : "admin-dev-message-row received"
                          }
                        >
                          <div className="admin-dev-message-bubble">
                            <p>{message.message}</p>

                            <time>
                              {formatMessageTime(
                                message.created_at
                              )}
                            </time>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="admin-dev-composer">
                <textarea
                  value={messageText}
                  onChange={function (event) {
                    setMessageText(event.target.value);
                  }}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Write a message to this developer..."
                  rows={1}
                  disabled={sending}
                />

                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={
                    sending ||
                    !messageText.trim()
                  }
                  title="Send message"
                >
                  {sending ? (
                    <RefreshCw
                      size={17}
                      className="admin-dev-refresh-spin"
                    />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </section>
  );
}