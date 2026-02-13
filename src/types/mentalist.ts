// Core Mentalist Interface
export interface Mentalist {
  id: string;
  name: string;
  title: string;
  tagline: string;
  avatarUrl: string;
  systemPrompt: string;
  starterPrompts: string[];
  themeColor: string;
  accentColor: string;
  knowledgeBase?: string;

  // Learning System Fields
  experienceLevel: number;
  totalPerformances: number;
  successfulTricks: string[];
  learningEnabled: boolean;
  specialtyDeveloping?: string;
  createdAt: Date;
  lastPerformance?: Date;
}

// Experience Tracking
export interface MentalistExperience {
  id: string;
  mentalistId: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  conversationSummary: string;
  trickPerformed: string;
  userReaction: 'amazed' | 'skeptical' | 'neutral' | 'confused' | 'engaged';
  userSentiment: number; // -1 to 1
  whatWorked: string;
  whatDidntWork: string;
  lessonLearned: string;
  messageCount: number;
  durationSeconds: number;
  context: string; // What was happening in the conversation
}

// Performance Metrics
export interface PerformanceMetrics {
  id: string;
  mentalistId: string;
  trickName: string;
  totalAttempts: number;
  successCount: number;
  successRate: number;
  averageUserRating: number;
  bestContexts: string[];
  commonFailures: string[];
  refinements: string[];
  lastUpdated: Date;
}

// Learned Knowledge
export interface LearnedKnowledge {
  id: string;
  mentalistId: string;
  category: 'trick' | 'reading' | 'interaction' | 'recovery' | 'opening' | 'closing';
  knowledge: string;
  confidence: number; // 0 to 1, how proven this is
  sourceExperiences: string[]; // Experience IDs that taught this
  successCount: number;
  failureCount: number;
  dateAdded: Date;
  lastReinforced?: Date;
}

// Conversation Analysis
export interface ConversationAnalysis {
  trickPerformed?: string;
  userSentiment: number;
  keyMoments: string[];
  mentalistSuccess: boolean;
  lessonLearned?: string;
  whatWorked: string[];
  whatDidntWork: string[];
  suggestedImprovements: string[];
}

// Chat Message
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Session Tracking
export interface ChatSession {
  id: string;
  userId: string;
  mentalistId: string;
  messages: ChatMessage[];
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

// Experience Retrieval
export interface RelevantExperience {
  experience: MentalistExperience;
  relevanceScore: number;
  reason: string;
}

// Learning Summary
export interface LearningSummary {
  mentalistId: string;
  experienceWindow: number;
  totalExperiences: number;
  averageSuccessRate: number;
  topTricks: Array<{
    name: string;
    successRate: number;
    timesPerformed: number;
  }>;
  recentLearnings: string[];
  emergingPatterns: string[];
  areasForImprovement: string[];
}

// Dashboard Data
export interface MentalistDashboard {
  mentalist: Mentalist;
  totalPerformances: number;
  overallSuccessRate: number;
  experienceLevel: number;
  topTricks: Array<{
    name: string;
    successRate: number;
    timesPerformed: number;
    avgUserRating: number;
  }>;
  learningCurve: Array<{
    date: string;
    avgSuccessRate: number;
    performanceCount: number;
  }>;
  uniqueInsights: number;
  specialtyDeveloping: string;
  recentHighlights: string[];
}
