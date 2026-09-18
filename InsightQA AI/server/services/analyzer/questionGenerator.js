/**
 * Question Generator
 * Generates intelligent clarification questions for stakeholders
 */

class QuestionGenerator {
  constructor() {
    // Question templates by category
    this.questionTemplates = {
      functional: [
        { template: 'What should happen when {action} fails?', triggers: ['action'] },
        { template: 'Is there a confirmation required before {action}?', triggers: ['action', 'modify', 'delete'] },
        { template: 'Can the {action} be undone or reversed?', triggers: ['action', 'create', 'update', 'delete'] },
        { template: 'What is the expected behavior when {actor} is not authorized?', triggers: ['actor', 'permission'] },
        { template: 'Are there any prerequisites before {actor} can {action}?', triggers: ['actor', 'action'] }
      ],
      dataValidation: [
        { template: 'What is the maximum length for {field}?', triggers: ['field', 'text', 'input'] },
        { template: 'What characters are allowed in {field}?', triggers: ['field', 'input'] },
        { template: 'Is {field} required or optional?', triggers: ['field'] },
        { template: 'What is the valid range for {field}?', triggers: ['number', 'amount', 'quantity'] },
        { template: 'What date formats are acceptable for {field}?', triggers: ['date', 'time'] },
        { template: 'Should {field} be unique across all records?', triggers: ['field', 'identifier'] }
      ],
      userExperience: [
        { template: 'What message should be displayed after successful {action}?', triggers: ['action', 'submit'] },
        { template: 'Should the user be redirected after {action}? If so, where?', triggers: ['action', 'submit'] },
        { template: 'Is there a loading indicator needed during {action}?', triggers: ['action'] },
        { template: 'What happens if the user navigates away during {action}?', triggers: ['action', 'process'] }
      ],
      security: [
        { template: 'What authentication method is required for this feature?', triggers: ['login', 'secure', 'protected'] },
        { template: 'Which user roles should have access to this feature?', triggers: ['permission', 'role', 'access'] },
        { template: 'Should sensitive data like {field} be masked or encrypted?', triggers: ['password', 'credit', 'ssn', 'personal'] },
        { template: 'Is there a session timeout for this feature?', triggers: ['session', 'login', 'authenticated'] },
        { template: 'Should failed attempts be logged for audit purposes?', triggers: ['login', 'authentication', 'security'] }
      ],
      performance: [
        { template: 'What is the expected response time for {action}?', triggers: ['action', 'load', 'search'] },
        { template: 'How many concurrent users should the feature support?', triggers: ['user', 'concurrent', 'multiple'] },
        { template: 'What is the maximum number of records to display per page?', triggers: ['list', 'display', 'search', 'view'] },
        { template: 'Is there a timeout period for {action}?', triggers: ['action', 'process', 'load'] }
      ],
      integration: [
        { template: 'What should happen if {dependency} is unavailable?', triggers: ['api', 'service', 'integration'] },
        { template: 'Is real-time sync required with {dependency}?', triggers: ['sync', 'integration', 'update'] },
        { template: 'What is the expected format for data from {dependency}?', triggers: ['api', 'import', 'integration'] },
        { template: 'Are there rate limits to consider with {dependency}?', triggers: ['api', 'external', 'service'] }
      ],
      businessRules: [
        { template: 'Are there any business rules that apply to {action}?', triggers: ['action'] },
        { template: 'What calculations or formulas are used for {field}?', triggers: ['calculate', 'total', 'amount', 'price'] },
        { template: 'Are there different rules for different {actor} types?', triggers: ['actor', 'role', 'user'] },
        { template: 'What are the conditions for {action} to be considered complete?', triggers: ['action', 'workflow', 'process'] }
      ],
      notifications: [
        { template: 'Should an email/notification be sent after {action}?', triggers: ['submit', 'create', 'register', 'complete'] },
        { template: 'Who should be notified when {action} occurs?', triggers: ['action', 'event', 'trigger'] },
        { template: 'What is the content/template for {action} notification?', triggers: ['notify', 'email', 'alert'] }
      ],
      errorHandling: [
        { template: 'What error message should be shown when {condition}?', triggers: ['error', 'fail', 'invalid'] },
        { template: 'How should validation errors be displayed to the user?', triggers: ['validation', 'invalid', 'error'] },
        { template: 'Should errors be logged for troubleshooting?', triggers: ['error', 'fail', 'exception'] },
        { template: 'Is there a retry mechanism for {action}?', triggers: ['fail', 'error', 'timeout'] }
      ]
    };
  }

