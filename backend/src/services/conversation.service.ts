import { Conversation, IConversation, IConversationMember } from '../models/Conversation';
import { Account } from '../models/Account';
import { Friend } from '../models/Friend';
import { v4 as uuidv4 } from 'uuid';

export class ConversationService {
  /**
   * Tạo conversation riêng tư (private chat) giữa 2 users
   */
  async createPrivateConversation(userId1: string, userId2: string): Promise<IConversation> {
    try {
      // Kiểm tra 2 users có tồn tại không
      const user1 = await Account.findById(userId1);
      const user2 = await Account.findById(userId2);
      
      if (!user1 || !user2) {
        throw new Error('Không tìm thấy một trong hai người dùng');
      }

      // Kiểm tra không thể chat với chính mình
      if (userId1 === userId2) {
        throw new Error('Bạn không thể tạo cuộc trò chuyện với chính mình');
      }

      // Kiểm tra xem đã có conversation giữa 2 users chưa
      const existingConv = await Conversation.findByTwoUsers(userId1, userId2);
      if (existingConv) {
        return existingConv;
      }

      // Kiểm tra 2 users có là bạn không (optional, có thể bỏ qua)
      // const areFriends = await Friend.findByUsers(userId1, userId2);
      // if (!areFriends) {
      //   throw new Error('Hai người chưa là bạn bè');
      // }

      // Tạo conversation mới
      const conId = `con_${uuidv4()}`;
      const members: IConversationMember[] = [
        {
          user_id: userId1,
          user_name: user1.name || user1.email.split('@')[0],
        },
        {
          user_id: userId2,
          user_name: user2.name || user2.email.split('@')[0],
        },
      ];

      return await Conversation.create({
        con_id: conId,
        is_group: false,
        members,
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Tạo conversation nhóm
   */
  async createGroupConversation(creatorId: string, memberIds: string[], groupName?: string): Promise<IConversation> {
    try {
      // Kiểm tra creator có tồn tại không
      const creator = await Account.findById(creatorId);
      if (!creator) {
        throw new Error('Người tạo không tồn tại');
      }

      // Kiểm tra có ít nhất 2 members
      if (!memberIds || memberIds.length < 2) {
        throw new Error('Nhóm chat phải có ít nhất 2 thành viên');
      }

      // Kiểm tra tất cả members có tồn tại không và lấy tên
      const members: IConversationMember[] = [];
      const uniqueMemberIds = Array.from(new Set([creatorId, ...memberIds])); // Đảm bảo creator cũng là member

      for (const memberId of uniqueMemberIds) {
        const account = await Account.findById(memberId);
        if (!account) {
          throw new Error(`Không tìm thấy thành viên với ID: ${memberId}`);
        }
        members.push({
          user_id: memberId,
          user_name: account.name || account.email.split('@')[0],
        });
      }

      // Tạo conversation mới
      const conId = `con_${uuidv4()}`;
      return await Conversation.create({
        con_id: conId,
        is_group: true,
        groupName: groupName || undefined,
        members,
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Lấy danh sách conversations của user
   */
  async getUserConversations(userId: string): Promise<IConversation[]> {
    try {
      return await Conversation.findByUserId(userId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Lấy conversation theo ID
   */
  async getConversationById(conversationId: string): Promise<IConversation | null> {
    try {
      // Thử tìm bằng id trước
      let conversation = await Conversation.findById(conversationId);
      if (conversation) {
        return conversation;
      }

      // Nếu không tìm thấy, thử tìm bằng con_id
      conversation = await Conversation.findByConId(conversationId);
      return conversation;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Thêm member vào group conversation
   */
  async addMemberToGroup(conversationId: string, userId: string, newMemberId: string): Promise<IConversation> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Không tìm thấy cuộc trò chuyện');
      }

      if (!conversation.is_group) {
        throw new Error('Chỉ có thể thêm thành viên vào nhóm chat');
      }

      // Kiểm tra user có quyền thêm member không (phải là member của group)
      const isMember = conversation.members.some(m => m.user_id === userId);
      if (!isMember) {
        throw new Error('Bạn không có quyền thêm thành viên');
      }

      // Kiểm tra member mới có tồn tại không
      const newMember = await Account.findById(newMemberId);
      if (!newMember) {
        throw new Error('Không tìm thấy thành viên mới');
      }

      // Kiểm tra member đã có trong group chưa
      const alreadyMember = conversation.members.some(m => m.user_id === newMemberId);
      if (alreadyMember) {
        return conversation;
      }

      // Thêm member mới
      const updatedMembers = [
        ...conversation.members,
        {
          user_id: newMemberId,
          user_name: newMember.name || newMember.email.split('@')[0],
        },
      ];

      return await Conversation.update(conversation.id, {
        members: updatedMembers,
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Xóa conversation (chỉ creator hoặc admin mới có quyền)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Không tìm thấy cuộc trò chuyện');
      }

      // Kiểm tra user có phải member không
      const isMember = conversation.members.some(m => m.user_id === userId);
      if (!isMember) {
        throw new Error('Bạn không có quyền xóa cuộc trò chuyện này');
      }

      await Conversation.delete(conversation.id);
    } catch (error: any) {
      throw error;
    }
  }
}

