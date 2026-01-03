import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { MemoryService } from '../services/memory.service';

export class MemoryController {
  private memoryService: MemoryService;

  constructor() {
    this.memoryService = new MemoryService();
  }
  /**
   * Lấy tất cả kỷ niệm của user hiện tại
   */
  getMyMemories = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const memories = await this.memoryService.getMemoriesByUserId(userId);

      return res.json({
        success: true,
        data: memories,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách kỷ niệm',
      });
    }
  };

  /**
   * Lấy kỷ niệm của user khác (nếu được phép)
   */
  getUserMemories = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { userId } = req.params;
      const currentUserId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;

      const result = await this.memoryService.getUserMemoriesWithPermission(userId, currentUserId);

      if (!result.canAccess) {
        const status = result.message === 'Người dùng không tồn tại' ? 404 : 403;
        return res.status(status).json({
          success: false,
          message: result.message,
        });
      }

      return res.json({
        success: true,
        data: result.memories,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách kỷ niệm',
      });
    }
  };

  /**
   * Lấy kỷ niệm sắp tới
   */
  getUpcomingMemories = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const days = parseInt(req.query.days as string) || 30;
      const memories = await this.memoryService.getUpcomingMemories(userId, days);

      return res.json({
        success: true,
        data: memories,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy kỷ niệm sắp tới',
      });
    }
  };

  /**
   * Tạo kỷ niệm mới
   */
  createMemory = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const { title, description, date } = req.body;
      const file = (req.file as Express.Multer.File) || null;

      if (!title || !date) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tiêu đề và ngày kỷ niệm',
        });
      }

      const memoryDate = new Date(date);
      if (isNaN(memoryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Ngày kỷ niệm không hợp lệ',
        });
      }

      const memory = await this.memoryService.createMemory({
        userId,
        title,
        description,
        date: memoryDate,
        file: file || undefined,
      });

      return res.json({
        success: true,
        data: memory,
        message: 'Tạo kỷ niệm thành công',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo kỷ niệm',
      });
    }
  };

  /**
   * Cập nhật kỷ niệm
   */
  updateMemory = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { memoryId } = req.params;
      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const file = (req.file as Express.Multer.File) || null;

      const updates: any = {};
      if (req.body.title) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.date) {
        const memoryDate = new Date(req.body.date);
        if (isNaN(memoryDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Ngày kỷ niệm không hợp lệ',
          });
        }
        updates.date = memoryDate;
      }
      if (file) {
        updates.file = file;
      }

      const updatedMemory = await this.memoryService.updateMemory(memoryId, userId, updates);

      return res.json({
        success: true,
        data: updatedMemory,
        message: 'Cập nhật kỷ niệm thành công',
      });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 
                    : error.message.includes('không có quyền') ? 403 
                    : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật kỷ niệm',
      });
    }
  };

  /**
   * Xóa kỷ niệm
   */
  deleteMemory = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { memoryId } = req.params;
      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;

      await this.memoryService.deleteMemory(memoryId, userId);

      return res.json({
        success: true,
        message: 'Xóa kỷ niệm thành công',
      });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 
                    : error.message.includes('không có quyền') ? 403 
                    : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi khi xóa kỷ niệm',
      });
    }
  };

  /**
   * Gửi email thông báo kỷ niệm sắp tới (cron job hoặc manual trigger)
   */
  sendMemoryNotifications = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const result = await this.memoryService.sendMemoryNotifications(userId);

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi khi gửi email thông báo',
      });
    }
  };
}