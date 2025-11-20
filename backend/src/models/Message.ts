import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

/**
 * Message interface
 */
export interface IMessage {
  id: string;
  con_id: string; // Conversation ID
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'sticker';
  createdAt: Date;
  updatedAt: Date;
  seen: boolean;
  seenAt?: Date;
  timestamp: number; // Unix timestamp
}

export class Message {
  private static collection = 'Messages';

  /**
   * Tạo message mới
   */
  static async create(messageData: Omit<IMessage, 'id' | 'createdAt' | 'updatedAt' | 'timestamp' | 'seen' | 'seenAt'>): Promise<IMessage> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const timestamp = Date.now();
    
    const messageToCreate = {
      ...messageData,
      type: messageData.type || 'text',
      seen: false,
      timestamp,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore.collection(this.collection).add(messageToCreate);
    const doc = await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      seenAt: doc.data()?.seenAt?.toDate() || undefined,
    } as IMessage;
  }

  /**
   * Tìm message theo ID
   */
  static async findById(id: string): Promise<IMessage | null> {
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
      seenAt: doc.data()?.seenAt?.toDate() || undefined,
    } as IMessage;
  }

  /**
   * Lấy messages của một conversation
   * Tối ưu: Thêm limit mặc định và sử dụng index tốt hơn
   */
  static async findByConversationId(conId: string, limit: number = 50): Promise<IMessage[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Tối ưu: Limit mặc định 50 messages, order by timestamp desc
      const query = firestore
        .collection(this.collection)
        .where('con_id', '==', conId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      const snapshot = await query.get();

      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
        seenAt: doc.data()?.seenAt?.toDate() || undefined,
      })) as IMessage[];

      // Sort ascending by timestamp (oldest first)
      return messages.reverse();
    } catch (error: any) {
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Message query requires index. Firestore will create it automatically.');
        // Fallback: query limited và filter manually
        try {
          const snapshot = await firestore
            .collection(this.collection)
            .orderBy('timestamp', 'desc')
            .limit(200) // Limit để không quá chậm
            .get();
          
          const messages = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data()?.createdAt?.toDate() || new Date(),
              updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
              seenAt: doc.data()?.seenAt?.toDate() || undefined,
            }))
            .filter((msg: IMessage) => msg.con_id === conId)
            .slice(0, limit) as IMessage[];
          
          return messages.sort((a, b) => a.timestamp - b.timestamp);
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
          return [];
        }
      }
      throw new Error(`Firestore query error: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Đánh dấu message đã xem
   */
  static async markAsSeen(id: string, userId: string): Promise<IMessage> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const message = await this.findById(id);
    if (!message) {
      throw new Error('Message not found');
    }

    // Chỉ đánh dấu seen nếu user không phải là người gửi
    if (message.sender_id !== userId && !message.seen) {
      const now = admin.firestore.FieldValue.serverTimestamp();
      await firestore.collection(this.collection).doc(id).update({
        seen: true,
        seenAt: now,
        updatedAt: now,
      });

      const updatedDoc = await firestore.collection(this.collection).doc(id).get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
        createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
        seenAt: updatedDoc.data()?.seenAt?.toDate() || undefined,
      } as IMessage;
    }

    return message;
  }

  /**
   * Đánh dấu tất cả messages trong conversation đã xem (trừ của user gửi)
   * Tối ưu: Chỉ query unseen messages thay vì load tất cả
   */
  static async markConversationAsSeen(conId: string, userId: string): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Tối ưu: Chỉ query messages chưa seen và không phải của user
      const snapshot = await firestore
        .collection(this.collection)
        .where('con_id', '==', conId)
        .where('seen', '==', false)
        .limit(500) // Limit để tránh batch quá lớn
        .get();

      if (snapshot.empty) {
        return; // Không có messages nào cần update
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const batch = firestore.batch();
      let updateCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Chỉ update nếu không phải của user gửi
        if (data.sender_id !== userId) {
          batch.update(doc.ref, {
            seen: true,
            seenAt: now,
            updatedAt: now,
          });
          updateCount++;
        }
      });

      // Firestore batch limit là 500 operations
      if (updateCount > 0) {
        await batch.commit();
        
        // Nếu còn nhiều messages, tiếp tục update (recursive)
        if (snapshot.docs.length === 500) {
          // Có thể còn messages, gọi lại
          await this.markConversationAsSeen(conId, userId);
        }
      }
    } catch (error: any) {
      // Fallback: nếu query failed, dùng cách cũ (chậm hơn)
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Message seen query requires index, using fallback');
        try {
          const messages = await this.findByConversationId(conId, 100);
          const now = admin.firestore.FieldValue.serverTimestamp();

          const batch = firestore.batch();
          let hasUpdates = false;

          messages.forEach(message => {
            if (message.sender_id !== userId && !message.seen) {
              const messageRef = firestore.collection(this.collection).doc(message.id);
              batch.update(messageRef, {
                seen: true,
                seenAt: now,
                updatedAt: now,
              });
              hasUpdates = true;
            }
          });

          if (hasUpdates) {
            await batch.commit();
          }
        } catch (fallbackError: any) {
          console.error('Error marking conversation as seen (fallback):', fallbackError);
          // Không throw error, chỉ log để không block flow
        }
      } else {
        console.error('Error marking conversation as seen:', error);
        throw error;
      }
    }
  }

  /**
   * Xóa message
   */
  static async delete(id: string): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    await firestore.collection(this.collection).doc(id).delete();
  }
}

