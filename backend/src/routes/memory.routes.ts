import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middlewares/auth.middleware";
import { MemoryController } from "../controllers/memory.controller";

const router = Router();
const controller = new MemoryController();

// Configure multer for image upload (only images for memories)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh"));
    }
  },
});

// Tất cả routes đều cần authenticate
router.use(authenticate);

// Lấy kỷ niệm của user hiện tại
router.get("/my", (req, res) => controller.getMyMemories(req as any, res));

// Lấy kỷ niệm sắp tới
router.get("/upcoming", (req, res) => controller.getUpcomingMemories(req as any, res));

// Lấy kỷ niệm của user khác (nếu được phép)
router.get("/user/:userId", (req, res) => controller.getUserMemories(req as any, res));

// Tạo kỷ niệm mới
router.post(
  "/",
  upload.single("image"),
  (req, res) => controller.createMemory(req as any, res)
);

// Cập nhật kỷ niệm
router.put(
  "/:memoryId",
  upload.single("image"),
  (req, res) => controller.updateMemory(req as any, res)
);

// Xóa kỷ niệm
router.delete("/:memoryId", (req, res) => controller.deleteMemory(req as any, res));

// Gửi email thông báo kỷ niệm (manual trigger)
router.post("/notifications/send", (req, res) => controller.sendMemoryNotifications(req as any, res));

export default router;

