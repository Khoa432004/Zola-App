import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MessageService } from '../services/message.service';
import { ConversationService } from '../services/conversation.service';
import { FriendService } from '../services/friend.service';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { Account } from '../models/Account';

const messageService = new MessageService();
const conversationService = new ConversationService();
const friendService = new FriendService();

// Export function to emit message events from controllers
export function emitMessageEvent(io: SocketIOServer, conId: string, message: any, senderId: string) {
  try {
    // Broadcast message to all users in the conversation room
    io.to(`conversation:${conId}`).emit('message_received', {
      conId: conId,
      message: message,
    });
    console.log(`📤 Emitted message_received to conversation:${conId}`);
    
    // Notify all conversation members about conversation update
    conversationService.getConversationById(conId).then(conversation => {
      if (conversation) {
        conversation.members.forEach(member => {
          if (member.user_id !== senderId) {
            io.to(`user:${member.user_id}`).emit('conversation_updated', {
              conversationId: conId,
              lastMessage: {
                content: message.content,
                timestamp: message.timestamp,
                sender_id: senderId,
              },
            });
            console.log(`📤 Emitted conversation_updated to user:${member.user_id}`);
          }
        });
      }
    }).catch(error => {
      console.error('Error notifying conversation members:', error);
    });
  } catch (error) {
    console.error('Error emitting message event:', error);
  }
}

interface SocketUser {
  userId: string;
  socketId: string;
}

// Store connected users
const connectedUsers = new Map<string, string>(); // userId -> socketId

/**
 * Send list of online friends to a user
 */
async function sendOnlineFriendsList(io: SocketIOServer, socket: any, userId: string) {
  try {
    // Get user's friends
    const friendService = new FriendService();
    const friends = await friendService.getFriends(userId);

    // Get list of online friend IDs (friends that are in connectedUsers)
    const onlineFriendIds: string[] = [];
    
    for (const friend of friends) {
      if (friend && friend.id && connectedUsers.has(friend.id)) {
        // Check if friend has enabled showing online status
        const friendAccount = await Account.findById(friend.id);
        if (friendAccount && friendAccount.showOnlineStatus !== false) {
          onlineFriendIds.push(friend.id);
        }
      }
    }

    // Emit online friends list to the user
    socket.emit('online_friends_list', {
      onlineUserIds: onlineFriendIds,
    });
    
    console.log(`📤 Sent online friends list to user ${userId}:`, onlineFriendIds);
  } catch (error) {
    console.error('Error sending online friends list:', error);
  }
}

/**
 * Emit user online/offline status to friends
 */
async function emitUserOnlineStatus(io: SocketIOServer, userId: string, isOnline: boolean) {
  try {
    // Get user account to check privacy settings
    const account = await Account.findById(userId);
    if (!account) return;

    // If user has disabled showing online status, don't emit
    if (account.showOnlineStatus === false) {
      return;
    }

    // Get user's friends
    const friendService = new FriendService();
    const friends = await friendService.getFriends(userId);

    // Emit to all friends
    friends.forEach((friend) => {
      if (friend && friend.id) {
        io.to(`user:${friend.id}`).emit(isOnline ? 'user_online' : 'user_offline', {
          userId,
        });
      }
    });
  } catch (error) {
    console.error('Error emitting user online status:', error);
  }
}

