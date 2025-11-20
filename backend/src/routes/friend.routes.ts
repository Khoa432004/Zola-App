import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { FriendController } from '../controllers/friend.controller';

const router = Router();
const friendController = new FriendController();

// Tất cả routes đều cần authenticate
router.use(authenticate);

// Gửi lời mời kết bạn
router.post('/requests', (req, res) => friendController.sendFriendRequest(req as any, res));

// Lấy danh sách lời mời đã nhận (pending)
router.get('/requests/received', (req, res) => friendController.getReceivedRequests(req as any, res));

// Lấy danh sách lời mời đã gửi (pending)
router.get('/requests/sent', (req, res) => friendController.getSentRequests(req as any, res));

// Chấp nhận lời mời kết bạn
router.post('/requests/:requestId/accept', (req, res) => friendController.acceptFriendRequest(req as any, res));

// Từ chối lời mời kết bạn
router.post('/requests/:requestId/reject', (req, res) => friendController.rejectFriendRequest(req as any, res));

// Hủy lời mời kết bạn đã gửi
router.delete('/requests/:requestId', (req, res) => friendController.cancelFriendRequest(req as any, res));

// Lấy danh sách bạn bè
router.get('/', (req, res) => friendController.getFriends(req as any, res));

// Hủy kết bạn
router.delete('/:friendId', (req, res) => friendController.unfriend(req as any, res));

export default router;

