import { Request, Response } from 'express';
import { CommentService } from '../services/comment.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Account } from '../models/Account';

export class CommentController {
  static async getCommentsByPost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      const comments = await CommentService.getCommentsByTargetId(postId, limit);
      
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await CommentService.getCommentsByTargetId(comment.commentId, 50);
          return {
            ...comment,
            replies: replies.length > 0 ? replies : undefined
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

      if (!targetId || !content || !content.trim()) {
        return res.status(400).json({ error: 'Target ID and content are required' });
      }

      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const account = await Account.findById(req.user.uid);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const comment = await CommentService.createComment({
        targetId,
        authorId: account.id,
        authorName: account.name || account.email || 'Người dùng',
        authorAvatar: account.avatarUrl || '',
        content: content.trim()
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

      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const comment = await CommentService.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.authorId !== req.user.uid) {
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

      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const comment = await CommentService.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.authorId !== req.user.uid) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own comments' });
      }

      await CommentService.deleteComment(commentId);
      res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
}

