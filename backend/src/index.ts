import "./config/env";

import express from "express";
import cors from "cors";
import multer from "multer";
import { firestore } from "./config/firebase-admin";
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/comment.routes";

const app = express();

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

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Kiểm tra Firestore connection
if (!firestore) {
  console.error('❌ Firestore not initialized. Please check your Firebase configuration.');
} else {
  console.log('✅ Firestore connected');
}

// Routes
app.get("/", (_req, res) => {
  res.json({ message: "Zola API", docs: "/health" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Authentication routes
app.use("/api/auth", authRoutes);
// Profile routes
app.use("/api/profile", profileRoutes);
// Post routes
app.use("/api/posts", postRoutes);
// Comment routes
app.use("/api/comments", commentRoutes);

// Start server
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
