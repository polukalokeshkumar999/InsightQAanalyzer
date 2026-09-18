/**
 * AI Enhancer
 * Uses OpenAI API to provide additional intelligent insights
 */

const logger = require('../../utils/logger');

class AIEnhancer {
  constructor() {
    this.openai = null;
    this.initializeOpenAI();
  }

  initializeOpenAI() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      try {
        const OpenAI = require('openai');
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        logger.info('OpenAI API initialized successfully');
      } catch (error) {
        logger.warn('OpenAI initialization failed:', error.message);
      }
    } else {
      logger.info('OpenAI API key not configured - AI enhancement disabled');
    }
  }

  /**
   * Enhance analysis with AI insights
   */
  async enhance(analysisData) {
    if (!this.openai) {
      return this.getFallbackInsights(analysisData);
    }

    try {
      const prompt = this.buildPrompt(analysisData);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert QA engineer and test strategist. Analyze user stories and provide actionable testing insights. Be specific, practical, and focused on quality assurance best practices.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const aiResponse = response.choices[0]?.message?.content;
      return this.parseAIResponse(aiResponse, analysisData);

    } catch (error) {
      logger.error('AI enhancement failed:', error);
      return this.getFallbackInsights(analysisData);
    }
  }

  /**
   * Build prompt for AI analysis
   */
  buildPrompt(analysisData) {
    const { userStory, nlpResults, riskAssessment, testRecommendations } = analysisData;

    return `
Analyze this user story from a QA perspective and provide additional testing insights:

USER STORY:
${userStory}

EXTRACTED INFORMATION:
- Actor: ${nlpResults.actor || 'Not specified'}
- Action: ${nlpResults.action || 'Not specified'}
- Benefit: ${nlpResults.benefit || 'Not specified'}
- Data Fields: ${nlpResults.dataFields?.map(f => f.name).join(', ') || 'None identified'}
- Risk Level: ${riskAssessment.riskLevel}
- High Risk Areas: ${riskAssessment.hotspots?.map(h => h.type).join(', ') || 'None'}

Please provide:
1. THREE additional edge cases not commonly considered
2. TWO potential security vulnerabilities specific to this feature
3. THREE critical test scenarios that should never be skipped
4. TWO integration testing considerations
5. ONE performance testing recommendation
6. ONE accessibility testing consideration

Format your response as JSON with keys: additionalEdgeCases, securityConsiderations, criticalScenarios, integrationConsiderations, performanceRecommendation, accessibilityConsideration
`;
  }

  /**
   * Parse AI response
   */
  parseAIResponse(aiResponse, analysisData) {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          source: 'ai',
          ...parsed,
          confidence: 'high',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.warn('Could not parse AI response as JSON, using text parsing');
    }

    // Fallback to text parsing
    return {
      source: 'ai',
      rawInsights: aiResponse,
      confidence: 'medium',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Provide fallback insights when AI is not available
   */
  getFallbackInsights(analysisData) {
    const { nlpResults, riskAssessment } = analysisData;

    return {
      source: 'rule-based',
      additionalEdgeCases: this.generateRuleBasedEdgeCases(nlpResults),
      securityConsiderations: this.generateSecurityConsiderations(nlpResults, riskAssessment),
      criticalScenarios: this.generateCriticalScenarios(nlpResults),
      integrationConsiderations: this.generateIntegrationConsiderations(nlpResults),
      performanceRecommendation: this.generatePerformanceRecommendation(nlpResults),
      accessibilityConsideration: this.generateAccessibilityConsideration(nlpResults),
      confidence: 'medium',
      timestamp: new Date().toISOString(),
      note: 'AI enhancement unavailable - using rule-based analysis'
    };
  }

  generateRuleBasedEdgeCases(nlpResults) {
    const cases = [];

    if (nlpResults.dataFields?.length > 0) {
      cases.push('Test with copy-pasted text containing hidden formatting characters');
      cases.push('Test form submission during intermittent network connectivity');
    }

    if (nlpResults.dataModification) {
      cases.push('Test rapid sequential modifications to same record');
    }

    if (nlpResults.requiresAuth) {
      cases.push('Test feature behavior when session expires mid-operation');
    }

    cases.push('Test with browser auto-fill enabled');
    cases.push('Test on low-memory devices or browser tabs');

    return cases.slice(0, 3);
  }

  generateSecurityConsiderations(nlpResults, riskAssessment) {
    const considerations = [];

    if (nlpResults.sensitiveData) {
      considerations.push('Ensure sensitive data is not logged in browser console or server logs');
    }

    if (nlpResults.dataModification) {
      considerations.push('Verify proper CORS configuration to prevent unauthorized API access');
    }

    considerations.push('Check for information leakage in error messages');
    considerations.push('Verify rate limiting on sensitive endpoints');

    return considerations.slice(0, 2);
  }

  generateCriticalScenarios(nlpResults) {
    const scenarios = [];

    scenarios.push(`Verify ${nlpResults.action || 'primary action'} works correctly on first attempt`);
    
    if (nlpResults.dataFields?.length > 0) {
      scenarios.push('Verify all required field validations are enforced');
    }

    if (nlpResults.dataModification) {
      scenarios.push('Verify data persistence and retrieval accuracy');
    }

    scenarios.push('Verify proper error handling and user feedback');
    scenarios.push('Verify feature accessibility via all supported entry points');

    return scenarios.slice(0, 3);
  }

  generateIntegrationConsiderations(nlpResults) {
    const considerations = [];

    if (nlpResults.dependencies?.length > 0) {
      considerations.push('Test graceful degradation when dependent services are slow or unavailable');
    }

    considerations.push('Verify data consistency across all integrated systems');
    considerations.push('Test rollback behavior when partial integration failure occurs');

    return considerations.slice(0, 2);
  }

  generatePerformanceRecommendation(nlpResults) {
    if (nlpResults.dataModification) {
      return 'Measure and baseline response times for data operations under typical load';
    }

    if (nlpResults.dependencies?.length > 0) {
      return 'Test response times with simulated network latency to external services';
    }

    return 'Establish baseline performance metrics for core user flows';
  }

  generateAccessibilityConsideration(nlpResults) {
    if (nlpResults.dataFields?.length > 0) {
      return 'Ensure all form fields have proper labels and error messages are announced to screen readers';
    }

    return 'Verify keyboard navigation and screen reader compatibility for all interactive elements';
  }
}

module.exports = new AIEnhancer();
