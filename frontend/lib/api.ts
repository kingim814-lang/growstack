
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ==============================
// Types
// ==============================

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type SendMessageResponse = {
  userMessage: Message;
  assistantMessage: Message;
};

export type EditMessageResponse = {
  message: string;
  userMessage: Message;
  assistantMessage: Message;
};

type ConversationsResponse = {
  conversations: Conversation[];
};

type CreateConversationResponse = {
  message: string;
  conversation: Conversation;
};

type GetConversationResponse = {
  conversation: Conversation & {
    messages: Message[];
  };
};

// ==============================
// Common API Request
// ==============================
async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error("API URL is missing");
  }

  if (!token) {
    throw new Error("Authentication token is missing");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("API Error:", response.status, data);

    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data as T;
}

// ==============================
// Create Conversation
// ==============================

export async function createConversation(token: string) {
  const data = await apiRequest<CreateConversationResponse>(
    "/api/conversations",
    token,
    {
      method: "POST",
    }
  );

  return data.conversation;
}

// ==============================
// Get Conversations
// ==============================

export async function getConversations(token: string) {
  const data = await apiRequest<ConversationsResponse>(
    "/api/conversations",
    token
  );

  return data.conversations;
}

// ==============================
// Get Single Conversation
// ==============================

export async function getConversation(
  token: string,
  conversationId: string
) {
  const data = await apiRequest<GetConversationResponse>(
    `/api/conversations/${conversationId}`,
    token
  );

  return data.conversation;
}

// ==============================
// Send Message
// ==============================
export async function sendMessage(
  token: string,
  conversationId: string,
  content: string,
  signal?: AbortSignal
): Promise<Message> {
  if (!API_URL) {
    throw new Error("API URL is missing");
  }

  if (!token) {
    throw new Error("Authentication token is missing");
  }

  const response = await fetch(
    `${API_URL}/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
      ...(signal ? { signal } : {}),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "Failed to send message");
  }

  const data: {
    userMessage: Message;
    assistantMessage: Message;
  } = await response.json();

  return data.assistantMessage;
}

// ==============================
// Edit Message
// ==============================

export async function editMessage(
  token: string,
  conversationId: string,
  messageId: string,
  content: string,
  signal?: AbortSignal
): Promise<EditMessageResponse> {
  return apiRequest<EditMessageResponse>(
    `/api/conversations/${conversationId}/messages/${messageId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
      ...(signal ? { signal } : {}),
    }
  );
}


// ==============================
// Delete Conversation
// ==============================

export function deleteConversation(
  token: string,
  conversationId: string
) {
  return apiRequest<{ message: string }>(
    `/api/conversations/${conversationId}`,
    token,
    {
      method: "DELETE",
    }
  );
}
