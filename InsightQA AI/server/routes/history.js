/**
 * History Routes
 * API endpoints for analysis history management
 */

const express = require('express');
const router = express.Router();
const { 
  getAllAnalyses, 
  getAnalysis, 
  deleteAnalysis, 
  toggleFavorite,
  getAnalyticsData 
} = require('../services/database');
const logger = require('../utils/logger');

/**
 * GET /api/history
 * Get analysis history with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      project, 
      riskLevel, 
      search,
      favorite 
    } = req.query;

    const analyses = getAllAnalyses(
      parseInt(limit), 
      parseInt(offset), 
      { project, riskLevel, search, favorite: favorite === 'true' }
    );

    res.json({
      success: true,
      data: analyses.map(a => ({
        id: a.id,
        userStory: a.user_story.substring(0, 200) + (a.user_story.length > 200 ? '...' : ''),
        storyTitle: a.story_title,
        storyId: a.story_id,
        riskScore: a.risk_score,
        riskLevel: a.risk_level,
        tags: a.tags,
        project: a.project,
        isFavorite: a.is_favorite === 1,
        createdAt: a.created_at
      })),
      meta: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: analyses.length
      }
    });

  } catch (error) {
    logger.error('Failed to get history:', error);
    res.status(500).json({
      error: 'Failed to retrieve history',
      message: error.message
    });
  }
});

/**
 * GET /api/history/:id
 * Get specific analysis from history
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = getAnalysis(id);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Analysis not found in history'
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
        isFavorite: analysis.is_favorite === 1,
        createdAt: analysis.created_at,
        updatedAt: analysis.updated_at
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
 * DELETE /api/history/:id
 * Delete analysis from history
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = deleteAnalysis(id);
    
    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Analysis not found'
      });
    }

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete analysis:', error);
    res.status(500).json({
      error: 'Failed to delete analysis',
      message: error.message
    });
  }
});

/**
 * POST /api/history/:id/favorite
 * Toggle favorite status
 */
router.post('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = toggleFavorite(id);
    
    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Analysis not found'
      });
    }

    const analysis = getAnalysis(id);

    res.json({
      success: true,
      data: {
        id,
        isFavorite: analysis.is_favorite === 1
      }
    });

  } catch (error) {
    logger.error('Failed to toggle favorite:', error);
    res.status(500).json({
      error: 'Failed to update favorite status',
      message: error.message
    });
  }
});

/**
 * GET /api/history/analytics/summary
 * Get analytics summary
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const analyticsData = getAnalyticsData(parseInt(days));
    
    const totalAnalyses = analyticsData.reduce((sum, d) => sum + d.analyses_count, 0);
    const avgRiskScore = analyticsData.length > 0
      ? analyticsData.reduce((sum, d) => sum + (d.avg_risk_score || 0), 0) / analyticsData.length
      : 0;
    const highRiskCount = analyticsData.reduce((sum, d) => sum + (d.high_risk_count || 0), 0);

    res.json({
      success: true,
      data: {
        period: `Last ${days} days`,
        totalAnalyses,
        averageRiskScore: Math.round(avgRiskScore * 10) / 10,
        highRiskStories: highRiskCount,
        dailyBreakdown: analyticsData,
        riskDistribution: {
          high: analyticsData.reduce((sum, d) => sum + (d.high_risk_count || 0), 0),
          medium: analyticsData.reduce((sum, d) => sum + (d.medium_risk_count || 0), 0),
          low: analyticsData.reduce((sum, d) => sum + (d.low_risk_count || 0), 0)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get analytics:', error);
    res.status(500).json({
      error: 'Failed to retrieve analytics',
      message: error.message
    });
  }
});

module.exports = router;
