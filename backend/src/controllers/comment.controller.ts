import { Request, Response } from 'express';
import { CommentService } from '../services/comment.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Account } from '../models/Account';
import { uploadFile } from '../utils/storage';

export class CommentController {
  static async getCommentsByPost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      // Recursive function to load nested replies infinitely
      const loadNestedReplies = async (targetId: string): Promise<any[]> => {
        const replies = await CommentService.getCommentsByTargetId(targetId, 500);
        const repliesWithNested = await Promise.all(
          replies.map(async (reply) => {
            const nestedReplies = await loadNestedReplies(reply.commentId);
            return {
              ...reply,
              replies: nestedReplies.length > 0 ? nestedReplies : undefined
            };
          })
        );
        return repliesWithNested;
      };

      const comments = await CommentService.getCommentsByTargetId(postId, 500);
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const nestedReplies = await loadNestedReplies(comment.commentId);
          return {
            ...comment,
            replies: nestedReplies.length > 0 ? nestedReplies : undefined
          };
        })
      );

      res.json(commentsWithReplies);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  static async createComment(req: AuthRequest, res: Response) {
    try {
      const { targetId, content } = req.body;
      const files = (req.files as Express.Multer.File[]) || [];

      // Require either content or at least one file
      if (!targetId || ((!content || !content.trim()) && files.length === 0)) {
        return res.status(400).json({ error: 'Target ID and content or media are required' });
      }

      if (!req.user?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const account = await Account.findById(req.user.userId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // If files were uploaded, upload them to storage and build media array
      const media: any[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const uploaded = await uploadFile(file, `comments/${account.id}`);
            media.push({
              type: file.mimetype.startsWith('image/') ? 'image' : 'video',
              sourceUrl: uploaded.url,
              width: uploaded.width || 0,
              height: uploaded.height || 0
            });
          } catch (err) {
            console.error('Error uploading comment media:', err);
          }
        }
      }

      const comment = await CommentService.createComment({
        targetId,
        authorId: account.id,
        authorName: account.name || account.email || 'Người dùng',
        authorAvatar: account.avatar || '',
        content: (content || '').trim(),
        media: media.length > 0 ? media : undefined
      });

      res.status(201).json(comment);
    } catch (error: any) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }

  static async updateComment(req: AuthRequest, res: Response) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;

      if (!commentId) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      if (!req.user?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const comment = await CommentService.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.authorId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own comments' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const updatedComment = await CommentService.updateComment(commentId, {
        content: content.trim()
      });

      res.json(updatedComment);
    } catch (error: any) {
      console.error('Error updating comment:', error);
      res.status(500).json({ error: 'Failed to update comment' });
    }
  }

  static async deleteComment(req: AuthRequest, res: Response) {
    try {
      const { commentId } = req.params;

      if (!commentId) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      if (!req.user?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const comment = await CommentService.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.authorId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own comments' });
      }

      await CommentService.deleteComment(commentId);
      res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }

  static async likeComment(req: AuthRequest, res: Response) {
    try {
      const { commentId } = req.params;
      if (!commentId) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updated = await CommentService.incrementLike(commentId);
      if (!updated) return res.status(404).json({ error: 'Comment not found' });
      res.json(updated);
    } catch (error: any) {
      console.error('Error liking comment:', error);
      res.status(500).json({ error: 'Failed to like comment' });
    }
  }

  static async unlikeComment(req: AuthRequest, res: Response) {
    try {
      const { commentId } = req.params;
      if (!commentId) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updated = await CommentService.decrementLike(commentId);
      if (!updated) return res.status(404).json({ error: 'Comment not found' });
      res.json(updated);
    } catch (error: any) {
      console.error('Error unliking comment:', error);
      res.status(500).json({ error: 'Failed to unlike comment' });
    }
  }
}

