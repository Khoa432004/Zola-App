import { AppointmentService } from './appointment.service';

/**
 * Scheduler Service
 * Chạy các tác vụ định kỳ như gửi reminder emails
 */
export class SchedulerService {
  private appointmentService: AppointmentService;
  private reminderInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.appointmentService = new AppointmentService();
  }

  /**
   * Khởi động scheduler
   */
  start() {
    console.log('📅 Starting appointment reminder scheduler...');

    // Chạy mỗi 1 phút để kiểm tra reminders cần gửi
    this.reminderInterval = setInterval(async () => {
      try {
        await this.appointmentService.processReminders();
      } catch (error) {
        console.error('Error in reminder scheduler:', error);
      }
    }, 60 * 1000); // 1 phút

    // Chạy ngay lần đầu tiên
    this.appointmentService.processReminders().catch(error => {
      console.error('Error in initial reminder check:', error);
    });

    console.log('✅ Appointment reminder scheduler started');
  }

  /**
   * Dừng scheduler
   */
  stop() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
      console.log('🛑 Appointment reminder scheduler stopped');
    }
  }
}
