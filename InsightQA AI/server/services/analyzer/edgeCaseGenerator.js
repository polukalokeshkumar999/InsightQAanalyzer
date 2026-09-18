/**
 * Edge Case Generator
 * Identifies boundary conditions and edge scenarios for testing
 */

class EdgeCaseGenerator {
  constructor() {
    // Common edge case patterns by category
    this.edgeCasePatterns = {
      string: [
        { name: 'Empty string', value: '', description: 'Test with empty input' },
        { name: 'Single character', value: 'a', description: 'Minimum meaningful input' },
        { name: 'Maximum length', value: null, description: 'Test at maximum allowed length' },
        { name: 'Exceed max length', value: null, description: 'Test beyond maximum length' },
        { name: 'Special characters', value: '!@#$%^&*(){}[]|\\:";\'<>?,./~`', description: 'Test special character handling' },
        { name: 'Unicode characters', value: '日本語中文한국어العربية', description: 'Test international characters' },
        { name: 'Emojis', value: '😀🎉🔥💯', description: 'Test emoji handling' },
        { name: 'HTML tags', value: '<script>alert("xss")</script>', description: 'Test XSS prevention' },
        { name: 'SQL injection', value: '\'; DROP TABLE users; --', description: 'Test SQL injection prevention' },
        { name: 'Whitespace only', value: '     ', description: 'Test whitespace-only input' },
        { name: 'Leading/trailing spaces', value: '  text  ', description: 'Test space trimming' },
        { name: 'Line breaks', value: 'line1\nline2\rline3', description: 'Test multiline handling' },
        { name: 'Null bytes', value: 'text\x00text', description: 'Test null byte handling' }
      ],
      number: [
        { name: 'Zero', value: 0, description: 'Test zero value' },
        { name: 'Negative zero', value: -0, description: 'Test negative zero' },
        { name: 'Negative number', value: -1, description: 'Test negative values' },
        { name: 'Maximum integer', value: 2147483647, description: 'Test INT_MAX' },
        { name: 'Minimum integer', value: -2147483648, description: 'Test INT_MIN' },
        { name: 'Large number', value: 999999999999, description: 'Test very large numbers' },
        { name: 'Decimal precision', value: 0.1 + 0.2, description: 'Test floating point precision' },
        { name: 'Scientific notation', value: '1e10', description: 'Test scientific notation input' },
        { name: 'NaN', value: NaN, description: 'Test Not a Number' },
        { name: 'Infinity', value: Infinity, description: 'Test infinite values' },
        { name: 'Leading zeros', value: '007', description: 'Test leading zero handling' }
      ],
      date: [
        { name: 'Leap year Feb 29', value: '2024-02-29', description: 'Test leap year date' },
        { name: 'Non-leap year Feb 29', value: '2023-02-29', description: 'Invalid date handling' },
        { name: 'Month boundaries', value: '2024-01-31', description: 'Test month end dates' },
        { name: 'Year boundaries', value: '2024-12-31', description: 'Test year end date' },
        { name: 'Far future date', value: '2099-12-31', description: 'Test far future dates' },
        { name: 'Far past date', value: '1900-01-01', description: 'Test historical dates' },
        { name: 'Epoch date', value: '1970-01-01', description: 'Test Unix epoch' },
        { name: 'Y2K date', value: '2000-01-01', description: 'Test Y2K boundary' },
        { name: 'Timezone edge', value: '2024-03-10T02:30:00', description: 'Test DST transition' },
        { name: 'Invalid format', value: '31/13/2024', description: 'Test invalid date format' }
      ],
      email: [
        { name: 'Simple valid', value: 'user@example.com', description: 'Standard email format' },
        { name: 'With subdomain', value: 'user@mail.example.com', description: 'Email with subdomain' },
        { name: 'With plus sign', value: 'user+tag@example.com', description: 'Email with plus addressing' },
        { name: 'With dots', value: 'user.name@example.com', description: 'Email with dots in local part' },
        { name: 'Long local part', value: 'verylongemailaddresslocalpartherexxxxxxx@example.com', description: 'Long local part' },
        { name: 'Long domain', value: 'user@very-long-domain-name-here.example.com', description: 'Long domain name' },
        { name: 'New TLD', value: 'user@example.photography', description: 'New gTLD' },
        { name: 'No @ symbol', value: 'userexample.com', description: 'Missing @ symbol' },
        { name: 'Multiple @', value: 'user@@example.com', description: 'Multiple @ symbols' },
        { name: 'Spaces', value: 'user @example.com', description: 'Email with spaces' },
        { name: 'Special chars', value: 'user!#$%@example.com', description: 'Special characters in local part' }
      ],
      phone: [
        { name: 'US format', value: '+1-555-123-4567', description: 'US phone format' },
        { name: 'International', value: '+44 20 7946 0958', description: 'International format' },
        { name: 'No country code', value: '555-123-4567', description: 'Without country code' },
        { name: 'With extension', value: '+1-555-123-4567 x123', description: 'Phone with extension' },
        { name: 'All zeros', value: '000-000-0000', description: 'Invalid zero number' },
        { name: 'Letters included', value: '1-800-FLOWERS', description: 'Vanity number' },
        { name: 'Too short', value: '123', description: 'Too few digits' },
        { name: 'Too long', value: '12345678901234567890', description: 'Too many digits' }
      ],
      file: [
        { name: 'Empty file', value: '0 bytes', description: 'Zero-byte file upload' },
        { name: 'Large file', value: 'max size', description: 'File at size limit' },
        { name: 'Exceed size limit', value: 'max + 1 byte', description: 'File exceeding limit' },
        { name: 'Wrong extension', value: 'malicious.exe.jpg', description: 'Disguised file type' },
        { name: 'No extension', value: 'filename', description: 'File without extension' },
        { name: 'Special characters in name', value: 'file!@#$%.txt', description: 'Special chars in filename' },
        { name: 'Unicode filename', value: '文件名.txt', description: 'Non-ASCII filename' },
        { name: 'Long filename', value: 'very_long_filename_'.repeat(20) + '.txt', description: 'Very long filename' },
        { name: 'Corrupted file', value: 'corrupted content', description: 'File with corrupted data' }
      ]
    };
  }

