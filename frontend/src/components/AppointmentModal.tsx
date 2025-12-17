'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/api';
import styles from './AppointmentModal.module.css';

interface Participant {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationMembers: Participant[];
  onAppointmentCreated?: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  conversationMembers,
  onAppointmentCreated,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  const [repeatType, setRepeatType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [reminderTime, setReminderTime] = useState<number>(30); // Thời gian nhắc trước (phút)

  // Reset form khi modal đóng
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setAppointmentDateTime('');
      setRepeatType('none');
      setReminderTime(30);
      setError('');
    } else {
      // Set thời gian mặc định là hôm nay
      const now = new Date();
      // Format: YYYY-MM-DDTHH:mm
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setAppointmentDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Vui lòng nhập nội dung cuộc hẹn');
      return;
    }

    if (!appointmentDateTime) {
      setError('Vui lòng chọn thời gian cuộc hẹn');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Parse datetime
      const appointmentDate = new Date(appointmentDateTime);
      
      // Kiểm tra thời gian phải trong tương lai
      if (appointmentDate <= new Date()) {
        setError('Thời gian cuộc hẹn phải trong tương lai');
        setLoading(false);
        return;
      }

      // Tạo appointment với tất cả members trong conversation
      const participantIds = conversationMembers.map(m => m.user_id);

      const appointmentData = {
        con_id: conversationId,
        title: title.trim(),
        appointment_time: appointmentDate.toISOString(),
        participant_ids: participantIds,
        reminder_times: [reminderTime], // Thời gian nhắc trước từ user input
        repeat_type: repeatType,
      };

      await apiService.createAppointment(appointmentData);
      
      // Thành công
      if (onAppointmentCreated) {
        onAppointmentCreated();
      }
      onClose();
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setError(err.message || 'Không thể tạo cuộc hẹn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTimeSelect = (type: string) => {
    const now = new Date();
    
    if (type === '15min') {
      now.setMinutes(now.getMinutes() + 15);
    } else if (type === '30min') {
      now.setMinutes(now.getMinutes() + 30);
    } else if (type === 'tomorrow9am') {
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
    }
    
    // Format: YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    setAppointmentDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📅 Tạo nhắc hẹn</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Nhập nội dung */}
          <div className={styles.formGroup}>
            <label htmlFor="title">Nhập nội dung</label>
            <textarea
              id="title"
              placeholder="Nhập nội dung mời hoặc dán link"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={styles.textarea}
              rows={3}
            />
          </div>

          {/* Chọn thời gian nhanh */}
          <div className={styles.formGroup}>
            <label>Chọn thời gian</label>
            <div className={styles.quickTimeButtons}>
              <button
                type="button"
                className={styles.quickTimeButton}
                onClick={() => handleQuickTimeSelect('15min')}
              >
                15 phút nữa
              </button>
              <button
                type="button"
                className={styles.quickTimeButton}
                onClick={() => handleQuickTimeSelect('30min')}
              >
                30 phút nữa
              </button>
              <button
                type="button"
                className={styles.quickTimeButton}
                onClick={() => handleQuickTimeSelect('tomorrow9am')}
              >
                9:00 ngày mai
              </button>
              <button
                type="button"
                className={styles.quickTimeButton}
              >
                Khác
              </button>
            </div>
          </div>

          {/* Chọn ngày nhắc hẹn */}
          <div className={styles.formGroup}>
            <label htmlFor="appointmentDateTime">Chọn ngày nhắc hẹn</label>
            <input
              id="appointmentDateTime"
              type="datetime-local"
              value={appointmentDateTime}
              onChange={(e) => setAppointmentDateTime(e.target.value)}
              required
              className={styles.input}
              style={{
                cursor: 'pointer',
                pointerEvents: 'auto',
                userSelect: 'auto',
                WebkitUserSelect: 'auto',
              }}
            />
          </div>

          {/* Nhắc trước */}
          <div className={styles.formGroup}>
            <label htmlFor="reminderTime">Nhắc trước</label>
            <select
              id="reminderTime"
              value={reminderTime}
              onChange={(e) => setReminderTime(parseInt(e.target.value))}
              className={styles.select}
            >
              <option value={5}>5 phút trước</option>
              <option value={10}>10 phút trước</option>
              <option value={15}>15 phút trước</option>
              <option value={30}>30 phút trước</option>
              <option value={60}>1 giờ trước</option>
              <option value={120}>2 giờ trước</option>
              <option value={1440}>1 ngày trước</option>
            </select>
          </div>

          {/* Kiểu lặp lại */}
          <div className={styles.formGroup}>
            <label htmlFor="repeatType">Chọn kiểu lặp lại (vd: Lặp lại hàng tuần)</label>
            <select
              id="repeatType"
              value={repeatType}
              onChange={(e) => setRepeatType(e.target.value as any)}
              className={styles.select}
            >
              <option value="none">Không lặp lại</option>
              <option value="daily">Hàng ngày</option>
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
            </select>
          </div>

          {/* Error message */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Đang tạo...' : 'Tạo nhắc hẹn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
