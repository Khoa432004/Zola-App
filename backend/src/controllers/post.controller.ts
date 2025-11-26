import { Request, Response } from "express";
import { PostService } from "../services/post.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Account } from "../models/Account";
import { uploadFile } from "../utils/storage";

export class PostController {
  private postService: PostService;

  constructor() {
    this.postService = new PostService();
  }

  getAllPosts = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get userId if authenticated (public route, authentication is optional)
    const userId = req.user?.userId || (req.user as any)?.uid || (req.user as any)?.id || undefined;
    
    console.log('📋 getAllPosts - User info:', {
      hasUser: !!req.user,
      userId,
      userObject: req.user
    });
    
    const posts = await this.postService.getPublicPosts(page, limit, userId);

    // If user is authenticated, check which posts they liked
    if (userId) {
      const postsWithLikedStatus = await Promise.all(
        posts.items.map(async (post) => {
          const isLiked = await this.postService.checkUserLiked(
            post.postId,
            userId
          );
          return {
            ...post,
            isLiked,
          };
        })
      );

      console.log('✅ getAllPosts - Returning posts:', {
        count: postsWithLikedStatus.length,
        postIds: postsWithLikedStatus.map(p => p.postId),
        specificPosts: postsWithLikedStatus.filter(p => p.visibility === 'specific').map(p => ({
          postId: p.postId,
          visibility: p.visibility,
          sharedWith: p.sharedWith
        }))
      });

      return res.json({
        success: true,
        data: postsWithLikedStatus,
        total: posts.total,
        page,
        limit,
        hasMore: posts.hasMore,
      });
    }

