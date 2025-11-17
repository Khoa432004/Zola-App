import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

export interface IComment {
  commentId: string;
  targetId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  media?: Array<{
    type: 'image' | 'video';
    sourceUrl: string;
    width: number;
    height: number;
  }>;
  createdAt: admin.firestore.Timestamp | Date;
  updatedAt: admin.firestore.Timestamp | Date;
  likeCount: number;
  isDeleted: boolean;
  rootPostId?: string;
}

export class Comment {
  private static collection = 'comments';
  private static postsCollection = 'posts';

  private static async resolveRootPostId(
    targetId: string,
    depth: number = 0
  ): Promise<string | null> {
    if (!firestore || !targetId || depth > 10) {
      return null;
    }

    // Check if target is a post
    const postDoc = await firestore
      .collection(this.postsCollection)
      .doc(targetId)
      .get();
    if (postDoc.exists) {
      return targetId;
    }

    // Otherwise, try to resolve via parent comment
    const commentDoc = await firestore
      .collection(this.collection)
      .doc(targetId)
      .get();
    if (!commentDoc.exists) {
      return null;
    }

    const data = commentDoc.data();
    if (!data) return null;

    if (data.rootPostId) {
      return data.rootPostId as string;
    }

    return await this.resolveRootPostId(data.targetId, depth + 1);
  }

  private static async updatePostCommentCount(
    postId: string,
    delta: number
  ): Promise<void> {
    if (!firestore || !postId || delta === 0) {
      return;
    }

    await firestore
      .collection(this.postsCollection)
      .doc(postId)
      .update({
        commentCount: admin.firestore.FieldValue.increment(delta),
        updatedAt: admin.firestore.Timestamp.now(),
      });
  }

