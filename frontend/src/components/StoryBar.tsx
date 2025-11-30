'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import StoryViewer from './StoryViewer';

interface Story {
  storyId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  media: {
    type: "image" | "video";
    sourceUrl: string;
    width: number;
    height: number;
  };
  caption?: string;
  createdAt: string | Date;
  expiresAt: string | Date;
  visibility: "public" | "friends" | "close_friends";
  viewers: string[];
  viewCount: number;
}

interface StoryGroup {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  stories: Story[];
  hasViewedAll: boolean;
}

interface StoryBarProps {
  onCreateStory?: () => void;
  refreshTrigger?: number; // Trigger reload when this changes
}

export default function StoryBar({ onCreateStory, refreshTrigger }: StoryBarProps) {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    loadStories();
  }, [user, refreshTrigger]);

  const loadStories = async () => {
    try {
      setIsLoading(true);
      console.log('📖 StoryBar - Starting to load stories...');
      const response = await apiService.getStories();
      console.log('📖 StoryBar - Full API Response:', JSON.stringify(response, null, 2));
      
      if (!response) {
        console.error('📖 StoryBar - No response received');
        return;
      }
      
      if (response.success) {
        const storyData = response.data;
        console.log('📖 StoryBar - Response success, data type:', typeof storyData, 'isArray:', Array.isArray(storyData));
        console.log('📖 StoryBar - Story groups:', storyData);
        
        if (Array.isArray(storyData)) {
          console.log('📖 StoryBar - Story groups loaded:', storyData.length, 'groups');
          // Sắp xếp: ưu tiên story chưa xem lên trước
          const sortedGroups = [...storyData].sort((a, b) => {
            // Story chưa xem (hasViewedAll = false) lên trước
            if (!a.hasViewedAll && b.hasViewedAll) return -1;
            if (a.hasViewedAll && !b.hasViewedAll) return 1;
            // Nếu cùng trạng thái, giữ nguyên thứ tự
            return 0;
          });
          setStoryGroups(sortedGroups);
        } else {
          console.warn('📖 StoryBar - Data is not an array:', storyData);
          setStoryGroups([]);
        }
      } else {
        console.warn('📖 StoryBar - API returned unsuccessful:', response);
        setStoryGroups([]);
      }
    } catch (error: any) {
      console.error('❌ StoryBar - Error loading stories:', error);
      console.error('❌ StoryBar - Error message:', error?.message);
      console.error('❌ StoryBar - Error stack:', error?.stack);
      setStoryGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoryClick = (group: StoryGroup, storyIndex: number = 0) => {
    setSelectedStoryGroup(group);
    setSelectedStoryIndex(storyIndex);
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedStoryGroup(null);
    setSelectedStoryIndex(0);
    // Reload stories to update view status
    loadStories();
  };

  if (isLoading) {
    return (
      <div
        className="story-bar-container"
        style={{
          background: '#ffffff',
          padding: '28px 32px',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto',
          overflowY: 'hidden',
          minHeight: '148px',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: '#f3f4f6',
              flexShrink: 0,
            }}
          />
          <div style={{ fontSize: 15, color: '#6b7280' }}>Đang tải stories...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .story-bar-container {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .story-bar-container::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
      <div
        className="story-bar-container"
        style={{
          background: '#ffffff',
          padding: '28px 32px',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollBehavior: 'smooth',
          minHeight: '148px', // Fix chiều cao: 88px avatar + 10px gap + 20px text + 28px*2 padding
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            minWidth: 'max-content',
          }}
        >
          {/* My Story (Create Story) */}
          {user && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onClick={() => {
                if (onCreateStory) {
                  onCreateStory();
                }
              }}
            >
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid #ffffff',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
                  position: 'relative',
                }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: '32px',
                      color: '#ffffff',
                      fontWeight: 600,
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    border: '4px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              </div>
              <span
                style={{
                  fontSize: '14px',
                  color: '#374151',
                  fontWeight: 500,
                  textAlign: 'center',
                  maxWidth: '88px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Tin của bạn
              </span>
            </div>
          )}

          {/* Story Groups */}
          {storyGroups.length > 0 && storyGroups.map((group) => {
            const firstStory = group.stories[0];
            const hasUnviewed = !group.hasViewedAll && user;
            // Note: User's own stories are shown in the list, but we also show "Tin của bạn" button separately

            return (
              <div
                key={group.authorId}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onClick={() => handleStoryClick(group, 0)}
              >
                <div
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    padding: hasUnviewed ? '4px' : '0',
                    background: hasUnviewed
                      ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%)'
                      : 'transparent',
                    border: hasUnviewed 
                      ? 'none'
                      : '3px solid #d1d5db', // Viền xám cho story đã xem
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {group.authorAvatar ? (
                      <img
                        src={group.authorAvatar}
                        alt={group.authorName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          // Fallback to initials
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const initial = document.createElement('span');
                            initial.textContent = group.authorName.charAt(0).toUpperCase();
                            initial.style.fontSize = '32px';
                            initial.style.color = '#6366f1';
                            initial.style.fontWeight = '600';
                            parent.appendChild(initial);
                          }
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '32px',
                          color: '#6366f1',
                          fontWeight: 600,
                        }}
                      >
                        {group.authorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500,
                    textAlign: 'center',
                    maxWidth: '88px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.authorName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {showViewer && selectedStoryGroup && (
        <StoryViewer
          storyGroup={selectedStoryGroup}
          initialIndex={selectedStoryIndex}
          onClose={handleCloseViewer}
          onNextGroup={() => {
            const currentIndex = storyGroups.findIndex(
              (g) => g.authorId === selectedStoryGroup.authorId
            );
            if (currentIndex < storyGroups.length - 1) {
              const nextGroup = storyGroups[currentIndex + 1];
              setSelectedStoryGroup(nextGroup);
              setSelectedStoryIndex(0);
            } else {
              // Đã đến group cuối cùng, đóng viewer
              handleCloseViewer();
            }
          }}
          onPreviousGroup={() => {
            const currentIndex = storyGroups.findIndex(
              (g) => g.authorId === selectedStoryGroup.authorId
            );
            if (currentIndex > 0) {
              const prevGroup = storyGroups[currentIndex - 1];
              setSelectedStoryGroup(prevGroup);
              // Chuyển đến story cuối cùng của group trước
              setSelectedStoryIndex(prevGroup.stories.length - 1);
            } else {
              // Đã ở group đầu tiên, không làm gì (hoặc có thể đóng nếu muốn)
              // Giữ nguyên để user có thể xem lại stories của group đầu tiên
            }
          }}
        />
      )}
    </>
  );
}

