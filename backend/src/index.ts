import "./config/env";

import express from "express";
import cors from "cors";
import { firestore } from "./config/firebase-admin";
import authRoutes from "./routes/auth.routes";

const app = express();

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

// Start server
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