  /**
   * Generate edge cases based on user story analysis
   */
  async generate(userStory, nlpResults) {
    const edgeCases = {
      boundary: [],
      negative: [],
      integration: [],
      security: [],
      performance: [],
      accessibility: [],
      concurrency: [],
      dataRelated: []
    };

    // Generate boundary value edge cases
    edgeCases.boundary = this.generateBoundaryEdgeCases(nlpResults);

    // Generate negative test edge cases
    edgeCases.negative = this.generateNegativeEdgeCases(nlpResults);

    // Generate integration edge cases
    edgeCases.integration = this.generateIntegrationEdgeCases(nlpResults);

    // Generate security edge cases
    edgeCases.security = this.generateSecurityEdgeCases(userStory, nlpResults);

    // Generate performance edge cases
    edgeCases.performance = this.generatePerformanceEdgeCases(nlpResults);

    // Generate accessibility edge cases
    edgeCases.accessibility = this.generateAccessibilityEdgeCases(nlpResults);

    // Generate concurrency edge cases
    edgeCases.concurrency = this.generateConcurrencyEdgeCases(nlpResults);

    // Generate data-related edge cases
    edgeCases.dataRelated = this.generateDataEdgeCases(nlpResults);

    return edgeCases;
  }

  /**
   * Generate boundary value edge cases
   */
  generateBoundaryEdgeCases(nlpResults) {
    const cases = [];

    // For each data field, generate relevant boundary cases
    nlpResults.dataFields?.forEach(field => {
      const fieldCases = this.edgeCasePatterns[field.type] || this.edgeCasePatterns.string;
      
      fieldCases.slice(0, 5).forEach(pattern => {
        cases.push({
          field: field.name,
          type: field.type,
          edgeCase: pattern.name,
          testValue: pattern.value,
          description: `${field.name}: ${pattern.description}`,
          priority: this.getPriorityForEdgeCase(pattern.name)
        });
      });
    });

    // Add numerical constraints if identified
    nlpResults.numericalConstraints?.forEach(constraint => {
      if (constraint.type === 'range') {
        cases.push(
          {
            edgeCase: 'At minimum boundary',
            testValue: constraint.min,
            description: `Test exactly at minimum value: ${constraint.min}`,
            priority: 'HIGH'
          },
          {
            edgeCase: 'Below minimum boundary',
            testValue: constraint.min - 1,
            description: `Test below minimum value: ${constraint.min - 1}`,
            priority: 'HIGH'
          },
          {
            edgeCase: 'At maximum boundary',
            testValue: constraint.max,
            description: `Test exactly at maximum value: ${constraint.max}`,
            priority: 'HIGH'
          },
          {
            edgeCase: 'Above maximum boundary',
            testValue: constraint.max + 1,
            description: `Test above maximum value: ${constraint.max + 1}`,
            priority: 'HIGH'
          }
        );
      }
    });

    return cases;
  }

