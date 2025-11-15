'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/api';
import { X } from 'lucide-react';

interface FirebasePost {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  caption: string;
  media: Array<{
    type: 'image' | 'video';
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
  visibility: 'public' | 'friends' | 'private';
  isDeleted: boolean;
}

interface Post {
  id: string;
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

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrashModal({ isOpen, onClose }: TrashModalProps) {
  const { user } = useAuth();
  const [deletedPosts, setDeletedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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

  const convertToDisplayPost = (post: FirebasePost): Post => {
    const createdAt = typeof post.createdAt === 'string' 
      ? new Date(post.createdAt) 
      : post.createdAt instanceof Date 
        ? post.createdAt 
        : new Date();

    return {
      id: post.postId,
      author: post.authorName || user?.name || 'Người dùng',
      email: user?.email || '',
      timestamp: formatTimestamp(createdAt),
      title: post.caption.split('\n')[0] || post.caption.substring(0, 50) || 'Không có tiêu đề',
      description: post.caption,
      image: post.media && post.media.length > 0 ? post.media[0].sourceUrl : undefined,
      media: post.media || [],
      likes: post.likeCount || 0,
      isLiked: false
    };
  };

  useEffect(() => {
    const loadDeletedPosts = async () => {
      if (!isOpen || !user) {
        setDeletedPosts([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await apiService.getDeletedPosts();
        if (response.success && response.data) {
          const posts = response.data.map(convertToDisplayPost);
          setDeletedPosts(posts);
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải bài viết đã xóa');
        setDeletedPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDeletedPosts();
  }, [isOpen, user]);

  const handleRestore = async (postId: string) => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục bài viết này?')) {
      return;
    }

    setRestoringId(postId);
    try {
      await apiService.restorePost(postId);
      setDeletedPosts(deletedPosts.filter(post => post.id !== postId));
    } catch (err: any) {
      alert(err.message || 'Không thể khôi phục bài viết');
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Thùng rác
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={24} color="#6b7280" />
          </button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20
        }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
              <div style={{ fontSize: 16 }}>Đang tải...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ef4444' }}>
              <div style={{ fontSize: 16 }}>{error}</div>
            </div>
          ) : deletedPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ margin: '0 auto 16px' }}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <div style={{ fontSize: 16 }}>Thùng rác trống</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {deletedPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    {post.image && (
                      <img
                        src={post.image}
                        alt={post.title}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {post.title}
                      </h3>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: 14,
                        color: '#6b7280',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {post.description}
                      </p>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        {post.timestamp}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(post.id)}
                    disabled={restoringId === post.id}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: restoringId === post.id ? '#d1d5db' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: restoringId === post.id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: restoringId === post.id ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (restoringId !== post.id) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(99, 102, 241, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {restoringId === post.id ? 'Đang khôi phục...' : 'Khôi phục'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

