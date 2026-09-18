/**
 * Database Service
 * SQLite database for storing analysis history and user data
 */

const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      const dbPath = path.join(__dirname, '../../data/insightqa.db');
      
      // Ensure data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      db = new Database(dbPath);
      
      // Enable WAL mode for better performance
      db.pragma('journal_mode = WAL');
      
      // Create tables
      db.exec(`
        -- Analysis History Table
        CREATE TABLE IF NOT EXISTS analysis_history (
          id TEXT PRIMARY KEY,
          user_story TEXT NOT NULL,
          story_title TEXT,
          story_id TEXT,
          analysis_result TEXT NOT NULL,
          risk_score REAL,
          risk_level TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          tags TEXT,
          project TEXT,
          is_favorite INTEGER DEFAULT 0
        );

        -- Feedback Table (for learning)
        CREATE TABLE IF NOT EXISTS feedback (
          id TEXT PRIMARY KEY,
          analysis_id TEXT NOT NULL,
          feedback_type TEXT NOT NULL,
          feedback_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (analysis_id) REFERENCES analysis_history(id)
        );

        -- Custom Rules Table
        CREATE TABLE IF NOT EXISTS custom_rules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          rule_type TEXT NOT NULL,
          rule_pattern TEXT NOT NULL,
          recommendation TEXT NOT NULL,
          priority TEXT DEFAULT 'MEDIUM',
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Projects Table
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Test Templates Table
        CREATE TABLE IF NOT EXISTS test_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          template_content TEXT NOT NULL,
          variables TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Chat Sessions Table
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Chat Messages Table
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          sender TEXT NOT NULL,
          text TEXT NOT NULL,
          category TEXT,
          source TEXT,
          suggested_follow_ups TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_analysis_created ON analysis_history(created_at);
        CREATE INDEX IF NOT EXISTS idx_analysis_risk ON analysis_history(risk_level);
        CREATE INDEX IF NOT EXISTS idx_analysis_project ON analysis_history(project);
        CREATE INDEX IF NOT EXISTS idx_feedback_analysis ON feedback(analysis_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
      `);

      // Insert default test templates
      insertDefaultTemplates();
      
      logger.info('Database initialized at: ' + dbPath);
      resolve(db);
    } catch (error) {
      logger.error('Database initialization failed:', error);
      reject(error);
    }
  });
}

function insertDefaultTemplates() {
  const templates = [
    {
      id: 'tpl-functional-001',
      name: 'Functional Test Case',
      category: 'functional',
      template_content: JSON.stringify({
        sections: ['Preconditions', 'Test Steps', 'Expected Result', 'Actual Result', 'Status'],
        format: 'Given-When-Then'
      }),
      variables: JSON.stringify(['feature', 'action', 'expected_outcome'])
    },
    {
      id: 'tpl-security-001',
      name: 'Security Test Case',
      category: 'security',
      template_content: JSON.stringify({
        sections: ['Vulnerability Type', 'Attack Vector', 'Test Procedure', 'Mitigation', 'Severity'],
        checks: ['Input Validation', 'Authentication', 'Authorization', 'Session Management']
      }),
      variables: JSON.stringify(['endpoint', 'payload', 'expected_behavior'])
    },
    {
      id: 'tpl-boundary-001',
      name: 'Boundary Value Test',
      category: 'boundary',
      template_content: JSON.stringify({
        sections: ['Input Field', 'Min Value', 'Max Value', 'Below Min', 'Above Max', 'Expected Behavior'],
        format: 'Table'
      }),
      variables: JSON.stringify(['field_name', 'min', 'max', 'data_type'])
    }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO test_templates (id, name, category, template_content, variables)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const template of templates) {
    stmt.run(template.id, template.name, template.category, template.template_content, template.variables);
  }
}

function getDb() {
  return db;
}

