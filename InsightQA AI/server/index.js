/**
 * InsightQA AI - Main Server Entry Point
 * AI-Powered User Story QA Analyzer
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const analyzeRoutes = require('./routes/analyze');
const historyRoutes = require('./routes/history');
const exportRoutes = require('./routes/export');
const integrationRoutes = require('./routes/integrations');
const templateRoutes = require('./routes/templates');
const feedbackRoutes = require('./routes/feedback');
const chatbotRoutes = require('./routes/chatbot');
const coreSuiteRoutes = require('./routes/coreSuite');
const { initDatabase } = require('./services/database');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/core-suite', coreSuiteRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'InsightQA AI'
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    logger.info('Database initialized successfully');
    
    app.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 InsightQA AI Server Running                        ║
║                                                          ║
║   Local:    http://localhost:${PORT}                      ║
║   API:      http://localhost:${PORT}/api                  ║
║   Health:   http://localhost:${PORT}/api/health           ║
║                                                          ║
║   Ready to analyze user stories!                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
