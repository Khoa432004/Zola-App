'use client';

import { useState, useEffect, useRef } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import StoryViewersModal from './StoryViewersModal';

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

interface StoryViewerProps {
  storyGroup: StoryGroup;
  initialIndex: number;
  onClose: () => void;
  onNextGroup: () => void;
  onPreviousGroup: () => void;
}

export default function StoryViewer({
  storyGroup,
  initialIndex,
  onClose,
  onNextGroup,
  onPreviousGroup,
}: StoryViewerProps) {
  const { user } = useAuth();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [videoRefs, setVideoRefs] = useState<{ [key: string]: HTMLVideoElement | null }>({});
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const hasCalledNextRef = useRef<boolean>(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [storyViewCount, setStoryViewCount] = useState(0);

  const currentStory = storyGroup.stories[currentStoryIndex];
  const isMyStory = user && currentStory && currentStory.authorId === user.id;
  const STORY_DURATION = 5000; // 5 seconds

  // Mark story as viewed when it's shown
  useEffect(() => {
    if (currentStory && user) {
      // Chỉ mark as viewed nếu không phải story của mình
      if (currentStory.authorId !== user.id) {
        apiService.markStoryAsViewed(currentStory.storyId).catch((error) => {
          console.error('Error marking story as viewed:', error);
        });
      }
      // Update view count cho story của mình
      setStoryViewCount(currentStory.viewCount || 0);
    }
  }, [currentStory?.storyId, currentStory?.viewCount, user]);

  // Progress bar animation
  useEffect(() => {
    if (!currentStory || isPaused) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // Reset progress and flag
    setProgress(0);
    hasCalledNextRef.current = false;

    // Handle video duration
    if (currentStory.media.type === 'video') {
      const videoElement = videoRefs[currentStory.storyId];
      if (videoElement) {
        videoElement.currentTime = 0;
        videoElement.play().catch((error) => {
          console.error('Error playing video:', error);
        });
        
        // Update progress based on video time
        const updateProgress = () => {
          if (videoElement && !isPaused && videoElement.duration) {
            const progressPercent = (videoElement.currentTime / videoElement.duration) * 100;
            setProgress(Math.min(progressPercent, 100));
          }
        };
        
        const progressUpdateInterval = setInterval(updateProgress, 100);
        
        const handleVideoEnd = () => {
          clearInterval(progressUpdateInterval);
          if (!hasCalledNextRef.current) {
            hasCalledNextRef.current = true;
            setProgress(100);
            // Gọi handleNextStory sau một chút để đảm bảo progress đã được set
            setTimeout(() => {
              handleNextStory();
            }, 50);
          }
        };
        
        videoElement.addEventListener('ended', handleVideoEnd);
        return () => {
          clearInterval(progressUpdateInterval);
          videoElement.removeEventListener('ended', handleVideoEnd);
        };
      }
    }

    // For images, use timer
    if (currentStory.media.type === 'image') {
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 2; // Increment by 2% every 100ms (5 seconds total)
          if (newProgress >= 100 && !hasCalledNextRef.current) {
            hasCalledNextRef.current = true;
            // Clear interval trước khi gọi handleNextStory để tránh loop
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            // Gọi handleNextStory sau một chút để đảm bảo progress đã được set
            setTimeout(() => {
              handleNextStory();
            }, 50);
            return 100; // Set về 100% để hiển thị đầy
          }
          return newProgress;
        });
      }, 100);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [currentStory?.storyId, isPaused]);

  const handleNextStory = () => {
    if (currentStoryIndex < storyGroup.stories.length - 1) {
      // Còn story tiếp theo trong group hiện tại
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      // Đã đến story cuối cùng, chuyển sang group tiếp theo
      // onNextGroup sẽ xử lý việc đóng viewer nếu không còn group nào
      onNextGroup();
    }
  };

  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      // Còn story trước đó trong group hiện tại
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    } else {
      // Đã ở story đầu tiên, chuyển sang group trước
      onPreviousGroup();
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndRef.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;

    const diff = touchStartRef.current - touchEndRef.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - next story
        handleNextStory();
      } else {
        // Swipe right - previous story
        handlePreviousStory();
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePreviousStory();
      } else if (e.key === 'ArrowRight') {
        handleNextStory();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentStoryIndex]);

  if (!currentStory) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Progress Bars */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '12px 16px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
        }}
      >
        {storyGroup.stories.map((story, index) => (
          <div
            key={story.storyId}
            style={{
              flex: 1,
              height: '3px',
              background: index < currentStoryIndex
                ? '#ffffff'
                : index === currentStoryIndex
                ? 'rgba(255,255,255,0.3)'
                : 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            {index === currentStoryIndex && (
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#ffffff',
                  transition: isPaused ? 'none' : 'width 0.1s linear',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid #ffffff',
            }}
          >
            {storyGroup.authorAvatar ? (
              <img
                src={storyGroup.authorAvatar}
                alt={storyGroup.authorName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {storyGroup.authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div
              style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {storyGroup.authorName}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '12px',
              }}
            >
              {new Date(currentStory.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Count Button - chỉ hiển thị khi là story của mình */}
          {isMyStory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowViewersModal(true);
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '20px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span
                style={{
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {storyViewCount}
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {currentStory.media.type === 'image' ? (
          <img
            src={currentStory.media.sourceUrl}
            alt={currentStory.caption || 'Story'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <video
            ref={(el) => {
              if (el) {
                setVideoRefs((prev) => ({
                  ...prev,
                  [currentStory.storyId]: el,
                }));
              }
            }}
            src={currentStory.media.sourceUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
            playsInline
            autoPlay
            muted={false}
          />
        )}

        {/* Caption */}
        {currentStory.caption && (
          <div
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '16px',
              right: '16px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 500,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              maxWidth: '100%',
              wordWrap: 'break-word',
            }}
          >
            {currentStory.caption}
          </div>
        )}

        {/* Navigation Arrows */}
        <button
          onClick={handlePreviousStory}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          onClick={handleNextStory}
          style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Viewers Modal */}
      {showViewersModal && currentStory && (
        <StoryViewersModal
          isOpen={showViewersModal}
          storyId={currentStory.storyId}
          onClose={async () => {
            setShowViewersModal(false);
            // Reload story để cập nhật viewCount mới nhất
            try {
              const response = await apiService.getStoryById(currentStory.storyId);
              if (response.success && response.data) {
                setStoryViewCount(response.data.viewCount || 0);
              }
            } catch (error) {
              console.error('Error reloading story viewCount:', error);
            }
          }}
        />
      )}
    </div>
  );
}

