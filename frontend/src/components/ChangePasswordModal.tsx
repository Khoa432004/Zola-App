'use client';

import { useState } from 'react';
import { ArrowLeft, Lock, X } from 'lucide-react';
import styles from './profileModal.module.css';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to change password
      // await apiService.changePassword({ currentPassword, newPassword });
      console.log('Changing password');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and close
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      style={{ zIndex: 2000 }}
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 450 }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <button
              onClick={onClose}
              className={styles.backButton}
            >
              <ArrowLeft size={20} color="#6b7280" />
            </button>
            <h2 className={styles.modalTitle} style={{ margin: 0 }}>
              Đổi mật khẩu
            </h2>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={24} color="#6b7280" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleChangePassword} className={styles.form}>
          {/* Error message */}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Current Password */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Mật khẩu hiện tại</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              className={styles.input}
              disabled={isLoading}
            />
          </div>

          {/* New Password */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className={styles.input}
              disabled={isLoading}
            />
          </div>

          {/* Confirm Password */}
          <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
            <label className={styles.inputLabel}>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className={styles.input}
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              disabled={isLoading}
              className={styles.primaryButton}
            >
              <Lock size={18} />
              {isLoading ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
