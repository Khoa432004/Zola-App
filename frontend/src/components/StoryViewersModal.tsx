'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface Viewer {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface StoryViewersModalProps {
  isOpen: boolean;
  storyId: string;
  onClose: () => void;
}

export default function StoryViewersModal({
  isOpen,
  storyId,
  onClose,
}: StoryViewersModalProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [viewCount, setViewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && storyId) {
      loadViewers();
    } else {
      // Reset khi đóng modal
      setViewers([]);
      setViewCount(0);
      setError(null);
    }
  }, [isOpen, storyId]);

  const loadViewers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getStoryViewers(storyId);
      
      if (response.success && response.data) {
        setViewers(response.data.viewers || []);
        setViewCount(response.data.viewCount || 0);
      } else {
        setError(response.message || 'Không thể tải danh sách người xem');
      }
    } catch (err: any) {
      console.error('Error loading viewers:', err);
      setError(err.message || 'Không thể tải danh sách người xem');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: '#111827',
              }}
            >
              Người xem
            </h2>
            {viewCount > 0 && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: '#6b7280',
                }}
              >
                {viewCount} {viewCount === 1 ? 'lượt xem' : 'lượt xem'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
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
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
            maxHeight: 'calc(80vh - 120px)',
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              <div style={{ fontSize: '16px' }}>Đang tải...</div>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: '#ef4444',
              }}
            >
              <div style={{ fontSize: '16px' }}>{error}</div>
            </div>
          ) : viewers.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              <div style={{ fontSize: '16px' }}>Chưa có ai xem story này</div>
            </div>
          ) : (
            viewers.map((viewer) => (
              <div
                key={viewer.id}
                style={{
                  padding: '12px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  {viewer.avatar ? (
                    <img
                      src={viewer.avatar}
                      alt={viewer.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '20px',
                        fontWeight: 600,
                      }}
                    >
                      {viewer.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#111827',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {viewer.name}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {viewer.email}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

