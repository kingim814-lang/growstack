import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

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

app.use(
  clerkMiddleware({
    secretKey: config.clerkSecretKey,
    publishableKey: config.clerkPublishableKey,
  })
);

app.use("/api/conversations", conversationRoutes);

export default app;