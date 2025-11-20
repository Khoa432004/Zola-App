import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

/**
 * Friend Request interface
 */
export interface IFriendRequest {
  id: string;
  from: string; // User ID của người gửi
  to: string; // User ID của người nhận
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export class FriendRequest {
  private static collection = 'friend_requests';

  /**
   * Tạo friend request mới
   */
  static async create(requestData: Omit<IFriendRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<IFriendRequest> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const requestToCreate = {
      ...requestData,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore.collection(this.collection).add(requestToCreate);
    const doc = await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
    } as IFriendRequest;
  }

  /**
   * Tìm friend request theo ID
   */
  static async findById(id: string): Promise<IFriendRequest | null> {
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
    } as IFriendRequest;
  }

  /**
   * Tìm friend request giữa hai người dùng
   */
  static async findByUsers(from: string, to: string): Promise<IFriendRequest | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Tìm request từ from -> to
      const snapshot1 = await firestore
        .collection(this.collection)
        .where('from', '==', from)
        .where('to', '==', to)
        .limit(1)
        .get();

      if (!snapshot1.empty) {
        const doc = snapshot1.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()?.createdAt?.toDate() || new Date(),
          updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
        } as IFriendRequest;
      }

      // Tìm request từ to -> from (kiểm tra cả hai chiều)
      const snapshot2 = await firestore
        .collection(this.collection)
        .where('from', '==', to)
        .where('to', '==', from)
        .limit(1)
        .get();

      if (!snapshot2.empty) {
        const doc = snapshot2.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()?.createdAt?.toDate() || new Date(),
          updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
        } as IFriendRequest;
      }

      return null;
    } catch (error: any) {
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Friend request query requires index. Firestore will create it automatically.');
        return null;
      }
      throw new Error(`Firestore query error: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Lấy tất cả friend requests của một user (cả gửi và nhận)
   */
  static async findByUserId(userId: string, status?: 'pending' | 'accepted' | 'rejected'): Promise<IFriendRequest[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      let snapshot;
      
      if (status) {
        // Lấy requests với status cụ thể
        const sentRequests = await firestore
          .collection(this.collection)
          .where('from', '==', userId)
          .where('status', '==', status)
          .get();

        const receivedRequests = await firestore
          .collection(this.collection)
          .where('to', '==', userId)
          .where('status', '==', status)
          .get();

        snapshot = { docs: [...sentRequests.docs, ...receivedRequests.docs] };
      } else {
        // Lấy tất cả requests
        const sentRequests = await firestore
          .collection(this.collection)
          .where('from', '==', userId)
          .get();

        const receivedRequests = await firestore
          .collection(this.collection)
          .where('to', '==', userId)
          .get();

        snapshot = { docs: [...sentRequests.docs, ...receivedRequests.docs] };
      }

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      })) as IFriendRequest[];
    } catch (error: any) {
      if (error.code === 9 || error.message?.includes('index')) {
        console.warn('Friend request query requires index. Firestore will create it automatically.');
        return [];
      }
      throw new Error(`Firestore query error: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Cập nhật status của friend request
   */
  static async updateStatus(id: string, status: 'pending' | 'accepted' | 'rejected'): Promise<IFriendRequest> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    await firestore.collection(this.collection).doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await firestore.collection(this.collection).doc(id).get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
    } as IFriendRequest;
  }

  /**
   * Xóa friend request
   */
  static async delete(id: string): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    await firestore.collection(this.collection).doc(id).delete();
  }
}

