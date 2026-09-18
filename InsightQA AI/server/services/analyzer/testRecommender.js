/**
 * Test Recommender
 * Generates prioritized test type recommendations based on user story analysis
 */

class TestRecommender {
  constructor() {
    // Test type definitions with triggering conditions
    this.testTypes = {
      functional: {
        name: 'Functional',
        description: 'Verify core functionality works as specified',
        defaultPriority: 'HIGH',
        triggers: ['action', 'feature', 'requirement'],
        effortHours: 4
      },
      boundary: {
        name: 'Boundary Value',
        description: 'Test edge values and limits for input fields',
        defaultPriority: 'HIGH',
        triggers: ['input', 'field', 'range', 'limit', 'maximum', 'minimum', 'number', 'amount'],
        effortHours: 3
      },
      negative: {
        name: 'Negative',
        description: 'Test invalid inputs and error handling',
        defaultPriority: 'HIGH',
        triggers: ['validation', 'error', 'invalid', 'reject', 'fail', 'no matching', 'not found'],
        effortHours: 3
      },
      security: {
        name: 'Security',
        description: 'Test authentication, authorization, and data protection',
        defaultPriority: 'CRITICAL',
        triggers: ['login', 'password', 'authentication', 'authorize', 'permission', 'encrypt', 'secure', 'token', 'admin'],
        effortHours: 8
      },
      integration: {
        name: 'Integration',
        description: 'Test interactions between systems and components',
        defaultPriority: 'HIGH',
        triggers: ['api', 'integration', 'connect', 'sync', 'database', 'external'],
        effortHours: 6
      },
      performance: {
        name: 'Performance',
        description: 'Test response times, load handling, and scalability',
        defaultPriority: 'MEDIUM',
        triggers: ['fast', 'performance', 'load', 'concurrent', 'scale', 'bulk', 'batch', 'real-time', 'speed', 'records per page', 'pagination'],
        effortHours: 6
      },
      usability: {
        name: 'Usability',
        description: 'Test user experience and interface clarity',
        defaultPriority: 'MEDIUM',
        triggers: ['user', 'interface', 'display', 'view', 'navigate', 'experience', 'intuitive'],
        effortHours: 4
      },
      accessibility: {
        name: 'Accessibility',
        description: 'Test compliance with WCAG guidelines',
        defaultPriority: 'MEDIUM',
        triggers: ['accessibility', 'screen reader', 'keyboard', 'aria', 'wcag', 'disability'],
        effortHours: 4
      },
      regression: {
        name: 'Regression',
        description: 'Ensure existing functionality is not broken',
        defaultPriority: 'HIGH',
        triggers: ['modify', 'update', 'change', 'enhance', 'fix', 'refactor'],
        effortHours: 4
      },
      smoke: {
        name: 'Smoke',
        description: 'Quick verification of critical paths',
        defaultPriority: 'HIGH',
        triggers: ['critical', 'core', 'essential', 'primary'],
        effortHours: 1
      },
      dataValidation: {
        name: 'Data Validation',
        description: 'Test data format, type, and constraint validation',
        defaultPriority: 'HIGH',
        triggers: ['email', 'phone', 'date', 'format', 'validate', 'constraint', 'required'],
        effortHours: 3
      },
      workflow: {
        name: 'Workflow/Process',
        description: 'Test end-to-end business workflows',
        defaultPriority: 'HIGH',
        triggers: ['workflow', 'process', 'step', 'sequence', 'flow', 'journey', 'scenario'],
        effortHours: 5
      },
      crossBrowser: {
        name: 'Cross-Browser',
        description: 'Test compatibility across different browsers',
        defaultPriority: 'MEDIUM',
        triggers: ['browser', 'chrome', 'firefox', 'safari', 'edge', 'compatibility', 'web'],
        effortHours: 4
      },
      mobile: {
        name: 'Mobile/Responsive',
        description: 'Test on mobile devices and different screen sizes',
        defaultPriority: 'MEDIUM',
        triggers: ['mobile', 'responsive', 'tablet', 'phone', 'ios', 'android', 'screen'],
        effortHours: 4
      },
      localization: {
        name: 'Localization',
        description: 'Test language, currency, and regional settings',
        defaultPriority: 'LOW',
        triggers: ['language', 'locale', 'currency', 'region', 'translate', 'international'],
        effortHours: 3
      },
      api: {
        name: 'API',
        description: 'Test API contracts, responses, and error handling',
        defaultPriority: 'HIGH',
        triggers: ['api', 'endpoint', 'rest api', 'graphql', 'http'],
        effortHours: 5
      },
      database: {
        name: 'Database',
        description: 'Test data persistence, queries, and integrity',
        defaultPriority: 'HIGH',
        triggers: ['database', 'sql', 'query', 'save', 'store', 'persist', 'backend', 'back end'],
        effortHours: 4
      },
      exploratory: {
        name: 'Exploratory',
        description: 'Unscripted testing to discover edge cases',
        defaultPriority: 'MEDIUM',
        triggers: [], // Always recommended
        effortHours: 4
      }
    };
  }

