import { Appointment, IAppointment, IAppointmentParticipant, IAppointmentReminder } from '../models/Appointment';
import { Account } from '../models/User';
import { Conversation } from '../models/Conversation';
import { CreateAppointmentDto, UpdateAppointmentDto, AppointmentResponseDto } from '../dto/appointment.dto';
import nodemailer from 'nodemailer';

export class AppointmentService {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    // Khởi tạo email transporter
    const emailUser = process.env.EMAIL_USER || process.env.MAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.MAIL_PASS;

    if (emailUser && emailPassword) {
      this.emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
    } else {
      console.warn('Email credentials not configured. Email notifications will be disabled.');
    }
  }

  /**
   * Tạo appointment mới
   */
  async createAppointment(userId: string, data: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    try {
      // Lấy thông tin người tạo
      const creator = await Account.findById(userId);
      if (!creator) {
        throw new Error('User không tồn tại');
      }

      // Kiểm tra conversation tồn tại
      const conversation = await Conversation.findByConId(data.con_id);
      if (!conversation) {
        throw new Error('Conversation không tồn tại');
      }

      // Kiểm tra user có trong conversation không
      const isMember = conversation.members.some(m => m.user_id === userId);
      if (!isMember) {
        throw new Error('Bạn không có quyền tạo cuộc hẹn trong conversation này');
      }

      // Lấy thông tin các participants
      const participants: IAppointmentParticipant[] = [];
      for (const participantId of data.participant_ids) {
        const user = await Account.findById(participantId);
        if (user) {
          participants.push({
            user_id: user.id,
            user_name: user.name,
            user_email: user.email,
            user_avatar: user.avatar,
          });
        }
      }

      if (participants.length === 0) {
        throw new Error('Không tìm thấy người tham gia hợp lệ');
      }

      // Tạo reminders
      const reminders: IAppointmentReminder[] = data.reminder_times.map(time => ({
        time_before: time,
        sent: false,
      }));

      // Tạo appointment
      const appointment = await Appointment.create({
        con_id: data.con_id,
        title: data.title,
        description: data.description,
        appointment_time: new Date(data.appointment_time),
        location: data.location,
        creator_id: userId,
        creator_name: creator.name,
        participants,
        reminders,
        repeat_type: data.repeat_type || 'none',
      });

      // Gửi email thông báo tạo cuộc hẹn
      await this.sendAppointmentCreatedEmail(appointment);

      return this.toResponseDto(appointment);
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      throw new Error(error.message || 'Không thể tạo cuộc hẹn');
    }
  }

  /**
   * Lấy danh sách appointments của một conversation
   */
  async getConversationAppointments(userId: string, conId: string): Promise<AppointmentResponseDto[]> {
    try {
      // Kiểm tra user có trong conversation không
      const conversation = await Conversation.findByConId(conId);
      if (!conversation) {
        throw new Error('Conversation không tồn tại');
      }

      const isMember = conversation.members.some(m => m.user_id === userId);
      if (!isMember) {
        throw new Error('Bạn không có quyền xem cuộc hẹn trong conversation này');
      }

      const appointments = await Appointment.findByConversationId(conId);
      return appointments.map(apt => this.toResponseDto(apt));
    } catch (error: any) {
      console.error('Error getting conversation appointments:', error);
      throw new Error(error.message || 'Không thể lấy danh sách cuộc hẹn');
    }
  }

  /**
   * Lấy chi tiết một appointment
   */
  async getAppointmentById(userId: string, appointmentId: string): Promise<AppointmentResponseDto> {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new Error('Cuộc hẹn không tồn tại');
      }

      // Kiểm tra quyền truy cập
      const isParticipant = appointment.participants.some(p => p.user_id === userId);
      const isCreator = appointment.creator_id === userId;
      if (!isParticipant && !isCreator) {
        throw new Error('Bạn không có quyền xem cuộc hẹn này');
      }

      return this.toResponseDto(appointment);
    } catch (error: any) {
      console.error('Error getting appointment:', error);
      throw new Error(error.message || 'Không thể lấy thông tin cuộc hẹn');
    }
  }

  /**
   * Cập nhật appointment
   */
  async updateAppointment(userId: string, appointmentId: string, data: UpdateAppointmentDto): Promise<AppointmentResponseDto> {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new Error('Cuộc hẹn không tồn tại');
      }

      // Chỉ creator mới có quyền cập nhật
      if (appointment.creator_id !== userId) {
        throw new Error('Chỉ người tạo mới có quyền cập nhật cuộc hẹn');
      }

      const updateData: any = {};

      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.repeat_type) updateData.repeat_type = data.repeat_type;
      if (data.status) updateData.status = data.status;

      if (data.appointment_time) {
        updateData.appointment_time = new Date(data.appointment_time);
      }

      if (data.participant_ids) {
        const participants: IAppointmentParticipant[] = [];
        for (const participantId of data.participant_ids) {
          const user = await Account.findById(participantId);
          if (user) {
            participants.push({
              user_id: user.id,
              user_name: user.name,
              user_email: user.email,
              user_avatar: user.avatar,
            });
          }
        }
        updateData.participants = participants;
      }

      if (data.reminder_times) {
        const reminders: IAppointmentReminder[] = data.reminder_times.map(time => ({
          time_before: time,
          sent: false,
        }));
        updateData.reminders = reminders;
      }

      const updatedAppointment = await Appointment.update(appointmentId, updateData);
      return this.toResponseDto(updatedAppointment);
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      throw new Error(error.message || 'Không thể cập nhật cuộc hẹn');
    }
  }

  /**
   * Xóa appointment
   */
  async deleteAppointment(userId: string, appointmentId: string): Promise<void> {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new Error('Cuộc hẹn không tồn tại');
      }

      // Chỉ creator mới có quyền xóa
      if (appointment.creator_id !== userId) {
        throw new Error('Chỉ người tạo mới có quyền xóa cuộc hẹn');
      }

      await Appointment.delete(appointmentId);
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      throw new Error(error.message || 'Không thể xóa cuộc hẹn');
    }
  }

  /**
   * Xử lý gửi reminders (được gọi định kỳ bởi scheduler)
   */
  async processReminders(): Promise<void> {
    try {
      const pendingReminders = await Appointment.findPendingReminders();
      
      for (const { appointment, reminderIndex } of pendingReminders) {
        try {
          await this.sendReminderEmail(appointment, reminderIndex);
          await Appointment.markReminderAsSent(appointment.id, reminderIndex);
          console.log(`Reminder sent for appointment ${appointment.id}, reminder ${reminderIndex}`);
        } catch (error) {
          console.error(`Error sending reminder for appointment ${appointment.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }

  /**
   * Gửi email thông báo tạo cuộc hẹn
   */
  private async sendAppointmentCreatedEmail(appointment: IAppointment): Promise<void> {
    if (!this.emailTransporter) {
      console.warn('Email transporter not configured, skipping email notification');
      return;
    }

    try {
      const appointmentDate = appointment.appointment_time;
      const formattedDate = this.formatDateTime(appointmentDate);

      const participantEmails = appointment.participants.map(p => p.user_email).filter(Boolean);
      if (participantEmails.length === 0) {
        console.warn('No participant emails found');
        return;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER || process.env.MAIL_USER,
        to: participantEmails.join(','),
        subject: `Cuộc hẹn mới: ${appointment.title}`,
        html: this.generateAppointmentEmailTemplate(appointment, 'created'),
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Appointment created email sent to ${participantEmails.length} participants`);
    } catch (error) {
      console.error('Error sending appointment created email:', error);
    }
  }

  /**
   * Gửi email nhắc nhở cuộc hẹn
   */
  private async sendReminderEmail(appointment: IAppointment, reminderIndex: number): Promise<void> {
    if (!this.emailTransporter) {
      console.warn('Email transporter not configured, skipping reminder email');
      return;
    }

    try {
      const reminder = appointment.reminders[reminderIndex];
      const participantEmails = appointment.participants.map(p => p.user_email).filter(Boolean);
      
      if (participantEmails.length === 0) {
        console.warn('No participant emails found');
        return;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER || process.env.MAIL_USER,
        to: participantEmails.join(','),
        subject: `Nhắc nhở: ${appointment.title} - Còn ${reminder.time_before} phút nữa`,
        html: this.generateAppointmentEmailTemplate(appointment, 'reminder', reminder.time_before),
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Reminder email sent to ${participantEmails.length} participants`);
    } catch (error) {
      console.error('Error sending reminder email:', error);
    }
  }

  /**
   * Template email cho cuộc hẹn
   */
  private generateAppointmentEmailTemplate(appointment: IAppointment, type: 'created' | 'reminder', timeBefore?: number): string {
    const formattedDate = this.formatDateTime(appointment.appointment_time);
    const participantNames = appointment.participants.map(p => p.user_name).join(', ');

    const title = type === 'created' 
      ? `Cuộc hẹn mới được tạo` 
      : `Nhắc nhở: Cuộc hẹn sắp diễn ra`;

    const timeInfo = type === 'reminder' && timeBefore 
      ? `<p style="color: #ff5722; font-weight: bold; font-size: 18px; text-align: center;">
           ⏰ Còn ${timeBefore} phút nữa!
         </p>` 
      : '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; text-align: center; margin: 0;">📅 ${title}</h2>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
          ${timeInfo}
          
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
              ${appointment.title}
            </h3>
            
            ${appointment.description ? `
              <p style="color: #666; font-size: 15px; line-height: 1.6;">
                ${appointment.description}
              </p>
            ` : ''}
            
            <div style="margin: 20px 0;">
              <p style="margin: 10px 0;">
                <strong style="color: #667eea;">🕐 Thời gian:</strong>
                <span style="color: #333; margin-left: 10px;">${formattedDate}</span>
              </p>
              
              ${appointment.location ? `
                <p style="margin: 10px 0;">
                  <strong style="color: #667eea;">📍 Địa điểm:</strong>
                  <span style="color: #333; margin-left: 10px;">${appointment.location}</span>
                </p>
              ` : ''}
              
              <p style="margin: 10px 0;">
                <strong style="color: #667eea;">👤 Người tạo:</strong>
                <span style="color: #333; margin-left: 10px;">${appointment.creator_name}</span>
              </p>
              
              <p style="margin: 10px 0;">
                <strong style="color: #667eea;">👥 Người tham gia:</strong>
                <span style="color: #333; margin-left: 10px;">${participantNames}</span>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 13px;">
              Email này được gửi tự động từ hệ thống Zola
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format date time sang định dạng dễ đọc
   */
  private formatDateTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    };
    return date.toLocaleString('vi-VN', options);
  }

  /**
   * Convert IAppointment to ResponseDto
   */
  private toResponseDto(appointment: IAppointment): AppointmentResponseDto {
    return {
      id: appointment.id,
      con_id: appointment.con_id,
      title: appointment.title,
      description: appointment.description,
      appointment_time: appointment.appointment_time.toISOString(),
      location: appointment.location,
      creator_id: appointment.creator_id,
      creator_name: appointment.creator_name,
      participants: appointment.participants,
      reminders: appointment.reminders,
      repeat_type: appointment.repeat_type,
      status: appointment.status,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    };
  }
}
