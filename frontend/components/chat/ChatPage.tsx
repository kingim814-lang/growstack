
"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

import {
  createConversation,
  getConversation,
  sendMessage,
  type Message,
} from "@/lib/api";

type Props = {
  conversationId?: string;
};

export default function ChatPage({ conversationId }: Props) {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  // State
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  const isLoading = !isLoaded || (!!conversationId && isSignedIn && !loadError && messages.length === 0);
  const error = !isLoaded
    ? ""
    : !isSignedIn
      ? "Please sign in to continue."
      : loadError || sendError;

  // -----------------------------
  // Textarea Auto Resize
  // -----------------------------

  const handleInput = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMessage(e.target.value);

    const textarea = e.target;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      200
    )}px`;
  };

  // -----------------------------
  // Reset Textarea
  // -----------------------------

  const resetTextarea = () => {
    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // -----------------------------
  // Load Existing Conversation
  // -----------------------------

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !conversationId) return;

    let cancelled = false;

    async function loadConversation() {
      try {
        setLoadError("");

        const token = await getToken();

        if (!token) {
          throw new Error("Authentication token unavailable.");
        }

        const conversation = await getConversation(
          token,
          conversationId!
        );

        if (!cancelled) {
          setMessages(conversation.messages);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Failed to load conversation."
          );
        }
      }
    }

    loadConversation();

    return () => {
      cancelled = true;
    };
  }, [conversationId, getToken, isLoaded, isSignedIn]);
  // -----------------------------
  // Scroll to Latest Message
  // -----------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // -----------------------------
  // Send Message
  // -----------------------------

  async function handleSendMessage() {
    const trimmedMessage = message.trim();

    if (
      !trimmedMessage ||
      isSending ||
      !isLoaded ||
      !isSignedIn
    ) {
      return;
    }

    try {
      setIsSending(true);
      setSendError("");

      // 1. Get Clerk session token
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token unavailable.");
      }

      // 2. Create conversation if this is a new chat
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const conversation = await createConversation(token);
        activeConversationId = conversation.id;
      }

      // 3. Send message to backend
      const result = await sendMessage(
        token,
        activeConversationId,
        trimmedMessage
      );

      // 4. Update messages
      setMessages((previous) => [
        ...previous,
        result.userMessage,
        result.assistantMessage,
      ]);

      // 5. Clear input
      resetTextarea();

      // 6. Navigate to conversation
      if (!conversationId) {
        router.replace(`/chat/${activeConversationId}`);
      }
    } catch (err) {
      console.error("Send message error:", err);

      setSendError(
        err instanceof Error
          ? err.message
          : "Failed to send message."
      );
    } finally {
      setIsSending(false);
    }
  }

  // -----------------------------
  // Keyboard Handling
  // -----------------------------

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (
        message.trim() &&
        !isSending &&
        isLoaded &&
        isSignedIn
      ) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  };

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <main className="relative flex h-full min-h-0 flex-col bg-white text-[#171717] dark:bg-[#212121] dark:text-[#ececec]">

      {/* Conversation */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[#999]">
              Loading conversation...
            </div>
          ) : error && !hasMessages ? (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-red-500">
              {error}
            </div>
          ) : !hasMessages ? (
            <div className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                What can I help you with?
              </h2>

              <p className="mt-3 text-sm text-[#777] dark:text-[#999]">
                Ask anything or start a conversation.
              </p>
            </div>
          ) : (
            <div className="space-y-8 py-8">
              {messages.map((item) => (
                <div key={item.id}>
                  {item.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-3xl bg-[#f4f4f4] px-5 py-3 text-[15px] leading-7 dark:bg-[#303030]">
                        {item.content}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-full whitespace-pre-wrap text-[15px] leading-7">
                      {item.content}
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <p className="text-sm text-[#999]">
                  Growstack is thinking...
                </p>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="mx-auto max-w-3xl">

          {error && hasMessages && (
            <p className="mb-2 text-sm text-red-500">
              {error}
            </p>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage();
            }}
            className="
              flex items-end gap-2
              rounded-3xl border border-[#e5e5e5]
              bg-white px-4 py-2 shadow-sm
              transition-colors
              focus-within:border-[#c5c5c5]
              dark:border-[#424242]
              dark:bg-[#303030]
              dark:focus-within:border-[#666]
            "
          >
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message Growstack..."
              rows={1}
              disabled={!isLoaded || !isSignedIn || isSending}
              className="
                min-h-7 max-h-50 flex-1
                resize-none overflow-y-auto
                bg-transparent py-1
                text-[15px] leading-6
                outline-none
                placeholder:text-[#999]
                disabled:opacity-50
              "
            />

            <button
              type="submit"
              disabled={
                !message.trim() ||
                isSending ||
                !isLoaded ||
                !isSignedIn
              }
              title="Send message"
              className="
                mb-0.5 flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-full
                bg-[#3685f4] text-white
                transition-colors
                hover:bg-blue-600
                disabled:cursor-not-allowed
                disabled:opacity-40
                dark:bg-sky-500
                dark:text-white
                dark:hover:bg-sky-400
              "
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          </form>

          <p className="mt-3 text-center text-[11px] text-[#999]">
            Growstack AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </main>
  );
}
