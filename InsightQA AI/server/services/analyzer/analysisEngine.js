/**
 * Core Analysis Engine
 * The heart of InsightQA AI - analyzes user stories and generates comprehensive testing insights
 */

const { v4: uuidv4 } = require('uuid');
const nlpProcessor = require('./nlpProcessor');
const riskAnalyzer = require('./riskAnalyzer');
const testRecommender = require('./testRecommender');
const edgeCaseGenerator = require('./edgeCaseGenerator');
const questionGenerator = require('./questionGenerator');
const aiEnhancer = require('./aiEnhancer');
const logger = require('../../utils/logger');

class AnalysisEngine {
  constructor() {
    this.analysisCache = new Map();
  }

  /**
   * Main analysis entry point
   * @param {string} userStory - The user story text to analyze
   * @param {object} options - Analysis options
   * @returns {object} Complete analysis result
   */
  async analyze(userStory, options = {}) {
    const startTime = Date.now();
    const analysisId = uuidv4();
    
    logger.info(`Starting analysis ${analysisId}`);

    try {
      // Step 1: NLP Processing - Extract structured information
      const nlpResults = await nlpProcessor.process(userStory);
      
      // Step 2: Risk Assessment - Identify and score risks
      const riskAssessment = await riskAnalyzer.analyze(userStory, nlpResults);
      
      // Step 3: Test Recommendations - Generate prioritized test types
      const testRecommendations = await testRecommender.recommend(userStory, nlpResults, riskAssessment);
      
      // Step 4: Edge Cases - Identify boundary conditions and edge scenarios
      const edgeCases = await edgeCaseGenerator.generate(userStory, nlpResults);
      
      // Step 5: Clarification Questions - Generate stakeholder questions
      const clarificationQuestions = await questionGenerator.generate(userStory, nlpResults);
      
      // Step 6: AI Enhancement (if enabled)
      let aiInsights = null;
      if (options.useAI && process.env.OPENAI_API_KEY) {
        aiInsights = await aiEnhancer.enhance({
          userStory,
          nlpResults,
          riskAssessment,
          testRecommendations
        });
      }

      // Step 7: Generate Test Case Templates
      const testCaseTemplates = this.generateTestCaseTemplates(testRecommendations, nlpResults);

      // Step 8: Calculate Coverage Score
      const coverageScore = this.calculateCoverageScore(testRecommendations, edgeCases);

      // Compile final results
      const result = {
        id: analysisId,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        
        // Input
        originalStory: userStory,
        
        // NLP Extraction
        storyComponents: nlpResults,
        
        // Risk Analysis
        riskAssessment: {
          overallScore: riskAssessment.overallScore,
          riskLevel: riskAssessment.riskLevel,
          riskFactors: riskAssessment.factors,
          hotspots: riskAssessment.hotspots
        },
        
        // Test Recommendations
        testRecommendations: {
          priorityMatrix: testRecommendations.priorityMatrix,
          testTypes: testRecommendations.testTypes,
          estimatedEffort: testRecommendations.estimatedEffort
        },
        
        // Edge Cases & Scenarios
        edgeCases: {
          boundary: edgeCases.boundary,
          negative: edgeCases.negative,
          integration: edgeCases.integration,
          security: edgeCases.security,
          performance: edgeCases.performance,
          accessibility: edgeCases.accessibility
        },
        
        // Missing Scenarios
        missingScenarios: this.identifyMissingScenarios(nlpResults, testRecommendations),
        
        // Clarification Questions
        clarificationQuestions: clarificationQuestions,
        
        // Test Case Templates
        testCaseTemplates: testCaseTemplates,
        
        // Coverage & Quality Metrics
        metrics: {
          coverageScore: coverageScore,
          completenessScore: this.calculateCompletenessScore(nlpResults),
          testabilityScore: this.calculateTestabilityScore(nlpResults)
        },
        
        // AI-Enhanced Insights (if available)
        aiInsights: aiInsights,
        
        // Summary
        summary: this.generateSummary(riskAssessment, testRecommendations, edgeCases)
      };

      logger.info(`Analysis ${analysisId} completed in ${result.processingTime}ms`);
      return result;

    } catch (error) {
      logger.error(`Analysis ${analysisId} failed:`, error);
      throw error;
    }
  }

  /**
   * Generate ready-to-use test case templates
   */
  generateTestCaseTemplates(testRecommendations, nlpResults) {
    const templates = [];
    const { actor, action, benefit, dataFields } = nlpResults;

    // Generate templates for top priority test types
    testRecommendations.testTypes
      .filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH')
      .forEach(testType => {
        templates.push({
          type: testType.type,
          priority: testType.priority,
          template: {
            title: `[${testType.type}] Verify ${action || 'functionality'}`,
            preconditions: this.generatePreconditions(nlpResults),
            steps: this.generateTestSteps(testType, nlpResults),
            expectedResult: this.generateExpectedResult(testType, nlpResults),
            testData: this.generateTestData(testType, dataFields)
          }
        });
      });

    return templates;
  }

