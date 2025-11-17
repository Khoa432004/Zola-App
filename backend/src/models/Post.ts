import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';
import { Comment } from './Comment';

export interface IPost {
  postId: string;
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
  createdAt: admin.firestore.Timestamp | Date;
  updatedAt: admin.firestore.Timestamp | Date;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  promotionLevel: number;
  tags: string[];
  visibility: "public" | "friends" | "private";
  isDeleted: boolean;
  isLiked?: boolean;
}

export class Post {
  private static collection = "posts";

  // Helper to annotate posts with actual comment counts (includes nested replies)
  private static async enrichPostsWithCommentCounts(posts: IPost[]): Promise<IPost[]> {
    try {
      const enriched = await Promise.all(
        posts.map(async (post) => {
          const count = await Comment.countAllCommentsForTarget(post.postId);
          return { ...post, commentCount: count };
        })
      );
      return enriched;
    } catch (err) {
      // If count fails, return posts as-is
      return posts;
    }
  }

  static async findAllPublic(limit: number = 50): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    try {
      const postsRef = firestore.collection(this.collection);
      const snapshot = await postsRef.limit(200).get();

      if (snapshot.empty) {
        return [];
      }

      const posts = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt
            ? data.createdAt.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt)
            : new Date();
          const updatedAt = data.updatedAt
            ? data.updatedAt.toDate
              ? data.updatedAt.toDate()
              : new Date(data.updatedAt)
            : new Date();

