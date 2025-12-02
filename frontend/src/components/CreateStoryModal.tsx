'use client';

import { useState, useRef } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: () => void;
}

export default function CreateStoryModal({
  isOpen,
  onClose,
  onStoryCreated,
}: CreateStoryModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'close_friends'>('public');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
        setError('Chỉ chấp nhận file ảnh hoặc video');
        return;
      }

      // Validate file size (50MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File quá lớn. Vui lòng chọn file nhỏ hơn 50MB');
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Create preview
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // For video, create a video element for preview
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            video.currentTime = 1; // Seek to first frame
            video.onseeked = () => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              setPreview(canvas.toDataURL());
            };
          }
        };
        video.src = URL.createObjectURL(selectedFile);
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setPreview(null);
      setCaption('');
      setVisibility('public');
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Vui lòng chọn ảnh hoặc video');
      return;
    }

    if (!user) {
      setError('Vui lòng đăng nhập để đăng story');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', caption.trim());
      formData.append('visibility', visibility);

      const response = await apiService.createStory(formData);

      if (response.success) {
        handleClose();
        if (onStoryCreated) {
          onStoryCreated();
        }
      } else {
        setError(response.message || 'Không thể đăng story');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể đăng story');
    } finally {
      setIsUploading(false);
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
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
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
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            Tạo Story
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              transition: 'background 0.2s',
              opacity: isUploading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isUploading) {
                e.currentTarget.style.background = '#f3f4f6';
              }
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
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                color: '#dc2626',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* File Upload */}
          <div>
            {!preview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: 12,
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: '#f9fafb',
                }}
                onMouseEnter={(e) => {
                  if (!isUploading) {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.background = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.background = '#f9fafb';
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  style={{ margin: '0 auto 16px' }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: 4,
                  }}
                >
                  Chọn ảnh hoặc video
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: '#6b7280',
                  }}
                >
                  JPG, PNG hoặc MP4 (tối đa 50MB)
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#000000',
                }}
              >
                {file?.type.startsWith('image/') ? (
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                ) : (
                  <video
                    src={preview || URL.createObjectURL(file!)}
                    controls
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isUploading) {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
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
            )}
          </div>

          {/* Caption */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 8,
              }}
            >
              Mô tả (tùy chọn)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Thêm mô tả cho story của bạn..."
              rows={3}
              disabled={isUploading}
              maxLength={220}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                transition: 'all 0.2s',
                background: '#ffffff',
                pointerEvents: isUploading ? 'none' : 'auto',
                color: '#111827',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: '#9ca3af',
                marginTop: 4,
                textAlign: 'right',
              }}
            >
              {caption.length}/220
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 8,
              }}
            >
              Quyền riêng tư
            </label>
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(
                  e.target.value as 'public' | 'friends' | 'close_friends'
                )
              }
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                transition: 'all 0.2s',
                background: '#ffffff',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                color: '#111827',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
              }}
            >
              <option value="public">Công khai</option>
              <option value="friends">Bạn bè</option>
              <option value="close_friends">Bạn thân</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || isUploading}
            style={{
              width: '100%',
              padding: '14px',
              background:
                !file || isUploading
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: !file || isUploading ? '#9ca3af' : '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: !file || isUploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (file && !isUploading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isUploading ? 'Đang đăng...' : 'Đăng Story'}
          </button>
        </form>
      </div>
    </div>
  );
}

