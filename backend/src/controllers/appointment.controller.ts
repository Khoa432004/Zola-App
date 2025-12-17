import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { validateCreateAppointment, validateUpdateAppointment } from '../dto/appointment.dto';

const appointmentService = new AppointmentService();

/**
 * Tạo appointment mới
 */
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate input
    const validation = validateCreateAppointment(req.body);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Dữ liệu không hợp lệ', 
        details: validation.errors 
      });
    }

    const appointment = await appointmentService.createAppointment(userId, req.body);
    return res.status(201).json({
      message: 'Tạo cuộc hẹn thành công',
      data: appointment,
    });
  } catch (error: any) {
    console.error('Error in createAppointment:', error);
    return res.status(500).json({ 
      error: error.message || 'Lỗi khi tạo cuộc hẹn' 
    });
  }
};

/**
 * Lấy danh sách appointments của một conversation
 */
export const getConversationAppointments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conId } = req.params;
    if (!conId) {
      return res.status(400).json({ error: 'conId là bắt buộc' });
    }

    const appointments = await appointmentService.getConversationAppointments(userId, conId);
    return res.json({
      message: 'Lấy danh sách cuộc hẹn thành công',
      data: appointments,
    });
  } catch (error: any) {
    console.error('Error in getConversationAppointments:', error);
    return res.status(500).json({ 
      error: error.message || 'Lỗi khi lấy danh sách cuộc hẹn' 
    });
  }
};

/**
 * Lấy chi tiết một appointment
 */
export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId là bắt buộc' });
    }

    const appointment = await appointmentService.getAppointmentById(userId, appointmentId);
    return res.json({
      message: 'Lấy thông tin cuộc hẹn thành công',
      data: appointment,
    });
  } catch (error: any) {
    console.error('Error in getAppointmentById:', error);
    return res.status(500).json({ 
      error: error.message || 'Lỗi khi lấy thông tin cuộc hẹn' 
    });
  }
};

/**
 * Cập nhật appointment
 */
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId là bắt buộc' });
    }

    // Validate input
    const validation = validateUpdateAppointment(req.body);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Dữ liệu không hợp lệ', 
        details: validation.errors 
      });
    }

    const appointment = await appointmentService.updateAppointment(userId, appointmentId, req.body);
    return res.json({
      message: 'Cập nhật cuộc hẹn thành công',
      data: appointment,
    });
  } catch (error: any) {
    console.error('Error in updateAppointment:', error);
    return res.status(500).json({ 
      error: error.message || 'Lỗi khi cập nhật cuộc hẹn' 
    });
  }
};

/**
 * Xóa appointment
 */
export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId là bắt buộc' });
    }

    await appointmentService.deleteAppointment(userId, appointmentId);
    return res.json({
      message: 'Xóa cuộc hẹn thành công',
    });
  } catch (error: any) {
    console.error('Error in deleteAppointment:', error);
    return res.status(500).json({ 
      error: error.message || 'Lỗi khi xóa cuộc hẹn' 
    });
  }
};