  /**
   * Generate clarification questions based on story analysis
   */
  async generate(userStory, nlpResults) {
    const questions = [];
    const lowerStory = userStory.toLowerCase();

    // Generate questions for each category
    for (const [category, templates] of Object.entries(this.questionTemplates)) {
      const categoryQuestions = this.generateCategoryQuestions(category, templates, nlpResults, lowerStory);
      questions.push(...categoryQuestions);
    }

    // Generate questions based on ambiguities
    const ambiguityQuestions = this.generateAmbiguityQuestions(nlpResults);
    questions.push(...ambiguityQuestions);

    // Generate questions for missing information
    const missingInfoQuestions = this.generateMissingInfoQuestions(nlpResults);
    questions.push(...missingInfoQuestions);

    // Generate specific questions based on detected patterns
    const patternQuestions = this.generatePatternBasedQuestions(userStory, nlpResults);
    questions.push(...patternQuestions);

    // Deduplicate and prioritize
    const uniqueQuestions = this.deduplicateQuestions(questions);
    const prioritizedQuestions = this.prioritizeQuestions(uniqueQuestions, nlpResults);

    return prioritizedQuestions;
  }

  /**
   * Generate questions for a specific category
   */
  generateCategoryQuestions(category, templates, nlpResults, lowerStory) {
    const questions = [];

    templates.forEach(({ template, triggers }) => {
      const isTriggered = triggers.some(trigger => {
        if (trigger === 'field' && nlpResults.dataFields?.length > 0) return true;
        if (trigger === 'actor' && nlpResults.actor) return true;
        if (trigger === 'action' && nlpResults.action) return true;
        if (trigger === 'dependency' && nlpResults.dependencies?.length > 0) return true;
        return lowerStory.includes(trigger);
      });

      if (isTriggered) {
        // Fill in template variables
        let question = template;
        
        if (template.includes('{actor}') && nlpResults.actor) {
          question = question.replace('{actor}', nlpResults.actor);
        }
        if (template.includes('{action}') && nlpResults.action) {
          question = question.replace('{action}', nlpResults.action);
        }
        if (template.includes('{field}') && nlpResults.dataFields?.length > 0) {
          // Generate question for each field
          nlpResults.dataFields.forEach(field => {
            const fieldQuestion = question.replace('{field}', field.name);
            questions.push({
              question: fieldQuestion,
              category,
              context: `Related to ${field.name} field`,
              priority: this.getQuestionPriority(category, field)
            });
          });
          return; // Skip adding the template question
        }
        if (template.includes('{dependency}') && nlpResults.dependencies?.length > 0) {
          nlpResults.dependencies.forEach(dep => {
            const depQuestion = question.replace('{dependency}', dep.name);
            questions.push({
              question: depQuestion,
              category,
              context: `Related to ${dep.name} integration`,
              priority: 'HIGH'
            });
          });
          return;
        }
        if (template.includes('{condition}')) {
          if (nlpResults.errorConditions?.length > 0) {
            nlpResults.errorConditions.forEach(condition => {
              const condQuestion = question.replace('{condition}', condition.condition);
              questions.push({
                question: condQuestion,
                category,
                context: 'Error handling clarification',
                priority: 'HIGH'
              });
            });
            return;
          }
        }

        // Add question if no variable substitution needed or all variables filled
        if (!question.includes('{')) {
          questions.push({
            question,
            category,
            context: this.getCategoryContext(category),
            priority: this.getQuestionPriority(category)
          });
        }
      }
    });

    return questions;
  }

