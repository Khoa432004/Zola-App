"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { apiService } from "@/services/api";
import { socketService } from "@/services/socket";
import EmojiPicker from "./EmojiPicker";

// Voice Message Player Component
function VoiceMessagePlayer({ src, isUser }: { src: string; isUser: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate waveform bars (simple visualization)
  const waveformBars = Array.from({ length: 20 }, (_, i) => {
    const height = 20 + Math.random() * 40; // Random height between 20-60
    return height;
  });

  return (
    <>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 12px",
          background: isUser
            ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            : "#e0e7ff",
          borderRadius: 20,
          minWidth: "180px",
          maxWidth: "280px",
          height: 36,
          cursor: "pointer",
        }}
        onClick={togglePlay}
      >
        {/* Play Button */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: isUser ? "rgba(255, 255, 255, 0.25)" : "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </div>

        {/* Waveform */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flex: 1,
            height: 24,
          }}
        >
          {waveformBars.map((height, index) => (
            <div
              key={index}
              style={{
                width: 2,
                height: `${isPlaying ? height : height * 0.6}%`,
                background: isUser ? "rgba(255, 255, 255, 0.8)" : "#6366f1",
                borderRadius: 1,
                transition: "height 0.1s ease",
                animation: isPlaying
                  ? `waveform ${
                      0.5 + Math.random() * 0.5
                    }s ease-in-out infinite`
                  : "none",
                animationDelay: `${index * 0.05}s`,
              }}
            />
          ))}
          <style>{`
            @keyframes waveform {
              0%, 100% { height: 40%; }
              50% { height: 100%; }
            }
          `}</style>
        </div>

        {/* Duration */}
        <div
          style={{
            fontSize: 12,
            color: isUser ? "rgba(255, 255, 255, 0.9)" : "#6366f1",
            fontWeight: 500,
            flexShrink: 0,
            minWidth: 35,
            textAlign: "right",
          }}
        >
          {formatTime(duration || currentTime)}
        </div>
      </div>
    </>
  );
}

interface Conversation {
  id: string;
  con_id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isOnline?: boolean;
  is_group: boolean;
  members?: Array<{ user_id: string; user_name: string; user_avatar?: string }>;
}

interface MessageData {
  id: string;
  con_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  type: "text" | "image" | "video" | "sticker" | "audio";
  timestamp: number;
  createdAt: Date | string;
  seen: boolean;
  reply_to_id?: string;
  reply_to_content?: string;
  reply_to_sender_id?: string;
  reply_to_sender_name?: string;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "other";
  timestamp: string;
  type?: "text" | "image" | "video" | "sticker" | "audio" | "failed";
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  status?: "pending" | "sent" | "failed";
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
    senderId: string;
  };
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  createdAt: Date;
}

interface ChatPanelProps {
  conversation: Conversation;
}