  /**
   * Generate negative test edge cases
   */
  generateNegativeEdgeCases(nlpResults) {
    const cases = [];

    // Missing required fields
    nlpResults.dataFields?.filter(f => f.required).forEach(field => {
      cases.push({
        edgeCase: `Missing required field: ${field.name}`,
        description: `Submit form without providing ${field.name}`,
        expectedBehavior: 'Display appropriate error message',
        priority: 'HIGH'
      });
    });

    // Invalid data combinations
    if (nlpResults.dataFields?.length > 1) {
      cases.push({
        edgeCase: 'All fields empty',
        description: 'Submit with all fields empty',
        expectedBehavior: 'Display validation errors for all required fields',
        priority: 'HIGH'
      });

      cases.push({
        edgeCase: 'Mixed valid/invalid data',
        description: 'Submit with some valid and some invalid field values',
        expectedBehavior: 'Highlight specific fields with errors',
        priority: 'MEDIUM'
      });
    }

    // Error condition handling
    nlpResults.errorConditions?.forEach(condition => {
      cases.push({
        edgeCase: `Error condition: ${condition.condition}`,
        description: `Trigger: ${condition.fullMatch}`,
        expectedBehavior: 'System handles error gracefully',
        priority: 'HIGH'
      });
    });

    // General negative cases
    cases.push(
      {
        edgeCase: 'Session timeout during action',
        description: 'Perform action after session expires',
        expectedBehavior: 'Redirect to login with appropriate message',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Network disconnection',
        description: 'Lose network connection during operation',
        expectedBehavior: 'Display offline message, preserve data if possible',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Browser back button',
        description: 'Click back button during/after operation',
        expectedBehavior: 'Handle navigation gracefully',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Double submission',
        description: 'Click submit button twice rapidly',
        expectedBehavior: 'Prevent duplicate submissions',
        priority: 'HIGH'
      }
    );

    return cases;
  }

  /**
   * Generate integration edge cases
   */
  generateIntegrationEdgeCases(nlpResults) {
    const cases = [];

    // External service failures
    nlpResults.dependencies?.forEach(dep => {
      cases.push(
        {
          edgeCase: `${dep.name} service timeout`,
          description: `External service ${dep.name} takes too long to respond`,
          expectedBehavior: 'Timeout with user-friendly error message',
          priority: 'HIGH'
        },
        {
          edgeCase: `${dep.name} service unavailable`,
          description: `External service ${dep.name} returns 503`,
          expectedBehavior: 'Display service unavailable message',
          priority: 'HIGH'
        },
        {
          edgeCase: `${dep.name} returns unexpected data`,
          description: `External service returns malformed or unexpected response`,
          expectedBehavior: 'Handle gracefully without crashing',
          priority: 'MEDIUM'
        }
      );
    });

    // Database edge cases
    if (nlpResults.dataModification) {
      cases.push(
        {
          edgeCase: 'Database connection lost',
          description: 'Database becomes unavailable during operation',
          expectedBehavior: 'Transaction rollback, error message displayed',
          priority: 'HIGH'
        },
        {
          edgeCase: 'Database constraint violation',
          description: 'Operation violates database constraints',
          expectedBehavior: 'Appropriate validation error shown',
          priority: 'HIGH'
        }
      );
    }

    // API edge cases
    cases.push(
      {
        edgeCase: 'API rate limit exceeded',
        description: 'API calls exceed rate limit',
        expectedBehavior: 'Display rate limit message, implement backoff',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'API version mismatch',
        description: 'Backend API version differs from expected',
        expectedBehavior: 'Graceful degradation or version warning',
        priority: 'LOW'
      }
    );

    return cases;
  }

