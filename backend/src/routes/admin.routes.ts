import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Lấy thông tin dashboard (chỉ admin)
 * @access  Private (Admin only)
 */
router.get('/dashboard', authenticate, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Admin Dashboard',
    data: {
      info: 'Đây là trang dành cho admin',
      user: req.user,
    },
  });
});

/**
 * @route   GET /api/admin/users
 * @desc    Lấy danh sách tất cả user (chỉ admin)
 * @access  Private (Admin only)
 */
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    // TODO: Implement get all users logic
    res.json({
      success: true,
      message: 'Danh sách user',
      data: {
        users: [],
        total: 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server',
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Xóa user (chỉ admin)
 * @access  Private (Admin only)
 */
router.delete('/users/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Implement delete user logic
    res.json({
      success: true,
      message: `User ${userId} đã được xóa`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server',
    });
  }
});

export default router;
