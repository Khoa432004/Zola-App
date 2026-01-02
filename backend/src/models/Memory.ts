import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

/**
 * Memory interface
 * Kỷ niệm là các sự kiện quan trọng được lưu lại với ngày tháng
 */
export interface IMemory {
  memoryId: string;
  userId: string;
  title: string;
  description?: string;
  date: admin.firestore.Timestamp | Date; // Ngày kỷ niệm
  imageUrl?: string;
  createdAt: admin.firestore.Timestamp | Date;
  updatedAt: admin.firestore.Timestamp | Date;
  isDeleted: boolean;
}

export class Memory {
  private static collection = 'memories';

  /**
   * Tạo kỷ niệm mới
   */
  static async create(memoryData: {
    userId: string;
    title: string;
    description?: string;
    date: Date;
    imageUrl?: string;
  }): Promise<IMemory> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = admin.firestore.Timestamp.now();
    const dateTimestamp = admin.firestore.Timestamp.fromDate(memoryData.date);

    const newMemory: any = {
      userId: memoryData.userId,
      title: memoryData.title,
      description: memoryData.description || '',
      date: dateTimestamp,
      imageUrl: memoryData.imageUrl || '',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    const docRef = await firestore.collection(this.collection).add(newMemory);
    const doc = await docRef.get();
    const data = doc.data();

    return {
      memoryId: doc.id,
      ...data,
      date: data?.date?.toDate() || memoryData.date,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as IMemory;
  }

  /**
   * Lấy tất cả kỷ niệm của user
   */
  static async findByUserId(userId: string): Promise<IMemory[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    // Query đơn giản hơn để tránh cần composite index
    // Chỉ filter theo userId, sau đó filter và sort trong code
    const snapshot = await firestore
      .collection(this.collection)
      .where('userId', '==', userId)
      .get();

    const memories = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          memoryId: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as IMemory;
      })
      .filter((memory) => !memory.isDeleted) // Filter isDeleted trong code
      .sort((a, b) => {
        // Sort theo date descending trong code
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

    return memories;
  }

  /**
   * Lấy kỷ niệm theo ID
   */
  static async findById(memoryId: string): Promise<IMemory | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const doc = await firestore.collection(this.collection).doc(memoryId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      memoryId: doc.id,
      ...data,
      date: data?.date?.toDate() || new Date(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as IMemory;
  }

  /**
   * Cập nhật kỷ niệm
   */
  static async update(
    memoryId: string,
    updates: Partial<{
      title: string;
      description: string;
      date: Date;
      imageUrl: string;
    }>
  ): Promise<IMemory> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.date !== undefined) {
      updateData.date = admin.firestore.Timestamp.fromDate(updates.date);
    }
    if (updates.imageUrl !== undefined) {
      updateData.imageUrl = updates.imageUrl;
    }

    await firestore.collection(this.collection).doc(memoryId).update(updateData);

    const updatedDoc = await firestore.collection(this.collection).doc(memoryId).get();
    const data = updatedDoc.data();

    return {
      memoryId: updatedDoc.id,
      ...data,
      date: data?.date?.toDate() || new Date(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as IMemory;
  }

  /**
   * Xóa kỷ niệm (soft delete)
   */
  static async delete(memoryId: string): Promise<void> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    await firestore.collection(this.collection).doc(memoryId).update({
      isDeleted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Lấy kỷ niệm sắp tới (trong vòng N ngày)
   */
  static async findUpcoming(userId: string, days: number = 30): Promise<IMemory[]> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
    const futureTimestamp = admin.firestore.Timestamp.fromDate(futureDate);

    // Lấy tất cả kỷ niệm của user
    const allMemories = await this.findByUserId(userId);

    // Lọc kỷ niệm sắp tới (ngày kỷ niệm trong năm hiện tại hoặc tương lai)
    const upcoming = allMemories.filter((memory) => {
      const memoryDate = memory.date instanceof Date ? memory.date : new Date(memory.date);
      
      // Tính ngày kỷ niệm trong năm hiện tại
      const thisYear = new Date(now.getFullYear(), memoryDate.getMonth(), memoryDate.getDate());
      thisYear.setHours(0, 0, 0, 0);
      
      // Tính ngày kỷ niệm trong năm sau
      const nextYear = new Date(now.getFullYear() + 1, memoryDate.getMonth(), memoryDate.getDate());
      nextYear.setHours(0, 0, 0, 0);
      
      const nowOnly = new Date(now);
      nowOnly.setHours(0, 0, 0, 0);
      const futureDateOnly = new Date(futureDate);
      futureDateOnly.setHours(0, 0, 0, 0);

      // Nếu ngày kỷ niệm trong năm hiện tại đã qua, dùng năm sau
      const targetDate = thisYear < nowOnly ? nextYear : thisYear;

      return targetDate >= nowOnly && targetDate <= futureDateOnly;
    });

    // Sắp xếp theo ngày gần nhất
    return upcoming.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }
}

