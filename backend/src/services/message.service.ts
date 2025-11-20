import { Message, IMessage } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { IConversationMessageInfo } from '../models/Conversation';

export class MessageService {
  /**
   * Gửi message mới
   */
  async sendMessage(conId: string, senderId: string, content: string, type: 'text' | 'image' | 'video' | 'sticker' = 'text'): Promise<IMessage> {
    try {
      // Kiểm tra conversation có tồn tại không
      const conversation = await Conversation.findByConId(conId);
      if (!conversation) {
        throw new Error('Không tìm thấy cuộc trò chuyện');
      }

      // Kiểm tra sender có phải member không
      const isMember = conversation.members.some(m => m.user_id === senderId);
      if (!isMember) {
        throw new Error('Bạn không phải thành viên của cuộc trò chuyện này');
      }

      // Kiểm tra content không rỗng
      if (!content || content.trim().length === 0) {
        throw new Error('Nội dung tin nhắn không được để trống');
      }

      // Tạo message mới
      const message = await Message.create({
        con_id: conId,
        sender_id: senderId,
        content: content.trim(),
        type,
      });

      // Cập nhật last message info trong conversation
      const messageInfo: IConversationMessageInfo = {
        content: content.trim(),
        timestamp: message.timestamp,
        sender_id: senderId,
      };

      await Conversation.updateLastMessage(conId, messageInfo);

      return message;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Lấy messages của conversation
   * Tối ưu: Giảm limit mặc định và validate conversation nhanh hơn
   * @param conId Conversation ID
   * @param limit Số lượng messages
   * @param beforeTimestamp Load messages trước timestamp này (cho lazy loading)
   */
  async getConversationMessages(conId: string, limit: number = 50, beforeTimestamp?: number): Promise<IMessage[]> {
    try {
      return await Message.findByConversationId(conId, limit, beforeTimestamp);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Đánh dấu message đã xem
   */
  async markMessageAsSeen(messageId: string, userId: string): Promise<IMessage> {
    try {
      return await Message.markAsSeen(messageId, userId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Đánh dấu tất cả messages trong conversation đã xem
   */
  async markConversationAsSeen(conId: string, userId: string): Promise<void> {
    try {
      // Kiểm tra conversation có tồn tại không
      const conversation = await Conversation.findByConId(conId);
      if (!conversation) {
        throw new Error('Không tìm thấy cuộc trò chuyện');
      }

      // Kiểm tra user có phải member không
      const isMember = conversation.members.some(m => m.user_id === userId);
      if (!isMember) {
        throw new Error('Bạn không phải thành viên của cuộc trò chuyện này');
      }

      await Message.markConversationAsSeen(conId, userId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Xóa message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Không tìm thấy tin nhắn');
      }

      // Chỉ người gửi mới có thể xóa message
      if (message.sender_id !== userId) {
        throw new Error('Bạn không có quyền xóa tin nhắn này');
      }

      await Message.delete(messageId);
    } catch (error: any) {
      throw error;
    }
  }
}

