import { Post, IPost } from "../models/Post";

export class PostService {
  async getPublicPosts(limit?: number, userId?: string): Promise<IPost[]> {
    try {
      if (userId) return await Post.findAllPublicWithUser(limit, userId);
      return await Post.findAllPublic(limit);
    } catch (error) {
      throw error;
    }
  }

  async getPostsByAuthor(authorId: string, limit?: number): Promise<IPost[]> {
    try {
      return await Post.findByAuthorId(authorId, limit);
    } catch (error) {
      throw error;
    }
  }

  async getFeaturedPosts(limit?: number): Promise<IPost[]> {
    try {
      return await Post.findFeatured(limit);
    } catch (error) {
      throw error;
    }
  }

  async createPost(postData: {
    authorId: string;
    authorName: string;
    authorAvatar: string;
    caption: string;
    media: Array<{
      type: "image" | "video";
      sourceUrl: string;
      width: number;
      height: number;
    }>;
    visibility: "public" | "friends" | "private";
    tags?: string[];
  }): Promise<IPost> {
    try {
      return await Post.create(postData);
    } catch (error) {
      throw error;
    }
  }

  async getPostById(postId: string, userId?: string): Promise<IPost | null> {
    try {
      if (userId) return await Post.findByIdWithUser(postId, userId);
      return await Post.findById(postId);
    } catch (error) {
      throw error;
    }
  }

  async updatePost(
    postId: string,
    updateData: {
      caption?: string;
      media?: Array<{
        type: "image" | "video";
        sourceUrl: string;
        width: number;
        height: number;
      }>;
      visibility?: "public" | "friends" | "private";
      tags?: string[];
    }
  ): Promise<IPost | null> {
    try {
      return await Post.update(postId, updateData);
    } catch (error) {
      throw error;
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      return await Post.delete(postId);
    } catch (error) {
      throw error;
    }
  }

  async getDeletedPostsByAuthor(
    authorId: string,
    limit?: number
  ): Promise<IPost[]> {
    try {
      return await Post.findDeletedByAuthorId(authorId, limit);
    } catch (error) {
      throw error;
    }
  }

  async restorePost(postId: string): Promise<IPost | null> {
    try {
      return await Post.restore(postId);
    } catch (error) {
      throw error;
    }
  }
  async getLatestPosts() {
    return Post.findLatest(); // orderBy updatedAt desc
  }

  async incrementLike(postId: string, userId?: string): Promise<IPost | null> {
    try {
      return await Post.incrementLike(postId, userId);
    } catch (error) {
      throw error;
    }
  }

  async decrementLike(postId: string, userId?: string): Promise<IPost | null> {
    try {
      return await Post.decrementLike(postId, userId);
    } catch (error) {
      throw error;
    }
  }

  async getTopLikedPosts() {
    return Post.findTopLiked(); // orderBy likeCount desc
  }

  async getTopViewedPosts() {
    return Post.findTopViewed(); // orderBy viewCount desc
  }

  async getPromotedPosts() {
    return Post.findTopPromoted(); // orderBy promotionLevel desc
  }

  async toggleLike(postId: string, userId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    try {
      return await Post.toggleLike(postId, userId);
    } catch (error) {
      throw error;
    }
  }

  async checkUserLiked(postId: string, userId: string): Promise<boolean> {
    try {
      return await Post.checkUserLiked(postId, userId);
    } catch (error) {
      throw error;
    }
  }
}
