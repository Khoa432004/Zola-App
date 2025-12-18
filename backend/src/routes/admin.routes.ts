import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware";
import { MessageReport } from "../models/MessageReport";
import { firestore } from "../config/firebase-admin";

const router = Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Lấy thông tin dashboard (chỉ admin)
 * @access  Private (Admin only)
 */
router.get("/dashboard", authenticate, requireAdmin, (req: any, res) => {
  res.json({
    success: true,
    message: "Welcome to Admin Dashboard",
    data: {
      info: "Đây là trang dành cho admin",
      user: req.user,
    },
  });
});

/**
 * @route   GET /api/admin/users
 * @desc    Lấy danh sách tất cả user (chỉ admin)
 * @access  Private (Admin only)
 */
router.get("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    // TODO: Implement get all users logic
    res.json({
      success: true,
      message: "Danh sách user",
      data: {
        users: [],
        total: 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Xóa user (chỉ admin)
 * @access  Private (Admin only)
 */
router.delete(
  "/users/:userId",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // TODO: Implement delete user logic
      res.json({
        success: true,
        message: `User ${userId} đã được xóa`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi server",
      });
    }
  }
);

/**
 * @route   POST /api/admin/reports/messages
 * @desc    Tạo báo cáo tin nhắn mới
 * @access  Private (All users)
 */
router.post("/reports/messages", authenticate, async (req: any, res) => {
  try {
    const { messageId, conversationId, reason, description } = req.body;

    // Log request for debugging
    console.log("[Report Message] Request received:", {
      messageId,
      conversationId,
      reason,
      hasDescription: !!description,
      userId: req.user?.id || req.user?.userId || req.user?.uid,
    });

    // Validation
    if (!messageId || !conversationId || !reason || !description) {
      console.log("[Report Message] Validation failed - missing fields");
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    // Check authentication
    if (!req.user) {
      console.log("[Report Message] Authentication failed - no user");
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để thực hiện thao tác này",
      });
    }

    // Get user ID from token (handle different token formats)
    // JWT payload has userId, but middleware may normalize to uid
    const reporterId = req.user.userId || req.user.uid || req.user.id;
    if (!reporterId) {
      console.error("[Report Message] No user ID found in token:", req.user);
      return res.status(401).json({
        success: false,
        message: "Không thể xác định người dùng",
      });
    }

    if (!firestore) {
      console.error("[Report Message] Firestore not initialized");
      return res.status(500).json({
        success: false,
        message: "Firestore chưa được khởi tạo",
      });
    }

    // Lấy thông tin tin nhắn
    console.log("[Report Message] Fetching message:", messageId);
    const messageDoc = await firestore
      .collection("Messages")
      .doc(messageId)
      .get();

    if (!messageDoc.exists) {
      console.log("[Report Message] Message not found:", messageId);
      return res.status(404).json({
        success: false,
        message: "Tin nhắn không tồn tại",
      });
    }

    const messageData = messageDoc.data();
    console.log("[Report Message] Message found:", {
      messageId,
      senderId: messageData?.sender_id,
      hasContent: !!messageData?.content,
    });

    // Kiểm tra xem người dùng đã báo cáo tin nhắn này chưa
    console.log("[Report Message] Checking for existing reports");
    const existingReports = await firestore
      .collection("message_reports")
      .where("messageId", "==", messageId)
      .where("reporterId", "==", reporterId)
      .where("status", "==", "pending")
      .get();

    if (!existingReports.empty) {
      console.log("[Report Message] Duplicate report found");
      return res.status(400).json({
        success: false,
        message: "Bạn đã báo cáo tin nhắn này rồi. Vui lòng chờ admin xử lý.",
      });
    }

    // Validate reportedUserId
    const reportedUserId = messageData?.sender_id;
    if (!reportedUserId) {
      console.error("[Report Message] No sender_id in message:", messageData);
      return res.status(400).json({
        success: false,
        message: "Không thể xác định người gửi tin nhắn",
      });
    }

    const reportData = {
      messageId,
      reporterId,
      reportedUserId,
      conversationId,
      reason: reason.trim(),
      description: description.trim(),
      messageContent: messageData?.content || "",
      status: "pending" as const,
    };

    console.log("[Report Message] Creating report:", {
      messageId,
      reporterId,
      reportedUserId,
      conversationId,
    });

    const report = await MessageReport.create(reportData);

    console.log("[Report Message] Report created successfully:", report.id);

    res.json({
      success: true,
      message: "Báo cáo đã được gửi thành công",
      data: report,
    });
  } catch (error: any) {
    console.error("[Report Message] Error creating report:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi tạo báo cáo",
    });
  }
});

