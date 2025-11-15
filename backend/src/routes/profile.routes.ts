import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { ProfileController } from "../controllers/profile.controller";

const router = Router();
const controller = new ProfileController();

router.get("/me", authenticate, (req, res) => controller.me(req as any, res));
router.patch("/", authenticate, (req, res) => controller.update(req as any, res));

export default router;

