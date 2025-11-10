import nodemailer from "nodemailer"

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Cấu hình Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })
  }

  /**
   * Gửi email chứa OTP
   */
  async sendOTP(email: string, otp: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
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
}