  /**
   * Generate questions based on detected ambiguities
   */
  generateAmbiguityQuestions(nlpResults) {
    const questions = [];

    nlpResults.ambiguities?.forEach(ambiguity => {
      if (ambiguity.type === 'vague_term') {
        questions.push({
          question: `What specifically does "${ambiguity.term}" mean in this context?`,
          category: 'clarification',
          context: `Ambiguous term: ${ambiguity.term}`,
          priority: 'HIGH',
          suggestion: ambiguity.suggestion
        });
      } else if (ambiguity.type === 'unclear_reference') {
        questions.push({
          question: `What does "${ambiguity.term}" refer to specifically?`,
          category: 'clarification',
          context: 'Unclear reference',
          priority: 'MEDIUM'
        });
      } else if (ambiguity.type === 'undefined_quantity') {
        questions.push({
          question: 'Please specify exact numbers or ranges instead of vague quantities.',
          category: 'clarification',
          context: 'Undefined quantity',
          priority: 'MEDIUM'
        });
      }
    });

    return questions;
  }

  /**
   * Generate questions for missing information
   */
  generateMissingInfoQuestions(nlpResults) {
    const questions = [];

    // Missing actor
    if (!nlpResults.actor) {
      questions.push({
        question: 'Who is the intended user for this feature? (e.g., admin, customer, guest)',
        category: 'requirements',
        context: 'User role not specified',
        priority: 'HIGH'
      });
    }

    // Missing benefit/goal
    if (!nlpResults.benefit) {
      questions.push({
        question: 'What is the business value or benefit of this feature?',
        category: 'requirements',
        context: 'Business value not specified',
        priority: 'MEDIUM'
      });
    }

    // Missing acceptance criteria
    if (!nlpResults.acceptanceCriteria || nlpResults.acceptanceCriteria.length === 0) {
      questions.push({
        question: 'What are the acceptance criteria for this story?',
        category: 'requirements',
        context: 'No acceptance criteria defined',
        priority: 'CRITICAL'
      });
    }

    // Missing error handling
    if (!nlpResults.errorConditions || nlpResults.errorConditions.length === 0) {
      questions.push({
        question: 'What error scenarios should be handled and what are the expected behaviors?',
        category: 'errorHandling',
        context: 'Error handling not specified',
        priority: 'HIGH'
      });
    }

    // Data validation rules
    if (nlpResults.dataFields?.length > 0) {
      const fieldsWithoutRules = nlpResults.dataFields.filter(f => !f.validationRules);
      if (fieldsWithoutRules.length > 0) {
        questions.push({
          question: `What are the validation rules for: ${fieldsWithoutRules.map(f => f.name).join(', ')}?`,
          category: 'dataValidation',
          context: 'Validation rules not specified',
          priority: 'HIGH'
        });
      }
    }

    // Performance requirements
    if (nlpResults.performanceContext?.hasPerformanceRequirements && 
        (!nlpResults.performanceContext.timeRequirements || nlpResults.performanceContext.timeRequirements.length === 0)) {
      questions.push({
        question: 'What are the specific performance requirements (response times, load capacity)?',
        category: 'performance',
        context: 'Performance expectations not defined',
        priority: 'MEDIUM'
      });
    }

    return questions;
  }

