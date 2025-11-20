import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { ConversationController } from '../controllers/conversation.controller';

const router = Router();
const conversationController = new ConversationController();

// Tất cả routes đều cần authenticate
router.use(authenticate);

// Tạo conversation riêng tư
router.post('/private', (req, res) => conversationController.createPrivateConversation(req as any, res));

// Tạo conversation nhóm
router.post('/group', (req, res) => conversationController.createGroupConversation(req as any, res));

// Lấy danh sách conversations của user
router.get('/', (req, res) => conversationController.getUserConversations(req as any, res));

// Lấy conversation theo ID
router.get('/:conversationId', (req, res) => conversationController.getConversationById(req as any, res));

// Thêm member vào group
router.post('/:conversationId/members', (req, res) => conversationController.addMemberToGroup(req as any, res));

// Xóa conversation
router.delete('/:conversationId', (req, res) => conversationController.deleteConversation(req as any, res));

export default router;

