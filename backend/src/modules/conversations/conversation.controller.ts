
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

  const abortController = new AbortController();

  const handleClientDisconnect = () => {
    if (!res.writableEnded) {
      console.log("Client disconnected. Cancelling AI generation.");
      abortController.abort();
    }
  };

  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const conversationId = req.params.id as string;
    const content = req.body.content;

    // Validate message
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.trim().length > 12000
    ) {
      return res.status(400).json({
        message: "Message must contain 1-12000 characters",
      });
    }

    // Find conversation and verify ownership
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

    // Prepare conversation history
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

    // Build prompt
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

    // Save user message and update conversation
    await prisma.$transaction(async (tx) => {
      await tx.message.create({
        data: {
          conversationId,
          role: "user",
          content: content.trim(),
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
    });

    // Generate complete AI response
    const assistantContent = await generateAIResponse(prompt, abortController.signal);

    if(abortController.signal.aborted){
      return;
    }

    // Save assistant response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: assistantContent,
      },
    });

    // Return complete response
    return res.status(200).json({
      userMessage: {
        conversationId,
        role: "user",
        content: content.trim(),
      },
      assistantMessage,
    });

  } catch (error) {
    if (abortController.signal.aborted) {
      console.log("AI generation cancelled by client.");
      return;
    }

    console.error("Send message error:", error);

    return res.status(500).json({
      message: "Failed to process conversation",
    });
  } finally {
    res.off("close", handleClientDisconnect);
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

// --------------------
// Edit Message & Regenerate Response
// --------------------

export async function editMessage(
  req: Request,
  res: Response
) {
  const abortController = new AbortController();

  const handleClientDisconnect = () => {
    if (!res.writableEnded) {
      console.log("Client disconnected. Cancelling AI generation.");
      abortController.abort();
    }
  };

  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const conversationId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const content = req.body.content;

    // Validate edited content
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.trim().length > 12000
    ) {
      return res.status(400).json({
        message: "Message must contain 1-12000 characters",
      });
    }

    // Find conversation and verify ownership
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

    // Find the message being edited
    const editedIndex = conversation.messages.findIndex(
      (item) => item.id === messageId
    );

    if (editedIndex === -1) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    const editedMessage = conversation.messages[editedIndex];

    if (!editedMessage) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    // Only user messages can be edited
    if (editedMessage.role !== "user") {
      return res.status(400).json({
        message: "Only user messages can be edited",
      });
    }

    // Build history before the edited message
    const history = conversation.messages
      .slice(0, editedIndex)
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

    const updatedContent = content.trim();

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
        content: updatedContent,
      },
    ];

    // Listen for client cancellation
    res.on("close", handleClientDisconnect);

    // Generate the new AI response
    const assistantContent = await generateAIResponse(
      prompt,
      abortController.signal
    );

    if (abortController.signal.aborted) {
      return;
    }

    // Update the message, remove subsequent messages,
    // and save the new assistant response atomically.
    const assistantMessage = await prisma.$transaction(
      async (tx) => {
        await tx.message.update({
          where: { id: messageId },
          data: { content: updatedContent },
        });

        const subsequentMessageIds = conversation.messages
          .slice(editedIndex + 1)
          .map((item) => item.id);

        if (subsequentMessageIds.length > 0) {
          await tx.message.deleteMany({
            where: {
              id: { in: subsequentMessageIds },
            },
          });
        }

        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return tx.message.create({
          data: {
            conversationId,
            role: "assistant",
            content: assistantContent,
          },
        });
      }
    );

    return res.status(200).json({
      message: "Message edited successfully",
      userMessage: {
        ...editedMessage,
        content: updatedContent,
      },
      assistantMessage,
    });
  } catch (error) {
    if (abortController.signal.aborted) {
      console.log("Edit generation cancelled by client.");
      return;
    }

    console.error("Edit message error:", error);

    return res.status(500).json({
      message: "Failed to edit message",
    });
  } finally {
    res.off("close", handleClientDisconnect);
  }
}