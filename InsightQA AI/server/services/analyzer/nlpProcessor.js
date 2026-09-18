/**
 * NLP Processor
 * Extracts structured information from user stories using natural language processing
 */

const natural = require('natural');
const compromise = require('compromise');
const Sentiment = require('sentiment');

const tokenizer = new natural.WordTokenizer();
const sentiment = new Sentiment();
const TfIdf = natural.TfIdf;

class NLPProcessor {
  constructor() {
    // Common patterns in user stories
    this.userStoryPattern = /as\s+(?:a|an)\s+(.+?),?\s+i\s+want\s+(?:to\s+)?(.+?)\s+so\s+that\s+(.+)/i;
    this.givenWhenThenPattern = /given\s+(.+?)\s+when\s+(.+?)\s+then\s+(.+)/i;

    // Data field indicators
    this.dataFieldIndicators = [
      'enter', 'input', 'provide', 'specify', 'select', 'choose', 'upload',
      'fill', 'type', 'submit', 'field', 'form', 'value', 'data'
    ];

    // Action verbs indicating data modification
    this.dataModificationVerbs = [
      'create', 'update', 'delete', 'modify', 'edit', 'add', 'remove',
      'save', 'submit', 'change', 'insert', 'upload'
    ];

    // Security-sensitive keywords
    this.securityKeywords = [
      'password', 'login', 'authentication', 'authorize', 'permission',
      'role', 'admin', 'secure', 'encrypt', 'token', 'session', 'credit',
      'payment', 'ssn', 'social security', 'personal', 'sensitive', 'private'
    ];

    // Performance-related keywords
    this.performanceKeywords = [
      'fast', 'quick', 'instant', 'real-time', 'responsive', 'load',
      'performance', 'speed', 'seconds', 'milliseconds', 'concurrent',
      'bulk', 'batch', 'large', 'scale', 'multiple'
    ];

    // Vague terms that reduce testability
    this.vagueTerms = [
      'should', 'might', 'could', 'may', 'possibly', 'sometimes',
      'usually', 'often', 'easy', 'intuitive', 'user-friendly',
      'appropriate', 'reasonable', 'efficient', 'effective', 'etc'
    ];
  }

  /**
   * Process user story and extract structured information
   */
  async process(userStory) {
    const doc = compromise(userStory);
    const tokens = tokenizer.tokenize(userStory.toLowerCase());

    // Extract core user story components
    const storyComponents = this.extractStoryComponents(userStory);

    // Extract data fields
    const dataFields = this.extractDataFields(userStory, doc);

    // Identify actions and verbs
    const actions = this.extractActions(doc);

    // Extract acceptance criteria
    const acceptanceCriteria = this.extractAcceptanceCriteria(userStory);

    // Identify dependencies
    const dependencies = this.extractDependencies(userStory, doc);

    // Check for security-related content
    const securityAnalysis = this.analyzeSecurityContext(userStory, tokens);

    // Check for performance requirements
    const performanceAnalysis = this.analyzePerformanceContext(userStory, tokens);

    // Identify ambiguities and vague terms
    const { ambiguities, vagueTermsFound } = this.identifyAmbiguities(userStory, tokens);

    // Extract entities (nouns that might be important)
    const entities = this.extractEntities(doc);

    // Sentiment analysis (can indicate urgency or priority)
    const sentimentResult = sentiment.analyze(userStory);

    // Check for Given-When-Then format
    const hasGivenWhenThen = this.givenWhenThenPattern.test(userStory);

    // Extract error conditions mentioned
    const errorConditions = this.extractErrorConditions(userStory);

    // Extract numerical constraints
    const numericalConstraints = this.extractNumericalConstraints(userStory);

    return {
      // Core story components
      actor: storyComponents.actor,
      action: storyComponents.action,
      benefit: storyComponents.benefit,

      // Structured elements
      dataFields,
      actions,
      acceptanceCriteria,
      dependencies,
      entities,
      errorConditions,
      numericalConstraints,

      // Analysis flags
      requiresAuth: securityAnalysis.requiresAuth,
      sensitiveData: securityAnalysis.sensitiveData,
      financialTransaction: securityAnalysis.financialTransaction,
      securityKeywordsFound: securityAnalysis.keywordsFound,

      performanceContext: performanceAnalysis,
      dataModification: this.checkDataModification(tokens),

      // Quality indicators
      ambiguities,
      vagueTerms: vagueTermsFound,
      hasGivenWhenThen,
      sentiment: sentimentResult.score,

      // Raw data for further processing
      tokens,
      wordCount: tokens.length
    };
  }

