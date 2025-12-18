'use client';

import { useState, useEffect, useRef } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { socketService } from '@/services/socket';
import SharePostModal from './SharePostModal';
import PostReportModal from './PostReportModal';

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
    type: 'image' | 'video';
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

interface PostDetailModalProps {
  isOpen: boolean;
  post: DisplayPost | null;
  onClose: () => void;
}

export default function PostDetailModal({ isOpen, post, onClose }: PostDetailModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(true);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const textareaRefs = useState<{ [key: string]: HTMLTextAreaElement | null }>({})[0];
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [replyFiles, setReplyFiles] = useState<{ [key: string]: File | null }>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editTexts, setEditTexts] = useState<{ [key: string]: string }>({});
  const [postLikeCount, setPostLikeCount] = useState(post?.likes || 0);
  const [isPostLiked, setIsPostLiked] = useState(post?.isLiked || false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [totalCommentCount, setTotalCommentCount] = useState(0);

  const countAllComments = (commentsList: Comment[]): number => {
    let count = 0;
    
    const countRecursive = (comments: Comment[]) => {
      comments.forEach(comment => {
        count += 1; // Count the comment itself
        if (comment.replies && comment.replies.length > 0) {
          countRecursive(comment.replies); // Count nested replies
        }
      });
    };
    
    countRecursive(commentsList);
    return count;
  };

  const handleReplyTextChange = (commentId: string, value: string, selectionStart?: number) => {
    setReplyTexts(prev => ({
      ...prev,
      [commentId]: value
    }));
    
    // Khôi phục vị trí con trỏ sau khi render
    if (selectionStart !== undefined) {
      setTimeout(() => {
        const textarea = textareaRefs[commentId];
        if (textarea) {
          textarea.setSelectionRange(selectionStart, selectionStart);
        }
      }, 0);
    }
  };

  const formatTimestamp = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `cách đây ${days} ngày`;
    } else if (hours > 0) {
      return `cách đây ${hours} giờ`;
    } else if (minutes > 0) {
      return `cách đây ${minutes} phút`;
    } else {
      return 'vừa xong';
    }
  };

  // Helper to render media in comments
  const renderCommentMedia = (media?: Array<{ type: 'image' | 'video'; sourceUrl: string; width: number; height: number }>) => {
    if (!media || media.length === 0) return null;

    return (
      <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', maxWidth: '100%' }}>
        {media.length === 1 ? (
          <div>
            {media[0].type === 'image' ? (
              <img
                src={media[0].sourceUrl || "/placeholder.svg"}
                alt="Comment media"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  maxHeight: 300,
                  display: 'block',
                  borderRadius: 6
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <video
                src={media[0].sourceUrl}
                controls
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  maxHeight: 300,
                  display: 'block',
                  borderRadius: 6
                }}
              />
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
            {media.slice(0, 4).map((item, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  overflow: 'hidden',
                  background: '#e5e7eb',
                  borderRadius: 6
                }}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.sourceUrl || "/placeholder.svg"}
                    alt={`Comment media ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
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
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                )}
                {media.length > 4 && index === 3 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: 18,
                      fontWeight: 700
                    }}
                  >
                    +{media.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render reply textarea
  const autoResize = (textarea?: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  };

  const renderReplyInput = (commentId: string) => {
    // Simplified and explicitly balanced JSX for the reply input
    const currentText = replyTexts[commentId] || '';
    const currentFile = replyFiles[commentId] || null;

    const handleSend = async () => {
      const replyText = currentText.trim();
      const file = currentFile;
      if (!replyText && !file) return;
      try {
        await apiService.createComment(commentId, replyText, file || undefined);
        // WebSocket will handle adding the reply in real-time
        setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
        setReplyFiles(prev => ({ ...prev, [commentId]: null }));
        setReplyingToCommentId(null);
      } catch (err) {
        console.error('Error posting reply:', err);
        alert('Không thể gửi trả lời');
      }
    };

    return (
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <textarea
            ref={(el) => { textareaRefs[commentId] = el; }}
            value={currentText}
            onChange={(e) => {
              const cursorPos = e.target.selectionStart;
              handleReplyTextChange(commentId, e.target.value, cursorPos);
              autoResize(e.target);
            }}
            placeholder="Viết trả lời..."
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            style={{
              flex: 1,
              padding: '8px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'none',
              minHeight: 40,
              transition: 'all 0.2s',
              background: '#ffffff',
              color: '#111827',
              overflow: 'hidden'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#6366f1';
              e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <label style={{ cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
              <input
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setReplyFiles(prev => ({ ...prev, [commentId]: f }));
                }}
              />
              {currentFile ? 'Ảnh đính kèm' : 'Thêm ảnh'}
            </label>
            {currentFile && (
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{currentFile.name}</span>
            )}
          </div>
        </div>

        <button
          onClick={handleSend}
          style={{
            padding: '8px 14px',
            background: currentText.trim() ? '#6366f1' : '#d1d5db',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: currentText.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentText.trim()) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(99, 102, 241, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Gửi
        </button>
      </div>
    );
  };

  const COMMENTS_BATCH_SIZE = 5;
  const [visibleCommentCount, setVisibleCommentCount] = useState(COMMENTS_BATCH_SIZE);

  useEffect(() => {
    setVisibleCommentCount(COMMENTS_BATCH_SIZE);
  }, [post?.id]);

  // Recursive component to render nested replies
  const CommentReply = ({ reply, depth = 0 }: { reply: Comment; depth?: number }) => {
    const marginLeft = 52 + depth * 20;
    
    return (
      <div key={reply.commentId} style={{ marginLeft, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: Math.max(0.6, 1 - depth * 0.1)
            }}
          >
            <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>
              {reply.authorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                background: '#f9fafb',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 4,
                border: '1px solid #f0f0f0'
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                {reply.authorName}
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                {reply.content}
              </div>
              {renderCommentMedia((reply as any).media)}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{formatTimestamp(reply.createdAt)}</span>
              <button
                onClick={async () => {
                  try {
                    const currentLikeCount = reply.likeCount || 0;
                    const likedKey = `liked_${reply.commentId}`;
                    const current = (localStorage.getItem(likedKey) === 'true');
                    
                    // Optimistically update UI
                    setComments(prev => 
                      prev.map(c => {
                        const updateReplyLike = (comment: Comment): Comment => {
                          if (comment.commentId === reply.commentId) {
                            return { ...comment, likeCount: current ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1 };
                          }
                          if (comment.replies && comment.replies.length > 0) {
                            return {
                              ...comment,
                              replies: comment.replies.map(r => 
                                r.commentId === reply.commentId 
                                  ? { ...r, likeCount: current ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1 }
                                  : r
                              )
                            };
                          }
                          return comment;
                        };
                        return updateReplyLike(c);
                      })
                    );
                    
                    if (!current) {
                      await apiService.likeComment(reply.commentId);
                      localStorage.setItem(likedKey, 'true');
                      // WebSocket will handle real-time update
                    } else {
                      await apiService.unlikeComment(reply.commentId);
                      localStorage.setItem(likedKey, 'false');
                      // WebSocket will handle real-time update
                    }
                  } catch (err) {
                    console.error('Error toggling like on reply:', err);
                    // Revert optimistic update on error
                    setComments(prev => 
                      prev.map(c => updateCommentLike(c, reply.commentId, reply.likeCount || 0))
                    );
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6366f1',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 11
                }}
              >
                {reply.likeCount} lượt thích
              </button>
              <button
                onClick={() => {
                  setReplyingToCommentId(replyingToCommentId === reply.commentId ? null : reply.commentId);
                  if (replyingToCommentId !== reply.commentId) {
                    setReplyTexts(prev => ({ ...prev, [reply.commentId]: '' }));
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6366f1',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 11
                }}
              >
                Trả lời
              </button>
              {user?.id === reply.authorId && (
                <>
                  <button
                    onClick={() => {
                      setEditingCommentId(editingCommentId === reply.commentId ? null : reply.commentId);
                      if (editingCommentId !== reply.commentId) {
                        setEditTexts(prev => ({ ...prev, [reply.commentId]: reply.content }));
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#f97316',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 11
                    }}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => handleDeleteComment(reply.commentId)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 11
                    }}
                  >
                    Xóa
                  </button>
                </>
              )}
            </div>
            {editingCommentId === reply.commentId && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={editTexts[reply.commentId] || ''}
                  onChange={(e) => setEditTexts(prev => ({ ...prev, [reply.commentId]: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '2px solid #e5e7eb',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'none',
                    minHeight: 80,
                    maxHeight: 200,
                    background: '#ffffff',
                    color: '#111827',
                    lineHeight: 1.5,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Chỉnh sửa bình luận..."
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleUpdateComment(reply.commentId, editTexts[reply.commentId] || '')}
                    style={{
                      background: '#6366f1',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditTexts(prev => {
                        const updated = { ...prev };
                        delete updated[reply.commentId];
                        return updated;
                      });
                    }}
                    style={{
                      background: '#e5e7eb',
                      color: '#6b7280',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
            {replyingToCommentId === reply.commentId && renderReplyInput(reply.commentId)}
          </div>
        </div>
        {/* Render nested replies recursively */}
        {reply.replies && reply.replies.length > 0 && (
          <div>
            {reply.replies.map((nestedReply) => (
              <CommentReply key={nestedReply.commentId} reply={nestedReply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper to update like count recursively
  const updateCommentLike = (comment: Comment, targetId: string, newLikeCount: number): Comment => {
    if (comment.commentId === targetId) {
      return { ...comment, likeCount: newLikeCount };
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: comment.replies.map(r => updateCommentLike(r, targetId, newLikeCount))
      };
    }
    return comment;
  };

  // Helper to add reply recursively - tìm đúng vị trí và thêm reply
  const addReplyToComment = (comment: Comment, targetId: string, newReply: Comment): Comment => {
    // Nếu tìm thấy comment match với targetId
    if (comment.commentId === targetId) {
      return {
        ...comment,
        replies: [...(comment.replies || []), newReply]
      };
    }
    // Nếu không, tìm trong nested replies
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: comment.replies.map(r => addReplyToComment(r, targetId, newReply))
      };
    }
    return comment;
  };

  // Helper to remove comment recursively
  const removeCommentRecursively = (comment: Comment, targetId: string): Comment | null => {
    if (comment.commentId === targetId) {
      return null;
    }
    if (comment.replies && comment.replies.length > 0) {
      const updatedReplies = comment.replies
        .map(r => removeCommentRecursively(r, targetId))
        .filter((r): r is Comment => r !== null);
      return {
        ...comment,
        replies: updatedReplies.length > 0 ? updatedReplies : undefined
      };
    }
    return comment;
  };

  // Helper to update comment recursively
  const updateCommentRecursively = (comment: Comment, targetId: string, newContent: string): Comment => {
    if (comment.commentId === targetId) {
      return {
        ...comment,
        content: newContent
      };
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: comment.replies.map(r => updateCommentRecursively(r, targetId, newContent))
      };
    }
    return comment;
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa bình luận này?')) return;
    
    try {
      await apiService.deleteComment(commentId);
      // WebSocket will handle deleting the comment in real-time
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Không thể xóa bình luận');
    }
  };

  const handleUpdateComment = async (commentId: string, newContent: string) => {
    if (!newContent.trim()) {
      alert('Nội dung không được để trống');
      return;
    }

    try {
      await apiService.updateComment(commentId, newContent.trim());
      // WebSocket will handle updating the comment in real-time
      setEditingCommentId(null);
      setEditTexts(prev => {
        const updated = { ...prev };
        delete updated[commentId];
        return updated;
      });
    } catch (err) {
      console.error('Error updating comment:', err);
      alert('Không thể cập nhật bình luận');
    }
  };

  const handleLikePost = async () => {
    if (!post) return;
    
    const currentlyLiked = isPostLiked;
    
    // Optimistically update UI
    setPostLikeCount(prev => currentlyLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsPostLiked(!currentlyLiked);
    
    try {
      if (!currentlyLiked) {
        await apiService.likePost(post.id);
        // WebSocket will handle real-time update
      } else {
        await apiService.unlikePost(post.id);
        // WebSocket will handle real-time update
      }
    } catch (err) {
      console.error('Error toggling like on post:', err);
      // Revert optimistic update on error
      setPostLikeCount(prev => currentlyLiked ? prev + 1 : Math.max(0, prev - 1));
      setIsPostLiked(currentlyLiked);
      alert('Không thể thao tác với bài viết');
    }
  };

  useEffect(() => {
    if (isOpen && post) {
      loadComments();
      // Reset like state when post changes
      setPostLikeCount(post.likes);
      setIsPostLiked(!!post.isLiked);
    }
  }, [isOpen, post?.id, post?.isLiked, post?.likes]);

  // WebSocket connection and listeners for real-time updates
  useEffect(() => {
    if (!isOpen || !post || !user) return;

    // Connect WebSocket if not connected
    if (!socketService.isConnected() && typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        const socket = socketService.connect(token);
        // Wait for connection before joining room
        if (socket && !socket.connected) {
          socket.once('connect', () => {
            console.log('✅ Socket connected, joining post room:', post.id);
            socketService.joinRoom(`post:${post.id}`);
          });
        } else if (socket?.connected) {
          // Already connected, join room immediately
          console.log('✅ Socket already connected, joining room:', post.id);
          socketService.joinRoom(`post:${post.id}`);
        }
      }
    } else if (socketService.isConnected()) {
      // Already connected, join room immediately
      console.log('✅ Socket connected, joining room:', post.id);
      socketService.joinRoom(`post:${post.id}`);
    }

    // Also listen for connection events to join room
    const socket = socketService.getSocket();
    if (socket && !socket.connected) {
      socket.once('connect', () => {
        console.log('✅ Socket connected via listener, joining room:', post.id);
        socketService.joinRoom(`post:${post.id}`);
      });
    }

    // Listen for post liked
    const handlePostLiked = (data: { postId: string; likeCount: number; userId: string }) => {
      console.log('🔔 Post liked event received:', data);
      if (data.postId === post.id) {
        setPostLikeCount(data.likeCount);
        if (user.id === data.userId) {
          setIsPostLiked(true);
        }
      }
    };

    // Listen for post unliked
    const handlePostUnliked = (data: { postId: string; likeCount: number; userId: string }) => {
      console.log('🔔 Post unliked event received:', data);
      if (data.postId === post.id) {
        setPostLikeCount(data.likeCount);
        if (user.id === data.userId) {
          setIsPostLiked(false);
        }
      }
    };

    // Listen for comment added (new comment or reply)
    const handleCommentAdded = (data: { postId: string; comment: any }) => {
      console.log('🔔 Comment added event received:', data);
      if (data.postId === post.id) {
        const formattedComment: Comment = {
          commentId: data.comment.commentId || data.comment.id,
          targetId: data.comment.targetId,
          authorId: data.comment.authorId,
          authorName: data.comment.authorName,
          authorAvatar: data.comment.authorAvatar,
          content: data.comment.content,
          createdAt: data.comment.createdAt?.toDate ? data.comment.createdAt.toDate() : new Date(data.comment.createdAt),
          updatedAt: data.comment.updatedAt?.toDate ? data.comment.updatedAt.toDate() : new Date(data.comment.updatedAt),
          likeCount: data.comment.likeCount || 0,
          isDeleted: data.comment.isDeleted || false,
          replies: data.comment.replies || []
        };

        // Check if comment already exists (prevent duplicates)
        setComments(prev => {
          const exists = prev.some(c => 
            c.commentId === formattedComment.commentId ||
            (c.commentId === formattedComment.commentId && c.content === formattedComment.content)
          );
          if (exists) {
            console.log('⚠️ Comment already exists, skipping:', formattedComment.commentId);
            return prev;
          }

          // If it's a reply (targetId is a commentId, not postId), add to replies
          if (formattedComment.targetId !== post.id) {
            console.log('📝 Adding reply to comment:', formattedComment.targetId);
            return prev.map(comment => {
              // Check if this comment or any nested reply matches targetId
              const addReplyRecursively = (c: Comment): Comment => {
                if (c.commentId === formattedComment.targetId) {
                  // Check if reply already exists
                  const replyExists = (c.replies || []).some(r => r.commentId === formattedComment.commentId);
                  if (replyExists) {
                    console.log('⚠️ Reply already exists, skipping:', formattedComment.commentId);
                    return c;
                  }
                  return {
                    ...c,
                    replies: [...(c.replies || []), formattedComment]
                  };
                }
                if (c.replies && c.replies.length > 0) {
                  return {
                    ...c,
                    replies: c.replies.map(addReplyRecursively)
                  };
                }
                return c;
              };
              return addReplyRecursively(comment);
            });
          }

          // New top-level comment
          console.log('✅ Adding new top-level comment:', formattedComment.commentId);
          return [formattedComment, ...prev];
        });

        setTotalCommentCount(prev => prev + 1);
      }
    };

    // Listen for comment updated
    const handleCommentUpdated = (data: { postId: string; commentId: string; comment: any }) => {
      console.log('🔔 Comment updated event received:', data);
      if (data.postId === post.id) {
        const updateCommentRecursively = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.commentId === data.commentId) {
              return {
                ...comment,
                content: data.comment.content || comment.content,
                updatedAt: data.comment.updatedAt?.toDate ? data.comment.updatedAt.toDate() : new Date(data.comment.updatedAt || comment.updatedAt),
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentRecursively(comment.replies)
              };
            }
            return comment;
          });
        };

        setComments(prev => updateCommentRecursively(prev));
      }
    };

    // Listen for comment deleted
    const handleCommentDeleted = (data: { postId: string; commentId: string }) => {
      console.log('🔔 Comment deleted event received:', data);
      if (data.postId === post.id) {
        const deleteCommentRecursively = (comments: Comment[]): Comment[] => {
          return comments
            .filter(comment => comment.commentId !== data.commentId)
            .map(comment => {
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: deleteCommentRecursively(comment.replies)
                };
              }
              return comment;
            });
        };

        setComments(prev => deleteCommentRecursively(prev));
        setTotalCommentCount(prev => Math.max(0, prev - 1));
      }
    };

    // Listen for comment liked
    const handleCommentLiked = (data: { postId: string; commentId: string; likeCount: number; userId: string }) => {
      console.log('🔔 Comment liked event received:', data);
      if (data.postId === post.id) {
        const updateCommentLikeRecursively = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.commentId === data.commentId) {
              return {
                ...comment,
                likeCount: data.likeCount,
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentLikeRecursively(comment.replies)
              };
            }
            return comment;
          });
        };

        setComments(prev => updateCommentLikeRecursively(prev));
      }
    };

    // Listen for comment unliked
    const handleCommentUnliked = (data: { postId: string; commentId: string; likeCount: number; userId: string }) => {
      console.log('🔔 Comment unliked event received:', data);
      if (data.postId === post.id) {
        const updateCommentLikeRecursively = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.commentId === data.commentId) {
              return {
                ...comment,
                likeCount: data.likeCount,
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentLikeRecursively(comment.replies)
              };
            }
            return comment;
          });
        };

        setComments(prev => updateCommentLikeRecursively(prev));
      }
    };

    // Register listeners
    socketService.on('post_liked', handlePostLiked);
    socketService.on('post_unliked', handlePostUnliked);
    socketService.on('comment_added', handleCommentAdded);
    socketService.on('comment_updated', handleCommentUpdated);
    socketService.on('comment_deleted', handleCommentDeleted);
    socketService.on('comment_liked', handleCommentLiked);
    socketService.on('comment_unliked', handleCommentUnliked);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up WebSocket listeners for post:', post.id);
      socketService.leaveRoom(`post:${post.id}`);
      socketService.off('post_liked', handlePostLiked);
      socketService.off('post_unliked', handlePostUnliked);
      socketService.off('comment_added', handleCommentAdded);
      socketService.off('comment_updated', handleCommentUpdated);
      socketService.off('comment_deleted', handleCommentDeleted);
      socketService.off('comment_liked', handleCommentLiked);
      socketService.off('comment_unliked', handleCommentUnliked);
    };
  }, [isOpen, post?.id, user?.id]);

  const loadComments = async () => {
    if (!post) return;
    
    setIsLoadingComments(true);
    try {
      const commentsData = await apiService.getCommentsByPost(post.id, 200);
      
      const formattedComments: Comment[] = commentsData.map((comment: any) => ({
        commentId: comment.commentId,
        targetId: comment.targetId,
        authorId: comment.authorId,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        content: comment.content,
        createdAt: comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt),
        updatedAt: comment.updatedAt?.toDate ? comment.updatedAt.toDate() : new Date(comment.updatedAt),
        likeCount: comment.likeCount || 0,
        isDeleted: comment.isDeleted || false,
        replies: comment.replies || []
      }));
      
      setComments(formattedComments);
      const total = countAllComments(formattedComments);
      setTotalCommentCount(total);
      setVisibleCommentCount(Math.min(COMMENTS_BATCH_SIZE, formattedComments.length));
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if ((!text && !commentFile) || !user || !post) return;

    try {
      await apiService.createComment(post.id, text, commentFile || undefined);
      // WebSocket will handle adding the comment in real-time
      setCommentText('');
      setCommentFile(null);
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      alert('Không thể gửi bình luận');
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-content {
          animation: slideUp 0.3s ease-out;
        }
        .modal-scroll-area {
          scrollbar-width: thin;
          scrollbar-color: rgba(99, 102, 241, 0.4) transparent;
        }
        .modal-scroll-area::-webkit-scrollbar {
          width: 6px;
        }
        .modal-scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .modal-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.35);
          border-radius: 999px;
        }
        .modal-scroll-area::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.55);
        }
      `}</style>

      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '90%',
          maxWidth: 800,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff'
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Chi tiết bài viết
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#6b7280',
              padding: 0,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          className="modal-scroll-area"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          {/* Post Info */}
          <div>
            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: 16, color: '#fff', fontWeight: 600 }}>
                  {post.author.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  {post.author}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {post.timestamp}
                </div>
              </div>
            </div>

            {/* Caption */}
            <p style={{
              fontSize: 15,
              color: '#374151',
              lineHeight: 1.6,
              marginBottom: 16,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {post.description}
            </p>

            {/* Media */}
            {post.media && post.media.length > 0 && (
              <div
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 16,
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb'
                }}
              >
                {post.media.length === 1 ? (
                  <div>
                    {post.media[0].type === 'image' ? (
                      <img
                        src={post.media[0].sourceUrl || '/placeholder.svg'}
                        alt={post.title}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          maxHeight: 500
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
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          maxHeight: 500
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 4
                    }}
                  >
                    {post.media.slice(0, 4).map((item, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          overflow: 'hidden',
                          background: '#e5e7eb'
                        }}
                      >
                        {item.type === 'image' ? (
                          <img
                            src={item.sourceUrl || '/placeholder.svg'}
                            alt={`${post.title} - ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
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
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                        )}
                        {post.media && post.media.length > 4 && index === 3 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'rgba(0, 0, 0, 0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: 24,
                              fontWeight: 700
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

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                paddingTop: 16,
                borderTop: '1px solid #e5e7eb',
                color: '#6b7280',
                fontSize: 14
              }}
            >
              <button
                onClick={handleLikePost}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'transparent',
                  border: 'none',
                  color: isPostLiked ? '#ef4444' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 0
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={isPostLiked ? '#ef4444' : 'none'} stroke={isPostLiked ? '#ef4444' : 'currentColor'} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{postLikeCount} lượt thích</span>
              </button>
              <button
                onClick={() => {
                  if (post) {
                    setShowReportModal(true);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 0
                }}
                title="Báo cáo bài viết"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>Báo cáo</span>
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 0
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>Chia sẻ</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{totalCommentCount} bình luận</span>
              </div>
            </div>

            <SharePostModal
              isOpen={showShareModal}
              postId={post?.id || ''}
              postTitle={post?.title || ''}
              postAuthor={post?.author || 'Người dùng'}
              postContent={post?.description || ''}
              onClose={() => setShowShareModal(false)}
              onShared={() => {
                setShowShareModal(false);
                // Optionally reload posts or show success message
              }}
            />

            {post && (
              <PostReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                postId={post.id}
                postContent={post.description}
                postMedia={post.media}
              />
            )}

          </div>

          {/* Comments Section */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16, marginTop: 0 }}>
              Bình luận ({totalCommentCount})
            </h3>

            {isLoadingComments ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                Đang tải bình luận...
              </div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 14 }}>
                Chưa có bình luận nào
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                {comments.slice(0, visibleCommentCount).map((comment) => (
                  <div key={comment.commentId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Main Comment */}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                          {comment.authorName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            background: '#f3f4f6',
                            borderRadius: 12,
                            padding: '12px 14px',
                            marginBottom: 6
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                            {comment.authorName}
                          </div>
                          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                            {comment.content}
                          </div>
                          {renderCommentMedia((comment as any).media)}
                        </div>
                        <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span>{formatTimestamp(comment.createdAt)}</span>
                          <button
                            onClick={async () => {
                              try {
                                const currentLikeCount = comment.likeCount || 0;
                                const likedKey = `liked_${comment.commentId}`;
                                const current = (localStorage.getItem(likedKey) === 'true');
                                
                                // Optimistically update UI
                                setComments(prev => prev.map(c => 
                                  c.commentId === comment.commentId 
                                    ? { ...c, likeCount: current ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1 } 
                                    : c
                                ));
                                
                                if (!current) {
                                  await apiService.likeComment(comment.commentId);
                                  localStorage.setItem(likedKey, 'true');
                                  // WebSocket will handle real-time update
                                } else {
                                  await apiService.unlikeComment(comment.commentId);
                                  localStorage.setItem(likedKey, 'false');
                                  // WebSocket will handle real-time update
                                }
                              } catch (err) {
                                console.error('Error toggling like on comment:', err);
                                // Revert optimistic update on error
                                setComments(prev => prev.map(c => 
                                  c.commentId === comment.commentId 
                                    ? { ...c, likeCount: comment.likeCount || 0 } 
                                    : c
                                ));
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#6366f1',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 12
                            }}
                          >
                            {comment.likeCount} lượt thích
                          </button>
                          <button
                            onClick={() => {
                              setReplyingToCommentId(replyingToCommentId === comment.commentId ? null : comment.commentId);
                              if (replyingToCommentId !== comment.commentId) {
                                setReplyTexts(prev => ({ ...prev, [comment.commentId]: '' }));
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#6366f1',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 12
                            }}
                          >
                            Trả lời
                          </button>
                          {user?.id === comment.authorId && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCommentId(editingCommentId === comment.commentId ? null : comment.commentId);
                                  if (editingCommentId !== comment.commentId) {
                                    setEditTexts(prev => ({ ...prev, [comment.commentId]: comment.content }));
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#f97316',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: 12
                                }}
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.commentId)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: 12
                                }}
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                        {editingCommentId === comment.commentId && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <textarea
                              value={editTexts[comment.commentId] || ''}
                              onChange={(e) => setEditTexts(prev => ({ ...prev, [comment.commentId]: e.target.value }))}
                              style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: 12,
                                border: '2px solid #e5e7eb',
                                fontSize: 14,
                                fontFamily: 'inherit',
                                resize: 'none',
                                minHeight: 80,
                                maxHeight: 200,
                                background: '#ffffff',
                                color: '#111827',
                                lineHeight: 1.5,
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                outline: 'none'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#6366f1';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                              placeholder="Chỉnh sửa bình luận..."
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => handleUpdateComment(comment.commentId, editTexts[comment.commentId] || '')}
                                style={{
                                  background: '#6366f1',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '6px 12px',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditTexts(prev => {
                                    const updated = { ...prev };
                                    delete updated[comment.commentId];
                                    return updated;
                                  });
                                }}
                                style={{
                                  background: '#e5e7eb',
                                  color: '#6b7280',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '6px 12px',
                                  fontSize: 11,
                                  cursor: 'pointer'
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}
                        {replyingToCommentId === comment.commentId && renderReplyInput(comment.commentId)}
                      </div>
                    </div>

                    {/* Nested Replies - Recursive */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div>
                        {comment.replies.map((reply) => (
                          <CommentReply key={reply.commentId} reply={reply} depth={0} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {visibleCommentCount < comments.length && (
                  <button
                    onClick={() =>
                      setVisibleCommentCount(prev =>
                        Math.min(prev + COMMENTS_BATCH_SIZE, comments.length)
                      )
                    }
                    style={{
                      alignSelf: 'center',
                      padding: '8px 16px',
                      borderRadius: 999,
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#6366f1',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Xem thêm bình luận
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div
          style={{
            padding: '20px 24px',
            borderTop: '1px solid #e5e7eb',
            background: '#fafafa'
          }}
        >
          {user ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Viết bình luận..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none',
                    minHeight: 50,
                    transition: 'all 0.2s',
                    background: '#ffffff',
                    color: '#111827',
                    overflow: 'hidden'
                  }}
                  onInput={(e) => autoResize(e.currentTarget)}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim()}
                    style={{
                      padding: '8px 20px',
                      background: commentText.trim()
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : '#d1d5db',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: commentText.trim() ? 1 : 0.6
                    }}
                    onMouseEnter={(e) => {
                      if (commentText.trim()) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(99, 102, 241, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
              Vui lòng đăng nhập để bình luận
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
