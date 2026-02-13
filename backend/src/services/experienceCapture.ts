import { ConversationAnalysis, MentalistExperience, ChatMessage, PerformanceMetrics } from '../../../src/types/mentalist';

interface AIAnalysisResponse {
  trick_performed?: string;
  user_sentiment: number;
  key_moments: string[];
  mentalist_success: boolean;
  lesson_learned?: string;
  what_worked: string[];
  what_didnt_work: string[];
  suggested_improvements: string[];
}

export class ExperienceCapture {
  constructor(
    private db: D1Database,
    private openRouterKey: string
  ) {}

  /**
   * Analyze a completed conversation using AI
   */
  async analyzeConversation(
    mentalistId: string,
    messages: ChatMessage[]
  ): Promise<ConversationAnalysis> {

    // Prepare conversation for analysis
    const conversationText = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const analysisPrompt = `Analyze this mentalism performance conversation. Provide a structured analysis:

CONVERSATION:
${conversationText}

Analyze and respond in JSON format with:
{
  "trick_performed": "name of main trick or technique used (or 'general_interaction')",
  "user_sentiment": number from -1 (very negative) to 1 (very positive),
  "key_moments": ["moment1", "moment2"],
  "mentalist_success": true/false,
  "lesson_learned": "key lesson from this interaction",
  "what_worked": ["thing1", "thing2"],
  "what_didnt_work": ["thing1", "thing2"],
  "suggested_improvements": ["improvement1", "improvement2"]
}`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert at analyzing mentalist performances. Respond only with valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json();
      const analysis: AIAnalysisResponse = JSON.parse(data.choices[0].message.content);

      return {
        trickPerformed: analysis.trick_performed,
        userSentiment: analysis.user_sentiment,
        keyMoments: analysis.key_moments,
        mentalistSuccess: analysis.mentalist_success,
        lessonLearned: analysis.lesson_learned,
        whatWorked: analysis.what_worked,
        whatDidntWork: analysis.what_didnt_work,
        suggestedImprovements: analysis.suggested_improvements
      };

    } catch (error) {
      console.error('Error analyzing conversation:', error);
      // Fallback simple analysis
      return this.simpleAnalysis(messages);
    }
  }

  /**
   * Simple fallback analysis without AI
   */
  private simpleAnalysis(messages: ChatMessage[]): ConversationAnalysis {
    const userMessages = messages.filter(m => m.role === 'user');
    const hasPositiveWords = userMessages.some(m => 
      /amazing|wow|incredible|unbelievable|awesome|cool/i.test(m.content)
    );

    return {
      trickPerformed: 'general_interaction',
      userSentiment: hasPositiveWords ? 0.7 : 0.5,
      keyMoments: ['Interaction completed'],
      mentalistSuccess: hasPositiveWords,
      lessonLearned: 'Standard interaction',
      whatWorked: ['Maintained character'],
      whatDidntWork: [],
      suggestedImprovements: []
    };
  }

  /**
   * Capture and store an experience
   */
  async captureExperience(
    mentalistId: string,
    userId: string,
    sessionId: string,
    analysis: ConversationAnalysis,
    messages: ChatMessage[],
    durationSeconds: number
  ): Promise<MentalistExperience> {

    const experienceId = this.generateId();
    const timestamp = Date.now();

    const experience: MentalistExperience = {
      id: experienceId,
      mentalistId,
      userId,
      sessionId,
      timestamp: new Date(timestamp),
      conversationSummary: this.summarizeConversation(messages),
      trickPerformed: analysis.trickPerformed || 'general_interaction',
      userReaction: this.mapSentimentToReaction(analysis.userSentiment),
      userSentiment: analysis.userSentiment,
      whatWorked: analysis.whatWorked.join('; '),
      whatDidntWork: analysis.whatDidntWork.join('; '),
      lessonLearned: analysis.lessonLearned || '',
      messageCount: messages.length,
      durationSeconds,
      context: analysis.keyMoments.join('; ')
    };

    // Store in database
    await this.db.prepare(`
      INSERT INTO experiences (
        id, mentalist_id, user_id, session_id, timestamp,
        conversation_summary, trick_performed, user_reaction,
        user_sentiment, what_worked, what_didnt_work,
        lesson_learned, message_count, duration_seconds, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      experience.id,
      experience.mentalistId,
      experience.userId,
      experience.sessionId,
      Math.floor(timestamp / 1000),
      experience.conversationSummary,
      experience.trickPerformed,
      experience.userReaction,
      experience.userSentiment,
      experience.whatWorked,
      experience.whatDidntWork || '',
      experience.lessonLearned,
      experience.messageCount,
      experience.durationSeconds,
      experience.context
    ).run();

    // Update mentalist stats
    await this.updateMentalistStats(mentalistId, experience);

    // Update performance metrics
    await this.updateTrickMetrics(mentalistId, experience);

    return experience;
  }

  /**
   * Update mentalist statistics
   */
  private async updateMentalistStats(
    mentalistId: string,
    experience: MentalistExperience
  ): Promise<void> {

    const expGain = this.calculateExpGain(experience);

    // Increment performances and experience
    await this.db.prepare(`
      UPDATE mentalists 
      SET total_performances = total_performances + 1,
          experience_level = experience_level + ?,
          last_performance = ?
      WHERE id = ?
    `).bind(expGain, Math.floor(Date.now() / 1000), mentalistId).run();

    // If successful, add to successful tricks
    if (experience.userReaction === 'amazed' || experience.userReaction === 'engaged') {
      const mentalist = await this.db.prepare(
        'SELECT successful_tricks FROM mentalists WHERE id = ?'
      ).bind(mentalistId).first();

      if (mentalist) {
        const tricks = JSON.parse(mentalist.successful_tricks as string || '[]');
        tricks.push(experience.trickPerformed);

        await this.db.prepare(`
          UPDATE mentalists SET successful_tricks = ? WHERE id = ?
        `).bind(JSON.stringify(tricks), mentalistId).run();
      }
    }
  }

  /**
   * Update trick-specific metrics
   */
  private async updateTrickMetrics(
    mentalistId: string,
    experience: MentalistExperience
  ): Promise<void> {

    const metricId = `${mentalistId}_${experience.trickPerformed}`;

    // Check if metric exists
    const existing = await this.db.prepare(`
      SELECT * FROM performance_metrics 
      WHERE mentalist_id = ? AND trick_name = ?
    `).bind(mentalistId, experience.trickPerformed).first();

    const isSuccess = experience.userReaction === 'amazed' || experience.userReaction === 'engaged';
    const rating = this.mapReactionToRating(experience.userReaction);

    if (existing) {
      // Update existing
      const newTotal = (existing.total_attempts as number) + 1;
      const newSuccessCount = (existing.success_count as number) + (isSuccess ? 1 : 0);
      const newSuccessRate = newSuccessCount / newTotal;
      const newAvgRating = (
        ((existing.average_user_rating as number) * (existing.total_attempts as number)) + rating
      ) / newTotal;

      await this.db.prepare(`
        UPDATE performance_metrics 
        SET total_attempts = ?,
            success_count = ?,
            success_rate = ?,
            average_user_rating = ?,
            last_updated = ?
        WHERE id = ?
      `).bind(
        newTotal,
        newSuccessCount,
        newSuccessRate,
        newAvgRating,
        Math.floor(Date.now() / 1000),
        existing.id
      ).run();

    } else {
      // Create new metric
      await this.db.prepare(`
        INSERT INTO performance_metrics (
          id, mentalist_id, trick_name, total_attempts,
          success_count, success_rate, average_user_rating,
          best_contexts, common_failures, refinements, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        metricId,
        mentalistId,
        experience.trickPerformed,
        1,
        isSuccess ? 1 : 0,
        isSuccess ? 1.0 : 0.0,
        rating,
        '[]',
        '[]',
        '[]',
        Math.floor(Date.now() / 1000)
      ).run();
    }
  }

  /**
   * Calculate experience points gained
   */
  private calculateExpGain(experience: MentalistExperience): number {
    let exp = 10; // Base experience

    if (experience.userReaction === 'amazed') exp += 20;
    else if (experience.userReaction === 'engaged') exp += 10;
    else if (experience.userReaction === 'neutral') exp += 5;

    if (experience.lessonLearned) exp += 5;
    if (experience.messageCount > 10) exp += Math.min(experience.messageCount - 10, 10);

    return exp;
  }

  /**
   * Map sentiment to reaction category
   */
  private mapSentimentToReaction(sentiment: number): MentalistExperience['userReaction'] {
    if (sentiment >= 0.7) return 'amazed';
    if (sentiment >= 0.3) return 'engaged';
    if (sentiment >= -0.3) return 'neutral';
    if (sentiment >= -0.7) return 'skeptical';
    return 'confused';
  }

  /**
   * Map reaction to numeric rating
   */
  private mapReactionToRating(reaction: string): number {
    const ratings: Record<string, number> = {
      'amazed': 5.0,
      'engaged': 4.0,
      'neutral': 3.0,
      'skeptical': 2.0,
      'confused': 1.0
    };
    return ratings[reaction] || 3.0;
  }

  /**
   * Summarize conversation
   */
  private summarizeConversation(messages: ChatMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    return `${userMessages.length} user messages, ${assistantMessages.length} responses. ` +
           `Duration: ${messages.length} total exchanges.`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
