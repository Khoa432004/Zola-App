import { IAppointmentParticipant, IAppointmentReminder } from '../models/Appointment';

/**
 * DTO để tạo appointment mới
 */
export interface CreateAppointmentDto {
  con_id: string;
  title: string;
  description?: string;
  appointment_time: string; // ISO string format
  location?: string;
  participant_ids: string[]; // Danh sách user IDs tham gia
  reminder_times: number[]; // Danh sách thời gian nhắc nhở (phút) - VD: [15, 30, 60]
  repeat_type?: 'none' | 'daily' | 'weekly' | 'monthly';
}

/**
 * DTO để cập nhật appointment
 */
export interface UpdateAppointmentDto {
  title?: string;
  description?: string;
  appointment_time?: string; // ISO string format
  location?: string;
  participant_ids?: string[];
  reminder_times?: number[];
  repeat_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  status?: 'pending' | 'completed' | 'cancelled';
}

/**
 * Response DTO cho appointment
 */
export interface AppointmentResponseDto {
  id: string;
  con_id: string;
  title: string;
  description?: string;
  appointment_time: string; // ISO string
  location?: string;
  creator_id: string;
  creator_name: string;
  participants: IAppointmentParticipant[];
  reminders: IAppointmentReminder[];
  repeat_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Validate CreateAppointmentDto
 */
export function validateCreateAppointment(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.con_id || typeof data.con_id !== 'string') {
    errors.push('con_id là bắt buộc và phải là chuỗi');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('title là bắt buộc và không được để trống');
  }

  if (!data.appointment_time || typeof data.appointment_time !== 'string') {
    errors.push('appointment_time là bắt buộc và phải là chuỗi ISO');
  } else {
    const appointmentDate = new Date(data.appointment_time);
    if (isNaN(appointmentDate.getTime())) {
      errors.push('appointment_time không hợp lệ');
    } else if (appointmentDate <= new Date()) {
      errors.push('appointment_time phải là thời gian trong tương lai');
    }
  }

  if (!Array.isArray(data.participant_ids)) {
    errors.push('participant_ids phải là mảng');
  } else if (data.participant_ids.length === 0) {
    errors.push('Phải có ít nhất một người tham gia');
  }

  if (!Array.isArray(data.reminder_times)) {
    errors.push('reminder_times phải là mảng');
  } else {
    const validReminderTimes = data.reminder_times.every((time: any) => 
      typeof time === 'number' && time > 0
    );
    if (!validReminderTimes) {
      errors.push('reminder_times phải chứa các số dương (phút)');
    }
  }

  if (data.repeat_type && !['none', 'daily', 'weekly', 'monthly'].includes(data.repeat_type)) {
    errors.push('repeat_type phải là: none, daily, weekly, hoặc monthly');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate UpdateAppointmentDto
 */
export function validateUpdateAppointment(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('title phải là chuỗi không rỗng');
    }
  }

  if (data.appointment_time !== undefined) {
    if (typeof data.appointment_time !== 'string') {
      errors.push('appointment_time phải là chuỗi ISO');
    } else {
      const appointmentDate = new Date(data.appointment_time);
      if (isNaN(appointmentDate.getTime())) {
        errors.push('appointment_time không hợp lệ');
      }
    }
  }

  if (data.participant_ids !== undefined) {
    if (!Array.isArray(data.participant_ids)) {
      errors.push('participant_ids phải là mảng');
    } else if (data.participant_ids.length === 0) {
      errors.push('Phải có ít nhất một người tham gia');
    }
  }

  if (data.reminder_times !== undefined) {
    if (!Array.isArray(data.reminder_times)) {
      errors.push('reminder_times phải là mảng');
    } else {
      const validReminderTimes = data.reminder_times.every((time: any) => 
        typeof time === 'number' && time > 0
      );
      if (!validReminderTimes) {
        errors.push('reminder_times phải chứa các số dương (phút)');
      }
    }
  }

  if (data.repeat_type !== undefined && !['none', 'daily', 'weekly', 'monthly'].includes(data.repeat_type)) {
    errors.push('repeat_type phải là: none, daily, weekly, hoặc monthly');
  }

  if (data.status !== undefined && !['pending', 'completed', 'cancelled'].includes(data.status)) {
    errors.push('status phải là: pending, completed, hoặc cancelled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
