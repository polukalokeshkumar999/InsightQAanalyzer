/**
 * Feedback Routes
 * API endpoints for collecting user feedback to improve analysis
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { saveFeedback, getFeedbackStats } = require('../services/database');
const logger = require('../utils/logger');

/**
 * POST /api/feedback
 * Submit feedback on an analysis
 */
router.post('/', async (req, res) => {
  try {
    const { analysisId, type, data } = req.body;

    if (!analysisId || !type) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis ID and feedback type are required'
      });
    }

    const validTypes = [
      'rating',           // Overall rating (1-5 stars)
      'accuracy',         // How accurate were the recommendations
      'missing_edge_case', // User identified a missing edge case
      'wrong_priority',   // Priority was incorrect
      'helpful_insight',  // Mark an insight as particularly helpful
      'irrelevant',       // Mark something as not relevant
      'suggestion'        // General suggestion
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid feedback type',
        message: `Valid types: ${validTypes.join(', ')}`
      });
    }

    const feedback = {
      id: uuidv4(),
      analysisId,
      type,
      data: data || {}
    };

    saveFeedback(feedback);

    logger.info(`Feedback received: ${type} for analysis ${analysisId}`);

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      data: {
        feedbackId: feedback.id
      }
    });

  } catch (error) {
    logger.error('Failed to save feedback:', error);
    res.status(500).json({
      error: 'Failed to save feedback',
      message: error.message
    });
  }
});

/**
 * POST /api/feedback/rating
 * Quick rating submission
 */
router.post('/rating', async (req, res) => {
  try {
    const { analysisId, rating, comment } = req.body;

    if (!analysisId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis ID and rating (1-5) are required'
      });
    }

    const feedback = {
      id: uuidv4(),
      analysisId,
      type: 'rating',
      data: { rating, comment }
    };

    saveFeedback(feedback);

    res.json({
      success: true,
      message: 'Rating submitted successfully'
    });

  } catch (error) {
    logger.error('Failed to save rating:', error);
    res.status(500).json({
      error: 'Failed to save rating',
      message: error.message
    });
  }
});

/**
 * POST /api/feedback/edge-case
 * Report a missing edge case
 */
router.post('/edge-case', async (req, res) => {
  try {
    const { analysisId, edgeCase, category } = req.body;

    if (!analysisId || !edgeCase) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis ID and edge case description are required'
      });
    }

    const feedback = {
      id: uuidv4(),
      analysisId,
      type: 'missing_edge_case',
      data: { edgeCase, category: category || 'general' }
    };

    saveFeedback(feedback);

    logger.info(`New edge case reported: ${edgeCase}`);

    res.json({
      success: true,
      message: 'Edge case reported. This will help improve future analyses!'
    });

  } catch (error) {
    logger.error('Failed to save edge case:', error);
    res.status(500).json({
      error: 'Failed to save edge case',
      message: error.message
    });
  }
});

/**
 * POST /api/feedback/priority
 * Report incorrect priority
 */
router.post('/priority', async (req, res) => {
  try {
    const { analysisId, testType, currentPriority, suggestedPriority, reason } = req.body;

    if (!analysisId || !testType || !suggestedPriority) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis ID, test type, and suggested priority are required'
      });
    }

    const feedback = {
      id: uuidv4(),
      analysisId,
      type: 'wrong_priority',
      data: { testType, currentPriority, suggestedPriority, reason }
    };

    saveFeedback(feedback);

    res.json({
      success: true,
      message: 'Priority feedback recorded'
    });

  } catch (error) {
    logger.error('Failed to save priority feedback:', error);
    res.status(500).json({
      error: 'Failed to save feedback',
      message: error.message
    });
  }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics (for admins/analytics)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = getFeedbackStats();

    res.json({
      success: true,
      data: {
        totalFeedback: stats.reduce((sum, s) => sum + s.count, 0),
        byType: stats.reduce((acc, s) => {
          acc[s.feedback_type] = s.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    logger.error('Failed to get feedback stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message
    });
  }
});

module.exports = router;
