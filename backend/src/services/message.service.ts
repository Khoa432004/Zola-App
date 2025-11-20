import { Message, IMessage } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { IConversationMessageInfo } from "../models/Conversation";
import { MessageReaction, IMessageReaction } from "../models/MessageReaction";

export class MessageService {
  /**
   * Gửi message mới
   */
  async sendMessage(
    conId: string,
    senderId: string,
    content: string,
    type: "text" | "image" | "video" | "sticker" = "text",
    replyToId?: string
  ): Promise<IMessage> {
    try {
      // Kiểm tra conversation có tồn tại không
      const conversation = await Conversation.findByConId(conId);
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện");
      }

      // Kiểm tra sender có phải member không
      const isMember = conversation.members.some((m) => m.user_id === senderId);
      if (!isMember) {
        throw new Error("Bạn không phải thành viên của cuộc trò chuyện này");
      }

      // Lấy sender name từ conversation members
      const sender = conversation.members.find((m) => m.user_id === senderId);
      const senderName = sender?.user_name || "Người dùng";

      // Kiểm tra content không rỗng
      if (!content || content.trim().length === 0) {
        throw new Error("Nội dung tin nhắn không được để trống");
      }

      // Xử lý reply data nếu có
      let replyData: any = {};
      if (replyToId) {
        const replyToMessage = await Message.findById(replyToId);
        if (replyToMessage) {
          replyData = {
            reply_to_id: replyToId,
            reply_to_content: replyToMessage.content,
            reply_to_sender_id: replyToMessage.sender_id,
          };

          // Get reply sender name
          const replySender = conversation.members.find(
            (m) => m.user_id === replyToMessage.sender_id
          );
          if (replySender) {
            replyData.reply_to_sender_name = replySender.user_name;
          }
        }
      }

      // Tạo message mới
      const message = await Message.create({
        con_id: conId,
        sender_id: senderId,
        sender_name: senderName,
        content: content.trim(),
        type,
        ...replyData,
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
  async getConversationMessages(
    conId: string,
    limit: number = 50,
    beforeTimestamp?: number
  ): Promise<IMessage[]> {
    try {
      return await Message.findByConversationId(conId, limit, beforeTimestamp);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Đánh dấu message đã xem
   */
  async markMessageAsSeen(
    messageId: string,
    userId: string
  ): Promise<IMessage> {
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
        throw new Error("Không tìm thấy cuộc trò chuyện");
      }

      // Kiểm tra user có phải member không
      const isMember = conversation.members.some((m) => m.user_id === userId);
      if (!isMember) {
        throw new Error("Bạn không phải thành viên của cuộc trò chuyện này");
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
        throw new Error("Không tìm thấy tin nhắn");
      }

      // Chỉ người gửi mới có thể xóa message
      if (message.sender_id !== userId) {
        throw new Error("Bạn không có quyền xóa tin nhắn này");
      }

      await Message.delete(messageId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Thêm reaction vào message
   */
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<IMessageReaction> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error("Không tìm thấy tin nhắn");
      }

      // Kiểm tra user có phải member của conversation không
      const conversation = await Conversation.findByConId(message.con_id);
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện");
      }

      const isMember = conversation.members.some((m) => m.user_id === userId);
      if (!isMember) {
        throw new Error("Bạn không có quyền thả cảm xúc cho tin nhắn này");
      }

      return await MessageReaction.addReaction(messageId, userId, emoji);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Xóa reaction khỏi message
   */
  async removeReaction(messageId: string, userId: string): Promise<void> {
    try {
      await MessageReaction.removeReaction(messageId, userId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Toggle reaction
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ added: boolean; reaction?: IMessageReaction }> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error("Không tìm thấy tin nhắn");
      }

      // Kiểm tra user có phải member của conversation không
      const conversation = await Conversation.findByConId(message.con_id);
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện");
      }

      const isMember = conversation.members.some((m) => m.user_id === userId);
      if (!isMember) {
        throw new Error("Bạn không có quyền thả cảm xúc cho tin nhắn này");
      }

      return await MessageReaction.toggleReaction(messageId, userId, emoji);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Lấy tất cả reactions của message
   */
  async getMessageReactions(messageId: string): Promise<IMessageReaction[]> {
    try {
      return await MessageReaction.getMessageReactions(messageId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Tìm kiếm messages theo keyword (cho user hiện tại)
   */
  async searchMessages(userId: string, keyword: string, limit: number = 50): Promise<Array<IMessage & { conversation?: any }>> {
    try {
      // Get all conversations của user
      const conversations = await Conversation.findByUserId(userId);
      const conversationIds = conversations.map(c => c.con_id);

      if (conversationIds.length === 0) {
        return [];
      }

      // Search messages trong các conversations
      const allResults: Array<IMessage & { conversation?: any }> = [];

      for (const conv of conversations) {
        const messages = await Message.findByConversationId(conv.con_id, 100);
        
        // Filter messages chứa keyword
        const matchedMessages = messages.filter(msg => 
          msg.content.toLowerCase().includes(keyword.toLowerCase())
        );

        // Attach conversation info
        matchedMessages.forEach(msg => {
          allResults.push({
            ...msg,
            conversation: {
              con_id: conv.con_id,
              is_group: conv.is_group,
              groupName: conv.groupName,
              members: conv.members,
            }
          });
        });

        // Limit results
        if (allResults.length >= limit) {
          break;
        }
      }

      // Sort by timestamp desc (newest first)
      return allResults
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error: any) {
      throw error;
    }
  }
}
