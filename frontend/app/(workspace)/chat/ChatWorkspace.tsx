"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ChatPage from "@/components/chat/ChatPage";

function ChatWorkspaceContent() {
  const params = useParams();
  const conversationId = params.id as string | undefined;

  return <ChatPage conversationId={conversationId} />;
}

export default function ChatWorkspace() {
  return (
    <Suspense fallback={null}>
      <ChatWorkspaceContent />
    </Suspense>
  );
}
