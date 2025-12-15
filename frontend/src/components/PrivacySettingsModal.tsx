'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiService } from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProfileAsync } from '@/store/slices/authSlice';
import styles from './profileModal.module.css';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacySettingsModal({ isOpen, onClose }: PrivacySettingsModalProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      // Lấy giá trị hiện tại từ user (nếu có) hoặc mặc định true
      setShowOnlineStatus((user as any).showOnlineStatus !== false);
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiService.updatePrivacySettings(showOnlineStatus);
      
      if (response.success) {
        setSuccess('Đã cập nhật cài đặt quyền riêng tư');
        // Refresh profile để lấy dữ liệu mới
        await dispatch(fetchProfileAsync());
        
        // Đóng modal sau 1.5 giây
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(response.message || 'Cập nhật thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'Cập nhật thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Quyền riêng tư
          </h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={24} color="#6b7280" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '0 24px 24px 24px' }}>
          {/* Error message */}
          {error && (
            <div className={styles.errorMessage} style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div style={{
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 8,
              color: '#16a34a',
              fontSize: 14,
              marginBottom: '1rem'
            }}>
              {success}
            </div>
          )}

          {/* Privacy Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Show Online Status Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '16px',
              background: '#f9fafb',
              borderRadius: 12,
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: 4
                }}>
                  Hiển thị trạng thái hoạt động
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#6b7280',
                  lineHeight: 1.5
                }}>
                  Cho phép bạn bè xem khi bạn đang online hoặc offline. Khi tắt, bạn bè sẽ không thấy trạng thái hoạt động của bạn.
                </p>
              </div>
              
              {/* Toggle Switch */}
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: 52,
                height: 28,
                flexShrink: 0
              }}>
                <input
                  type="checkbox"
                  checked={showOnlineStatus}
                  onChange={(e) => setShowOnlineStatus(e.target.checked)}
                  disabled={isSaving}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: showOnlineStatus ? '#6366f1' : '#9ca3af',
                  transition: '0.3s',
                  borderRadius: 28,
                  opacity: isSaving ? 0.6 : 1
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: 22,
                    width: 22,
                    left: 3,
                    bottom: 3,
                    backgroundColor: '#ffffff',
                    transition: '0.3s',
                    borderRadius: '50%',
                    transform: showOnlineStatus ? 'translateX(24px)' : 'translateX(0)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.buttonGroup} style={{ marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                color: '#374151',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: 15,
                opacity: isSaving ? 0.6 : 1
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={styles.primaryButton}
              style={{
                flex: 1
              }}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

