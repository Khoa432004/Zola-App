"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import ChatPanel from "./ChatPanel";
import CreateConversationModal from "./CreateConversationModal";
import { apiService } from "@/services/api";
import { socketService } from "@/services/socket";

interface ConversationData {
  id: string;
  con_id: string;
  is_group: boolean;
  groupName?: string;
  members: Array<{ user_id: string; user_name: string; user_avatar?: string }>;
  mess_info?: { content: string; timestamp: number; sender_id?: string };
  updatedAt: Date | string;
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

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function ChatLayout() {
  const router = useRouter();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsWithoutConversation, setFriendsWithoutConversation] = useState<
    Friend[]
  >([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [creatingConversationId, setCreatingConversationId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);
  const loadingFriendsRef = useRef(false);
  const friendsLoadedRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fix hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load conversations
  const loadConversations = useCallback(
    async (force = false) => {
      if (loadingRef.current || (!force && loadedRef.current)) {
        return;
      }

      try {
        loadingRef.current = true;
        setIsLoading(true);
        const response = await apiService.getConversations();
        if (response.success && response.data) {
          const formattedConversations = formatConversations(response.data);
          setConversations(formattedConversations);
          loadedRef.current = true;
        }
      } catch (error: any) {
        console.error("Error loading conversations:", error);
        loadedRef.current = false;
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    },
    [user]
  );

  const loadFriends = useCallback(
    async (force = false) => {
      if (
        !user ||
        loadingFriendsRef.current ||
        (!force && friendsLoadedRef.current)
      ) {
        return;
      }

      try {
        loadingFriendsRef.current = true;
        setIsLoadingFriends(true);
        const response = await apiService.getFriends();
        if (response.success && response.data) {
          const uniqueFriends = response.data.reduce(
            (acc: Friend[], friend: any) => {
              const exists = acc.some((f) => f.id === friend.id);
              if (!exists) {
                acc.push({
                  id: friend.id,
                  name: friend.name || friend.email,
                  email: friend.email,
                  avatar:
                    friend.avatar ||
                    friend.name?.substring(0, 2).toUpperCase() ||
                    "U",
                });
              }
              return acc;
            },
            []
          );
          setFriends(uniqueFriends);
          friendsLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Error loading friends:", error);
        friendsLoadedRef.current = false;
      } finally {
        setIsLoadingFriends(false);
        loadingFriendsRef.current = false;
      }
    },
    [user]
  );

  // Format conversations to display format
  const formatConversations = useCallback(
    (data: ConversationData[]): Conversation[] => {
      if (!user) return [];

      return data.map((conv) => {
        // Tìm tên và avatar của đối phương (hoặc tên nhóm)
        let name = "Unknown";
        let avatar = "?";

        if (conv.is_group) {
          // Nhóm chat: lấy tên nhóm hoặc tên các thành viên
          name = conv.groupName || `Nhóm (${conv.members.length})`;
          avatar =
            conv.members.length > 0 ? conv.members.length.toString() : "G";
        } else {
          // Private chat: lấy tên đối phương
          const otherMember = conv.members.find((m) => m.user_id !== user.id);
          if (otherMember) {
            name = otherMember.user_name;
            avatar = otherMember.user_name?.charAt(0)?.toUpperCase() || "?";
          }
        }

        // Format last message
        const lastMessage = conv.mess_info?.content || "Chưa có tin nhắn";

        // Format timestamp
        let timestamp = "";
        if (conv.mess_info?.timestamp) {
          const date = new Date(conv.mess_info.timestamp);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) {
            timestamp = "Vừa xong";
          } else if (diffMins < 60) {
            timestamp = `${diffMins} phút`;
          } else if (diffHours < 24) {
            timestamp = `${diffHours} giờ`;
          } else if (diffDays < 7) {
            timestamp = `${diffDays} ngày`;
          } else {
            timestamp = date.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            });
          }
        } else if (conv.updatedAt) {
          const date = new Date(conv.updatedAt);
          timestamp = date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
          });
        }

        return {
          id: conv.con_id || conv.id,
          con_id: conv.con_id || conv.id,
          name,
          avatar,
          lastMessage,
          timestamp,
          is_group: conv.is_group,
          members: conv.members,
        };
      });
    },
    [user]
  );

  // Load conversations on mount
  useEffect(() => {
    if (mounted && user) {
      loadConversations();
      loadFriends();
    }
  }, [mounted, user, loadConversations, loadFriends]);

  useEffect(() => {
    if (!friends.length) {
      setFriendsWithoutConversation([]);
      return;
    }

    const withoutConversation = friends.filter((friend) => {
      return !conversations.some(
        (conv) =>
          !conv.is_group &&
          conv.members?.some((member) => member.user_id === friend.id)
      );
    });
    setFriendsWithoutConversation(withoutConversation);
  }, [friends, conversations]);

  // Helper function to normalize Vietnamese text for search
  const normalizeVietnamese = (text: string): string => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (á, à, ả, ã, ạ -> a)
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .trim();
  };

  // Helper function to highlight keyword in text
  const highlightKeyword = (text: string, keyword: string): React.ReactNode => {
    if (!keyword.trim()) return text;

    const normalizedText = normalizeVietnamese(text);
    const normalizedKeyword = normalizeVietnamese(keyword);

    const index = normalizedText.indexOf(normalizedKeyword);
    if (index === -1) return text;

    // Find actual position in original text
    let charCount = 0;
    let actualStart = 0;
    for (let i = 0; i < text.length; i++) {
      const normalizedChar = normalizeVietnamese(text.substring(i, i + 1));
      if (charCount === index) {
        actualStart = i;
        break;
      }
      if (normalizedChar.length > 0) {
        charCount++;
      }
    }

    const actualEnd = actualStart + keyword.length;
    const before = text.substring(0, actualStart);
    const match = text.substring(actualStart, actualEnd);
    const after = text.substring(actualEnd);

    return (
      <>
        {before}
        <mark
          style={{
            background: "#fef3c7",
            fontWeight: 600,
            padding: "2px 4px",
            borderRadius: 3,
          }}
        >
          {match}
        </mark>
        {after}
      </>
    );
  };

  // Search messages across all conversations
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await apiService.searchMessages(searchQuery, 20);
        if (response.success && response.data) {
          setSearchResults(response.data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching messages:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;

    const normalizedQuery = normalizeVietnamese(searchQuery);
    const normalizedName = normalizeVietnamese(conv.name);
    const normalizedLastMessage = normalizeVietnamese(conv.lastMessage);

    const nameMatch = normalizedName.includes(normalizedQuery);
    const lastMessageMatch = normalizedLastMessage.includes(normalizedQuery);

    return nameMatch || lastMessageMatch;
  });

  // Filter friends without conversation by search query
  const filteredFriendsWithoutConversation = friendsWithoutConversation.filter(
    (friend) => {
      if (!searchQuery.trim()) return true;

      const normalizedQuery = normalizeVietnamese(searchQuery);
      const normalizedName = normalizeVietnamese(friend.name);
      const normalizedEmail = normalizeVietnamese(friend.email);

      const nameMatch = normalizedName.includes(normalizedQuery);
      const emailMatch = normalizedEmail.includes(normalizedQuery);

      return nameMatch || emailMatch;
    }
  );

  const handleStartConversation = useCallback(
    async (friend: Friend) => {
      if (!friend?.id || creatingConversationId === friend.id) return;

      try {
        setCreatingConversationId(friend.id);
        const response = await apiService.createPrivateConversation(friend.id);
        if (response.success && response.data) {
          const formatted = formatConversations([response.data]);
          if (formatted.length > 0) {
            setSelectedConversation(formatted[0]);
          }
          await loadConversations(true);
        }
      } catch (error: any) {
        alert(error.message || "Không thể tạo cuộc trò chuyện");
      } finally {
        setCreatingConversationId(null);
      }
    },
    [creatingConversationId, formatConversations, loadConversations]
  );

  // Handle conversation created
  const handleConversationCreated = (conversation: ConversationData) => {
    loadedRef.current = false; // Force reload
    loadConversations(true);

    // Auto-select newly created conversation
    const formatted = formatConversations([conversation]);
    if (formatted.length > 0) {
      setSelectedConversation(formatted[0]);
    }
  };

  // Connect WebSocket globally for conversation updates
  useEffect(() => {
    if (!mounted || !user) return;

    // Connect WebSocket if not connected
    if (!socketService.isConnected() && typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        socketService.connect(token);
      }
    }

    const handleConversationUpdate = (data: {
      conversationId: string;
      lastMessage: any;
    }) => {
      console.log("📢 Conversation updated via WebSocket:", data);
      loadedRef.current = false;
      loadConversations(true);
    };

    const handleConversationCreated = (data: {
      conversation: ConversationData;
    }) => {
      console.log("📢 Conversation created via WebSocket:", data);
      loadedRef.current = false;
      loadConversations(true);
    };

    socketService.on("conversation_updated", handleConversationUpdate);
    socketService.on("conversation_created", handleConversationCreated);

    return () => {
      socketService.off("conversation_updated", handleConversationUpdate);
      socketService.off("conversation_created", handleConversationCreated);
    };
  }, [mounted, user, loadConversations]);

  return (
    <>
      {/* Conversation list */}
      <section
        style={{
          width: 340,
          borderRight: "1px solid #e5e7eb",
          background: "#ffffff",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Search bar */}
        <div
          style={{
            padding: "16px 12px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "#f9fafb",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 14,
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
              placeholder="Tìm kiếm cuộc trò chuyện"
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 14,
                color: "#111827",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
                title="Xóa tìm kiếm"
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
          <button
            onClick={() => router.push("/friends")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Thêm bạn"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Tạo cuộc trò chuyện mới"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Search Results */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <div
            style={{
              borderBottom: "1px solid #e5e7eb",
              background: "#f9fafb",
              maxHeight: "40%",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "8px 16px",
                borderBottom: "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                {isSearching
                  ? "Đang tìm kiếm..."
                  : `${searchResults.length} kết quả`}
              </div>
            </div>
            {searchResults.map((result: any) => {
              // Get conversation name
              let conversationName = "Cuộc trò chuyện";
              if (result.conversation) {
                if (result.conversation.is_group) {
                  conversationName =
                    result.conversation.groupName ||
                    `Nhóm (${result.conversation.members?.length || 0})`;
                } else {
                  const otherMember = result.conversation.members?.find(
                    (m: any) => m.user_id !== user?.id
                  );
                  conversationName = otherMember?.user_name || "Người dùng";
                }
              }

              return (
                <div
                  key={result.id}
                  onClick={() => {
                    // Find conversation and select it
                    const conv = conversations.find(
                      (c) => c.con_id === result.con_id
                    );
                    if (conv) {
                      setSelectedConversation(conv);
                      setSearchQuery(""); // Clear search to show normal chat
                    }
                  }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    background: "#ffffff",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6366f1",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {conversationName}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#111827",
                      lineHeight: 1.4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {highlightKeyword(result.content, searchQuery)}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                    {new Date(result.timestamp).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Conversation items */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
          }}
        >
          {/* Loading State */}
          {(isLoading || isLoadingFriends) &&
          !loadedRef.current &&
          !friendsLoadedRef.current ? (
            <div style={{ padding: "20px" }}>
              {/* Loading skeleton items */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 16px",
                    gap: 12,
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  {/* Avatar skeleton */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      background:
                        "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.5s infinite",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    {/* Name skeleton */}
                    <div
                      style={{
                        height: 16,
                        width: "60%",
                        marginBottom: 8,
                        borderRadius: 4,
                        background:
                          "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                      }}
                    />
                    {/* Message skeleton */}
                    <div
                      style={{
                        height: 14,
                        width: "80%",
                        borderRadius: 4,
                        background:
                          "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
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
                <span>Đang tải cuộc trò chuyện...</span>
              </div>
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : (
            <>
              {filteredFriendsWithoutConversation.length > 0 && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f3f4f6",
                    background: "#fefce8",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display: "block",
                          color: "#92400e",
                          fontSize: 14,
                        }}
                      >
                        Bạn bè chưa trò chuyện
                      </strong>
                      <span style={{ fontSize: 12, color: "#a16207" }}>
                        Chọn &quot;Bắt đầu chat&quot; để mở cuộc hội thoại với
                        bạn vừa kết bạn
                      </span>
                    </div>
                    {isLoadingFriends && (
                      <span style={{ fontSize: 12, color: "#a16207" }}>
                        Đang tải...
                      </span>
                    )}
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {filteredFriendsWithoutConversation.map((friend) => (
                      <div
                        key={friend.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "#fff",
                          border: "1px solid #fde68a",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            background: friend.avatar
                              ? "transparent"
                              : "linear-gradient(135deg, #f97316, #fb923c)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 600,
                            flexShrink: 0,
                            overflow: "hidden",
                          }}
                        >
                          {friend.avatar &&
                          (friend.avatar.startsWith("http") ||
                            friend.avatar.startsWith("data:")) ? (
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            (friend.name || "B").substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#92400e",
                            }}
                          >
                            {friend.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#a16207",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {friend.email}
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartConversation(friend)}
                          disabled={creatingConversationId === friend.id}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "none",
                            background:
                              creatingConversationId === friend.id
                                ? "#fcd34d"
                                : "linear-gradient(135deg, #f97316, #fb923c)",
                            color:
                              creatingConversationId === friend.id
                                ? "#92400e"
                                : "#fff",
                            fontWeight: 600,
                            cursor:
                              creatingConversationId === friend.id
                                ? "wait"
                                : "pointer",
                            minWidth: 110,
                          }}
                        >
                          {creatingConversationId === friend.id
                            ? "Đang tạo..."
                            : "Bắt đầu chat"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {filteredConversations.length === 0 &&
              conversations.length > 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    style={{ margin: "0 auto 16px", display: "block" }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <div
                    style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}
                  >
                    Không tìm thấy kết quả
                  </div>
                  <div style={{ fontSize: 13, color: "#9ca3af" }}>
                    Không có cuộc trò chuyện nào khớp với &quot;{searchQuery}
                    &quot;
                  </div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  {friendsWithoutConversation.length > 0
                    ? 'Bạn vừa kết bạn nhưng chưa có cuộc trò chuyện nào. Hãy chọn "Bắt đầu chat" phía trên để mở đoạn chat mới.'
                    : "Chưa có cuộc trò chuyện nào"}
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "14px 16px",
                      gap: 12,
                      borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      background:
                        selectedConversation?.id === conv.id
                          ? "#e0e7ff"
                          : "#f9fafb",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedConversation?.id !== conv.id) {
                        e.currentTarget.style.background = "#f3f4f6";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedConversation?.id !== conv.id) {
                        e.currentTarget.style.background = "#f9fafb";
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        overflow: "hidden",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{ fontSize: 16, color: "#fff", fontWeight: 600 }}
                      >
                        {conv.avatar}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 15,
                            color: "#111827",
                            fontWeight: 600,
                          }}
                        >
                          {conv.name}
                        </strong>
                        <span
                          style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {conv.timestamp}
                        </span>
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
                        {conv.lastMessage}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </section>

      {/* Create Conversation Modal */}
      <CreateConversationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConversationCreated={handleConversationCreated}
      />

      {/* Main chat area or welcome area */}
      {selectedConversation ? (
        <ChatPanel conversation={selectedConversation} />
      ) : (
        <main
          style={{
            flex: 1,
            background: "#ffffff",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            {/* Chat bubble icon */}
            <div
              style={{
                width: 140,
                height: 140,
                margin: "0 auto 24px",
                borderRadius: 70,
                background: "linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #e9d5ff",
              }}
            >
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>

            <h2
              style={{
                margin: 0,
                color: "#4f46e5",
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 12,
                lineHeight: 1.2,
              }}
              suppressHydrationWarning
            >
              {mounted && user?.name
                ? `Chào mừng ${user.name} đến với ZolaChat`
                : "Chào mừng bạn đến với ZolaChat"}
            </h2>

            <p
              style={{
                marginTop: 0,
                marginBottom: 32,
                color: "#6b7280",
                fontSize: 16,
                lineHeight: 1.5,
              }}
            >
              Vui lòng chọn một cuộc trò chuyện để bắt đầu nhắn tin.
            </p>

            <Link
              href="/friends"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#fff",
                borderRadius: 24,
                padding: "12px 24px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 15,
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(99, 102, 241, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(99, 102, 241, 0.3)";
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              + Thêm bạn mới
            </Link>
          </div>
        </main>
      )}
    </>
  );
}