export default function ChatPanel({ conversation }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [messageReactions, setMessageReactions] = useState<
    Map<string, MessageReaction[]>
  >(new Map());
  const [recentReaction, setRecentReaction] = useState<{
    messageId: string;
    emoji: string;
    key: string;
  } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(
    null
  );
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const user = useAppSelector((state) => state.auth.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const searchMessageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const userScrollingRef = useRef(false);
  const scrollPositionRef = useRef(0);

  const markSeenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load reactions cho messages
  const loadReactions = useCallback(async (messageIds: string[]) => {
    if (!messageIds || messageIds.length === 0) return;

    try {
      const reactionsEntries = await Promise.all(
        messageIds.map(async (messageId) => {
          try {
            const response = await apiService.getMessageReactions(messageId);
            if (response.success && response.data) {
              return { messageId, reactions: response.data };
            }
          } catch (error) {
            console.warn(
              `Failed to load reactions for message ${messageId}:`,
              error
            );
          }
          return null;
        })
      );

      setMessageReactions((prev) => {
        const newMap = new Map(prev);
        reactionsEntries.forEach((entry) => {
          if (entry) {
            newMap.set(entry.messageId, entry.reactions);
          }
        });
        return newMap;
      });
    } catch (error) {
      console.error("Error loading reactions:", error);
    }
  }, []);

  useEffect(() => {
    if (!recentReaction) return;
    const timeout = setTimeout(() => setRecentReaction(null), 800);
    return () => clearTimeout(timeout);
  }, [recentReaction]);

  // Load messages (initial load hoặc reload)
  const loadMessages = useCallback(
    async (limit: number = 50) => {
      if (loadingRef.current || !conversation?.con_id) return;

      try {
        loadingRef.current = true;
        setIsLoading(true);
        const response = await apiService.getMessages(
          conversation.con_id,
          limit
        );
        if (response.success && response.data) {
          const formattedMessages = formatMessages(response.data);
          setMessages(formattedMessages);

          // Load reactions cho tất cả messages
          const messageIds = formattedMessages.map((m) => m.id);
          loadReactions(messageIds);

          // Track oldest timestamp for lazy loading
          const responseData = response.data as MessageData[];
          if (responseData.length > 0) {
            // Get timestamp from oldest message (first in sorted array)
            const oldestMsg = responseData[0];
            if (oldestMsg.timestamp) {
              // Convert to number if it's a Date object or Timestamp
              const timestamp =
                typeof oldestMsg.timestamp === "number"
                  ? oldestMsg.timestamp
                  : new Date(oldestMsg.timestamp).getTime();
              setOldestTimestamp(timestamp);
            }
            // Có thể còn messages cũ hơn nếu load đủ limit
            setHasMore(responseData.length >= limit);
          } else {
            setHasMore(false);
            setOldestTimestamp(null);
          }

          // Debounce mark conversation as seen
          if (markSeenTimeoutRef.current) {
            clearTimeout(markSeenTimeoutRef.current);
          }
          markSeenTimeoutRef.current = setTimeout(async () => {
            try {
              await apiService.markConversationAsSeen(conversation.con_id);
            } catch (error) {
              console.warn("Failed to mark conversation as seen:", error);
            }
          }, 1000);
        }
      } catch (error: any) {
        console.error("Error loading messages:", error);
        alert(error.message || "Không thể tải tin nhắn");
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    },
    [conversation?.con_id, user, loadReactions]
  );

  // Load older messages (lazy loading)
  const loadOlderMessages = useCallback(async () => {
    if (
      loadingMoreRef.current ||
      !conversation?.con_id ||
      !hasMore ||
      !oldestTimestamp
    )
      return;

    try {
      loadingMoreRef.current = true;
      setIsLoadingMore(true);

      // Save scroll position before loading
      const container = messagesContainerRef.current;
      if (container) {
        scrollPositionRef.current =
          container.scrollHeight - container.scrollTop;
      }

      // Load messages before oldest timestamp
      const response = await apiService.getMessages(
        conversation.con_id,
        20,
        oldestTimestamp
      );
      if (response.success && response.data && response.data.length > 0) {
        const formattedMessages = formatMessages(response.data);
        const responseData = response.data as MessageData[];

        // Prepend older messages to the beginning
        setMessages((prev) => {
          // Merge and deduplicate
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = formattedMessages.filter(
            (m) => !existingIds.has(m.id)
          );
          const merged = [...newMessages, ...prev];

          // Update oldest timestamp from new oldest message
          if (responseData.length > 0) {
            const oldestMsg = responseData[0];
            if (oldestMsg.timestamp) {
              const timestamp =
                typeof oldestMsg.timestamp === "number"
                  ? oldestMsg.timestamp
                  : new Date(oldestMsg.timestamp).getTime();
              setOldestTimestamp(timestamp);
            }
          }

          // Check if there are more messages (load đủ 20 thì có thể còn)
          setHasMore(responseData.length >= 20);

          return merged;
        });

        // Restore scroll position after loading
        if (container) {
          setTimeout(() => {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - scrollPositionRef.current;
          }, 0);
        }
      } else {
        setHasMore(false); // Không còn messages cũ hơn
      }
    } catch (error: any) {
      console.error("Error loading older messages:", error);
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [conversation?.con_id, oldestTimestamp, hasMore, user]);

  // Format messages to display format
  const formatMessages = (data: MessageData[]): Message[] => {
    if (!user) return [];

    return data.map((msg) => {
      const isUser = msg.sender_id === user.id;
      const date = new Date(msg.timestamp);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const timestamp = `${hours}:${minutes}`;

      // Get sender info - ưu tiên từ msg.sender_name, fallback về conversation members
      let senderName: string;
      let senderAvatar: string | undefined;

      if (isUser) {
        // Current user's message
        senderName = user.name || user.email?.split("@")[0] || "Bạn";
        senderAvatar =
          user.avatar || user.name?.charAt(0)?.toUpperCase() || "U";
      } else {
        // Other person's message
        // Priority: msg.sender_name > conversation.members > default
        senderName = msg.sender_name || "Người dùng";

        if (conversation.members) {
          const sender = conversation.members.find(
            (m) => m.user_id === msg.sender_id
          );
          if (sender) {
            senderName = sender.user_name || senderName;
            senderAvatar =
              sender.user_avatar ||
              sender.user_name?.charAt(0)?.toUpperCase() ||
              "?";
          }
        }
      }

      // Format reply data
      let replyTo: Message["replyTo"] = undefined;
      if (msg.reply_to_id && msg.reply_to_content) {
        replyTo = {
          id: msg.reply_to_id,
          content: msg.reply_to_content,
          senderName: msg.reply_to_sender_name || "Người dùng",
          senderId: msg.reply_to_sender_id || "",
        };
      }

      return {
        id: msg.id,
        text: msg.content,
        sender: isUser ? "user" : "other",
        timestamp,
        type: msg.type,
        senderId: msg.sender_id,
        senderName, // Always have a value
        senderAvatar,
        status: "sent", // Messages from server are always "sent"
        replyTo,
      };
    });
  };

  // Connect WebSocket and setup listeners
  useEffect(() => {
    if (!conversation?.con_id || !user) return;

    // Connect WebSocket if not connected
    const connectAndJoinRoom = () => {
      if (!socketService.isConnected() && typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          const socket = socketService.connect(token);
          // Wait for connection before joining room
          if (socket && !socket.connected) {
            socket.once("connect", () => {
              console.log(
                "✅ Socket connected, joining conversation room:",
                conversation.con_id
              );
              socketService.joinRoom(`conversation:${conversation.con_id}`);
            });
          } else if (socket?.connected) {
            // Already connected, join room immediately
            console.log(
              "✅ Socket already connected, joining room:",
              conversation.con_id
            );
            socketService.joinRoom(`conversation:${conversation.con_id}`);
          }
        }
      } else if (socketService.isConnected()) {
        // Already connected, join room immediately
        console.log("✅ Socket connected, joining room:", conversation.con_id);
        socketService.joinRoom(`conversation:${conversation.con_id}`);
      }
    };

    connectAndJoinRoom();

    // Also listen for connection events to join room
    const socket = socketService.getSocket();
    if (socket && !socket.connected) {
      socket.once("connect", () => {
        console.log(
          "✅ Socket connected via listener, joining room:",
          conversation.con_id
        );
        socketService.joinRoom(`conversation:${conversation.con_id}`);
      });
    }

    // Listen for new messages
    const handleNewMessage = (data: { conId: string; message: any }) => {
      console.log("📨 Received message via WebSocket:", data);
      if (data.conId === conversation.con_id) {
        setMessages((prev) => {
          const messageId = data.message.id;
          const messageContent = data.message.content;
          const senderId = data.message.sender_id;
          const messageTimestamp = data.message.timestamp;
          const isUserMessage = senderId === user.id;

          // 1. Check if message already exists by ID (strongest check)
          const existsById = prev.some((m) => m.id === messageId);
          if (existsById) {
            console.log(
              "⚠️ Message already exists by ID, skipping:",
              messageId
            );
            return prev;
          }

          // 2. Check if duplicate by content + sender + recent timestamp (within 5 seconds)
          // This prevents duplicate from same sender with same content sent at nearly same time
          const msgTimestamp = messageTimestamp
            ? new Date(messageTimestamp).getTime()
            : Date.now();
          const duplicateIndex = prev.findIndex((m) => {
            const isSameContent = m.text.trim() === messageContent.trim();
            const isSameSender =
              m.sender === (isUserMessage ? "user" : "other");

            if (isSameContent && isSameSender) {
              // Check if message is very recent (within last 10 messages or 5 seconds)
              const messageIndex = prev.indexOf(m);
              const isRecent = messageIndex >= prev.length - 10;

              if (isRecent) {
                // Likely duplicate - same content, same sender, recent
                console.log(
                  "⚠️ Potential duplicate found by content+sender+recent:",
                  m.id
                );
                return true;
              }
            }
            return false;
          });

          if (duplicateIndex !== -1) {
            const existingMessage = prev[duplicateIndex];
            // Only replace if IDs are different (one might be temp or duplicate)
            if (existingMessage.id !== messageId) {
              console.log(
                "⚠️ Found duplicate by content+sender+recent, replacing:",
                existingMessage.id,
                "with",
                messageId
              );
              // Replace duplicate with real message
              // Get sender info for new message
              let senderName: string | undefined;
              let senderAvatar: string | undefined;

              if (conversation.is_group && conversation.members) {
                const sender = conversation.members.find(
                  (m) => m.user_id === senderId
                );
                if (sender) {
                  senderName = sender.user_name;
                  senderAvatar =
                    sender.user_avatar ||
                    sender.user_name?.charAt(0)?.toUpperCase() ||
                    "?";
                }
              } else if (!isUserMessage && conversation.members) {
                const sender = conversation.members.find(
                  (m) => m.user_id === senderId
                );
                if (sender) {
                  senderName = sender.user_name;
                  senderAvatar =
                    sender.user_avatar ||
                    sender.user_name?.charAt(0)?.toUpperCase() ||
                    "?";
                }
              }

              const newMessage: Message = {
                id: messageId,
                text: messageContent,
                sender: isUserMessage ? "user" : "other",
                timestamp: new Date(
                  messageTimestamp || Date.now()
                ).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                type: data.message.type || "text",
                senderId: senderId,
                senderName:
                  senderName || (isUserMessage ? user.name : undefined),
                senderAvatar:
                  senderAvatar ||
                  (isUserMessage
                    ? user.avatar || user.name?.charAt(0)?.toUpperCase() || "U"
                    : undefined),
              };
              const updated = [...prev];
              updated[duplicateIndex] = newMessage;
              return updated;
            } else {
              // Same ID, already exists, skip
              console.log("⚠️ Message with same ID already exists, skipping");
              return prev;
            }
          }

          // 3. New message - add to list
          const newMessage: Message = {
            id:
              messageId ||
              `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: messageContent,
            sender: isUserMessage ? "user" : "other",
            timestamp: new Date(
              messageTimestamp || Date.now()
            ).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            type: data.message.type || "text",
          };
          console.log("✅ Adding new message to UI:", newMessage);
          return [...prev, newMessage];
        });
      }
    };

    // Listen for conversation updates (last message)
    const handleConversationUpdate = (data: {
      conversationId: string;
      lastMessage: any;
    }) => {
      // Handle conversation list update in ChatLayout
      // This will be handled there
      console.log("📢 Conversation updated:", data);
    };

    // Listen for reaction updates
    const handleReactionUpdate = (data: {
      messageId: string;
      userId: string;
      emoji: string | null;
      added: boolean;
    }) => {
      console.log("📨 Received reaction update:", data);
      setMessageReactions((prev) => {
        const newMap = new Map(prev);
        const reactions = newMap.get(data.messageId) || [];

        if (data.added && data.emoji) {
          // Add or update reaction
          const existingIndex = reactions.findIndex(
            (r) => r.user_id === data.userId
          );
          if (existingIndex >= 0) {
            reactions[existingIndex] = {
              ...reactions[existingIndex],
              emoji: data.emoji,
            };
          } else {
            reactions.push({
              id: data.userId,
              message_id: data.messageId,
              user_id: data.userId,
              emoji: data.emoji,
              createdAt: new Date(),
            });
          }
        } else {
          // Remove reaction
          const filtered = reactions.filter((r) => r.user_id !== data.userId);
          newMap.set(data.messageId, filtered);
          return newMap;
        }

        newMap.set(data.messageId, reactions);
        if (data.added && data.emoji) {
          setRecentReaction({
            messageId: data.messageId,
            emoji: data.emoji,
            key: `${data.messageId}-${data.emoji}-${Date.now()}`,
          });
        }
        return newMap;
      });
    };

    // Remove any existing listeners first to prevent duplicate
    socketService.off("message_received");
    socketService.off("conversation_updated");
    socketService.off("reaction_updated");

    // Add new listeners
    socketService.on("message_received", handleNewMessage);
    socketService.on("conversation_updated", handleConversationUpdate);
    socketService.on("reaction_updated", handleReactionUpdate);

    // Cleanup
    return () => {
      socketService.off("message_received", handleNewMessage);
      socketService.off("conversation_updated", handleConversationUpdate);
      socketService.off("reaction_updated", handleReactionUpdate);

      // Leave conversation room
      if (conversation?.con_id && socketService.isConnected()) {
        socketService.leaveRoom(`conversation:${conversation.con_id}`);
      }

      // Clear mark seen timeout
      if (markSeenTimeoutRef.current) {
        clearTimeout(markSeenTimeoutRef.current);
        markSeenTimeoutRef.current = null;
      }
    };
  }, [conversation?.con_id, user?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation?.con_id) {
      // Reset state when conversation changes
      setMessages([]);
      setHasMore(true);
      setOldestTimestamp(null);
      userScrollingRef.current = false; // Reset scroll state
      loadMessages(50); // Load 50 messages mặc định
    } else {
      setMessages([]);
      setHasMore(true);
      setOldestTimestamp(null);
      userScrollingRef.current = false;
    }
  }, [conversation?.con_id, loadMessages]);

  // Scroll to bottom when initial messages loaded
  useEffect(() => {
    if (!isLoading && messages.length > 0 && messagesContainerRef.current) {
      // Wait for DOM to update, then scroll to bottom
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
          userScrollingRef.current = false; // Reset after initial scroll
        }
      }, 100);
    }
  }, [isLoading, messages.length]);

  // Auto scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      // Auto scroll if:
      // 1. User is at bottom (within 100px)
      // 2. Not currently loading older messages
      // 3. Not user-initiated scrolling
      if (isAtBottom && !isLoadingMore && !userScrollingRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 0);
      }
    }
  }, [messages, isLoadingMore]);

  // Lazy loading: Load older messages when scroll to top
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoading || isLoadingMore) return;

    let scrollTimer: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Check if user scrolled to top (within 100px from top)
      const isNearTop = scrollTop < 100;

      // Check if user is near bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // Update user scrolling state
      if (isNearTop) {
        userScrollingRef.current = true;
      } else if (isNearBottom) {
        // Reset scrolling state after a delay when user scrolls back to bottom
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          userScrollingRef.current = false;
        }, 500);
      }

      // Load older messages when scrolling near top
      if (isNearTop && hasMore && !loadingMoreRef.current && oldestTimestamp) {
        console.log("🔄 Loading older messages (scroll near top)");
        loadOlderMessages();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [hasMore, isLoading, isLoadingMore, oldestTimestamp, loadOlderMessages]);

  const handleSend = async (
    file?: File,
    type: "text" | "image" | "video" | "sticker" | "audio" = "text"
  ) => {
    if ((!message.trim() && !file) || isSending || !conversation?.con_id)
      return;

    const messageText = message.trim() || "";
    const fileToSend =
      file || (selectedFiles.length > 0 ? selectedFiles[0] : undefined);
    const messageType =
      type ||
      (fileToSend
        ? fileToSend.type.startsWith("image/")
          ? "image"
          : "video"
        : "text");
    const replyToMessageId = replyingTo?.id;
    const replyToData = replyingTo
      ? {
          id: replyingTo.id,
          content: replyingTo.text,
          senderName: replyingTo.senderName || "Người dùng",
          senderId: replyingTo.senderId || "",
        }
      : undefined;

    // Generate temporary ID
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Create temporary message for optimistic UI
    const tempMessage: Message = {
      id: tempId,
      text: messageText || (fileToSend ? "Đang gửi file..." : ""),
      sender: "user",
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: messageType,
      senderId: user?.id,
      senderName: user?.name || "Bạn",
      senderAvatar: user?.avatar || user?.name?.charAt(0)?.toUpperCase() || "U",
      status: "pending",
      replyTo: replyToData,
    };

    // 1. Optimistic Update - Add message to UI immediately
    setMessages((prev) => [...prev, tempMessage]);

    // 2. Clear input fields
    setMessage("");
    setSelectedFiles([]);
    setPreviewUrls([]);
    setShowEmojiPicker(false);
    setReplyingTo(null);

    // 3. Send to server in background
    try {
      setIsSending(true);

      console.log("📤 Sending message:", {
        conId: conversation.con_id,
        content: messageText || (fileToSend ? "file" : ""),
        type: messageType,
        hasFile: !!fileToSend,
        fileName: fileToSend?.name,
        fileType: fileToSend?.type,
        replyToId: replyToMessageId,
        tempId,
      });

      const response = await apiService.sendMessage(
        conversation.con_id,
        messageText || (fileToSend ? "" : ""),
        messageType,
        fileToSend,
        replyToMessageId
      );

      console.log("✅ Message sent response:", response);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Gửi tin nhắn thất bại");
      }

      // 4. Update temporary message with real data
      setMessages((prev) => {
        return prev.map((m) => {
          if (m.id === tempId) {
            // Replace temp message with real message
            return {
              id: response.data.id,
              text: messageText || response.data.content || "",
              sender: "user",
              timestamp: new Date(
                response.data.timestamp || Date.now()
              ).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              type: response.data.type || messageType,
              senderId: user?.id,
              senderName: user?.name || "Bạn",
              senderAvatar:
                user?.avatar || user?.name?.charAt(0)?.toUpperCase() || "U",
              status: "sent",
              replyTo: replyToData,
            };
          }
          return m;
        });
      });

      // Load reactions for the new message if it's a real message
      if (response.data.id) {
        loadReactions([response.data.id]);
      }
    } catch (error: any) {
      console.error("❌ Error sending message:", error);

      // 5. Mark message as failed
      setMessages((prev) => {
        return prev.map((m) => {
          if (m.id === tempId) {
            return {
              ...m,
              status: "failed",
            };
          }
          return m;
        });
      });

      // Don't show alert, just mark as failed in UI
      console.error(error.message || "Không thể gửi tin nhắn");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "image" && !file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh");
      return;
    }

    if (type === "video" && !file.type.startsWith("video/")) {
      alert("Vui lòng chọn file video");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File không được vượt quá 10MB");
      return;
    }

    setSelectedFiles([file]);
    const url = URL.createObjectURL(file);
    setPreviewUrls([url]);

    // Auto send after selection
    handleSend(file, type === "image" ? "image" : "video");

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        // Create audio file from chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        const audioFile = new File(
          [audioBlob],
          `recording_${Date.now()}.webm`,
          {
            type: "audio/webm;codecs=opus",
          }
        );

        // Send audio file
        handleSend(audioFile, "audio");
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      let seconds = 0;
      recordingTimerRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
    } catch (error: any) {
      console.error("Error starting recording:", error);
      alert(
        "Không thể truy cập microphone. Vui lòng cho phép quyền truy cập microphone."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Search functionality
  const scrollToSearchResult = useCallback((index: number) => {
    const messageElement = searchMessageRefs.current.get(index);

    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight the message briefly
      messageElement.style.background = "#fef3c7";
      setTimeout(() => {
        if (messageElement.style.background === "#fef3c7") {
          messageElement.style.background = "";
        }
      }, 2000);
    }
  }, []);

  // Helper function to normalize Vietnamese text for search
  const normalizeVietnamese = useCallback((text: string): string => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .trim();
  }, []);

  useEffect(() => {
    if (!showSearch) {
      setSearchQuery("");
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const normalizedQuery = normalizeVietnamese(searchQuery);
    const results: number[] = [];

    messages.forEach((msg, index) => {
      if (msg.type === "text") {
        const normalizedText = normalizeVietnamese(msg.text);
        if (normalizedText.includes(normalizedQuery)) {
          results.push(index);
        }
      }
    });

    setSearchResults(results);

    if (results.length > 0) {
      setCurrentSearchIndex((prevIndex) => {
        const newIndex =
          prevIndex >= 0 && prevIndex < results.length ? prevIndex : 0;

        setTimeout(() => {
          scrollToSearchResult(results[newIndex]);
        }, 100);

        return newIndex;
      });
    } else {
      setCurrentSearchIndex(-1);
    }
  }, [
    showSearch,
    searchQuery,
    messages,
    scrollToSearchResult,
    normalizeVietnamese,
  ]);

  const handleNextSearch = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToSearchResult(searchResults[nextIndex]);
  };

  const handlePrevSearch = () => {
    if (searchResults.length === 0) return;
    const prevIndex =
      (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    scrollToSearchResult(searchResults[prevIndex]);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    );
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} style={{ background: "#fef3c7", padding: "2px 0" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Handle reaction - Optimistic update
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user?.id) return;

    // Get current reactions for this message
    const currentReactions = messageReactions.get(messageId) || [];
    const existingReaction = currentReactions.find(
      (r) => r.user_id === user.id
    );
    const willAdd = !existingReaction || existingReaction.emoji !== emoji;

    // 1. Optimistic update - Update UI immediately
    setMessageReactions((prev) => {
      const newMap = new Map(prev);
      const reactions = [...(newMap.get(messageId) || [])];

      if (willAdd) {
        // Add or update reaction
        const existingIndex = reactions.findIndex((r) => r.user_id === user.id);
        if (existingIndex >= 0) {
          // Update existing reaction with new emoji
          reactions[existingIndex] = {
            ...reactions[existingIndex],
            emoji,
          };
        } else {
          // Add new reaction
          reactions.push({
            id: user.id,
            message_id: messageId,
            user_id: user.id,
            emoji,
            createdAt: new Date(),
          });
        }
      } else {
        // Remove reaction (clicking same emoji)
        const filtered = reactions.filter((r) => r.user_id !== user.id);
        newMap.set(messageId, filtered);
        return newMap;
      }

      newMap.set(messageId, reactions);
      return newMap;
    });

    setShowReactionPicker(null);
    setRecentReaction({
      messageId,
      emoji,
      key: `${messageId}-${emoji}-${Date.now()}`,
    });

    // 2. Call API in background
    try {
      const response = await apiService.toggleMessageReaction(messageId, emoji);

      // 3. Update with server response if different
      if (response.success && response.data) {
        setMessageReactions((prev) => {
          const newMap = new Map(prev);
          const reactions = [...(newMap.get(messageId) || [])];

          if (response.data.added && response.data.reaction) {
            // Ensure server reaction is in sync
            const existingIndex = reactions.findIndex(
              (r) => r.user_id === user.id
            );
            if (existingIndex >= 0) {
              reactions[existingIndex] = response.data.reaction;
            } else {
              reactions.push(response.data.reaction);
            }
            newMap.set(messageId, reactions);
          } else if (!response.data.added) {
            // Server confirms removal
            const filtered = reactions.filter((r) => r.user_id !== user.id);
            newMap.set(messageId, filtered);
          }

          return newMap;
        });
        if (response.data.added && response.data.reaction?.emoji) {
          setRecentReaction({
            messageId,
            emoji: response.data.reaction.emoji,
            key: `${messageId}-${response.data.reaction.emoji}-${Date.now()}`,
          });
        }
      }
    } catch (error: any) {
      console.error("Error reacting to message:", error);

      // 4. Rollback on error
      setMessageReactions((prev) => {
        const newMap = new Map(prev);
        if (existingReaction) {
          // Restore previous reaction
          const reactions = [...(newMap.get(messageId) || [])];
          const existingIndex = reactions.findIndex(
            (r) => r.user_id === user.id
          );
          if (existingIndex >= 0) {
            reactions[existingIndex] = existingReaction;
          } else {
            reactions.push(existingReaction);
          }
          newMap.set(messageId, reactions);
        } else {
          // Remove the optimistically added reaction
          const reactions = (newMap.get(messageId) || []).filter(
            (r) => r.user_id !== user.id
          );
          newMap.set(messageId, reactions);
        }
        return newMap;
      });

      alert(error.message || "Không thể thả cảm xúc");
    }
  };

  // Popular emojis for reactions
  const popularEmojis = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥"];

  // Retry failed message
  const focusMessageInput = useCallback(() => {
    if (messageInputRef.current) {
      messageInputRef.current.focus();
      messageInputRef.current.setSelectionRange(
        messageInputRef.current.value.length,
        messageInputRef.current.value.length
      );
    }
  }, []);

  const startReplyingToMessage = useCallback(
    (msg: Message) => {
      setReplyingTo(msg);
      setShowEmojiPicker(false);
      focusMessageInput();
    },
    [focusMessageInput]
  );

  const retryMessage = async (failedMsg: Message) => {
    // Remove the failed message
    setMessages((prev) => prev.filter((m) => m.id !== failedMsg.id));

    // Re-send with the same content
    if (failedMsg.type === "text") {
      setMessage(failedMsg.text);
      if (failedMsg.replyTo) {
        setReplyingTo(failedMsg);
      }
      focusMessageInput();
      // Don't auto-send, let user click send button
    } else {
      // For media messages, show alert
      alert("Vui lòng chọn lại file để gửi");
    }
  };

  return (
    <>
      <main
        style={{
          flex: 1,
          background: "#ffffff",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Chat Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>
                {conversation.avatar}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong
                  style={{ fontSize: 15, color: "#111827", fontWeight: 600 }}
                >
                  {conversation.name}
                </strong>
                {conversation.isOnline && (
                  <>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: "#10b981",
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: "#10b981",
                        fontWeight: 500,
                      }}
                    >
                      Online
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: showSearch ? "#e0e7ff" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              title="Tìm kiếm tin nhắn"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={showSearch ? "#6366f1" : "#6b7280"}
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div
              style={{
                padding: "8px 16px 12px 16px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: "#f9fafb",
                  borderRadius: 8,
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tin nhắn..."
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: 14,
                    color: "#111827",
                  }}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: "none",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentSearchIndex + 1} / {searchResults.length}
                  </div>
                  <button
                    onClick={handlePrevSearch}
                    disabled={searchResults.length === 0}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor:
                        searchResults.length === 0 ? "not-allowed" : "pointer",
                      opacity: searchResults.length === 0 ? 0.5 : 1,
                    }}
                    title="Tin nhắn trước"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextSearch}
                    disabled={searchResults.length === 0}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor:
                        searchResults.length === 0 ? "not-allowed" : "pointer",
                      opacity: searchResults.length === 0 ? 0.5 : 1,
                    }}
                    title="Tin nhắn sau"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </>
              )}

              {searchQuery && searchResults.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    whiteSpace: "nowrap",
                  }}
                >
                  Không tìm thấy
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "#ffffff",
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "20px 0",
              }}
            >
              {/* Loading skeleton messages */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: i % 2 === 0 ? "flex-end" : "flex-start",
                    gap: 8,
                  }}
                >
                  {i % 2 !== 0 && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        background:
                          "linear-gradient(90deg, #e0e7ff 0%, #c7d2fe 50%, #e0e7ff 100%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      maxWidth: "60%",
                      background:
                        i % 2 === 0
                          ? "linear-gradient(90deg, #ddd6fe 0%, #c4b5fd 50%, #ddd6fe 100%)"
                          : "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.5s infinite",
                      borderRadius: 12,
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      style={{
                        height: 14,
                        width:
                          i % 3 === 0
                            ? "200px"
                            : i % 2 === 0
                            ? "150px"
                            : "180px",
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        height: 11,
                        width: "60px",
                      }}
                    />
                  </div>
                </div>
              ))}
              <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
              <div
                style={{
                  textAlign: "center",
                  marginTop: 20,
                  color: "#6b7280",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Đang tải tin nhắn...</span>
              </div>
              <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
            </div>
          ) : messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#6b7280",
              }}
            >
              Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                if (msg.type === "failed") {
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "300px",
                          minHeight: "200px",
                          background: "#f3f4f6",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          position: "relative",
                        }}
                      >
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{ marginBottom: 8 }}
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            stroke="#ef4444"
                            strokeWidth="2"
                            fill="#fee2e2"
                          />
                          <path
                            d="M9 9l6 6M15 9l-6 6"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span
                          style={{
                            fontSize: 14,
                            color: "#6b7280",
                            fontWeight: 500,
                          }}
                        >
                          Không thể tải ảnh
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            position: "absolute",
                            bottom: 8,
                            right: 12,
                          }}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                }

                const isUser = msg.sender === "user";
                const messageIndex = messages.indexOf(msg);
                const isSearchMatch =
                  searchQuery.trim() &&
                  msg.text
                    .toLowerCase()
                    .includes(searchQuery.trim().toLowerCase()) &&
                  msg.type === "text";
                const isCurrentSearchResult =
                  searchResults[currentSearchIndex] === messageIndex;

                // Render image/video/sticker/audio messages
                if (
                  msg.type === "image" ||
                  msg.type === "video" ||
                  msg.type === "sticker" ||
                  msg.type === "audio"
                ) {
                  const isVideo = msg.type === "video";
                  const isSticker = msg.type === "sticker";
                  const isAudio = msg.type === "audio";
                  const mediaUrl = msg.text; // For media messages, content is the URL from Cloudinary
                  const showAvatar = !isUser && conversation.is_group;

                  return (
                    <div
                      key={msg.id}
                      ref={(el) => {
                        if (el && isSearchMatch) {
                          searchMessageRefs.current.set(messageIndex, el);
                        } else {
                          searchMessageRefs.current.delete(messageIndex);
                        }
                      }}
                      style={{
                        display: "flex",
                        justifyContent: isUser ? "flex-end" : "flex-start",
                        alignItems: showAvatar ? "flex-start" : "flex-end",
                        marginBottom: 4,
                        transition: "background 0.2s",
                        background: isCurrentSearchResult
                          ? "#fef3c7"
                          : "transparent",
                        borderRadius: 8,
                        padding: isCurrentSearchResult ? "4px" : "0",
                        gap: 8,
                      }}
                    >
                      {/* Avatar - only show for group chat, other messages */}
                      {showAvatar && (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            background:
                              msg.senderAvatar && msg.senderAvatar.length === 1
                                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            overflow: "hidden",
                          }}
                        >
                          {msg.senderAvatar && msg.senderAvatar.length === 1 ? (
                            <span
                              style={{
                                fontSize: 14,
                                color: "#fff",
                                fontWeight: 600,
                              }}
                            >
                              {msg.senderAvatar}
                            </span>
                          ) : msg.senderAvatar ? (
                            <img
                              src={msg.senderAvatar}
                              alt={msg.senderName || ""}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                if (target.parentElement) {
                                  target.parentElement.innerHTML = `<span style="font-size: 14px; color: #fff; font-weight: 600;">${
                                    msg.senderName?.charAt(0)?.toUpperCase() ||
                                    "?"
                                  }</span>`;
                                }
                              }}
                            />
                          ) : null}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          maxWidth: showAvatar
                            ? "60%"
                            : isSticker
                            ? "200px"
                            : isAudio
                            ? "320px"
                            : "60%",
                          gap: 4,
                          position: "relative",
                        }}
                        onMouseEnter={() => setHoveredMessage(msg.id)}
                        onMouseLeave={() => setHoveredMessage(null)}
                      >
                        {/* Sender name - always show */}
                        {msg.senderName && (
                          <div
                            style={{
                              fontSize: 12,
                              color: isUser ? "#8b5cf6" : "#6b7280",
                              fontWeight: 600,
                              paddingLeft: 4,
                              textAlign: isUser ? "right" : "left",
                            }}
                          >
                            {msg.senderName}
                          </div>
                        )}
                        <div style={{ position: "relative" }}>
                          {isAudio ? (
                            <VoiceMessagePlayer
                              src={mediaUrl}
                              isUser={isUser}
                            />
                          ) : (
                            <div
                              style={{
                                maxWidth: "100%",
                                borderRadius: 12,
                                overflow: "hidden",
                                boxShadow: isUser
                                  ? "0 2px 4px rgba(99, 102, 241, 0.2)"
                                  : "0 1px 2px rgba(0, 0, 0, 0.05)",
                                border: isCurrentSearchResult
                                  ? "2px solid #f59e0b"
                                  : isUser
                                  ? "none"
                                  : "1px solid #e5e7eb",
                                position: "relative",
                                background: isVideo ? "#000" : "transparent",
                                padding: 0,
                              }}
                            >
                              {isVideo ? (
                                <video
                                  src={mediaUrl}
                                  controls
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "400px",
                                    display: "block",
                                    background: "#000",
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Error loading video:",
                                      mediaUrl
                                    );
                                    const parent =
                                      e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML =
                                        '<div style="padding: 40px; text-align: center; color: #9ca3af; min-height: 200px; display: flex; align-items: center; justify-content: center;">Không thể tải video</div>';
                                    }
                                  }}
                                />
                              ) : isSticker ? (
                                <img
                                  src={mediaUrl}
                                  alt="Sticker"
                                  style={{
                                    maxWidth: "200px",
                                    maxHeight: "200px",
                                    width: "100%",
                                    height: "auto",
                                    display: "block",
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Error loading sticker:",
                                      mediaUrl
                                    );
                                    const parent =
                                      e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML =
                                        '<div style="padding: 40px; text-align: center; color: #9ca3af;">Không thể tải sticker</div>';
                                    }
                                  }}
                                />
                              ) : (
                                <img
                                  src={mediaUrl}
                                  alt="Image"
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "400px",
                                    width: "auto",
                                    height: "auto",
                                    display: "block",
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Error loading image:",
                                      mediaUrl
                                    );
                                    const parent =
                                      e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML =
                                        '<div style="padding: 40px; text-align: center; color: #9ca3af; min-height: 200px; display: flex; align-items: center; justify-content: center;">Không thể tải ảnh</div>';
                                    }
                                  }}
                                />
                              )}
                              {!isAudio && (
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: 8,
                                    right: 8,
                                    fontSize: 11,
                                    color: "#ffffff",
                                    background: "rgba(0, 0, 0, 0.6)",
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    pointerEvents: "none",
                                  }}
                                >
                                  {msg.timestamp}
                                </div>
                              )}
                              {isAudio && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: isUser
                                      ? "rgba(255, 255, 255, 0.7)"
                                      : "#9ca3af",
                                    textAlign: "right",
                                    marginTop: 4,
                                  }}
                                >
                                  {msg.timestamp}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Reaction & Reply Picker - only show for other people's messages */}
                          {!isUser && hoveredMessage === msg.id && (
                            <div
                              style={{
                                position: "absolute",
                                top: -40,
                                left: showAvatar ? 40 : 0,
                                background: "#ffffff",
                                borderRadius: 20,
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                                padding: "6px 8px",
                                display: "flex",
                                gap: 4,
                                zIndex: 100,
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              {/* Reply Button */}
                              <button
                                onClick={() => startReplyingToMessage(msg)}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  fontSize: 16,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "background 0.2s, transform 0.1s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#f3f4f6";
                                  e.currentTarget.style.transform =
                                    "scale(1.2)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "transparent";
                                  e.currentTarget.style.transform = "scale(1)";
                                }}
                                title="Trả lời"
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#6b7280"
                                  strokeWidth="2"
                                >
                                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                </svg>
                              </button>

                              {/* Divider */}
                              <div
                                style={{
                                  width: 1,
                                  background: "#e5e7eb",
                                  margin: "4px 0",
                                }}
                              />

                              {/* Reaction Emojis */}
                              {popularEmojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontSize: 18,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition:
                                      "background 0.2s, transform 0.1s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      "#f3f4f6";
                                    e.currentTarget.style.transform =
                                      "scale(1.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background =
                                      "transparent";
                                    e.currentTarget.style.transform =
                                      "scale(1)";
                                  }}
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reactions Display */}
                        {messageReactions.get(msg.id) &&
                          messageReactions.get(msg.id)!.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                flexWrap: "wrap",
                                marginTop: 4,
                                paddingLeft: 4,
                              }}
                            >
                              {(() => {
                                const reactions =
                                  messageReactions.get(msg.id) || [];
                                const grouped = reactions.reduce((acc, r) => {
                                  if (!acc[r.emoji]) {
                                    acc[r.emoji] = [];
                                  }
                                  acc[r.emoji].push(r);
                                  return acc;
                                }, {} as Record<string, MessageReaction[]>);

                                return Object.entries(grouped).map(
                                  ([emoji, reactionsList]) => {
                                    const hasUserReaction = reactionsList.some(
                                      (r) => r.user_id === user?.id
                                    );
                                    const isRecentlyUpdated =
                                      recentReaction &&
                                      recentReaction.messageId === msg.id &&
                                      recentReaction.emoji === emoji;
                                    return (
                                      <div
                                        key={`${emoji}-${reactionsList.length}`}
                                        style={{ position: "relative" }}
                                      >
                                        <div
                                          onClick={() =>
                                            handleReaction(msg.id, emoji)
                                          }
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "2px 8px",
                                            borderRadius: 12,
                                            background: hasUserReaction
                                              ? "#e0e7ff"
                                              : "#f3f4f6",
                                            border: hasUserReaction
                                              ? "1px solid #6366f1"
                                              : "1px solid #e5e7eb",
                                            cursor: "pointer",
                                            fontSize: 14,
                                            transition: "all 0.2s",
                                            animation: isRecentlyUpdated
                                              ? "reactionPop 0.6s ease"
                                              : undefined,
                                            boxShadow: isRecentlyUpdated
                                              ? "0 8px 16px rgba(99, 102, 241, 0.25)"
                                              : undefined,
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.transform =
                                              "scale(1.1)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.transform =
                                              "scale(1)";
                                          }}
                                        >
                                          <span>{emoji}</span>
                                          <span
                                            style={{
                                              fontSize: 11,
                                              color: hasUserReaction
                                                ? "#6366f1"
                                                : "#6b7280",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {reactionsList.length}
                                          </span>
                                        </div>
                                        {isRecentlyUpdated && (
                                          <span
                                            style={{
                                              position: "absolute",
                                              top: -18,
                                              right: -4,
                                              fontSize: 18,
                                              animation:
                                                "emojiFloat 0.9s ease forwards",
                                              pointerEvents: "none",
                                            }}
                                          >
                                            {emoji}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                );
                              })()}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                }

                // Render text messages
                const showAvatarAndName =
                  !isUser && conversation.is_group && msg.senderName;

                return (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el && isSearchMatch) {
                        searchMessageRefs.current.set(messageIndex, el);
                      } else {
                        searchMessageRefs.current.delete(messageIndex);
                      }
                    }}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      alignItems: showAvatarAndName ? "flex-start" : "flex-end",
                      marginBottom: 4,
                      transition: "background 0.2s",
                      background: isCurrentSearchResult
                        ? "#fef3c7"
                        : "transparent",
                      borderRadius: 8,
                      padding: isCurrentSearchResult ? "4px" : "0",
                      gap: 8,
                    }}
                  >
                    {/* Avatar - only show for group chat, other messages */}
                    {showAvatarAndName && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          background:
                            msg.senderAvatar && msg.senderAvatar.length === 1
                              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                              : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {msg.senderAvatar && msg.senderAvatar.length === 1 ? (
                          <span
                            style={{
                              fontSize: 14,
                              color: "#fff",
                              fontWeight: 600,
                            }}
                          >
                            {msg.senderAvatar}
                          </span>
                        ) : msg.senderAvatar ? (
                          <img
                            src={msg.senderAvatar}
                            alt={msg.senderName || ""}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              if (target.parentElement) {
                                target.parentElement.innerHTML = `<span style="font-size: 14px; color: #fff; font-weight: 600;">${
                                  msg.senderName?.charAt(0)?.toUpperCase() ||
                                  "?"
                                }</span>`;
                              }
                            }}
                          />
                        ) : null}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        maxWidth: "60%",
                        gap: 4,
                        position: "relative",
                      }}
                      onMouseEnter={() => setHoveredMessage(msg.id)}
                      onMouseLeave={() => setHoveredMessage(null)}
                    >
                      {/* Sender name - always show */}
                      {msg.senderName && (
                        <div
                          style={{
                            fontSize: 12,
                            color: isUser ? "#8b5cf6" : "#6b7280",
                            fontWeight: 600,
                            paddingLeft: 4,
                            textAlign: isUser ? "right" : "left",
                          }}
                        >
                          {msg.senderName}
                        </div>
                      )}
                      <div style={{ position: "relative" }}>
                        <div
                          style={{
                            maxWidth: "100%",
                            background: isUser
                              ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                              : "#ffffff",
                            color: isUser ? "#ffffff" : "#111827",
                            borderRadius: 12,
                            padding: "10px 14px",
                            boxShadow: isUser
                              ? "0 2px 4px rgba(99, 102, 241, 0.2)"
                              : "0 1px 2px rgba(0, 0, 0, 0.05)",
                            border: isUser ? "none" : "1px solid #e5e7eb",
                            borderColor: isCurrentSearchResult
                              ? "#f59e0b"
                              : isUser
                              ? "transparent"
                              : "#e5e7eb",
                            borderWidth: isCurrentSearchResult
                              ? 2
                              : isUser
                              ? 0
                              : 1,
                          }}
                        >
                          {/* Replied Message Preview */}
                          {msg.replyTo && (
                            <div
                              style={{
                                background: isUser
                                  ? "rgba(255, 255, 255, 0.15)"
                                  : "#f9fafb",
                                borderLeft: `3px solid ${
                                  isUser
                                    ? "rgba(255, 255, 255, 0.5)"
                                    : "#6366f1"
                                }`,
                                borderRadius: 6,
                                padding: "6px 10px",
                                marginBottom: 8,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  color: isUser
                                    ? "rgba(255, 255, 255, 0.9)"
                                    : "#6366f1",
                                  fontWeight: 600,
                                  marginBottom: 2,
                                }}
                              >
                                @{msg.replyTo.senderName}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: isUser
                                    ? "rgba(255, 255, 255, 0.8)"
                                    : "#6b7280",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {msg.replyTo.content.substring(0, 100)}
                                {msg.replyTo.content.length > 100 && "..."}
                              </div>
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: 14,
                              lineHeight: 1.5,
                              marginBottom: 4,
                            }}
                          >
                            {searchQuery.trim() && msg.type === "text"
                              ? highlightText(msg.text, searchQuery.trim())
                              : msg.text}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: isUser
                                ? "rgba(255, 255, 255, 0.7)"
                                : "#9ca3af",
                              textAlign: "right",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 4,
                            }}
                          >
                            <span>{msg.timestamp}</span>
                            {isUser && msg.status === "pending" && (
                              <div title="Đang gửi...">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  style={{
                                    animation: "spin 1s linear infinite",
                                    opacity: 0.7,
                                  }}
                                >
                                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                              </div>
                            )}
                            {isUser && msg.status === "sent" && (
                              <div title="Đã gửi">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            )}
                            {isUser && msg.status === "failed" && (
                              <button
                                onClick={() => retryMessage(msg)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                                title="Gửi lại"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="2"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#ef4444",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Gửi lại
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reaction & Reply Picker - only show for other people's messages */}
                        {!isUser && hoveredMessage === msg.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: -40,
                              left: 0,
                              background: "#ffffff",
                              borderRadius: 20,
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                              padding: "6px 8px",
                              display: "flex",
                              gap: 4,
                              zIndex: 100,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            {/* Reply Button */}
                            <button
                              onClick={() => startReplyingToMessage(msg)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 16,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background 0.2s, transform 0.1s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f3f4f6";
                                e.currentTarget.style.transform = "scale(1.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              title="Trả lời"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#6b7280"
                                strokeWidth="2"
                              >
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                              </svg>
                            </button>

                            {/* Divider */}
                            <div
                              style={{
                                width: 1,
                                background: "#e5e7eb",
                                margin: "4px 0",
                              }}
                            />

                            {/* Reaction Emojis */}
                            {popularEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  fontSize: 18,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "background 0.2s, transform 0.1s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#f3f4f6";
                                  e.currentTarget.style.transform =
                                    "scale(1.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "transparent";
                                  e.currentTarget.style.transform = "scale(1)";
                                }}
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reactions Display */}
                      {messageReactions.get(msg.id) &&
                        messageReactions.get(msg.id)!.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                              marginTop: 4,
                              paddingLeft: 4,
                            }}
                          >
                            {(() => {
                              const reactions =
                                messageReactions.get(msg.id) || [];
                              const grouped = reactions.reduce((acc, r) => {
                                if (!acc[r.emoji]) {
                                  acc[r.emoji] = [];
                                }
                                acc[r.emoji].push(r);
                                return acc;
                              }, {} as Record<string, MessageReaction[]>);

                              return Object.entries(grouped).map(
                                ([emoji, reactionsList]) => {
                                  const hasUserReaction = reactionsList.some(
                                    (r) => r.user_id === user?.id
                                  );
                                  const isRecentlyUpdated =
                                    recentReaction &&
                                    recentReaction.messageId === msg.id &&
                                    recentReaction.emoji === emoji;
                                  return (
                                    <div
                                      key={`${emoji}-${reactionsList.length}`}
                                      style={{ position: "relative" }}
                                    >
                                      <div
                                        onClick={() =>
                                          handleReaction(msg.id, emoji)
                                        }
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 4,
                                          padding: "2px 8px",
                                          borderRadius: 12,
                                          background: hasUserReaction
                                            ? "#e0e7ff"
                                            : "#f3f4f6",
                                          border: hasUserReaction
                                            ? "1px solid #6366f1"
                                            : "1px solid #e5e7eb",
                                          cursor: "pointer",
                                          fontSize: 14,
                                          transition: "all 0.2s",
                                          animation: isRecentlyUpdated
                                            ? "reactionPop 0.6s ease"
                                            : undefined,
                                          boxShadow: isRecentlyUpdated
                                            ? "0 8px 16px rgba(99, 102, 241, 0.25)"
                                            : undefined,
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform =
                                            "scale(1.1)";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform =
                                            "scale(1)";
                                        }}
                                      >
                                        <span>{emoji}</span>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            color: hasUserReaction
                                              ? "#6366f1"
                                              : "#6b7280",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {reactionsList.length}
                                        </span>
                                      </div>
                                      {isRecentlyUpdated && (
                                        <span
                                          style={{
                                            position: "absolute",
                                            top: -18,
                                            right: -4,
                                            fontSize: 18,
                                            animation:
                                              "emojiFloat 0.9s ease forwards",
                                            pointerEvents: "none",
                                          }}
                                        >
                                          {emoji}
                                        </span>
                                      )}
                                    </div>
                                  );
                                }
                              );
                            })()}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply Preview Area */}
        {replyingTo && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #e5e7eb",
              background: "#f9fafb",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                flex: 1,
                background: "#ffffff",
                borderLeft: "3px solid #6366f1",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#6366f1",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Trả lời @{replyingTo.senderName || "Người dùng"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {replyingTo.type === "text"
                  ? replyingTo.text
                  : replyingTo.type === "image"
                  ? "📷 Ảnh"
                  : replyingTo.type === "video"
                  ? "📹 Video"
                  : replyingTo.type === "audio"
                  ? "🎵 Tin nhắn thoại"
                  : "Sticker"}
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                border: "none",
                background: "#e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
              title="Hủy trả lời"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Preview Area */}
        {previewUrls.length > 0 && selectedFiles.length > 0 && (
          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid #e5e7eb",
              background: "#f9fafb",
              display: "flex",
              gap: 8,
              overflowX: "auto",
            }}
          >
            {previewUrls.map((url, index) => {
              const file = selectedFiles[index];
              const isVideo = file.type.startsWith("video/");

              return (
                <div
                  key={index}
                  style={{ position: "relative", flexShrink: 0 }}
                >
                  {isVideo ? (
                    <video
                      src={url}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}
                      controls={false}
                    />
                  ) : (
                    <img
                      src={url}
                      alt="Preview"
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                  )}
                  <button
                    onClick={() => {
                      setSelectedFiles(
                        selectedFiles.filter((_, i) => i !== index)
                      );
                      setPreviewUrls(previewUrls.filter((_, i) => i !== index));
                      URL.revokeObjectURL(url);
                    }}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      border: "none",
                      background: "rgba(0, 0, 0, 0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#ffffff",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Area */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #e5e7eb",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 8,
            position: "relative",
          }}
        >
          {/* Sticker/Emoji Button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "none",
                background: showEmojiPicker ? "#e0e7ff" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#6b7280",
                transition: "background 0.2s",
              }}
              title="Gửi sticker"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>

            {/* Emoji Picker - positioned above the button */}
            {showEmojiPicker && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: 8,
                  zIndex: 1000,
                }}
              >
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Voice Recording Button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: isRecording ? "#ef4444" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: isRecording ? "#ffffff" : "#6b7280",
              transition: "background 0.2s, color 0.2s",
              position: "relative",
            }}
            title={
              isRecording
                ? `Đang ghi âm... ${Math.floor(recordingTime / 60)}:${(
                    recordingTime % 60
                  )
                    .toString()
                    .padStart(2, "0")}`
                : "Ghi âm"
            }
            onMouseEnter={(e) => {
              if (!isRecording) {
                e.currentTarget.style.background = "#f3f4f6";
              }
            }}
            onMouseLeave={(e) => {
              if (!isRecording) {
                e.currentTarget.style.background = "transparent";
              }
              stopRecording(); // Stop recording if mouse leaves button
            }}
          >
            {isRecording ? (
              <>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: "#ffffff",
                    animation: "pulse 1s ease-in-out infinite",
                  }}
                />
                <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
              </>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Image/Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6b7280",
              transition: "background 0.2s",
            }}
            title="Gửi ảnh"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e, "image")}
          />

          {/* Video Button */}
          <button
            onClick={() => videoInputRef.current?.click()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6b7280",
              transition: "background 0.2s",
            }}
            title="Gửi video"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e, "video")}
          />

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onClick={() => setShowEmojiPicker(false)}
            ref={messageInputRef}
            placeholder={`Nhập tin nhắn tới ${conversation.name}`}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 24,
              border: "1px solid #e5e7eb",
              fontSize: 14,
              outline: "none",
              background: "#ffffff",
            }}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              handleSend();
            }}
            disabled={
              (!message.trim() && selectedFiles.length === 0) || isSending
            }
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background:
                (message.trim() || selectedFiles.length > 0) && !isSending
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor:
                (message.trim() || selectedFiles.length > 0) && !isSending
                  ? "pointer"
                  : "not-allowed",
              color:
                (message.trim() || selectedFiles.length > 0) && !isSending
                  ? "#ffffff"
                  : "#9ca3af",
              transition: "all 0.2s",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </main>
      <style>{`
        @keyframes reactionPop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes emojiFloat {
          0% { transform: translateY(8px) scale(0.8); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(-18px) scale(1.2); opacity: 0; }
        }
      `}</style>
    </>
  );
}
