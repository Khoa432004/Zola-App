import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/post/:postId', CommentController.getCommentsByPost);
router.post('/', authenticate, CommentController.createComment);
router.put('/:commentId', authenticate, CommentController.updateComment);
router.delete('/:commentId', authenticate, CommentController.deleteComment);

export default router;

