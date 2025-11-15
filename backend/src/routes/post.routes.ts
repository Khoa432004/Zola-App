import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { PostController } from '../controllers/post.controller';

const router = Router();
const controller = new PostController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh hoặc video'));
    }
  },
});

// Public routes
router.get('/', controller.getAllPosts);
router.get('/featured', controller.getFeaturedPosts);

// Protected routes
router.get('/my', authenticate, controller.getMyPosts);
router.get('/deleted', authenticate, controller.getDeletedPosts);
router.post('/', authenticate, upload.array('media', 10), controller.createPost);
router.put('/:id', authenticate, upload.array('media', 10), controller.updatePost);
router.delete('/:id', authenticate, controller.deletePost);
router.post('/:id/restore', authenticate, controller.restorePost);

export default router;

