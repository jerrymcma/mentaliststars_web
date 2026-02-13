-- Mentalist Learning Database Schema for Cloudflare D1

-- Core Mentalists Table
CREATE TABLE IF NOT EXISTS mentalists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  knowledge_base TEXT,
  experience_level INTEGER DEFAULT 0,
  total_performances INTEGER DEFAULT 0,
  successful_tricks TEXT DEFAULT '[]', -- JSON array
  learning_enabled INTEGER DEFAULT 1, -- Boolean: 1=true, 0=false
  specialty_developing TEXT,
  created_at INTEGER NOT NULL, -- Unix timestamp
  last_performance INTEGER -- Unix timestamp
);

-- Experiences Table
CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  mentalist_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL, -- Unix timestamp
  conversation_summary TEXT NOT NULL,
  trick_performed TEXT NOT NULL,
  user_reaction TEXT NOT NULL, -- 'amazed', 'skeptical', 'neutral', 'confused', 'engaged'
  user_sentiment REAL NOT NULL, -- -1.0 to 1.0
  what_worked TEXT NOT NULL,
  what_didnt_work TEXT,
  lesson_learned TEXT,
  message_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  context TEXT,
  FOREIGN KEY (mentalist_id) REFERENCES mentalists(id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_experiences_mentalist_id ON experiences(mentalist_id);
CREATE INDEX IF NOT EXISTS idx_experiences_timestamp ON experiences(timestamp);
CREATE INDEX IF NOT EXISTS idx_experiences_user_reaction ON experiences(user_reaction);
CREATE INDEX IF NOT EXISTS idx_experiences_trick_performed ON experiences(trick_performed);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id TEXT PRIMARY KEY,
  mentalist_id TEXT NOT NULL,
  trick_name TEXT NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  average_user_rating REAL DEFAULT 0.0,
  best_contexts TEXT DEFAULT '[]', -- JSON array
  common_failures TEXT DEFAULT '[]', -- JSON array
  refinements TEXT DEFAULT '[]', -- JSON array
  last_updated INTEGER NOT NULL, -- Unix timestamp
  FOREIGN KEY (mentalist_id) REFERENCES mentalists(id),
  UNIQUE(mentalist_id, trick_name)
);

CREATE INDEX IF NOT EXISTS idx_metrics_mentalist_id ON performance_metrics(mentalist_id);
CREATE INDEX IF NOT EXISTS idx_metrics_success_rate ON performance_metrics(success_rate);

-- Learned Knowledge Table
CREATE TABLE IF NOT EXISTS learned_knowledge (
  id TEXT PRIMARY KEY,
  mentalist_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'trick', 'reading', 'interaction', 'recovery', 'opening', 'closing'
  knowledge TEXT NOT NULL,
  confidence REAL DEFAULT 0.0, -- 0.0 to 1.0
  source_experiences TEXT DEFAULT '[]', -- JSON array of experience IDs
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  date_added INTEGER NOT NULL, -- Unix timestamp
  last_reinforced INTEGER, -- Unix timestamp
  FOREIGN KEY (mentalist_id) REFERENCES mentalists(id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_mentalist_id ON learned_knowledge(mentalist_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_confidence ON learned_knowledge(confidence);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON learned_knowledge(category);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mentalist_id TEXT NOT NULL,
  start_time INTEGER NOT NULL, -- Unix timestamp
  end_time INTEGER, -- Unix timestamp
  is_active INTEGER DEFAULT 1, -- Boolean: 1=true, 0=false
  message_count INTEGER DEFAULT 0,
  FOREIGN KEY (mentalist_id) REFERENCES mentalists(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentalist_id ON chat_sessions(mentalist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON chat_sessions(is_active);

-- Session Messages Table (for storing conversation history)
CREATE TABLE IF NOT EXISTS session_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL, -- Unix timestamp
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON session_messages(timestamp);

-- Analytics Views
CREATE VIEW IF NOT EXISTS mentalist_performance_summary AS
SELECT 
  m.id,
  m.name,
  m.experience_level,
  m.total_performances,
  COUNT(DISTINCT e.id) as total_experiences,
  AVG(CASE 
    WHEN e.user_reaction = 'amazed' THEN 1.0
    WHEN e.user_reaction = 'engaged' THEN 0.7
    WHEN e.user_reaction = 'neutral' THEN 0.5
    WHEN e.user_reaction = 'skeptical' THEN 0.3
    ELSE 0.0
  END) as avg_success_score,
  COUNT(CASE WHEN e.user_reaction = 'amazed' THEN 1 END) as amazed_count,
  m.specialty_developing
FROM mentalists m
LEFT JOIN experiences e ON m.id = e.mentalist_id
GROUP BY m.id, m.name, m.experience_level, m.total_performances, m.specialty_developing;

-- Trick Performance View
CREATE VIEW IF NOT EXISTS trick_performance_summary AS
SELECT 
  pm.mentalist_id,
  pm.trick_name,
  pm.total_attempts,
  pm.success_rate,
  pm.average_user_rating,
  COUNT(e.id) as recent_uses,
  AVG(e.user_sentiment) as recent_sentiment
FROM performance_metrics pm
LEFT JOIN experiences e ON pm.mentalist_id = e.mentalist_id 
  AND pm.trick_name = e.trick_performed 
  AND e.timestamp > (strftime('%s', 'now') - 2592000) -- Last 30 days
GROUP BY pm.mentalist_id, pm.trick_name, pm.total_attempts, pm.success_rate, pm.average_user_rating;