  /**
   * Generate test recommendations
   */
  async recommend(userStory, nlpResults, riskAssessment) {
    const lowerStory = userStory.toLowerCase();
    const recommendations = [];
    const priorityMatrix = [];

    // Analyze each test type
    for (const [key, testType] of Object.entries(this.testTypes)) {
      const matchedTriggers = testType.triggers.filter(trigger => this.containsTerm(lowerStory, trigger));

      const matchScore = matchedTriggers.length;
      let priority = this.calculatePriority(testType, matchScore, nlpResults, riskAssessment);
      let scenarios = this.generateScenarios(key, nlpResults);

      if (matchScore > 0 || key === 'functional' || key === 'exploratory') {
        recommendations.push({
          type: testType.name,
          key,
          priority,
          description: testType.description,
          matchedTriggers,
          matchScore,
          scenarios,
          estimatedHours: testType.effortHours,
          techniques: this.getTechniques(key),
          tools: this.getToolsForTestType(key)
        });

        // Add to priority matrix
        priorityMatrix.push({
          testType: testType.name,
          priority,
          coverage: this.estimateCoverage(key, nlpResults),
          effort: testType.effortHours,
          riskMitigation: this.getRiskMitigation(key, riskAssessment)
        });
      }
    }

    // Sort by priority
    recommendations.sort((a, b) => this.priorityOrder(b.priority) - this.priorityOrder(a.priority));
    priorityMatrix.sort((a, b) => this.priorityOrder(b.priority) - this.priorityOrder(a.priority));

    // Calculate estimated total effort
    const estimatedEffort = this.calculateTotalEffort(recommendations);

    return {
      testTypes: recommendations,
      priorityMatrix,
      estimatedEffort,
      testingStrategy: this.generateTestingStrategy(recommendations, riskAssessment),
      automationRecommendations: this.getAutomationRecommendations(recommendations)
    };
  }

