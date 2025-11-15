import { Comment, IComment } from '../models/Comment';

export class CommentService {
  static async getCommentsByTargetId(targetId: string, limit: number = 50): Promise<IComment[]> {
    return await Comment.findByTargetId(targetId, limit);
  }

  static async createComment(commentData: {
    targetId: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    content: string;
  }): Promise<IComment> {
    return await Comment.create(commentData);
  }

  static async getCommentById(commentId: string): Promise<IComment | null> {
    return await Comment.findById(commentId);
  }

  static async updateComment(commentId: string, updateData: Partial<{
    content: string;
    likeCount: number;
    isDeleted: boolean;
  }>): Promise<IComment | null> {
    return await Comment.update(commentId, updateData);
  }

  static async deleteComment(commentId: string): Promise<void> {
    return await Comment.delete(commentId);
  }
}

