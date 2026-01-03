import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

/**
 * Participant interface trong appointment
 */
export interface IAppointmentParticipant {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
}

/**
 * Reminder configuration
 */
export interface IAppointmentReminder {
  time_before: number; // Số phút trước khi gửi nhắc nhở (15, 30, 60, etc.)
  sent: boolean; // Đã gửi email chưa
  sent_at?: Date; // Thời gian gửi email
}

/**
 * Appointment interface
 */
export interface IAppointment {
  id: string;
  con_id: string; // Conversation ID
  title: string; // Tiêu đề cuộc hẹn
  description?: string; // Mô tả chi tiết
  appointment_time: Date; // Thời gian cuộc hẹn
  location?: string; // Địa điểm (optional)
  creator_id: string; // Người tạo cuộc hẹn
  creator_name: string;
  participants: IAppointmentParticipant[]; // Danh sách người tham gia
  reminders: IAppointmentReminder[]; // Danh sách thời gian nhắc nhở
  repeat_type?: 'none' | 'daily' | 'weekly' | 'monthly'; // Kiểu lặp lại
  status: 'pending' | 'completed' | 'cancelled'; // Trạng thái cuộc hẹn
  createdAt: Date;
  updatedAt: Date;
}

export class Appointment {
  private static collection = 'Appointments';

  /**
   * Tạo appointment mới
   */
  static async create(appointmentData: Omit<IAppointment, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<IAppointment> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    
    // Loại bỏ các trường undefined để tránh lỗi Firestore
    const cleanData: any = {
      con_id: appointmentData.con_id,
      title: appointmentData.title,
      appointment_time: appointmentData.appointment_time,
      creator_id: appointmentData.creator_id,
      creator_name: appointmentData.creator_name,
      participants: appointmentData.participants,
      reminders: appointmentData.reminders,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Chỉ thêm các trường optional nếu có giá trị (loại bỏ undefined và null)
    if (appointmentData.description !== undefined && appointmentData.description !== null && appointmentData.description !== '') {
      cleanData.description = appointmentData.description;
    }
    if (appointmentData.location !== undefined && appointmentData.location !== null && appointmentData.location !== '') {
      cleanData.location = appointmentData.location;
    }
    if (appointmentData.repeat_type !== undefined && appointmentData.repeat_type !== null) {
      cleanData.repeat_type = appointmentData.repeat_type;
    }

    const docRef = await firestore.collection(this.collection).add(cleanData);
    const doc = await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
      appointment_time: doc.data()?.appointment_time?.toDate() || new Date(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      reminders: doc.data()?.reminders?.map((r: any) => ({
        ...r,
        sent_at: r.sent_at?.toDate() || undefined,
      })) || [],
    } as IAppointment;
  }

  /**
   * Tìm appointment theo ID
   */
  static async findById(id: string): Promise<IAppointment | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const doc = await firestore.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
      appointment_time: doc.data()?.appointment_time?.toDate() || new Date(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      reminders: doc.data()?.reminders?.map((r: any) => ({
        ...r,
        sent_at: r.sent_at?.toDate() || undefined,
      })) || [],
    } as IAppointment;
  }

