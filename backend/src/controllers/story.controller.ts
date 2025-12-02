import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Account } from "../models/Account";
import { Story } from "../models/Story";
import { uploadFile } from "../utils/storage";

export class StoryController {
  /**
   * Get all accessible stories (feed)
   * Returns stories grouped by author
   */
  getAllStories = async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id || undefined;
      
      console.log('📖 getAllStories called');
      console.log('📖 Request user:', req.user);
      console.log('📖 Extracted userId:', userId);
      
      // Get stories grouped by author
      const groupedStories = await Story.findGroupedByAuthor(userId);
      
      console.log('📖 Found story groups (Map size):', groupedStories.size);
      
      // Convert Map to Array for JSON response
      const storiesArray = Array.from(groupedStories.values());
      
      console.log('📖 Story groups array length:', storiesArray.length);
      console.log('📖 Returning story groups:', storiesArray.map(g => ({ 
        authorId: g.authorId, 
        authorName: g.authorName,
        storiesCount: g.stories.length,
        hasViewedAll: g.hasViewedAll
      })));
      
      res.json({
        success: true,
        data: storiesArray,
      });
    } catch (error: any) {
      console.error("❌ Error in getAllStories:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch stories",
      });
    }
  };

  /**
   * Get my stories
   */
  getMyStories = async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const includeExpired = req.query.includeExpired === "true";
      const stories = await Story.findByAuthorId(userId, includeExpired);
      
      res.json({
        success: true,
        data: stories,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch my stories",
      });
    }
  };

  /**
   * Get story by ID
   */
  getStoryById = async (req: AuthRequest, res: Response) => {
    try {
      const storyId = req.params.id;
      const story = await Story.findById(storyId);
      
      if (!story) {
        return res.status(404).json({
          success: false,
          message: "Story not found",
        });
      }
      
      res.json({
        success: true,
        data: story,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch story",
      });
    }
  };

  /**
   * Create a new story
   */
  createStory = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found",
        });
      }

      const account = await Account.findById(userId);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      // Story chỉ cho phép 1 media file
      const file = (req.file || (req.files as Express.Multer.File[])?.[0]) as Express.Multer.File | undefined;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng thêm ảnh hoặc video",
        });
      }

      // Upload media
      const fileType = file.mimetype.startsWith("image/") ? "image" : "video";
      let uploadResult;
      try {
        uploadResult = await uploadFile(file, `stories/${userId}`);
      } catch (uploadError: any) {
        console.error("Error uploading story media:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Không thể upload ảnh/video. Vui lòng thử lại.",
        });
      }

      const { caption, visibility, textOverlay } = req.body;

      // Parse textOverlay if provided
      let parsedTextOverlay = undefined;
      if (textOverlay) {
        try {
          parsedTextOverlay = typeof textOverlay === "string" ? JSON.parse(textOverlay) : textOverlay;
        } catch {
          // Invalid JSON, ignore
        }
      }

      // Create story
      const story = await Story.create({
        authorId: userId,
        authorName: account.name,
        authorAvatar: account.avatar || "",
        media: {
          type: fileType,
          sourceUrl: uploadResult.url,
          width: uploadResult.width,
          height: uploadResult.height,
        },
        caption: caption || "",
        visibility: visibility || "public",
        textOverlay: parsedTextOverlay,
      });

      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io) {
        io.emit('story_created', {
          story: story,
        });
      }

      res.json({
        success: true,
        data: story,
        message: "Đăng story thành công",
      });
    } catch (error: any) {
      console.error("Error in createStory:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Không thể đăng story",
      });
    }
  };

  /**
   * Mark story as viewed
   */
  markAsViewed = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found",
        });
      }

      const storyId = req.params.id;
      const story = await Story.markAsViewed(storyId, userId);
      
      if (!story) {
        return res.status(404).json({
          success: false,
          message: "Story not found or expired",
        });
      }
      
      res.json({
        success: true,
        data: story,
        message: "Story marked as viewed",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to mark story as viewed",
      });
    }
  };

  /**
   * Get list of viewers for a story
   */
  getStoryViewers = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found",
        });
      }

      const storyId = req.params.id;
      const story = await Story.findById(storyId);
      
      if (!story) {
        return res.status(404).json({
          success: false,
          message: "Story not found",
        });
      }

      // Chỉ author mới có thể xem danh sách viewers
      if (story.authorId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể xem viewers của story của chính mình",
        });
      }

      // Lấy thông tin account của từng viewer
      const viewersInfo = await Promise.all(
        story.viewers.map(async (viewerId: string) => {
          try {
            const account = await Account.findById(viewerId);
            if (account) {
              return {
                id: account.id,
                name: account.name,
                email: account.email,
                avatar: account.avatar || '',
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching account for viewer ${viewerId}:`, error);
            return null;
          }
        })
      );

      // Filter out null values (accounts that don't exist)
      const validViewers = viewersInfo.filter((viewer): viewer is {
        id: string;
        name: string;
        email: string;
        avatar: string;
      } => viewer !== null);

      res.json({
        success: true,
        data: {
          storyId: story.storyId,
          viewCount: story.viewCount,
          viewers: validViewers,
        },
      });
    } catch (error: any) {
      console.error("Error in getStoryViewers:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch story viewers",
      });
    }
  };

  /**
   * Delete a story
   */
  deleteStory = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found",
        });
      }

      const storyId = req.params.id;
      await Story.delete(storyId, userId);
      
      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io) {
        io.emit('story_deleted', {
          storyId: storyId,
        });
      }
      
      res.json({
        success: true,
        message: "Story deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete story",
      });
    }
  };

  /**
   * Cleanup expired stories (admin endpoint, can be called by scheduled job)
   */
  cleanupExpired = async (req: Request, res: Response) => {
    try {
      const count = await Story.cleanupExpired();
      
      res.json({
        success: true,
        message: `Cleaned up ${count} expired stories`,
        count,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to cleanup expired stories",
      });
    }
  };
}

