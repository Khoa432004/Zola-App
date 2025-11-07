'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Edit3, Lock } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import styles from './profileModal.module.css';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [fullName, setFullName] = useState('Khoa');
  const [email, setEmail] = useState('donguyendangkhoa0403@gmail.com');
  const [phoneNumber, setPhoneNumber] = useState('0XXXXXXXXX');
  const [profileImage, setProfileImage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // TODO: Fetch user profile data
      // Load user data from auth state or API
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Upload image and update profile
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      // TODO: Call API to update profile
      // await apiService.updateProfile({ fullName, phoneNumber, profileImage });
      console.log('Updating profile:', { fullName, email, phoneNumber });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onClose();
    } catch (error: any) {
      console.error('Update profile error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className={styles.modalOverlay}
        onClick={onClose}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              Hồ sơ cá nhân
            </h2>
            <button
              onClick={onClose}
              className={styles.closeButton}
            >
              <X size={24} color="#6b7280" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleUpdateProfile} className={styles.form}>
            {/* Profile Picture */}
            <div className={styles.avatarContainer}>
              <div
                className={styles.avatar}
                style={{
                  background: profileImage
                    ? `url(${profileImage})`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {!profileImage && (
                  <span className={styles.avatarInitial}>
                    {fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.changeAvatarButton}
              >
                Thay đổi ảnh đại diện
              </button>
            </div>

            {/* Form Fields */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={styles.input}
                disabled={isUpdating}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Email</label>
              <input
                type="email"
                value={email}
                disabled
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
              <label className={styles.inputLabel}>Số điện thoại</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập số điện thoại"
                className={styles.input}
                disabled={isUpdating}
              />
            </div>

            {/* Action Buttons */}
            <div className={styles.buttonGroup}>
              <button
                type="submit"
                disabled={isUpdating}
                className={styles.primaryButton}
              >
                <Edit3 size={18} />
                {isUpdating ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
              </button>

              <button
                type="button"
                onClick={() => setShowChangePassword(true)}
                className={styles.secondaryButton}
              >
                <Lock size={18} />
                Đổi mật khẩu
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </>
  );
}
