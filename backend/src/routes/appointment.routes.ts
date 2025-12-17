import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createAppointment,
  getConversationAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointment.controller';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticate);

/**
 * POST /api/appointments
 * Tạo appointment mới
 */
router.post('/', createAppointment);

/**
 * GET /api/appointments/conversation/:conId
 * Lấy tất cả appointments của một conversation
 */
router.get('/conversation/:conId', getConversationAppointments);

/**
 * GET /api/appointments/:appointmentId
 * Lấy chi tiết một appointment
 */
router.get('/:appointmentId', getAppointmentById);

/**
 * PUT /api/appointments/:appointmentId
 * Cập nhật appointment
 */
router.put('/:appointmentId', updateAppointment);

/**
 * DELETE /api/appointments/:appointmentId
 * Xóa appointment
 */
router.delete('/:appointmentId', deleteAppointment);

export default router;