  containsTerm(text, term) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`(^|[^a-z0-9])${escapedTerm}(?=$|[^a-z0-9])`, 'i').test(text);
  }

  /**
   * Calculate priority based on multiple factors
   */
  calculatePriority(testType, matchScore, nlpResults, riskAssessment) {
    let priorityScore = 0;

    // Base score from match count
    priorityScore += matchScore * 10;

    // Adjust based on risk assessment
    if (riskAssessment.riskLevel === 'CRITICAL') {
      priorityScore += 30;
    } else if (riskAssessment.riskLevel === 'HIGH') {
      priorityScore += 20;
    } else if (riskAssessment.riskLevel === 'MEDIUM') {
      priorityScore += 10;
    }

    // Adjust based on story characteristics
    if (nlpResults.sensitiveData && ['security', 'dataValidation'].includes(testType.key)) {
      priorityScore += 25;
    }

    if (nlpResults.financialTransaction && ['security', 'integration', 'functional'].includes(testType.key)) {
      priorityScore += 25;
    }

    if (nlpResults.dataFields?.length > 0 && ['boundary', 'negative', 'dataValidation'].includes(testType.key)) {
      priorityScore += 15;
    }

    if (nlpResults.dependencies?.length > 0 && testType.key === 'integration') {
      priorityScore += 20;
    }

    // Map score to priority level
    if (priorityScore >= 50) return 'CRITICAL';
    if (priorityScore >= 30) return 'HIGH';
    if (priorityScore >= 15) return 'MEDIUM';
    return 'LOW';
  }

  priorityOrder(priority) {
    const order = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return order[priority] || 0;
  }

  /**
   * Generate specific test scenarios for each test type
   */
  generateScenarios(testTypeKey, nlpResults) {
    const scenarios = [];
    const action = nlpResults.action || 'perform the action';
    const actor = nlpResults.actor || 'user';

    switch (testTypeKey) {
      case 'functional':
        scenarios.push(
          `Verify ${actor} can successfully ${action}`,
          `Verify system behaves correctly after ${action}`
        );
        nlpResults.acceptanceCriteria?.slice(0, 6).forEach(criterion => {
          scenarios.push(`Verify ${criterion.text}`);
        });
        if (nlpResults.benefit) {
          scenarios.push(`Verify ${nlpResults.benefit} is achieved`);
        }
        break;

      case 'boundary':
        nlpResults.dataFields?.forEach(field => {
          if (field.type === 'number' || field.type === 'date') {
            scenarios.push(
              `Test ${field.name} at its minimum supported value`,
              `Test ${field.name} at its maximum supported value`,
              `Test ${field.name} immediately outside each supported boundary`
            );
          } else {
            scenarios.push(
              `Test ${field.name} with an empty value`,
              `Test ${field.name} with one character`,
              `Test ${field.name} at and beyond its maximum supported length`
            );
          }
        });
        if (scenarios.length === 0) {
          scenarios.push(
            'Test input fields with minimum valid values',
            'Test input fields with maximum valid values',
            'Test boundary conditions for all numeric inputs'
          );
        }
        break;

      case 'negative':
        nlpResults.dataFields?.forEach(field => {
          scenarios.push(
            `Test ${field.name} with empty/null value`,
            `Test ${field.name} with invalid format`,
            `Test ${field.name} with special characters`
          );
        });
        scenarios.push(
          'Verify invalid input combinations do not return misleading results',
          'Verify appropriate error messages are displayed'
        );
        if (nlpResults.actions?.some(item => item.type === 'search')) {
          scenarios.push(
            'Search with an empty value and verify the documented behavior',
            'Search with a value that has no matching records and verify the empty-result message',
            'Search with unsupported characters and verify the page remains stable'
          );
        }
        break;

      case 'security':
        if (nlpResults.dataFields?.length > 0) {
          scenarios.push('Verify search and input values are safely handled without injection or script execution');
        }
        scenarios.push(`Verify ${actor} has permission to ${action}`);
        if (nlpResults.requiresAuth) {
          scenarios.push(
            'Verify unauthenticated users cannot access the feature',
            'Test session timeout handling',
            'Test concurrent session behavior'
          );
        }
        if (nlpResults.sensitiveData) {
          scenarios.push('Verify sensitive business data is encrypted and masked where required');
        }
        break;

      case 'integration':
        nlpResults.dependencies?.forEach(dep => {
          scenarios.push(
            `Test integration with ${dep.name}`,
            `Test error handling when ${dep.name} is unavailable`,
            `Test data synchronization with ${dep.name}`
          );
        });
        if (nlpResults.dependencies?.length > 0) {
          scenarios.push('Verify data consistency across connected systems');
        }
        break;

      case 'performance':
        scenarios.push(
          'Measure response time under normal load',
          'Test behavior under peak load conditions',
          'Test system recovery after load spike',
          'Measure resource utilization during operations'
        );
        if (nlpResults.performanceContext?.timeRequirements?.length > 0) {
          nlpResults.performanceContext.timeRequirements.forEach(req => {
            scenarios.push(`Verify response time is within ${req.value} ${req.unit}`);
          });
        }
        if (nlpResults.actions?.some(item => item.type === 'search')) {
          scenarios.push(
            'Measure search response time with the largest supported result set',
            'Verify sorting and pagination remain responsive across consecutive searches'
          );
        }
        break;

      case 'usability':
        scenarios.push(
          `Verify ${actor} can easily ${action}`,
          'Verify labels, controls, and result feedback are clear',
          'Verify empty, loading, and error states explain the next action'
        );
        break;

      case 'accessibility':
        scenarios.push(
          'Test keyboard navigation',
          'Verify screen reader compatibility',
          'Test color contrast ratios',
          'Verify focus indicators',
          'Test with assistive technologies'
        );
        break;

      case 'regression':
        scenarios.push(
          'Verify existing functionality still works',
          'Test related features for side effects',
          'Run automated regression test suite',
          'Verify no performance degradation'
        );
        break;

      case 'dataValidation':
        nlpResults.dataFields?.forEach(field => {
          scenarios.push(
            `Verify ${field.name} accepts documented valid values`,
            `Verify ${field.name} rejects unsupported formats and characters`,
            field.required
              ? `Verify ${field.name} is enforced as required`
              : `Verify empty ${field.name} follows the documented optional-field behavior`
          );
          if (field.type === 'email') {
            scenarios.push('Test email format variations');
          } else if (field.type === 'phone') {
            scenarios.push('Test phone number format variations');
          } else if (field.type === 'date') {
            scenarios.push('Test date format and valid ranges');
          }
        });
        break;

      case 'workflow':
        scenarios.push(
          'Test complete end-to-end workflow',
          'Test workflow with interruptions',
          'Test workflow steps out of order',
          'Verify state persistence between steps'
        );
        break;

      case 'api':
        scenarios.push(
          `Verify the API contract supporting ${action}`,
          'Verify documented success and error status codes',
          'Verify request validation and error response structure'
        );
        break;

      case 'database':
        scenarios.push(
          `Verify stored data returned for ${action} is accurate`,
          'Verify filtering, sorting, and pagination do not omit or duplicate records',
          'Verify the UI reflects the latest backend data'
        );
        break;

      case 'crossBrowser':
        scenarios.push(
          `Verify ${action} in each supported browser`,
          'Verify controls, tables, and result layouts remain consistent across browsers',
          'Verify keyboard interaction and browser zoom do not hide functionality'
        );
        break;

      case 'mobile':
        scenarios.push(
          `Verify ${action} on supported mobile and tablet devices`,
          'Verify controls and result tables remain usable at narrow widths',
          'Verify touch interaction, orientation changes, and scrolling preserve the current state'
        );
        break;

      case 'exploratory':
        scenarios.push(
          `Explore alternate ways for ${actor} to ${action}`,
          'Vary search values, sorting order, pagination, and navigation sequence',
          'Look for inconsistent results, stale state, and unclear feedback'
        );
        break;

      default:
        scenarios.push(
          `Verify ${testTypeKey} requirements`,
          `Test ${testTypeKey} edge cases`
        );
    }

    return scenarios;
  }

  /**
   * Get testing techniques for each test type
   */
  getTechniques(testTypeKey) {
    const techniques = {
      functional: ['Equivalence Partitioning', 'Decision Table', 'State Transition'],
      boundary: ['Boundary Value Analysis', 'Equivalence Partitioning'],
      negative: ['Error Guessing', 'Fault Injection', 'Invalid Input Testing'],
      security: ['Penetration Testing', 'Vulnerability Scanning', 'Code Review'],
      integration: ['Big Bang', 'Top-Down', 'Bottom-Up', 'Contract Testing'],
      performance: ['Load Testing', 'Stress Testing', 'Endurance Testing', 'Spike Testing'],
      usability: ['Heuristic Evaluation', 'User Testing', 'A/B Testing'],
      accessibility: ['WCAG Audit', 'Screen Reader Testing', 'Keyboard Testing'],
      regression: ['Automated Test Suites', 'Risk-Based Selection', 'Impact Analysis'],
      dataValidation: ['Input Validation Testing', 'Format Testing', 'Range Testing'],
      workflow: ['End-to-End Testing', 'Use Case Testing', 'User Journey Testing'],
      api: ['Contract Testing', 'Schema Validation', 'Fuzz Testing'],
      database: ['CRUD Testing', 'Constraint Testing', 'Query Testing'],
      exploratory: ['Session-Based Testing', 'Charter-Based Testing', 'Tour-Based Testing']
    };

    return techniques[testTypeKey] || ['General Testing Techniques'];
  }

  /**
   * Get recommended tools for each test type
   */
  getToolsForTestType(testTypeKey) {
    const tools = {
      functional: ['Selenium', 'Cypress', 'Playwright', 'TestComplete'],
      boundary: ['Manual Testing', 'Data-Driven Testing Tools'],
      negative: ['Manual Testing', 'Fuzzing Tools'],
      security: ['OWASP ZAP', 'Burp Suite', 'Nessus', 'SonarQube'],
      integration: ['Postman', 'REST Assured', 'WireMock', 'Pact'],
      performance: ['JMeter', 'Gatling', 'K6', 'LoadRunner'],
      usability: ['Hotjar', 'UserTesting', 'Lookback'],
      accessibility: ['axe', 'WAVE', 'Lighthouse', 'NVDA'],
      regression: ['Selenium', 'TestNG', 'JUnit', 'pytest'],
      dataValidation: ['Manual Testing', 'Schema Validators'],
      workflow: ['Cucumber', 'SpecFlow', 'Behave'],
      api: ['Postman', 'Insomnia', 'SoapUI', 'Karate'],
      database: ['DbUnit', 'SQL Test Tools'],
      exploratory: ['Rapid Reporter', 'Session Tester', 'Exploratory Testing Chrome Extension']
    };

    return tools[testTypeKey] || ['Manual Testing'];
  }

  estimateCoverage(testTypeKey, nlpResults) {
    // Simplified coverage estimation
    const baseCoverage = {
      functional: 60,
      boundary: 15,
      negative: 15,
      security: 20,
      integration: 25,
      performance: 10,
      usability: 10,
      accessibility: 5,
      regression: 30,
      dataValidation: 15,
      workflow: 20,
      api: 25,
      database: 15,
      exploratory: 10
    };

    return `${baseCoverage[testTypeKey] || 10}%`;
  }

  getRiskMitigation(testTypeKey, riskAssessment) {
    const highRiskCategories = riskAssessment.factors
      .filter(f => f.impact === 'HIGH' || f.impact === 'CRITICAL')
      .map(f => f.category);

    const mitigationMap = {
      security: ['security', 'authentication', 'authorization'],
      financial: ['financial', 'transaction'],
      integration: ['integration', 'dependency'],
      performance: ['performance', 'scalability'],
      dataValidation: ['dataIntegrity', 'validation'],
      database: ['dataIntegrity', 'data']
    };

    const mitigates = mitigationMap[testTypeKey] || [];
    const mitigatedRisks = mitigates.filter(m => highRiskCategories.includes(m));

    if (mitigatedRisks.length > 0) {
      return `Mitigates: ${mitigatedRisks.join(', ')}`;
    }
    return 'General quality assurance';
  }

  calculateTotalEffort(recommendations) {
    const criticalHours = recommendations
      .filter(r => r.priority === 'CRITICAL')
      .reduce((sum, r) => sum + r.estimatedHours, 0);

    const highHours = recommendations
      .filter(r => r.priority === 'HIGH')
      .reduce((sum, r) => sum + r.estimatedHours, 0);

    const mediumHours = recommendations
      .filter(r => r.priority === 'MEDIUM')
      .reduce((sum, r) => sum + r.estimatedHours, 0);

    const lowHours = recommendations
      .filter(r => r.priority === 'LOW')
      .reduce((sum, r) => sum + r.estimatedHours, 0);

    const totalHours = criticalHours + highHours + mediumHours + lowHours;

    return {
      critical: criticalHours,
      high: highHours,
      medium: mediumHours,
      low: lowHours,
      total: totalHours,
      minimumRecommended: criticalHours + highHours,
      fullCoverage: totalHours,
      estimatedDays: Math.ceil(totalHours / 8)
    };
  }

  generateTestingStrategy(recommendations, riskAssessment) {
    const criticalTests = recommendations.filter(r => r.priority === 'CRITICAL');
    const highTests = recommendations.filter(r => r.priority === 'HIGH');

    return {
      phase1: {
        name: 'Critical Path Testing',
        description: 'Focus on critical functionality and security',
        tests: criticalTests.map(t => t.type),
        duration: `${criticalTests.reduce((sum, t) => sum + t.estimatedHours, 0)} hours`
      },
      phase2: {
        name: 'Comprehensive Testing',
        description: 'Cover all high-priority test areas',
        tests: highTests.map(t => t.type),
        duration: `${highTests.reduce((sum, t) => sum + t.estimatedHours, 0)} hours`
      },
      phase3: {
        name: 'Extended Coverage',
        description: 'Additional testing for edge cases and quality',
        tests: recommendations.filter(r => r.priority === 'MEDIUM').map(t => t.type),
        duration: 'Time permitting'
      },
      riskBasedPrioritization: riskAssessment.riskLevel === 'CRITICAL' || riskAssessment.riskLevel === 'HIGH'
        ? 'Recommended: Increase security and integration testing effort'
        : 'Standard testing approach is sufficient'
    };
  }

  getAutomationRecommendations(recommendations) {
    const automatable = ['functional', 'regression', 'api', 'integration', 'smoke', 'dataValidation'];
    const partiallyAutomatable = ['boundary', 'negative', 'performance', 'accessibility', 'security'];
    const manualPreferred = ['exploratory', 'usability'];

    return {
      fullyAutomatable: recommendations
        .filter(r => automatable.includes(r.key))
        .map(r => ({
          type: r.type,
          recommendation: 'Highly recommended for automation',
          roi: 'High - Reduces regression testing time'
        })),
      partiallyAutomatable: recommendations
        .filter(r => partiallyAutomatable.includes(r.key))
        .map(r => ({
          type: r.type,
          recommendation: 'Automate common scenarios, manual for edge cases',
          roi: 'Medium - Mix of automated and manual testing'
        })),
      manualTesting: recommendations
        .filter(r => manualPreferred.includes(r.key))
        .map(r => ({
          type: r.type,
          recommendation: 'Best performed manually by skilled testers',
          roi: 'Valuable for discovering unexpected issues'
        }))
    };
  }
}

module.exports = new TestRecommender();
