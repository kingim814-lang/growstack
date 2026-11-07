
import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";

import { prisma } from "../../lib/prisma.js";
import { generateAIResponse } from "../ai/llm.service.js";

// --------------------
// Helper: Get User ID
// --------------------

function getAuthenticatedUserId(req: Request): string | null {
  const { userId } = getAuth(req);
  return userId;
}

// --------------------
// Helper: Ensure User Exists
// --------------------

async function ensureUserExists(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
}

// --------------------
// Create Conversation
// --------------------

export async function createConversation(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await ensureUserExists(userId);

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: "New Chat",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Conversation created successfully",
      conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);

    return res.status(500).json({
      message: "Failed to create conversation",
    });
  }
}

// --------------------
// Get All Conversations
// --------------------

export async function getConversations(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);

    return res.status(500).json({
      message: "Failed to retrieve conversations",
    });
  }
}

// --------------------
// Get Single Conversation
// --------------------

export async function getConversation(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const conversationId = req.params.id as string;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    return res.status(200).json({ conversation });
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      message: "Failed to retrieve conversation",
    });
  }
}

// --------------------
// Send Message
// --------------------

export async function sendMessage(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const conversationId = req.params.id as string;
    const content = req.body.content;

    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.trim().length > 12000
    ) {
      return res.status(400).json({
        message: "Message must contain 1-12000 characters",
      });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const history = conversation.messages
      .filter(
        (item) =>
          item.role === "user" ||
          item.role === "assistant"
      )
      .slice(-20)
      .map((item) => ({
        role: item.role as "user" | "assistant",
        content: item.content,
      }));

    const prompt = [
      {
        role: "system" as const,
        content:
          "You are Growstack, a helpful AI assistant. " +
          "Provide accurate, clear and useful answers. " +
          "Remember the context of the ongoing conversation.",
      },
      ...history,
      {
        role: "user" as const,
        content: content.trim(),
      },
    ];

    let assistantContent: string;

    try {
      assistantContent = await generateAIResponse(prompt);
      console.log("Assistant content:", assistantContent);
      console.log("Assistant content length:", assistantContent.length);  
    } catch (error) {
      console.error("AI generation failed:", error);

      return res.status(502).json({
        message: "Unable to generate AI response. Please try again.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const userMessage = await tx.message.create({
        data: {
          conversationId,
          role: "user",
          content: content.trim(),
        },
      });

      const assistantMessage = await tx.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: assistantContent,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          ...(conversation.title === "New Chat"
            ? { title: content.trim().slice(0, 40) }
            : {}),
        },
      });

      return {
        userMessage,
        assistantMessage,
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      message: "Failed to process conversation",
    });
  }
}

// --------------------
// Delete Conversation
// --------------------

export async function deleteConversation(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const conversationId = req.params.id as string;

    const result = await prisma.conversation.deleteMany({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete conversation error:", error);

    return res.status(500).json({
      message: "Failed to delete conversation",
    });
  }
}