  /**
   * Generate security edge cases
   */
  generateSecurityEdgeCases(userStory, nlpResults) {
    const cases = [];

    // Input injection attacks
    nlpResults.dataFields?.forEach(field => {
      cases.push(
        {
          edgeCase: `SQL Injection in ${field.name}`,
          testValue: '\'; DROP TABLE users; --',
          description: `Attempt SQL injection through ${field.name} field`,
          expectedBehavior: 'Input sanitized, no SQL execution',
          priority: 'CRITICAL'
        },
        {
          edgeCase: `XSS in ${field.name}`,
          testValue: '<script>alert("XSS")</script>',
          description: `Attempt XSS attack through ${field.name} field`,
          expectedBehavior: 'Script tags escaped or rejected',
          priority: 'CRITICAL'
        }
      );
    });

    // Authentication edge cases
    if (nlpResults.requiresAuth) {
      cases.push(
        {
          edgeCase: 'Access without authentication',
          description: 'Attempt to access feature without logging in',
          expectedBehavior: 'Redirect to login page',
          priority: 'CRITICAL'
        },
        {
          edgeCase: 'Access with expired token',
          description: 'Use expired authentication token',
          expectedBehavior: 'Token rejected, re-authentication required',
          priority: 'CRITICAL'
        },
        {
          edgeCase: 'Session hijacking attempt',
          description: 'Use session ID from different user/browser',
          expectedBehavior: 'Session validation fails',
          priority: 'CRITICAL'
        },
        {
          edgeCase: 'Brute force login',
          description: 'Multiple failed login attempts',
          expectedBehavior: 'Account lockout or CAPTCHA after threshold',
          priority: 'HIGH'
        }
      );
    }

    // Authorization edge cases
    cases.push(
      {
        edgeCase: 'Privilege escalation',
        description: 'Attempt to access admin features as regular user',
        expectedBehavior: 'Access denied with 403 response',
        priority: 'CRITICAL'
      },
      {
        edgeCase: 'IDOR (Insecure Direct Object Reference)',
        description: 'Modify URL/request to access other users\' data',
        expectedBehavior: 'Access denied, proper authorization check',
        priority: 'CRITICAL'
      }
    );

    // CSRF protection
    cases.push({
      edgeCase: 'CSRF attack',
      description: 'Submit request without valid CSRF token',
      expectedBehavior: 'Request rejected',
      priority: 'HIGH'
    });

    return cases;
  }

  /**
   * Generate performance edge cases
   */
  generatePerformanceEdgeCases(nlpResults) {
    const cases = [];

    // Load-related edge cases
    cases.push(
      {
        edgeCase: 'Maximum concurrent users',
        description: 'System at maximum expected user capacity',
        expectedBehavior: 'Response times within acceptable limits',
        priority: 'HIGH'
      },
      {
        edgeCase: 'Spike load',
        description: 'Sudden increase in user traffic',
        expectedBehavior: 'System remains responsive, graceful degradation if needed',
        priority: 'MEDIUM'
      }
    );

    // Data volume edge cases
    if (nlpResults.dataFields?.length > 0) {
      cases.push(
        {
          edgeCase: 'Large dataset display',
          description: 'Display page with maximum number of records',
          expectedBehavior: 'Page loads within acceptable time, pagination works',
          priority: 'MEDIUM'
        },
        {
          edgeCase: 'Large file processing',
          description: 'Upload/process file at maximum allowed size',
          expectedBehavior: 'Processing completes without timeout',
          priority: 'MEDIUM'
        }
      );
    }

    // Timeout scenarios
    cases.push(
      {
        edgeCase: 'Slow network conditions',
        description: 'Operation under high latency network',
        expectedBehavior: 'Appropriate timeout handling and user feedback',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Long-running operation',
        description: 'Operation that takes longer than usual',
        expectedBehavior: 'Progress indicator shown, operation completes',
        priority: 'LOW'
      }
    );

    return cases;
  }

