import express from "express";
import cors from "cors";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { config } from "./config.js";
import conversationRoutes from "./modules/conversations/conversation.routes.js";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/conversations", conversationRoutes);

app.use(
  clerkMiddleware({
    secretKey: config.clerkSecretKey,
    publishableKey: config.clerkPublishableKey,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy" });
});

app.get("/api/me", requireAuth(), (req, res) => {
  res.json({
    message: "Authenticated successfully",
    userId: req.auth.userId,
  });
});

export default app;