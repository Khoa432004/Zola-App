import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middlewares/auth.middleware";
import { ProfileController } from "../controllers/profile.controller";

const router = Router();
const controller = new ProfileController();

// Configure multer for avatar upload (only images)
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

router.get("/me", authenticate, (req, res) => controller.me(req as any, res));
router.patch("/", authenticate, (req, res) => controller.update(req as any, res));
router.post("/avatar", authenticate, upload.single("avatar"), (req, res) => controller.uploadAvatar(req as any, res));

export default router;

