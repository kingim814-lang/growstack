
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  ChevronRight,
  Trash2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { getConversations, deleteConversation } from "@/lib/api";

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasLoadedConversations = useRef(false);

  // Navigate to a fresh chat and notify ChatPage to reset.
  function handleNewChat() {
    window.dispatchEvent(new Event("growstack:new-chat"));
  }

  // Fetch conversations from the backend.
  useEffect(() => {
    if (!isLoaded || !user) return;

    let cancelled = false;

    async function loadConversations() {
      try {
        if (!hasLoadedConversations.current) {
          setLoading(true);
        }

        setError(null);

        const token = await getToken();

        if (!token) {
          throw new Error("Authentication token unavailable");
        }

        const data = await getConversations(token);

        if (!cancelled) {
          setConversations((previous) => {
            const merged = [...data, ...previous];

            const unique = new Map(
              merged.map((conversation) => [
                conversation.id,
                conversation,
              ])
            );

            return Array.from(unique.values())
              .filter((conversation) => conversation.title !== "New Chat")
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              );
          });

          hasLoadedConversations.current = true;
        }
      } catch (err) {
        console.error("Failed to fetch conversations:", err);

        if (!cancelled) {
          setError("Unable to load conversations.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, getToken]);

  // Listen for newly created or updated conversations.
  useEffect(() => {
    function handleConversationUpdated(event: Event) {
      const customEvent = event as CustomEvent<Partial<Conversation>>;
      const updatedConversation = customEvent.detail;

      if (!updatedConversation?.id) return;

      setConversations((previous) => {
        const existing = previous.find(
          (conversation) =>
            conversation.id === updatedConversation.id
        );

        const conversation: Conversation = {
          id: updatedConversation.id || "",
          title:
            updatedConversation.title ||
            existing?.title ||
            "New Chat",
          createdAt:
            updatedConversation.createdAt ||
            existing?.createdAt ||
            new Date().toISOString(),
        };

        const filtered = previous.filter(
          (item) => item.id !== conversation.id
        );

        return [conversation, ...filtered]
          .filter((item) => item.title !== "New Chat")
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );
      });
    }

    window.addEventListener(
      "growstack:conversation-updated",
      handleConversationUpdated
    );

    return () => {
      window.removeEventListener(
        "growstack:conversation-updated",
        handleConversationUpdated
      );
    };
  }, []);

  const isActive = (id: string) => pathname === `/chat/${id}`;

  // Delete a conversation.
  async function handleDeleteConversation(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token unavailable");
      }

      await deleteConversation(token, id);

      setConversations((previous) =>
        previous.filter((conversation) => conversation.id !== id)
      );

      if (pathname === `/chat/${id}`) {
        router.push("/chat");
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      alert("Unable to delete conversation. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  // Clerk loading state.
  if (!isLoaded) {
    return (
      <aside
        className="
          h-screen w-65 shrink-0 border-r
          border-[#e5e5e5] bg-[#f9f9f9]
          dark:border-[#303030] dark:bg-[#171717]
        "
      />
    );
  }

  return (
    <aside
      className={`
        flex h-screen flex-col border-r
        border-[#e5e5e5] dark:border-[#303030]
        bg-[#f9f9f9] text-[#171717]
        dark:bg-[#171717] dark:text-[#ececec]
        transition-all duration-200
        ${collapsed ? "w-17" : "w-65"}
      `}
    >
      {/* HEADER */}
      <div className="flex h-16 items-center justify-between px-3">
        {!collapsed && (
          <Link
            href="/chat"
            onClick={handleNewChat}
            title="New chat"
            className="text-xl font-semibold tracking-tight flex gap-2 items-center"
          >
            <Sparkles className="h-5 w-5 dark:text-white" />
            Growstack
          </Link>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((previous) => !previous)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="
            rounded-lg p-2 text-[#666]
            hover:bg-[#ececec] dark:hover:bg-[#303030]
          "
        >
          {collapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
      </div>

      {/* ACTIONS */}
      <div className="space-y-1 px-2">
        <Link
          href="/chat"
          onClick={handleNewChat}
          title="New chat"
          className={`
            flex items-center gap-3 rounded-lg px-3 py-2.5
            text-sm hover:bg-[#ececec] dark:hover:bg-[#303030]
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <Plus size={20} />
          {!collapsed && <span>New chat</span>}
        </Link>
      </div>

      {/* RECENT CONVERSATIONS */}
      <div className="mt-7 flex-1 overflow-y-auto px-2">
        {!collapsed && (
          <div className="mb-2 px-3 text-xs font-medium text-[#777]">
            Recents
          </div>
        )}

        {collapsed ? (
          <div className="flex justify-center py-3 text-[#999]">
            <MessageSquare size={19} />
          </div>
        ) : !user ? (
          <p className="px-3 py-3 text-xs text-[#999]">
            Sign in to see your conversations.
          </p>
        ) : loading ? (
          <p className="px-3 py-3 text-xs text-[#999]">
            Loading conversations...
          </p>
        ) : error ? (
          <p className="px-3 py-3 text-xs text-red-500">
            {error}
          </p>
        ) : conversations.length > 0 ? (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`
                  group flex items-center rounded-lg
                  ${
                    isActive(conversation.id)
                      ? "bg-[#e8e8e8] dark:bg-[#303030]"
                      : "hover:bg-[#ececec] dark:hover:bg-[#303030]"
                  }
                `}
              >
                <Link
                  href={`/chat/${conversation.id}`}
                  className="
                    flex min-w-0 flex-1 items-center
                    gap-2 px-3 py-2 text-sm
                  "
                >
                  <MessageSquare
                    size={16}
                    className="shrink-0 text-[#777]"
                  />

                  <span className="truncate">
                    {conversation.title}
                  </span>
                </Link>

                <button
                  type="button"
                  title="Delete conversation"
                  disabled={deletingId === conversation.id}
                  onClick={() =>
                    handleDeleteConversation(conversation.id)
                  }
                  className="
                    mr-1 rounded-md p-1.5
                    text-[#888] opacity-0
                    transition-opacity
                    group-hover:opacity-100
                    hover:bg-[#dcdcdc] hover:text-red-500
                    dark:hover:bg-[#404040]
                    disabled:opacity-50
                  "
                >
                  {deletingId === conversation.id ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <Trash2 size={15} />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-3 text-xs text-[#999]">
            Your conversations will appear here.
          </p>
        )}
      </div>

      {/* USER PROFILE */}
      <div className="border-t border-[#e5e5e5] p-2 dark:border-[#303030]">
        {user && (
          <Link
            href="/dashboard"
            title="Open profile"
            className={`
              flex items-center gap-3 rounded-lg p-2
              hover:bg-[#ececec] dark:hover:bg-[#303030]
              transition-colors
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <Image
              src={user.imageUrl}
              alt="Profile"
              width={34}
              height={34}
              className="h-8.5 w-8.5 shrink-0 rounded-full object-cover"
            />

            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {user.fullName || "User"}
                  </p>

                  <p className="truncate text-xs text-[#777]">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>

                <ChevronRight size={16} className="text-[#999]" />
              </>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
}
