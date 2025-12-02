"use client";

import { useState, useEffect, useRef } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { socketService } from '@/services/socket';
import CreatePostModal from './CreatePostModal';
import PostDetailModal from './PostDetailModal';
import SharePostModal from './SharePostModal';
import StoryBar from './StoryBar';
import CreateStoryModal from './CreateStoryModal'; 

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
  // Shared post fields
  isShared?: boolean;
  sharedPostId?: string;
  sharedPost?: Post;
  shareCount?: number;
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
  commentCount: number;
  isLiked: boolean;
  // Shared post fields
  isShared?: boolean;
  sharedPost?: {
    id: string;
    author: string;
    title: string;
    description: string;
    media?: Array<{
      type: "image" | "video";
      sourceUrl: string;
      width: number;
      height: number;
    }>;
  };
  shareCount?: number;
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
const LOAD_BATCH_SIZE = 10; // Số posts load mỗi lần
const VISIBLE_BATCH_SIZE = 2;

export default function SocialPanel() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<DisplayPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<DisplayPost | null>(null); // State for the post to display in modal
  const [showPostDetailModal, setShowPostDetailModal] = useState(false); // State to control the post detail modal visibility
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingPost, setSharingPost] = useState<DisplayPost | null>(null);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyRefreshTrigger, setStoryRefreshTrigger] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<DisplayPost | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("newest");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId?: string } | null>(null);
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const [postComments, setPostComments] = useState<{
    [key: string]: Comment[];
  }>({});
  const [isLoadingComments, setIsLoadingComments] = useState<{
    [key: string]: boolean;
  }>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_BATCH_SIZE);
  const [loadedPostsCount, setLoadedPostsCount] = useState(0); // Track số posts đã load
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
    const date = parseDate(post.createdAt);
    
    const liked = !!post.isLiked;

    if (!post.postId) {
      console.error("Post missing postId:", post);
    }

    const displayPost: DisplayPost = {
      id: post.postId,
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
      likes: post.likeCount || 0,
      commentCount: post.commentCount || 0,
      isLiked: liked,
      shareCount: post.shareCount || 0,
    };

    // If this is a shared post, populate shared post data
    if (post.isShared && post.sharedPost) {
      displayPost.isShared = true;
      displayPost.sharedPost = {
        id: post.sharedPost.postId,
        author: post.sharedPost.authorName || "Người dùng",
        title: post.sharedPost.caption.split("\n")[0] || post.sharedPost.caption.substring(0, 50) || "Không có tiêu đề",
        description: post.sharedPost.caption,
        media: post.sharedPost.media || [],
      };
    }

    return displayPost;
  };

  const loadPosts = async (append: boolean = false) => {
    if (append) {
      if (isLoadingMore || isLoading) {
        return;
      }
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setLoadedPostsCount(0);
    }
    setError(null);
    try {
      // Load posts dựa trên số lượng đã load
      const page = Math.floor(loadedPostsCount / LOAD_BATCH_SIZE) + 1;
      const postsResponse = await apiService.getPosts(page, LOAD_BATCH_SIZE);
      const serverPosts: Post[] =
        postsResponse?.success && postsResponse.data
          ? (extractPosts(postsResponse) as Post[])
          : [];
      const displayPosts = serverPosts.map(convertToDisplayPost);

      setLikedPosts((prev) => {
        const baseMap = append ? new Map(prev) : new Map();
        serverPosts.forEach((post) => {
          if (!post.postId) return;
          if (!baseMap.has(post.postId)) {
            baseMap.set(post.postId, {
              isLiked: post.isLiked || false,
              likeDelta: 0,
              originalIsLiked: post.isLiked || false,
            });
          }
        });
        return baseMap;
      });

      let updatedPosts: DisplayPost[] = [];
      setPosts((prev: DisplayPost[]) => {
        if (append) {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = displayPosts.filter(
            (post) => post.id && !existingIds.has(post.id)
          );
          updatedPosts = [...prev, ...newPosts];
          setLoadedPostsCount(updatedPosts.length);
          return updatedPosts;
        }
        updatedPosts = displayPosts;
        setLoadedPostsCount(displayPosts.length);
        return displayPosts;
      });
      if (!append) {
        setVisibleCount(Math.min(VISIBLE_BATCH_SIZE, displayPosts.length));
      }

      const hasMoreFromServer =
        typeof postsResponse?.hasMore === "boolean"
          ? postsResponse.hasMore
          : displayPosts.length === LOAD_BATCH_SIZE;
      setHasMore(hasMoreFromServer);

      // Load featured posts only on first load
      if (!append && loadedPostsCount === 0) {
        const featuredResponse = await apiService.getFeaturedPosts(10);
        if (featuredResponse.success && featuredResponse.data) {
          const displayFeatured = featuredResponse.data.map(convertToDisplayPost);
          const uniqueFeatured = Array.from(
            new Map<string, DisplayPost>(
              displayFeatured.map((p: DisplayPost) => [p.id, p])
            ).values()
          );
          setFeaturedPosts(uniqueFeatured);
        }
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải bài đăng");
      if (!append) {
        setPosts([]);
        setVisibleCount(0);
        setLoadedPostsCount(0);
      }
      setHasMore(false);
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Ref to track if we should trigger lazy loading after delete
  const shouldLoadMoreRef = useRef(false);

  // Connect WebSocket and setup listeners
  useEffect(() => {
    // Connect WebSocket if not connected
    if (!socketService.isConnected() && typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        socketService.connect(token);
      }
    }

    // Listen for new post
    const handlePostCreated = (data: { post: any }) => {
      const postId = data.post.postId || data.post.id;
      const authorId = data.post.authorId;
      const caption = data.post.caption || '';
      const createdAt = data.post.createdAt;
      
      // Format post to display format
      const newPost: DisplayPost = {
        id: postId,
        authorId: authorId,
        author: data.post.authorName,
        email: data.post.authorEmail || '',
        timestamp: new Date(createdAt).toLocaleString('vi-VN'),
        title: caption?.split('\n')[0] || '',
        description: caption?.replace(/^[^\n]+\n?/, '') || '',
        media: data.post.media || [],
        likes: data.post.likeCount || 0,
        commentCount: data.post.commentCount || 0,
        isLiked: false,
      };
      
      // Add to beginning of posts list with duplicate check
      setPosts(prev => {
        // 1. Check if post already exists by ID
        const existsById = prev.some(p => p.id === postId);
        if (existsById) {
          console.log('⚠️ Post already exists by ID, skipping:', postId);
          return prev;
        }
        
        // 2. Check if duplicate by author + title + recent (within last 10 posts)
        // This prevents duplicate from same author with same title sent at nearly same time
        const duplicateIndex = prev.findIndex(p => {
          const isSameAuthor = p.authorId === authorId;
          const isSameTitle = p.title.trim() === newPost.title.trim();
          const isRecent = prev.indexOf(p) < 10; // Within last 10 posts
          
          if (isSameAuthor && isSameTitle && isRecent) {
            // Check if timestamps are very close (within 5 seconds) - likely duplicate
            try {
              const postTime = new Date(p.timestamp).getTime();
              const newPostTime = new Date(createdAt).getTime();
              return Math.abs(postTime - newPostTime) < 5000; // 5 seconds
            } catch {
              // If can't parse timestamps, assume duplicate if recent and same author+title
              return true;
            }
          }
          return false;
        });
        
        if (duplicateIndex !== -1) {
          const existingPost = prev[duplicateIndex];
          if (existingPost.id !== postId) {
            console.log('⚠️ Found duplicate post by author+title+recent, replacing:', existingPost.id, 'with', postId);
            // Replace duplicate with real post
            const updated = [...prev];
            updated[duplicateIndex] = newPost;
            return updated;
          } else {
            // Same ID, already exists, skip
            console.log('⚠️ Post with same ID already exists, skipping');
            return prev;
          }
        }
        
        // 3. New post - add to beginning of list
        console.log('✅ Adding new post to UI:', postId);
        setLoadedPostsCount(prev => prev + 1);
        return [newPost, ...prev];
      });
    };

    // Listen for post updated
    const handlePostUpdated = (data: { postId: string; post: any }) => {
      setPosts(prev => prev.map(p => 
        p.id === data.postId 
          ? {
              ...p,
              title: data.post.caption?.split('\n')[0] || p.title,
              description: data.post.caption?.replace(/^[^\n]+\n?/, '') || p.description,
              media: data.post.media || p.media,
              likes: data.post.likeCount ?? p.likes,
              commentCount: data.post.commentCount ?? p.commentCount,
            }
          : p
      ));
    };

    // Listen for post deleted
    const handlePostDeleted = (data: { postId: string }) => {
      setPosts(prev => {
        const filtered = prev.filter(p => p.id !== data.postId);
        // Check if we should load more after delete
        const currentPosts = filtered.length;
        setLoadedPostsCount(prevCount => {
          const newCount = Math.max(prevCount - 1, 0);
          // If we have less posts than loaded count and there are more to load, trigger lazy loading
          if (hasMore && !isLoadingMore && currentPosts < newCount && currentPosts < visibleCount) {
            shouldLoadMoreRef.current = true;
          }
          return newCount;
        });
        return filtered;
      });
    };

    // Listen for new comment
    const handleCommentAdded = (data: { postId: string; comment: any }) => {
      // Add comment to post comments
      setPostComments(prev => {
        const existingComments = prev[data.postId] || [];
        // Check if comment already exists
        const exists = existingComments.some(c => c.commentId === data.comment.commentId || c.commentId === data.comment.id);
        if (exists) {
          return prev;
        }
        return {
          ...prev,
          [data.postId]: [...existingComments, data.comment],
        };
      });

      // Update comment count
      setPosts(prev => prev.map(p => 
        p.id === data.postId 
          ? { ...p, commentCount: (p.commentCount || 0) + 1 }
          : p
      ));
    };

    // Listen for comment updated
    const handleCommentUpdated = (data: { postId: string; commentId: string; comment: any }) => {
      setPostComments(prev => {
        const existingComments = prev[data.postId] || [];
        return {
          ...prev,
          [data.postId]: existingComments.map(c => 
            c.commentId === data.commentId ? { ...c, ...data.comment } : c
          ),
        };
      });
    };

    // Listen for comment deleted
    const handleCommentDeleted = (data: { postId: string; commentId: string }) => {
      setPostComments(prev => {
        const existingComments = prev[data.postId] || [];
        return {
          ...prev,
          [data.postId]: existingComments.filter(c => c.commentId !== data.commentId),
        };
      });

      // Update comment count
      setPosts(prev => prev.map(p => 
        p.id === data.postId 
          ? { ...p, commentCount: Math.max((p.commentCount || 0) - 1, 0) }
          : p
      ));
    };

    // Listen for post liked
    const handlePostLiked = (data: { postId: string; likeCount: number; userId: string }) => {
      const currentUserId = user?.id;
      setPosts(prev => prev.map(p => 
        p.id === data.postId 
          ? { 
              ...p, 
              likes: data.likeCount,
              // Update isLiked status if it's the current user
              isLiked: currentUserId === data.userId ? true : p.isLiked
            }
          : p
      ));
    };

    // Listen for post unliked
    const handlePostUnliked = (data: { postId: string; likeCount: number; userId: string }) => {
      const currentUserId = user?.id;
      setPosts(prev => prev.map(p => 
        p.id === data.postId 
          ? { 
              ...p, 
              likes: data.likeCount,
              // Update isLiked status if it's the current user
              isLiked: currentUserId === data.userId ? false : p.isLiked
            }
          : p
      ));
    };

    // Listen for post comment count updated
    const handlePostCommentCountUpdated = (data: { postId: string; commentCount: number }) => {
      setPosts(prev => prev.map(p => 
        p.id === data.postId 
          ? { ...p, commentCount: data.commentCount }
          : p
      ));
    };

    // Remove any existing listeners first to prevent duplicate
    socketService.off('post_created');
    socketService.off('post_updated');
    socketService.off('post_deleted');
    socketService.off('post_liked');
    socketService.off('post_unliked');
    socketService.off('post_comment_count_updated');
    socketService.off('comment_added');
    socketService.off('comment_updated');
    socketService.off('comment_deleted');
    
    // Add new listeners
    socketService.on('post_created', handlePostCreated);
    socketService.on('post_updated', handlePostUpdated);
    socketService.on('post_deleted', handlePostDeleted);
    socketService.on('post_liked', handlePostLiked);
    socketService.on('post_unliked', handlePostUnliked);
    socketService.on('post_comment_count_updated', handlePostCommentCountUpdated);
    socketService.on('comment_added', handleCommentAdded);
    socketService.on('comment_updated', handleCommentUpdated);
    socketService.on('comment_deleted', handleCommentDeleted);

    // Cleanup
    return () => {
      socketService.off('post_created', handlePostCreated);
      socketService.off('post_updated', handlePostUpdated);
      socketService.off('post_deleted', handlePostDeleted);
      socketService.off('post_liked', handlePostLiked);
      socketService.off('post_unliked', handlePostUnliked);
      socketService.off('post_comment_count_updated', handlePostCommentCountUpdated);
      socketService.off('comment_added', handleCommentAdded);
      socketService.off('comment_updated', handleCommentUpdated);
      socketService.off('comment_deleted', handleCommentDeleted);
    };
  }, [user?.id]);

  useEffect(() => {
    loadPosts(false);
  }, []);

  // Lazy loading sau khi xóa post
  useEffect(() => {
    if (shouldLoadMoreRef.current && hasMore && !isLoadingMore && !isLoading) {
      shouldLoadMoreRef.current = false;
      setTimeout(() => {
        if (activeFilter === "mostLikes" || activeFilter === "mostViews") {
          const fetchFn = (window as any).fetchFilteredPosts;
          if (fetchFn) {
            fetchFn(activeFilter, true);
          }
        } else {
          loadPosts(true);
        }
      }, 300);
    }
  }, [posts.length, hasMore, isLoadingMore, isLoading, activeFilter, loadPosts]);

  // Lazy loading theo scroll - tự động load khi cuộn xuống gần cuối
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let throttleTimer: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      // Throttle để tránh gọi quá nhiều lần
      if (throttleTimer) return;
      
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        const { scrollTop, scrollHeight, clientHeight } = container;
        
        // Tránh chia cho 0
        if (scrollHeight <= clientHeight) return;
        
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

        // Khi cuộn xuống gần cuối (85% trở lên)
        if (scrollPercentage >= 0.85) {
          // Nếu còn posts chưa hiển thị, hiển thị thêm
          if (visibleCount < posts.length) {
            setVisibleCount((prev) =>
              Math.min(prev + VISIBLE_BATCH_SIZE, posts.length)
            );
            return;
          }

          // Nếu đã hiển thị hết và còn posts để load, load thêm
          if (hasMore && !isLoadingMore && !isLoading) {
            if (
              activeFilter &&
              (activeFilter === "mostLikes" || activeFilter === "mostViews")
            ) {
              fetchFilteredPosts(activeFilter, true);
            } else {
              loadPosts(true);
            }
          }
        }
      }, 200); // Throttle 200ms
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
    };
  }, [
    hasMore,
    isLoadingMore,
    isLoading,
    activeFilter,
    posts.length,
    visibleCount,
  ]);

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

  const handleLike = (postId: string) => {
    const currentlyLiked = posts.find(p => p.id === postId)?.isLiked ?? false;

    // Optimistically update UI
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !currentlyLiked,
          likes: currentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1
        };
      }
      return p;
    }));

    // Call API
    (async () => {
      try {
        if (!currentlyLiked) {
          const res = await apiService.likePost(postId);
          if (res && res.data) {
            setPosts(prev => prev.map(p => 
              p.id === postId 
                ? { 
                    ...p, 
                    likes: res.data.likeCount ?? p.likes,
                    isLiked: !!res.data.isLiked
                  } 
                : p
            ));
          }
        } else {
          const res = await apiService.unlikePost(postId);
          if (res && res.data) {
            setPosts(prev => prev.map(p => 
              p.id === postId 
                ? { 
                    ...p, 
                    likes: res.data.likeCount ?? Math.max(0, p.likes - 1),
                    isLiked: !!res.data.isLiked
                  } 
                : p
            ));
          }
        }
      } catch (err: any) {
        console.error('Error toggling like on post:', err);
        // Revert optimistic update on error
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              isLiked: currentlyLiked,
              likes: currentlyLiked ? p.likes + 1 : Math.max(0, p.likes - 1)
            };
          }
          return p;
        }));
      }
    })();
  };

  const extractPosts = (response: any) => {
    if (!response) return [];

    if (Array.isArray(response.data)) return response.data;

    if (Array.isArray(response.data?.data)) return response.data.data;

    if (Array.isArray(response.posts)) return response.posts;

    return [];
  };

  const fetchFilteredPosts = async (
    filterType: string,
    append: boolean = false
  ) => {
    // Store function reference for use in effects
    (window as any).fetchFilteredPosts = fetchFilteredPosts;
    if (filterType === "newest") {
      loadPosts(append);
      return;
    }
    if (append) {
      if (isLoadingMore || isLoading) {
        return;
      }
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setLoadedPostsCount(0);
    }
    setError(null);
    try {
      let response;
      const limit = LOAD_BATCH_SIZE;

      // Calculate page based on loaded count
      const page = Math.floor(loadedPostsCount / LOAD_BATCH_SIZE) + 1;

      switch (filterType) {
        case "mostLikes":
          response = await apiService.getTopLikedPosts(page, limit);
          break;
        case "mostViews":
          response = await apiService.getTopViewedPosts(page, limit);
          break;
        case "promotion":
          response = await apiService.getPromotedPosts();
          break;
        default:
          response = await apiService.getPosts(page, limit);
          break;
      }

      const data = extractPosts(response);

      // Lưu trạng thái ban đầu của các posts mới (chưa có trong Map)
      setLikedPosts((prev) => {
        const baseMap = append ? new Map(prev) : new Map();
        data.forEach((post: Post) => {
          const postId = post.postId;
          if (!postId || baseMap.has(postId)) return;
          baseMap.set(postId, {
            isLiked: post.isLiked || false,
            likeDelta: 0,
            originalIsLiked: post.isLiked || false,
          });
        });
        return baseMap;
      });

      const list = data.map(convertToDisplayPost);

      if (append) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p: DisplayPost) => p.id));
          const newPosts = list.filter(
            (p: DisplayPost) => !existingIds.has(p.id)
          );
          const updated = [...prev, ...newPosts];
          setLoadedPostsCount(updated.length);
          return updated;
        });
        setHasMore(list.length === limit);
      } else {
        setPosts(list);
        setLoadedPostsCount(list.length);
        setVisibleCount(Math.min(VISIBLE_BATCH_SIZE, list.length));
        setHasMore(filterType === "promotion" ? false : list.length === limit);
      }
    } catch (error) {
      console.error("Lỗi khi load filter:", error);
      setError("Không thể tải bài đăng theo bộ lọc");
      if (!append) {
        setPosts([]);
        setVisibleCount(0);
        setLoadedPostsCount(0);
      }
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleFilter = (filterKey: FilterType) => {
    setActiveFilter(filterKey);
    setShowFilterMenu(false);
    if (filterKey === "newest") {
      loadPosts(false);
    } else {
      fetchFilteredPosts(filterKey, false);
    }
  };

  const visiblePosts = posts.slice(0, visibleCount);
  const shouldShowLoadMoreTrigger =
    hasMore || visibleCount < posts.length;

  return (
    <div
      style={{ display: "flex", flex: 1, height: "100vh", overflow: "hidden" }}
    >
      {/* Main Feed */}
      <main
        className="main-feed-scroll"
        style={{
          flex: 1,
          background: "#f9fafb",
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
        ref={scrollContainerRef}
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

        {/* Story Bar */}
        <StoryBar 
          onCreateStory={() => setShowCreateStoryModal(true)}
          refreshTrigger={storyRefreshTrigger}
        />

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
            visiblePosts.map((post) => (
              <div
              key={post.id}
              style={{
                background: "#ffffff",
                borderRadius: 12,
                padding: "20px",
                marginBottom: 20,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                transition: "all 0.2s"
              }}
            >
              {/* Post Header */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 16, position: "relative" }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12
                }}>
                  <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>
                    {post.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                    {post.author}
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
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {post.email}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {post.timestamp}
                  </div>
                  {user && user.id === post.authorId && (
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === post.id ? null : post.id);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
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
                            top: "calc(100% + 8px)",
                            right: 0,
                            minWidth: 160,
                            background: "#ffffff",
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                            boxShadow:
                              "0 8px 20px rgba(15, 23, 42, 0.08), 0 4px 8px rgba(15, 23, 42, 0.06)",
                            display: "flex",
                            flexDirection: "column",
                            padding: 4,
                            zIndex: 20
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPost(post);
                              setOpenMenuId(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              background: "transparent",
                              border: "none",
                              textAlign: "left",
                              fontSize: 13,
                              color: "#374151",
                              cursor: "pointer",
                              transition: "background 0.2s",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              borderRadius: 6
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
                                try {
                                  await apiService.deletePost(post.id);
                                  setOpenMenuId(null);
                                  // Don't reload all posts - WebSocket will handle removing the post
                                  // Remove post from list immediately for better UX
                                  setPosts(prev => {
                                    const filtered = prev.filter(p => p.id !== post.id);
                                    // Update loaded count
                                    setLoadedPostsCount(prevCount => {
                                      const newCount = Math.max(prevCount - 1, 0);
                                      // If we have less posts than expected and there are more to load, trigger lazy loading
                                      if (hasMore && !isLoadingMore && filtered.length < newCount && filtered.length < visibleCount) {
                                        shouldLoadMoreRef.current = true;
                                        // Trigger lazy loading after a short delay
                                        setTimeout(() => {
                                          if (shouldLoadMoreRef.current) {
                                            if (activeFilter === "mostLikes" || activeFilter === "mostViews") {
                                              fetchFilteredPosts(activeFilter, true);
                                            } else {
                                              loadPosts(true);
                                            }
                                            shouldLoadMoreRef.current = false;
                                          }
                                        }, 300);
                                      }
                                      return newCount;
                                    });
                                    return filtered;
                                  });
                                } catch (err: any) {
                                  alert(err.message || 'Không thể xóa bài viết');
                                }
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              background: "transparent",
                              border: "none",
                              textAlign: "left",
                              fontSize: 13,
                              color: "#ef4444",
                              cursor: "pointer",
                              transition: "background 0.2s",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              borderRadius: 6
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <h3 style={{
                margin: "0 0 8px 0",
                fontSize: 18,
                fontWeight: 700,
                color: "#111827"
              }}>
                {post.title}
              </h3>

              {/* Post Description */}
              <p style={{
                margin: "0 0 16px 0",
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.6
              }}>
                {post.description}
              </p>

              {/* Shared Post Preview */}
              {post.isShared && post.sharedPost && (
                <div style={{
                  border: "2px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  background: "#f9fafb",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => {
                  // Optionally open the original post
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
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                    Bài viết của {post.sharedPost.author}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
                    {post.sharedPost.title}
                  </div>
                  <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, marginBottom: 12 }}>
                    {post.sharedPost.description.length > 200 
                      ? post.sharedPost.description.substring(0, 200) + '...' 
                      : post.sharedPost.description}
                  </div>
                  {post.sharedPost.media && post.sharedPost.media.length > 0 && (
                    <div style={{
                      width: "100%",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb"
                    }}>
                      {post.sharedPost.media[0].type === 'image' ? (
                        <img 
                          src={post.sharedPost.media[0].sourceUrl || "/placeholder.svg"} 
                          alt={post.sharedPost.title}
                          style={{
                            width: "100%",
                            maxHeight: 300,
                            objectFit: "cover",
                            display: "block"
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <video 
                          src={post.sharedPost.media[0].sourceUrl}
                          controls
                          style={{
                            width: "100%",
                            maxHeight: 300,
                            objectFit: "cover",
                            display: "block"
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Post Media (only show if not a shared post) */}
              {!post.isShared && post.media && post.media.length > 0 && (
                <div style={{
                  width: "100%",
                  marginBottom: 16,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb"
                }}>
                  {post.media.length === 1 ? (
                    <div>
                      {post.media[0].type === 'image' ? (
                        <img 
                          src={post.media[0].sourceUrl || "/placeholder.svg"} 
                          alt={post.title}
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block"
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <video 
                          src={post.media[0].sourceUrl}
                          controls
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block"
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: post.media.length === 2 ? "1fr 1fr" : "repeat(2, 1fr)",
                      gap: 2
                    }}>
                      {post.media.slice(0, 4).map((item, index) => (
                        <div
                          key={index}
                          style={{
                            position: "relative",
                            aspectRatio: "1",
                            overflow: "hidden",
                            background: "#f3f4f6"
                          }}
                        >
                          {item.type === 'image' ? (
                            <img 
                              src={item.sourceUrl || "/placeholder.svg"} 
                              alt={`${post.title} - ${index + 1}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block"
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
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
                                display: "block"
                              }}
                            />
                          )}
                          {post.media && post.media.length > 4 && index === 3 && (
                            <div style={{
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
                              fontWeight: 700
                            }}>
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
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingTop: 12,
                borderTop: "1px solid #f3f4f6"
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(post.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 6,
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                  <span style={{
                    fontSize: 14,
                    color: post.isLiked ? "#ef4444" : "#6b7280",
                    fontWeight: 500
                  }}>
                    Thích
                  </span>
                </button>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>
                  {post.likes} lượt thích
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPost(post);
                    setShowPostDetailModal(true);
                    // Join post room for real-time comments
                    if (socketService.isConnected()) {
                      socketService.joinRoom(`post:${post.id}`);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 6,
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                  <span style={{
                    fontSize: 14,
                    color: "#6b7280",
                    fontWeight: 500
                  }}>
                    Bình luận
                  </span>
                </button>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>
                  {post.commentCount} bình luận
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSharingPost(post);
                    setShowShareModal(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 6,
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="2"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span style={{
                    fontSize: 14,
                    color: "#6b7280",
                    fontWeight: 500
                  }}>
                    Chia sẻ
                  </span>
                </button>
                {post.shareCount !== undefined && post.shareCount > 0 && (
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>
                    {post.shareCount} lượt chia sẻ
                  </span>
                )}
              </div>

              {/* Comments Section */}
              </div>
            ))
          )}

          {/* Loading indicator khi đang load thêm */}
          {isLoadingMore && (
            <div
              style={{
                height: 60,
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280" }}>
                Đang tải thêm...
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Featured Posts */}
      <aside
        className="sidebar-scroll"
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
      {/* Post Detail Modal */}
      <PostDetailModal
        isOpen={showPostDetailModal}
        post={selectedPost}
        onClose={() => {
          // Leave post room when closing modal
          if (selectedPost && socketService.isConnected()) {
            socketService.leaveRoom(`post:${selectedPost.id}`);
          }
          setShowPostDetailModal(false);
          setSelectedPost(null);
        }}
      />
      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={() => {
          setShowCreateModal(false);
          // Don't reload posts - WebSocket will handle adding the new post
          // This prevents duplicate posts from callback + WebSocket
        }}
      />
      <CreatePostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onPostCreated={() => {
          setEditingPost(null);
          // Don't reload posts - WebSocket will handle updating the post
          // handlePostUpdated will update the post in the list without reloading
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
                isShared: editingPost.isShared,
                sharedPostId: editingPost.sharedPost?.id,
              }
            : null
        }
      />
      {/* Share Post Modal */}
      <SharePostModal
        isOpen={showShareModal}
        postId={sharingPost?.id || ''}
        postTitle={sharingPost?.title || ''}
        postAuthor={sharingPost?.author || 'Người dùng'}
        postContent={sharingPost?.description || ''}
        onClose={() => {
          setShowShareModal(false);
          setSharingPost(null);
        }}
        onShared={() => {
          setShowShareModal(false);
          setSharingPost(null);
          // Reload posts to show the new shared post
          loadPosts(false);
        }}
      />
      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateStoryModal}
        onClose={() => setShowCreateStoryModal(false)}
        onStoryCreated={() => {
          setShowCreateStoryModal(false);
          // Trigger StoryBar reload
          setStoryRefreshTrigger(prev => prev + 1);
        }}
      />
    </div>
  );
}
