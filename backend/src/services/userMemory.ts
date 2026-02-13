/**
 * User Memory Service
 * 
 * Manages per-user conversation history and interactions.
 * Enables mentalists to "remember" past conversations with specific users.
 */

export class UserMemoryService {
  constructor(private db: D1Database) {}

  /**
   * Get user's conversation history with a specific mentalist
   */
  async getUserHistory(
    userId: string,
    mentalistId: string,
    limit: number = 5
  ): Promise<{
    totalConversations: number;
    lastInteraction: Date | null;
    recentTopics: string[];
    favoriteTopics: string[];
    sentimentTrend: number;
    memorableExperiences: Array<{
      date: Date;
      summary: string;
      whatWorked: string;
      reaction: string;
    }>;
  }> {

    // Get total conversations
    const totalResult = await this.db.prepare(`
      SELECT COUNT(*) as count
      FROM experiences
      WHERE user_id = ? AND mentalist_id = ?
    `).bind(userId, mentalistId).first();

    const totalConversations = totalResult?.count as number || 0;

    if (totalConversations === 0) {
      return {
        totalConversations: 0,
        lastInteraction: null,
        recentTopics: [],
        favoriteTopics: [],
        sentimentTrend: 0,
        memorableExperiences: []
      };
    }

    // Get recent experiences
    const { results: recentExperiences } = await this.db.prepare(`
      SELECT *
      FROM experiences
      WHERE user_id = ? AND mentalist_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(userId, mentalistId, limit).all();

    if (!recentExperiences || recentExperiences.length === 0) {
      return {
        totalConversations,
        lastInteraction: null,
        recentTopics: [],
        favoriteTopics: [],
        sentimentTrend: 0,
        memorableExperiences: []
      };
    }

    // Process history
    const lastInteraction = new Date((recentExperiences[0] as any).timestamp * 1000);

    const recentTopics = recentExperiences
      .map((exp: any) => exp.trick_performed)
      .filter((topic, index, self) => self.indexOf(topic) === index)
      .slice(0, 3);

    const sentimentTrend = recentExperiences
      .reduce((sum: number, exp: any) => sum + (exp.user_sentiment || 0), 0) / recentExperiences.length;

    const memorableExperiences = recentExperiences
      .filter((exp: any) => exp.user_reaction === 'amazed' || exp.lesson_learned)
      .map((exp: any) => ({
        date: new Date(exp.timestamp * 1000),
        summary: exp.conversation_summary,
        whatWorked: exp.what_worked,
        reaction: exp.user_reaction
      }));

    // Get favorite topics (most frequently discussed)
    const { results: topicResults } = await this.db.prepare(`
      SELECT trick_performed, COUNT(*) as count
      FROM experiences
      WHERE user_id = ? AND mentalist_id = ?
      GROUP BY trick_performed
      ORDER BY count DESC
      LIMIT 3
    `).bind(userId, mentalistId).all();

    const favoriteTopics = topicResults
      ? topicResults.map((row: any) => row.trick_performed)
      : [];

    return {
      totalConversations,
      lastInteraction,
      recentTopics,
      favoriteTopics,
      sentimentTrend,
      memorableExperiences
    };
  }

  /**
   * Generate a memory summary for context
   */
  async generateMemorySummary(
    userId: string,
    mentalistId: string
  ): Promise<string> {

    const history = await this.getUserHistory(userId, mentalistId, 5);

    if (history.totalConversations === 0) {
      return "## NEW USER\nThis is your first interaction with this person. Make a great first impression!";
    }

    const daysSinceLastInteraction = history.lastInteraction
      ? Math.floor((Date.now() - history.lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let memorySummary = `## REMEMBER THIS USER\n\n`;
    memorySummary += `**Total conversations:** ${history.totalConversations}\n`;
    memorySummary += `**Last interaction:** ${daysSinceLastInteraction === 0 ? 'Today' : `${daysSinceLastInteraction} days ago`}\n`;

    if (history.favoriteTopics.length > 0) {
      memorySummary += `**Their favorite topics:** ${history.favoriteTopics.join(', ')}\n`;
    }

    memorySummary += `**Overall sentiment:** ${this.sentimentToText(history.sentimentTrend)}\n\n`;

    if (history.memorableExperiences.length > 0) {
      memorySummary += `### Memorable Moments Together:\n`;
      history.memorableExperiences.slice(0, 3).forEach((exp, i) => {
        const daysAgo = Math.floor((Date.now() - exp.date.getTime()) / (1000 * 60 * 60 * 24));
        memorySummary += `${i + 1}. **${daysAgo === 0 ? 'Earlier today' : `${daysAgo} days ago`}:** ${exp.whatWorked} (${exp.reaction})\n`;
      });
    }

    memorySummary += `\n**IMPORTANT:** Reference past interactions naturally. They'll be amazed you "remember" them!`;

    return memorySummary;
  }

  /**
   * Convert sentiment score to text
   */
  private sentimentToText(sentiment: number): string {
    if (sentiment >= 0.7) return "Very positive - they love your performances!";
    if (sentiment >= 0.3) return "Positive - engaged and interested";
    if (sentiment >= -0.3) return "Neutral - curious but reserved";
    if (sentiment >= -0.7) return "Skeptical - needs convincing";
    return "Very skeptical - work to win them over";
  }

  /**
   * Check if user is returning
   */
  async isReturningUser(userId: string, mentalistId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count
      FROM experiences
      WHERE user_id = ? AND mentalist_id = ?
    `).bind(userId, mentalistId).first();

    return (result?.count as number || 0) > 0;
  }

  /**
   * Get quick stats about a user
   */
  async getUserStats(userId: string, mentalistId: string): Promise<{
    totalSessions: number;
    averageRating: number;
    lastSeen: string;
    returningUser: boolean;
  }> {

    const history = await this.getUserHistory(userId, mentalistId, 1);

    return {
      totalSessions: history.totalConversations,
      averageRating: history.sentimentTrend * 5, // Convert to 0-5 scale
      lastSeen: history.lastInteraction?.toISOString() || 'Never',
      returningUser: history.totalConversations > 0
    };
  }
}