// Analysis History Operations
function saveAnalysis(analysis) {
  const stmt = db.prepare(`
    INSERT INTO analysis_history (id, user_story, story_title, story_id, analysis_result, risk_score, risk_level, tags, project)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    analysis.id,
    analysis.userStory,
    analysis.storyTitle || null,
    analysis.storyId || null,
    JSON.stringify(analysis.result),
    analysis.result.riskAssessment?.overallScore || 0,
    analysis.result.riskAssessment?.riskLevel || 'LOW',
    JSON.stringify(analysis.tags || []),
    analysis.project || null
  );
}

function getAnalysis(id) {
  const stmt = db.prepare('SELECT * FROM analysis_history WHERE id = ?');
  const row = stmt.get(id);
  if (row) {
    row.analysis_result = JSON.parse(row.analysis_result);
    row.tags = JSON.parse(row.tags || '[]');
  }
  return row;
}

function getAllAnalyses(limit = 50, offset = 0, filters = {}) {
  let query = 'SELECT * FROM analysis_history WHERE 1=1';
  const params = [];

  if (filters.project) {
    query += ' AND project = ?';
    params.push(filters.project);
  }

  if (filters.riskLevel) {
    query += ' AND risk_level = ?';
    params.push(filters.riskLevel);
  }

  if (filters.search) {
    query += ' AND (user_story LIKE ? OR story_title LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.favorite) {
    query += ' AND is_favorite = 1';
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  
  return rows.map(row => ({
    ...row,
    analysis_result: JSON.parse(row.analysis_result),
    tags: JSON.parse(row.tags || '[]')
  }));
}

function deleteAnalysis(id) {
  const stmt = db.prepare('DELETE FROM analysis_history WHERE id = ?');
  return stmt.run(id);
}

function toggleFavorite(id) {
  const stmt = db.prepare('UPDATE analysis_history SET is_favorite = NOT is_favorite WHERE id = ?');
  return stmt.run(id);
}

// Feedback Operations
function saveFeedback(feedback) {
  const stmt = db.prepare(`
    INSERT INTO feedback (id, analysis_id, feedback_type, feedback_data)
    VALUES (?, ?, ?, ?)
  `);
  
  return stmt.run(
    feedback.id,
    feedback.analysisId,
    feedback.type,
    JSON.stringify(feedback.data)
  );
}

function getFeedbackStats() {
  const stmt = db.prepare(`
    SELECT feedback_type, COUNT(*) as count 
    FROM feedback 
    GROUP BY feedback_type
  `);
  return stmt.all();
}

// Custom Rules Operations
function getCustomRules(activeOnly = true) {
  let query = 'SELECT * FROM custom_rules';
  if (activeOnly) {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY priority DESC';
  
  const stmt = db.prepare(query);
  return stmt.all().map(row => ({
    ...row,
    rule_pattern: JSON.parse(row.rule_pattern)
  }));
}

function saveCustomRule(rule) {
  const stmt = db.prepare(`
    INSERT INTO custom_rules (id, name, description, rule_type, rule_pattern, recommendation, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    rule.id,
    rule.name,
    rule.description || null,
    rule.ruleType,
    JSON.stringify(rule.pattern),
    rule.recommendation,
    rule.priority || 'MEDIUM'
  );
}

// Analytics
function getAnalyticsData(days = 30) {
  const stmt = db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as analyses_count,
      AVG(risk_score) as avg_risk_score,
      SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as high_risk_count,
      SUM(CASE WHEN risk_level = 'MEDIUM' THEN 1 ELSE 0 END) as medium_risk_count,
      SUM(CASE WHEN risk_level = 'LOW' THEN 1 ELSE 0 END) as low_risk_count
    FROM analysis_history
    WHERE created_at >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);
  
  return stmt.all(days);
}

// Chat Persistence Helpers
function saveChatSession(sessionId, title, messages = []) {
  const checkStmt = db.prepare('SELECT id FROM chat_sessions WHERE id = ?');
  const existing = checkStmt.get(sessionId);

  if (!existing) {
    db.prepare('INSERT INTO chat_sessions (id, title) VALUES (?, ?)').run(sessionId, title || 'New Conversation');
  } else {
    db.prepare('UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title || 'Conversation', sessionId);
  }

  // Delete existing messages and re-insert
  db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);

  const insertMsg = db.prepare(`
    INSERT INTO chat_messages (id, session_id, sender, text, category, source, suggested_follow_ups)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((msgs) => {
    for (const m of msgs) {
      insertMsg.run(
        m.id || require('uuid').v4(),
        sessionId,
        m.sender || 'user',
        m.text || '',
        m.category || null,
        m.source || null,
        m.suggestedFollowUps ? JSON.stringify(m.suggestedFollowUps) : null
      );
    }
  });

  tx(messages);
  return { sessionId, title, messageCount: messages.length };
}

function getChatSessions(limit = 20) {
  const stmt = db.prepare(`
    SELECT s.id, s.title, s.created_at, s.updated_at, COUNT(m.id) as message_count
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON s.id = m.session_id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

function getChatSessionById(sessionId) {
  const sessionStmt = db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
  const session = sessionStmt.get(sessionId);
  if (!session) return null;

  const msgStmt = db.prepare(`
    SELECT id, sender, text, category, source, suggested_follow_ups, created_at
    FROM chat_messages
    WHERE session_id = ?
    ORDER BY created_at ASC
  `);
  const rawMessages = msgStmt.all(sessionId);
  const messages = rawMessages.map(m => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    category: m.category,
    source: m.source,
    suggestedFollowUps: m.suggested_follow_ups ? JSON.parse(m.suggested_follow_ups) : [],
    createdAt: m.created_at
  }));

  return {
    ...session,
    messages
  };
}

function deleteChatSession(sessionId) {
  db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
  return db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(sessionId);
}

module.exports = {
  initDatabase,
  getDb,
  saveAnalysis,
  getAnalysis,
  getAllAnalyses,
  deleteAnalysis,
  toggleFavorite,
  saveFeedback,
  getFeedbackStats,
  getCustomRules,
  saveCustomRule,
  getAnalyticsData,
  saveChatSession,
  getChatSessions,
  getChatSessionById,
  deleteChatSession
};

