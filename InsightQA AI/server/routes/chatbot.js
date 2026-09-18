/**
 * QA Chatbot Routes
 * API endpoints for the QA Rules & Application Assistant
 */

const express = require('express');
const router = express.Router();
const qaChatbotService = require('../services/chatbot/qaChatbotService');
const {
  saveChatSession,
  getChatSessions,
  getChatSessionById,
  deleteChatSession
} = require('../services/database');
const logger = require('../utils/logger');

/**
 * POST /api/chat/message
 * Process a chat query and return an expert response
 */
router.post('/message', async (req, res) => {
  try {
    const { message, conversationHistory = [], sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const response = await qaChatbotService.processMessage(message, conversationHistory);

    res.json({
      success: true,
      data: {
        ...response,
        sessionId: sessionId || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Chat processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      message: error.message
    });
  }
});

/**
 * GET /api/chat/suggestions
 * Retrieve categorized prompt starters
 */
router.get('/suggestions', (req, res) => {
  try {
    const suggestions = qaChatbotService.getSuggestedPrompts();
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Failed to get chat suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve suggestions'
    });
  }
});

/**
 * GET /api/chat/knowledge-topics
 * Retrieve list of all available knowledge topics
 */
router.get('/knowledge-topics', (req, res) => {
  try {
    const topics = qaChatbotService.getKnowledgeTopics();
    res.json({
      success: true,
      data: topics
    });
  } catch (error) {
    logger.error('Failed to get knowledge topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve knowledge topics'
    });
  }
});

/**
 * GET /api/chat/history
 * List saved chat sessions
 */
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const sessions = getChatSessions(limit);
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    logger.error('Failed to get chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history'
    });
  }
});

/**
 * GET /api/chat/history/:id
 * Retrieve a specific chat session with full messages
 */
router.get('/history/:id', (req, res) => {
  try {
    const session = getChatSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error(`Failed to get chat session ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat session'
    });
  }
});

/**
 * POST /api/chat/history
 * Save or update a conversation session
 */
router.post('/history', (req, res) => {
  try {
    const { sessionId, title, messages = [] } = req.body;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    const result = saveChatSession(sessionId, title, messages);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to save chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save chat history'
    });
  }
});

/**
 * DELETE /api/chat/history/:id
 * Delete a saved conversation session
 */
router.delete('/history/:id', (req, res) => {
  try {
    deleteChatSession(req.params.id);
    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (error) {
    logger.error(`Failed to delete chat session ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat session'
    });
  }
});

module.exports = router;
