import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto, GoogleLoginDto, AuthResponseDto, ForgotPasswordDto, VerifyOTPDto, ResetPasswordDto } from '../dto/auth.dto';

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
          message: 'Vui lòng nhập email và mật khẩu',
        } as AuthResponseDto);
      }

      const result = await authService.loginWithEmail(loginDto);

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result,
      } as AuthResponseDto);
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Đăng nhập thất bại',
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
      if (!googleLoginDto.idToken || !googleLoginDto.email || !googleLoginDto.name) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin đăng nhập Google',
        } as AuthResponseDto);
      }

      const result = await authService.loginWithGoogle(googleLoginDto);

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập Google thành công',
        data: result,
      } as AuthResponseDto);
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Đăng nhập Google thất bại',
      } as AuthResponseDto);
    }
  }

  /**
   * Yêu cầu đặt lại mật khẩu (gửi OTP)
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const forgotPasswordDto: ForgotPasswordDto = req.body

      if (!forgotPasswordDto.email) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập email",
        })
      }

      const result = await authService.requestPasswordReset(forgotPasswordDto)

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Yêu cầu đặt lại mật khẩu thất bại",
      })
    }
  }

  /**
   * Xác thực OTP
   */
  async verifyOTP(req: Request, res: Response) {
    try {
      const verifyOTPDto: VerifyOTPDto = req.body

      if (!verifyOTPDto.email || !verifyOTPDto.otp) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập email và mã OTP",
        })
      }

      const result = await authService.verifyOTP(verifyOTPDto)

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Xác thực OTP thất bại",
      })
    }
  }

  /**
   * Đặt lại mật khẩu
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const resetPasswordDto: ResetPasswordDto = req.body

      if (!resetPasswordDto.email || !resetPasswordDto.otp || !resetPasswordDto.newPassword) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp đầy đủ thông tin",
        })
      }

      const result = await authService.resetPassword(resetPasswordDto)

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Đặt lại mật khẩu thất bại",
      })
    }
  }
}


