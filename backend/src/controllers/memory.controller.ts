import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Memory, IMemory } from '../models/Memory';
import { Account } from '../models/Account';
import { EmailService } from '../services/email.service';
import { uploadFile } from '../utils/storage';

const emailService = new EmailService();

export class MemoryController {
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
      const memories = await Memory.findByUserId(userId);

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

      // Nếu xem kỷ niệm của chính mình
      if (userId === currentUserId) {
        const memories = await Memory.findByUserId(userId);
        return res.json({
          success: true,
          data: memories,
        });
      }

      // Kiểm tra privacy settings
      const targetUser = await Account.findById(userId);
      if (!targetUser) {
        console.log(`❌ [MEMORY] User ${userId} not found`);
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại',
        });
      }

      console.log(`🔍 [MEMORY] Checking privacy for user ${userId}:`);
      console.log(`   - memoriesVisible: ${targetUser.memoriesVisible} (type: ${typeof targetUser.memoriesVisible})`);
      console.log(`   - Current user: ${currentUserId}`);
      console.log(`   - Is same user: ${userId === currentUserId}`);

      // Nếu user không cho phép xem kỷ niệm (mặc định là false/undefined = không cho xem)
      // Chỉ cho xem khi memoriesVisible === true
      if (targetUser.memoriesVisible !== true) {
        console.log(`🚫 [MEMORY] Access denied - memoriesVisible is not true`);
        return res.status(403).json({
          success: false,
          message: 'Người dùng này không cho phép xem kỷ niệm',
        });
      }

      console.log(`✅ [MEMORY] Access granted - memoriesVisible is true`);

      const memories = await Memory.findByUserId(userId);
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
      const memories = await Memory.findUpcoming(userId, days);

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

      let imageUrl = '';
      if (file) {
        try {
          const uploadResult = await uploadFile(file, `memories/${userId}`);
          imageUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Error uploading memory image:', uploadError);
        }
      }

      const memoryDate = new Date(date);
      if (isNaN(memoryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Ngày kỷ niệm không hợp lệ',
        });
      }

      const memory = await Memory.create({
        userId,
        title,
        description,
        date: memoryDate,
        imageUrl,
      });

      // Tự động gửi email thông báo nếu:
      // 1. User đã bật email notification
      // 2. Ngày kỷ niệm là hôm nay hoặc trong 7 ngày tới
      console.log(`📧 [MEMORY] Checking email notification for memory: ${memory.memoryId}`);
      try {
        const account = await Account.findById(userId);
        console.log(`📧 [MEMORY] Account found:`, {
          email: account?.email,
          name: account?.name,
          memoriesEmailNotification: account?.memoriesEmailNotification,
          type: typeof account?.memoriesEmailNotification,
        });

        if (!account) {
          console.log(`❌ [MEMORY] Account not found for userId: ${userId}`);
        } else if (account.memoriesEmailNotification === false) {
          console.log(`⏸️ [MEMORY] Email notification is disabled for user ${userId}`);
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          // Convert memoryDate to Date if it's a Firestore Timestamp
          const memoryDateObj = memoryDate instanceof Date 
            ? memoryDate 
            : (memoryDate as any)?.toDate 
              ? (memoryDate as any).toDate() 
              : new Date(memoryDate as any);
          const memoryDateOnly = new Date(memoryDateObj);
          memoryDateOnly.setHours(0, 0, 0, 0);
          
          const daysUntil = Math.ceil((memoryDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`📅 [MEMORY] Date calculation:`, {
            today: today.toISOString(),
            memoryDate: memoryDateOnly.toISOString(),
            daysUntil,
          });
          
          // Nếu kỷ niệm là hôm nay hoặc trong 7 ngày tới
          if (daysUntil >= 0 && daysUntil <= 7) {
            console.log(`📧 [MEMORY] Sending email notification to ${account.email}...`);
            try {
              // Gửi email thông báo
              await emailService.sendMemoryNotification(
                account.email,
                account.name,
                [{
                  title: memory.title,
                  date: memoryDate,
                }]
              );
              console.log(`✅ [MEMORY] Email sent successfully to ${account.email}`);
            } catch (emailSendError: any) {
              // Không throw error nếu gửi email thất bại, chỉ log warning
              // (có thể do giới hạn Gmail, lỗi network, etc.)
              console.warn(`⚠️ [MEMORY] Failed to send email notification (non-critical):`, emailSendError?.message || emailSendError);
              if (emailSendError?.responseCode === 550) {
                console.warn(`   ⚠️ Gmail daily sending limit exceeded. Email will be sent later or use a different email service.`);
              }
            }
          } else {
            console.log(`⏭️ [MEMORY] Memory is not within 7 days (${daysUntil} days away), skipping email`);
          }
        }
      } catch (emailError: any) {
        // Không throw error nếu gửi email thất bại, chỉ log
        console.warn(`⚠️ [MEMORY] Error in email notification process (non-critical):`, emailError?.message || emailError);
      }

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

      const memory = await Memory.findById(memoryId);
      if (!memory) {
        return res.status(404).json({
          success: false,
          message: 'Kỷ niệm không tồn tại',
        });
      }

      if (memory.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa kỷ niệm này',
        });
      }

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
        try {
          const uploadResult = await uploadFile(file, `memories/${userId}`);
          updates.imageUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Error uploading memory image:', uploadError);
        }
      }

      const updatedMemory = await Memory.update(memoryId, updates);

      return res.json({
        success: true,
        data: updatedMemory,
        message: 'Cập nhật kỷ niệm thành công',
      });
    } catch (error: any) {
      return res.status(500).json({
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

      const memory = await Memory.findById(memoryId);
      if (!memory) {
        return res.status(404).json({
          success: false,
          message: 'Kỷ niệm không tồn tại',
        });
      }

      if (memory.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa kỷ niệm này',
        });
      }

      await Memory.delete(memoryId);

      return res.json({
        success: true,
        message: 'Xóa kỷ niệm thành công',
      });
    } catch (error: any) {
      return res.status(500).json({
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
      const account = await Account.findById(userId);

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Tài khoản không tồn tại',
        });
      }

      // Kiểm tra xem user có bật email notification không
      if (account.memoriesEmailNotification === false) {
        return res.json({
          success: true,
          message: 'Email notification đã tắt',
        });
      }

      // Lấy kỷ niệm sắp tới (trong 7 ngày)
      const upcomingMemories = await Memory.findUpcoming(userId, 7);

      if (upcomingMemories.length === 0) {
        return res.json({
          success: true,
          message: 'Không có kỷ niệm sắp tới',
        });
      }

      // Gửi email
      await emailService.sendMemoryNotification(
        account.email,
        account.name,
        upcomingMemories.map((m) => {
          // Convert Firestore Timestamp to Date
          let dateObj: Date;
          if (m.date instanceof Date) {
            dateObj = m.date;
          } else if ((m.date as any)?.toDate) {
            dateObj = (m.date as any).toDate();
          } else {
            dateObj = new Date(m.date as any);
          }
          return {
            title: m.title,
            date: dateObj,
          };
        })
      );

      return res.json({
        success: true,
        message: 'Đã gửi email thông báo kỷ niệm',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi gửi email thông báo',
      });
    }
  };
}