  /**
   * Extract user story components (As a... I want... So that...)
   */
  extractStoryComponents(userStory) {
    const match = userStory.match(this.userStoryPattern);

    if (match) {
      return {
        actor: match[1].trim(),
        action: match[2].trim(),
        benefit: match[3].trim()
      };
    }

    // Alternative extraction for non-standard formats
    const doc = compromise(userStory);
    return {
      actor: this.extractActor(doc, userStory),
      action: this.extractPrimaryAction(doc),
      benefit: this.extractBenefit(userStory)
    };
  }

  extractActor(doc, userStory) {
    // Look for role indicators
    const rolePatterns = [
      /(?:as\s+(?:a|an)\s+)(\w+(?:\s+\w+)?)/i,
      /(?:user|customer|admin|manager|employee|member|guest|visitor)/i
    ];

    for (const pattern of rolePatterns) {
      const match = userStory.match(pattern);
      if (match) return match[1] || match[0];
    }

    return 'user';
  }

  extractPrimaryAction(doc) {
    const verbs = doc.verbs().out('array');
    if (verbs.length > 0) {
      // Get the main action verb (usually after "want to" or similar)
      return verbs.slice(0, 3).join(' ');
    }
    return null;
  }

  extractBenefit(userStory) {
    const benefitPatterns = [
      /so\s+that\s+(.+?)(?:\.|$)/i,
      /in\s+order\s+to\s+(.+?)(?:\.|$)/i,
      /to\s+be\s+able\s+to\s+(.+?)(?:\.|$)/i
    ];

    for (const pattern of benefitPatterns) {
      const match = userStory.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  /**
   * Extract data fields mentioned in the story
   */
  extractDataFields(userStory, doc) {
    const fields = [];
    const lowerStory = userStory.toLowerCase();

    // Common field patterns
    const fieldPatterns = [
      { pattern: /email\s*(?:address)?/gi, type: 'email', name: 'email' },
      { pattern: /\bpassword\b/gi, type: 'password', name: 'password' },
      { pattern: /\b(?:user\s*name|username|full\s+name)\b/gi, type: 'string', name: 'name' },
      { pattern: /phone\s*(?:number)?/gi, type: 'phone', name: 'phone' },
      { pattern: /\bdate\s+(?:of\s+birth|field|input)\b/gi, type: 'date', name: 'date' },
      { pattern: /address/gi, type: 'string', name: 'address' },
      { pattern: /(?:zip|postal)\s*code/gi, type: 'string', name: 'zipCode' },
      { pattern: /amount|price|cost/gi, type: 'number', name: 'amount' },
      { pattern: /\b(?:quantity|count)\s+(?:field|input)\b/gi, type: 'number', name: 'quantity' },
      { pattern: /\b(?:description|comment|note)\s+(?:field|input)\b/gi, type: 'text', name: 'description' },
      { pattern: /\bitem\s+id\b/gi, type: 'string', name: 'Item ID' },
      { pattern: /\bitem\s+description\b/gi, type: 'text', name: 'Item Description' },
      { pattern: /\bwarehouse\s+lot\s*#/gi, type: 'string', name: 'Warehouse Lot #' },
      { pattern: /\bdate\s+code\b/gi, type: 'string', name: 'Date Code' },
      { pattern: /\bwarehouse\s+pallet\s*#/gi, type: 'string', name: 'Warehouse Pallet #' },
      { pattern: /\balternative\s+lot\s*#/gi, type: 'string', name: 'Alternative Lot #' },
      { pattern: /\binventory\s+status\b/gi, type: 'string', name: 'Inventory Status' },
      { pattern: /(?:credit\s*)?card\s*number/gi, type: 'creditCard', name: 'cardNumber' },
      { pattern: /cvv|cvc|security\s*code/gi, type: 'cvv', name: 'cvv' },
      { pattern: /(?:expir(?:y|ation))\s*date/gi, type: 'date', name: 'expiryDate' },
      { pattern: /file|document|attachment/gi, type: 'file', name: 'file' },
      { pattern: /image|photo|picture/gi, type: 'image', name: 'image' }
    ];

    for (const { pattern, type, name } of fieldPatterns) {
      if (pattern.test(lowerStory)) {
        fields.push({ name, type, required: this.isFieldRequired(lowerStory, name) });
      }
    }

    // Extract additional nouns that might be fields
    const nouns = doc.nouns().out('array');
    const inputIndicators = ['enter', 'input', 'provide', 'fill', 'specify'];

    nouns.forEach(noun => {
      const nounLower = noun.toLowerCase();
      if (!fields.some(f => f.name.toLowerCase() === nounLower)) {
        // Check if this noun is associated with an input action
        const isInputField = inputIndicators.some(indicator =>
          lowerStory.includes(`${indicator} ${nounLower}`) ||
          lowerStory.includes(`${indicator} the ${nounLower}`)
        );

        if (isInputField) {
          fields.push({ name: noun, type: 'string', required: false });
        }
      }
    });

    return fields;
  }

  isFieldRequired(text, fieldName) {
    const requiredPatterns = [
      new RegExp(`required\\s+${fieldName}`, 'i'),
      new RegExp(`${fieldName}\\s+(?:is\\s+)?required`, 'i'),
      new RegExp(`must\\s+(?:provide|enter|specify)\\s+${fieldName}`, 'i')
    ];

    return requiredPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Extract actions from the story
   */
  extractActions(doc) {
    const verbs = doc.verbs().out('array');
    const actions = [];

    verbs.forEach(verb => {
      const verbLower = verb.toLowerCase();
      let actionType = 'general';

      if (this.dataModificationVerbs.includes(verbLower)) {
        actionType = 'data_modification';
      } else if (['view', 'see', 'display', 'show', 'read', 'get', 'retrieve'].includes(verbLower)) {
        actionType = 'read';
      } else if (['navigate', 'go', 'access', 'open', 'visit'].includes(verbLower)) {
        actionType = 'navigation';
      } else if (['search', 'find', 'filter', 'sort', 'query'].includes(verbLower)) {
        actionType = 'search';
      } else if (['send', 'notify', 'alert', 'email', 'message'].includes(verbLower)) {
        actionType = 'notification';
      } else if (['login', 'logout', 'authenticate', 'authorize', 'register'].includes(verbLower)) {
        actionType = 'authentication';
      }

      actions.push({ verb, type: actionType });
    });

    return actions;
  }

  /**
   * Extract acceptance criteria
   */
  extractAcceptanceCriteria(userStory) {
    const criteria = [];
    const lines = userStory.split('\n');

    // Look for numbered criteria or bullet points
    const criteriaPatterns = [
      /^(?:\d+[\.\)]\s*|[-•*]\s*)/,
      /^(?:AC|Acceptance\s+Criteria)\s*\d*[:\s]/i,
      /^(?:Given|When|Then)\s+/i
    ];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (criteriaPatterns.some(p => p.test(trimmed))) {
        criteria.push({
          text: trimmed.replace(/^(?:\d+[\.\)]\s*|[-•*]\s*|AC\s*\d*[:\s])/i, '').trim(),
          type: this.classifyCriteria(trimmed)
        });
      }
    });

    // Also extract implicit criteria from the story
    if (criteria.length === 0) {
      const implicitCriteria = this.extractImplicitCriteria(userStory);
      criteria.push(...implicitCriteria);
    }

    return criteria;
  }

  classifyCriteria(text) {
    const lowerText = text.toLowerCase();

    if (/^given/i.test(text)) return 'precondition';
    if (/^when/i.test(text)) return 'action';
    if (/^then/i.test(text)) return 'expected_result';
    if (/should|must|shall/.test(lowerText)) return 'requirement';
    if (/error|fail|invalid/.test(lowerText)) return 'error_handling';

    return 'general';
  }

  extractImplicitCriteria(userStory) {
    const criteria = [];
    const sentences = userStory.split(/[.!?]+/);

    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 10) {
        if (/should|must|shall|will|can/.test(trimmed.toLowerCase())) {
          criteria.push({ text: trimmed, type: 'implicit' });
        }
      }
    });

