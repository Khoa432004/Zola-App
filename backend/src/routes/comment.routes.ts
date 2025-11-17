import { Router } from 'express';
import multer from 'multer';
import { CommentController } from '../controllers/comment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Multer for comment media uploads (memory storage)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
			cb(null, true);
		} else {
			cb(new Error('Only images or videos are allowed'));
		}
	}
});

router.get('/post/:postId', CommentController.getCommentsByPost);
// Accept multiple files under field name 'media'
router.post('/', authenticate, upload.array('media', 4), CommentController.createComment);
router.put('/:commentId', authenticate, CommentController.updateComment);
router.delete('/:commentId', authenticate, CommentController.deleteComment);

// Like / Unlike comment
router.post('/:commentId/like', authenticate, CommentController.likeComment);
router.delete('/:commentId/like', authenticate, CommentController.unlikeComment);

export default router;

