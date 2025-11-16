"use client";

import { useState, useEffect, useRef } from "react";
import { apiService } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import CreatePostModal from "./CreatePostModal";

interface Post {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  caption: string;
  media: Array<{
    type: "image" | "video";
    sourceUrl: string;
    width: number;
    height: number;
  }>;
  createdAt: Date | string;
  updatedAt: Date | string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  promotionLevel: number;
  tags: string[];
  visibility: "public" | "friends" | "private";
  isDeleted: boolean;
  // UI state
  isLiked?: boolean;
}

interface DisplayPost {
  id: string;
  authorId: string;
  author: string;
  email: string;
  timestamp: string;
  title: string;
  description: string;
  image?: string;
  media?: Array<{
    type: "image" | "video";
    sourceUrl: string;
    width: number;
    height: number;
  }>;
  likes: number;
  isLiked: boolean;
}

interface Comment {
  commentId: string;
  targetId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  likeCount: number;
  isDeleted: boolean;
  replies?: Comment[];
}

type FilterType = "newest" | "mostLikes" | "mostViews" | "promotion";

export default function SocialPanel() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<DisplayPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<DisplayPost | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("newest");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState<{
    [key: string]: boolean;
  }>({});
  const [replyingTo, setReplyingTo] = useState<{
    postId: string;
    commentId?: string;
  } | null>(null);
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>(
    {}
  );
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const [postComments, setPostComments] = useState<{
    [key: string]: Comment[];
  }>({});
  const [isLoadingComments, setIsLoadingComments] = useState<{
    [key: string]: boolean;
  }>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  // Lưu trạng thái like và số lượt like đã thay đổi để không bị mất khi filter
  // Map<postId, { isLiked: boolean, likeDelta: number, originalIsLiked: boolean }>
  // likeDelta: số lượt like đã thay đổi so với server (+1 nếu like, -1 nếu unlike, 0 nếu không đổi)
  // originalIsLiked: trạng thái like ban đầu từ server
  const [likedPosts, setLikedPosts] = useState<
    Map<
      string,
      { isLiked: boolean; likeDelta: number; originalIsLiked: boolean }
    >
  >(new Map());

  const parseDate = (value: unknown): Date => {
    if (!value) return new Date();

    // Firestore Timestamp
    if (
      typeof value === "object" &&
      value !== null &&
      "_seconds" in value &&
      typeof (value as any)._seconds === "number"
    ) {
      return new Date((value as any)._seconds * 1000);
    }

    // String ISO
    if (typeof value === "string") {
      return new Date(value);
    }

    // JS Date
    if (value instanceof Date) {
      return value;
    }

    return new Date();
  };

  const formatTimestamp = (input: Date | string): string => {
    const date = parseDate(input);

    const now = new Date();
    let diff = now.getTime() - date.getTime();

    // Nếu server timestamp lớn hơn local → ép về 0
    if (diff < 0) diff = 0;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;

    return "vừa xong";
  };

  const convertToDisplayPost = (post: Post): DisplayPost => {
    const date = parseDate(post.updatedAt || post.createdAt);
    const postId = post.postId;
    const serverLikeCount = post.likeCount || 0;
    const serverIsLiked = post.isLiked || false;

    // Kiểm tra trạng thái like đã lưu
    let isLiked = serverIsLiked;
    let likes = serverLikeCount;

    if (likedPosts.has(postId)) {
      const savedState = likedPosts.get(postId)!;
      isLiked = savedState.isLiked;
      // Điều chỉnh số lượt like dựa trên delta đã lưu
      // Delta được tính dựa trên sự khác biệt giữa trạng thái hiện tại và trạng thái ban đầu
      likes = Math.max(0, serverLikeCount + savedState.likeDelta);
    }

    return {
      id: postId,
      authorId: post.authorId,
      author: post.authorName || "Người dùng",
      email: "",
      timestamp: formatTimestamp(date),
      title:
        post.caption.split("\n")[0] ||
        post.caption.substring(0, 50) ||
        "Không có tiêu đề",
      description: post.caption,
      image: post.media?.length > 0 ? post.media[0].sourceUrl : undefined,
      media: post.media || [],
      likes: likes,
      isLiked: isLiked,
    };
  };

  const loadPosts = async (page: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const limit = 10;
      const postsResponse = await apiService.getPosts(limit);

      if (postsResponse.success && postsResponse.data) {
        // Lưu trạng thái ban đầu của các posts mới (chưa có trong Map)
        setLikedPosts((prev) => {
          const newMap = new Map(prev);
          postsResponse.data.forEach((post: Post) => {
            const postId = post.postId;
            if (!newMap.has(postId)) {
              newMap.set(postId, {
                isLiked: post.isLiked || false,
                likeDelta: 0,
                originalIsLiked: post.isLiked || false,
              });
            }
          });
          return newMap;
        });

        const displayPosts = postsResponse.data.map(convertToDisplayPost);
        if (append) {
          setPosts((prev) => [...prev, ...displayPosts]);
        } else {
          setPosts(displayPosts);
        }
        setHasMore(displayPosts.length === limit);
        setCurrentPage(page);
      } else {
        if (!append) {
          setPosts([]);
        }
        setHasMore(false);
      }

      if (page === 1) {
        const featuredResponse = await apiService.getFeaturedPosts(10);
        if (featuredResponse.success && featuredResponse.data) {
          const displayFeatured =
            featuredResponse.data.map(convertToDisplayPost);
          setFeaturedPosts(displayFeatured);
        }
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải bài đăng");
      if (!append) {
        setPosts([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts(1, false);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isLoading
        ) {
          loadPosts(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, currentPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && menuRefs.current[openMenuId]) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          const button = (event.target as HTMLElement).closest("button");
          if (!button || !button.querySelector("svg")) {
            setOpenMenuId(null);
          }
        }
      }
      if (
        showFilterMenu &&
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node)
      ) {
        const button = (event.target as HTMLElement).closest("button");
        if (!button || !button.closest("[data-filter-menu]")) {
          setShowFilterMenu(false);
        }
      }
    };

    if (openMenuId || showFilterMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openMenuId, showFilterMenu]);

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !user) return;

    const currentIsLiked = post.isLiked;
    const newIsLiked = !currentIsLiked;
    const newLikes = newIsLiked ? post.likes + 1 : Math.max(0, post.likes - 1);

    // Lấy trạng thái đã lưu
    const savedState = likedPosts.get(postId);
    const originalIsLiked = savedState?.originalIsLiked ?? currentIsLiked;

    // Tính toán delta mới dựa trên sự khác biệt giữa trạng thái mới và trạng thái ban đầu
    let newDelta = 0;
    if (newIsLiked && !originalIsLiked) {
      // Đang like (từ unliked -> liked so với trạng thái ban đầu)
      newDelta = 1;
    } else if (!newIsLiked && originalIsLiked) {
      // Đang unlike (từ liked -> unliked so với trạng thái ban đầu)
      newDelta = -1;
    }

    // Cập nhật UI ngay lập tức (optimistic update)
    setLikedPosts((prev) => {
      const newMap = new Map(prev);
      newMap.set(postId, {
        isLiked: newIsLiked,
        likeDelta: newDelta,
        originalIsLiked: originalIsLiked,
      });
      return newMap;
    });

    setPosts(
      posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            isLiked: newIsLiked,
            likes: newLikes,
          };
        }
        return p;
      })
    );

    try {
      // Gọi API để toggle like
      const response = await apiService.toggleLike(postId);

      if (response.success && response.data) {
        const { isLiked: serverIsLiked, likeCount: serverLikeCount } =
          response.data;

        // Cập nhật lại với dữ liệu từ server (để đảm bảo đồng bộ)
        setLikedPosts((prev) => {
          const newMap = new Map(prev);
          const currentState = newMap.get(postId);
          if (currentState) {
            newMap.set(postId, {
              isLiked: serverIsLiked,
              likeDelta: currentState.likeDelta,
              originalIsLiked: currentState.originalIsLiked,
            });
          }
          return newMap;
        });

        setPosts(
          posts.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                isLiked: serverIsLiked,
                likes: serverLikeCount,
              };
            }
            return p;
          })
        );
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);

      // Rollback nếu có lỗi
      setLikedPosts((prev) => {
        const newMap = new Map(prev);
        const currentState = newMap.get(postId);
        if (currentState) {
          newMap.set(postId, {
            isLiked: currentIsLiked,
            likeDelta: currentState.likeDelta,
            originalIsLiked: currentState.originalIsLiked,
          });
        }
        return newMap;
      });

      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              isLiked: currentIsLiked,
              likes: post.likes,
            };
          }
          return p;
        })
      );

      alert(error.message || "Không thể thích/bỏ thích bài viết");
    }
  };

  const loadComments = async (postId: string) => {
    if (postComments[postId]) return;

    setIsLoadingComments({ ...isLoadingComments, [postId]: true });

    try {
      const comments = await apiService.getCommentsByPost(postId, 50);

      const formattedComments: Comment[] = comments.map((comment: any) => ({
        commentId: comment.commentId,
        targetId: comment.targetId,
        authorId: comment.authorId,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        content: comment.content,
        createdAt: comment.createdAt?.toDate
          ? comment.createdAt.toDate()
          : new Date(comment.createdAt),
        updatedAt: comment.updatedAt?.toDate
          ? comment.updatedAt.toDate()
          : new Date(comment.updatedAt),
        likeCount: comment.likeCount || 0,
        isDeleted: comment.isDeleted || false,
        replies: comment.replies || [],
      }));

      setPostComments({ ...postComments, [postId]: formattedComments });
      setIsLoadingComments({ ...isLoadingComments, [postId]: false });
    } catch (error) {
      console.error("Error loading comments:", error);
      setIsLoadingComments({ ...isLoadingComments, [postId]: false });
    }
  };

  const handleCommentClick = (postId: string) => {
    if (openCommentsId === postId) {
      setOpenCommentsId(null);
      setReplyingTo(null);
    } else {
      setOpenCommentsId(postId);
      loadComments(postId);
    }
  };

  const handleReplyClick = (postId: string, commentId?: string) => {
    setReplyingTo({ postId, commentId });
  };

  const handleSubmitComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text || !user) return;

    try {
      const newComment = await apiService.createComment(postId, text);

      const formattedComment: Comment = {
        commentId: newComment.commentId,
        targetId: newComment.targetId,
        authorId: newComment.authorId,
        authorName: newComment.authorName,
        authorAvatar: newComment.authorAvatar,
        content: newComment.content,
        createdAt: newComment.createdAt?.toDate
          ? newComment.createdAt.toDate()
          : new Date(newComment.createdAt),
        updatedAt: newComment.updatedAt?.toDate
          ? newComment.updatedAt.toDate()
          : new Date(newComment.updatedAt),
        likeCount: newComment.likeCount || 0,
        isDeleted: newComment.isDeleted || false,
      };

      setPostComments({
        ...postComments,
        [postId]: [formattedComment, ...(postComments[postId] || [])],
      });
      setCommentTexts({ ...commentTexts, [postId]: "" });
      setReplyingTo(null);
    } catch (error) {
      console.error("Error creating comment:", error);
    }
  };

  const handleSubmitReply = async (postId: string, commentId: string) => {
    const text = replyTexts[commentId]?.trim();
    if (!text || !user) return;

    try {
      const newReply = await apiService.createComment(commentId, text);

      const formattedReply: Comment = {
        commentId: newReply.commentId,
        targetId: newReply.targetId,
        authorId: newReply.authorId,
        authorName: newReply.authorName,
        authorAvatar: newReply.authorAvatar,
        content: newReply.content,
        createdAt: newReply.createdAt?.toDate
          ? newReply.createdAt.toDate()
          : new Date(newReply.createdAt),
        updatedAt: newReply.updatedAt?.toDate
          ? newReply.updatedAt.toDate()
          : new Date(newReply.updatedAt),
        likeCount: newReply.likeCount || 0,
        isDeleted: newReply.isDeleted || false,
      };

      setPostComments({
        ...postComments,
        [postId]: postComments[postId].map((comment) => {
          if (comment.commentId === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), formattedReply],
            };
          }
          return comment;
        }),
      });
      setReplyTexts({ ...replyTexts, [commentId]: "" });
      setReplyingTo(null);
    } catch (error) {
      console.error("Error creating reply:", error);
    }
  };

  const extractPosts = (response: any) => {
    if (!response) return [];

    if (Array.isArray(response.data)) return response.data;

    if (Array.isArray(response.data?.data)) return response.data.data;

    if (Array.isArray(response.posts)) return response.posts;

    return [];
  };

  const fetchFilteredPosts = async (filterType: string) => {
    try {
      let response;

      switch (filterType) {
        case "newest":
          response = await apiService.getLatestPosts();
          break;
        case "mostLikes":
          response = await apiService.getTopLikedPosts();
          break;
        case "mostViews":
          response = await apiService.getTopViewedPosts();
          break;
        case "promotion":
          response = await apiService.getPromotedPosts();
          break;
        default:
          response = await apiService.getPosts();
          break;
      }

      const data = extractPosts(response);

      // Lưu trạng thái ban đầu của các posts mới (chưa có trong Map)
      setLikedPosts((prev) => {
        const newMap = new Map(prev);
        data.forEach((post: Post) => {
          const postId = post.postId;
          if (!newMap.has(postId)) {
            newMap.set(postId, {
              isLiked: post.isLiked || false,
              likeDelta: 0,
              originalIsLiked: post.isLiked || false,
            });
          }
        });
        return newMap;
      });

      const list = data.map(convertToDisplayPost);

      setPosts(list);
      setHasMore(false);
    } catch (error) {
      console.error("Lỗi khi load filter:", error);
    }
  };

  const handleFilter = (filterKey: FilterType) => {
    setActiveFilter(filterKey);
    setShowFilterMenu(false);
    fetchFilteredPosts(filterKey);
  };

  return (
    <div
      style={{ display: "flex", flex: 1, height: "100vh", overflow: "hidden" }}
    >
      {/* Main Feed */}
      <main
        style={{
          flex: 1,
          background: "#f9fafb",
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px 32px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: "#6366f1",
            }}
          >
            ZolaChat
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }} ref={filterMenuRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                style={{
                  padding: "10px 16px",
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 6px rgba(99, 102, 241, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span>
                  {activeFilter === "newest" && "Mới nhất"}
                  {activeFilter === "mostLikes" && "Nhiều lượt thích"}
                  {activeFilter === "mostViews" && "Nhiều lượt xem"}
                  {activeFilter === "promotion" && "Nổi bật"}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: showFilterMenu
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Filter Dropdown Menu */}
              {showFilterMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 8,
                    background: "#ffffff",
                    borderRadius: 8,
                    boxShadow:
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    border: "1px solid #e5e7eb",
                    zIndex: 100,
                    minWidth: 180,
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => {
                      handleFilter("newest");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background:
                        activeFilter === "newest" ? "#f3f4f6" : "transparent",
                      border: "none",
                      textAlign: "left",
                      fontSize: 14,
                      color: activeFilter === "newest" ? "#6366f1" : "#374151",
                      fontWeight: activeFilter === "newest" ? 600 : 400,
                      cursor: "pointer",
                      transition: "background 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (activeFilter !== "newest") {
                        e.currentTarget.style.background = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeFilter !== "newest") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {activeFilter === "newest" && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    Mới nhất
                  </button>
                  <button
                    onClick={() => {
                      handleFilter("mostLikes");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background:
                        activeFilter === "mostLikes"
                          ? "#f3f4f6"
                          : "transparent",
                      border: "none",
                      textAlign: "left",
                      fontSize: 14,
                      color:
                        activeFilter === "mostLikes" ? "#6366f1" : "#374151",
                      fontWeight: activeFilter === "mostLikes" ? 600 : 400,
                      cursor: "pointer",
                      transition: "background 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (activeFilter !== "mostLikes") {
                        e.currentTarget.style.background = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeFilter !== "mostLikes") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {activeFilter === "mostLikes" && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    Nhiều lượt thích
                  </button>
                  <button
                    onClick={() => {
                      handleFilter("mostViews");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background:
                        activeFilter === "mostViews"
                          ? "#f3f4f6"
                          : "transparent",
                      border: "none",
                      textAlign: "left",
                      fontSize: 14,
                      color:
                        activeFilter === "mostViews" ? "#6366f1" : "#374151",
                      fontWeight: activeFilter === "mostViews" ? 600 : 400,
                      cursor: "pointer",
                      transition: "background 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (activeFilter !== "mostViews") {
                        e.currentTarget.style.background = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeFilter !== "mostViews") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {activeFilter === "mostViews" && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    Nhiều lượt xem
                  </button>
                  <button
                    onClick={() => {
                      handleFilter("promotion");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background:
                        activeFilter === "promotion"
                          ? "#f3f4f6"
                          : "transparent",
                      border: "none",
                      textAlign: "left",
                      fontSize: 14,
                      color:
                        activeFilter === "promotion" ? "#6366f1" : "#374151",
                      fontWeight: activeFilter === "promotion" ? 600 : 400,
                      cursor: "pointer",
                      transition: "background 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (activeFilter !== "promotion") {
                        e.currentTarget.style.background = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeFilter !== "promotion") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {activeFilter === "promotion" && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    Nổi bật
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
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
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tạo bài viết
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div
          style={{
            padding: "24px 32px",
            maxWidth: 680,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {isLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#6b7280",
              }}
            >
              <div style={{ fontSize: 16 }}>Đang tải bài đăng...</div>
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#ef4444",
              }}
            >
              <div style={{ fontSize: 16 }}>{error}</div>
            </div>
          ) : posts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#6b7280",
              }}
            >
              <div style={{ fontSize: 16 }}>Chưa có bài đăng nào</div>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                style={{
                  background: "#ffffff",
                  borderRadius: 12,
                  padding: "20px",
                  marginBottom: 20,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                {/* Post Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 16,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <span
                      style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}
                    >
                      {post.author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#111827",
                        marginBottom: 2,
                      }}
                    >
                      {post.author}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {post.email}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      {post.timestamp}
                    </div>
                    {user && user.id === post.authorId && (
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === post.id ? null : post.id
                            )
                          }
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f3f4f6")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b7280"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                        {openMenuId === post.id && (
                          <div
                            ref={(el) => {
                              menuRefs.current[post.id] = el;
                            }}
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              marginTop: 8,
                              background: "#ffffff",
                              borderRadius: 8,
                              boxShadow:
                                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                              border: "1px solid #e5e7eb",
                              zIndex: 100,
                              minWidth: 150,
                              overflow: "hidden",
                            }}
                          >
                            <button
                              onClick={() => {
                                setEditingPost(post);
                                setOpenMenuId(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "10px 16px",
                                background: "transparent",
                                border: "none",
                                textAlign: "left",
                                fontSize: 14,
                                color: "#374151",
                                cursor: "pointer",
                                transition: "background 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f9fafb")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  confirm(
                                    "Bạn có chắc chắn muốn xóa bài viết này?"
                                  )
                                ) {
                                  try {
                                    await apiService.deletePost(post.id);
                                    setOpenMenuId(null);
                                    loadPosts();
                                  } catch (err: any) {
                                    alert(
                                      err.message || "Không thể xóa bài viết"
                                    );
                                  }
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "10px 16px",
                                background: "transparent",
                                border: "none",
                                textAlign: "left",
                                fontSize: 14,
                                color: "#ef4444",
                                cursor: "pointer",
                                transition: "background 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                borderTop: "1px solid #e5e7eb",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#fef2f2")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Title */}
                <h3
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {post.title}
                </h3>

                {/* Post Description */}
                <p
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 1.6,
                  }}
                >
                  {post.description}
                </p>

                {/* Post Media */}
                {post.media && post.media.length > 0 && (
                  <div
                    style={{
                      width: "100%",
                      marginBottom: 16,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {post.media.length === 1 ? (
                      <div>
                        {post.media[0].type === "image" ? (
                          <img
                            src={post.media[0].sourceUrl}
                            alt={post.title}
                            style={{
                              width: "100%",
                              height: "auto",
                              display: "block",
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <video
                            src={post.media[0].sourceUrl}
                            controls
                            style={{
                              width: "100%",
                              height: "auto",
                              display: "block",
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            post.media.length === 2
                              ? "1fr 1fr"
                              : "repeat(2, 1fr)",
                          gap: 2,
                        }}
                      >
                        {post.media.slice(0, 4).map((item, index) => (
                          <div
                            key={index}
                            style={{
                              position: "relative",
                              aspectRatio: "1",
                              overflow: "hidden",
                              background: "#f3f4f6",
                            }}
                          >
                            {item.type === "image" ? (
                              <img
                                src={item.sourceUrl}
                                alt={`${post.title} - ${index + 1}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <video
                                src={item.sourceUrl}
                                controls
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            )}
                            {post.media &&
                              post.media.length > 4 &&
                              index === 3 && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: "rgba(0, 0, 0, 0.5)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#ffffff",
                                    fontSize: 24,
                                    fontWeight: 700,
                                  }}
                                >
                                  +{post.media.length - 4}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Post Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingTop: 12,
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <button
                    onClick={() => handleLike(post.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: 6,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f9fafb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={post.isLiked ? "#ef4444" : "none"}
                      stroke={post.isLiked ? "#ef4444" : "#6b7280"}
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span
                      style={{
                        fontSize: 14,
                        color: post.isLiked ? "#ef4444" : "#6b7280",
                        fontWeight: 500,
                      }}
                    >
                      Thích
                    </span>
                  </button>
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>
                    {post.likes} lượt thích
                  </span>
                  <button
                    onClick={() => handleCommentClick(post.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: 6,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f9fafb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                        fontWeight: 500,
                      }}
                    >
                      Bình luận
                    </span>
                  </button>
                </div>

                {/* Comments Section */}
                {openCommentsId === post.id && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1px solid #e5e7eb",
                      background: "#fafafa",
                      borderRadius: "0 0 12px 12px",
                      margin: "0 -20px -20px -20px",
                      padding: "16px 20px",
                    }}
                  >
                    {isLoadingComments[post.id] ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#6b7280",
                          fontSize: 14,
                        }}
                      >
                        Đang tải bình luận...
                      </div>
                    ) : (
                      <>
                        {/* Comments List */}
                        {postComments[post.id] &&
                          postComments[post.id].length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              {(showAllComments[post.id]
                                ? postComments[post.id]
                                : postComments[post.id].slice(0, 3)
                              ).map((comment) => (
                                <div
                                  key={comment.commentId}
                                  style={{
                                    marginBottom: 16,
                                    paddingBottom: 16,
                                    borderBottom: "1px solid #e5e7eb",
                                  }}
                                >
                                  {/* Main Comment */}
                                  <div style={{ display: "flex", gap: 12 }}>
                                    <div
                                      style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        background: comment.authorAvatar
                                          ? `url(${comment.authorAvatar})`
                                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        backgroundSize: comment.authorAvatar
                                          ? "cover"
                                          : "auto",
                                        backgroundPosition: "center",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        border: "2px solid #ffffff",
                                        boxShadow:
                                          "0 2px 4px rgba(0, 0, 0, 0.1)",
                                      }}
                                    >
                                      {!comment.authorAvatar && (
                                        <span
                                          style={{
                                            fontSize: 14,
                                            color: "#fff",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {comment.authorName
                                            .charAt(0)
                                            .toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div
                                        style={{
                                          background: "#ffffff",
                                          borderRadius: 12,
                                          padding: "12px 14px",
                                          marginBottom: 8,
                                          boxShadow:
                                            "0 1px 2px rgba(0, 0, 0, 0.05)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: "#111827",
                                            marginBottom: 4,
                                          }}
                                        >
                                          {comment.authorName}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 14,
                                            color: "#374151",
                                            lineHeight: 1.5,
                                            marginBottom: 6,
                                          }}
                                        >
                                          {comment.content}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 12,
                                            color: "#9ca3af",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                          }}
                                        >
                                          <span>
                                            {formatTimestamp(comment.createdAt)}
                                          </span>
                                          <button
                                            onClick={() =>
                                              handleReplyClick(
                                                post.id,
                                                comment.commentId
                                              )
                                            }
                                            style={{
                                              background: "transparent",
                                              border: "none",
                                              color: "#6366f1",
                                              fontSize: 12,
                                              fontWeight: 500,
                                              cursor: "pointer",
                                              padding: 0,
                                            }}
                                          >
                                            Trả lời
                                          </button>
                                          <span>
                                            {comment.likeCount} lượt thích
                                          </span>
                                        </div>
                                      </div>

                                      {/* Reply Input */}
                                      {replyingTo?.postId === post.id &&
                                        replyingTo?.commentId ===
                                          comment.commentId && (
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: 8,
                                              alignItems: "flex-start",
                                              marginLeft: 12,
                                              marginTop: 8,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 14,
                                                background: user?.avatar
                                                  ? `url(${user.avatar})`
                                                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                backgroundSize: user?.avatar
                                                  ? "cover"
                                                  : "auto",
                                                backgroundPosition: "center",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                              }}
                                            >
                                              {!user?.avatar && (
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    color: "#fff",
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  {user?.name
                                                    ?.charAt(0)
                                                    .toUpperCase() || "U"}
                                                </span>
                                              )}
                                            </div>
                                            <div
                                              style={{
                                                flex: 1,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 6,
                                              }}
                                            >
                                              <textarea
                                                value={
                                                  replyTexts[
                                                    comment.commentId
                                                  ] || ""
                                                }
                                                onChange={(e) =>
                                                  setReplyTexts({
                                                    ...replyTexts,
                                                    [comment.commentId]:
                                                      e.target.value,
                                                  })
                                                }
                                                placeholder={`Trả lời ${comment.authorName}...`}
                                                style={{
                                                  width: "100%",
                                                  padding: "8px 10px",
                                                  border: "1px solid #e5e7eb",
                                                  borderRadius: 8,
                                                  fontSize: 13,
                                                  resize: "vertical",
                                                  minHeight: 50,
                                                  fontFamily: "inherit",
                                                  outline: "none",
                                                  transition:
                                                    "border-color 0.2s",
                                                  color: "#111827",
                                                  background: "#ffffff",
                                                }}
                                                onFocus={(e) =>
                                                  (e.target.style.borderColor =
                                                    "#6366f1")
                                                }
                                                onBlur={(e) =>
                                                  (e.target.style.borderColor =
                                                    "#e5e7eb")
                                                }
                                              />
                                              <div
                                                style={{
                                                  display: "flex",
                                                  justifyContent: "flex-end",
                                                  gap: 6,
                                                }}
                                              >
                                                <button
                                                  onClick={() => {
                                                    setReplyingTo(null);
                                                    setReplyTexts({
                                                      ...replyTexts,
                                                      [comment.commentId]: "",
                                                    });
                                                  }}
                                                  style={{
                                                    padding: "4px 10px",
                                                    background: "transparent",
                                                    border: "1px solid #e5e7eb",
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    color: "#6b7280",
                                                    cursor: "pointer",
                                                  }}
                                                >
                                                  Hủy
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleSubmitReply(
                                                      post.id,
                                                      comment.commentId
                                                    )
                                                  }
                                                  disabled={
                                                    !replyTexts[
                                                      comment.commentId
                                                    ]?.trim() || !user
                                                  }
                                                  style={{
                                                    padding: "4px 12px",
                                                    background:
                                                      replyTexts[
                                                        comment.commentId
                                                      ]?.trim() && user
                                                        ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                                                        : "#d1d5db",
                                                    color: "#ffffff",
                                                    border: "none",
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor:
                                                      replyTexts[
                                                        comment.commentId
                                                      ]?.trim() && user
                                                        ? "pointer"
                                                        : "not-allowed",
                                                    opacity:
                                                      replyTexts[
                                                        comment.commentId
                                                      ]?.trim() && user
                                                        ? 1
                                                        : 0.6,
                                                  }}
                                                >
                                                  Đăng
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                      {/* Replies */}
                                      {comment.replies &&
                                        comment.replies.length > 0 && (
                                          <div
                                            style={{
                                              marginLeft: 12,
                                              marginTop: 12,
                                            }}
                                          >
                                            {comment.replies.map((reply) => (
                                              <div
                                                key={reply.commentId}
                                                style={{
                                                  display: "flex",
                                                  gap: 10,
                                                  marginBottom: 12,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 14,
                                                    background:
                                                      reply.authorAvatar
                                                        ? `url(${reply.authorAvatar})`
                                                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                    backgroundSize:
                                                      reply.authorAvatar
                                                        ? "cover"
                                                        : "auto",
                                                    backgroundPosition:
                                                      "center",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                  }}
                                                >
                                                  {!reply.authorAvatar && (
                                                    <span
                                                      style={{
                                                        fontSize: 11,
                                                        color: "#fff",
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      {reply.authorName
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                    </span>
                                                  )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                  <div
                                                    style={{
                                                      background: "#ffffff",
                                                      borderRadius: 10,
                                                      padding: "10px 12px",
                                                      boxShadow:
                                                        "0 1px 2px rgba(0, 0, 0, 0.05)",
                                                    }}
                                                  >
                                                    <div
                                                      style={{
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        color: "#111827",
                                                        marginBottom: 4,
                                                      }}
                                                    >
                                                      {reply.authorName}
                                                    </div>
                                                    <div
                                                      style={{
                                                        fontSize: 13,
                                                        color: "#374151",
                                                        lineHeight: 1.5,
                                                        marginBottom: 6,
                                                      }}
                                                    >
                                                      {reply.content}
                                                    </div>
                                                    <div
                                                      style={{
                                                        fontSize: 11,
                                                        color: "#9ca3af",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 10,
                                                      }}
                                                    >
                                                      <span>
                                                        {formatTimestamp(
                                                          reply.createdAt
                                                        )}
                                                      </span>
                                                      <button
                                                        onClick={() =>
                                                          handleReplyClick(
                                                            post.id,
                                                            reply.commentId
                                                          )
                                                        }
                                                        style={{
                                                          background:
                                                            "transparent",
                                                          border: "none",
                                                          color: "#6366f1",
                                                          fontSize: 11,
                                                          fontWeight: 500,
                                                          cursor: "pointer",
                                                          padding: 0,
                                                        }}
                                                      >
                                                        Trả lời
                                                      </button>
                                                      <span>
                                                        {reply.likeCount} lượt
                                                        thích
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Show More/Less Button */}
                              {postComments[post.id].length > 3 && (
                                <button
                                  onClick={() =>
                                    setShowAllComments({
                                      ...showAllComments,
                                      [post.id]: !showAllComments[post.id],
                                    })
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    background: "transparent",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    fontSize: 13,
                                    color: "#6366f1",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    marginTop: 8,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      "#f9fafb";
                                    e.currentTarget.style.borderColor =
                                      "#6366f1";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background =
                                      "transparent";
                                    e.currentTarget.style.borderColor =
                                      "#e5e7eb";
                                  }}
                                >
                                  {showAllComments[post.id]
                                    ? `Ẩn bớt bình luận`
                                    : `Xem thêm ${
                                        postComments[post.id].length - 3
                                      } bình luận`}
                                </button>
                              )}
                            </div>
                          )}

                        {/* Comment Input */}
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              background: user?.avatar
                                ? `url(${user.avatar})`
                                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              backgroundSize: user?.avatar ? "cover" : "auto",
                              backgroundPosition: "center",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              border: "2px solid #ffffff",
                              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            {!user?.avatar && (
                              <span
                                style={{
                                  fontSize: 14,
                                  color: "#fff",
                                  fontWeight: 600,
                                }}
                              >
                                {user?.name?.charAt(0).toUpperCase() || "U"}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            {replyingTo?.postId === post.id &&
                              !replyingTo?.commentId && (
                                <div
                                  style={{
                                    padding: "6px 10px",
                                    background: "#f3f4f6",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    color: "#6b7280",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span>Đang trả lời bài viết</span>
                                  <button
                                    onClick={() => setReplyingTo(null)}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "#6366f1",
                                      cursor: "pointer",
                                      fontSize: 12,
                                      padding: 0,
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            <textarea
                              value={commentTexts[post.id] || ""}
                              onChange={(e) =>
                                setCommentTexts({
                                  ...commentTexts,
                                  [post.id]: e.target.value,
                                })
                              }
                              placeholder={
                                replyingTo?.postId === post.id &&
                                !replyingTo?.commentId
                                  ? "Viết bình luận cho bài viết..."
                                  : "Viết bình luận..."
                              }
                              style={{
                                width: "100%",
                                padding: "12px 14px",
                                border: "2px solid #e5e7eb",
                                borderRadius: 12,
                                fontSize: 14,
                                resize: "vertical",
                                minHeight: 70,
                                fontFamily: "inherit",
                                outline: "none",
                                transition: "all 0.2s",
                                color: "#111827",
                                background: "#ffffff",
                                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = "#6366f1";
                                e.target.style.boxShadow =
                                  "0 0 0 3px rgba(99, 102, 241, 0.1)";
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = "#e5e7eb";
                                e.target.style.boxShadow =
                                  "0 1px 2px rgba(0, 0, 0, 0.05)";
                              }}
                            />
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 8,
                              }}
                            >
                              {replyingTo?.postId === post.id &&
                                !replyingTo?.commentId && (
                                  <button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setCommentTexts({
                                        ...commentTexts,
                                        [post.id]: "",
                                      });
                                    }}
                                    style={{
                                      padding: "8px 14px",
                                      background: "transparent",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 8,
                                      fontSize: 13,
                                      color: "#6b7280",
                                      cursor: "pointer",
                                      transition: "all 0.2s",
                                      fontWeight: 500,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background =
                                        "#f9fafb";
                                      e.currentTarget.style.borderColor =
                                        "#d1d5db";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background =
                                        "transparent";
                                      e.currentTarget.style.borderColor =
                                        "#e5e7eb";
                                    }}
                                  >
                                    Hủy
                                  </button>
                                )}
                              <button
                                onClick={() => handleSubmitComment(post.id)}
                                disabled={
                                  !commentTexts[post.id]?.trim() || !user
                                }
                                style={{
                                  padding: "8px 20px",
                                  background:
                                    commentTexts[post.id]?.trim() && user
                                      ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                                      : "#d1d5db",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: 8,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor:
                                    commentTexts[post.id]?.trim() && user
                                      ? "pointer"
                                      : "not-allowed",
                                  transition: "all 0.2s",
                                  opacity:
                                    commentTexts[post.id]?.trim() && user
                                      ? 1
                                      : 0.6,
                                  boxShadow:
                                    commentTexts[post.id]?.trim() && user
                                      ? "0 2px 4px rgba(99, 102, 241, 0.3)"
                                      : "none",
                                }}
                                onMouseEnter={(e) => {
                                  if (commentTexts[post.id]?.trim() && user) {
                                    e.currentTarget.style.transform =
                                      "translateY(-1px)";
                                    e.currentTarget.style.boxShadow =
                                      "0 4px 6px rgba(99, 102, 241, 0.4)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.boxShadow =
                                    commentTexts[post.id]?.trim() && user
                                      ? "0 2px 4px rgba(99, 102, 241, 0.3)"
                                      : "none";
                                }}
                              >
                                Đăng
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Lazy Loading Trigger */}
          {hasMore && (
            <div
              ref={observerTarget}
              style={{
                height: 20,
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isLoadingMore && (
                <div style={{ fontSize: 14, color: "#6b7280" }}>
                  Đang tải thêm...
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Featured Posts */}
      <aside
        style={
          {
            width: 320,
            background: "#ffffff",
            borderLeft: "1px solid #e5e7eb",
            padding: "24px 20px",
            height: "100%",
            overflowY: "auto",
          } as React.CSSProperties
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Bài viết nổi bật
          </h2>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {featuredPosts.map((post) => (
            <div
              key={post.id}
              style={{
                padding: "12px",
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                {post.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 8,
                }}
              >
                Bởi: {post.author}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="#ef4444"
                  stroke="#ef4444"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {post.likes}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={() => {
          setShowCreateModal(false);
          loadPosts();
        }}
      />
      <CreatePostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onPostCreated={() => {
          setEditingPost(null);
          loadPosts();
        }}
        editingPost={
          editingPost
            ? {
                id: editingPost.id,
                title: editingPost.title,
                description: editingPost.description
                  .replace(/^[^\n]+\n?/, "")
                  .trim(),
                visibility: "public",
                tags: "",
                media: editingPost.media,
              }
            : null
        }
      />
    </div>
  );
}
