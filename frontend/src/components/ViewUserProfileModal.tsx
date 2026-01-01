'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiService } from '@/services/api';
import MemoriesSection from './MemoriesSection';
import styles from './profileModal.module.css';

interface ViewUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  address?: string;
  bio?: string;
  createdAt?: string | Date;
  memoriesVisible?: boolean;
}

export default function ViewUserProfileModal({ isOpen, onClose, userId, userName }: ViewUserProfileModalProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [memoriesAccessDenied, setMemoriesAccessDenied] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadUserProfile();
    }
  }, [isOpen, userId]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError('');
    setMemoriesAccessDenied(false);
    try {
      // Lấy thông tin profile của user
      const response = await apiService.getUserProfile(userId);
      if (response.success && response.data) {
        setUserProfile(response.data);
        
        // Kiểm tra quyền xem kỷ niệm
        if (response.data.memoriesVisible === false) {
          setMemoriesAccessDenied(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  const formatJoinDate = (createdAt?: string | Date) => {
    if (!createdAt) return 'Không rõ';
    const date = new Date(createdAt);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${year}`;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Thông tin người dùng</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} color="#6b7280" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '0 24px 24px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <div style={{ fontSize: 16 }}>Đang tải thông tin...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
              <div style={{ fontSize: 16 }}>{error}</div>
            </div>
          ) : userProfile ? (
            <>
              {/* User Info Section */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px',
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 24,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundImage: userProfile.avatar
                      ? `url(${userProfile.avatar})`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    border: '4px solid #ffffff',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {!userProfile.avatar && (
                    <span style={{ fontSize: 36, color: '#fff', fontWeight: 700 }}>
                      {getInitials(userProfile.name)}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#111827',
                  }}
                >
                  {userProfile.name}
                </h3>

                {/* Email */}
                <div
                  style={{
                    fontSize: 14,
                    color: '#6b7280',
                    marginBottom: 16,
                  }}
                >
                  {userProfile.email}
                </div>

                {/* Stats */}
                <div
                  style={{
                    display: 'flex',
                    gap: 24,
                    padding: '16px 0',
                    borderTop: '1px solid #e5e7eb',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                      Tham gia
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                      {formatJoinDate(userProfile.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              {userProfile.bio && (
                <div
                  style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 24,
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    Giới thiệu
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: '#374151',
                      lineHeight: 1.6,
                    }}
                  >
                    {userProfile.bio}
                  </p>
                </div>
              )}

              {/* Additional Info */}
              {(userProfile.phone || userProfile.address) && (
                <div
                  style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 24,
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    Thông tin liên hệ
                  </h4>
                  {userProfile.phone && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="2"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span style={{ fontSize: 14, color: '#374151' }}>
                        {userProfile.phone}
                      </span>
                    </div>
                  )}
                  {userProfile.address && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="2"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span style={{ fontSize: 14, color: '#374151' }}>
                        {userProfile.address}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Memories Section */}
              <div style={{ marginTop: 24 }}>
                {memoriesAccessDenied ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      background: '#f9fafb',
                      borderRadius: 12,
                      textAlign: 'center',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="2"
                      style={{ margin: '0 auto 16px' }}
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <h4
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#374151',
                      }}
                    >
                      Kỷ niệm riêng tư
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        color: '#6b7280',
                        lineHeight: 1.6,
                      }}
                    >
                      Người dùng này không cho phép xem kỷ niệm của họ
                    </p>
                  </div>
                ) : (
                  <MemoriesSection userId={userId} showCreateButton={false} />
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
