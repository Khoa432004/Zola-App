import { FriendRequest, IFriendRequest } from '../models/FriendRequest';
import { Friend, IFriend } from '../models/Friend';
import { Account } from '../models/Account';

export class FriendService {
  /**
   * Gửi lời mời kết bạn
   */
  async sendFriendRequest(fromUserId: string, toEmail: string): Promise<IFriendRequest> {
    try {
      // Tìm user theo email
      const toAccount = await Account.findByEmail(toEmail);
      if (!toAccount) {
        throw new Error('Không tìm thấy người dùng với email này');
      }

      const toUserId = toAccount.id;

      // Kiểm tra không thể tự kết bạn với chính mình
      if (fromUserId === toUserId) {
        throw new Error('Bạn không thể gửi lời mời kết bạn cho chính mình');
      }

      // Kiểm tra đã là bạn chưa
      const existingFriend = await Friend.findByUsers(fromUserId, toUserId);
      if (existingFriend) {
        throw new Error('Hai người đã là bạn bè');
      }

      // Kiểm tra đã có friend request chưa (cả hai chiều)
      const existingRequest = await FriendRequest.findByUsers(fromUserId, toUserId);
      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          throw new Error('Đã có lời mời kết bạn đang chờ');
        } else if (existingRequest.status === 'accepted') {
          throw new Error('Hai người đã là bạn bè');
        }
      }

      // Tạo friend request mới
      return await FriendRequest.create({
        from: fromUserId,
        to: toUserId,
        status: 'pending',
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Chấp nhận lời mời kết bạn
   */
  async acceptFriendRequest(requestId: string, userId: string): Promise<IFriend> {
    try {
      const request = await FriendRequest.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy lời mời kết bạn');
      }

      // Kiểm tra user có quyền chấp nhận request này không
      if (request.to !== userId) {
        throw new Error('Bạn không có quyền chấp nhận lời mời này');
      }

      if (request.status !== 'pending') {
        throw new Error('Lời mời kết bạn này đã được xử lý');
      }

      // Cập nhật status của request
      await FriendRequest.updateStatus(requestId, 'accepted');

      // Kiểm tra xem đã có friendship chưa
      let friendship = await Friend.findByUsers(request.from, request.to);
      
      if (!friendship) {
        // Tạo friendship mới
        friendship = await Friend.create({
          users: [request.from, request.to],
        });
      }

      // Nếu có request ngược lại (to -> from), cũng cập nhật status
      const reverseRequest = await FriendRequest.findByUsers(request.to, request.from);
      if (reverseRequest && reverseRequest.status === 'pending') {
        await FriendRequest.updateStatus(reverseRequest.id, 'accepted');
      }

      return friendship;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Từ chối lời mời kết bạn
   */
  async rejectFriendRequest(requestId: string, userId: string): Promise<void> {
    try {
      const request = await FriendRequest.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy lời mời kết bạn');
      }

      // Kiểm tra user có quyền từ chối request này không
      if (request.to !== userId) {
        throw new Error('Bạn không có quyền từ chối lời mời này');
      }

      if (request.status !== 'pending') {
        throw new Error('Lời mời kết bạn này đã được xử lý');
      }

      // Cập nhật status thành rejected
      await FriendRequest.updateStatus(requestId, 'rejected');
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Hủy lời mời kết bạn đã gửi
   */
  async cancelFriendRequest(requestId: string, userId: string): Promise<void> {
    try {
      const request = await FriendRequest.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy lời mời kết bạn');
      }

      // Kiểm tra user có quyền hủy request này không
      if (request.from !== userId) {
        throw new Error('Bạn không có quyền hủy lời mời này');
      }

      if (request.status !== 'pending') {
        throw new Error('Lời mời kết bạn này đã được xử lý');
      }

      // Xóa friend request
      await FriendRequest.delete(requestId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Lấy danh sách lời mời kết bạn đã nhận (pending)
   */
  async getReceivedRequests(userId: string): Promise<Array<IFriendRequest & { fromUser?: any; toUser?: any }>> {
    try {
      const requests = await FriendRequest.findByUserId(userId, 'pending');
      
      // Chỉ lấy các request mà user là người nhận
      const receivedRequests = requests.filter(req => req.to === userId);

      // Lấy thông tin user cho mỗi request
      const requestsWithUsers = await Promise.all(
        receivedRequests.map(async (req) => {
          const fromUser = await Account.findById(req.from);
          return {
            ...req,
            fromUser: fromUser ? {
              id: fromUser.id,
              email: fromUser.email,
              name: fromUser.name,
              avatar: fromUser.avatar,
            } : null,
          };
        })
      );

      return requestsWithUsers;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Lấy danh sách lời mời kết bạn đã gửi (pending)
   */
  async getSentRequests(userId: string): Promise<Array<IFriendRequest & { fromUser?: any; toUser?: any }>> {
    try {
      const requests = await FriendRequest.findByUserId(userId, 'pending');
      
      // Chỉ lấy các request mà user là người gửi
      const sentRequests = requests.filter(req => req.from === userId);

      // Lấy thông tin user cho mỗi request
      const requestsWithUsers = await Promise.all(
        sentRequests.map(async (req) => {
          const toUser = await Account.findById(req.to);
          return {
            ...req,
            toUser: toUser ? {
              id: toUser.id,
              email: toUser.email,
              name: toUser.name,
              avatar: toUser.avatar,
            } : null,
          };
        })
      );

      return requestsWithUsers;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Lấy danh sách bạn bè
   */
  async getFriends(userId: string): Promise<Array<{ id: string; email: string; name: string; avatar?: string }>> {
    try {
      const friendships = await Friend.findByUserId(userId);
      
      // Lấy thông tin của tất cả bạn bè
      const friendsPromises = friendships.map(async (friendship) => {
        // Tìm user ID còn lại (không phải userId hiện tại)
        const friendId = friendship.users.find(id => id !== userId);
        if (!friendId) return null;

        const friendAccount = await Account.findById(friendId);
        if (!friendAccount) return null;

        return {
          id: friendAccount.id,
          email: friendAccount.email,
          name: friendAccount.name,
          avatar: friendAccount.avatar,
        };
      });

      const friends = await Promise.all(friendsPromises);
      return friends.filter((friend): friend is { id: string; email: string; name: string; avatar?: string } => friend !== null);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Hủy kết bạn
   */
  async unfriend(userId1: string, userId2: string): Promise<void> {
    try {
      // Kiểm tra có phải là bạn không
      const friendship = await Friend.findByUsers(userId1, userId2);
      if (!friendship) {
        throw new Error('Hai người không phải là bạn bè');
      }

      // Xóa friendship
      await Friend.delete(friendship.id);

      // Xóa các friend requests liên quan (nếu có)
      const requests = await FriendRequest.findByUserId(userId1);
      for (const request of requests) {
        if ((request.from === userId1 && request.to === userId2) ||
            (request.from === userId2 && request.to === userId1)) {
          await FriendRequest.delete(request.id);
        }
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Kiểm tra hai users đã là bạn chưa
   */
  async checkFriendship(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendship = await Friend.findByUsers(userId1, userId2);
      return friendship !== null;
    } catch (error: any) {
      throw error;
    }
  }
}

