import { getMentalist, getSelectedMentalistId } from "./mentalists";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const BACKEND_API_URL = "https://mentalist-stars-backend.mentalist-stars.workers.dev";

export function getApiKey(): string {
  return localStorage.getItem("mentalist_api_key") || "";
}

export function setApiKey(key: string): void {
  localStorage.setItem("mentalist_api_key", key);
}

export function removeApiKey(): void {
  localStorage.removeItem("mentalist_api_key");
}

export function hasBackendAvailable(): boolean {
  return !!BACKEND_API_URL;
}

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  mentalistId?: string
): Promise<void> {
  // Use backend if explicitly configured via environment variable
  if (BACKEND_API_URL) {
    return streamChatBackend(messages, onChunk, onDone, onError, mentalistId);
  }

  // Otherwise use client-side with default or user-provided API key
  const apiKey = getApiKey();
  if (!apiKey) {
    onError("Please configure your OpenRouter API key in settings.");
    return;
  }

  const selectedId = mentalistId || getSelectedMentalistId();
  const mentalist = getMentalist(selectedId);

  const fullMessages: ChatMessage[] = [
    { role: "system", content: mentalist.systemPrompt },
    ...messages,
  ];

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Oz Pearlman - The Mentalist AI",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: fullMessages,
        stream: true,
        temperature: 0.9,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      if (response.status === 401 || response.status === 403) {
        onError("Invalid API key. Please check your OpenRouter API key in settings.");
      } else {
        onError(`API error: ${response.status}. Please try again.`);
      }
      console.error("[AI] API error:", errorData);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("Failed to establish streaming connection.");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    onDone();
  } catch (error: any) {
    console.error("[AI] Chat error:", error.message);
    onError("Connection failed. Please check your internet and try again.");
  }
}

async function streamChatBackend(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  mentalistId?: string
): Promise<void> {
  try {
    const selectedId = mentalistId || getSelectedMentalistId();
    const mentalist = getMentalist(selectedId);

    const fullMessages: ChatMessage[] = [
      { role: "system", content: mentalist.systemPrompt },
      ...messages,
    ];

    const response = await fetch(`${BACKEND_API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: fullMessages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      onError(errorData.error || `Backend error: ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("Failed to establish streaming connection.");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    onDone();
  } catch (error: any) {
    console.error("[AI Backend] Chat error:", error.message);
    onError("Backend connection failed. Please check your network and try again.");
  }
}
