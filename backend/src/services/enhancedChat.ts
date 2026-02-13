import { ChatMessage } from '../../../src/types/mentalist';
import { KnowledgeBuilder } from './knowledgeBuilder';

export class EnhancedChat {
  constructor(
    private db: D1Database,
    private knowledgeBuilder: KnowledgeBuilder,
    private openRouterKey: string
  ) {}

  /**
   * Build enhanced context with learning
   */
  async buildEnhancedContext(
    mentalistId: string,
    currentMessage: string,
    baseSystemPrompt: string,
    baseKnowledgeBase: string
  ): Promise<string> {

    // Get mentalist info
    const mentalist = await this.db.prepare(
      'SELECT * FROM mentalists WHERE id = ?'
    ).bind(mentalistId).first();

    if (!mentalist) {
      return baseSystemPrompt + '\n\n' + baseKnowledgeBase;
    }

    // Get learned knowledge
    const learnedKnowledge = await this.knowledgeBuilder.synthesizeLearnings(
      mentalistId,
      100
    );

    // Get top performing tricks
    const { results: topMetrics } = await this.db.prepare(`
      SELECT trick_name, success_rate, total_attempts, average_user_rating
      FROM performance_metrics
      WHERE mentalist_id = ?
      ORDER BY success_rate DESC, total_attempts DESC
      LIMIT 5
    `).bind(mentalistId).all();

    const topTricksText = topMetrics && topMetrics.length > 0
      ? topMetrics.map((m: any) => 
          `- ${m.trick_name}: ${(m.success_rate * 100).toFixed(1)}% success (${m.total_attempts} uses, ${m.average_user_rating.toFixed(1)}★ avg)`
        ).join('\n')
      : '- Building performance history...';

    // Get recent successful experiences for context
    const { results: recentSuccesses } = await this.db.prepare(`
      SELECT conversation_summary, trick_performed, what_worked, lesson_learned
      FROM experiences
      WHERE mentalist_id = ? AND (user_reaction = 'amazed' OR user_reaction = 'engaged')
      ORDER BY timestamp DESC
      LIMIT 3
    `).bind(mentalistId).all();

    const recentSuccessesText = recentSuccesses && recentSuccesses.length > 0
      ? recentSuccesses.map((exp: any, i: number) => `
### Success ${i + 1}:
Trick: ${exp.trick_performed}
What worked: ${exp.what_worked}
Lesson: ${exp.lesson_learned || 'Effective execution'}
`).join('\n')
      : '### Building experience base...';

    // Build enhanced prompt
    const enhancedPrompt = `
${baseSystemPrompt}

## YOUR FOUNDATION KNOWLEDGE:
${baseKnowledgeBase}

## YOUR EXPERIENCE (${mentalist.total_performances} performances, Level ${mentalist.experience_level}):
${learnedKnowledge}

## YOUR STRONGEST TECHNIQUES:
${topTricksText}

## RECENT SUCCESSFUL MOMENTS:
${recentSuccessesText}

**IMPORTANT**: Draw on your accumulated experience. You've performed ${mentalist.total_performances} times and learned what works. Use techniques you've proven successful. Adapt based on patterns you've discovered. You're not just following a script—you're a seasoned performer who knows their craft.

${mentalist.specialty_developing ? `**Specialty Developing**: ${mentalist.specialty_developing}` : ''}
`;

    return enhancedPrompt;
  }

  /**
   * Start or resume a session
   */
  async getOrCreateSession(
    userId: string,
    mentalistId: string
  ): Promise<string> {

    // Check for active session
    const activeSession = await this.db.prepare(`
      SELECT id FROM chat_sessions
      WHERE user_id = ? AND mentalist_id = ? AND is_active = 1
      ORDER BY start_time DESC
      LIMIT 1
    `).bind(userId, mentalistId).first();

    if (activeSession) {
      return activeSession.id as string;
    }

    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.prepare(`
      INSERT INTO chat_sessions (id, user_id, mentalist_id, start_time, is_active, message_count)
      VALUES (?, ?, ?, ?, 1, 0)
    `).bind(sessionId, userId, mentalistId, Math.floor(Date.now() / 1000)).run();

    return sessionId;
  }

  /**
   * Save message to session
   */
  async saveMessage(
    sessionId: string,
    role: string,
    content: string
  ): Promise<void> {

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.prepare(`
      INSERT INTO session_messages (id, session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).bind(messageId, sessionId, role, content, Math.floor(Date.now() / 1000)).run();

    // Increment message count
    await this.db.prepare(`
      UPDATE chat_sessions SET message_count = message_count + 1 WHERE id = ?
    `).bind(sessionId).run();
  }

  /**
   * Get session messages
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const { results } = await this.db.prepare(`
      SELECT role, content, timestamp
      FROM session_messages
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `).bind(sessionId).all();

    if (!results) return [];

    return results.map((m: any) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: new Date(m.timestamp * 1000)
    }));
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE chat_sessions
      SET is_active = 0, end_time = ?
      WHERE id = ?
    `).bind(Math.floor(Date.now() / 1000), sessionId).run();
  }
}
