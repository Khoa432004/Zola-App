import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

/**
 * Member interface trong conversation
 */
export interface IConversationMember {
  user_id: string;
  user_name: string;
}

/**
 * Message info (last message) trong conversation
 */
export interface IConversationMessageInfo {
  content: string;
  timestamp: number;
  sender_id?: string;
}

/**
 * Conversation interface
 */
export interface IConversation {
  id: string;
  con_id: string; // Conversation ID (có thể trùng với id hoặc khác)
  createdAt: Date;
  updatedAt: Date;
  is_group: boolean;
  members: IConversationMember[];
  mess_info?: IConversationMessageInfo; // Last message info
}

export class Conversation {
  private static collection = 'Conversations';

  /**
   * Tạo conversation mới
   */
  static async create(conversationData: Omit<IConversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<IConversation> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    // Tối ưu: Thêm memberIds array để query nhanh hơn
    const memberIds = conversationData.members.map(m => m.user_id);
    const conversationToCreate = {
      ...conversationData,
      memberIds, // Thêm field này để query nhanh hơn
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore.collection(this.collection).add(conversationToCreate);
    const doc = await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
    } as IConversation;
  }

  /**
   * Tìm conversation theo ID
   */
  static async findById(id: string): Promise<IConversation | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const doc = await firestore.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
    } as IConversation;
  }

  /**
   * Tìm conversation theo con_id
   */
  static async findByConId(conId: string): Promise<IConversation | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await firestore
        .collection(this.collection)
        .where('con_id', '==', conId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      } as IConversation;
    } catch (error: any) {
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Conversation query requires index. Firestore will create it automatically.');
        return null;
      }
      throw new Error(`Firestore query error: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Tìm conversations của một user
   * Tối ưu: Sử dụng memberIds array để query nhanh hơn
   */
  static async findByUserId(userId: string): Promise<IConversation[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Tối ưu: Sử dụng memberIds field nếu có, nếu không thì fallback
      // Tạo field memberIds là array of user_id strings để query nhanh hơn
      const snapshot = await firestore
        .collection(this.collection)
        .where('memberIds', 'array-contains', userId)
        .orderBy('updatedAt', 'desc')
        .limit(100) // Limit để tránh quá nhiều data
        .get();

      const conversations: IConversation[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Verify user is actually a member (double check)
        const members = data.members || [];
        const isMember = members.some((m: IConversationMember) => m.user_id === userId);
        if (isMember) {
          conversations.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as IConversation);
        }
      });

      // Sort by updatedAt desc (Firestore đã sort nhưng để chắc chắn)
      return conversations.sort((a, b) => {
        const aTime = a.updatedAt.getTime();
        const bTime = b.updatedAt.getTime();
        return bTime - aTime;
      });
    } catch (error: any) {
      // Fallback: query với members array (chậm hơn nhưng vẫn hoạt động)
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Conversation memberIds index not found, using fallback query');
        try {
          // Fallback: query một phần và filter manually
          const snapshot = await firestore
            .collection(this.collection)
            .orderBy('updatedAt', 'desc')
            .limit(200) // Limit để không quá chậm
            .get();

          const conversations: IConversation[] = [];
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const members = data.members || [];
            const isMember = members.some((m: IConversationMember) => m.user_id === userId);
            if (isMember) {
              conversations.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
              } as IConversation);
            }
          });

          return conversations.sort((a, b) => {
            const aTime = a.updatedAt.getTime();
            const bTime = b.updatedAt.getTime();
            return bTime - aTime;
          });
        } catch (fallbackError: any) {
          console.error('Error loading conversations:', fallbackError);
          return [];
        }
      }
      throw new Error(`Firestore query error: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Tìm conversation giữa hai users (private chat)
   * Tối ưu: Query trực tiếp với memberIds thay vì load tất cả
   */
  static async findByTwoUsers(userId1: string, userId2: string): Promise<IConversation | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Tối ưu: Query với memberIds chứa cả 2 users và is_group = false
      const sortedIds = [userId1, userId2].sort();
      const snapshot = await firestore
        .collection(this.collection)
        .where('memberIds', 'array-contains', sortedIds[0])
        .where('is_group', '==', false)
        .limit(20) // Limit để không quá nhiều
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const memberIds = data.memberIds || data.members?.map((m: IConversationMember) => m.user_id) || [];
        if (memberIds.length === 2 && memberIds.includes(userId1) && memberIds.includes(userId2)) {
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as IConversation;
        }
      }

      return null;
    } catch (error: any) {
      // Fallback: dùng cách cũ
      if (error.code === 9 || error.message?.includes('index')) {
        try {
          const conversations = await this.findByUserId(userId1);
          
          for (const conv of conversations) {
            if (!conv.is_group && conv.members.length === 2) {
              const memberIds = conv.members.map(m => m.user_id);
              if (memberIds.includes(userId1) && memberIds.includes(userId2)) {
                return conv;
              }
            }
          }
        } catch (fallbackError) {
          console.error('Error finding conversation between users (fallback):', fallbackError);
        }
      } else {
        console.error('Error finding conversation between users:', error);
      }
      return null;
    }
  }

  /**
   * Cập nhật conversation
   */
  static async update(id: string, updates: Partial<Omit<IConversation, 'id' | 'createdAt'>>): Promise<IConversation> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    // Tối ưu: Cập nhật memberIds nếu members thay đổi
    const updateData: any = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (updates.members) {
      updateData.memberIds = updates.members.map((m: IConversationMember) => m.user_id);
    }

    await firestore.collection(this.collection).doc(id).update(updateData);

    const updatedDoc = await firestore.collection(this.collection).doc(id).get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
    } as IConversation;
  }

  /**
   * Cập nhật last message info
   */
  static async updateLastMessage(conId: string, messageInfo: IConversationMessageInfo): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const conversation = await this.findByConId(conId);
      if (conversation) {
        await this.update(conversation.id, {
          mess_info: messageInfo,
        });
      }
    } catch (error: any) {
      console.error('Error updating last message:', error);
      throw error;
    }
  }

  /**
   * Xóa conversation
   */
  static async delete(id: string): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    await firestore.collection(this.collection).doc(id).delete();
  }
}

