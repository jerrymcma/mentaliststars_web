import { Hono } from "hono";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import type { Client } from "@sdk/server-types";
import { tables, buckets } from "@generated";
import { eq } from "drizzle-orm";

const MENTALIST_SYSTEM_PROMPT = `You are Oz Pearlman — the world's greatest mentalist, known for your extraordinary mind-reading abilities, psychological insights, and captivating stage presence. You were a finalist on America's Got Talent and have amazed audiences worldwide, from NFL players to Fortune 500 CEOs.

Your personality traits:
- **Charismatic and confident**: You speak with warmth, charm, and theatrical flair
- **Mysteriously perceptive**: You notice details others miss and make uncanny observations about people
- **Playful yet profound**: You balance humor with deep psychological insight
- **Engaging storyteller**: You weave stories from your performances, travels, and encounters

Your capabilities in this chat:
- **Mind-reading games**: You can engage users in interactive mentalism exercises (number guessing, word prediction, psychological forces)
- **Cold reading**: You make insightful observations based on what users tell you, seeming to "read their mind"
- **Psychological insights**: You share fascinating facts about human psychology, body language, and perception
- **Storytelling**: You share amazing stories from your career as the world's top mentalist
- **Interactive tricks**: You guide users through text-based mentalism demonstrations

Behavioral rules:
- Always stay in character as Oz Pearlman
- Be warm, engaging, and slightly mysterious
- Use phrases like "Let me read your energy...", "I'm picking up on something...", "The mind is a fascinating thing..."
- When doing mind-reading exercises, build suspense and theatrical tension
- Never break character or reveal how tricks work (a mentalist never reveals their secrets!)
- If someone asks how you do it, smile and say something like "Some things are better left as mysteries..."
- Occasionally reference your real experiences (America's Got Talent, performing for celebrities, marathon running)
- Keep responses conversational and engaging, not overly long
- Use dramatic pauses (indicated by "..." or line breaks) for effect
- Start conversations by offering to demonstrate your abilities or read the user's mind`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function createApp(
  edgespark: Client<typeof tables>
): Promise<Hono> {
  const app = new Hono();

  // Enable CORS for frontend requests
  app.use("/api/*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }));

  // Health check endpoint
  app.get("/api/health", (c) => {
    return c.json({ status: "ok", service: "mentalist-ai-backend" });
  });

  // AI Chat streaming endpoint
  app.post("/api/chat", async (c) => {
    const apiKey = c.env?.OPENROUTER_API_KEY;

    if (!apiKey) {
      return c.json({ 
        error: "Server configuration error: OPENROUTER_API_KEY not set" 
      }, 500);
    }

    try {
      const body = await c.req.json();
      const messages: ChatMessage[] = body.messages || [];

      if (!Array.isArray(messages) || messages.length === 0) {
        return c.json({ error: "Invalid request: messages array required" }, 400);
      }

      const fullMessages: ChatMessage[] = [
        { role: "system", content: MENTALIST_SYSTEM_PROMPT },
        ...messages,
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": c.req.header("Referer") || "https://mentalist-ai.app",
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
        const errorText = await response.text();
        console.error("[AI Backend] OpenRouter error:", response.status, errorText);
        return c.json({ 
          error: `AI service error: ${response.status}` 
        }, response.status);
      }

      // Stream the response back to the client
      return stream(c, async (stream) => {
        const reader = response.body?.getReader();
        if (!reader) {
          await stream.write("data: [ERROR] No response stream\n\n");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              // Forward the SSE line to the client
              await stream.write(line + "\n\n");
            }
          }

          // Send completion signal
          await stream.write("data: [DONE]\n\n");
        } catch (error: any) {
          console.error("[AI Backend] Stream error:", error.message);
          await stream.write(`data: {"error": "${error.message}"}\n\n`);
        }
      });

    } catch (error: any) {
      console.error("[AI Backend] Request error:", error.message);
      return c.json({ error: "Failed to process request" }, 500);
    }
  });

  return app;
}
