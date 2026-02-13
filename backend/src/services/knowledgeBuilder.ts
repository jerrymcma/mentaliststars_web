import { MentalistExperience, LearningSummary } from '../../../src/types/mentalist';

interface TrickPattern {
  name: string;
  successRate: string;
  bestContexts: string[];
  keyInsight: string;
  timesPerformed: number;
}

interface Refinement {
  technique: string;
  improvement: string;
  experiences: number;
}

interface UserPreference {
  pattern: string;
  frequency: number;
  adaptation: string;
}

interface RecoveryStrategy {
  situation: string;
  strategy: string;
  effectiveness: number;
}

interface ContextualLearning {
  context: string;
  insight: string;
}

export class KnowledgeBuilder {
  constructor(private db: D1Database) {}

  /**
   * Generate learned knowledge from recent experiences
   */
  async synthesizeLearnings(
    mentalistId: string,
    experienceWindow: number = 100
  ): Promise<string> {

    // Fetch recent experiences
    const { results: recentExperiences } = await this.db.prepare(`
      SELECT * FROM experiences
      WHERE mentalist_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(mentalistId, experienceWindow).all();

    if (!recentExperiences || recentExperiences.length === 0) {
      return '## No learning experiences yet. This is your first performance!';
    }

    // Identify patterns
    const patterns = await this.identifyPatterns(recentExperiences as any[]);

    // Generate learned knowledge text
    const learnedKnowledge = `
## LEARNED FROM ${recentExperiences.length} PERFORMANCES:

### Most Successful Approaches:
${patterns.successfulTricks.map(t => `- **${t.name}**: ${t.successRate}% success rate (${t.timesPerformed} uses)
  Best contexts: ${t.bestContexts.join(', ')}
  Key insight: ${t.keyInsight}`).join('\n')}

### Refined Techniques:
${patterns.refinements.map(r => `- **${r.technique}**: ${r.improvement}
  Proven through ${r.experiences} similar situations`).join('\n')}

### User Preference Patterns:
${patterns.userPreferences.map(p => `- ${p.pattern} (observed in ${p.frequency}% of interactions)
  Adaptation: ${p.adaptation}`).join('\n')}

### Recovery Strategies (when improvising):
${patterns.recoveryStrategies.map(s => `- **${s.situation}**: ${s.strategy}
  Effectiveness: ${s.effectiveness}%`).join('\n')}

### Contextual Insights:
${patterns.contextualLearnings.map(c => `- ${c.context}: ${c.insight}`).join('\n')}

**You've performed ${recentExperiences.length} times. Use this experience wisely.**
`;

    return learnedKnowledge;
  }

  /**
   * Identify patterns from experiences
   */
  private async identifyPatterns(experiences: any[]): Promise<{
    successfulTricks: TrickPattern[];
    refinements: Refinement[];
    userPreferences: UserPreference[];
    recoveryStrategies: RecoveryStrategy[];
    contextualLearnings: ContextualLearning[];
  }> {

    const successfulTricks = await this.analyzeSuccessfulTricks(experiences);
    const refinements = this.extractRefinements(experiences);
    const userPreferences = this.detectUserPatterns(experiences);
    const recoveryStrategies = this.learnRecoveryStrategies(experiences);
    const contextualLearnings = this.extractContextualInsights(experiences);

    return {
      successfulTricks,
      refinements,
      userPreferences,
      recoveryStrategies,
      contextualLearnings
    };
  }

  /**
   * Analyze which tricks work best
   */
  private async analyzeSuccessfulTricks(experiences: any[]): Promise<TrickPattern[]> {
    const trickStats: Record<string, any> = {};

    experiences.forEach(exp => {
      const trick = exp.trick_performed;
      if (!trickStats[trick]) {
        trickStats[trick] = {
          attempts: 0,
          successes: 0,
          contexts: [],
          insights: []
        };
      }

      trickStats[trick].attempts++;
      if (exp.user_reaction === 'amazed' || exp.user_reaction === 'engaged') {
        trickStats[trick].successes++;
      }
      if (exp.context) trickStats[trick].contexts.push(exp.context);
      if (exp.lesson_learned) trickStats[trick].insights.push(exp.lesson_learned);
    });

    return Object.entries(trickStats)
      .map(([trick, stats]: [string, any]) => ({
        name: trick,
        successRate: ((stats.successes / stats.attempts) * 100).toFixed(1),
        bestContexts: this.extractCommonContexts(stats.contexts),
        keyInsight: this.synthesizeInsights(stats.insights),
        timesPerformed: stats.attempts
      }))
      .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate))
      .slice(0, 5);
  }

  /**
   * Extract common contexts
   */
  private extractCommonContexts(contexts: string[]): string[] {
    if (contexts.length === 0) return ['Various situations'];

    // Simple frequency analysis
    const words = contexts.join(' ').toLowerCase().split(/\s+/);
    const frequency: Record<string, number> = {};

    words.forEach(word => {
      if (word.length > 4) { // Ignore short words
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  /**
   * Synthesize insights from multiple lessons
   */
  private synthesizeInsights(insights: string[]): string {
    if (insights.length === 0) return 'Consistent performance';
    if (insights.length === 1) return insights[0];

    // Return the most recent insight
    return insights[insights.length - 1];
  }

  /**
   * Extract refinements from lessons learned
   */
  private extractRefinements(experiences: any[]): Refinement[] {
    const refinements: Refinement[] = [];
    const lessonCounts: Record<string, number> = {};

    experiences
      .filter(exp => exp.lesson_learned && exp.user_reaction === 'amazed')
      .forEach(exp => {
        const lesson = exp.lesson_learned;
        lessonCounts[lesson] = (lessonCounts[lesson] || 0) + 1;
      });

    Object.entries(lessonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([lesson, count]) => {
        refinements.push({
          technique: this.extractTechniqueName(lesson),
          improvement: lesson,
          experiences: count
        });
      });

    return refinements;
  }

  /**
   * Extract technique name from lesson
   */
  private extractTechniqueName(lesson: string): string {
    // Simple extraction: first few words
    return lesson.split(' ').slice(0, 3).join(' ');
  }

  /**
   * Detect user behavior patterns
   */
  private detectUserPatterns(experiences: any[]): UserPreference[] {
    const patterns: UserPreference[] = [];
    const total = experiences.length;

    // Pattern: Quick engagement
    const quickEngaged = experiences.filter(exp => 
      exp.message_count <= 5 && exp.user_reaction === 'amazed'
    ).length;
    if (quickEngaged > total * 0.2) {
      patterns.push({
        pattern: 'Users engage quickly with direct mind-reading attempts',
        frequency: Math.round((quickEngaged / total) * 100),
        adaptation: 'Lead with strong opening tricks'
      });
    }

    // Pattern: Long conversations
    const longConvos = experiences.filter(exp => exp.message_count > 15).length;
    if (longConvos > total * 0.3) {
      patterns.push({
        pattern: 'Users enjoy extended interactions and storytelling',
        frequency: Math.round((longConvos / total) * 100),
        adaptation: 'Develop narrative and build multiple reveals'
      });
    }

    // Pattern: Positive sentiment
    const positive = experiences.filter(exp => exp.user_sentiment > 0.5).length;
    if (positive > total * 0.6) {
      patterns.push({
        pattern: 'Overall positive audience reception',
        frequency: Math.round((positive / total) * 100),
        adaptation: 'Current approach is working well'
      });
    }

    return patterns.length > 0 ? patterns : [{
      pattern: 'Building baseline understanding',
      frequency: 100,
      adaptation: 'Continue gathering experience'
    }];
  }

  /**
   * Learn recovery strategies from challenging interactions
   */
  private learnRecoveryStrategies(experiences: any[]): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    // Find experiences that started poorly but recovered
    const recoveries = experiences.filter(exp => 
      exp.what_didnt_work && 
      exp.what_worked && 
      (exp.user_reaction === 'engaged' || exp.user_reaction === 'neutral')
    );

    if (recoveries.length > 0) {
      const successRate = (recoveries.length / experiences.length) * 100;
      strategies.push({
        situation: 'When initial approach misses',
        strategy: 'Pivot gracefully and try alternative reading',
        effectiveness: Math.round(successRate)
      });
    }

    // Find patterns in skeptical -> engaged transitions
    const skepticalRecoveries = experiences.filter((exp, idx) => {
      if (idx === 0) return false;
      const prev = experiences[idx - 1];
      return prev.user_reaction === 'skeptical' && exp.user_reaction !== 'skeptical';
    });

    if (skepticalRecoveries.length > 0) {
      strategies.push({
        situation: 'Skeptical audience',
        strategy: 'Address skepticism directly, demonstrate specific technique',
        effectiveness: Math.round((skepticalRecoveries.length / experiences.length) * 100)
      });
    }

    return strategies.length > 0 ? strategies : [{
      situation: 'General adaptability',
      strategy: 'Stay in character and maintain confidence',
      effectiveness: 75
    }];
  }

  /**
   * Extract contextual insights
   */
  private extractContextualInsights(experiences: any[]): ContextualLearning[] {
    const insights: ContextualLearning[] = [];

    // Time-based patterns
    const byHour: Record<number, number[]> = {};
    experiences.forEach(exp => {
      const hour = new Date(exp.timestamp * 1000).getHours();
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(exp.user_sentiment);
    });

    // Find best performing time ranges
    Object.entries(byHour).forEach(([hour, sentiments]) => {
      const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
      if (avg > 0.6 && sentiments.length > 3) {
        const timeRange = parseInt(hour) < 12 ? 'morning' : 
                         parseInt(hour) < 18 ? 'afternoon' : 'evening';
        insights.push({
          context: `Performances in the ${timeRange}`,
          insight: 'Show particularly high engagement'
        });
      }
    });

    if (insights.length === 0) {
      insights.push({
        context: 'All time periods',
        insight: 'Show consistent performance'
      });
    }

    return insights.slice(0, 3);
  }

  /**
   * Get learning summary for dashboard
   */
  async getLearningSummary(mentalistId: string): Promise<LearningSummary> {
    const { results: experiences } = await this.db.prepare(`
      SELECT * FROM experiences
      WHERE mentalist_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `).bind(mentalistId).all();

    const { results: metrics } = await this.db.prepare(`
      SELECT * FROM performance_metrics
      WHERE mentalist_id = ?
      ORDER BY success_rate DESC
      LIMIT 10
    `).bind(mentalistId).all();

    const totalExperiences = experiences?.length || 0;
    const successfulCount = experiences?.filter((e: any) => 
      e.user_reaction === 'amazed' || e.user_reaction === 'engaged'
    ).length || 0;

    const topTricks = (metrics || []).map((m: any) => ({
      name: m.trick_name,
      successRate: m.success_rate * 100,
      timesPerformed: m.total_attempts
    }));

    const recentLearnings = experiences
      ?.filter((e: any) => e.lesson_learned)
      .slice(0, 5)
      .map((e: any) => e.lesson_learned) || [];

    return {
      mentalistId,
      experienceWindow: 100,
      totalExperiences,
      averageSuccessRate: totalExperiences > 0 ? (successfulCount / totalExperiences) * 100 : 0,
      topTricks: topTricks.slice(0, 5),
      recentLearnings,
      emergingPatterns: ['Pattern analysis in development'],
      areasForImprovement: ['Continuous refinement ongoing']
    };
  }
}
