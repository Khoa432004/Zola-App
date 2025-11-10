import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// Routes
router.post('/login', (req, res) => authController.login(req, res)); // Đăng nhập email/password
router.post('/google', (req, res) => authController.googleLogin(req, res)); // Đăng nhập Google

router.post("/forgot-password", (req, res) => authController.forgotPassword(req, res))
router.post("/verify-otp", (req, res) => authController.verifyOTP(req, res))
router.post("/reset-password", (req, res) => authController.resetPassword(req, res))

export default router;


