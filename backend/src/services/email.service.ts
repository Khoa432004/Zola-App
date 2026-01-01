import nodemailer from "nodemailer"

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Cấu hình Gmail SMTP
    const emailUser = process.env.EMAIL_USER || process.env.MAIL_USER
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.MAIL_PASS

    if (!emailUser || !emailPassword) {
      throw new Error("Thiếu cấu hình EMAIL_USER/EMAIL_PASSWORD cho EmailService")
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    })
  }

  /**
   * Gửi email chứa OTP
   */
  async sendOTP(email: string, otp: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || process.env.MAIL_USER,
        to: email,
        subject: "Mã xác thực đặt lại mật khẩu Zola",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; text-align: center;">Đặt Lại Mật Khẩu</h2>
              <p style="color: #666; font-size: 16px;">
                Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Zola của mình.
              </p>
              <div style="background-color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="color: #999; font-size: 14px; margin: 0 0 10px 0;">Mã xác thực của bạn là:</p>
                <p style="font-size: 32px; font-weight: bold; color: #4285f4; letter-spacing: 5px; margin: 0;">
                  ${otp}
                </p>
              </div>
              <p style="color: #666; font-size: 14px;">
                Mã này sẽ hết hạn sau <strong>10 phút</strong>.
              </p>
              <p style="color: #999; font-size: 12px;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
              </p>
            </div>
          </div>
        `,
      }

      await this.transporter.sendMail(mailOptions)
      return true
    } catch (error: any) {
      console.error("Email send error:", error)
      throw new Error("Không thể gửi email. Vui lòng thử lại sau.")
    }
  }

  /**
   * Gửi email thông báo kỷ niệm sắp tới
   */
  async sendMemoryNotification(email: string, userName: string, memories: Array<{ title: string; date: Date }>): Promise<boolean> {
    console.log(`📧 [EMAIL] Preparing to send memory notification:`);
    console.log(`   - To: ${email}`);
    console.log(`   - User: ${userName}`);
    console.log(`   - Memories count: ${memories.length}`);
    console.log(`   - Memories:`, memories.map(m => ({ title: m.title, date: m.date.toISOString() })));
    
    try {
      const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('vi-VN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(date);
      };

      const memoryList = memories.map((memory, index) => {
        const daysUntil = Math.ceil((memory.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return `
          <div style="background-color: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #6366f1;">
            <h3 style="color: #333; margin: 0 0 5px 0; font-size: 18px;">${memory.title}</h3>
            <p style="color: #666; margin: 0; font-size: 14px;">
              📅 ${formatDate(memory.date)} ${daysUntil > 0 ? `(${daysUntil} ngày nữa)` : '(Hôm nay)'}
            </p>
          </div>
        `;
      }).join('');

      const mailOptions = {
        from: process.env.EMAIL_USER || process.env.MAIL_USER,
        to: email,
        subject: `🎉 Kỷ niệm sắp tới - Zola`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 28px;">🎉 Kỷ Niệm Sắp Tới</h1>
            </div>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                Xin chào <strong>${userName}</strong>,
              </p>
              <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
                Bạn có ${memories.length} kỷ niệm sắp tới:
              </p>
              ${memoryList}
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  Đây là email tự động từ Zola. Bạn có thể tắt thông báo này trong cài đặt.
                </p>
              </div>
            </div>
          </div>
        `,
      }

      console.log(`📧 [EMAIL] Sending email to ${email}...`);
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ [EMAIL] Email sent successfully!`);
      console.log(`   - Message ID: ${result.messageId}`);
      console.log(`   - Response: ${result.response}`);
      return true
    } catch (error: any) {
      console.error(`❌ [EMAIL] Memory notification email send error:`, error);
      console.error(`   - Error code: ${error.code}`);
      console.error(`   - Error message: ${error.message}`);
      console.error(`   - Error stack: ${error.stack}`);
      throw new Error("Không thể gửi email thông báo kỷ niệm.")
    }
  }
}
