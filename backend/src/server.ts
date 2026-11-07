
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import conversationRoutes from "./modules/conversations/conversation.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// Clerk middleware
app.use(clerkMiddleware());

// API routes
app.use("/api/conversations", conversationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
