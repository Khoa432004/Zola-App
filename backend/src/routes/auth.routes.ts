import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();
const authController = new AuthController();

// Routes
router.post("/login", (req, res) => authController.login(req, res));
router.post("/google", (req, res) => authController.googleLogin(req, res));

// Gửi OTP
router.post("/send-otp", (req, res) => authController.sendOtp(req, res));

  // Xác minh OTP (for registration - từ Firestore)
router.post("/verify-otp", (req, res) => authController.verifyOtp(req, res));

// Xác minh OTP (for password reset - từ Account database)
router.post("/verify-otp-reset", (req, res) => authController.verifyOTP(req, res));

// Yêu cầu đặt lại mật khẩu
router.post("/forgot-password", (req, res) => authController.forgotPassword(req, res));

// Đặt lại mật khẩu
router.post("/reset-password", (req, res) => authController.resetPassword(req, res));

// Đăng ký tài khoản sau khi verify OTP
router.post("/register-final", (req, res) =>
  authController.registerFinal(req, res)
);

// Đăng xuất
router.post("/logout", (req, res) => authController.logout(req, res));

export default router;
