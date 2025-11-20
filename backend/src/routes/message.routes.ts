import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { MessageController } from '../controllers/message.controller';

const router = Router();
const messageController = new MessageController();

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

// Tất cả routes đều cần authenticate
router.use(authenticate);

// Gửi message (có thể có file upload)
router.post('/send', upload.single('file'), (req, res) => messageController.sendMessage(req as any, res));

// Lấy messages của conversation
router.get('/:conId', (req, res) => messageController.getConversationMessages(req as any, res));

// Đánh dấu message đã xem
router.post('/:messageId/seen', (req, res) => messageController.markMessageAsSeen(req as any, res));

// Đánh dấu conversation đã xem
router.post('/conversation/:conId/seen', (req, res) => messageController.markConversationAsSeen(req as any, res));

// Xóa message
router.delete('/:messageId', (req, res) => messageController.deleteMessage(req as any, res));

export default router;

