import { Router } from "express";

import {
  createConversation,
  getConversations,
  getConversation,
  sendMessage,
  deleteConversation,
  editMessage,
} from "./conversation.controller.js";

const router = Router();

router.post("/", createConversation);
router.get("/", getConversations);
router.get("/:id", getConversation);
router.post("/:id/messages", sendMessage);
router.delete("/:id", deleteConversation);
router.patch("/:id/messages/:messageId", editMessage);

export default router;