export function setupSocketHandlers(io: SocketIOServer) {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    
    if (!userId) {
      socket.disconnect();
      return;
    }

    // Store user connection
    connectedUsers.set(userId, socket.id);
    console.log(`✅ User ${userId} connected (Socket ID: ${socket.id})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Emit user online event to friends
    emitUserOnlineStatus(io, userId, true);

    // Send list of online friends to the newly connected user
    sendOnlineFriendsList(io, socket, userId);

    // ========== CHAT MESSAGES ==========
    
    // Join conversation room when user opens a conversation
    socket.on('join_conversation', async (data: { conId: string }) => {
      try {
        const conversation = await conversationService.getConversationById(data.conId);
        if (conversation) {
          const isMember = conversation.members.some(m => m.user_id === userId);
          if (isMember) {
            socket.join(`conversation:${data.conId}`);
            console.log(`User ${userId} joined conversation ${data.conId}`);
          }
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (data: { conId: string }) => {
      socket.leave(`conversation:${data.conId}`);
      console.log(`User ${userId} left conversation ${data.conId}`);
    });

    // Note: new_message event is now handled directly in the controller
    // This socket handler is kept for backward compatibility but messages
    // are now broadcast directly from the HTTP controller after saving to DB

    // ========== FRIEND REQUESTS ==========
    
    socket.on('friend_request_sent', async (data: { toUserId: string; request: any }) => {
      try {
        // Notify recipient
        io.to(`user:${data.toUserId}`).emit('friend_request_received', {
          request: data.request,
        });
      } catch (error) {
        console.error('Error handling friend request:', error);
      }
    });

    socket.on('friend_request_accepted', async (data: { fromUserId: string; friend: any }) => {
      try {
        // Notify both users
        io.to(`user:${data.fromUserId}`).emit('friend_request_accepted', {
          friend: data.friend,
        });
        io.to(`user:${userId}`).emit('friend_request_accepted', {
          friend: data.friend,
        });
      } catch (error) {
        console.error('Error handling friend acceptance:', error);
      }
    });

    socket.on('friend_request_rejected', async (data: { fromUserId: string }) => {
      try {
        // Notify sender
        io.to(`user:${data.fromUserId}`).emit('friend_request_rejected', {
          userId: userId,
        });
      } catch (error) {
        console.error('Error handling friend rejection:', error);
      }
    });

    // ========== POSTS ==========
    
    socket.on('new_post', async (data: { post: any }) => {
      try {
        // Broadcast to all connected users (or filter by friends later)
        io.emit('post_created', {
          post: data.post,
        });
      } catch (error) {
        console.error('Error handling new post:', error);
      }
    });

    socket.on('post_updated', async (data: { postId: string; post: any }) => {
      try {
        // Broadcast to all connected users
        io.emit('post_updated', {
          postId: data.postId,
          post: data.post,
        });
      } catch (error) {
        console.error('Error handling post update:', error);
      }
    });

    socket.on('post_deleted', async (data: { postId: string }) => {
      try {
        // Broadcast to all connected users
        io.emit('post_deleted', {
          postId: data.postId,
        });
      } catch (error) {
        console.error('Error handling post deletion:', error);
      }
    });

    // ========== COMMENTS ==========
    
    socket.on('new_comment', async (data: { postId: string; comment: any }) => {
      try {
        // Broadcast to all users viewing this post
        io.to(`post:${data.postId}`).emit('comment_added', {
          postId: data.postId,
          comment: data.comment,
        });

        // Also notify post author
        const post = await Post.findById(data.postId);
        if (post && post.authorId !== userId) {
          io.to(`user:${post.authorId}`).emit('comment_notification', {
            postId: data.postId,
            comment: data.comment,
          });
        }
      } catch (error) {
        console.error('Error handling new comment:', error);
      }
    });

    socket.on('comment_updated', async (data: { postId: string; commentId: string; comment: any }) => {
      try {
        io.to(`post:${data.postId}`).emit('comment_updated', {
          postId: data.postId,
          commentId: data.commentId,
          comment: data.comment,
        });
      } catch (error) {
        console.error('Error handling comment update:', error);
      }
    });

    socket.on('comment_deleted', async (data: { postId: string; commentId: string }) => {
      try {
        io.to(`post:${data.postId}`).emit('comment_deleted', {
          postId: data.postId,
          commentId: data.commentId,
        });
      } catch (error) {
        console.error('Error handling comment deletion:', error);
      }
    });

    // Join post room when user views a post
    socket.on('join_post', (data: { postId: string }) => {
      socket.join(`post:${data.postId}`);
    });

    // Leave post room
    socket.on('leave_post', (data: { postId: string }) => {
      socket.leave(`post:${data.postId}`);
    });

    // ========== DISCONNECT ==========
    
    socket.on('disconnect', async () => {
      connectedUsers.delete(userId);
      console.log(`❌ User ${userId} disconnected (Socket ID: ${socket.id})`);
      
      // Update lastSeen and emit offline status
      try {
        await Account.update(userId, { lastSeen: new Date() });
        emitUserOnlineStatus(io, userId, false);
      } catch (error) {
        console.error('Error updating lastSeen:', error);
      }
    });
  });

  return io;
}

