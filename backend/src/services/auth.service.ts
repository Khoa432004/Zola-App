import { Account, IAccount } from "../models/Account";
import { LoginDto, GoogleLoginDto, RegisterDto } from "../dto/auth.dto";
import { generateToken } from "../utils/jwt";
import { adminAuth, firestore } from "../config/firebase-admin";
import nodemailer from "nodemailer";

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
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.MAIL_USER,
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
}
