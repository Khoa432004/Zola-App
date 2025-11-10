import { firestore } from '../config/firebase-admin';
import bcrypt from 'bcrypt';
import admin from 'firebase-admin';

/**
 * Account interface
 */
export interface IAccount {
  id: string;
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  phone?: string;
  provider: 'email' | 'google';
  googleId?: string;
  otp?: string
  otpExpiry?: Date
  otpAttempts?: number
  otpSendAttempts?: number
  otpLastSendTime?: Date
  createdAt: Date;
  updatedAt: Date;
}

export class Account {
  private static collection = 'accounts';

  /**
   * Tìm account theo email
   */
  static async findByEmail(email: string): Promise<IAccount | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const accountsRef = firestore.collection(this.collection);
    const snapshot = await accountsRef.where('email', '==', email.toLowerCase()).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      otpExpiry: data.otpExpiry?.toDate() || undefined,
      otpLastSendTime: data.otpLastSendTime?.toDate() || undefined,
    } as IAccount;
  }

  /**
   * Tìm account theo Google ID
   */
  static async findByGoogleId(googleId: string): Promise<IAccount | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const accountsRef = firestore.collection(this.collection);
    const snapshot = await accountsRef.where('googleId', '==', googleId).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      otpLastSendTime: doc.data().otpLastSendTime?.toDate() || undefined,
    } as IAccount;
  }

  /**
   * Tìm account theo ID
   */
  static async findById(id: string): Promise<IAccount | null> {
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
      otpLastSendTime: doc.data()?.otpLastSendTime?.toDate() || undefined,
    } as IAccount;
  }

  /**
   * Tìm account theo email hoặc Google ID
   */
  static async findByEmailOrGoogleId(email: string, googleId: string): Promise<IAccount | null> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    try {
      const accountsRef = firestore.collection(this.collection);
      
      // Tìm theo email trước
      try {
        const emailSnapshot = await accountsRef.where('email', '==', email.toLowerCase()).limit(1).get();
        if (!emailSnapshot.empty) {
          const doc = emailSnapshot.docs[0];
          return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            otpLastSendTime: doc.data()?.otpLastSendTime?.toDate() || undefined,
          } as IAccount;
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
        const googleSnapshot = await accountsRef.where('googleId', '==', googleId).limit(1).get();
        if (!googleSnapshot.empty) {
          const doc = googleSnapshot.docs[0];
          return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            otpLastSendTime: doc.data()?.otpLastSendTime?.toDate() || undefined,
          } as IAccount;
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
   * Tạo account mới (tự động hash password nếu có)
   */
  static async create(accountData: Omit<IAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<IAccount> {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const accountToCreate = {
      ...accountData,
      email: accountData.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    // Hash password nếu có
    if (accountData.password) {
      const salt = await bcrypt.genSalt(10);
      accountToCreate.password = await bcrypt.hash(accountData.password, salt);
    }

    const docRef = await firestore.collection(this.collection).add(accountToCreate);
    const doc = await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      otpLastSendTime: doc.data()?.otpLastSendTime?.toDate() || undefined,
    } as IAccount;
  }

  /**
   * Cập nhật account (tự động hash password nếu có)
   */
  static async update(id: string, updates: Partial<Omit<IAccount, 'id' | 'createdAt'>>): Promise<IAccount> {
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
      otpLastSendTime: updatedDoc.data()?.otpLastSendTime?.toDate() || undefined,
    } as IAccount;
  }

  /**
   * So sánh password với hash
   */
  static async comparePassword(hashedPassword: string, candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  /**
   * Cập nhật OTP cho account
   */
  static async updateOTP(email: string, otp: string, otpExpiry: Date): Promise<void> {
    if (!firestore) {
      throw new Error("Firestore not initialized")
    }

    const accountsRef = firestore.collection(this.collection)
    const snapshot = await accountsRef.where("email", "==", email.toLowerCase()).limit(1).get()

    if (snapshot.empty) {
      throw new Error("Account không tồn tại")
    }

    const doc = snapshot.docs[0]
    await doc.ref.update({
      otp,
      otpExpiry: admin.firestore.Timestamp.fromDate(otpExpiry),
      otpAttempts: 0,
      otpSendAttempts: (doc.data().otpSendAttempts || 0) + 1,
      otpLastSendTime: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  /**
   * Tăng số lần nhập sai OTP
   */
  static async incrementOTPAttempts(email: string): Promise<number> {
    if (!firestore) {
      throw new Error("Firestore not initialized")
    }

    const accountsRef = firestore.collection(this.collection)
    const snapshot = await accountsRef.where("email", "==", email.toLowerCase()).limit(1).get()

    if (snapshot.empty) {
      throw new Error("Account không tồn tại")
    }

    const doc = snapshot.docs[0]
    const newAttempts = (doc.data().otpAttempts || 0) + 1

    await doc.ref.update({
      otpAttempts: newAttempts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return newAttempts
  }

  /**
   * Reset OTP send attempts
   */
  static async resetOTPSendAttempts(email: string): Promise<void> {
    if (!firestore) {
      throw new Error("Firestore not initialized")
    }

    const accountsRef = firestore.collection(this.collection)
    const snapshot = await accountsRef.where("email", "==", email.toLowerCase()).limit(1).get()

    if (snapshot.empty) {
      throw new Error("Account không tồn tại")
    }

    const doc = snapshot.docs[0]
    await doc.ref.update({
      otpSendAttempts: 0,
      otpLastSendTime: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  /**
   * Xóa OTP sau khi xác thực thành công
   */
  static async clearOTP(email: string): Promise<void> {
    if (!firestore) {
      throw new Error("Firestore not initialized")
    }

    const accountsRef = firestore.collection(this.collection)
    const snapshot = await accountsRef.where("email", "==", email.toLowerCase()).limit(1).get()

    if (snapshot.empty) {
      throw new Error("Account không tồn tại")
    }

    const doc = snapshot.docs[0]
    await doc.ref.update({
      otp: admin.firestore.FieldValue.delete(),
      otpExpiry: admin.firestore.FieldValue.delete(),
      otpAttempts: admin.firestore.FieldValue.delete(),
      otpSendAttempts: admin.firestore.FieldValue.delete(),
      otpLastSendTime: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
}
