import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { FriendService } from '../services/friend.service';

const friendService = new FriendService();

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

      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io) {
        // Get recipient user info
        const Account = (await import('../models/Account')).Account;
        const toAccount = await Account.findByEmail(email);
        if (toAccount) {
          io.to(`user:${toAccount.id}`).emit('friend_request_received', {
            request: request,
          });
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

      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io) {
        // Get request to find the sender
        const FriendRequest = (await import('../models/FriendRequest')).FriendRequest;
        const request = await FriendRequest.findById(requestId);
        if (request && request.from) {
          // Notify both users
          io.to(`user:${request.from}`).emit('friend_request_accepted', {
            friend: friendship,
          });
          io.to(`user:${userId}`).emit('friend_request_accepted', {
            friend: friendship,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Đã chấp nhận lời mời kết bạn',
        data: friendship,
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

      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io) {
        const FriendRequest = (await import('../models/FriendRequest')).FriendRequest;
        const request = await FriendRequest.findById(requestId);
        if (request && request.from) {
          io.to(`user:${request.from}`).emit('friend_request_rejected', {
            userId: userId,
          });
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

