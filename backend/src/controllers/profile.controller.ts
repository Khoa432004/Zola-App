import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Account } from "../models/Account";
import { uploadFile } from "../utils/storage";

export class ProfileController {
  async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const acc = await Account.findById(req.user.userId);
      if (!acc) {
        return res.status(404).json({ success: false, message: "Account not found" });
      }
      return res.json({
        success: true,
        data: {
          id: acc.id,
          email: acc.email,
          name: acc.name,
          avatar: acc.avatar,
          phone: acc.phone,
          address: acc.address,
          bio: acc.bio,
        },
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message || "Server error" });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const { name, phone, address, bio, avatar } = req.body as { 
        name?: string; 
        phone?: string; 
        address?: string; 
        bio?: string; 
        avatar?: string;
      };
      const updated = await Account.update(req.user.userId, { name, phone, address, bio, avatar });
      return res.json({
        success: true,
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          avatar: updated.avatar,
          phone: updated.phone,
          address: updated.address,
          bio: updated.bio,
        },
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || "Update failed" });
    }
  }

  async uploadAvatar(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ 
          success: false, 
          message: "Vui lòng chọn file ảnh" 
        });
      }

      // Chỉ chấp nhận ảnh
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ 
          success: false, 
          message: "Chỉ chấp nhận file ảnh" 
        });
      }

      // Upload file lên Cloudinary
      const uploadResult = await uploadFile(file, `avatars/${req.user.userId}`);
      
      // Cập nhật avatar URL vào database
      const updated = await Account.update(req.user.userId, { avatar: uploadResult.url });

      return res.json({
        success: true,
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          avatar: updated.avatar,
          phone: updated.phone,
          address: updated.address,
          bio: updated.bio,
        },
        message: "Cập nhật ảnh đại diện thành công",
      });
    } catch (e: any) {
      return res.status(400).json({ 
        success: false, 
        message: e.message || "Không thể cập nhật ảnh đại diện" 
      });
    }
  }
}