    return criteria;
  }

  /**
   * Extract dependencies
   */
  extractDependencies(userStory, doc) {
    const dependencies = [];
    const lowerStory = userStory.toLowerCase();

    // System/integration dependencies
    const systemPatterns = [
      /(?:integrate[sd]?\s+with|connect(?:s|ed)?\s+to)\s+([\w-]+(?:\s+[\w-]+)?(?:\s+(?:api|service|system|database))?)/gi,
      /(?:via|through)\s+([\w-]+(?:\s+[\w-]+)?\s+(?:api|service|system|database))/gi
    ];

    systemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(userStory)) !== null) {
        dependencies.push({
          type: 'system',
          name: match[1].trim()
        });
      }
    });

    // Feature dependencies
    if (/after\s+(?:completing|finishing|logging|signing)/i.test(lowerStory)) {
      dependencies.push({ type: 'feature', name: 'previous step completion' });
    }

    if (/requires?\s+(?:login|authentication)/i.test(lowerStory)) {
      dependencies.push({ type: 'authentication', name: 'user authentication' });
    }

    // Data dependencies
    if (/existing|previous|stored|saved/i.test(lowerStory)) {
      dependencies.push({ type: 'data', name: 'existing data' });
    }

    return dependencies;
  }

  /**
   * Analyze security context
   */
  analyzeSecurityContext(userStory, tokens) {
    const lowerStory = userStory.toLowerCase();
    const keywordsFound = [];

    this.securityKeywords.forEach(keyword => {
      if (lowerStory.includes(keyword)) {
        keywordsFound.push(keyword);
      }
    });

    return {
      requiresAuth: /login|authentication|authorize|sign\s*in|log\s*in/i.test(lowerStory),
      sensitiveData: /password|ssn|social\s*security|credit|personal|private|sensitive/i.test(lowerStory),
      financialTransaction: /payment|purchase|buy|transaction|credit|debit|money|price|cost|billing/i.test(lowerStory),
      keywordsFound
    };
  }

  /**
   * Analyze performance context
   */
  analyzePerformanceContext(userStory, tokens) {
    const lowerStory = userStory.toLowerCase();
    const indicators = [];

    this.performanceKeywords.forEach(keyword => {
      if (lowerStory.includes(keyword)) {
        indicators.push(keyword);
      }
    });

    // Extract specific time requirements
    const timePattern = /(\d+)\s*(second|millisecond|minute|ms|s)/gi;
    const timeRequirements = [];
    let match;
    while ((match = timePattern.exec(userStory)) !== null) {
      timeRequirements.push({
        value: parseInt(match[1]),
        unit: match[2]
      });
    }

    // Extract volume requirements
    const volumePattern = /(\d+(?:,\d+)?(?:k|K|M)?)\s*(?:users?|records?|items?|requests?)/gi;
    const volumeRequirements = [];
    while ((match = volumePattern.exec(userStory)) !== null) {
      volumeRequirements.push({
        value: match[1],
        type: match[0]
      });
    }

    return {
      hasPerformanceRequirements: indicators.length > 0 || timeRequirements.length > 0,
      indicators,
      timeRequirements,
      volumeRequirements
    };
  }

  /**
   * Check for data modification
   */
  checkDataModification(tokens) {
    return tokens.some(token => this.dataModificationVerbs.includes(token));
  }

  /**
   * Identify ambiguities
   */
  identifyAmbiguities(userStory, tokens) {
    const ambiguities = [];
    const vagueTermsFound = [];

    // Check for vague terms
    this.vagueTerms.forEach(term => {
      if (tokens.includes(term)) {
        vagueTermsFound.push(term);
        ambiguities.push({
          type: 'vague_term',
          term,
          suggestion: this.getSuggestionForVagueTerm(term)
        });
      }
    });

    // Check for unclear references
    if (/the system|the user|it|they|this|that/gi.test(userStory)) {
      const pronounPatterns = userStory.match(/\b(it|they|this|that|the system)\b/gi);
      if (pronounPatterns && pronounPatterns.length > 2) {
        ambiguities.push({
          type: 'unclear_reference',
          term: pronounPatterns.slice(0, 3).join(', '),
          suggestion: 'Use specific names instead of pronouns for clarity'
        });
      }
    }

    // Check for missing quantities
    if (/several|many|few|some|multiple/i.test(userStory)) {
      ambiguities.push({
        type: 'undefined_quantity',
        suggestion: 'Specify exact numbers or ranges instead of vague quantities'
      });
    }

    return { ambiguities, vagueTermsFound };
  }

  getSuggestionForVagueTerm(term) {
    const suggestions = {
      'should': 'Use "must" or "shall" for requirements',
      'might': 'Clarify if this is a requirement or optional feature',
      'could': 'Specify if this is required or nice-to-have',
      'easy': 'Define measurable usability criteria',
      'intuitive': 'Specify exact user interaction flow',
      'user-friendly': 'Define specific UX requirements',
      'appropriate': 'Specify exact values or ranges',
      'reasonable': 'Define specific thresholds or limits',
      'efficient': 'Specify performance metrics',
      'etc': 'List all items explicitly'
    };

    return suggestions[term] || 'Provide specific, measurable criteria';
  }

  /**
   * Extract entities
   */
  extractEntities(doc) {
    const entities = {
      nouns: doc.nouns().out('array'),
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array')
    };

    return entities;
  }

  /**
   * Extract error conditions
   */
  extractErrorConditions(userStory) {
    const conditions = [];
    const errorPatterns = [
      /if\s+(.+?)\s+(?:fails?|errors?|invalid)/gi,
      /when\s+(.+?)\s+(?:fails?|errors?|invalid)/gi,
      /(?:error|failure|invalid)\s+(?:when|if)\s+(.+?)(?:\.|,|$)/gi,
      /(?:should|must)\s+(?:show|display)\s+(?:error|warning|message)\s+(?:when|if)\s+(.+?)(?:\.|,|$)/gi
    ];

    errorPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(userStory)) !== null) {
        conditions.push({
          condition: match[1].trim(),
          fullMatch: match[0].trim()
        });
      }
    });

    return conditions;
  }

  /**
   * Extract numerical constraints
   */
  extractNumericalConstraints(userStory) {
    const constraints = [];

    // Range patterns
    const rangePattern = /(\d+)\s*(?:to|-)\s*(\d+)\s*(\w+)?/gi;
    let match;
    while ((match = rangePattern.exec(userStory)) !== null) {
      constraints.push({
        type: 'range',
        min: parseInt(match[1]),
        max: parseInt(match[2]),
        unit: match[3] || null
      });
    }

    // Minimum/maximum patterns
    const minMaxPattern = /(?:min(?:imum)?|max(?:imum)?|at\s+least|at\s+most|up\s+to|no\s+more\s+than)\s+(\d+)/gi;
    while ((match = minMaxPattern.exec(userStory)) !== null) {
      constraints.push({
        type: match[0].toLowerCase().includes('min') || match[0].toLowerCase().includes('least') ? 'minimum' : 'maximum',
        value: parseInt(match[1])
      });
    }

    return constraints;
  }
}

module.exports = new NLPProcessor();
