import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';
import { Friend } from './Friend';

/**
 * Story Interface
 * Story là nội dung tồn tại trong 24 giờ, tương tự Instagram/Facebook Stories
 */
export interface IStory {
  storyId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  
  // Media (chỉ 1 item - ảnh hoặc video)
  media: {
    type: "image" | "video";
    sourceUrl: string;
    width: number;
    height: number;
  };
  
  // Caption (text ngắn, optional)
  caption?: string;
  
  // Text overlay (sticker/text trên ảnh/video)
  textOverlay?: {
    text: string;
    x: number; // position % (0-100)
    y: number; // position % (0-100)
    fontSize?: number;
    color?: string;
    fontFamily?: string;
  };
  
  // Timing
  createdAt: admin.firestore.Timestamp | Date;
  expiresAt: admin.firestore.Timestamp | Date; // 24 hours from createdAt
  
  // Visibility settings
  visibility: "public" | "friends" | "close_friends";
  
  // View tracking
  viewers: string[]; // Array of user IDs who viewed this story
  viewCount: number;
  
  // Status
  isDeleted: boolean;
  isArchived?: boolean; // Save to highlights (future feature)
}

export class Story {
  private static collection = "stories";
  
  /**
   * Calculate expiration date (24 hours from now)
   */
  private static getExpirationDate(): admin.firestore.Timestamp {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const expirationTime = now + twentyFourHours;
    return admin.firestore.Timestamp.fromMillis(expirationTime);
  }
  
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
   * Create a new story
   */
  static async create(storyData: {
    authorId: string;
    authorName: string;
    authorAvatar: string;
    media: {
      type: "image" | "video";
      sourceUrl: string;
      width: number;
      height: number;
    };
    caption?: string;
    textOverlay?: {
      text: string;
      x: number;
      y: number;
      fontSize?: number;
      color?: string;
      fontFamily?: string;
    };
    visibility: "public" | "friends" | "close_friends";
  }): Promise<IStory> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    
    const now = admin.firestore.Timestamp.now();
    const expiresAt = this.getExpirationDate();
    
    const newStory: any = {
      authorId: storyData.authorId,
      authorName: storyData.authorName,
      authorAvatar: storyData.authorAvatar,
      media: storyData.media,
      caption: storyData.caption || "",
      createdAt: now,
      expiresAt: expiresAt,
      visibility: storyData.visibility,
      viewers: [],
      viewCount: 0,
      isDeleted: false,
      isArchived: false,
    };
    
    // Add text overlay if provided
    if (storyData.textOverlay) {
      newStory.textOverlay = storyData.textOverlay;
    }
    
    const docRef = await firestore.collection(this.collection).add(newStory);
    
