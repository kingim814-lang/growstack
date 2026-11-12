
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
    finish_reason?: "stop" | "length" | "tool_calls" | string | null;
  }>;
};

const FORMATTING_INSTRUCTIONS = `
  You are Growstack, a helpful AI assistant.

  MARKDOWN FORMATTING RULES:

  1. Use clean, properly structured Markdown.
  2. Keep numbered list content on the same line as its number.
  3. Never create empty numbered or bullet list items.
  4. Use proper indentation for code blocks inside lists.
  5. Keep related explanations and examples grouped together.
  6. Use headings to organize long responses.
  7. Use Markdown tables when comparing information.
  8. Use fenced code blocks with language identifiers.
  9. Avoid unnecessary blank lines.
  10. Keep responses readable and well organized.
`;

const MAX_COMPLETION_TOKENS = 2048;
const MAX_CONTINUATIONS = 2;

export async function generateAIResponse(
  messages: ChatMessage[],
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;

  if (!apiKey) {
    throw new Error("Groq API key is missing");
  }

  const existingSystemMessage = messages.find(
    (message) => message.role === "system"
  );

  const formattedMessages: ChatMessage[] = existingSystemMessage
    ? messages.map((message) =>
        message === existingSystemMessage
          ? {
              ...message,
              content: `${message.content}\n\n${FORMATTING_INSTRUCTIONS}`,
            }
          : message
      )
    : [
        {
          role: "system",
          content: FORMATTING_INSTRUCTIONS,
        },
        ...messages,
      ];

  // Messages used for the initial request and continuation requests.
  const conversationMessages = [...formattedMessages];

  let completeContent = "";
  let continuationCount = 0;

  while (true) {
    signal?.throwIfAborted();

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: conversationMessages,
          temperature: 0.7,
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          stream: false,
        }),
        ...(signal ? { signal } : {}),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      throw new Error("Groq generation failed");
    }

    const result = (await response.json()) as GroqResponse;

    signal?.throwIfAborted();

    const choice = result.choices?.[0];
    const content = choice?.message?.content;
    const finishReason = choice?.finish_reason;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Assistant response is empty");
    }

    completeContent += content;

    // The model completed its response normally.
    if (finishReason !== "length") {
      signal?.throwIfAborted();
      return completeContent;
    }

    // Stop if the maximum number of continuations is reached.
    if (continuationCount >= MAX_CONTINUATIONS) {
      throw new Error(
        "Assistant response exceeded the maximum continuation limit."
      );
    }

    continuationCount++;

    // Add the partial assistant response to the conversation.
    conversationMessages.push({
      role: "assistant",
      content,
    });

    // Ask the model to continue from where it stopped.
    conversationMessages.push({
      role: "user",
      content:
        "Your previous response was cut off because it reached the output token limit. " +
        "Continue exactly where you stopped. Do not repeat or summarize the previous response. " +
        "Complete the remaining explanation and preserve the Markdown formatting.",
    });
  }
}

