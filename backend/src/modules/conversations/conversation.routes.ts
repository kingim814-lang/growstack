import { Router } from "express";
import { clerkMiddleware } from "@clerk/express";

import {
  createConversation,
  getConversations,
  getConversation,
  sendMessage,
  deleteConversation,
} from "./conversation.controller.js";

const router = Router();

router.use(clerkMiddleware());

router.post("/", createConversation);
router.get("/", getConversations);
router.get("/:id", getConversation);
router.post("/:id/messages", sendMessage);
router.delete("/:id", deleteConversation);

export default router;