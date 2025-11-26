import { Router } from "express";
import multer from "multer";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { PostController } from "../controllers/post.controller";

const router = Router();
const controller = new PostController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
router.get("/", optionalAuthenticate, controller.getAllPosts);
router.get("/featured", optionalAuthenticate, controller.getFeaturedPosts);

// Protected routes
router.get('/my', authenticate, controller.getMyPosts);
router.get('/deleted', authenticate, controller.getDeletedPosts);
router.post(
  "/",
  authenticate,
  upload.array("media", 10),
  controller.createPost
);
router.put(
  "/:id",
  authenticate,
  upload.array("media", 10),
  controller.updatePost
);

router.get("/latest", controller.getLatestPosts);
router.get("/top-liked", controller.getTopLikedPosts);
router.get("/top-viewed", controller.getTopViewedPosts);
router.get("/promoted", controller.getPromotedPosts);

router.get('/:id', controller.getPostById);
router.post('/:id/restore', authenticate, controller.restorePost);



// Like / Unlike post
router.post('/:id/like', authenticate, controller.likePost);
router.delete('/:id/like', authenticate, controller.unlikePost);

// Share post
router.post('/:id/share', authenticate, controller.sharePost);

router.post('/', authenticate, upload.array('media', 10), controller.createPost);
router.put('/:id', authenticate, upload.array('media', 10), controller.updatePost);
router.delete('/:id', authenticate, controller.deletePost);



export default router;
