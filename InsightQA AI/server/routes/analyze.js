/**
 * Analysis Routes
 * Main API endpoints for user story analysis
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const analysisEngine = require('../services/analyzer/analysisEngine');
const { saveAnalysis, getAnalysis } = require('../services/database');
const logger = require('../utils/logger');

/**
 * POST /api/analyze
 * Analyze a user story and generate testing insights
 */
router.post('/', async (req, res) => {
  try {
    const { userStory, options = {} } = req.body;

    if (!userStory || typeof userStory !== 'string' || userStory.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'User story text is required'
      });
    }

    if (userStory.length > 10000) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'User story exceeds maximum length of 10000 characters'
      });
    }

    logger.info('Analyzing user story...');
    const startTime = Date.now();

    // Run analysis
    const result = await analysisEngine.analyze(userStory.trim(), {
      useAI: options.useAI || false,
      project: options.project || null,
      tags: options.tags || []
    });

    // Save to history
    try {
      saveAnalysis({
        id: result.id,
        userStory: userStory.trim(),
        storyTitle: options.storyTitle || null,
        storyId: options.storyId || null,
        result,
        tags: options.tags || [],
        project: options.project || null
      });
    } catch (dbError) {
      logger.warn('Failed to save analysis to history:', dbError.message);
    }

    const processingTime = Date.now() - startTime;
    logger.info(`Analysis completed in ${processingTime}ms`);

    res.json({
      success: true,
      data: result,
      meta: {
        processingTime,
        version: '1.0.0'
      }
    });

  } catch (error) {
    logger.error('Analysis failed:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during analysis'
    });
  }
});

/**
 * GET /api/analyze/:id
 * Get a specific analysis by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = getAnalysis(id);
    
    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Analysis not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: analysis.id,
        userStory: analysis.user_story,
        storyTitle: analysis.story_title,
        storyId: analysis.story_id,
        result: analysis.analysis_result,
        riskScore: analysis.risk_score,
        riskLevel: analysis.risk_level,
        tags: analysis.tags,
        project: analysis.project,
        createdAt: analysis.created_at,
        isFavorite: analysis.is_favorite === 1
      }
    });

  } catch (error) {
    logger.error('Failed to get analysis:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis',
      message: error.message
    });
  }
});

/**
 * POST /api/analyze/quick
 * Quick analysis - returns only essential insights
 */
router.post('/quick', async (req, res) => {
  try {
    const { userStory } = req.body;

    if (!userStory || typeof userStory !== 'string' || userStory.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'User story text is required'
      });
    }

    const result = await analysisEngine.analyze(userStory.trim(), { useAI: false });

    // Return condensed version
    res.json({
      success: true,
      data: {
        id: result.id,
        riskLevel: result.riskAssessment.riskLevel,
        riskScore: result.riskAssessment.overallScore,
        topTestTypes: result.testRecommendations.testTypes.slice(0, 5).map(t => ({
          type: t.type,
          priority: t.priority
        })),
        topEdgeCases: [
          ...result.edgeCases.boundary.slice(0, 2),
          ...result.edgeCases.security.slice(0, 2),
          ...result.edgeCases.negative.slice(0, 2)
        ].slice(0, 5),
        topQuestions: result.clarificationQuestions.slice(0, 5).map(q => q.question),
        metrics: result.metrics
      }
    });

  } catch (error) {
    logger.error('Quick analysis failed:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/analyze/batch
 * Analyze multiple user stories
 */
router.post('/batch', async (req, res) => {
  try {
    const { stories } = req.body;

    if (!Array.isArray(stories) || stories.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Array of user stories is required'
      });
    }

    if (stories.length > 10) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Maximum 10 stories per batch'
      });
    }

    const results = [];
    const errors = [];

    for (const story of stories) {
      try {
        const result = await analysisEngine.analyze(
          typeof story === 'string' ? story : story.text,
          { useAI: false }
        );
        results.push({
          id: result.id,
          storyId: story.id || null,
          riskLevel: result.riskAssessment.riskLevel,
          riskScore: result.riskAssessment.overallScore,
          testTypesCount: result.testRecommendations.testTypes.length,
          edgeCasesCount: Object.values(result.edgeCases).reduce((sum, arr) => sum + arr.length, 0),
          questionsCount: result.clarificationQuestions.length
        });
      } catch (error) {
        errors.push({
          storyId: story.id || null,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        failed: errors.length,
        results,
        errors
      }
    });

  } catch (error) {
    logger.error('Batch analysis failed:', error);
    res.status(500).json({
      error: 'Batch analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/analyze/compare
 * Compare two user stories
 */
router.post('/compare', async (req, res) => {
  try {
    const { story1, story2 } = req.body;

    if (!story1 || !story2) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Two user stories are required for comparison'
      });
    }

    const [result1, result2] = await Promise.all([
      analysisEngine.analyze(story1, { useAI: false }),
      analysisEngine.analyze(story2, { useAI: false })
    ]);

    res.json({
      success: true,
      data: {
        story1: {
          riskScore: result1.riskAssessment.overallScore,
          riskLevel: result1.riskAssessment.riskLevel,
          testTypes: result1.testRecommendations.testTypes.length,
          effort: result1.testRecommendations.estimatedEffort.total
        },
        story2: {
          riskScore: result2.riskAssessment.overallScore,
          riskLevel: result2.riskAssessment.riskLevel,
          testTypes: result2.testRecommendations.testTypes.length,
          effort: result2.testRecommendations.estimatedEffort.total
        },
        comparison: {
          riskDifference: result2.riskAssessment.overallScore - result1.riskAssessment.overallScore,
          effortDifference: result2.testRecommendations.estimatedEffort.total - result1.testRecommendations.estimatedEffort.total,
          recommendation: result1.riskAssessment.overallScore > result2.riskAssessment.overallScore
            ? 'Story 1 has higher risk - prioritize testing'
            : 'Story 2 has higher risk - prioritize testing'
        }
      }
    });

  } catch (error) {
    logger.error('Comparison failed:', error);
    res.status(500).json({
      error: 'Comparison failed',
      message: error.message
    });
  }
});

module.exports = router;
