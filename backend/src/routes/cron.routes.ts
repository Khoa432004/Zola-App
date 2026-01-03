import { Router } from 'express';
import { CronController } from '../controllers/cron.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Manual trigger for memory posts generation (for testing)
 * Only authenticated users can trigger (có thể thêm admin check sau)
 */
router.post('/trigger-memory-posts', authMiddleware, (req, res) => CronController.triggerMemoryPosts(req, res));

export default router;