  /**
   * Generate questions based on detected patterns
   */
  generatePatternBasedQuestions(userStory, nlpResults) {
    const questions = [];
    const lowerStory = userStory.toLowerCase();

    // Payment/Financial questions
    if (nlpResults.financialTransaction) {
      questions.push(
        {
          question: 'What payment methods should be supported?',
          category: 'businessRules',
          context: 'Financial transaction detected',
          priority: 'HIGH'
        },
        {
          question: 'What happens if the payment fails or is declined?',
          category: 'errorHandling',
          context: 'Financial transaction detected',
          priority: 'CRITICAL'
        },
        {
          question: 'Is there a refund/cancellation policy to implement?',
          category: 'businessRules',
          context: 'Financial transaction detected',
          priority: 'HIGH'
        },
        {
          question: 'What currency support is required?',
          category: 'requirements',
          context: 'Financial transaction detected',
          priority: 'MEDIUM'
        }
      );
    }

    // Search functionality questions
    if (lowerStory.includes('search') || lowerStory.includes('filter')) {
      questions.push(
        {
          question: 'What fields should be searchable?',
          category: 'functional',
          context: 'Search functionality detected',
          priority: 'HIGH'
        },
        {
          question: 'Should search support partial matching, wildcards, or exact match only?',
          category: 'functional',
          context: 'Search functionality detected',
          priority: 'MEDIUM'
        },
        {
          question: 'What should happen when no results are found?',
          category: 'userExperience',
          context: 'Search functionality detected',
          priority: 'MEDIUM'
        }
      );
    }

    // Upload functionality questions
    if (lowerStory.includes('upload') || lowerStory.includes('import') || lowerStory.includes('attach')) {
      questions.push(
        {
          question: 'What file types are allowed for upload?',
          category: 'functional',
          context: 'File upload detected',
          priority: 'HIGH'
        },
        {
          question: 'What is the maximum file size allowed?',
          category: 'functional',
          context: 'File upload detected',
          priority: 'HIGH'
        },
        {
          question: 'Should virus scanning be performed on uploaded files?',
          category: 'security',
          context: 'File upload detected',
          priority: 'HIGH'
        },
        {
          question: 'Where should uploaded files be stored (cloud, local server)?',
          category: 'technical',
          context: 'File upload detected',
          priority: 'MEDIUM'
        }
      );
    }

    // Email/Notification questions
    if (lowerStory.includes('email') || lowerStory.includes('notify') || lowerStory.includes('alert')) {
      questions.push(
        {
          question: 'What triggers should send notifications?',
          category: 'notifications',
          context: 'Notification functionality detected',
          priority: 'HIGH'
        },
        {
          question: 'What is the email template content?',
          category: 'notifications',
          context: 'Notification functionality detected',
          priority: 'MEDIUM'
        },
        {
          question: 'Should notifications be configurable by the user?',
          category: 'functional',
          context: 'Notification functionality detected',
          priority: 'LOW'
        }
      );
    }

    // Report/Export questions
    if (lowerStory.includes('report') || lowerStory.includes('export') || lowerStory.includes('download')) {
      questions.push(
        {
          question: 'What export formats should be supported (PDF, CSV, Excel)?',
          category: 'functional',
          context: 'Export functionality detected',
          priority: 'HIGH'
        },
        {
          question: 'Should reports include company branding/logo?',
          category: 'userExperience',
          context: 'Report functionality detected',
          priority: 'LOW'
        },
        {
          question: 'What data should be included in the report?',
          category: 'requirements',
          context: 'Report functionality detected',
          priority: 'HIGH'
        }
      );
    }

    // Multi-step process questions
    if (lowerStory.includes('step') || lowerStory.includes('wizard') || lowerStory.includes('workflow')) {
      questions.push(
        {
          question: 'What are all the steps in this process?',
          category: 'requirements',
          context: 'Multi-step process detected',
          priority: 'HIGH'
        },
        {
          question: 'Can users save progress and continue later?',
          category: 'functional',
          context: 'Multi-step process detected',
          priority: 'MEDIUM'
        },
        {
          question: 'Can users go back to previous steps and modify?',
          category: 'functional',
          context: 'Multi-step process detected',
          priority: 'MEDIUM'
        }
      );
    }

    return questions;
  }

  /**
   * Deduplicate questions
   */
  deduplicateQuestions(questions) {
    const seen = new Set();
    return questions.filter(q => {
      const key = q.question.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Prioritize questions
   */
  prioritizeQuestions(questions, nlpResults) {
    const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    
    return questions
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 20); // Return top 20 most important questions
  }

  getCategoryContext(category) {
    const contexts = {
      functional: 'Core functionality clarification',
      dataValidation: 'Input validation requirements',
      userExperience: 'User experience considerations',
      security: 'Security requirements',
      performance: 'Performance expectations',
      integration: 'Integration requirements',
      businessRules: 'Business logic clarification',
      notifications: 'Notification requirements',
      errorHandling: 'Error handling specifications'
    };
    return contexts[category] || 'General clarification';
  }

  getQuestionPriority(category, field = null) {
    const priorityMap = {
      security: 'CRITICAL',
      errorHandling: 'HIGH',
      dataValidation: 'HIGH',
      functional: 'HIGH',
      businessRules: 'HIGH',
      integration: 'MEDIUM',
      performance: 'MEDIUM',
      userExperience: 'MEDIUM',
      notifications: 'LOW'
    };

    // Elevate priority for sensitive fields
    if (field && ['password', 'credit', 'ssn', 'payment'].some(s => field.name?.toLowerCase().includes(s))) {
      return 'CRITICAL';
    }

    return priorityMap[category] || 'MEDIUM';
  }
}

module.exports = new QuestionGenerator();
