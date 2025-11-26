import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';
import { Friend } from './Friend';

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
  visibility: "public" | "friends" | "private" | "specific";
  isDeleted: boolean;
  isLiked?: boolean;
  // Shared post fields
  isShared?: boolean;
  sharedPostId?: string;
  sharedPost?: IPost;
  shareCount?: number;
  sharedWith?: string[]; // Array of user IDs who can see this post (only for specific visibility)
}

export class Post {
  private static collection = "posts";

  /**
   * Check if two users are friends
   */
  private static async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendship = await Friend.findByUsers(userId1, userId2);
      return !!friendship;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper method to populate shared post data
   */
  private static async populateSharedPosts(posts: IPost[]): Promise<IPost[]> {
    if (!firestore) return posts;

    const postsWithShared = await Promise.all(
      posts.map(async (post) => {
        if (post.isShared && post.sharedPostId) {
          try {
            const sharedPost = await this.findById(post.sharedPostId);
            if (sharedPost && !sharedPost.isDeleted) {
              post.sharedPost = sharedPost;
            }
          } catch (error) {
            console.error(`Failed to load shared post ${post.sharedPostId}:`, error);
          }
        }
        return post;
      })
    );

    return postsWithShared;
  }

  /**
   * Find all posts accessible by a user (considering visibility settings)
   * @param limit Maximum number of posts to return
   * @param userId Optional user ID to check access permissions
   */
  static async findAllAccessiblePosts(limit: number = 50, userId?: string): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    try {
      const postsRef = firestore.collection(this.collection);
      const snapshot = await postsRef.limit(200).get();

      if (snapshot.empty) {
        return [];
      }

      const allPosts = snapshot.docs
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
            isShared: data.isShared || false,
            sharedPostId: data.sharedPostId || undefined,
            shareCount: data.shareCount || 0,
            sharedWith: data.sharedWith || undefined,
          } as IPost;
        })
        .filter((post) => !post.isDeleted);

      // Filter by visibility asynchronously
      const accessiblePosts = await Promise.all(
        allPosts.map(async (post) => {
          // Public posts - everyone can see
          if (post.visibility === "public") {
            return post;
          }

          // Private posts - only author can see
          if (post.visibility === "private") {
            return userId && post.authorId === userId ? post : null;
          }

          // Specific users - check if userId is in sharedWith array
          if (post.visibility === "specific") {
            if (!userId) return null;
            if (post.authorId === userId) return post; // Author can see own post
            const canView = post.sharedWith && post.sharedWith.includes(userId);
            console.log(`🔍 Checking specific post ${post.postId}:`, {
              userId,
              authorId: post.authorId,
              sharedWith: post.sharedWith,
              canView
            });
            return canView ? post : null;
          }

          // Friends-only posts - check friendship
          if (post.visibility === "friends") {
            if (!userId) return null;
            if (post.authorId === userId) return post; // Author can see own post
            const areFriends = await this.areFriends(userId, post.authorId);
            console.log(`🔍 Checking friends-only post ${post.postId}: userId=${userId}, authorId=${post.authorId}, areFriends=${areFriends}`);
            return areFriends ? post : null;
          }

          return null;
        })
      );

      const posts = accessiblePosts
        .filter((post): post is IPost => post !== null)
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

      // Populate shared post data
      const postsWithShared = await this.populateSharedPosts(posts);
      return postsWithShared;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * @deprecated Use findAllAccessiblePosts instead
   */
  static async findAllPublic(limit: number = 50): Promise<IPost[]> {
    return this.findAllAccessiblePosts(limit);
  }

  // Variant that can annotate returned posts with whether the given user liked them
  static async findAllPublicWithUser(limit: number = 50, userId?: string): Promise<IPost[]> {
    const posts = await this.findAllAccessiblePosts(limit, userId);
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

    // Populate shared post data
    const postsWithShared = await this.populateSharedPosts(posts);
    return postsWithShared;
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

    return posts;
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
    visibility: "public" | "friends" | "private" | "specific";
    tags?: string[];
    sharedWith?: string[];
  }): Promise<IPost> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const now = admin.firestore.Timestamp.now();
    const newPost: any = {
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

    // Add sharedWith array if visibility is specific
    if (postData.visibility === "specific" && postData.sharedWith) {
      newPost.sharedWith = postData.sharedWith;
    }

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

    return posts;
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
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

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
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const snapshot = await firestore
      .collection(this.collection)
      .where("visibility", "==", "public")
      .where("isDeleted", "==", false)
      .orderBy("likeCount", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
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
    });
  }

  static async findTopLikedPaginated(
    skip: number,
    limit: number
  ): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    try {
      const postsRef = firestore.collection(this.collection);
      // Firestore doesn't support skip directly, so we fetch more and slice
      const snapshot = await postsRef
        .where("visibility", "==", "public")
        .where("isDeleted", "==", false)
        .orderBy("likeCount", "desc")
        .limit((skip + limit) * 2) // Fetch more to account for pagination
        .get();

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
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(skip, skip + limit);

      return posts;
    } catch (error: any) {
      throw error;
    }
  }

  static async findTopViewed(limit = 6): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const snapshot = await firestore
      .collection(this.collection)
      .where("visibility", "==", "public")
      .where("isDeleted", "==", false)
      .orderBy("viewCount", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
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
    });
  }

  static async findTopViewedPaginated(
    skip: number,
    limit: number
  ): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    try {
      const postsRef = firestore.collection(this.collection);
      // Firestore doesn't support skip directly, so we fetch more and slice
      const snapshot = await postsRef
        .where("visibility", "==", "public")
        .where("isDeleted", "==", false)
        .orderBy("viewCount", "desc")
        .limit((skip + limit) * 2) // Fetch more to account for pagination
        .get();

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
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(skip, skip + limit);

      return posts;
    } catch (error: any) {
      throw error;
    }
  }

  static async findTopPromoted(limit = 4): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

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

  static async toggleLike(
    postId: string,
    userId: string
  ): Promise<{ isLiked: boolean; likeCount: number }> {
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

  static async checkUserLiked(
    postId: string,
    userId: string
  ): Promise<boolean> {
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
  static async findAllPublicPaginated(
    skip: number,
    limit: number,
    userId?: string
  ): Promise<IPost[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    console.log('🔎 findAllPublicPaginated called with:', { skip, limit, userId });

    try {
      const postsRef = firestore.collection(this.collection);
      // Fetch more posts to account for visibility filtering
      const snapshot = await postsRef
        .where("isDeleted", "==", false)
        .limit((skip + limit) * 3) // Fetch extra to account for visibility filtering
        .get();

      if (snapshot.empty) {
        return [];
      }

      const allPosts = snapshot.docs
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
            isShared: data.isShared || false,
            sharedPostId: data.sharedPostId || undefined,
            shareCount: data.shareCount || 0,
            sharedWith: data.sharedWith || undefined,
          } as IPost;
        })
        .filter((post) => !post.isDeleted);

      console.log('📊 Total posts loaded:', allPosts.length);
      console.log('📊 Posts by visibility:', {
        public: allPosts.filter(p => p.visibility === 'public').length,
        friends: allPosts.filter(p => p.visibility === 'friends').length,
        specific: allPosts.filter(p => p.visibility === 'specific').length,
        private: allPosts.filter(p => p.visibility === 'private').length,
      });
      console.log('📊 Specific visibility posts:', 
        allPosts
          .filter(p => p.visibility === 'specific')
          .map(p => ({ postId: p.postId, authorId: p.authorId, sharedWith: p.sharedWith }))
      );

      // Filter by visibility
      const accessiblePosts = await Promise.all(
        allPosts.map(async (post) => {
          if (post.visibility === "public") return post;
          if (post.visibility === "private") {
            return userId && post.authorId === userId ? post : null;
          }
          if (post.visibility === "specific") {
            if (!userId) return null;
            if (post.authorId === userId) return post; // Author can see own post
            const canView = post.sharedWith && post.sharedWith.includes(userId);
            console.log(`🔍 Checking specific post ${post.postId}:`, {
              userId,
              authorId: post.authorId,
              sharedWith: post.sharedWith,
              canView
            });
            return canView ? post : null;
          }
          if (post.visibility === "friends") {
            if (!userId) return null;
            if (post.authorId === userId) return post;
            const areFriends = await this.areFriends(userId, post.authorId);
            return areFriends ? post : null;
          }
          return null;
        })
      );

      const posts = accessiblePosts
        .filter((post): post is IPost => post !== null)
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
        .slice(skip, skip + limit);

      console.log('📤 Posts after filter and pagination:', {
        totalAccessible: accessiblePosts.filter(p => p !== null).length,
        afterSlice: posts.length,
        postIds: posts.map(p => p.postId),
        specificInResult: posts.filter(p => p.visibility === 'specific').map(p => p.postId)
      });

      // Populate shared post data
      const postsWithShared = await this.populateSharedPosts(posts);
      return postsWithShared;
    } catch (error: any) {
      throw error;
    }
  }

  static async countAllPublic(): Promise<number> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    try {
      const postsRef = firestore.collection(this.collection);
      const snapshot = await postsRef
        .where("visibility", "==", "public")
        .where("isDeleted", "==", false)
        .get();

      return snapshot.size;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Create a shared post (like Facebook share)
   */
  static async createSharedPost(
    sharedPostId: string,
    authorId: string,
    authorName: string,
    authorAvatar: string,
    caption: string,
    visibility: "public" | "friends" | "private" | "specific",
    sharedWith?: string[]
  ): Promise<IPost> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    // Check if original post exists
    const originalPost = await this.findById(sharedPostId);
    if (!originalPost) {
      throw new Error("Bài viết gốc không tồn tại");
    }

    if (originalPost.isDeleted) {
      throw new Error("Bài viết gốc đã bị xóa");
    }

    const now = admin.firestore.Timestamp.now();
    const newSharedPost: any = {
      authorId,
      authorName,
      authorAvatar,
      caption: caption || `${authorName} đã chia sẻ bài viết`,
      media: [],
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      viewCount: 0,
      commentCount: 0,
      promotionLevel: 0,
      tags: [],
      visibility,
      isDeleted: false,
      isShared: true,
      sharedPostId,
      shareCount: 0,
    };

    // Add sharedWith array if visibility is specific
    if (visibility === "specific" && sharedWith && sharedWith.length > 0) {
      newSharedPost.sharedWith = sharedWith;
      console.log('✅ Added sharedWith to post:', sharedWith);
    }

    console.log('📝 Creating shared post with data:', {
      authorId,
      visibility,
      sharedWith: newSharedPost.sharedWith,
      isShared: newSharedPost.isShared,
      sharedPostId
    });

    const docRef = await firestore.collection(this.collection).add(newSharedPost);

    // Increment share count on original post
    await firestore
      .collection(this.collection)
      .doc(sharedPostId)
      .update({
        shareCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      });

    return {
      postId: docRef.id,
      ...newSharedPost,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
      sharedPost: originalPost,
    };
  }

  /**
   * Get post with shared post data populated
   */
  static async findByIdWithShared(postId: string): Promise<IPost | null> {
    const post = await this.findById(postId);
    if (!post) return null;

    if (post.isShared && post.sharedPostId) {
      const sharedPost = await this.findById(post.sharedPostId);
      if (sharedPost) {
        post.sharedPost = sharedPost;
      }
    }

    return post;
  }
}
