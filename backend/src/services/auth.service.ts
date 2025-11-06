import { User, IUser } from '../models/User';
import { LoginDto, GoogleLoginDto } from '../dto/auth.dto';
import { generateToken } from '../utils/jwt';
import { adminAuth } from '../config/firebase-admin';

export class AuthService {
  /**
   * Đăng nhập với email/password
   */
  async loginWithEmail(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    // Check if user uses email provider
    if (user.provider !== 'email') {
      throw new Error('Tài khoản này sử dụng đăng nhập Google');
    }

    // Check if password exists
    if (!user.password) {
      throw new Error('Tài khoản chưa được thiết lập mật khẩu');
    }

    // Verify password
    const isPasswordValid = await User.comparePassword(user.password, password);
    if (!isPasswordValid) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
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
        throw new Error('Firebase Admin chưa được khởi tạo. Vui lòng cấu hình Firebase Admin SDK.');
      }

      // Verify ID token từ Firebase
      let decodedToken;
      try {
        // Decode token để kiểm tra project ID
        const tokenParts = idToken.split('.');
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            // Kiểm tra project ID có khớp không
            if (payload.aud && payload.aud !== process.env.FIREBASE_PROJECT_ID) {
              throw new Error(`Project ID không khớp! Token từ project: ${payload.aud}, Backend đang dùng: ${process.env.FIREBASE_PROJECT_ID}.`);
            }
          } catch (decodeError) {
            // Ignore decode errors, will be caught by verifyIdToken
          }
        }

        // Verify token với Firebase Admin
        decodedToken = await adminAuth.verifyIdToken(idToken, true);
      } catch (verifyError: any) {
        // Xử lý các lỗi cụ thể
        if (verifyError.code === 'auth/argument-error') {
          throw new Error('ID token không hợp lệ. Vui lòng đăng nhập lại.');
        } else if (verifyError.code === 'auth/id-token-expired') {
          throw new Error('ID token đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (verifyError.code === 'auth/id-token-revoked') {
          throw new Error('ID token đã bị thu hồi. Vui lòng đăng nhập lại.');
        } else if (verifyError.code === 'auth/project-not-found' || verifyError.code === 5 || verifyError.message?.includes('NOT_FOUND')) {
          throw new Error(`Không tìm thấy Firebase project. Vui lòng kiểm tra cấu hình.`);
        } else {
          throw new Error(`Xác thực thất bại: ${verifyError.message || verifyError.code}`);
        }
      }

      const googleId = decodedToken.uid;

      // Tìm hoặc tạo user
      let user;
      try {
        user = await User.findByEmailOrGoogleId(email, googleId);
      } catch (findError: any) {
        throw new Error(`Lỗi khi tìm kiếm user: ${findError.message}`);
      }

      if (user) {
        // Cập nhật user nếu đã tồn tại
        try {
          user = await User.update(user.id, {
            googleId,
            name,
            avatar,
            provider: 'google',
          });
        } catch (updateError: any) {
          throw new Error(`Lỗi khi cập nhật user: ${updateError.message}`);
        }
      } else {
        // Tạo user mới
        try {
          user = await User.create({
            email: email.toLowerCase(),
            name,
            avatar,
            provider: 'google',
            googleId,
          });
        } catch (createError: any) {
          throw new Error(`Lỗi khi tạo user: ${createError.message}`);
        }
      }

      // Tạo JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        token,
      };
    } catch (error: any) {
      // If error is already formatted, re-throw it
      if (error.message && error.message.includes('Xác thực thất bại') || error.message.includes('ID token')) {
        throw error;
      }
      throw new Error('Xác thực Google thất bại: ' + error.message);
    }
  }
}

