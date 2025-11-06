import { firestore } from '../config/firebase-admin';
import bcrypt from 'bcrypt';
import admin from 'firebase-admin';

/**
 * User interface
 */
export interface IUser {
  id: string;
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  provider: 'email' | 'google';
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private static collection = 'users';

  /**
   * Tìm user theo email
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const usersRef = firestore.collection(this.collection);
    const snapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as IUser;
  }

  /**
   * Tìm user theo Google ID
   */
  static async findByGoogleId(googleId: string): Promise<IUser | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const usersRef = firestore.collection(this.collection);
    const snapshot = await usersRef.where('googleId', '==', googleId).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as IUser;
  }

  /**
   * Tìm user theo ID
   */
  static async findById(id: string): Promise<IUser | null> {
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
    } as IUser;
  }

  /**
   * Tìm user theo email hoặc Google ID
   */
  static async findByEmailOrGoogleId(email: string, googleId: string): Promise<IUser | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const usersRef = firestore.collection(this.collection);
      
      // Tìm theo email trước
      try {
        const emailSnapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();
        if (!emailSnapshot.empty) {
          const doc = emailSnapshot.docs[0];
          return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as IUser;
        }
      } catch (emailError: any) {
        // Xử lý lỗi thiếu index (Firestore sẽ tự tạo)
        if (emailError.code === 9 || emailError.message?.includes('index')) {
          console.warn('Email query requires index. Firestore will create it automatically.');
        } else {
          throw emailError;
        }
      }

      // Tìm theo Google ID
      try {
        const googleSnapshot = await usersRef.where('googleId', '==', googleId).limit(1).get();
        if (!googleSnapshot.empty) {
          const doc = googleSnapshot.docs[0];
          return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as IUser;
        }
      } catch (googleError: any) {
        // Xử lý lỗi thiếu index
        if (googleError.code === 9 || googleError.message?.includes('index')) {
          console.warn('GoogleId query requires index. Firestore will create it automatically.');
        } else {
          throw googleError;
        }
      }

      return null;
    } catch (error: any) {
      throw new Error(`Firestore query error: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  /**
   * Tạo user mới (tự động hash password nếu có)
   */
  static async create(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const userToCreate = {
      ...userData,
      email: userData.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    // Hash password nếu có
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userToCreate.password = await bcrypt.hash(userData.password, salt);
    }

    const docRef = await firestore.collection(this.collection).add(userToCreate);
    const doc = await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
    } as IUser;
  }

  /**
   * Cập nhật user (tự động hash password nếu có)
   */
  static async update(id: string, updates: Partial<Omit<IUser, 'id' | 'createdAt'>>): Promise<IUser> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const updateData: any = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Hash password nếu có
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updates.password, salt);
    }

    // Chuẩn hóa email nếu có
    if (updates.email) {
      updateData.email = updates.email.toLowerCase();
    }

    await firestore.collection(this.collection).doc(id).update(updateData);
    
    const updatedDoc = await firestore.collection(this.collection).doc(id).get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
    } as IUser;
  }

  /**
   * So sánh password với hash
   */
  static async comparePassword(hashedPassword: string, candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }
}
