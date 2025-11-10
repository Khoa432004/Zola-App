import { Account, IAccount } from "../models/Account";
import { LoginDto, GoogleLoginDto, RegisterDto, ForgotPasswordDto, VerifyOTPDto, ResetPasswordDto } from "../dto/auth.dto";
import { generateToken } from "../utils/jwt";
import { adminAuth, firestore } from "../config/firebase-admin";
import nodemailer from "nodemailer";
import { generateOTP, getOTPExpiry, isOTPValid } from "../utils/otp";
import { EmailService } from "./email.service";

const emailService = new EmailService()

export class AuthService {
  /**
   * Đăng nhập với email/password
   */
  async loginWithEmail(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find account by email
    const account = await Account.findByEmail(email);
    if (!account) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    // Check if account uses email provider
    if (account.provider !== "email") {
      throw new Error("Tài khoản này sử dụng đăng nhập Google");
    }

    // Check if password exists
    if (!account.password) {
      throw new Error("Tài khoản chưa được thiết lập mật khẩu");
    }

    // Verify password
    const isPasswordValid = await Account.comparePassword(
      account.password,
      password
    );
    if (!isPasswordValid) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    // Generate JWT token
    const token = generateToken({
      userId: account.id,
      email: account.email,
    });

    return {
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        avatar: account.avatar,
      },
      token,
    };
  }

  /**
   * Đăng nhập với Google (Firebase ID token)
   */
  async loginWithGoogle(googleLoginDto: GoogleLoginDto) {
    const { idToken, email, name, avatar } = googleLoginDto;

    try {
      // Verify Firebase Admin đã được khởi tạo
      if (!adminAuth) {
        throw new Error(
          "Firebase Admin chưa được khởi tạo. Vui lòng cấu hình Firebase Admin SDK."
        );
      }

      // Verify ID token từ Firebase
      let decodedToken;
      try {
        // Decode token để kiểm tra project ID
        const tokenParts = idToken.split(".");
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(
              Buffer.from(tokenParts[1], "base64").toString()
            );
            // Kiểm tra project ID có khớp không
            if (
              payload.aud &&
              payload.aud !== process.env.FIREBASE_PROJECT_ID
            ) {
              throw new Error(
                `Project ID không khớp! Token từ project: ${payload.aud}, Backend đang dùng: ${process.env.FIREBASE_PROJECT_ID}.`
              );
            }
          } catch (decodeError) {
            // Ignore decode errors, will be caught by verifyIdToken
          }
        }

        // Verify token với Firebase Admin
        decodedToken = await adminAuth.verifyIdToken(idToken, true);
      } catch (verifyError: any) {
        // Xử lý các lỗi cụ thể
        if (verifyError.code === "auth/argument-error") {
          throw new Error("ID token không hợp lệ. Vui lòng đăng nhập lại.");
        } else if (verifyError.code === "auth/id-token-expired") {
          throw new Error("ID token đã hết hạn. Vui lòng đăng nhập lại.");
        } else if (verifyError.code === "auth/id-token-revoked") {
          throw new Error("ID token đã bị thu hồi. Vui lòng đăng nhập lại.");
        } else if (
          verifyError.code === "auth/project-not-found" ||
          verifyError.code === 5 ||
          verifyError.message?.includes("NOT_FOUND")
        ) {
          throw new Error(
            `Không tìm thấy Firebase project. Vui lòng kiểm tra cấu hình.`
          );
        } else {
          throw new Error(
            `Xác thực thất bại: ${verifyError.message || verifyError.code}`
          );
        }
      }

      const googleId = decodedToken.uid;

      // Tìm hoặc tạo account
      let account;
      try {
        account = await Account.findByEmailOrGoogleId(email, googleId);
      } catch (findError: any) {
        throw new Error(`Lỗi khi tìm kiếm account: ${findError.message}`);
      }

      if (account) {
        // Cập nhật account nếu đã tồn tại
        try {
          account = await Account.update(account.id, {
            googleId,
            name,
            avatar,
            provider: "google",
          });
        } catch (updateError: any) {
          throw new Error(`Lỗi khi cập nhật account: ${updateError.message}`);
        }
      } else {
        // Tạo account mới
        try {
          account = await Account.create({
            email: email.toLowerCase(),
            name,
            avatar,
            provider: "google",
            googleId,
          });
        } catch (createError: any) {
          throw new Error(`Lỗi khi tạo account: ${createError.message}`);
        }
      }

      // Tạo JWT token
      const token = generateToken({
        userId: account.id,
        email: account.email,
      });

      return {
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
          avatar: account.avatar,
        },
        token,
      };
    } catch (error: any) {
      // If error is already formatted, re-throw it
      if (
        (error.message && error.message.includes("Xác thực thất bại")) ||
        error.message.includes("ID token")
      ) {
        throw error;
      }
      throw new Error("Xác thực Google thất bại: " + error.message);
    }
  }

  async registerWithEmail(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    const existing = await Account.findByEmail(email);
    if (existing) {
      throw new Error("Email đã được sử dụng!");
    }

    const account = await Account.create({
      email: email.toLowerCase(),
      password,
      name,
      provider: "email",
    });

    const token = generateToken({
      userId: account.id,
      email: account.email,
    });

    return {
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        avatar: account.avatar,
      },
      token,
    };
  }
  async registerFinal(dto: {
    email: string;
    username: string;
    password: string;
  }) {
    const exists = await Account.findByEmail(dto.email);
    if (exists) throw new Error("Email đã tồn tại");

    const user = await Account.create({
      email: dto.email,
      name: dto.username,
      password: dto.password,
      provider: "email",
    });

    return user;
  }
  async sendOtp(email: string) {
    console.log("✅ [SEND OTP] Request:", email);

    // ✅ Kiểm tra Firestore đã khởi tạo
    if (!firestore) {
      console.error("❌ Firestore chưa được khởi tạo!");
      throw new Error("Lỗi hệ thống! Không thể kết nối Firestore");
    }

    try {
      const db = firestore; // ✅ Không còn null
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const now = Date.now();

      // ✅ Lưu OTP vào Firestore
      await db
        .collection("otp")
        .doc(email)
        .set({
          otp,
          expireAt: now + 2 * 60 * 1000, // 2 phút
          lastSent: now,
        });

      console.log("✅ [SEND OTP] OTP Generated:", otp);

      // ✅ Gửi email bằng Gmail
      const emailUser = process.env.EMAIL_USER || process.env.MAIL_USER;
      const emailPassword = process.env.EMAIL_PASSWORD || process.env.MAIL_PASS;

      if (!emailUser || !emailPassword) {
        throw new Error("Thiếu cấu hình EMAIL_USER/EMAIL_PASSWORD");
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });

      await transporter.sendMail({
        from: emailUser,
        to: email,
        subject: "Mã OTP Zola",
        text: `Mã OTP của bạn là: ${otp}`,
      });

      console.log("✅ [SEND OTP] Email Sent Successfully");

      return true;
    } catch (err: any) {
      console.error("❌ [SEND OTP ERROR]", err);
      throw new Error(err.message || "Không gửi được OTP");
    }
  }

  async verifyOtp(email: string, otp: string) {
    // ✅ Kiểm tra Firestore
    if (!firestore) {
      console.error("❌ Firestore chưa được khởi tạo!");
      throw new Error("Lỗi hệ thống! Không thể kết nối Firestore");
    }

    const db = firestore;

    const docRef = db.collection("otp").doc(email);
    const doc = await docRef.get();

    if (!doc.exists) throw new Error("OTP không tồn tại");

    const data = doc.data();
    if (!data) throw new Error("OTP không hợp lệ");

    // ✅ Sai OTP
    if (data.otp !== otp) throw new Error("OTP sai");

    // ✅ Hết hạn
    if (Date.now() > data.expireAt) {
      await docRef.delete();
      throw new Error("OTP hết hạn");
    }

    // ✅ Xác thực thành công → xóa luôn
    await docRef.delete();
    return true;
  }

  /**
   * Yêu cầu đặt lại mật khẩu - Gửi OTP
   */
  async requestPasswordReset(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Tìm account theo email
    const account = await Account.findByEmail(email);
    if (!account) {
      throw new Error("Email không tồn tại trong hệ thống");
    }

    // Kiểm tra provider
    if (account.provider !== "email") {
      throw new Error("Tài khoản này sử dụng đăng nhập Google, không thể đặt lại mật khẩu");
    }

    const MAX_SEND_ATTEMPTS = 3;
    if ((account.otpSendAttempts || 0) >= MAX_SEND_ATTEMPTS) {
      throw new Error(`Bạn đã vượt quá số lần gửi OTP. Vui lòng thử lại sau 1 giờ hoặc liên hệ hỗ trợ.`);
    }

    // Tạo OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Lưu OTP vào database
    await Account.updateOTP(email, otp, otpExpiry);

    // Gửi OTP qua email
    await emailService.sendOTP(email, otp);

    return {
      message: "Mã xác thực đã được gửi đến email của bạn",
      email,
      sendAttempts: (account.otpSendAttempts || 0) + 1,
      maxSendAttempts: MAX_SEND_ATTEMPTS,
    };
  }

  /**
   * Xác thực OTP
   */
  async verifyOTP(verifyOTPDto: VerifyOTPDto) {
    const { email, otp } = verifyOTPDto;

    // Tìm account theo email
    const account = await Account.findByEmail(email);
    if (!account) {
      throw new Error("Email không tồn tại");
    }

    console.log("Verifying OTP - Email:", email, "Stored OTP:", account.otp, "Input OTP:", otp);

    const MAX_OTP_ATTEMPTS = 5;
    if ((account.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      throw new Error("Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng gửi lại mã OTP.");
    }

    // Kiểm tra OTP
    if (!account.otp) {
      throw new Error("Không có OTP nào được gửi cho email này");
    }

    console.log("OTP Expiry from DB:", account.otpExpiry, "Type:", typeof account.otpExpiry);

    // Kiểm tra OTP hết hạn
    if (!account.otpExpiry || !isOTPValid(account.otpExpiry)) {
      console.log("OTP Expired - Expiry:", account.otpExpiry);
      await Account.clearOTP(email);
      throw new Error("Mã xác thực đã hết hạn, vui lòng yêu cầu mã mới");
    }

    // So sánh OTP
    if (account.otp !== otp) {
      const newAttempts = await Account.incrementOTPAttempts(email);
      const remainingAttempts = MAX_OTP_ATTEMPTS - newAttempts;

      if (remainingAttempts <= 0) {
        throw new Error("Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng gửi lại mã OTP.");
      }

      throw new Error(`Mã xác thực không chính xác. Còn ${remainingAttempts} lần thử.`);
    }

    console.log("OTP Verification Success");

    return {
      message: "Xác thực OTP thành công",
      verified: true,
    };
  }

  /**
   * Đặt lại mật khẩu
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword, confirmPassword } = resetPasswordDto;

    // Kiểm tra password khớp
    if (newPassword !== confirmPassword) {
      throw new Error("Mật khẩu xác nhận không khớp");
    }

    // Kiểm tra độ dài password
    if (newPassword.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // Verify OTP trước
    await this.verifyOTP({ email, otp });

    const account = await Account.findByEmail(email);
    if (!account) {
      throw new Error("Account không tồn tại");
    }

    console.log("Resetting password - Account ID:", account.id, "Email:", email);
    
    // Cập nhật password
    await Account.update(account.id, { password: newPassword });

    // Xóa OTP
    await Account.clearOTP(email);

    return {
      message: "Mật khẩu đã được đặt lại thành công",
      success: true,
    };
  }
}