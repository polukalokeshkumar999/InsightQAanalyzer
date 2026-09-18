/**
 * Risk Analyzer
 * Identifies and scores risks in user stories
 */

class RiskAnalyzer {
  constructor() {
    // Risk factors with weights
    this.riskFactors = {
      security: {
        weight: 3.0,
        keywords: ['authentication', 'authorization', 'password', 'login', 'security', 
                   'encrypt', 'token', 'session', 'permission', 'role', 'admin', 'access control']
      },
      financial: {
        weight: 2.8,
        keywords: ['payment', 'transaction', 'money', 'credit', 'debit', 'billing',
                   'purchase', 'refund', 'invoice', 'price', 'cost', 'currency']
      },
      dataIntegrity: {
        weight: 2.5,
        keywords: ['create', 'update', 'delete', 'modify', 'save', 'edit', 'remove',
                   'database', 'record', 'data', 'import', 'export', 'migrate']
      },
      integration: {
        weight: 2.3,
        keywords: ['api', 'integration', 'third-party', 'external', 'service',
                   'connect', 'sync', 'webhook', 'endpoint']
      },
      performance: {
        weight: 2.0,
        keywords: ['performance', 'speed', 'fast', 'load', 'concurrent', 'bulk',
                   'batch', 'large', 'scale', 'real-time', 'milliseconds']
      },
      userExperience: {
        weight: 1.5,
        keywords: ['user', 'interface', 'display', 'view', 'navigate', 'search',
                   'filter', 'sort', 'responsive', 'mobile', 'accessibility']
      },
      compliance: {
        weight: 2.7,
        keywords: ['gdpr', 'hipaa', 'pci', 'compliance', 'regulation', 'audit',
                   'privacy', 'consent', 'personal data', 'pii']
      },
      complexity: {
        weight: 2.0,
        keywords: ['workflow', 'process', 'multiple', 'condition', 'rule', 'logic',
                   'calculation', 'algorithm', 'validation']
      }
    };

    // High-risk patterns
    this.highRiskPatterns = [
      { pattern: /credit\s*card|payment|transaction/i, risk: 'financial', score: 3 },
      { pattern: /password|authentication|login/i, risk: 'security', score: 3 },
      { pattern: /admin|superuser|root/i, risk: 'security', score: 2.5 },
      { pattern: /delete|remove|destroy/i, risk: 'dataIntegrity', score: 2 },
      { pattern: /third.?party|external\s*api/i, risk: 'integration', score: 2 },
      { pattern: /concurrent|simultaneous|parallel/i, risk: 'performance', score: 2 },
      { pattern: /pii|personal\s*(?:data|information)/i, risk: 'compliance', score: 2.5 },
      { pattern: /bulk|batch|mass\s+(?:update|delete|create)/i, risk: 'dataIntegrity', score: 2 }
    ];
  }

  /**
   * Analyze risks in the user story
   */
  async analyze(userStory, nlpResults) {
    const lowerStory = userStory.toLowerCase();
    const factors = [];
    let totalScore = 0;
    const hotspots = [];

    // Analyze each risk factor
    for (const [category, config] of Object.entries(this.riskFactors)) {
      const matchedKeywords = config.keywords.filter(keyword => 
        lowerStory.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        const factorScore = Math.min(matchedKeywords.length * config.weight * 0.5, config.weight);
        factors.push({
          category,
          score: Math.round(factorScore * 10) / 10,
          weight: config.weight,
          matchedKeywords,
          impact: this.getImpactLevel(factorScore, config.weight)
        });
        totalScore += factorScore;
      }
    }

    // Check for high-risk patterns
    this.highRiskPatterns.forEach(({ pattern, risk, score }) => {
      if (pattern.test(userStory)) {
        const existingFactor = factors.find(f => f.category === risk);
        if (existingFactor) {
          existingFactor.score += score;
          totalScore += score;
        } else {
          factors.push({
            category: risk,
            score,
            impact: 'HIGH',
            pattern: pattern.toString()
          });
          totalScore += score;
        }

        hotspots.push({
          type: risk,
          description: this.getHotspotDescription(risk, pattern),
          severity: this.getSeverity(score),
          recommendation: this.getHotspotRecommendation(risk)
        });
      }
    });

    // Additional risk checks based on NLP results
    const additionalRisks = this.analyzeNLPRisks(nlpResults);
    factors.push(...additionalRisks.factors);
    totalScore += additionalRisks.additionalScore;
    hotspots.push(...additionalRisks.hotspots);

    // Normalize score to 0-10 scale
    const normalizedScore = Math.min(Math.round(totalScore * 10) / 10, 10);

    return {
      overallScore: normalizedScore,
      riskLevel: this.getRiskLevel(normalizedScore),
      factors: factors.sort((a, b) => b.score - a.score),
      hotspots: hotspots.sort((a, b) => this.severityOrder(b.severity) - this.severityOrder(a.severity)),
      riskBreakdown: this.generateRiskBreakdown(factors),
      mitigationStrategies: this.generateMitigationStrategies(factors, hotspots)
    };
  }

