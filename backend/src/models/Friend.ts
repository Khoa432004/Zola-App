import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

/**
 * Friend interface
 */
export interface IFriend {
  id: string;
  users: string[]; // Array of 2 user IDs
  createdAt: Date;
  updatedAt: Date;
}

export class Friend {
  private static collection = 'friends';

  /**
   * Tạo friendship mới
   */
  static async create(friendData: Omit<IFriend, 'id' | 'createdAt' | 'updatedAt'>): Promise<IFriend> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    // Sắp xếp user IDs để đảm bảo tính nhất quán
    const sortedUsers = [...friendData.users].sort();

    // Kiểm tra xem friendship đã tồn tại chưa
    const existing = await this.findByUsers(sortedUsers[0], sortedUsers[1]);
    if (existing) {
      return existing;
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const friendToCreate = {
      users: sortedUsers,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore.collection(this.collection).add(friendToCreate);
    const doc = await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
    } as IFriend;
  }

  /**
   * Tìm friendship giữa hai users
   */
  static async findByUsers(userId1: string, userId2: string): Promise<IFriend | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const sortedUsers = [userId1, userId2].sort();

    try {
      // Firestore không hỗ trợ array-contains cho nhiều phần tử cùng lúc
      // Nên ta sẽ query bằng một user và filter trong code
      const snapshot = await firestore
        .collection(this.collection)
        .where('users', 'array-contains', sortedUsers[0])
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.users && data.users.length === 2) {
          const docUsers = [...data.users].sort();
          if (docUsers[0] === sortedUsers[0] && docUsers[1] === sortedUsers[1]) {
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as IFriend;
          }
        }
      }

      return null;
    } catch (error: any) {
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Friend query requires index. Firestore will create it automatically.');
        return null;
      }
      throw new Error(`Firestore query error: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Lấy tất cả friends của một user
   */
  static async findByUserId(userId: string): Promise<IFriend[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await firestore
        .collection(this.collection)
        .where('users', 'array-contains', userId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      })) as IFriend[];
    } catch (error: any) {
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Friend query requires index. Firestore will create it automatically.');
        return [];
      }
      throw new Error(`Firestore query error: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Xóa friendship
   */
  static async delete(id: string): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    await firestore.collection(this.collection).doc(id).delete();
  }

  /**
   * Xóa friendship giữa hai users
   */
  static async deleteByUsers(userId1: string, userId2: string): Promise<void> {
    const friend = await this.findByUsers(userId1, userId2);
    if (friend) {
      await this.delete(friend.id);
    }
  }
}

