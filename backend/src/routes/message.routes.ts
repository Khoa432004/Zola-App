import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { MessageController } from '../controllers/message.controller';

const router = Router();
const messageController = new MessageController();

// Tất cả routes đều cần authenticate
router.use(authenticate);

// Gửi message
router.post('/send', (req, res) => messageController.sendMessage(req as any, res));

// Lấy messages của conversation
router.get('/:conId', (req, res) => messageController.getConversationMessages(req as any, res));

// Đánh dấu message đã xem
router.post('/:messageId/seen', (req, res) => messageController.markMessageAsSeen(req as any, res));

// Đánh dấu conversation đã xem
router.post('/conversation/:conId/seen', (req, res) => messageController.markConversationAsSeen(req as any, res));

// Xóa message
router.delete('/:messageId', (req, res) => messageController.deleteMessage(req as any, res));

export default router;