  /**
   * Analyze risks from NLP results
   */
  analyzeNLPRisks(nlpResults) {
    const factors = [];
    const hotspots = [];
    let additionalScore = 0;

    // Risk from sensitive data
    if (nlpResults.sensitiveData) {
      factors.push({
        category: 'dataSensitivity',
        score: 2.5,
        impact: 'HIGH',
        reason: 'Story involves sensitive/personal data'
      });
      additionalScore += 2.5;
      
      hotspots.push({
        type: 'dataSensitivity',
        description: 'Sensitive data handling detected',
        severity: 'HIGH',
        recommendation: 'Implement data encryption, masking, and access controls'
      });
    }

    // Risk from financial transactions
    if (nlpResults.financialTransaction) {
      factors.push({
        category: 'financial',
        score: 3,
        impact: 'CRITICAL',
        reason: 'Financial transaction processing detected'
      });
      additionalScore += 3;
      
      hotspots.push({
        type: 'financial',
        description: 'Financial transaction processing',
        severity: 'CRITICAL',
        recommendation: 'Implement transaction logging, rollback mechanisms, and fraud detection'
      });
    }

    // Risk from data modification
    if (nlpResults.dataModification) {
      factors.push({
        category: 'dataModification',
        score: 1.5,
        impact: 'MEDIUM',
        reason: 'Data modification operations detected'
      });
      additionalScore += 1.5;
    }

    // Risk from ambiguities
    if (nlpResults.ambiguities && nlpResults.ambiguities.length > 2) {
      factors.push({
        category: 'ambiguity',
        score: 1,
        impact: 'MEDIUM',
        reason: `${nlpResults.ambiguities.length} ambiguous terms detected`
      });
      additionalScore += 1;
      
      hotspots.push({
        type: 'ambiguity',
        description: 'Multiple ambiguities may lead to incorrect implementation',
        severity: 'MEDIUM',
        recommendation: 'Clarify requirements with stakeholders before testing'
      });
    }

    // Risk from missing acceptance criteria
    if (!nlpResults.acceptanceCriteria || nlpResults.acceptanceCriteria.length === 0) {
      factors.push({
        category: 'incompleteness',
        score: 1.5,
        impact: 'MEDIUM',
        reason: 'No explicit acceptance criteria defined'
      });
      additionalScore += 1.5;
    }

    // Risk from complex dependencies
    if (nlpResults.dependencies && nlpResults.dependencies.length > 2) {
      factors.push({
        category: 'dependency',
        score: 1.5,
        impact: 'MEDIUM',
        reason: `Multiple dependencies (${nlpResults.dependencies.length}) increase integration risk`
      });
      additionalScore += 1.5;
    }

    return { factors, hotspots, additionalScore };
  }

  getImpactLevel(score, maxWeight) {
    const ratio = score / maxWeight;
    if (ratio > 0.7) return 'HIGH';
    if (ratio > 0.4) return 'MEDIUM';
    return 'LOW';
  }

  getRiskLevel(score) {
    if (score >= 7) return 'CRITICAL';
    if (score >= 5) return 'HIGH';
    if (score >= 3) return 'MEDIUM';
    return 'LOW';
  }

  getSeverity(score) {
    if (score >= 2.5) return 'CRITICAL';
    if (score >= 2) return 'HIGH';
    if (score >= 1) return 'MEDIUM';
    return 'LOW';
  }

