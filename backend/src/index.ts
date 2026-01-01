import "./config/env";

import express from "express";
import cors from "cors";
import multer from "multer";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { firestore } from "./config/firebase-admin";
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/comment.routes";
import friendRoutes from "./routes/friend.routes";
import conversationRoutes from "./routes/conversation.routes";
import messageRoutes from "./routes/message.routes";
import storyRoutes from "./routes/story.routes";
import adminRoutes from "./routes/admin.routes";
import appointmentRoutes from "./routes/appointment.routes";
import memoryRoutes from "./routes/memory.routes";
import { setupSocketHandlers } from "./socket/socket.handlers";
import { SchedulerService } from "./services/scheduler.service";

const app = express();
const httpServer = createServer(app);

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
// Friend routes
app.use("/api/friends", friendRoutes);
// Conversation routes
app.use("/api/conversations", conversationRoutes);
// Message routes
app.use("/api/messages", messageRoutes);
// Story routes
app.use("/api/stories", storyRoutes);
// Admin routes
app.use("/api/admin", adminRoutes);
// Appointment routes
app.use("/api/appointments", appointmentRoutes);
// Memory routes
app.use("/api/memories", memoryRoutes);

// Setup Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup socket handlers
setupSocketHandlers(io);

// Make io available globally (for use in controllers)
(global as any).io = io;

// Start scheduler for appointment reminders
const scheduler = new SchedulerService();
scheduler.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  scheduler.stop();
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});

// Start server
const port = Number(process.env.PORT) || 4000;
httpServer.listen(port, () => {
  console.log(`✅ API listening on http://localhost:${port}`);
  console.log(`✅ WebSocket server ready on http://localhost:${port}`);
});