  generatePreconditions(nlpResults) {
    const preconditions = [];
    
    if (nlpResults.actor) {
      preconditions.push(`User is logged in as ${nlpResults.actor}`);
    }
    
    if (nlpResults.dependencies.length > 0) {
      nlpResults.dependencies.forEach(dep => {
        preconditions.push(`${dep} is available and accessible`);
      });
    }

    preconditions.push('System is in a stable state');
    
    return preconditions;
  }

  generateTestSteps(testType, nlpResults) {
    const steps = [];
    const action = nlpResults.action || 'perform the action';

    switch (testType.type) {
      case 'Functional':
        steps.push(
          { step: 1, action: 'Navigate to the feature', expected: 'Feature page loads' },
          { step: 2, action: `Perform: ${action}`, expected: 'Action is accepted' },
          { step: 3, action: 'Verify the result', expected: nlpResults.benefit || 'Expected outcome achieved' }
        );
        break;
      case 'Security':
        steps.push(
          { step: 1, action: 'Identify input fields', expected: 'Fields identified' },
          { step: 2, action: 'Attempt malicious input injection', expected: 'Input sanitized/rejected' },
          { step: 3, action: 'Verify no security breach occurred', expected: 'System remains secure' }
        );
        break;
      case 'Boundary':
        steps.push(
          { step: 1, action: 'Input minimum valid value', expected: 'Value accepted' },
          { step: 2, action: 'Input maximum valid value', expected: 'Value accepted' },
          { step: 3, action: 'Input value below minimum', expected: 'Appropriate error displayed' },
          { step: 4, action: 'Input value above maximum', expected: 'Appropriate error displayed' }
        );
        break;
      default:
        steps.push(
          { step: 1, action: 'Setup test environment', expected: 'Environment ready' },
          { step: 2, action: `Execute: ${action}`, expected: 'Action completed' },
          { step: 3, action: 'Validate results', expected: 'Results match expectations' }
        );
    }

    return steps;
  }

  generateExpectedResult(testType, nlpResults) {
    if (nlpResults.benefit) {
      return nlpResults.benefit;
    }
    return `The ${testType.type.toLowerCase()} requirements are met successfully`;
  }

  generateTestData(testType, dataFields) {
    const testData = {};

    dataFields.forEach(field => {
      testData[field.name] = {
        valid: this.generateValidTestData(field),
        invalid: this.generateInvalidTestData(field),
        boundary: this.generateBoundaryTestData(field)
      };
    });

    return testData;
  }

  generateValidTestData(field) {
    const type = field.type || 'string';
    switch (type) {
      case 'email': return 'valid.user@example.com';
      case 'number': return 100;
      case 'date': return '2024-06-15';
      case 'phone': return '+1-555-123-4567';
      case 'password': return 'SecureP@ss123!';
      default: return 'ValidTestData';
    }
  }

  generateInvalidTestData(field) {
    const type = field.type || 'string';
    switch (type) {
      case 'email': return ['invalid-email', '@missing.com', 'spaces in@email.com'];
      case 'number': return ['abc', '12.34.56', ''];
      case 'date': return ['32-13-2024', 'not-a-date', '2024/13/45'];
      case 'phone': return ['123', 'abc-def-ghij', ''];
      case 'password': return ['short', '        ', 'nouppercase123!'];
      default: return ['', null, '<script>alert("xss")</script>'];
    }
  }

  generateBoundaryTestData(field) {
    return {
      min: field.min || 0,
      max: field.max || 255,
      belowMin: (field.min || 0) - 1,
      aboveMax: (field.max || 255) + 1
    };
  }

  /**
   * Identify scenarios that might be missing from the user story
   */
  identifyMissingScenarios(nlpResults, testRecommendations) {
    const missing = [];

    // Check for missing error handling
    if (!nlpResults.errorConditions || nlpResults.errorConditions.length === 0) {
      missing.push({
        category: 'Error Handling',
        description: 'No error scenarios defined in the user story',
        suggestion: 'Add acceptance criteria for error conditions and system failures',
        priority: 'HIGH'
      });
    }

    // Check for missing data validation
    if (nlpResults.dataFields.length > 0 && !nlpResults.validationRules) {
      missing.push({
        category: 'Data Validation',
        description: 'Input fields identified but validation rules not specified',
        suggestion: 'Define validation rules (required, format, length, range) for each input field',
        priority: 'HIGH'
      });
    }

    // Check for missing authentication/authorization
    if (nlpResults.requiresAuth && !nlpResults.permissions) {
      missing.push({
        category: 'Authorization',
        description: 'Authentication required but permission levels not specified',
        suggestion: 'Define which user roles can access this feature',
        priority: 'MEDIUM'
      });
    }

    // Check for missing performance criteria
    if (nlpResults.action && !nlpResults.performanceCriteria) {
      missing.push({
        category: 'Performance',
        description: 'No performance criteria specified',
        suggestion: 'Add expected response times and load requirements',
        priority: 'MEDIUM'
      });
    }

    // Check for missing concurrent user scenarios
    if (nlpResults.dataModification && !nlpResults.concurrencyHandling) {
      missing.push({
        category: 'Concurrency',
        description: 'Data modification detected but concurrent access not addressed',
        suggestion: 'Define behavior when multiple users access/modify the same data simultaneously',
        priority: 'MEDIUM'
      });
    }

    // Check for missing audit/logging requirements
    if (nlpResults.sensitiveData || nlpResults.financialTransaction) {
      missing.push({
        category: 'Audit & Compliance',
        description: 'Sensitive operation detected but audit requirements not specified',
        suggestion: 'Define logging and audit trail requirements for compliance',
        priority: 'HIGH'
      });
    }

    return missing;
  }

