import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import {
  LoginDto,
  GoogleLoginDto,
  AuthResponseDto,
  RegisterDto,
} from "../dto/auth.dto";

const authService = new AuthService();

export class AuthController {
  /**
   * Đăng nhập với email/password
   */
  async login(req: Request, res: Response) {
    try {
      const loginDto: LoginDto = req.body;

      // Validate input
      if (!loginDto.email || !loginDto.password) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập email và mật khẩu",
        } as AuthResponseDto);
      }

      const result = await authService.loginWithEmail(loginDto);

      return res.status(200).json({
        success: true,
        message: "Đăng nhập thành công",
        data: result,
      } as AuthResponseDto);
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || "Đăng nhập thất bại",
      } as AuthResponseDto);
    }
  }

  /**
   * Đăng nhập với Google (Firebase ID token)
   */
  async googleLogin(req: Request, res: Response) {
    try {
      const googleLoginDto: GoogleLoginDto = req.body;

      // Validate input
      if (
        !googleLoginDto.idToken ||
        !googleLoginDto.email ||
        !googleLoginDto.name
      ) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin đăng nhập Google",
        } as AuthResponseDto);
      }

      const result = await authService.loginWithGoogle(googleLoginDto);

      return res.status(200).json({
        success: true,
        message: "Đăng nhập Google thành công",
        data: result,
      } as AuthResponseDto);
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || "Đăng nhập Google thất bại",
      } as AuthResponseDto);
    }
  }
  async register(req: Request, res: Response) {
    try {
      const registerDto: RegisterDto = req.body;

      if (!registerDto.email || !registerDto.password || !registerDto.name) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập đủ email, mật khẩu và tên",
        });
      }

      const result = await authService.registerWithEmail(registerDto);

      return res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Đăng ký thất bại",
      });
    }
  }
  async sendOtp(req: Request, res: Response) {
    try {
      const email = req.body.email;
      if (!email)
        return res
          .status(400)
          .json({ success: false, message: "Email thiếu!" });

      const result = await authService.sendOtp(email);

      return res.json({ success: true, message: "OTP đã gửi", data: result });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message });
    }
  }
  async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOtp(email, otp);
      return res.json({ success: true, message: "Xác thực thành công" });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message });
    }
  }
  async registerFinal(req: Request, res: Response) {
    try {
      const { email, username, password } = req.body;

      const result = await authService.registerFinal({
        email,
        username,
        password,
      });

      return res.status(201).json({
        success: true,
        message: "Tạo tài khoản thành công",
        data: result,
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message });
    }
  }
}
