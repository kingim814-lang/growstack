
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function generateAIResponse(
  messages: ChatMessage[]
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  if (!apiKey) {
    throw new Error("Groq API key is missing");
  }

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
        messages,
        temperature: 0.7,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Groq API error:", error);
    throw new Error("Groq generation failed");
  }

  const data = await response.json();

  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Groq returned an empty response");
  }

  return content;
}
