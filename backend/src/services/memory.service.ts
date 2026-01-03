import { Memory, IMemory } from '../models/Memory';
import { Account } from '../models/Account';
import { Post, IPost } from '../models/Post';
import { Friend, IFriend } from '../models/Friend';
import { EmailService } from './email.service';
import { uploadFile } from '../utils/storage';
import admin from 'firebase-admin';

export class MemoryService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Lấy tất cả kỷ niệm của một user
   */
  async getMemoriesByUserId(userId: string): Promise<IMemory[]> {
    return await Memory.findByUserId(userId);
  }

  /**
   * Lấy kỷ niệm của user khác (với kiểm tra quyền)
   */
  async getUserMemoriesWithPermission(
    targetUserId: string,
    currentUserId: string
  ): Promise<{ canAccess: boolean; memories?: IMemory[]; message?: string }> {
    // Nếu xem kỷ niệm của chính mình
    if (targetUserId === currentUserId) {
      const memories = await Memory.findByUserId(targetUserId);
      return { canAccess: true, memories };
    }

    // Kiểm tra privacy settings
    const targetUser = await Account.findById(targetUserId);
    if (!targetUser) {
      console.log(`❌ [MEMORY SERVICE] User ${targetUserId} not found`);
      return { canAccess: false, message: 'Người dùng không tồn tại' };
    }

    console.log(`🔍 [MEMORY SERVICE] Checking privacy for user ${targetUserId}:`);
    console.log(`   - memoriesVisible: ${targetUser.memoriesVisible}`);
    console.log(`   - Current user: ${currentUserId}`);

    // Nếu memoriesVisible = false, không cho ai xem
    if (targetUser.memoriesVisible !== true) {
      console.log(`🚫 [MEMORY SERVICE] Access denied - memoriesVisible is not true`);
      return { canAccess: false, message: 'Người dùng này không cho phép xem kỷ niệm' };
    }

    // Nếu memoriesVisible = true, chỉ cho bạn bè xem
    console.log(`🔍 [MEMORY SERVICE] Checking friendship between ${targetUserId} and ${currentUserId}`);
    const friendship = await Friend.findByUsers(targetUserId, currentUserId);
    
    if (!friendship) {
      console.log(`🚫 [MEMORY SERVICE] Access denied - not friends`);
      return { canAccess: false, message: 'Chỉ bạn bè mới có thể xem kỷ niệm' };
    }

    console.log(`✅ [MEMORY SERVICE] Access granted - friends and memoriesVisible = true`);
    const memories = await Memory.findByUserId(targetUserId);
    return { canAccess: true, memories };
  }

  /**
   * Lấy kỷ niệm sắp tới
   */
  async getUpcomingMemories(userId: string, days: number = 30): Promise<IMemory[]> {
    return await Memory.findUpcoming(userId, days);
  }

  /**
   * Tạo kỷ niệm mới
   */
  async createMemory(data: {
    userId: string;
    title: string;
    description?: string;
    date: Date;
    file?: Express.Multer.File;
  }): Promise<IMemory> {
    const { userId, title, description, date, file } = data;

    // Upload image nếu có
    let imageUrl = '';
    if (file) {
      try {
        const uploadResult = await uploadFile(file, `memories/${userId}`);
        imageUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('[MEMORY SERVICE] Error uploading image:', uploadError);
      }
    }

    // Tạo memory
    const memory = await Memory.create({
      userId,
      title,
      description,
      date,
      imageUrl,
    });

    // Gửi email notification nếu thỏa điều kiện
    await this.sendEmailNotificationIfNeeded(userId, memory);

    // Nếu memory có ngày là hôm nay, tạo memory post ngay lập tức
    await this.createMemoryPostIfToday(userId, memory);

    return memory;
  }

  /**
   * Cập nhật kỷ niệm
   */
  async updateMemory(
    memoryId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string;
      date?: Date;
      file?: Express.Multer.File;
    }
  ): Promise<IMemory> {
    // Kiểm tra ownership
    const memory = await Memory.findById(memoryId);
    if (!memory) {
      throw new Error('Kỷ niệm không tồn tại');
    }

    if (memory.userId !== userId) {
      throw new Error('Bạn không có quyền chỉnh sửa kỷ niệm này');
    }

    // Prepare updates
    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.date) updateData.date = updates.date;

    // Upload new image if provided
    if (updates.file) {
      try {
        const uploadResult = await uploadFile(updates.file, `memories/${userId}`);
        updateData.imageUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('[MEMORY SERVICE] Error uploading image:', uploadError);
      }
    }

    return await Memory.update(memoryId, updateData);
  }

  /**
   * Xóa kỷ niệm
   */
  async deleteMemory(memoryId: string, userId: string): Promise<void> {
    // Kiểm tra ownership
    const memory = await Memory.findById(memoryId);
    if (!memory) {
      throw new Error('Kỷ niệm không tồn tại');
    }

    if (memory.userId !== userId) {
      throw new Error('Bạn không có quyền xóa kỷ niệm này');
    }

    await Memory.delete(memoryId);
  }

  /**
   * Gửi email thông báo kỷ niệm sắp tới
   */
  async sendMemoryNotifications(userId: string): Promise<{ sent: boolean; message: string }> {
    const account = await Account.findById(userId);

    if (!account) {
      throw new Error('Tài khoản không tồn tại');
    }

    // Kiểm tra xem user có bật email notification không
    if (account.memoriesEmailNotification === false) {
      return { sent: false, message: 'Email notification đã tắt' };
    }

    // Lấy kỷ niệm sắp tới (trong 7 ngày)
    const upcomingMemories = await Memory.findUpcoming(userId, 7);

    if (upcomingMemories.length === 0) {
      return { sent: false, message: 'Không có kỷ niệm sắp tới' };
    }

    // Gửi email
    await this.emailService.sendMemoryNotification(
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

    return { sent: true, message: 'Đã gửi email thông báo kỷ niệm' };
  }

  /**
   * Helper: Gửi email notification tự động khi tạo memory mới (nếu trong 7 ngày tới)
   */
  private async sendEmailNotificationIfNeeded(userId: string, memory: IMemory): Promise<void> {
    console.log(`📧 [MEMORY SERVICE] Checking email notification for memory: ${memory.memoryId}`);
    
    try {
      const account = await Account.findById(userId);
      console.log(`📧 [MEMORY SERVICE] Account found:`, {
        email: account?.email,
        name: account?.name,
        memoriesEmailNotification: account?.memoriesEmailNotification,
      });

      if (!account) {
        console.log(`❌ [MEMORY SERVICE] Account not found for userId: ${userId}`);
        return;
      }

      if (account.memoriesEmailNotification === false) {
        console.log(`⏸️ [MEMORY SERVICE] Email notification is disabled for user ${userId}`);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Convert memoryDate to Date if it's a Firestore Timestamp
      const memoryDate = memory.date instanceof Date 
        ? memory.date 
        : (memory.date as any)?.toDate 
          ? (memory.date as any).toDate() 
          : new Date(memory.date as any);
      
      // Calculate anniversary date (recurring yearly)
      const thisYear = new Date(today.getFullYear(), memoryDate.getMonth(), memoryDate.getDate());
      thisYear.setHours(0, 0, 0, 0);
      
      const nextYear = new Date(today.getFullYear() + 1, memoryDate.getMonth(), memoryDate.getDate());
      nextYear.setHours(0, 0, 0, 0);
      
      // If this year's anniversary has passed, use next year's
      const anniversaryDate = thisYear < today ? nextYear : thisYear;
      
      const daysUntil = Math.ceil((anniversaryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`📅 [MEMORY SERVICE] Date calculation:`, {
        today: today.toISOString(),
        originalDate: memoryDate.toISOString(),
        anniversaryDate: anniversaryDate.toISOString(),
        daysUntil,
      });
      
      // Nếu kỷ niệm là hôm nay hoặc trong 7 ngày tới
      if (daysUntil >= 0 && daysUntil <= 7) {
        console.log(`📧 [MEMORY SERVICE] Sending email notification to ${account.email}...`);
        try {
          await this.emailService.sendMemoryNotification(
            account.email,
            account.name,
            [{
              title: memory.title,
              date: memoryDate,
            }]
          );
          console.log(`✅ [MEMORY SERVICE] Email sent successfully to ${account.email}`);
        } catch (emailSendError: any) {
          console.warn(`⚠️ [MEMORY SERVICE] Failed to send email (non-critical):`, emailSendError?.message);
          if (emailSendError?.responseCode === 550) {
            console.warn(`   ⚠️ Gmail daily sending limit exceeded`);
          }
        }
      } else {
        console.log(`⏭️ [MEMORY SERVICE] Memory is not within 7 days (${daysUntil} days away), skipping email`);
      }
    } catch (emailError: any) {
      console.warn(`⚠️ [MEMORY SERVICE] Error in email notification process (non-critical):`, emailError?.message);
    }
  }

  /**
   * Tạo memory post nếu memory có ngày là hôm nay
   */
  private async createMemoryPostIfToday(userId: string, memory: IMemory): Promise<void> {
    try {
      const today = new Date();
      const memoryDate = memory.date instanceof Date ? memory.date : (memory.date as admin.firestore.Timestamp).toDate();
      
      // Check if memory date is today (same month and day)
      const isToday = memoryDate.getMonth() === today.getMonth() && memoryDate.getDate() === today.getDate();
      
      if (!isToday) {
        console.log(`⏭️ [MEMORY SERVICE] Memory date is not today, skipping immediate post creation`);
        return;
      }

      console.log(`🎉 [MEMORY SERVICE] Memory is for today! Creating memory post immediately...`);

      // Get user info
      const user = await Account.findById(userId);
      if (!user) {
        console.warn(`⚠️ [MEMORY SERVICE] User ${userId} not found, cannot create memory post`);
        return;
      }

      // Get friends list
      const friends = await Friend.findByUserId(userId);
      const friendIds = friends.map((f: IFriend) => {
        return f.users[0] === userId ? f.users[1] : f.users[0];
      });

      if (friendIds.length === 0) {
        console.log(`⏭️ [MEMORY SERVICE] User has no friends, skipping memory post creation`);
        return;
      }

      // Calculate yearsSince
      let yearsSince = today.getFullYear() - memoryDate.getFullYear();
      const thisYearAnniversary = new Date(today.getFullYear(), memoryDate.getMonth(), memoryDate.getDate());
      if (today < thisYearAnniversary) {
        yearsSince -= 1;
      }
      if (yearsSince < 0) {
        yearsSince = 0;
      }

      // Create post content
      const anniversaryText = yearsSince > 0 ? `${yearsSince} năm` : 'ngày kỷ niệm';
      const content = `🎉 Hôm nay là ${anniversaryText}: "${memory.title}"\n\n${memory.description || ''}`;

      // Create memory post
      const postData = {
        authorId: userId,
        authorName: user.name,
        authorAvatar: user.avatar || '',
        caption: content,
        media: memory.imageUrl ? [
          {
            type: 'image' as const,
            sourceUrl: memory.imageUrl,
            width: 800,
            height: 600,
          }
        ] : [],
        visibility: 'friends' as const,
        sharedWith: friendIds,
      };

      const newPost = await Post.create(postData);
      
      // Update post with memory-specific fields
      await Post.update(newPost.postId, {
        isMemoryPost: true,
        memoryId: memory.memoryId,
        yearsSince: yearsSince,
      } as any);

      console.log(`✅ [MEMORY SERVICE] Memory post created immediately: ${newPost.postId} for memory "${memory.title}"`);

      // Emit WebSocket event to notify frontend
      try {
        const io = (global as any).io;
        if (io) {
          // Emit to user's friends
          friendIds.forEach((friendId: string) => {
            io.to(`user:${friendId}`).emit('new_memory_post', {
              postId: newPost.postId,
              authorId: userId,
              authorName: user.name,
              memoryTitle: memory.title,
              yearsSince: yearsSince,
            });
          });
          // Emit to user themselves
          io.to(`user:${userId}`).emit('new_memory_post', {
            postId: newPost.postId,
            authorId: userId,
            authorName: user.name,
            memoryTitle: memory.title,
            yearsSince: yearsSince,
          });
          console.log(`📤 [MEMORY SERVICE] Emitted new_memory_post event to ${friendIds.length + 1} users`);
        }
      } catch (socketError: any) {
        console.warn(`⚠️ [MEMORY SERVICE] Failed to emit socket event:`, socketError?.message);
      }

    } catch (error: any) {
      console.error(`❌ [MEMORY SERVICE] Error creating immediate memory post:`, error?.message);
      // Non-critical error, don't throw
    }
  }

  /**
   * Tự động tạo Memory Posts cho tất cả kỷ niệm có ngày hôm nay
   * Được gọi bởi Cron Job mỗi ngày
   */
  async createMemoryPostsForToday(): Promise<{ success: boolean; postsCreated: number; errors: string[] }> {
    console.log(`🎉 [MEMORY SERVICE] Starting daily memory posts generation...`);
    
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    console.log(`📅 [MEMORY SERVICE] Today is: ${month}/${day}/${today.getFullYear()}`);
    
    const errors: string[] = [];
    let postsCreated = 0;

    try {
      // Tìm tất cả memories có anniversary là hôm nay
      const allMemories = await Memory.findAll();
      console.log(`📊 [MEMORY SERVICE] Total memories in database: ${allMemories.length}`);
      
      const todaysMemories = allMemories.filter((memory) => {
        const memoryDate = memory.date instanceof Date ? memory.date : (memory.date as admin.firestore.Timestamp).toDate();
        return memoryDate.getMonth() + 1 === month && memoryDate.getDate() === day;
      });

      console.log(`🎂 [MEMORY SERVICE] Found ${todaysMemories.length} memories with today's anniversary`);

      // Tạo post cho mỗi memory
      for (const memory of todaysMemories) {
        try {
          // Kiểm tra xem đã tạo memory post cho memory này trong ngày hôm nay chưa
          const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
          const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
          
          // Query Firestore directly với filter thay vì lấy tất cả posts
          const postsSnapshot = await admin.firestore()
            .collection('posts')
            .where('memoryId', '==', memory.memoryId)
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfToday))
            .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfToday))
            .limit(1)
            .get();

          if (!postsSnapshot.empty) {
            console.log(`⏭️ [MEMORY SERVICE] Memory post already created today for memory ${memory.memoryId}, skipping...`);
            continue;
          }

          // Lấy thông tin user
          const user = await Account.findById(memory.userId);
          if (!user) {
            const error = `User ${memory.userId} not found for memory ${memory.memoryId}`;
            console.warn(`⚠️ [MEMORY SERVICE] ${error}`);
            errors.push(error);
            continue;
          }

          // Lấy danh sách friends
          const friends = await Friend.findByUserId(memory.userId);
          const friendIds = friends.map((f: IFriend) => {
            // users array contains 2 IDs, return the one that's not memory.userId
            return f.users[0] === memory.userId ? f.users[1] : f.users[0];
          });
          
          console.log(`👥 [MEMORY SERVICE] User ${user.name} has ${friendIds.length} friends`);

          // Nếu không có friend nào thì skip
          if (friendIds.length === 0) {
            console.log(`⏭️ [MEMORY SERVICE] Skipping memory ${memory.memoryId} - user has no friends`);
            continue;
          }

          // Tính yearsSince
          const memoryDate = memory.date instanceof Date ? memory.date : (memory.date as admin.firestore.Timestamp).toDate();
          let yearsSince = today.getFullYear() - memoryDate.getFullYear();
          
          // Correction logic
          const thisYearAnniversary = new Date(today.getFullYear(), memoryDate.getMonth(), memoryDate.getDate());
          if (today < thisYearAnniversary) {
            yearsSince -= 1;
          }
          if (yearsSince < 0) {
            yearsSince = 0;
          }

          // Tạo nội dung post
          const anniversaryText = yearsSince > 0 ? `${yearsSince} năm` : 'ngày kỷ niệm';
          const content = `🎉 Hôm nay là ${anniversaryText}: "${memory.title}"\n\n${memory.description || ''}`;

          // Tạo memory post với visibility = "friends"
          const postData = {
            authorId: memory.userId,
            authorName: user.name,
            authorAvatar: user.avatar || '',
            caption: content,
            media: memory.imageUrl ? [
              {
                type: 'image' as const,
                sourceUrl: memory.imageUrl,
                width: 800,
                height: 600,
              }
            ] : [],
            visibility: 'friends' as const,
            sharedWith: friendIds,
          };

          const newPost = await Post.create(postData);
          
          // Update post with memory-specific fields
          await Post.update(newPost.postId, {
            isMemoryPost: true,
            memoryId: memory.memoryId,
            yearsSince: yearsSince,
          } as any);
          
          postsCreated++;
          
          console.log(`✅ [MEMORY SERVICE] Created memory post ${newPost.postId} for user ${user.name}'s memory "${memory.title}" (${yearsSince} years)`);

        } catch (memoryError: any) {
          const error = `Failed to create post for memory ${memory.memoryId}: ${memoryError?.message}`;
          console.error(`❌ [MEMORY SERVICE] ${error}`);
          errors.push(error);
        }
      }

      console.log(`✅ [MEMORY SERVICE] Daily memory posts generation completed: ${postsCreated} posts created`);
      if (errors.length > 0) {
        console.warn(`⚠️ [MEMORY SERVICE] ${errors.length} errors occurred during generation`);
      }

      return {
        success: true,
        postsCreated,
        errors,
      };

    } catch (error: any) {
      console.error(`❌ [MEMORY SERVICE] Fatal error in createMemoryPostsForToday:`, error?.message);
      return {
        success: false,
        postsCreated,
        errors: [error?.message || 'Unknown error'],
      };
    }
  }
}
