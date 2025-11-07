import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();
const authController = new AuthController();

// Routes
router.post("/login", (req, res) => authController.login(req, res)); // Đăng nhập email/password
router.post("/google", (req, res) => authController.googleLogin(req, res)); // Đăng nhập Google
// Gửi OTP
router.post("/send-otp", (req, res) => authController.sendOtp(req, res));

// Xác minh OTP
router.post("/verify-otp", (req, res) => authController.verifyOtp(req, res));

// Đăng ký tài khoản sau khi verify OTP
router.post("/register-final", (req, res) =>
  authController.registerFinal(req, res)
);
export default router;
