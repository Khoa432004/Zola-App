import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ConversationService } from '../services/conversation.service';

const conversationService = new ConversationService();

export class ConversationController {
  /**
   * Tạo conversation riêng tư
   */
  createPrivateConversation = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { friendId } = req.body;
      if (!friendId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn người bạn muốn trò chuyện',
        });
      }

      const conversation = await conversationService.createPrivateConversation(userId, friendId);

      return res.status(200).json({
        success: true,
        message: 'Đã tạo cuộc trò chuyện',
        data: conversation,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Tạo cuộc trò chuyện thất bại',
      });
    }
  };

  /**
   * Tạo conversation nhóm
   */
  createGroupConversation = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { memberIds, groupName } = req.body;
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một thành viên',
        });
      }

      const conversation = await conversationService.createGroupConversation(userId, memberIds, groupName);

      return res.status(200).json({
        success: true,
        message: 'Đã tạo nhóm chat',
        data: conversation,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Tạo nhóm chat thất bại',
      });
    }
  };

  /**
   * Lấy danh sách conversations của user
   */
  getUserConversations = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const conversations = await conversationService.getUserConversations(userId);

      return res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lấy danh sách cuộc trò chuyện thất bại',
      });
    }
  };

  /**
   * Lấy conversation theo ID
   */
  getConversationById = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID cuộc trò chuyện',
        });
      }

      const conversation = await conversationService.getConversationById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy cuộc trò chuyện',
        });
      }

      // Kiểm tra user có phải member không
      const isMember = conversation.members.some(m => m.user_id === userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập cuộc trò chuyện này',
        });
      }

      return res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lấy cuộc trò chuyện thất bại',
      });
    }
  };

  /**
   * Thêm member vào group
   */
  addMemberToGroup = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { conversationId } = req.params;
      const { memberId } = req.body;

      if (!conversationId || !memberId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin',
        });
      }

      const conversation = await conversationService.addMemberToGroup(conversationId, userId, memberId);

      return res.status(200).json({
        success: true,
        message: 'Đã thêm thành viên vào nhóm',
        data: conversation,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Thêm thành viên thất bại',
      });
    }
  };

  /**
   * Xóa conversation
   */
  deleteConversation = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID cuộc trò chuyện',
        });
      }

      await conversationService.deleteConversation(conversationId, userId);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa cuộc trò chuyện',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Xóa cuộc trò chuyện thất bại',
      });
    }
  };
}

