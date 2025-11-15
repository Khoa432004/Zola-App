'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/api';
import { X } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
  editingPost?: {
    id: string;
    title: string;
    description: string;
    visibility: 'public' | 'private' | 'friends';
    tags: string;
    media?: Array<{
      type: 'image' | 'video';
      sourceUrl: string;
      width: number;
      height: number;
    }>;
  } | null;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated, editingPost }: CreatePostModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingMedia, setExistingMedia] = useState<Array<{
    type: 'image' | 'video';
    sourceUrl: string;
    width: number;
    height: number;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'friends'>('public');
  const [tags, setTags] = useState<string>('');

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title || '');
      setContent(editingPost.description || '');
      setVisibility(editingPost.visibility || 'public');
      setTags(editingPost.tags || '');
      setExistingMedia(editingPost.media || []);
    } else {
      setTitle('');
      setContent('');
      setVisibility('public');
      setTags('');
      setExistingMedia([]);
    }
  }, [editingPost]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setTitle('');
    setContent('');
    setFiles([]);
    setPreviews([]);
    setExistingMedia([]);
    setError(null);
    setVisibility('public');
    setTags('');
    onClose();
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(selectedFiles).forEach((file) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        newFiles.push(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          setPreviews([...previews, ...newPreviews]);
        };
        reader.readAsDataURL(file);
      }
    });

    setFiles([...files, ...newFiles]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.background = '#f3f4f6';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.background = '#ffffff';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.background = '#ffffff';
    }
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() && !content.trim() && files.length === 0 && existingMedia.length === 0) {
      setError('Vui lòng nhập tiêu đề, nội dung hoặc thêm ảnh/video');
      return;
    }

    if (!user) {
      setError('Vui lòng đăng nhập để đăng bài');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      if (title.trim()) {
        formData.append('title', title.trim());
      }
      formData.append('caption', content.trim() || '');
      formData.append('visibility', visibility);
      
      if (tags.trim()) {
        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        formData.append('tags', JSON.stringify(tagsArray));
      }
      
      files.forEach((file) => {
        formData.append('media', file);
      });

      let response;
      if (editingPost) {
        response = await apiService.updatePost(editingPost.id, formData);
      } else {
        response = await apiService.createPost(formData);
      }
      
      if (response.success) {
        handleClose();
        if (onPostCreated) {
          onPostCreated();
        }
      } else {
        setError(response.message || (editingPost ? 'Không thể cập nhật bài viết' : 'Không thể đăng bài'));
      }
    } catch (err: any) {
      setError(err.message || (editingPost ? 'Không thể cập nhật bài viết' : 'Không thể đăng bài'));
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
        zIndex: 1000
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '90%',
          maxWidth: 650,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: '#111827',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {editingPost ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
          </h2>
          <button
            onClick={handleClose}
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
        <form onSubmit={handleSubmit} style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          background: '#fafafa',
          position: 'relative',
          zIndex: 1
        }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 8
            }}>
              Tiêu đề
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài viết"
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '14px 18px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 15,
                outline: 'none',
                transition: 'all 0.2s',
                background: '#ffffff',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                pointerEvents: isUploading ? 'none' : 'auto',
                color: '#111827'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            />
          </div>

          {/* Content */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 8
            }}>
              Nội dung
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung bài viết"
              rows={6}
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '14px 18px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                transition: 'all 0.2s',
                background: '#ffffff',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                lineHeight: '1.6',
                pointerEvents: isUploading ? 'none' : 'auto',
                color: '#111827'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            />
          </div>

          {/* Media Section */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 12
            }}>
              Ảnh/Video
            </label>
            
            {/* Upload Buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#f3f4f6',
                  border: '2px solid #8b5cf6',
                  borderRadius: 8,
                  color: '#8b5cf6',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ede9fe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Tải lên
              </button>
              
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#ffffff',
                  border: '2px solid #d1d5db',
                  borderRadius: 8,
                  color: '#6b7280',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: 0.6
                }}
                disabled
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                </svg>
                Tạo ảnh bằng AI
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: 8,
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <p style={{
                margin: 0,
                fontSize: 14,
                color: '#6b7280'
              }}>
                Kéo thả ảnh/video vào đây hoặc nhấn để chọn
              </p>
            </div>

            {/* File Previews */}
            {previews.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 12,
                marginTop: 16
              }}>
                {previews.map((preview, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: '100%',
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 8
            }}>
              Tags (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ví dụ: công nghệ, du lịch, ẩm thực"
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '14px 18px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 15,
                outline: 'none',
                transition: 'all 0.2s',
                background: '#ffffff',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                pointerEvents: isUploading ? 'none' : 'auto',
                color: '#111827'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            />
            <p style={{
              margin: '8px 0 0 0',
              fontSize: 12,
              color: '#6b7280'
            }}>
              Nhập các tag phân cách bằng dấu phẩy (ví dụ: công nghệ, du lịch, ẩm thực)
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 8
            }}>
              Quyền riêng tư
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private' | 'friends')}
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '14px 18px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 15,
                outline: 'none',
                background: '#ffffff',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                pointerEvents: isUploading ? 'none' : 'auto',
                color: '#111827',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              <option value="public">Công khai</option>
              <option value="private">Riêng tư</option>
              <option value="friends">Bạn bè</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            paddingTop: 20,
            borderTop: '2px solid #e5e7eb',
            marginTop: 8
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              style={{
                padding: '12px 24px',
                background: '#ffffff',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                color: '#374151',
                fontSize: 15,
                fontWeight: 600,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                opacity: isUploading ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                if (!isUploading) {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUploading}
              style={{
                padding: '12px 28px',
                background: isUploading 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                borderRadius: 10,
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 600,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: isUploading 
                  ? 'none' 
                  : '0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!isUploading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(99, 102, 241, 0.4), 0 4px 6px -1px rgba(99, 102, 241, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isUploading 
                  ? 'none' 
                  : '0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)';
              }}
            >
              {isUploading ? (editingPost ? 'Đang cập nhật...' : 'Đang đăng...') : (editingPost ? 'Cập nhật' : 'Đăng bài')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

