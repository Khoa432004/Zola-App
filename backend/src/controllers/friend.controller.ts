import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { FriendService } from '../services/friend.service';
import { ConversationService } from '../services/conversation.service';
import { IConversation } from '../models/Conversation';

const friendService = new FriendService();
const conversationService = new ConversationService();

export class FriendController {
  /**
   * Gửi lời mời kết bạn
   */
  sendFriendRequest = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email',
        });
      }

      const request = await friendService.sendFriendRequest(userId, email);

      const io = (global as any).io;
      if (io) {
        const Account = (await import('../models/Account')).Account;
        const toAccount = await Account.findByEmail(email);
        if (toAccount) {
          const fromAccount = await Account.findById(userId);
          const requestWithUser = {
            ...request,
            fromUser: fromAccount ? {
              id: fromAccount.id,
              email: fromAccount.email,
              name: fromAccount.name,
              avatar: fromAccount.avatar,
            } : null,
          };
          
          io.to(`user:${toAccount.id}`).emit('friend_request_received', {
            request: requestWithUser,
          });
          console.log(`📤 Emitted friend_request_received to user:${toAccount.id} with fromUser info`);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Đã gửi lời mời kết bạn',
        data: request,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gửi lời mời kết bạn thất bại',
      });
    }
  };

  /**
   * Chấp nhận lời mời kết bạn
   */
  acceptFriendRequest = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { requestId } = req.params;
      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu requestId',
        });
      }

      const friendship = await friendService.acceptFriendRequest(requestId, userId);
      const otherUserId = friendship.users.find((id: string) => id !== userId);

      let createdConversation: IConversation | null = null;
      if (otherUserId) {
        try {
          createdConversation = await conversationService.createPrivateConversation(
            userId,
            otherUserId
          );
        } catch (convError) {
          console.error('Failed to create private conversation after accepting friend request:', convError);
        }
      }

      const io = (global as any).io;
      if (io) {
        const Account = (await import('../models/Account')).Account;
        const FriendRequest = (await import('../models/FriendRequest')).FriendRequest;

        const [request, otherUser] = await Promise.all([
          FriendRequest.findById(requestId),
          otherUserId ? Account.findById(otherUserId) : Promise.resolve(null)
        ]);
        
        if (request && request.from) {
          const friendData = otherUser ? {
            id: otherUser.id,
            name: otherUser.name,
            email: otherUser.email,
            avatar: otherUser.avatar,
          } : null;
          
          const eventData = {
            friend: {
              ...friendship,
              friendData: friendData,
            },
            requestId: requestId,
          };
          
          io.to(`user:${request.from}`).emit('friend_request_accepted', eventData);
          io.to(`user:${userId}`).emit('friend_request_accepted', eventData);
          console.log(`📤 Emitted friend_request_accepted to users ${request.from} and ${userId} with requestId ${requestId}`);
        }

        if (createdConversation) {
          createdConversation.members.forEach(member => {
            io.to(`user:${member.user_id}`).emit('conversation_created', {
              conversation: createdConversation,
            });
          });
          console.log(`📤 Emitted conversation_created to users ${createdConversation.members.map(m => m.user_id).join(', ')}`);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Đã chấp nhận lời mời kết bạn',
        data: friendship,
        conversation: createdConversation,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Chấp nhận lời mời kết bạn thất bại',
      });
    }
  };

  /**
   * Từ chối lời mời kết bạn
   */
  rejectFriendRequest = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { requestId } = req.params;
      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu requestId',
        });
      }

      await friendService.rejectFriendRequest(requestId, userId);

      const io = (global as any).io;
      if (io) {
        const FriendRequest = (await import('../models/FriendRequest')).FriendRequest;
        const request = await FriendRequest.findById(requestId);
        if (request && request.from) {
          io.to(`user:${request.from}`).emit('friend_request_rejected', {
            userId: userId,
            requestId: requestId,
            from: request.from,
            to: request.to,
          });
          io.to(`user:${userId}`).emit('friend_request_rejected', {
            userId: userId,
            requestId: requestId,
            from: request.from,
            to: request.to,
          });
          console.log(`📤 Emitted friend_request_rejected to users ${request.from} and ${userId} with requestId ${requestId}`);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Đã từ chối lời mời kết bạn',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Từ chối lời mời kết bạn thất bại',
      });
    }
  };

  /**
   * Hủy lời mời kết bạn đã gửi
   */
  cancelFriendRequest = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { requestId } = req.params;
      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu requestId',
        });
      }

      await friendService.cancelFriendRequest(requestId, userId);

      return res.status(200).json({
        success: true,
        message: 'Đã hủy lời mời kết bạn',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Hủy lời mời kết bạn thất bại',
      });
    }
  };

  /**
   * Lấy danh sách lời mời kết bạn đã nhận (pending)
   */
  getReceivedRequests = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const requests = await friendService.getReceivedRequests(userId);

      return res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lấy danh sách lời mời thất bại',
      });
    }
  };

  /**
   * Lấy danh sách lời mời kết bạn đã gửi (pending)
   */
  getSentRequests = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const requests = await friendService.getSentRequests(userId);

      return res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lấy danh sách lời mời thất bại',
      });
    }
  };

  /**
   * Lấy danh sách bạn bè
   */
  getFriends = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const friends = await friendService.getFriends(userId);
      
      console.log('👥 getFriends response:', {
        userId,
        friendsCount: friends.length,
        friends: friends.map(f => ({ id: f.id, name: f.name, email: f.email }))
      });

      return res.status(200).json({
        success: true,
        data: friends,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lấy danh sách bạn bè thất bại',
      });
    }
  };

  /**
   * Hủy kết bạn
   */
  unfriend = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        });
      }

      const { friendId } = req.params;
      if (!friendId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu friendId',
        });
      }

      await friendService.unfriend(userId, friendId);

      return res.status(200).json({
        success: true,
        message: 'Đã hủy kết bạn',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Hủy kết bạn thất bại',
      });
    }
  };
}

