"use client";

import ChatPage from "@/components/chat/ChatPage";
import { useParams } from "next/navigation";

// Keep your existing imports

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;

  return (
      <ChatPage conversationId={conversationId} />
  );
}