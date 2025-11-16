'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProfileAsync, updateProfileAsync } from '@/store/slices/authSlice';
import { X, Edit3, Lock } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import styles from './profileModal.module.css';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const isLoading = useAppSelector(s => s.auth.isLoading);
  const error = useAppSelector(s => s.auth.error);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // nạp từ store nếu có, đồng thời fetch mới
      setFullName(user?.name || '');
      setEmail(user?.email || '');
      setPhoneNumber(user?.phone || '');
      setAddress(user?.address || '');
      setBio(user?.bio || '');
      setProfileImage(user?.avatar || '');
      setUpdateError('');
      dispatch(fetchProfileAsync());
    }
  }, [isOpen, dispatch]);

  // Cập nhật form khi user data thay đổi
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phone || '');
      setAddress(user.address || '');
      setBio(user.bio || '');
      setProfileImage(user.avatar || '');
    }
  }, [user]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUpdating(true);
        setUpdateError('');
        
        // Preview image
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImage(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to server
        const { apiService } = await import('@/services/api');
        const response = await apiService.uploadAvatar(file);
        
        if (response.success && response.data) {
          // Update local state
          setProfileImage(response.data.avatar || '');
          // Update user in store by fetching profile again
          dispatch(fetchProfileAsync());
        }
      } catch (error: any) {
        setUpdateError(error.message || 'Không thể upload ảnh đại diện');
        console.error('Upload avatar error:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError('');
    setIsUpdating(true);
    
    try {
      const result = await dispatch(updateProfileAsync({ 
        name: fullName, 
        phone: phoneNumber,
        address: address,
        bio: bio
      }));
      
      if (updateProfileAsync.fulfilled.match(result)) {
        // Update thành công, đóng modal
        onClose();
      } else {
        // Update thất bại
        setUpdateError(result.payload as string || 'Cập nhật thất bại');
      }
    } catch (error: any) {
      setUpdateError(error.message || 'Cập nhật thất bại');
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
            {/* Error message */}
            {updateError && (
              <div className={styles.errorMessage} style={{ marginBottom: '1rem' }}>
                {updateError}
              </div>
            )}
            
            {/* Profile Picture */}
            <div className={styles.avatarContainer}>
              <div
                className={styles.avatar}
                style={{
                  backgroundImage: profileImage
                    ? `url(${profileImage})`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
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

            <div className={styles.inputGroup}>
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

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Địa chỉ</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nhập địa chỉ"
                className={styles.input}
                disabled={isUpdating}
              />
            </div>

            <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
              <label className={styles.inputLabel}>Giới thiệu</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Nhập giới thiệu về bản thân"
                className={styles.input}
                disabled={isUpdating}
                rows={4}
                style={{ resize: 'vertical', minHeight: '100px' }}
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
