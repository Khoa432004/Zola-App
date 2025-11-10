import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Account } from "../models/Account";

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
      const { name, phone } = req.body as { name?: string; phone?: string };
      const updated = await Account.update(req.user.userId, { name, phone });
      return res.json({
        success: true,
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          avatar: updated.avatar,
          phone: updated.phone,
        },
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || "Update failed" });
    }
  }
}