  /**
   * Generate accessibility edge cases
   */
  generateAccessibilityEdgeCases(nlpResults) {
    const cases = [
      {
        edgeCase: 'Keyboard-only navigation',
        description: 'Complete all actions using only keyboard',
        expectedBehavior: 'All interactive elements accessible via keyboard',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Screen reader compatibility',
        description: 'Navigate feature using screen reader',
        expectedBehavior: 'All content properly announced',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'High contrast mode',
        description: 'View feature in high contrast mode',
        expectedBehavior: 'All elements visible and distinguishable',
        priority: 'LOW'
      },
      {
        edgeCase: 'Zoom 200%',
        description: 'View feature at 200% browser zoom',
        expectedBehavior: 'No content overflow or overlap',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Focus management',
        description: 'Tab through interactive elements',
        expectedBehavior: 'Logical focus order, visible focus indicator',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Color-blind accessibility',
        description: 'View feature simulating color blindness',
        expectedBehavior: 'Information not conveyed by color alone',
        priority: 'LOW'
      }
    ];

    return cases;
  }

  /**
   * Generate concurrency edge cases
   */
  generateConcurrencyEdgeCases(nlpResults) {
    const cases = [];

    if (nlpResults.dataModification) {
      cases.push(
        {
          edgeCase: 'Simultaneous edit',
          description: 'Two users edit same record simultaneously',
          expectedBehavior: 'Conflict detected and handled appropriately',
          priority: 'HIGH'
        },
        {
          edgeCase: 'Race condition',
          description: 'Rapid sequential operations on same data',
          expectedBehavior: 'Data integrity maintained',
          priority: 'HIGH'
        },
        {
          edgeCase: 'Stale data modification',
          description: 'Edit based on outdated data',
          expectedBehavior: 'User notified of newer version',
          priority: 'MEDIUM'
        }
      );
    }

    cases.push(
      {
        edgeCase: 'Multiple tabs/windows',
        description: 'Same user logged in multiple browser tabs',
        expectedBehavior: 'State synchronized or handled appropriately',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Background job conflict',
        description: 'User action during background process',
        expectedBehavior: 'No data corruption or unexpected behavior',
        priority: 'MEDIUM'
      }
    );

    return cases;
  }

  /**
   * Generate data-related edge cases
   */
  generateDataEdgeCases(nlpResults) {
    const cases = [];

    // Empty state
    cases.push({
      edgeCase: 'Empty state',
      description: 'Feature with no data (first-time use)',
      expectedBehavior: 'Appropriate empty state message or prompt',
      priority: 'MEDIUM'
    });

    // Data state edge cases
    if (nlpResults.dataModification) {
      cases.push(
        {
          edgeCase: 'Delete last item',
          description: 'Delete the only remaining item',
          expectedBehavior: 'Empty state shown, no errors',
          priority: 'MEDIUM'
        },
        {
          edgeCase: 'Restore deleted item',
          description: 'Undo deletion if supported',
          expectedBehavior: 'Item restored correctly',
          priority: 'LOW'
        }
      );
    }

    // Reference integrity
    cases.push(
      {
        edgeCase: 'Orphaned references',
        description: 'Access item that references deleted data',
        expectedBehavior: 'Graceful handling, no broken UI',
        priority: 'MEDIUM'
      },
      {
        edgeCase: 'Circular references',
        description: 'Create circular data references if possible',
        expectedBehavior: 'Prevented or handled without infinite loops',
        priority: 'LOW'
      }
    );

    return cases;
  }

  getPriorityForEdgeCase(edgeCaseName) {
    const highPriority = ['empty string', 'sql injection', 'html tags', 'maximum length', 'zero', 'negative'];
    const lowPriority = ['unicode', 'emoji', 'null bytes'];

    const lowerName = edgeCaseName.toLowerCase();
    
    if (highPriority.some(p => lowerName.includes(p))) return 'HIGH';
    if (lowPriority.some(p => lowerName.includes(p))) return 'LOW';
    return 'MEDIUM';
  }
}

module.exports = new EdgeCaseGenerator();
