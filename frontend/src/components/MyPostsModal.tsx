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
  likes: number;
  isLiked: boolean;
}

interface MyPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyPostsModal({ isOpen, onClose }: MyPostsModalProps) {
  const { user } = useAuth();
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      likes: post.likeCount || 0,
      isLiked: false
    };
  };

  useEffect(() => {
    const loadMyPosts = async () => {
      if (!isOpen || !user) {
        setMyPosts([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await apiService.getMyPosts(50);
        if (response.success && response.data) {
          const displayPosts = response.data.map(convertToDisplayPost);
          setMyPosts(displayPosts);
        } else {
          setMyPosts([]);
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải bài đăng');
        setMyPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMyPosts();
  }, [isOpen, user]);

  const handleLike = (postId: string) => {
    setMyPosts(myPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
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
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: '90%',
          maxWidth: 800,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#111827'
          }}>
            Bài đăng của tôi
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

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {isLoading ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: 16 }}>Đang tải bài đăng...</div>
            </div>
          ) : error ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#ef4444'
            }}>
              <div style={{ fontSize: 16 }}>{error}</div>
            </div>
          ) : myPosts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
                style={{ margin: '0 auto 16px' }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p style={{ fontSize: 16, margin: 0 }}>
                Bạn chưa có bài đăng nào
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {myPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {/* Post Header */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12
                    }}>
                      <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                        {post.author.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                        {post.author}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        {post.email}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {post.timestamp}
                    </div>
                  </div>

                  {/* Post Title */}
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#111827'
                  }}>
                    {post.title}
                  </h3>

                  {/* Post Description */}
                  <p style={{
                    margin: '0 0 16px 0',
                    fontSize: 14,
                    color: '#374151',
                    lineHeight: 1.6
                  }}>
                    {post.description}
                  </p>

                  {/* Post Image Placeholder */}
                  {post.image && (
                    <div style={{
                      width: '100%',
                      height: 300,
                      background: '#f3f4f6',
                      borderRadius: 8,
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{ color: '#9ca3af', fontSize: 14 }}>Post Image</span>
                    </div>
                  )}

                  {/* Post Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    paddingTop: 12,
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    <button
                      onClick={() => handleLike(post.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: 6,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={post.isLiked ? '#ef4444' : 'none'}
                        stroke={post.isLiked ? '#ef4444' : '#6b7280'}
                        strokeWidth="2"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span style={{
                        fontSize: 14,
                        color: post.isLiked ? '#ef4444' : '#6b7280',
                        fontWeight: 500
                      }}>
                        Thích
                      </span>
                    </button>
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>
                      {post.likes} lượt thích
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