  severityOrder(severity) {
    const order = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return order[severity] || 0;
  }

  getHotspotDescription(risk, pattern) {
    const descriptions = {
      'financial': 'Financial transaction processing requires robust error handling and security',
      'security': 'Security-sensitive operation requires thorough authentication/authorization testing',
      'dataIntegrity': 'Data modification operations need comprehensive validation testing',
      'integration': 'External integration introduces dependency and failure point risks',
      'performance': 'Performance-critical operations need load and stress testing',
      'compliance': 'Compliance-related data requires audit trail and privacy testing'
    };
    return descriptions[risk] || 'High-risk area requiring additional testing attention';
  }

  getHotspotRecommendation(risk) {
    const recommendations = {
      'financial': 'Test all edge cases including partial failures, timeouts, and rollback scenarios',
      'security': 'Include penetration testing, SQL injection, XSS, and session hijacking tests',
      'dataIntegrity': 'Test concurrent modifications, validation rules, and data consistency',
      'integration': 'Test API failure scenarios, timeout handling, and data format validation',
      'performance': 'Conduct load testing with expected peak volumes and measure response times',
      'compliance': 'Verify data retention, consent management, and audit logging'
    };
    return recommendations[risk] || 'Conduct thorough exploratory testing';
  }

  generateRiskBreakdown(factors) {
    const breakdown = {
      critical: factors.filter(f => f.impact === 'CRITICAL'),
      high: factors.filter(f => f.impact === 'HIGH'),
      medium: factors.filter(f => f.impact === 'MEDIUM'),
      low: factors.filter(f => f.impact === 'LOW')
    };

    return {
      ...breakdown,
      summary: {
        criticalCount: breakdown.critical.length,
        highCount: breakdown.high.length,
        mediumCount: breakdown.medium.length,
        lowCount: breakdown.low.length
      }
    };
  }

  generateMitigationStrategies(factors, hotspots) {
    const strategies = [];

    // Generate strategies based on identified risks
    const uniqueCategories = [...new Set(factors.map(f => f.category))];
    
    uniqueCategories.forEach(category => {
      const strategy = this.getMitigationStrategy(category);
      if (strategy) {
        strategies.push(strategy);
      }
    });

    return strategies;
  }

  getMitigationStrategy(category) {
    const strategies = {
      'security': {
        category: 'Security',
        actions: [
          'Implement security testing as part of CI/CD pipeline',
          'Conduct OWASP Top 10 vulnerability assessment',
          'Review authentication and authorization mechanisms',
          'Test session management and token handling'
        ],
        tools: ['OWASP ZAP', 'Burp Suite', 'SonarQube']
      },
      'financial': {
        category: 'Financial',
        actions: [
          'Implement idempotency for all transaction operations',
          'Test rollback and recovery scenarios',
          'Verify audit trail completeness',
          'Test edge cases for currency and rounding'
        ],
        tools: ['Transaction monitoring tools', 'Fraud detection systems']
      },
      'dataIntegrity': {
        category: 'Data Integrity',
        actions: [
          'Test database constraints and validation rules',
          'Verify cascading operations behavior',
          'Test concurrent modification scenarios',
          'Implement and test backup/recovery procedures'
        ],
        tools: ['Database testing tools', 'Data comparison utilities']
      },
      'integration': {
        category: 'Integration',
        actions: [
          'Mock external services for isolated testing',
          'Test API contract compliance',
          'Verify error handling for service failures',
          'Test timeout and retry mechanisms'
        ],
        tools: ['Postman', 'WireMock', 'Pact']
      },
      'performance': {
        category: 'Performance',
        actions: [
          'Establish performance baselines',
          'Conduct load testing with realistic scenarios',
          'Test under resource constraints',
          'Monitor and profile critical paths'
        ],
        tools: ['JMeter', 'Gatling', 'K6', 'Application Performance Monitoring']
      },
      'compliance': {
        category: 'Compliance',
        actions: [
          'Verify data classification and handling',
          'Test consent management workflows',
          'Audit data retention policies',
          'Verify access logging completeness'
        ],
        tools: ['Compliance scanning tools', 'Audit log analyzers']
      }
    };

    return strategies[category] || null;
  }
}

module.exports = new RiskAnalyzer();