  /**
   * Calculate test coverage score
   */
  calculateCoverageScore(testRecommendations, edgeCases) {
    let score = 0;
    const maxScore = 100;

    // Test type coverage (40 points max)
    const testTypeCoverage = Math.min(testRecommendations.testTypes.length / 10, 1) * 40;
    score += testTypeCoverage;

    // Edge case coverage (30 points max)
    const totalEdgeCases = Object.values(edgeCases).reduce((sum, arr) => sum + arr.length, 0);
    const edgeCaseCoverage = Math.min(totalEdgeCases / 20, 1) * 30;
    score += edgeCaseCoverage;

    // Priority distribution (30 points max)
    const hasCritical = testRecommendations.testTypes.some(t => t.priority === 'CRITICAL');
    const hasHigh = testRecommendations.testTypes.some(t => t.priority === 'HIGH');
    const hasMedium = testRecommendations.testTypes.some(t => t.priority === 'MEDIUM');
    
    if (hasCritical) score += 15;
    if (hasHigh) score += 10;
    if (hasMedium) score += 5;

    return Math.round(score);
  }

  /**
   * Calculate story completeness score
   */
  calculateCompletenessScore(nlpResults) {
    let score = 0;
    const checks = [
      { condition: nlpResults.actor, weight: 15 },
      { condition: nlpResults.action, weight: 20 },
      { condition: nlpResults.benefit, weight: 15 },
      { condition: nlpResults.acceptanceCriteria?.length > 0, weight: 20 },
      { condition: nlpResults.dataFields?.length > 0, weight: 10 },
      { condition: nlpResults.errorConditions?.length > 0, weight: 10 },
      { condition: nlpResults.dependencies?.length > 0, weight: 5 },
      { condition: nlpResults.validationRules, weight: 5 }
    ];

    checks.forEach(check => {
      if (check.condition) score += check.weight;
    });

    return score;
  }

  /**
   * Calculate testability score
   */
  calculateTestabilityScore(nlpResults) {
    let score = 100;
    
    // Deduct for ambiguities
    if (nlpResults.ambiguities) {
      score -= nlpResults.ambiguities.length * 5;
    }

    // Deduct for vague language
    if (nlpResults.vagueTerms) {
      score -= nlpResults.vagueTerms.length * 3;
    }

    // Deduct for missing acceptance criteria
    if (!nlpResults.acceptanceCriteria || nlpResults.acceptanceCriteria.length === 0) {
      score -= 20;
    }

    // Add points for clear structure
    if (nlpResults.hasGivenWhenThen) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate executive summary
   */
  generateSummary(riskAssessment, testRecommendations, edgeCases) {
    const criticalTests = testRecommendations.testTypes.filter(t => t.priority === 'CRITICAL').length;
    const highTests = testRecommendations.testTypes.filter(t => t.priority === 'HIGH').length;
    const totalEdgeCases = Object.values(edgeCases).reduce((sum, arr) => sum + arr.length, 0);

    return {
      headline: `Risk Level: ${riskAssessment.riskLevel} (Score: ${riskAssessment.overallScore}/10)`,
      keyFindings: [
        `${criticalTests} critical and ${highTests} high priority test areas identified`,
        `${totalEdgeCases} edge cases and boundary conditions to verify`,
        `${riskAssessment.hotspots.length} high-risk areas require extra attention`
      ],
      recommendation: this.getOverallRecommendation(riskAssessment.riskLevel),
      estimatedTestEffort: testRecommendations.estimatedEffort
    };
  }

  getOverallRecommendation(riskLevel) {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'Extensive testing required. Consider dedicated security and performance testing cycles.';
      case 'HIGH':
        return 'Thorough testing recommended. Prioritize security and edge case coverage.';
      case 'MEDIUM':
        return 'Standard testing approach with attention to identified risk areas.';
      case 'LOW':
        return 'Basic testing sufficient. Focus on core functionality and regression.';
      default:
        return 'Assess risks and plan testing accordingly.';
    }
  }
}

module.exports = new AnalysisEngine();
