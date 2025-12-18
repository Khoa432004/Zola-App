import { firestore } from "../config/firebase-admin";
import admin from "firebase-admin";

export interface IMessageReport {
  id: string;
  messageId: string; // ID của tin nhắn bị báo cáo
  reporterId: string; // ID người báo cáo
  reportedUserId: string; // ID người bị báo cáo
  conversationId: string; // ID cuộc trò chuyện
  reason: string; // Lý do báo cáo
  description: string; // Mô tả chi tiết
  messageContent: string; // Nội dung tin nhắn bị báo cáo
  status: "pending" | "approved" | "rejected"; // Trạng thái xử lý
  createdAt: Date;
  updatedAt: Date;
  processedBy?: string; // Admin xử lý
  processedAt?: Date;
}

export class MessageReport {
  private static collection = "message_reports";

  static async create(
    reportData: Omit<IMessageReport, "id" | "createdAt" | "updatedAt">
  ): Promise<IMessageReport> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await firestore.collection(this.collection).add({
      ...reportData,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const doc = await docRef.get();
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      processedAt: data?.processedAt?.toDate() || undefined,
    } as IMessageReport;
  }

  static async findAll(status?: string): Promise<IMessageReport[]> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    try {
      let query: FirebaseFirestore.Query = firestore.collection(
        this.collection
      );

      // Apply status filter if provided
      if (status && status !== "all") {
        query = query.where("status", "==", status);
      }

      // Try to order by createdAt, but handle case where index might not exist
      try {
        query = query.orderBy("createdAt", "desc");
      } catch (orderError: any) {
        // If orderBy fails (e.g., missing index), continue without ordering
        console.warn(
          "[MessageReport.findAll] orderBy failed, continuing without order:",
          orderError.message
        );
      }

      const snapshot = await query.get();

      let reports = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          processedAt: data.processedAt?.toDate() || undefined,
        } as IMessageReport;
      });

      // If orderBy failed, sort manually
      if (status && status !== "all") {
        // Already filtered, just sort
        reports = reports.sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return bTime - aTime; // Descending order
        });
      } else {
        // Sort all reports
        reports = reports.sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return bTime - aTime; // Descending order
        });
      }

      return reports;
    } catch (error: any) {
      console.error("[MessageReport.findAll] Error:", {
        message: error.message,
        code: error.code,
        status,
      });

      // If it's an index error, provide helpful message
      if (error.code === 9 || error.message?.includes("index")) {
        throw new Error(
          'Firestore index chưa được tạo. Vui lòng tạo composite index cho collection "message_reports" với fields: status (Ascending), createdAt (Descending). ' +
            "Hoặc truy cập link trong error log để tạo index tự động."
        );
      }

      throw error;
    }
  }

  static async updateStatus(
    id: string,
    status: "approved" | "rejected",
    processedBy: string
  ): Promise<void> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    await firestore.collection(this.collection).doc(id).update({
      status,
      processedBy,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  static async findById(id: string): Promise<IMessageReport | null> {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const doc = await firestore.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      processedAt: data?.processedAt?.toDate() || undefined,
    } as IMessageReport;
  }
}
