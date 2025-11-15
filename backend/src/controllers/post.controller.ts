import { Request, Response } from 'express';
import { PostService } from '../services/post.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Account } from '../models/Account';
import { uploadFile } from '../utils/storage';

export class PostController {
  private postService: PostService;

  constructor() {
    this.postService = new PostService();
  }

  getAllPosts = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await this.postService.getPublicPosts(limit);
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to fetch posts' 
      });
    }
  };

  getFeaturedPosts = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const posts = await this.postService.getFeaturedPosts(limit);
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to fetch featured posts' 
      });
    }
  };

  getMyPosts = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.uid;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized' 
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await this.postService.getPostsByAuthor(userId, limit);
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to fetch my posts' 
      });
    }
  };

  createPost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const userId = req.user.uid || req.user.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found'
        });
      }

      const account = await Account.findById(userId);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      const { title, caption, visibility, tags } = req.body;
      const files = req.files as Express.Multer.File[] || [];

      if (!caption && files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập nội dung hoặc thêm ảnh/video'
        });
      }

      const media = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            const uploadResult = await uploadFile(file, `posts/${userId}`);

            media.push({
              type: fileType,
              sourceUrl: uploadResult.url,
              width: uploadResult.width,
              height: uploadResult.height
            });
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      let finalCaption = '';
      if (title && title.trim()) {
        finalCaption = title.trim() + (caption && caption.trim() ? `\n${caption.trim()}` : '');
      } else {
        finalCaption = caption ? caption.trim() : '';
      }

      let tagsArray: string[] = [];
      if (tags) {
        try {
          tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
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
        authorAvatar: account.avatar || '',
        caption: finalCaption.trim(),
        media,
        visibility: visibility || 'public',
        tags: tagsArray
      });

      res.json({
        success: true,
        data: post,
        message: 'Đăng bài thành công'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể đăng bài'
      });
    }
  };

  updatePost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const userId = req.user.uid || req.user.userId;
      const postId = req.params.id;

      const post = await this.postService.getPostById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      if (post.authorId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa bài viết này'
        });
      }

      const { title, caption, visibility, tags } = req.body;
      const files = req.files as Express.Multer.File[] || [];

      const updateData: any = {};

      if (caption !== undefined || title !== undefined) {
        let finalCaption = caption !== undefined ? caption : post.caption;
        if (title !== undefined && title.trim()) {
          const existingContent = caption !== undefined ? caption : (post.caption.includes('\n') ? post.caption.split('\n').slice(1).join('\n') : '');
          finalCaption = title.trim() + (existingContent ? `\n${existingContent}` : '');
        }
        updateData.caption = finalCaption.trim();
      }

      if (visibility !== undefined) {
        updateData.visibility = visibility;
      }

      if (tags !== undefined) {
        let tagsArray: string[] = [];
        try {
          tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
          if (!Array.isArray(tagsArray)) {
            tagsArray = [];
          }
        } catch {
          tagsArray = [];
        }
        updateData.tags = tagsArray;
      }

      if (files && files.length > 0) {
        const media = [];
        for (const file of files) {
          try {
            const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            const uploadResult = await uploadFile(file, `posts/${userId}`);

            media.push({
              type: fileType,
              sourceUrl: uploadResult.url,
              width: uploadResult.width,
              height: uploadResult.height
            });
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
          }
        }
        if (media.length > 0) {
          updateData.media = [...(post.media || []), ...media];
        }
      }

      const updatedPost = await this.postService.updatePost(postId, updateData);

      res.json({
        success: true,
        data: updatedPost,
        message: 'Cập nhật bài viết thành công'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể cập nhật bài viết'
      });
    }
  };

  deletePost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const userId = req.user.uid || req.user.userId;
      const postId = req.params.id;

      const post = await this.postService.getPostById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      if (post.authorId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa bài viết này'
        });
      }

      await this.postService.deletePost(postId);

      res.json({
        success: true,
        message: 'Xóa bài viết thành công'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể xóa bài viết'
      });
    }
  };

  getDeletedPosts = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const userId = req.user.uid || req.user.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found'
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await this.postService.getDeletedPostsByAuthor(userId, limit);
      res.json({ success: true, data: posts });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch deleted posts'
      });
    }
  };

  restorePost = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const userId = req.user.uid || req.user.userId;
      const postId = req.params.id;

      const post = await this.postService.getPostById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      if (post.authorId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền khôi phục bài viết này'
        });
      }

      if (!post.isDeleted) {
        return res.status(400).json({
          success: false,
          message: 'Bài viết này chưa bị xóa'
        });
      }

      const restoredPost = await this.postService.restorePost(postId);

      res.json({
        success: true,
        data: restoredPost,
        message: 'Khôi phục bài viết thành công'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể khôi phục bài viết'
      });
    }
  };
}