          return {
            postId: doc.id,
            authorId: data.authorId || "",
            authorName: data.authorName || "",
            authorAvatar: data.authorAvatar || "",
            caption: data.caption || "",
            media: data.media || [],
            createdAt,
            updatedAt,
            likeCount: data.likeCount || 0,
            viewCount: data.viewCount || 0,
            commentCount: data.commentCount || 0,
            promotionLevel: data.promotionLevel || 0,
            tags: data.tags || [],
            visibility: data.visibility || "public",
            isDeleted: data.isDeleted || false,
          } as IPost;
        })
        .filter((post) => post.visibility === "public" && !post.isDeleted)
        .sort((a, b) => {
          const aTime =
            a.createdAt instanceof Date
              ? a.createdAt.getTime()
              : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
          const bTime =
            b.createdAt instanceof Date
              ? b.createdAt.getTime()
              : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        })
        .slice(0, limit);

      return await this.enrichPostsWithCommentCounts(posts);
    } catch (error: any) {
      throw error;
    }
  }

  // Variant that can annotate returned posts with whether the given user liked them
  static async findAllPublicWithUser(limit: number = 50, userId?: string): Promise<IPost[]> {
    const posts = await this.findAllPublic(limit);
    if (!userId || posts.length === 0) return posts;

    try {
      const likesCollection = firestore!.collection('post_likes');
      // For each post, check if a like doc exists for this user (doc id: `${postId}_${userId}`)
      const checks = posts.map(async (p) => {
        try {
          const likeDoc = await likesCollection.doc(`${p.postId}_${userId}`).get();
          p.isLiked = likeDoc.exists;
        } catch {
          p.isLiked = false;
        }
        return p;
      });

      return await Promise.all(checks);
    } catch (err) {
      return posts;
    }
  }

  static async findByAuthorId(authorId: string, limit: number = 50): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const postsRef = firestore.collection(this.collection);
    const snapshot = await postsRef
      .where("authorId", "==", authorId)
      .limit(limit * 3)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const posts = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          postId: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as IPost;
      })
      .filter((post) => !post.isDeleted)
      .sort((a, b) => {
        const aTime =
          a.createdAt instanceof Date
            ? a.createdAt.getTime()
            : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
        const bTime =
          b.createdAt instanceof Date
            ? b.createdAt.getTime()
            : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);

    return await this.enrichPostsWithCommentCounts(posts);
  }

  static async findFeatured(limit: number = 10): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const postsRef = firestore.collection(this.collection);
    const snapshot = await postsRef
      .where("visibility", "==", "public")
      .limit(limit * 5)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const posts = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          postId: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as IPost;
      })
      .filter((post) => !post.isDeleted)
      .sort((a, b) => {
        if (a.promotionLevel !== b.promotionLevel) {
          return b.promotionLevel - a.promotionLevel;
        }
        return b.likeCount - a.likeCount;
      })
      .slice(0, limit);

    return await this.enrichPostsWithCommentCounts(posts);
  }

  static async create(postData: {
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
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const now = admin.firestore.Timestamp.now();
    const newPost: Omit<IPost, "postId"> = {
      authorId: postData.authorId,
      authorName: postData.authorName,
      authorAvatar: postData.authorAvatar,
      caption: postData.caption,
      media: postData.media,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      viewCount: 0,
      commentCount: 0,
      promotionLevel: 1,
      tags: postData.tags || [],
      visibility: postData.visibility,
      isDeleted: false,
    };

    const docRef = await firestore.collection(this.collection).add(newPost);

    return {
      postId: docRef.id,
      ...newPost,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
  }

  static async findById(postId: string): Promise<IPost | null> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const doc = await firestore.collection(this.collection).doc(postId).get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    const post = {
      postId: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      isLiked: false,
    } as IPost;

    // Fetch actual comment count (including nested replies)
    try {
      const count = await Comment.countAllCommentsForTarget(postId);
      post.commentCount = count;
    } catch {
      // Keep stored commentCount if fetch fails
    }

    return post;
  }

  static async findByIdWithUser(postId: string, userId?: string): Promise<IPost | null> {
    const post = await this.findById(postId);
    if (!post || !userId) return post;
    try {
      const likeDoc = await firestore!.collection('post_likes').doc(`${postId}_${userId}`).get();
      post.isLiked = likeDoc.exists;
    } catch {
      post.isLiked = false;
    }
    return post;
  }

  static async update(
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
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const updateFields: any = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (updateData.caption !== undefined)
      updateFields.caption = updateData.caption;
    if (updateData.media !== undefined) updateFields.media = updateData.media;
    if (updateData.visibility !== undefined)
      updateFields.visibility = updateData.visibility;
    if (updateData.tags !== undefined) updateFields.tags = updateData.tags;

    await firestore
      .collection(this.collection)
      .doc(postId)
      .update(updateFields);

    return await this.findById(postId);
  }

  static async delete(postId: string): Promise<boolean> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    await firestore.collection(this.collection).doc(postId).update({
      isDeleted: true,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return true;
  }

  static async findDeletedByAuthorId(
    authorId: string,
    limit: number = 50
  ): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const postsRef = firestore.collection(this.collection);
    const snapshot = await postsRef
      .where("authorId", "==", authorId)
      .limit(limit * 3)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const posts = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          postId: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as IPost;
      })
      .filter((post) => post.isDeleted === true)
      .sort((a, b) => {
        const aTime =
          a.updatedAt instanceof Date
            ? a.updatedAt.getTime()
            : (a.updatedAt as any)?.toDate?.()?.getTime() || 0;
        const bTime =
          b.updatedAt instanceof Date
            ? b.updatedAt.getTime()
            : (b.updatedAt as any)?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);

    return await this.enrichPostsWithCommentCounts(posts);
  }

  static async restore(postId: string): Promise<IPost | null> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    await firestore.collection(this.collection).doc(postId).update({
      isDeleted: false,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return await this.findById(postId);
  }

  static async incrementLike(postId: string, userId?: string): Promise<IPost | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const docRef = firestore.collection(this.collection).doc(postId);
      const likesRef = firestore.collection('post_likes').doc(`${postId}_${userId || 'anon'}`);

      await firestore.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        if (!doc.exists) {
          throw new Error('Post not found');
        }

        // If userId is provided, only increment if there isn't already a like record
        if (userId) {
          const likeDoc = await tx.get(likesRef);
          if (likeDoc.exists) {
            // already liked by this user; no-op
            return;
          }
          tx.set(likesRef, { postId, userId, createdAt: admin.firestore.Timestamp.now() });
        }

        const data = doc.data() || {};
        const current = typeof data.likeCount === 'number' ? data.likeCount : 0;
        const next = current + 1;
        tx.update(docRef, { likeCount: next, updatedAt: admin.firestore.Timestamp.now() });
      });

      return await this.findByIdWithUser(postId, userId);
    } catch (error: any) {
      throw error;
    }
  }

  static async decrementLike(postId: string, userId?: string): Promise<IPost | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const docRef = firestore.collection(this.collection).doc(postId);
      const likesRef = firestore.collection('post_likes').doc(`${postId}_${userId || 'anon'}`);

      await firestore.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        if (!doc.exists) {
          throw new Error('Post not found');
        }

        // If userId provided, only decrement if a like record exists
        if (userId) {
          const likeDoc = await tx.get(likesRef);
          if (!likeDoc.exists) {
            // nothing to do
            return;
          }
          tx.delete(likesRef);
        }

        const data = doc.data() || {};
        const current = typeof data.likeCount === 'number' ? data.likeCount : 0;
        const next = Math.max(0, current - 1);
        tx.update(docRef, { likeCount: next, updatedAt: admin.firestore.Timestamp.now() });
      });

      return await this.findByIdWithUser(postId, userId);
    } catch (error: any) {
      throw error;
    }
  }

  static async findLatest(limit = 8): Promise<IPost[]> {
    const snapshot = await firestore
      .collection(this.collection)
      .where("visibility", "==", "public")
      .where("isDeleted", "==", false)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      postId: doc.id,
      ...doc.data(),
    })) as IPost[];
  }

  static async findTopLiked(limit = 6): Promise<IPost[]> {
    const snapshot = await firestore
      .collection(this.collection)
      .where("visibility", "==", "public")
      .where("isDeleted", "==", false)
      .orderBy("likeCount", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      postId: doc.id,
      ...doc.data(),
    })) as IPost[];
  }

  static async findTopViewed(limit = 6): Promise<IPost[]> {
    const snapshot = await firestore
      .collection(this.collection)
      .where("visibility", "==", "public")
      .where("isDeleted", "==", false)
      .orderBy("viewCount", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        postId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as IPost;
    });
  }

  static async findTopPromoted(limit = 4): Promise<IPost[]> {
    const snapshot = await firestore
      .collection(this.collection)
      .where("visibility", "==", "public")
      .where("isDeleted", "==", false)
      .orderBy("promotionLevel", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      postId: doc.id,
      ...doc.data(),
    })) as IPost[];
  }

  static async toggleLike(postId: string, userId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const postRef = firestore.collection(this.collection).doc(postId);
    const likeRef = postRef.collection("likes").doc(userId);

    // Kiểm tra post có tồn tại không
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      throw new Error("Post not found");
    }

    // Kiểm tra user đã like chưa
    const likeDoc = await likeRef.get();
    const isCurrentlyLiked = likeDoc.exists;

    if (isCurrentlyLiked) {
      // Unlike: xóa like document và giảm likeCount
      await likeRef.delete();
      await postRef.update({
        likeCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Like: tạo like document và tăng likeCount
      await likeRef.set({
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await postRef.update({
        likeCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Lấy likeCount mới
    const updatedPostDoc = await postRef.get();
    const likeCount = (updatedPostDoc.data()?.likeCount || 0) as number;

    return {
      isLiked: !isCurrentlyLiked,
      likeCount,
    };
  }

  static async checkUserLiked(postId: string, userId: string): Promise<boolean> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const likeRef = firestore
      .collection(this.collection)
      .doc(postId)
      .collection("likes")
      .doc(userId);

    const likeDoc = await likeRef.get();
    return likeDoc.exists;
  }
}