  static async findByTargetId(targetId: string, limit: number = 50): Promise<IComment[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const commentsRef = firestore.collection(this.collection);
      const snapshot = await commentsRef
        .where('targetId', '==', targetId)
        .where('isDeleted', '==', false)
        .limit(limit > 50 ? limit : 50)
        .get();

      if (snapshot.empty) {
        return [];
      }

      const comments = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const createdAt = data.createdAt 
            ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
            : new Date();
          const updatedAt = data.updatedAt 
            ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt))
            : new Date();
          
              return {
                commentId: doc.id,
                targetId: data.targetId || '',
                authorId: data.authorId || '',
                authorName: data.authorName || '',
                authorAvatar: data.authorAvatar || '',
                content: data.content || '',
                media: data.media || [],
                createdAt,
                updatedAt,
                likeCount: data.likeCount || 0,
                isDeleted: data.isDeleted || false,
              } as IComment;
        })
        .sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
          return aTime - bTime;
        })
        .slice(0, limit);

      return comments;
    } catch (error: any) {
      throw error;
    }
  }

  // Count all comments + nested replies for a target (post)
  static async countAllCommentsForTarget(targetId: string): Promise<number> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const commentsRef = firestore.collection(this.collection);
      const snapshot = await commentsRef
        .where('targetId', '==', targetId)
        .where('isDeleted', '==', false)
        .get();

      // snapshot.size gives count of top-level comments
      let totalCount = snapshot.size;

      // For each top-level comment, count its nested replies
      for (const doc of snapshot.docs) {
        const commentId = doc.id;
        const repliesSnapshot = await commentsRef
          .where('targetId', '==', commentId)
          .where('isDeleted', '==', false)
          .get();
        totalCount += repliesSnapshot.size;

        // Recursively count replies of replies
        for (const replyDoc of repliesSnapshot.docs) {
          const replyId = replyDoc.id;
          const nestedRepliesSnapshot = await commentsRef
            .where('targetId', '==', replyId)
            .where('isDeleted', '==', false)
            .get();
          totalCount += nestedRepliesSnapshot.size;
          // Can continue recursing if needed, but typically 2-3 levels is enough
        }
      }

      return totalCount;
    } catch (error: any) {
      throw error;
    }
  }

  static async create(commentData: {
    targetId: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    content: string;
  }): Promise<IComment> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = admin.firestore.Timestamp.now();
    const rootPostId = await this.resolveRootPostId(commentData.targetId);

    const newComment: Omit<IComment, 'commentId'> = {
      targetId: commentData.targetId,
      authorId: commentData.authorId,
      authorName: commentData.authorName,
      authorAvatar: commentData.authorAvatar,
      content: commentData.content,
      media: (commentData as any).media || [],
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      isDeleted: false,
      rootPostId: rootPostId || undefined,
    };

    const docRef = await firestore.collection(this.collection).add(newComment);

    if (rootPostId) {
      await this.updatePostCommentCount(rootPostId, 1);
    }

    return {
    commentId: docRef.id,
    ...newComment,
    createdAt: now.toDate(),
    updatedAt: now.toDate()
    };
  }

  static async findById(commentId: string): Promise<IComment | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const doc = await firestore.collection(this.collection).doc(commentId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data()!;
      const createdAt = data.createdAt 
        ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
        : new Date();
      const updatedAt = data.updatedAt 
        ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt))
        : new Date();

      return {
        commentId: doc.id,
        targetId: data.targetId || '',
        authorId: data.authorId || '',
        authorName: data.authorName || '',
        authorAvatar: data.authorAvatar || '',
        content: data.content || '',
        media: data.media || [],
        createdAt,
        updatedAt,
        likeCount: data.likeCount || 0,
        isDeleted: data.isDeleted || false,
      } as IComment;
    } catch (error: any) {
      throw error;
    }
  }

  static async update(commentId: string, updateData: Partial<{
    content: string;
    likeCount: number;
    isDeleted: boolean;
  }>): Promise<IComment | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const docRef = firestore.collection(this.collection).doc(commentId);
      const updateFields: any = {
        updatedAt: admin.firestore.Timestamp.now()
      };

      if (updateData.content !== undefined) {
        updateFields.content = updateData.content;
      }
      if (updateData.likeCount !== undefined) {
        updateFields.likeCount = updateData.likeCount;
      }
      if (updateData.isDeleted !== undefined) {
        updateFields.isDeleted = updateData.isDeleted;
      }

      await docRef.update(updateFields);
      return await this.findById(commentId);
    } catch (error: any) {
      throw error;
    }
  }

  static async delete(commentId: string): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const commentDoc = await firestore.collection(this.collection).doc(commentId).get();
    if (!commentDoc.exists) {
      return;
    }

    const data = commentDoc.data();
    if (!data || data.isDeleted) {
      return;
    }

    await this.update(commentId, { isDeleted: true });

    const rootPostId =
      data.rootPostId ||
      (await this.resolveRootPostId(data.targetId));
    if (rootPostId) {
      await this.updatePostCommentCount(rootPostId, -1);
    }
  }

  static async incrementLike(commentId: string): Promise<IComment | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const docRef = firestore.collection(this.collection).doc(commentId);
      await firestore.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        if (!doc.exists) {
          throw new Error('Comment not found');
        }
        const data = doc.data() || {};
        const current = typeof data.likeCount === 'number' ? data.likeCount : 0;
        const next = current + 1;
        tx.update(docRef, { likeCount: next, updatedAt: admin.firestore.Timestamp.now() });
      });
      return await this.findById(commentId);
    } catch (error: any) {
      throw error;
    }
  }

  static async decrementLike(commentId: string): Promise<IComment | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const docRef = firestore.collection(this.collection).doc(commentId);
      await firestore.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        if (!doc.exists) {
          throw new Error('Comment not found');
        }
        const data = doc.data() || {};
        const current = typeof data.likeCount === 'number' ? data.likeCount : 0;
        const next = Math.max(0, current - 1);
        tx.update(docRef, { likeCount: next, updatedAt: admin.firestore.Timestamp.now() });
      });
      return await this.findById(commentId);
    } catch (error: any) {
      throw error;
    }
  }
}

