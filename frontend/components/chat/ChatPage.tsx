
"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Check,
  Copy,
  Pencil,
  Square,
} from "lucide-react";

import MarkdownRenderer from "@/components/chat/MarkdownRenderer";

import {
  createConversation,
  editMessage,
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

  // -----------------------------
  // State
  // -----------------------------

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");

  const [copiedMessageId, setCopiedMessageId] =
    useState<string | null>(null);

  const [editingMessageId, setEditingMessageId] =
    useState<string | null>(null);

  const [editedContent, setEditedContent] = useState("");

  // -----------------------------
  // Refs
  // -----------------------------

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const newlyCreatedConversationRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasMessages = messages.length > 0;

  const isLoading =
    !isLoaded ||
    (!!conversationId &&
      isSignedIn &&
      !loadError &&
      messages.length === 0);

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
  // Start New Chat
  // -----------------------------
  useEffect(() => {
    function handleNewChat() {
      // Cancel previous AI generation.
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      // Reset conversation messages.
      setMessages([]);
      setMessage("");

      // Reset errors.
      setLoadError("");
      setSendError("");

      // Reset editing and copying states.
      setEditingMessageId(null);
      setEditedContent("");
      setCopiedMessageId(null);

      // Reset generation states.
      setIsSending(false);
      setIsThinking(false);

      // Reset newly created conversation tracking.
      newlyCreatedConversationRef.current = null;

      // Reset textarea height.
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }

    window.addEventListener("growstack:new-chat", handleNewChat);

    return () => {
      window.removeEventListener("growstack:new-chat", handleNewChat);
    };
  }, []);


  // -----------------------------
  // Copy Message
  // -----------------------------

  async function handleCopyMessage(
    id: string,
    content: string
  ) {
    try {
      await navigator.clipboard.writeText(content);

      setCopiedMessageId(id);

      window.setTimeout(() => {
        setCopiedMessageId((current) =>
          current === id ? null : current
        );
      }, 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  }

  // -----------------------------
  // Edit Message
  // -----------------------------

  function handleEditMessage(item: Message) {
    setEditingMessageId(item.id);
    setEditedContent(item.content);
  }

  async function handleSaveEdit() {
    const trimmedContent = editedContent.trim();
    const currentEditingId = editingMessageId;

    if (
      !currentEditingId ||
      !trimmedContent ||
      isSending ||
      !conversationId ||
      !isLoaded ||
      !isSignedIn
    ) {
      return;
    }

    try {
      setIsSending(true);
      setSendError("");

      setEditingMessageId(null);
      setEditedContent("");

      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token unavailable.");
      }

      const result = await editMessage(
        token,
        conversationId,
        currentEditingId,
        trimmedContent
      );

      setMessages((previous) => {
        const editedIndex = previous.findIndex(
          (item) => item.id === currentEditingId
        );

        if (editedIndex === -1) {
          return previous;
        }

        return [
          ...previous.slice(0, editedIndex),
          result.userMessage,
          result.assistantMessage,
        ];
      });
    } catch (error) {
      console.error("Edit message error:", error);

      setSendError(
        error instanceof Error
          ? error.message
          : "Failed to edit message."
      );

      setEditingMessageId(currentEditingId);
      setEditedContent(trimmedContent);
    } finally {
      setIsSending(false);
    }
  }

  // -----------------------------
  // Progressive Response Reveal
  // -----------------------------

  async function revealAssistantResponse(
    assistantMessage: Message,
    signal?: AbortSignal
  ) {
    const lines = assistantMessage.content.split("\n");

    setMessages((previous) =>
      previous.map((item) =>
        item.id === assistantMessage.id
          ? { ...assistantMessage, content: "" }
          : item
      )
    );

    let revealedContent = "";

    for (let i = 0; i < lines.length; i++) {
      if (signal?.aborted) {
        throw new DOMException(
          "Generation stopped",
          "AbortError"
        );
      }

      revealedContent +=
        (i === 0 ? "" : "\n") + lines[i];

      setMessages((previous) =>
        previous.map((item) =>
          item.id === assistantMessage.id
            ? {
                ...item,
                content: revealedContent,
              }
            : item
        )
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 100)
      );
    }

    if (signal?.aborted) {
      throw new DOMException(
        "Generation stopped",
        "AbortError"
      );
    }
  }

  // -----------------------------
  // Load Existing Conversation
  // -----------------------------
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !conversationId) {
      return;
    }

    // This conversation was just created and its messages
    // are already available in the current component state.
    if (newlyCreatedConversationRef.current === conversationId) {
      newlyCreatedConversationRef.current = null;
      return;
    }

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

    let temporaryId = "";
    let generatedAssistantId = "";

    let activeConversationId = conversationId;

    const temporaryUserId = `user-${Date.now()}`;

    let abortController: AbortController | null = null;

    try {
      setIsSending(true);
      setIsThinking(true);
      setSendError("");

      resetTextarea();

      // Immediately display the user's message.
      const temporaryUserMessage: Message = {
        id: temporaryUserId,
        conversationId: activeConversationId ?? "pending",
        role: "user",
        content: trimmedMessage,
        createdAt: new Date().toISOString(),
      };

      setMessages((previous) => [
        ...previous,
        temporaryUserMessage,
      ]);

      // Get authentication token.
      const token = await getToken();

      if (!token) {
        throw new Error(
          "Authentication token unavailable."
        );
      }

      // Create conversation if necessary.
      if (!activeConversationId) {
        const conversation = await createConversation(token);

        activeConversationId = conversation.id;

        // Update temporary user message with real ID.
        setMessages((previous) =>
          previous.map((item) =>
            item.id === temporaryUserId
              ? {
                  ...item,
                  conversationId: conversation.id,
                }
              : item
          )
        );

        // Immediately update sidebar.
        window.dispatchEvent(
          new CustomEvent("growstack:conversation-updated", {
            detail: {
              id: conversation.id,
              title: trimmedMessage.slice(0, 40),
            },
          })
        );
      }

      // Add temporary assistant message.
      temporaryId = `assistant-${Date.now()}`;

      const temporaryAssistantMessage: Message = {
        id: temporaryId,
        conversationId: activeConversationId!,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      setMessages((previous) => [
        ...previous,
        temporaryAssistantMessage,
      ]);

      // Prepare cancellation.
      abortController = new AbortController();

      abortControllerRef.current = abortController;

      // Wait for Groq response.
      const assistantMessage = await sendMessage(
        token,
        activeConversationId!,
        trimmedMessage,
        abortController.signal
      );

      generatedAssistantId = assistantMessage.id;

      // Groq response received. Stop Thinking indicator.
      setIsThinking(false);

      // Replace temporary assistant message.
      setMessages((previous) =>
        previous.map((item) =>
          item.id === temporaryId
            ? {
                ...assistantMessage,
                content: "",
              }
            : item
        )
      );

      // Reveal response progressively.
      await revealAssistantResponse(
        assistantMessage,
        abortController.signal
      );
    } catch (err) {
      if (
        err instanceof Error &&
        err.name === "AbortError"
      ) {
        // Remove temporary/generated assistant response.
        // Keep the user message because the backend may
        // already have saved it.
        setMessages((previous) =>
          previous.filter(
            (item) =>
              item.id !== temporaryId &&
              item.id !== generatedAssistantId
          )
        );

        return;
      }

      console.error("Send message error:", err);

      setSendError(
        err instanceof Error
          ? err.message
          : "Failed to send message."
      );

      // Remove empty assistant placeholder on failure.
      if (temporaryId) {
        setMessages((previous) =>
          previous.filter(
            (item) => item.id !== temporaryId
          )
        );
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }

      setIsSending(false);
      setIsThinking(false);

      // Navigate to the new conversation after generation.
      if (
        !conversationId &&
        activeConversationId &&
        window.location.pathname === "/chat"
      ) {
        newlyCreatedConversationRef.current = activeConversationId;

        router.replace(`/chat/${activeConversationId}`);
      }
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
                <div key={item.id} className="group">

                  {/* User Message */}
                  {item.role === "user" ? (
                    <div className="flex flex-col items-end">

                      {editingMessageId === item.id ? (
                        <div className="w-full max-w-[85%]">
                          <textarea
                            value={editedContent}
                            onChange={(e) =>
                              setEditedContent(e.target.value)
                            }
                            autoFocus
                            rows={Math.max(
                              2,
                              editedContent.split("\n").length
                            )}
                            disabled={isSending}
                            className="
                              w-full min-h-24 resize-y
                              rounded-2xl border border-[#d5d5d5]
                              bg-[#f4f4f4] px-5 py-3
                              text-[15px] leading-7
                              outline-none focus:border-blue-500
                              dark:border-[#555]
                              dark:bg-[#303030]
                            "
                          />

                          <div className="mt-2 flex justify-end gap-2">

                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditedContent("");
                              }}
                              disabled={isSending}
                              className="
                                rounded-full px-4 py-2 text-sm
                                text-[#777] hover:bg-[#f0f0f0]
                                dark:hover:bg-[#383838]
                                disabled:opacity-40
                                cursor-pointer
                              "
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={
                                !editedContent.trim() || isSending
                              }
                              className="
                                rounded-full bg-[#171717] px-4 py-2
                                text-sm text-white hover:bg-[#333]
                                disabled:cursor-not-allowed disabled:opacity-40
                                dark:bg-white dark:text-black
                                dark:hover:bg-gray-200
                                cursor-pointer
                              "
                            >
                              Save changes
                            </button>

                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-3xl bg-[#f4f4f4] px-5 py-3 text-[15px] leading-7 dark:bg-[#303030]">
                            <MarkdownRenderer content={item.content} />
                          </div>

                          {/* User Message Actions */}
                          <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">

                            <button
                              type="button"
                              onClick={() =>
                                handleCopyMessage(
                                  item.id,
                                  item.content
                                )
                              }
                              className="rounded-md p-1.5 text-[#888] transition-colors hover:bg-[#f0f0f0] hover:text-[#333] dark:hover:bg-[#383838] dark:hover:text-white cursor-pointer"
                              title="Copy message"
                              aria-label="Copy user message"
                            >
                              {copiedMessageId === item.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleEditMessage(item)
                              }
                              disabled={
                                isSending ||
                                editingMessageId !== null
                              }
                              className="rounded-md p-1.5 text-[#888] transition-colors hover:bg-[#f0f0f0] hover:text-[#333] dark:hover:bg-[#383838] dark:hover:text-white cursor-pointer disabled:opacity-40"
                              title="Edit message"
                              aria-label="Edit user message"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                          </div>
                        </>
                      )}

                    </div>
                  ) : (

                    /* Assistant Message */
                    <div className="max-w-full text-[15px] leading-7">

                      {isThinking && item.id.startsWith("assistant-") ? (
                        <div className="flex items-center gap-2 py-2 text-sm text-[#888]">
                          <span className="flex gap-1">
                            <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                            <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                            <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                          </span>
                        </div>
                      ) : (
                        <MarkdownRenderer content={item.content} />
                      )}

                      {/* Assistant Message Actions */}
                      {item.content && (
                        <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">

                          <button
                            type="button"
                            onClick={() =>
                              handleCopyMessage(
                                item.id,
                                item.content
                              )
                            }
                            className="rounded-md p-1.5 text-[#888] transition-colors hover:bg-[#f0f0f0] hover:text-[#333] dark:hover:bg-[#383838] dark:hover:text-white cursor-pointer"
                            title="Copy response"
                            aria-label="Copy assistant response"
                          >
                            {copiedMessageId === item.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                        </div>
                      )}

                    </div>
                  )}

                </div>
              ))}

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

            {isSending ? (
              <button
                type="button"
                onClick={() =>
                  abortControllerRef.current?.abort()
                }
                className="
                  mb-0.5 flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-full bg-[#3685f4] text-white
                  transition-colors hover:bg-blue-600
                  dark:bg-sky-500 dark:text-white
                  dark:hover:bg-sky-400
                "
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="h-3 w-3 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  !message.trim() ||
                  !isLoaded ||
                  !isSignedIn
                }
                className="
                  mb-0.5 flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-full bg-[#3685f4] text-white
                  transition-colors hover:bg-blue-600
                  disabled:cursor-not-allowed disabled:opacity-40
                  dark:bg-sky-500 dark:text-white
                  dark:hover:bg-sky-400
                "
                aria-label="Send message"
                title="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}

          </form>

          <p className="mt-3 text-center text-[11px] text-[#999]">
            Growstack AI can make mistakes. Verify important information.
          </p>

        </div>
      </div>
    </main>
  );
}
