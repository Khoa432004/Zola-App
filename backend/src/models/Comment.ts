import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

export interface IComment {
  commentId: string;
  targetId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: admin.firestore.Timestamp | Date;
  updatedAt: admin.firestore.Timestamp | Date;
  likeCount: number;
  isDeleted: boolean;
}

export class Comment {
  private static collection = 'comments';

  static async findByTargetId(targetId: string, limit: number = 50): Promise<IComment[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const commentsRef = firestore.collection(this.collection);
      const snapshot = await commentsRef
        .where('targetId', '==', targetId)
        .where('isDeleted', '==', false)
        .limit(200)
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
    const newComment: Omit<IComment, 'commentId'> = {
      targetId: commentData.targetId,
      authorId: commentData.authorId,
      authorName: commentData.authorName,
      authorAvatar: commentData.authorAvatar,
      content: commentData.content,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      isDeleted: false
    };

    const docRef = await firestore.collection(this.collection).add(newComment);
    
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
    await this.update(commentId, { isDeleted: true });
  }
}