/**
 * @route   GET /api/admin/reports/messages
 * @desc    Lấy danh sách báo cáo tin nhắn (chỉ admin)
 * @access  Private (Admin only)
 */
router.get(
  "/reports/messages",
  authenticate,
  requireAdmin,
  async (req: any, res) => {
    try {
      const { status = "all" } = req.query;

      console.log("[Get Message Reports] Request received:", {
        status,
        userId: req.user?.userId || req.user?.uid || req.user?.id,
        userRole: req.user?.role,
      });

      // Validate status parameter
      const validStatuses = ["all", "pending", "approved", "rejected"];
      const statusFilter = status as string;
      if (!validStatuses.includes(statusFilter)) {
        console.log("[Get Message Reports] Invalid status:", statusFilter);
        return res.status(400).json({
          success: false,
          message: `Status không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      // Check Firestore initialization
      if (!firestore) {
        console.error("[Get Message Reports] Firestore not initialized");
        return res.status(500).json({
          success: false,
          message: "Firestore chưa được khởi tạo",
        });
      }

      // Fetch reports
      console.log(
        "[Get Message Reports] Fetching reports with status:",
        statusFilter
      );
      const reports = await MessageReport.findAll(statusFilter);
      console.log("[Get Message Reports] Found", reports.length, "reports");

      // Lấy thông tin chi tiết cho mỗi báo cáo
      const detailedReports = await Promise.all(
        reports.map(async (report) => {
          try {
            // Lấy thông tin người báo cáo
            let reporterData: any = null;
            if (report.reporterId) {
              try {
                const reporterDoc = await firestore!
                  .collection("accounts")
                  .doc(report.reporterId)
                  .get();
                reporterData = reporterDoc.exists ? reporterDoc.data() : null;
              } catch (error: any) {
                console.warn(
                  "[Get Message Reports] Error fetching reporter:",
                  report.reporterId,
                  error.message
                );
              }
            }

            // Lấy thông tin người bị báo cáo
            let reportedUserData: any = null;
            if (report.reportedUserId) {
              try {
                const reportedUserDoc = await firestore!
                  .collection("accounts")
                  .doc(report.reportedUserId)
                  .get();
                reportedUserData = reportedUserDoc.exists
                  ? reportedUserDoc.data()
                  : null;
              } catch (error: any) {
                console.warn(
                  "[Get Message Reports] Error fetching reported user:",
                  report.reportedUserId,
                  error.message
                );
              }
            }

            // Convert createdAt to ISO string safely
            let createdAtISO: string;
            if (report.createdAt instanceof Date) {
              createdAtISO = report.createdAt.toISOString();
            } else if (
              report.createdAt &&
              typeof report.createdAt === "object" &&
              "toDate" in report.createdAt
            ) {
              // Firestore Timestamp
              createdAtISO = (report.createdAt as any).toDate().toISOString();
            } else {
              createdAtISO = new Date().toISOString();
            }

            return {
              id: report.id,
              reason: report.reason || "",
              description: report.description || "",
              content: report.messageContent || "",
              status: report.status || "pending",
              createdAt: createdAtISO,
              reportedBy: {
                id: report.reporterId || "",
                name: reporterData?.name || "Unknown",
                email: reporterData?.email || "unknown@example.com",
                avatar: reporterData?.avatar,
              },
              reportedUser: {
                id: report.reportedUserId || "",
                name: reportedUserData?.name || "Unknown",
                email: reportedUserData?.email || "unknown@example.com",
                avatar: reportedUserData?.avatar,
              },
            };
          } catch (error: any) {
            console.error(
              "[Get Message Reports] Error processing report:",
              report.id,
              error.message
            );
            // Return basic report info even if user data fetch fails
            return {
              id: report.id,
              reason: report.reason || "",
              description: report.description || "",
              content: report.messageContent || "",
              status: report.status || "pending",
              createdAt:
                report.createdAt instanceof Date
                  ? report.createdAt.toISOString()
                  : new Date().toISOString(),
              reportedBy: {
                id: report.reporterId || "",
                name: "Unknown",
                email: "unknown@example.com",
              },
              reportedUser: {
                id: report.reportedUserId || "",
                name: "Unknown",
                email: "unknown@example.com",
              },
            };
          }
        })
      );

      console.log(
        "[Get Message Reports] Returning",
        detailedReports.length,
        "detailed reports"
      );

      res.json({
        success: true,
        data: detailedReports,
      });
    } catch (error: any) {
      console.error("[Get Message Reports] Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi server khi lấy danh sách báo cáo",
      });
    }
  }
);

/**
 * @route   PUT /api/admin/reports/messages/:reportId/status
 * @desc    Cập nhật trạng thái báo cáo (chỉ admin)
 * @access  Private (Admin only)
 */
router.put(
  "/reports/messages/:reportId/status",
  authenticate,
  requireAdmin,
  async (req: any, res) => {
    try {
      const { reportId } = req.params;
      const { status } = req.body; // 'approved' | 'rejected'

      // Log request for debugging
      console.log("[Update Report Status] Request received:", {
        reportId,
        status,
        userId: req.user?.userId || req.user?.uid || req.user?.id,
        userRole: req.user?.role,
      });

      // Validation: Check reportId
      if (!reportId || reportId.trim() === "") {
        console.log(
          "[Update Report Status] Validation failed - missing reportId"
        );
        return res.status(400).json({
          success: false,
          message: "Report ID không hợp lệ",
        });
      }

      // Validation: Check status
      if (!status || !["approved", "rejected"].includes(status)) {
        console.log(
          "[Update Report Status] Validation failed - invalid status:",
          status
        );
        return res.status(400).json({
          success: false,
          message:
            "Status không hợp lệ. Chỉ chấp nhận 'approved' hoặc 'rejected'",
        });
      }

      // Check authentication
      if (!req.user) {
        console.log("[Update Report Status] Authentication failed - no user");
        return res.status(401).json({
          success: false,
          message: "Bạn cần đăng nhập để thực hiện thao tác này",
        });
      }

      // Get admin user ID from token
      const adminId = req.user.userId || req.user.uid || req.user.id;
      if (!adminId) {
        console.error(
          "[Update Report Status] No user ID found in token:",
          req.user
        );
        return res.status(401).json({
          success: false,
          message: "Không thể xác định người dùng",
        });
      }

      // Check Firestore initialization
      if (!firestore) {
        console.error("[Update Report Status] Firestore not initialized");
        return res.status(500).json({
          success: false,
          message: "Firestore chưa được khởi tạo",
        });
      }

      // Verify report exists before updating
      console.log(
        "[Update Report Status] Checking if report exists:",
        reportId
      );
      const reportDoc = await firestore
        .collection("message_reports")
        .doc(reportId)
        .get();

      if (!reportDoc.exists) {
        console.log("[Update Report Status] Report not found:", reportId);
        return res.status(404).json({
          success: false,
          message: "Báo cáo không tồn tại",
        });
      }

      const reportData = reportDoc.data();
      console.log("[Update Report Status] Report found:", {
        reportId,
        currentStatus: reportData?.status,
        messageId: reportData?.messageId,
      });

      // If status is 'approved', optionally delete the reported message
      if (status === "approved" && reportData?.messageId) {
        console.log(
          "[Update Report Status] Approved - checking if message should be deleted"
        );

        // Check if message exists
        const messageDoc = await firestore
          .collection("Messages")
          .doc(reportData.messageId)
          .get();

        if (messageDoc.exists) {
          console.log(
            "[Update Report Status] Deleting reported message:",
            reportData.messageId
          );
          await firestore
            .collection("Messages")
            .doc(reportData.messageId)
            .delete();
          console.log("[Update Report Status] Message deleted successfully");
        } else {
          console.log(
            "[Update Report Status] Message not found (may have been deleted already):",
            reportData.messageId
          );
        }
      }

      // Update report status
      console.log("[Update Report Status] Updating report status");
      await MessageReport.updateStatus(reportId, status, adminId);

      console.log("[Update Report Status] Report status updated successfully");

      res.json({
        success: true,
        message:
          status === "approved"
            ? "Đã xóa nội dung vi phạm và cập nhật trạng thái báo cáo"
            : "Đã từ chối báo cáo",
      });
    } catch (error: any) {
      console.error("[Update Report Status] Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        reportId: req.params?.reportId,
      });
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi server khi cập nhật trạng thái báo cáo",
      });
    }
  }
);

export default router;