    return {
      storyId: docRef.id,
      ...newStory,
      createdAt: now.toDate(),
      expiresAt: expiresAt.toDate(),
    };
  }
  
  /**
   * Find story by ID
   */
  static async findById(storyId: string): Promise<IStory | null> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    
    const doc = await firestore.collection(this.collection).doc(storyId).get();
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    if (!data) return null;
    
    // Check if story is expired
    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (expiresAt < new Date() && !data.isArchived) {
      // Story expired, mark as deleted (or auto-delete)
      return null;
    }
    
    return {
      storyId: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      expiresAt: expiresAt,
      viewers: data.viewers || [],
      viewCount: data.viewCount || 0,
      isDeleted: data.isDeleted || false,
    } as IStory;
  }
  
  /**
   * Find all stories by author (user's own stories)
   */
  static async findByAuthorId(authorId: string, includeExpired: boolean = false): Promise<IStory[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    
    try {
      const storiesRef = firestore.collection(this.collection);
      const snapshot = await storiesRef
        .where("authorId", "==", authorId)
        .where("isDeleted", "==", false)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      const now = new Date();
      const stories = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
          
          // Filter expired stories if not including them
          if (!includeExpired && expiresAt < now && !data.isArchived) {
            return null;
          }
          
          return {
            storyId: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            expiresAt: expiresAt,
            viewers: data.viewers || [],
            viewCount: data.viewCount || 0,
            isDeleted: data.isDeleted || false,
          } as IStory;
        })
        .filter((story): story is IStory => story !== null)
        .sort((a, b) => {
          const aTime = a.createdAt instanceof Date 
            ? a.createdAt.getTime() 
            : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt instanceof Date 
            ? b.createdAt.getTime() 
            : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
          return bTime - aTime; // Newest first
        });
      
      return stories;
    } catch (error: any) {
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Story query requires index. Firestore will create it automatically.');
        return [];
      }
      throw error;
    }
  }
  
  /**
   * Find all accessible stories for a user (feed)
   * Returns stories from friends and public stories
   */
  static async findAllAccessible(userId?: string): Promise<IStory[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    
    try {
      // Get all non-deleted, non-expired stories
      // NOTE: Using simpler query first to avoid index issues
      const now = admin.firestore.Timestamp.now();
      console.log('📖 Story.findAllAccessible - userId:', userId, 'now:', now.toDate().toISOString());
      
      const storiesRef = firestore.collection(this.collection);
      // Simplified query - only filter by isDeleted and expiresAt, then sort in memory
      let snapshot;
      try {
        snapshot = await storiesRef
          .where("isDeleted", "==", false)
          .where("expiresAt", ">", now)
          .limit(500)
          .get();
        console.log('📖 Story.findAllAccessible - Query returned', snapshot.size, 'stories');
      } catch (queryError: any) {
        console.warn('📖 Story.findAllAccessible - Query error, trying fallback:', queryError.message);
        // Fallback: get all stories and filter manually
        const allSnapshot = await storiesRef
          .where("isDeleted", "==", false)
          .limit(1000)
          .get();
        console.log('📖 Story.findAllAccessible - Fallback query returned', allSnapshot.size, 'stories');
        
        // Filter expired manually
        const nowDate = new Date();
        const validDocs = allSnapshot.docs.filter((doc: admin.firestore.QueryDocumentSnapshot) => {
          const data = doc.data();
          const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
          return expiresAt > nowDate;
        });
        
        snapshot = {
          docs: validDocs,
          size: validDocs.length,
          empty: validDocs.length === 0
        } as any;
        console.log('📖 Story.findAllAccessible - After manual filter:', snapshot.size, 'valid stories');
      }
      
      if (snapshot.empty) {
        console.log('📖 Story.findAllAccessible - No stories found');
        return [];
      }
      
      const allStories = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        const story = {
          storyId: doc.id,
          authorId: data.authorId || '',
          authorName: data.authorName || '',
          authorAvatar: data.authorAvatar || '',
          media: data.media || { type: 'image', sourceUrl: '', width: 0, height: 0 },
          caption: data.caption || '',
          textOverlay: data.textOverlay,
          createdAt: createdAt,
          expiresAt: expiresAt,
          visibility: data.visibility || 'public',
          viewers: data.viewers || [],
          viewCount: data.viewCount || 0,
          isDeleted: data.isDeleted || false,
          isArchived: data.isArchived || false,
        } as IStory;
        console.log('📖 Story found:', { 
          storyId: story.storyId, 
          authorId: story.authorId, 
          authorName: story.authorName,
          visibility: story.visibility,
          expiresAt: story.expiresAt instanceof Date ? story.expiresAt.toISOString() : story.expiresAt
        });
        return story;
      });
      
      console.log('📖 Total stories from query:', allStories.length);
      
      // If no userId provided, only return public stories
      if (!userId) {
        const publicStories = allStories.filter((story: IStory) => story.visibility === "public");
        console.log('📖 Public stories (no userId):', publicStories.length);
        return publicStories;
      }
      
      // Filter by visibility
      const accessibleStories = await Promise.all(
        allStories.map(async (story: IStory) => {
          // Public stories - everyone can see
          if (story.visibility === "public") {
            return story;
          }
          
          // Author can always see their own stories
          if (story.authorId === userId) {
            return story;
          }
          
          // Friends-only stories - check friendship
          if (story.visibility === "friends") {
            const areFriends = await this.areFriends(userId, story.authorId);
            return areFriends ? story : null;
          }
          
          // Close friends (future feature - for now, same as friends)
          if (story.visibility === "close_friends") {
            const areFriends = await this.areFriends(userId, story.authorId);
            return areFriends ? story : null;
          }
          
          return null;
        })
      );
      
      // Filter out null values and sort by creation date (newest first)
      const filteredStories = accessibleStories
        .filter((story): story is IStory => story !== null)
        .sort((a, b) => {
          const aTime = a.createdAt instanceof Date 
            ? a.createdAt.getTime() 
            : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt instanceof Date 
            ? b.createdAt.getTime() 
            : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });
      
      console.log('📖 Story.findAllAccessible - Final accessible stories count:', filteredStories.length);
      if (filteredStories.length > 0) {
        console.log('📖 Sample story:', {
          storyId: filteredStories[0].storyId,
          authorId: filteredStories[0].authorId,
          authorName: filteredStories[0].authorName
        });
      }
      return filteredStories;
    } catch (error: any) {
      // Handle index error (Firestore will create index automatically)
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Story query requires index. Firestore will create it automatically.');
        // Fallback: query without expiresAt orderBy
        try {
          const nowFallback = admin.firestore.Timestamp.now();
          const storiesRef = firestore.collection(this.collection);
          const snapshot = await storiesRef
            .where("isDeleted", "==", false)
            .where("expiresAt", ">", nowFallback)
            .limit(500)
            .get();
          
          if (snapshot.empty) {
            return [];
          }
          
          const allStories = snapshot.docs.map((doc) => {
            const data = doc.data();
            const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
            // Filter expired manually
            if (expiresAt <= new Date()) {
              return null;
            }
            
            return {
              storyId: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              expiresAt: expiresAt,
              viewers: data.viewers || [],
              viewCount: data.viewCount || 0,
              isDeleted: data.isDeleted || false,
            } as IStory;
          }).filter((story): story is IStory => story !== null);
          
          // Apply visibility filtering (same logic as above)
          if (!userId) {
            return allStories.filter(story => story.visibility === "public");
          }
          
          const accessibleStories = await Promise.all(
            allStories.map(async (story) => {
              if (story.visibility === "public") return story;
              if (story.authorId === userId) return story;
              if (story.visibility === "friends" || story.visibility === "close_friends") {
                const areFriends = await this.areFriends(userId, story.authorId);
                return areFriends ? story : null;
              }
              return null;
            })
          );
          
          return accessibleStories
            .filter((story): story is IStory => story !== null)
            .sort((a, b) => {
              const aTime = a.createdAt instanceof Date 
                ? a.createdAt.getTime() 
                : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
              const bTime = b.createdAt instanceof Date 
                ? b.createdAt.getTime() 
                : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
              return bTime - aTime;
            });
        } catch (fallbackError) {
          return [];
        }
      }
      throw error;
    }
  }
  
  /**
   * Mark story as viewed by a user
   */
  static async markAsViewed(storyId: string, userId: string): Promise<IStory | null> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    
    // Check if story exists and is not expired
    const story = await this.findById(storyId);
    if (!story) {
      return null;
    }
    
    // Check if user already viewed
    if (story.viewers.includes(userId)) {
      return story; // Already viewed
    }
    
    const storyRef = firestore.collection(this.collection).doc(storyId);
    
    // Add viewer and increment count
    await storyRef.update({
      viewers: admin.firestore.FieldValue.arrayUnion(userId),
      viewCount: admin.firestore.FieldValue.increment(1),
    });
    
    // Return updated story
    return await this.findById(storyId);
  }
  
  /**
   * Delete a story
   */
  static async delete(storyId: string, authorId: string): Promise<boolean> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    
    // Verify author
    const story = await this.findById(storyId);
    if (!story || story.authorId !== authorId) {
      throw new Error("Story not found or unauthorized");
    }
    
    await firestore.collection(this.collection).doc(storyId).update({
      isDeleted: true,
    });
    
    return true;
  }
  
  /**
   * Get stories grouped by author (for feed display)
   * Returns map: { authorId: { authorName, authorAvatar, stories: IStory[] } }
   */
  static async findGroupedByAuthor(userId?: string): Promise<Map<string, {
    authorId: string;
    authorName: string;
    authorAvatar: string;
    stories: IStory[];
    hasViewedAll: boolean;
  }>> {
    console.log('📖 Story.findGroupedByAuthor - Starting, userId:', userId);
    const accessibleStories = await this.findAllAccessible(userId);
    console.log('📖 Story.findGroupedByAuthor - Found', accessibleStories.length, 'accessible stories');
    
    const grouped = new Map<string, {
      authorId: string;
      authorName: string;
      authorAvatar: string;
      stories: IStory[];
      hasViewedAll: boolean;
    }>();
    
    for (const story of accessibleStories) {
      console.log('📖 Processing story:', { storyId: story.storyId, authorId: story.authorId, authorName: story.authorName });
      if (!grouped.has(story.authorId)) {
        grouped.set(story.authorId, {
          authorId: story.authorId,
          authorName: story.authorName,
          authorAvatar: story.authorAvatar,
          stories: [],
          hasViewedAll: false,
        });
      }
      
      const authorData = grouped.get(story.authorId)!;
      authorData.stories.push(story);
      
      // Check if user has viewed all stories (if at least one is not viewed, hasViewedAll = false)
      if (userId) {
        const hasViewed = story.viewers.includes(userId);
        if (!hasViewed) {
          authorData.hasViewedAll = false;
        } else if (authorData.hasViewedAll !== false) {
          // Only set to true if all previous stories were viewed
          authorData.hasViewedAll = true;
        }
      }
    }
    
    // Sort stories within each author by creation date (oldest first for story viewer)
    grouped.forEach((authorData) => {
      authorData.stories.sort((a, b) => {
        const aTime = a.createdAt instanceof Date 
          ? a.createdAt.getTime() 
          : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt instanceof Date 
          ? b.createdAt.getTime() 
          : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
        return aTime - bTime; // Oldest first (for story viewer)
      });
    });
    
    console.log('📖 Story.findGroupedByAuthor - Returning', grouped.size, 'story groups');
    return grouped;
  }
  
  /**
   * Clean up expired stories (should be called by scheduled function)
   */
  static async cleanupExpired(): Promise<number> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    
    const now = admin.firestore.Timestamp.now();
    const snapshot = await firestore
      .collection(this.collection)
      .where("expiresAt", "<=", now)
      .where("isArchived", "==", false)
      .where("isDeleted", "==", false)
      .limit(500)
      .get();
    
    if (snapshot.empty) {
      return 0;
    }
    
    const batch = firestore.batch();
    let count = 0;
    
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isDeleted: true });
      count++;
    });
    
    await batch.commit();
    return count;
  }
}

