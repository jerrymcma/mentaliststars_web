import { Hono } from "hono";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import { ExperienceCapture } from "./services/experienceCapture";
import { KnowledgeBuilder } from "./services/knowledgeBuilder";
import { EnhancedChat } from "./services/enhancedChat";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Env {
  OPENROUTER_API_KEY: string;
  DB: D1Database; // Cloudflare D1 database
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use("/api/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Health check
app.get("/api/health", (c) => {
  return c.json({ 
    status: "ok", 
    service: "mentalist-ai-backend-enhanced",
    features: ["learning", "memory", "experience_tracking"]
  });
});

// Enhanced chat endpoint with learning
app.post("/api/chat/enhanced", async (c) => {
  const apiKey = c.env.OPENROUTER_API_KEY;
  const db = c.env.DB;

  if (!apiKey || !db) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  try {
    const body = await c.req.json();
    const messages: ChatMessage[] = body.messages || [];
    const mentalistId: string = body.mentalistId || "oz";
    const userId: string = body.userId || "anonymous";
    const baseSystemPrompt: string = body.systemPrompt || "";
    const baseKnowledgeBase: string = body.knowledgeBase || "";

    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "Invalid request: messages array required" }, 400);
    }

    // Initialize services
    const knowledgeBuilder = new KnowledgeBuilder(db);
    const enhancedChat = new EnhancedChat(db, knowledgeBuilder, apiKey);

    // Get or create session
    const sessionId = await enhancedChat.getOrCreateSession(userId, mentalistId);

    // Build enhanced context with learning
    const enhancedPrompt = await enhancedChat.buildEnhancedContext(
      mentalistId,
      messages[messages.length - 1].content,
      baseSystemPrompt,
      baseKnowledgeBase
    );

    // Save user message
    await enhancedChat.saveMessage(sessionId, 'user', messages[messages.length - 1].content);

    // Prepare messages for AI
    const fullMessages: ChatMessage[] = [
      { role: "system", content: enhancedPrompt },
      ...messages,
    ];

    // Call AI
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": c.req.header("Referer") || "https://mentalist-stars.app",
        "X-Title": "Mentalist Stars AI",
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
      console.error("[Enhanced AI] OpenRouter error:", response.status, errorText);
      return c.json({ error: `AI service error: ${response.status}` }, response.status);
    }

    // Stream response and collect for saving
    let fullResponse = "";

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

            // Extract content for saving
            if (trimmed !== "data: [DONE]") {
              try {
                const data = JSON.parse(trimmed.substring(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }

            // Forward to client
            await stream.write(line + "\n\n");
          }
        }

        // Save assistant response
        if (fullResponse) {
          await enhancedChat.saveMessage(sessionId, 'assistant', fullResponse);
        }

        await stream.write("data: [DONE]\n\n");
      } catch (error: any) {
        console.error("[Enhanced AI] Stream error:", error.message);
        await stream.write(`data: {"error": "${error.message}"}\n\n`);
      }
    });

  } catch (error: any) {
    console.error("[Enhanced AI] Request error:", error.message);
    return c.json({ error: "Failed to process request" }, 500);
  }
});

// End session and capture experience
app.post("/api/session/end", async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.OPENROUTER_API_KEY;

  if (!db || !apiKey) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  try {
    const body = await c.req.json();
    const sessionId: string = body.sessionId;
    const mentalistId: string = body.mentalistId;
    const userId: string = body.userId;

    if (!sessionId || !mentalistId || !userId) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Initialize services
    const experienceCapture = new ExperienceCapture(db, apiKey);
    const enhancedChat = new EnhancedChat(db, new KnowledgeBuilder(db), apiKey);

    // Get session messages
    const messages = await enhancedChat.getSessionMessages(sessionId);

    if (messages.length === 0) {
      return c.json({ error: "No messages in session" }, 400);
    }

    // Get session duration
    const session = await db.prepare(
      'SELECT start_time FROM chat_sessions WHERE id = ?'
    ).bind(sessionId).first();

    const durationSeconds = session 
      ? Math.floor(Date.now() / 1000) - (session.start_time as number)
      : 0;

    // Analyze conversation
    const analysis = await experienceCapture.analyzeConversation(mentalistId, messages);

    // Capture experience
    const experience = await experienceCapture.captureExperience(
      mentalistId,
      userId,
      sessionId,
      analysis,
      messages,
      durationSeconds
    );

    // End session
    await enhancedChat.endSession(sessionId);

    return c.json({ 
      success: true, 
      experience: {
        id: experience.id,
        reaction: experience.userReaction,
        trickPerformed: experience.trickPerformed,
        lessonLearned: experience.lessonLearned
      }
    });

  } catch (error: any) {
    console.error("[Session End] Error:", error.message);
    return c.json({ error: "Failed to end session" }, 500);
  }
});

// Get mentalist dashboard
app.get("/api/mentalist/:id/dashboard", async (c) => {
  const db = c.env.DB;
  const mentalistId = c.req.param("id");

  if (!db) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  try {
    const knowledgeBuilder = new KnowledgeBuilder(db);
    const summary = await knowledgeBuilder.getLearningSummary(mentalistId);

    const mentalist = await db.prepare(
      'SELECT * FROM mentalists WHERE id = ?'
    ).bind(mentalistId).first();

    return c.json({
      mentalist: mentalist || null,
      summary
    });

  } catch (error: any) {
    console.error("[Dashboard] Error:", error.message);
    return c.json({ error: "Failed to get dashboard" }, 500);
  }
});

// Get mentalist performance metrics
app.get("/api/mentalist/:id/metrics", async (c) => {
  const db = c.env.DB;
  const mentalistId = c.req.param("id");

  if (!db) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  try {
    const { results: metrics } = await db.prepare(`
      SELECT * FROM performance_metrics
      WHERE mentalist_id = ?
      ORDER BY success_rate DESC
    `).bind(mentalistId).all();

    return c.json({ metrics: metrics || [] });

  } catch (error: any) {
    console.error("[Metrics] Error:", error.message);
    return c.json({ error: "Failed to get metrics" }, 500);
  }
});

// Initialize mentalist in database
app.post("/api/mentalist/init", async (c) => {
  const db = c.env.DB;

  if (!db) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  try {
    const body = await c.req.json();
    const { id, name, title, tagline, avatarUrl, systemPrompt, knowledgeBase } = body;

    // Check if exists
    const existing = await db.prepare('SELECT id FROM mentalists WHERE id = ?').bind(id).first();

    if (existing) {
      return c.json({ message: "Mentalist already exists", id });
    }

    // Insert new mentalist
    await db.prepare(`
      INSERT INTO mentalists (
        id, name, title, tagline, avatar_url, system_prompt, knowledge_base,
        experience_level, total_performances, successful_tricks,
        learning_enabled, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, '[]', 1, ?)
    `).bind(
      id, name, title, tagline, avatarUrl, systemPrompt, knowledgeBase || '',
      Math.floor(Date.now() / 1000)
    ).run();

    return c.json({ success: true, id });

  } catch (error: any) {
    console.error("[Init Mentalist] Error:", error.message);
    return c.json({ error: "Failed to initialize mentalist" }, 500);
  }
});

export default app;