    // User not authenticated, return posts without isLiked status
    res.json({
      success: true,
      data: posts.items.map((post) => ({ ...post, isLiked: false })),
      total: posts.total,
      page,
      limit,
      hasMore: posts.hasMore,
    });
  } catch (error: any) {
    console.error("Error in getAllPosts:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch posts",
    });
  }
};

  getFeaturedPosts = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const userId = (req as any).user?.userId || (req as any).user?.uid || undefined;
      const posts = await this.postService.getFeaturedPosts(limit);
      // featured helper currently doesn't accept userId; try to annotate if we have a user by using service getPublicPosts
      if (userId) {
        const annotated = await this.postService.getPublicPosts(1, limit, userId);
        res.json({ success: true, data: annotated.items });
      } else {
        res.json({ success: true, data: posts });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch featured posts",
      });
    }
  };

  getMyPosts = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.uid;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const posts = await this.postService.getPostsByAuthor(userId, limit);
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch my posts",
      });
    }
  };

  createPost = async (req: AuthRequest, res: Response) => {
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

      const { title, caption, visibility, tags } = req.body;
      const files = (req.files as Express.Multer.File[]) || [];

      if (!caption && files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập nội dung hoặc thêm ảnh/video",
        });
      }

      const media: Array<{ type: 'image' | 'video'; sourceUrl: string; width: number; height: number }> = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const fileType = file.mimetype.startsWith("image/")
              ? "image"
              : "video";
            const uploadResult = await uploadFile(file, `posts/${userId}`);

            media.push({
              type: fileType,
              sourceUrl: uploadResult.url,
              width: uploadResult.width,
              height: uploadResult.height,
            });
          } catch (uploadError) {
            console.error("Error uploading file:", uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      let finalCaption = "";
      if (title && title.trim()) {
        finalCaption =
          title.trim() +
          (caption && caption.trim() ? `\n${caption.trim()}` : "");
      } else {
        finalCaption = caption ? caption.trim() : "";
      }

      let tagsArray: string[] = [];
      if (tags) {
        try {
          tagsArray = typeof tags === "string" ? JSON.parse(tags) : tags;
          if (!Array.isArray(tagsArray)) {
            tagsArray = [];
          }
        } catch {
          tagsArray = [];
        }
      }

      const post = await this.postService.createPost({
        authorId: userId,
        authorName: account.name,
        authorAvatar: account.avatar || "",
        caption: finalCaption.trim(),
        media,
        visibility: visibility || "public",
        tags: tagsArray,
      });

      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io) {
        io.emit('post_created', {
          post: post,
        });
      }

      res.json({
        success: true,
        data: post,
        message: "Đăng bài thành công",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Không thể đăng bài",
      });
    }
  };

  updatePost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const postId = req.params.id;

      const post = await this.postService.getPostById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      if (post.authorId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền chỉnh sửa bài viết này",
        });
      }

      const { title, caption, visibility, tags, existingMedia } = req.body;
      const files = (req.files as Express.Multer.File[]) || [];

      const updateData: any = {};

      if (caption !== undefined || title !== undefined) {
        let finalCaption = caption !== undefined ? caption : post.caption;
        if (title !== undefined && title.trim()) {
          const existingContent =
            caption !== undefined
              ? caption
              : post.caption.includes("\n")
              ? post.caption.split("\n").slice(1).join("\n")
              : "";
          finalCaption =
            title.trim() + (existingContent ? `\n${existingContent}` : "");
        }
        updateData.caption = finalCaption.trim();
      }

      if (visibility !== undefined) {
        updateData.visibility = visibility;
      }

      if (tags !== undefined) {
        let tagsArray: string[] = [];
        try {
          tagsArray = typeof tags === "string" ? JSON.parse(tags) : tags;
          if (!Array.isArray(tagsArray)) {
            tagsArray = [];
          }
        } catch {
          tagsArray = [];
        }
        updateData.tags = tagsArray;
      }

      // Handle media: existingMedia + new files
      let finalMedia: Array<{
        type: "image" | "video";
        sourceUrl: string;
        width: number;
        height: number;
      }> = [];

      // Parse existingMedia if provided
      if (existingMedia) {
        try {
          const existingMediaArray = typeof existingMedia === "string" 
            ? JSON.parse(existingMedia) 
            : existingMedia;
          if (Array.isArray(existingMediaArray)) {
            finalMedia = [...existingMediaArray];
          }
        } catch (error) {
          console.error("Error parsing existingMedia:", error);
          // If parsing fails, keep existing media from post
          finalMedia = [...(post.media || [])];
        }
      } else {
        // If no existingMedia provided, keep existing media from post
        finalMedia = [...(post.media || [])];
      }

      // Upload and add new files
      if (files && files.length > 0) {
        const newMedia: Array<{
          type: "image" | "video";
          sourceUrl: string;
          width: number;
          height: number;
        }> = [];
        for (const file of files) {
          try {
            const fileType: "image" | "video" = file.mimetype.startsWith("image/")
              ? "image"
              : "video";
            const uploadResult = await uploadFile(file, `posts/${userId}`);

            newMedia.push({
              type: fileType,
              sourceUrl: uploadResult.url,
              width: uploadResult.width,
              height: uploadResult.height,
            });
          } catch (uploadError) {
            console.error("Error uploading file:", uploadError);
          }
        }
        if (newMedia.length > 0) {
          finalMedia = [...finalMedia, ...newMedia];
        }
      }

      // Update media if changed
      updateData.media = finalMedia;

      const updatedPost = await this.postService.updatePost(postId, updateData);

      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io && updatedPost) {
        io.emit('post_updated', {
          postId: postId,
          post: updatedPost,
        });
      }

      res.json({
        success: true,
        data: updatedPost,
        message: "Cập nhật bài viết thành công",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Không thể cập nhật bài viết",
      });
    }
  };

  deletePost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const postId = req.params.id;

      const post = await this.postService.getPostById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      if (post.authorId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xóa bài viết này",
        });
      }

      await this.postService.deletePost(postId);

      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io) {
        io.emit('post_deleted', {
          postId: postId,
        });
      }

      res.json({
        success: true,
        message: "Xóa bài viết thành công",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Không thể xóa bài viết",
      });
    }
  };

  getDeletedPosts = async (req: AuthRequest, res: Response) => {
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

      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const posts = await this.postService.getDeletedPostsByAuthor(
        userId,
        limit
      );
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch deleted posts",
      });
    }
  };

  restorePost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const postId = req.params.id;

      const post = await this.postService.getPostById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      if (post.authorId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền khôi phục bài viết này",
        });
      }

      if (!post.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Bài viết này chưa bị xóa",
        });
      }

      const restoredPost = await this.postService.restorePost(postId);

      res.json({
        success: true,
        data: restoredPost,
        message: "Khôi phục bài viết thành công",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Không thể khôi phục bài viết",
      });
    }
  };
  getLatestPosts = async (req: Request, res: Response) => {
    try {
      const posts = await this.postService.getLatestPosts();
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getTopLikedPosts = async (req: Request, res: Response) => {
    try {
      const posts = await this.postService.getTopLikedPosts();
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };


  getTopViewedPosts = async (req: Request, res: Response) => {
    try {
      const posts = await this.postService.getTopViewedPosts();
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getPromotedPosts = async (req: Request, res: Response) => {
    try {
      const posts = await this.postService.getPromotedPosts();
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  toggleLike = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = req.user.userId;
      const postId = req.params.id;

      const result = await this.postService.toggleLike(postId, userId);

      res.json({
        success: true,
        data: result,
        message: result.isLiked ? "Đã thích bài viết" : "Đã bỏ thích bài viết",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Không thể thích/bỏ thích bài viết",
      });
    }
  };

  getPostById = async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      if (!postId) {
        return res.status(400).json({
          success: false,
          message: 'Post ID is required'
        });
      }

      const userId = (req as any).user?.uid || undefined;
      const post = await this.postService.getPostById(postId, userId);
       if (!post) {
         return res.status(404).json({
           success: false,
           message: 'Post not found'
         });
       }

       res.json({ success: true, data: post });
     } catch (error: any) {
       res.status(500).json({
         success: false,
         message: error.message || 'Failed to fetch post'
       });
     }
   };

  likePost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const postId = req.params.id;
      if (!postId) {
        return res.status(400).json({ success: false, message: 'Post ID is required' });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const updated = await this.postService.incrementLike(postId, userId);
      
      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io && updated) {
        io.emit('post_liked', {
          postId: postId,
          likeCount: updated.likeCount || 0,
          userId: userId,
        });
      }
      
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to like post' });
    }
  };

  unlikePost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const postId = req.params.id;
      if (!postId) {
        return res.status(400).json({ success: false, message: 'Post ID is required' });
      }

      const userId = (req.user as any)?.uid || (req.user as any)?.userId || (req.user as any)?.id;
      const updated = await this.postService.decrementLike(postId, userId);
      
      // Emit WebSocket event for real-time updates
      const io = (global as any).io;
      if (io && updated) {
        io.emit('post_unliked', {
          postId: postId,
          likeCount: updated.likeCount || 0,
          userId: userId,
        });
      }
      
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to unlike post' });
    }
  };

  sharePost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Chưa đăng nhập",
        });
      }

      const account = await Account.findById(userId);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản",
        });
      }

      const { caption, visibility, sharedWith } = req.body;

      console.log('📤 Share post request:', {
        postId: id,
        userId,
        visibility: visibility || "public",
        sharedWith: sharedWith || 'none'
      });

      const sharedPost = await this.postService.sharePost(
        id,
        userId,
        account.name || account.email,
        account.avatar || "",
        caption || "",
        visibility || "public",
        sharedWith || undefined
      );

      res.status(201).json({
        success: true,
        message: "Đã chia sẻ bài viết",
        data: sharedPost,
      });
    } catch (error: any) {
      console.error("Error sharing post:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Không thể chia sẻ bài viết",
      });
    }
  };
}