  /**
   * Lấy tất cả appointments của một conversation
   */
  static async findByConversationId(conId: string): Promise<IAppointment[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await firestore
        .collection(this.collection)
        .where('con_id', '==', conId)
        .orderBy('appointment_time', 'desc')
        .limit(100)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appointment_time: doc.data()?.appointment_time?.toDate() || new Date(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
        reminders: doc.data()?.reminders?.map((r: any) => ({
          ...r,
          sent_at: r.sent_at?.toDate() || undefined,
        })) || [],
      })) as IAppointment[];
    } catch (error: any) {
      console.error('Error finding appointments:', error);
      return [];
    }
  }

  /**
   * Lấy appointments của một user (tham gia)
   */
  static async findByUserId(userId: string): Promise<IAppointment[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await firestore
        .collection(this.collection)
        .where('participants', 'array-contains', { user_id: userId })
        .orderBy('appointment_time', 'asc')
        .limit(100)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appointment_time: doc.data()?.appointment_time?.toDate() || new Date(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
        reminders: doc.data()?.reminders?.map((r: any) => ({
          ...r,
          sent_at: r.sent_at?.toDate() || undefined,
        })) || [],
      })) as IAppointment[];
    } catch (error: any) {
      console.error('Error finding user appointments:', error);
      return [];
    }
  }

  /**
   * Lấy appointments cần gửi reminder (chưa gửi và đến giờ gửi)
   */
  static async findPendingReminders(): Promise<Array<{ appointment: IAppointment; reminderIndex: number }>> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const now = new Date();
      const snapshot = await firestore
        .collection(this.collection)
        .where('status', '==', 'pending')
        .get();

      const pendingReminders: Array<{ appointment: IAppointment; reminderIndex: number }> = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const appointmentTime = data.appointment_time?.toDate();
        
        if (appointmentTime && appointmentTime > now) {
          const reminders = data.reminders || [];
          
          reminders.forEach((reminder: any, index: number) => {
            if (!reminder.sent) {
              // Tính thời gian cần gửi reminder
              const reminderTime = new Date(appointmentTime.getTime() - reminder.time_before * 60 * 1000);
              
              // Nếu đã đến giờ gửi reminder
              if (reminderTime <= now) {
                pendingReminders.push({
                  appointment: {
                    id: doc.id,
                    ...data,
                    appointment_time: appointmentTime,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    reminders: reminders.map((r: any) => ({
                      ...r,
                      sent_at: r.sent_at?.toDate() || undefined,
                    })),
                  } as IAppointment,
                  reminderIndex: index,
                });
              }
            }
          });
        }
      });

      return pendingReminders;
    } catch (error: any) {
      console.error('Error finding pending reminders:', error);
      return [];
    }
  }

  /**
   * Cập nhật appointment
   */
  static async update(id: string, updates: Partial<Omit<IAppointment, 'id' | 'createdAt'>>): Promise<IAppointment> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    // Loại bỏ các trường undefined
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Chỉ thêm các trường có giá trị (loại bỏ undefined và null)
    if (updates.title !== undefined && updates.title !== null) updateData.title = updates.title;
    if (updates.description !== undefined && updates.description !== null && updates.description !== '') updateData.description = updates.description;
    if (updates.location !== undefined && updates.location !== null && updates.location !== '') updateData.location = updates.location;
    if (updates.creator_id !== undefined) updateData.creator_id = updates.creator_id;
    if (updates.creator_name !== undefined) updateData.creator_name = updates.creator_name;
    if (updates.participants !== undefined) updateData.participants = updates.participants;
    if (updates.reminders !== undefined) updateData.reminders = updates.reminders;
    if (updates.repeat_type !== undefined) updateData.repeat_type = updates.repeat_type;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.con_id !== undefined) updateData.con_id = updates.con_id;

    // Convert Date to Firestore Timestamp
    if (updates.appointment_time) {
      updateData.appointment_time = admin.firestore.Timestamp.fromDate(updates.appointment_time);
    }

    await firestore.collection(this.collection).doc(id).update(updateData);

    const updatedDoc = await firestore.collection(this.collection).doc(id).get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      appointment_time: updatedDoc.data()?.appointment_time?.toDate() || new Date(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
      reminders: updatedDoc.data()?.reminders?.map((r: any) => ({
        ...r,
        sent_at: r.sent_at?.toDate() || undefined,
      })) || [],
    } as IAppointment;
  }

  /**
   * Đánh dấu reminder đã gửi
   */
  static async markReminderAsSent(id: string, reminderIndex: number): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const appointment = await this.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const reminders = [...appointment.reminders];
    if (reminders[reminderIndex]) {
      reminders[reminderIndex].sent = true;
      reminders[reminderIndex].sent_at = new Date();
    }

    await firestore.collection(this.collection).doc(id).update({
      reminders,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Xóa appointment
   */
  static async delete(id: string): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    await firestore.collection(this.collection).doc(id).delete();
  }
}
