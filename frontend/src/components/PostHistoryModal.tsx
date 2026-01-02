"use client";

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

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
  likeCount: number;
  viewCount: number;
  commentCount: number;
  isLiked?: boolean;
}

interface PostHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'viewed' | 'liked';
}

export default function PostHistoryModal({ isOpen, onClose, type }: PostHistoryModalProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPosts();
    }
  }, [isOpen, type]);

  const loadPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = type === 'viewed' 
        ? await apiService.getViewedPosts(50)
        : await apiService.getLikedPosts(50);
      
      if (response.success && response.data) {
        setPosts(response.data);
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách bài viết");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return "vừa xong";
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            {type === 'viewed' ? '📖 Bài viết đã xem' : '❤️ Bài viết đã thích'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Đang tải...
            </div>
          )}

          {error && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#ef4444',
              background: '#fef2f2',
              borderRadius: '8px',
            }}>
              {error}
            </div>
          )}

          {!isLoading && !error && posts.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#6b7280',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{ fontSize: '48px' }}>
                {type === 'viewed' ? '👀' : '💔'}
              </div>
              <div>
                {type === 'viewed' 
                  ? 'Chưa có bài viết nào được xem' 
                  : 'Chưa có bài viết nào được thích'}
              </div>
            </div>
          )}

          {!isLoading && !error && posts.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {posts.map((post) => (
                <div
                  key={post.postId}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  {/* Author info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {post.authorAvatar ? (
                        <img 
                          src={post.authorAvatar} 
                          alt={post.authorName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '18px', color: '#6b7280' }}>
                          {post.authorName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>
                        {post.authorName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {formatTimestamp(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Caption */}
                  <div style={{
                    fontSize: '14px',
                    color: '#1f2937',
                    marginBottom: '12px',
                    lineHeight: '1.5',
                  }}>
                    {post.caption.length > 150 
                      ? post.caption.substring(0, 150) + '...' 
                      : post.caption}
                  </div>

                  {/* Media preview */}
                  {post.media && post.media.length > 0 && (
                    <div style={{
                      width: '100%',
                      height: '200px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      background: '#f3f4f6',
                    }}>
                      {post.media[0].type === 'image' ? (
                        <img 
                          src={post.media[0].sourceUrl}
                          alt="Post media"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <video
                          src={post.media[0].sourceUrl}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '13px',
                    color: '#6b7280',
                  }}>
                    <span>❤️ {post.likeCount}</span>
                    <span>💬 {post.commentCount}</span>
                    <span>👁️ {post.viewCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
