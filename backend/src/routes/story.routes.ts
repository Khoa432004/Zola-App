import { Router } from "express";
import multer from "multer";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { StoryController } from "../controllers/story.controller";

const router = Router();
const controller = new StoryController();

// Configure multer for single file upload (stories only allow 1 media)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh hoặc video"));
    }
  },
});

// Public routes with optional authentication
router.get("/", optionalAuthenticate, controller.getAllStories);

// Protected routes
router.get("/my", authenticate, controller.getMyStories);
router.post(
  "/",
  authenticate,
  upload.single("media"), // Single file for story
  controller.createStory
);
// Specific routes phải đặt trước dynamic routes
router.get("/:id/viewers", authenticate, controller.getStoryViewers);
router.post("/:id/view", authenticate, controller.markAsViewed);
router.get("/:id", optionalAuthenticate, controller.getStoryById);
router.delete("/:id", authenticate, controller.deleteStory);

// Admin/Utility routes
router.post("/cleanup/expired", controller.cleanupExpired);

export default router;

