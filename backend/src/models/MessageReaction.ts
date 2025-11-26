import { firestore } from "../config/firebase-admin";
import admin from "firebase-admin";

/**
 * Message Reaction interface
 */
export interface IMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  createdAt: Date;
}

export class MessageReaction {
  private static collection = "Messages";

  /**
   * Thêm reaction vào message
   */
  static async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<IMessageReaction> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const messageRef = firestore.collection(this.collection).doc(messageId);
    const reactionsRef = messageRef.collection("reactions").doc(userId);

    const now = admin.firestore.FieldValue.serverTimestamp();

    await reactionsRef.set({
      user_id: userId,
      emoji,
      createdAt: now,
    });

    const doc = await reactionsRef.get();
    return {
      id: doc.id,
      message_id: messageId,
      user_id: userId,
      emoji,
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    };
  }

  /**
   * Xóa reaction khỏi message
   */
  static async removeReaction(
    messageId: string,
    userId: string
  ): Promise<void> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const messageRef = firestore.collection(this.collection).doc(messageId);
    const reactionsRef = messageRef.collection("reactions").doc(userId);

    await reactionsRef.delete();
  }

  /**
   * Lấy tất cả reactions của một message
   */
  static async getMessageReactions(
    messageId: string
  ): Promise<IMessageReaction[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const messageRef = firestore.collection(this.collection).doc(messageId);
    const snapshot = await messageRef.collection("reactions").get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      message_id: messageId,
      user_id: doc.data().user_id,
      emoji: doc.data().emoji,
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    }));
  }

  /**
   * Kiểm tra user đã react chưa
   */
  static async getUserReaction(
    messageId: string,
    userId: string
  ): Promise<IMessageReaction | null> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const messageRef = firestore.collection(this.collection).doc(messageId);
    const reactionsRef = messageRef.collection("reactions").doc(userId);

    const doc = await reactionsRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      message_id: messageId,
      user_id: userId,
      emoji: doc.data()?.emoji || "",
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    };
  }

  /**
   * Toggle reaction - nếu đã có thì xóa, nếu chưa có thì thêm
   */
  static async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ added: boolean; reaction?: IMessageReaction }> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const existingReaction = await this.getUserReaction(messageId, userId);

    if (existingReaction) {
      // Nếu cùng emoji thì xóa, nếu khác emoji thì update
      if (existingReaction.emoji === emoji) {
        await this.removeReaction(messageId, userId);
        return { added: false };
      } else {
        // Update emoji mới
        const reaction = await this.addReaction(messageId, userId, emoji);
        return { added: true, reaction };
      }
    } else {
      // Thêm reaction mới
      const reaction = await this.addReaction(messageId, userId, emoji);
      return { added: true, reaction };
    }
  }
}
