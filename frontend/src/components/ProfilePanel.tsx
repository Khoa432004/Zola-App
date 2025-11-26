'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { fetchProfileAsync } from '@/store/slices/authSlice';
import { apiService } from '@/services/api';
import { MapPin, Calendar, MoreHorizontal } from 'lucide-react';
import UserProfileModal from './UserProfileModal';

// Interfaces
interface Post {
  id: string;
  author: string;
  email: string;
  timestamp: string;
  title: string;
  description: string;
  media?: Array<{
    type: 'image' | 'video';
    sourceUrl: string;
    width: number;
    height: number;
  }>;
  likes: number;
  commentCount: number;
  isLiked: boolean;
  createdAt?: string | Date;
  // Shared post fields
  isShared?: boolean;
  sharedPostId?: string;
  sharedPost?: {
    id: string;
    author: string;
    title: string;
    description: string;
    media?: Array<{
      type: 'image' | 'video';
      sourceUrl: string;
      width: number;
      height: number;
    }>;
  };
  shareCount?: number;
}

interface MediaItem {
  postId: string;
  type: 'image' | 'video';
  sourceUrl: string;
  width: number;
  height: number;
  createdAt: string | Date;
}

export default function ProfilePanel() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'posts' | 'featured' | 'media'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const hasLoadedRef = useRef(false);

  // Format createdAt date to MM/YYYY
  const formatJoinDate = (createdAt?: string | Date) => {
    if (!createdAt) return 'Unknown';
    const date = new Date(createdAt);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${year}`;
  };

  useEffect(() => {
    const loadProfileData = async () => {
      // Chỉ load một lần khi component mount và có user
      if (!user || hasLoadedRef.current) return;
      
      setIsLoading(true);
      try {
        // Fetch fresh profile data to get createdAt
        await dispatch(fetchProfileAsync());

        // Load posts and friends in parallel for better performance
        const [postsResponse, friendsResponse] = await Promise.all([
          apiService.getMyPosts(50),
          apiService.getFriends()
        ]);

        // Process posts
        if (postsResponse.success && postsResponse.data) {
            const displayPosts = postsResponse.data.map((post: any) => {
                const displayPost: Post = {
                    id: post.postId,
                    author: post.authorName || user.name || 'User',
                    email: user.email || '',
                    timestamp: new Date(post.createdAt).toLocaleDateString('vi-VN'),
                    title: post.caption?.split('\n')[0] || '',
                    description: post.caption || '',
                    media: post.media || [],
                    likes: post.likeCount || 0,
                    commentCount: post.commentCount || 0,
                    isLiked: false,
                    createdAt: post.createdAt,
                    shareCount: post.shareCount || 0,
                };

                // If this is a shared post, populate shared post data
                if (post.isShared && post.sharedPost) {
                    displayPost.isShared = true;
                    displayPost.sharedPostId = post.sharedPostId;
                    displayPost.sharedPost = {
                        id: post.sharedPost.postId,
                        author: post.sharedPost.authorName || 'Người dùng',
                        title: post.sharedPost.caption?.split('\n')[0] || post.sharedPost.caption?.substring(0, 50) || 'Không có tiêu đề',
                        description: post.sharedPost.caption || '',
                        media: post.sharedPost.media || [],
                    };
                }

                return displayPost;
            });
            setPosts(displayPosts);
            setPostsCount(displayPosts.length);

            // Extract all media items from posts for media tab
            const allMedia: MediaItem[] = [];
            postsResponse.data.forEach((post: any) => {
                if (post.media && Array.isArray(post.media)) {
                    post.media.forEach((mediaItem: any) => {
                        allMedia.push({
                            postId: post.postId,
                            type: mediaItem.type,
                            sourceUrl: mediaItem.sourceUrl,
                            width: mediaItem.width,
                            height: mediaItem.height,
                            createdAt: post.createdAt
                        });
                    });
                }
            });
            // Sort by createdAt descending (newest first)
            allMedia.sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });
            setMediaItems(allMedia);
        } else {
            setPosts([]);
            setPostsCount(0);
            setMediaItems([]);
        }

        // Process friends count
        if (friendsResponse.success && friendsResponse.data) {
            setFriendsCount(friendsResponse.data.length);
        } else {
            setFriendsCount(0);
        }
        
        // Mark as loaded
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load profile data', error);
        setPosts([]);
        setPostsCount(0);
        setFriendsCount(0);
        setMediaItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  return (
    <>
      <style jsx global>{`
        .profile-container {
          height: 100%;
          overflow: hidden;
          background: #ffffff;
          color: #111827;
          width: 100%;
        }

        .profile-main-content {
          height: 100%;
          overflow-y: auto;
          width: 100%;
        }

        .profile-cover-image {
          height: 250px;
          background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%);
          position: relative;
        }

        .profile-header {
          padding: 0 32px;
          position: relative;
          background: #ffffff;
        }

        .profile-avatar-container {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          border: 5px solid #ffffff;
          overflow: hidden;
          position: absolute;
          top: -75px;
          background-color: #f3f4f6;
        }

        .profile-action-buttons {
          display: flex;
          justify-content: flex-end;
          padding-top: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .profile-user-name {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          color: #111827;
        }

        .profile-user-info-section {
          margin-top: 24px;
        }

        .profile-user-details {
          display: flex;
          gap: 20px;
          margin-top: 16px;
          color: #6b7280;
          font-size: 16px;
          flex-wrap: wrap;
        }

        .profile-stats-section {
          display: flex;
          gap: 24px;
          margin-top: 16px;
          font-size: 17px;
        }

        .profile-tabs-container {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          .profile-cover-image {
            height: 180px;
          }

          .profile-header {
            padding: 0 20px;
          }

          .profile-avatar-container {
            width: 120px;
            height: 120px;
            top: -60px;
            border-width: 4px;
          }

          .profile-action-buttons {
            padding-top: 70px;
            justify-content: flex-start;
          }

          .profile-user-name {
            font-size: 22px;
          }

          .profile-user-info-section {
            margin-top: 18px;
          }

          .profile-user-details {
            font-size: 15px;
            gap: 14px;
          }

          .profile-stats-section {
            font-size: 15px;
            gap: 18px;
          }

          .profile-tabs-container {
            margin-top: 18px;
          }
        }

        @media (max-width: 480px) {
          .profile-cover-image {
            height: 150px;
          }

          .profile-header {
            padding: 0 16px;
          }

          .profile-avatar-container {
            width: 100px;
            height: 100px;
            top: -50px;
            border-width: 3px;
          }

          .profile-action-buttons {
            padding-top: 60px;
            gap: 10px;
          }

          .profile-user-name {
            font-size: 20px;
          }

          .profile-user-details {
            font-size: 14px;
            gap: 10px;
          }

          .profile-stats-section {
            font-size: 14px;
            gap: 14px;
          }
        }
      `}</style>

      <div className="profile-container">
        {/* Main Content */}
        <div className="profile-main-content">
          
          {/* Cover Image */}
          <div className="profile-cover-image">
            {/* Back button if needed */}
          </div>

          {/* Profile Header */}
          <div className="profile-header">
              {/* Avatar */}
              <div className="profile-avatar-container">
                  <img 
                      src={user.avatar || 'https://via.placeholder.com/150'} 
                      alt={user.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
              </div>
              
              {/* Action Buttons */}
              <div className="profile-action-buttons">
                  <button style={{
                      background: 'transparent',
                      border: '1px solid #d1d5db',
                      borderRadius: '999px',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#374151',
                      cursor: 'pointer',
                      flexShrink: 0
                  }}>
                      <MoreHorizontal size={22} />
                  </button>
                  <button 
                      onClick={() => setShowProfileModal(true)}
                      style={{
                          background: 'transparent',
                          border: '1px solid #d1d5db',
                          borderRadius: '999px',
                          padding: '0 20px',
                          height: 40,
                          color: '#111827',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontSize: '15px'
                      }}
                  >
                      Chỉnh sửa
                  </button>
              </div>

              {/* User Info */}
              <div className="profile-user-info-section">
                  <h1 className="profile-user-name">{user.name}</h1>
                  <div style={{ color: '#6b7280', fontSize: '16px', marginTop: '6px' }}>@{user.email}</div>
                  
                  {user.bio && (
                    <div style={{ marginTop: 14, fontSize: '16px', lineHeight: 1.6, color: '#111827', wordBreak: 'break-word' }}>
                        {user.bio}
                    </div>
                  )}

                  <div className="profile-user-details">
                      {user.address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={20} />
                            <span>{user.address}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={20} />
                          <span>Tham gia {formatJoinDate((user as any).createdAt)}</span>
                      </div>
                  </div>

                  <div className="profile-stats-section">
                      <div style={{ display: 'flex', gap: 4 }}>
                          <span style={{ fontWeight: 700, color: '#111827' }}>{postsCount}</span>
                          <span style={{ color: '#6b7280' }}>Bài viết</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                          <span style={{ fontWeight: 700, color: '#111827' }}>{friendsCount}</span>
                          <span style={{ color: '#6b7280' }}>Bạn bè</span>
                      </div>
                  </div>
              </div>

              {/* Tabs */}
              <div className="profile-tabs-container">
                  {[
                    { key: 'posts', label: 'Bài viết' },
                    { key: 'featured', label: 'Nổi bật' },
                    { key: 'media', label: 'Phương tiện' }
                  ].map((tab) => (
                      <div 
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key as any)}
                          style={{
                              flex: 1,
                              textAlign: 'center',
                              padding: '18px 0',
                              cursor: 'pointer',
                              position: 'relative',
                              color: activeTab === tab.key ? '#111827' : '#6b7280',
                              fontWeight: activeTab === tab.key ? 700 : 500,
                              transition: 'background 0.2s',
                              fontSize: '16px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                          <span>{tab.label}</span>
                          {activeTab === tab.key && (
                              <div style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 56,
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor: '#1d9bf0'
                              }} />
                          )}
                      </div>
                  ))}
              </div>
          </div>

          {/* Feed */}
          <div style={{ background: '#f9fafb', padding: '28px 32px' }}>
              {isLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      <div style={{ fontSize: 17 }}>Đang tải...</div>
                  </div>
              ) : activeTab === 'media' ? (
                  // Media Tab - Grid of images/videos
                  mediaItems.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                          <div style={{ fontSize: 17 }}>Chưa có phương tiện nào</div>
                      </div>
                  ) : (
                      <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: 4
                      }}>
                          {mediaItems.map((media, index) => (
                              <div
                                  key={`${media.postId}-${index}`}
                                  onClick={() => {
                                      setSelectedMedia(media);
                                      setShowMediaModal(true);
                                  }}
                                  style={{
                                      position: 'relative',
                                      aspectRatio: '1',
                                      overflow: 'hidden',
                                      background: '#f3f4f6',
                                      borderRadius: 8,
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s, box-shadow 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scale(1.02)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                  }}
                                  onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)';
                                      e.currentTarget.style.boxShadow = 'none';
                                  }}
                              >
                                  {media.type === 'image' ? (
                                      <img 
                                          src={media.sourceUrl || '/placeholder.svg'} 
                                          alt="Media content"
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
                                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                          <video 
                                              src={media.sourceUrl}
                                              style={{
                                                  width: '100%',
                                                  height: '100%',
                                                  objectFit: 'cover',
                                                  display: 'block'
                                              }}
                                          />
                                          <div style={{
                                              position: 'absolute',
                                              top: 8,
                                              right: 8,
                                              background: 'rgba(0, 0, 0, 0.6)',
                                              borderRadius: 4,
                                              padding: '4px 8px',
                                              color: '#ffffff',
                                              fontSize: 12,
                                              fontWeight: 600,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4
                                          }}>
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                  <polygon points="5 3 19 12 5 21 5 3" />
                                              </svg>
                                              Video
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  )
              ) : posts.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      <div style={{ fontSize: 17 }}>Chưa có bài đăng nào</div>
                  </div>
              ) : (
                  posts.map(post => (
                      <div
                          key={post.id}
                          style={{
                              background: '#ffffff',
                              borderRadius: 14,
                              padding: 24,
                              marginBottom: 24,
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s'
                          }}
                      >
                          {/* Post Header */}
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, position: 'relative' }}>
                              <div style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 24,
                                  backgroundImage: user.avatar ? `url(${user.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: 14
                              }}>
                                  {!user.avatar && (
                                      <span style={{ fontSize: 16, color: '#fff', fontWeight: 600 }}>
                                          {post.author.split(' ').map(n => n[0]).join('')}
                                      </span>
                                  )}
                              </div>
                              <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 17, fontWeight: 600, color: '#111827', marginBottom: 3 }}>
                                      {post.author}
                                  </div>
                                  <div style={{ fontSize: 15, color: '#6b7280' }}>
                                      {post.email}
                                  </div>
                              </div>
                              <div style={{ fontSize: 14, color: '#9ca3af' }}>
                                  {post.timestamp}
                              </div>
                          </div>

                          {/* Post Title */}
                          <h3 style={{
                              margin: '0 0 10px 0',
                              fontSize: 20,
                              fontWeight: 700,
                              color: '#111827'
                          }}>
                              {post.title}
                          </h3>

                          {/* Post Description */}
                          <p style={{
                              margin: '0 0 18px 0',
                              fontSize: 16,
                              color: '#374151',
                              lineHeight: 1.6
                          }}>
                              {post.description}
                          </p>

                          {/* Shared Post Preview */}
                          {post.isShared && post.sharedPost && (
                              <div style={{
                                  border: '2px solid #e5e7eb',
                                  borderRadius: 12,
                                  padding: 16,
                                  marginBottom: 16,
                                  background: '#f9fafb',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                              }}
                              onClick={() => {
                                  // Optionally open the original post
                              }}
                              onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#f3f4f6';
                                  e.currentTarget.style.borderColor = '#d1d5db';
                              }}
                              onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#f9fafb';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                              }}
                              >
                                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                                      Bài viết của {post.sharedPost.author}
                                  </div>
                                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                                      {post.sharedPost.title}
                                  </div>
                                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5, marginBottom: 12 }}>
                                      {post.sharedPost.description.length > 200 
                                          ? post.sharedPost.description.substring(0, 200) + '...' 
                                          : post.sharedPost.description}
                                  </div>
                                  {post.sharedPost.media && post.sharedPost.media.length > 0 && (
                                      <div style={{
                                          width: '100%',
                                          borderRadius: 8,
                                          overflow: 'hidden',
                                          border: '1px solid #e5e7eb'
                                      }}>
                                          {post.sharedPost.media[0].type === 'image' ? (
                                              <img 
                                                  src={post.sharedPost.media[0].sourceUrl || '/placeholder.svg'} 
                                                  alt={post.sharedPost.title}
                                                  style={{
                                                      width: '100%',
                                                      maxHeight: 300,
                                                      objectFit: 'cover',
                                                      display: 'block'
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
                                                      width: '100%',
                                                      maxHeight: 300,
                                                      objectFit: 'cover',
                                                      display: 'block'
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
                                  width: '100%',
                                  marginBottom: 16,
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  border: '1px solid #e5e7eb'
                              }}>
                                  {post.media.length === 1 ? (
                                      <div>
                                          {post.media[0].type === 'image' ? (
                                              <img 
                                                  src={post.media[0].sourceUrl || '/placeholder.svg'} 
                                                  alt={post.title}
                                                  style={{
                                                      width: '100%',
                                                      height: 'auto',
                                                      display: 'block'
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
                                                      display: 'block'
                                                  }}
                                              />
                                          )}
                                      </div>
                                  ) : (
                                      <div style={{
                                          display: 'grid',
                                          gridTemplateColumns: post.media.length === 2 ? '1fr 1fr' : 'repeat(2, 1fr)',
                                          gap: 2
                                      }}>
                                          {post.media.slice(0, 4).map((item, index) => (
                                              <div
                                                  key={index}
                                                  style={{
                                                      position: 'relative',
                                                      aspectRatio: '1',
                                                      overflow: 'hidden',
                                                      background: '#f3f4f6'
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
                                                      <div style={{
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
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              paddingTop: 14,
                              borderTop: '1px solid #f3f4f6'
                          }}>
                              <button
                                  style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 7,
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '8px 14px',
                                      borderRadius: 8,
                                      transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                  <svg
                                      width="22"
                                      height="22"
                                      viewBox="0 0 24 24"
                                      fill={post.isLiked ? '#ef4444' : 'none'}
                                      stroke={post.isLiked ? '#ef4444' : '#6b7280'}
                                      strokeWidth="2"
                                  >
                                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                  </svg>
                                  <span style={{
                                      fontSize: 15,
                                      color: post.isLiked ? '#ef4444' : '#6b7280',
                                      fontWeight: 500
                                  }}>
                                      Thích
                                  </span>
                              </button>
                              <span style={{ fontSize: 14, color: '#9ca3af' }}>
                                  {post.likes} lượt thích
                              </span>
                              <button
                                  style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 7,
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '8px 14px',
                                      borderRadius: 8,
                                      transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                  <svg
                                      width="22"
                                      height="22"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#6b7280"
                                      strokeWidth="2"
                                  >
                                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  <span style={{
                                      fontSize: 15,
                                      color: '#6b7280',
                                      fontWeight: 500
                                  }}>
                                      Bình luận
                                  </span>
                              </button>
                              <span style={{ fontSize: 14, color: '#9ca3af' }}>
                                  {post.commentCount} bình luận
                              </span>
                          </div>
                      </div>
                  ))
              )}
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Media Viewer Modal */}
      {showMediaModal && selectedMedia && (
        <div
          onClick={() => {
            setShowMediaModal(false);
            setSelectedMedia(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => {
              setShowMediaModal(false);
              setSelectedMedia(null);
            }}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
              zIndex: 10000
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Media Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              position: 'relative'
            }}
          >
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.sourceUrl}
                alt="Media content"
                style={{
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: 8,
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                }}
              />
            ) : (
              <video
                src={selectedMedia.sourceUrl}
                controls
                autoPlay
                style={{
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: 8,
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
