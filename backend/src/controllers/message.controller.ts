import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { MessageService } from '../services/message.service';

const messageService = new MessageService();

export class MessageController {
  /**
   * Gửi message
   */
  sendMessage = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { conId, content, type } = req.body;

      if (!conId || !content) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin',
        });
      }

      const message = await messageService.sendMessage(
        conId,
        userId,
        content,
        type || 'text'
      );

      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io) {
        try {
          const { emitMessageEvent } = await import('../socket/socket.handlers');
          emitMessageEvent(io, conId, message, userId);
        } catch (error) {
          console.error('Error emitting WebSocket event:', error);
          // Fallback: emit directly
          io.to(`conversation:${conId}`).emit('message_received', {
            conId: conId,
            message: message,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Đã gửi tin nhắn',
        data: message,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gửi tin nhắn thất bại',
      });
    }
  };

  /**
   * Lấy messages của conversation
   */
  getConversationMessages = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { conId } = req.params;
      // Tối ưu: Default limit 50 để tránh load quá nhiều messages
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const beforeTimestamp = req.query.beforeTimestamp ? parseInt(req.query.beforeTimestamp as string) : undefined;

      if (!conId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID cuộc trò chuyện',
        });
      }

      const messages = await messageService.getConversationMessages(conId, limit, beforeTimestamp);

      // Tối ưu: Không tự động mark as seen ở đây, để frontend xử lý với debounce
      // Việc mark as seen sẽ được gọi riêng qua endpoint /seen để tránh chậm
      // try {
      //   await messageService.markConversationAsSeen(conId, userId);
      // } catch (error) {
      //   // Ignore error khi mark as seen
      //   console.warn('Failed to mark conversation as seen:', error);
      // }

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lấy tin nhắn thất bại',
      });
    }
  };

  /**
   * Đánh dấu message đã xem
   */
  markMessageAsSeen = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { messageId } = req.params;
      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID tin nhắn',
        });
      }

      const message = await messageService.markMessageAsSeen(messageId, userId);

      return res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Đánh dấu tin nhắn đã xem thất bại',
      });
    }
  };

  /**
   * Đánh dấu conversation đã xem
   */
  markConversationAsSeen = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { conId } = req.params;
      if (!conId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID cuộc trò chuyện',
        });
      }

      await messageService.markConversationAsSeen(conId, userId);

      return res.status(200).json({
        success: true,
        message: 'Đã đánh dấu cuộc trò chuyện đã xem',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Đánh dấu cuộc trò chuyện đã xem thất bại',
      });
    }
  };

  /**
   * Xóa message
   */
  deleteMessage = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { messageId } = req.params;
      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID tin nhắn',
        });
      }

      await messageService.deleteMessage(messageId, userId);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa tin nhắn',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Xóa tin nhắn thất bại',
      });
    }
  };
}

