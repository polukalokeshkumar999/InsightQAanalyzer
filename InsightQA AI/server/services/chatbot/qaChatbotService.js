/**
 * InsightQA Chatbot Service
 * Provides instant, highly accurate QA guidance, compliance rules,
 * operational application intelligence, and dynamic QA tools.
 */

const QA_KNOWLEDGE_BASE = require('./qaKnowledgeBase');
const logger = require('../../utils/logger');

class QAChatbotService {
  constructor() {
    this.openai = null;
    this.initializeOpenAI();
    this.allTopics = [
      ...QA_KNOWLEDGE_BASE.rulesAndPrinciples,
      ...QA_KNOWLEDGE_BASE.applicationGuide
    ];
  }

  initializeOpenAI() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      try {
        const OpenAI = require('openai');
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        logger.info('Chatbot Service: OpenAI API initialized');
      } catch (error) {
        logger.warn('Chatbot Service: OpenAI init failed:', error.message);
      }
    }
  }

  /**
   * Main chat message handler
   */
  async processMessage(userMessage, conversationHistory = []) {
    const trimmed = (userMessage || '').trim();
    if (!trimmed) {
      return {
        reply: "Hello! I am your **InsightQA Assistant**. How can I help you today with QA rules, test design, or using the InsightQA application?",
        category: "General",
        source: "Expert Engine",
        suggestedFollowUps: [
          "What are the 7 ISTQB testing principles?",
          "How does InsightQA calculate risk scores?",
          "Explain Severity vs Priority with examples",
          "What are the rules for Boundary Value Analysis?"
        ]
      };
    }

    const lower = trimmed.toLowerCase();

    // 1. Check for Greeting / Introductory queries
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|who are you|what can you do)\b/i.test(lower) && lower.length < 35) {
      return {
        reply: `### 👋 Welcome to InsightQA Assistant!

I am your dedicated **QA Regulations & InsightQA Application Expert**. I can answer any software quality assurance question quickly and accurately.

#### What I can do for you:
- **📜 QA Rules & Standards**: ISTQB 7 principles, IEEE 829 / ISO 29119 bug standards, Severity vs Priority matrix, DoR/DoD quality gates.
- **🧪 Test Design**: Boundary Value Analysis (2-value & 3-value), Equivalence Partitioning, Decision Tables, Pairwise testing.
- **🛡️ Compliance & Security**: WCAG 2.1/2.2 AA accessibility checklists, OWASP Top 10 vulnerabilities, HIPAA PHI masking, GDPR, PCI-DSS.
- **⚙️ InsightQA AI Guidance**: How the 8-factor risk scoring engine works, 12+ test types, Jira & QMetry test analysis (AMCC stories & test cycles), export options.
- **⚡ Interactive QA Tools**: Generate test cases for any feature, review user stories against INVEST, compute exact boundary values, or format standard bug reports!

Try clicking one of the suggestions below or ask any question!`,
        category: "Introduction",
        source: "Expert Engine",
        suggestedFollowUps: [
          "How does InsightQA calculate risk scores?",
          "What are the 7 ISTQB testing principles?",
          "Explain Severity vs Priority with real-world examples",
          "Generate test cases for a User Login feature"
        ]
      };
    }

    // 2. Check for Dynamic Interactive Tools:
    // 2a. Dynamic Test Case Generation
    if (/^(generate|write|create|give me|make)\s+(test\s+cases?|tests?|test\s+scenarios?)\s+(for|on|about)\s+/i.test(lower) ||
        (/test\s+cases?\s+for\s+/i.test(lower))) {
      return this.handleDynamicTestCaseGeneration(trimmed);
    }

    // 2b. Dynamic User Story / Acceptance Criteria Review
    if (/^(review|evaluate|check|critique|audit)\s+(this\s+)?(user\s+story|story|acceptance\s+criteria|ac)\b/i.test(lower) ||
        (lower.includes('as a') && lower.includes('i want') && lower.includes('so that'))) {
      return this.handleStoryReview(trimmed);
    }

    // 2c. Dynamic Boundary Value Calculation
    if (/boundary\s+values?|bva\b/i.test(lower) && /\d+/.test(lower) && (lower.includes('between') || lower.includes('from') || lower.includes('to') || lower.includes('range'))) {
      const bvaResult = this.handleBvaCalculation(trimmed);
      if (bvaResult) return bvaResult;
    }

    // 2d. Dynamic Bug Report Drafting
    if (/^(draft|write|create|format)\s+(a\s+)?(bug\s+report|defect\s+report)\s+(for|about)\s+/i.test(lower)) {
      return this.handleDynamicBugDraft(trimmed);
    }

    // 3. Match against Structured Knowledge Base
    const kbMatch = this.findBestKnowledgeMatch(lower);
    if (kbMatch && kbMatch.score >= 0.35) {
      return {
        reply: kbMatch.item.content,
        category: kbMatch.item.category,
        topicId: kbMatch.item.id,
        source: "Expert Knowledge Base",
        suggestedFollowUps: this.generateFollowUps(kbMatch.item.id)
      };
    }

    // 4. If OpenAI is available, try generative completion with QA Architect context
    if (this.openai) {
      try {
        const aiReply = await this.queryOpenAI(trimmed, conversationHistory);
        if (aiReply) {
          return {
            reply: aiReply,
            category: "AI QA Architect",
            source: "OpenAI Hybrid Engine",
            suggestedFollowUps: [
              "What test types should I prioritize?",
              "How can InsightQA analyze this in a user story?",
              "What edge cases should I consider?",
              "Show me the standard bug report template"
            ]
          };
        }
      } catch (err) {
        logger.warn('OpenAI query failed in chatbot service, falling back to local synthesis:', err.message);
      }
    }

    // 5. Intelligent Local QA Synthesis for general or composite queries
    return this.synthesizeLocalResponse(trimmed, lower);
  }

  /**
   * Search Knowledge Base for the highest scoring topic
   */
  findBestKnowledgeMatch(query) {
    let bestMatch = null;
    let highestScore = 0;

    for (const item of this.allTopics) {
      let score = 0;
      const lowerTitle = item.title.toLowerCase();
      const lowerContent = item.content.toLowerCase();

      // Title match
      if (lowerTitle.includes(query) || query.includes(lowerTitle)) {
        score += 0.8;
      }

      // Keyword matches
      for (const kw of item.keywords) {
        if (query.includes(kw.toLowerCase())) {
          score += 0.4;
        }
      }

      // Individual token overlap
      const queryWords = query.split(/\s+/).filter(w => w.length > 2);
      let wordHits = 0;
      for (const word of queryWords) {
        if (lowerTitle.includes(word)) wordHits += 2;
        else if (lowerContent.includes(word)) wordHits += 0.5;
      }
      score += (wordHits / Math.max(queryWords.length, 1)) * 0.3;

      if (score > highestScore) {
        highestScore = score;
        bestMatch = { item, score };
      }
    }

    return bestMatch;
  }

  /**
   * Generate dynamic test cases for any feature
   */
  handleDynamicTestCaseGeneration(query) {
    const featureName = query
      .replace(/^(generate|write|create|give me|make)\s+(test\s+cases?|tests?|test\s+scenarios?)\s+(for|on|about)\s+/i, '')
      .replace(/^test\s+cases?\s+for\s+/i, '')
      .trim();

    const title = featureName ? featureName.charAt(0).toUpperCase() + featureName.slice(1) : 'Requested Feature';

    const reply = `### 📋 Comprehensive Test Cases: ${title}

Here is a structured test suite covering Positive, Negative, Boundary, Security, and Edge Case scenarios designed according to standard QA regulations.

---

#### 1. Functional & Positive Test Cases (Happy Path)
| TC ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| **TC-01** | Successful standard flow | Execute primary action with valid standard data | System completes operation successfully and confirms status | High |
| **TC-02** | Default values verification | Trigger action without optional inputs | System applies correct defaults and persists state | Medium |
| **TC-03** | Immediate UI state reflection | Complete action and observe view | UI updates immediately without manual browser refresh | Medium |

#### 2. Negative & Validation Test Cases (Error Handling)
| TC ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| **TC-04** | Mandatory field omission | Leave required fields blank and submit | Red validation messages appear; form submission blocked | High |
| **TC-05** | Invalid characters / format | Enter special symbols (\`@#$%^&*\`) or malformed input | Clear, user-friendly error message indicating format requirements | High |
| **TC-06** | Duplicate entry rejection | Attempt to submit already existing unique data | Error message: "Record already exists"; no duplicate written | High |

#### 3. Boundary & Edge Case Scenarios
| TC ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| **TC-07** | Min Boundary limit | Enter minimum allowable characters / numbers | Accepted and processed cleanly | High |
| **TC-08** | Max Boundary limit + 1 | Enter 1 character/unit exceeding maximum limit | System cuts off or displays character limit validation warning | High |
| **TC-09** | Rapid double-click / debounce | Double click submit button rapidly | Only one request transmitted; no duplicate records created | High |
| **TC-10** | Network timeout / offline | Trigger action and disconnect network immediately | Graceful retry prompt or offline warning; no app crash | Medium |

#### 4. Security & Access Control
| TC ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| **TC-11** | XSS Script injection | Enter \`<script>alert('XSS')</script>\` in input fields | Script sanitized and stored/rendered as escaped text | Critical |
| **TC-12** | Unauthorized direct access | Invoke endpoint directly without active session / auth token | HTTP 401/403 returned; user redirected to login | Critical |

> [!TIP]
> **Next Step in InsightQA**: You can paste this feature into **Analyze Story** (\`/analyze\`) to get automated multi-factor risk scores, stakeholder clarification questions, and exportable test matrices!`;

    return {
      reply,
      category: "Test Case Generation",
      source: "Expert Engine",
      suggestedFollowUps: [
        `What are the boundary values for ${title}?`,
        `How would InsightQA score the risk for ${title}?`,
        "Show me the WCAG accessibility checklist for this feature",
        "Generate negative edge cases for API testing"
      ]
    };
  }

  /**
   * Evaluate a user story against QA standards (INVEST & BDD)
   */
  handleStoryReview(query) {
    const isStandardFormat = /as a/i.test(query) && /i want/i.test(query) && /so that/i.test(query);
    const hasAcceptanceCriteria = /acceptance criteria|given|when|then|scenario/i.test(query);
    
    // Check for vague ambiguous words
    const ambiguousWords = ['fast', 'user-friendly', 'seamless', 'instant', 'easy', 'modern', 'reliable', 'quick', 'good', 'appropriate'];
    const detectedAmbiguities = ambiguousWords.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(query));

    let reply = `### 🔍 User Story QA Audit & Review Report

Here is a rigorous QA analysis of your submitted user story evaluated against the **INVEST** criteria and **ISTQB Quality Gates**:

---

#### 1. Format & Structure Evaluation
- **Standard Format (\`As a... I want... So that...\`)**: ${isStandardFormat ? '✅ **Present and structured**' : '⚠️ **Missing standard format** (Recommend rewording as: *As a [User], I want [Action] so that [Benefit]*).'}
- **Acceptance Criteria**: ${hasAcceptanceCriteria ? '✅ **Included**' : '⚠️ **Missing explicit Acceptance Criteria**. User stories must include Given-When-Then criteria to meet the Definition of Ready (DoR).'}

#### 2. Ambiguity & Testability Flags
${detectedAmbiguities.length > 0 
  ? `> [!WARNING]
> **Vague Adjectives Detected**: [${detectedAmbiguities.map(a => `"${a}"`).join(', ')}]
> In QA, terms like "${detectedAmbiguities[0]}" are untestable without measurable metrics (e.g. replace "fast" with "response time under 200ms at 95th percentile").`
  : '✅ **No untestable subjective words detected.**'}

#### 3. The INVEST Compliance Scorecard
| Dimension | Assessment | QA Recommendation |
|---|---|---|
| **Independent** | ${isStandardFormat ? 'Pass' : 'Review'} | Verify no blocking dependencies on unmerged backend APIs. |
| **Negotiable** | Pass | Captures business intent clearly. |
| **Valuable** | ${query.includes('so that') ? 'Pass' : 'Warning'} | Ensure user benefit statement demonstrates tangible ROI. |
| **Estimable** | ${hasAcceptanceCriteria ? 'Pass' : 'Needs Criteria'} | Without explicit field rules, Dev/QA cannot accurately estimate effort. |
| **Small** | Pass | Fits within standard 1-3 day QA execution window. |
| **Testable** | ${hasAcceptanceCriteria && detectedAmbiguities.length === 0 ? 'Pass (High)' : 'Needs Tightening'} | Convert criteria into unambiguous pass/fail scenarios. |

#### 4. Recommended Gherkin BDD Template:
\`\`\`gherkin
Scenario: Successful standard operation
  Given the user is logged in with appropriate permissions
  When the user submits valid details
  Then the system updates the record within 1.5 seconds
  And displays a confirmation toast "Saved successfully"

Scenario: Validation error on missing required field
  Given the user leaves a mandatory field blank
  When the user attempts submission
  Then the system highlights the empty field in red
  And displays "This field is required" without clearing other inputs
\`\`\`

> [!TIP]
> You can paste this story into **Analyze Story** (\`/analyze\`) in InsightQA to generate full risk heatmaps and Jira export packages!`;

    return {
      reply,
      category: "User Story Review",
      source: "Expert Engine",
      suggestedFollowUps: [
        "How do I write Given-When-Then acceptance criteria?",
        "What is the Definition of Ready (DoR) checklist?",
        "How does InsightQA identify ambiguities in stories?",
        "Generate test cases for this story"
      ]
    };
  }

  /**
   * Calculate exact Boundary Values
   */
  handleBvaCalculation(query) {
    const numbers = query.match(/\b\d+\b/g);
    if (!numbers || numbers.length < 2) return null;

    const min = parseInt(numbers[0], 10);
    const max = parseInt(numbers[1], 10);
    if (min >= max) return null;

    const reply = `### 📐 Boundary Value Analysis (BVA) Calculation

For the numeric input range **[${min} to ${max}]**:

#### 1. Standard 2-Value BVA (ISTQB Standard)
Tests the boundary values and their immediate outside neighbors (Total 4 tests):
| Test Point | Value | Expected Behavior | Category |
|---|---|---|---|
| **Just Below Min** | \`${min - 1}\` | ❌ Rejected (Invalid Boundary Error) | Negative |
| **Min Boundary** | \`${min}\` | ✅ Accepted (Valid Minimum) | Positive |
| **Max Boundary** | \`${max}\` | ✅ Accepted (Valid Maximum) | Positive |
| **Just Above Max** | \`${max + 1}\` | ❌ Rejected (Invalid Boundary Error) | Negative |

#### 2. High-Criticality 3-Value BVA (Medical / Financial / Avionics)
Tests below, on, and above both boundaries (Total 6 tests):
- **Lower Boundary Triplet**: \`${min - 1}\` (Invalid), \`${min}\` (Valid Min), \`${min + 1}\` (Valid Interior).
- **Upper Boundary Triplet**: \`${max - 1}\` (Valid Interior), \`${max}\` (Valid Max), \`${max + 1}\` (Invalid).

#### 3. Equivalence Partitions (EP):
- **Valid Partition**: \`${min} ≤ X ≤ ${max}\` (e.g. test value \`${Math.floor((min + max) / 2)}\`)
- **Invalid Partition 1**: \`X < ${min}\` (e.g. test value \`${min - 5}\`)
- **Invalid Partition 2**: \`X > ${max}\` (e.g. test value \`${max + 5}\`)`;

    return {
      reply,
      category: "Test Design Regulations",
      source: "Expert Engine",
      suggestedFollowUps: [
        "What is the difference between 2-value and 3-value BVA?",
        "How does Equivalence Partitioning reduce test cases?",
        "How does InsightQA generate boundary value test recommendations?"
      ]
    };
  }

  /**
   * Draft a standard bug report
   */
  handleDynamicBugDraft(query) {
    const issueSummary = query
      .replace(/^(draft|write|create|format)\s+(a\s+)?(bug\s+report|defect\s+report)\s+(for|about)\s+/i, '')
      .trim();

    const title = issueSummary ? issueSummary : 'Unexpected application error during execution';

    const reply = `### 🐛 IEEE 829 / ISO 29119 Standard Defect Report

\`\`\`markdown
**Defect ID**: BUG-\${Date.now().toString().slice(-4)}
**Title**: [Module] ${title}
**Severity**: S2 - Critical (Major functionality impacted)
**Priority**: P2 - High (Must be resolved before release)

**Environment**:
- Environment: QA Staging (Build v1.4.2-rc3)
- Browser: Google Chrome 124.0 (Windows 11 64-bit)
- Screen Resolution: 1920x1080
- Test User: test_qa_admin@insightqa.local

**Preconditions**:
1. User is authenticated with standard credentials.
2. Required test prerequisites and data records are populated.

**Steps to Reproduce**:
1. Navigate to the relevant feature screen.
2. Trigger action: "${title}".
3. Observe system behavior and browser network/console tab.

**Expected Result**:
The system should process the transaction cleanly, display an affirmative confirmation message, and update database state without unhandled exceptions.

**Actual Result**:
Operation fails or behaves inconsistently with requirements. Console logs show uncaught exception; UI displays error toast or freezes.

**Log Snippet**:
[ERROR] 2026-09-09T15:40:12.000Z - Uncaught TypeError: Cannot read properties of undefined
HTTP Status: 500 Internal Server Error

**Workaround**:
None available for end users.

**Attachments**:
- screenshot_error_state.png
- network_trace.har
\`\`\``;

    return {
      reply,
      category: "Defect Regulations",
      source: "Expert Engine",
      suggestedFollowUps: [
        "What is the difference between Severity and Priority?",
        "What are the mandatory fields in an ISO 29119 bug report?",
        "How do I triage S1 vs S2 defects?"
      ]
    };
  }

  /**
   * Fallback synthesis for general queries
   */
  synthesizeLocalResponse(query, lower) {
    let reply = `### 💡 QA Expert Response

You asked: *"**${query}**"*

Here is guidance from the software quality assurance knowledge base:

- **Quality Principle**: In modern Agile and DevOps practices, quality is built-in from day one rather than tested at the end. Use **Shift-Left Testing** to validate requirements before code is written.
- **Risk Mitigation**: Prioritize testing based on business impact and technical complexity (use InsightQA's 8 weighted risk factors: Security, Financial, Compliance, Data Integrity, Integration, Performance, Complexity, and UX).
- **Test Coverage**: Combine deterministic black-box techniques (Equivalence Partitioning & Boundary Value Analysis) with risk-based exploratory testing.
- **InsightQA Application Feature**: If you are working with user stories or Jira issues, enter them in the **Analyze Story** or **Jira Tests** section of InsightQA AI to generate tailored test cases, edge cases, and risk matrices.

What specific area would you like to explore deeper?`;

    return {
      reply,
      category: "General QA & Application",
      source: "Expert Engine",
      suggestedFollowUps: [
        "What are the 7 ISTQB testing principles?",
        "How does InsightQA calculate risk scores?",
        "Explain Severity vs Priority with real-world examples",
        "How to use Jira and QMetry test analysis in InsightQA?"
      ]
    };
  }

  /**
   * Call OpenAI API if configured
   */
  async queryOpenAI(userPrompt, conversationHistory) {
    if (!this.openai) return null;

    const messages = [
      {
        role: 'system',
        content: `You are the InsightQA AI Assistant, an elite Software QA Architect and testing expert embedded in the InsightQA AI application.
You possess deep knowledge of:
1. All QA rules, regulations, and testing standards: ISTQB testing principles, IEEE 829 and ISO/IEC/IEEE 29119 bug reporting, Defect Severity vs Priority, Quality Gates (DoR, DoD, INVEST), WCAG 2.1/2.2 AA accessibility, OWASP Top 10 security, HIPAA, GDPR, PCI-DSS compliance, and QA metrics (DRE, defect density).
2. The InsightQA AI application: NLP user story analysis, 8-factor risk scoring (Security 3.0, Financial 2.8, Compliance 2.7, Data Integrity 2.5, Integration 2.3, Performance 2.0, Complexity 2.0, UX 1.5), 12+ test types, dynamic edge cases, clarification questions, Jira & QMetry test tracking (AMCC-998, AMCC-TR-689), templates, and export options.
Always respond in rich GitHub-flavored Markdown with clear headings, bullet points, tables, and code snippets where appropriate. Be concise, authoritative, practical, and accurate.`
      }
    ];

    // Add previous history (last 4 messages for context)
    if (Array.isArray(conversationHistory)) {
      const recent = conversationHistory.slice(-4);
      for (const msg of recent) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text || msg.content || ''
        });
      }
    }

    messages.push({ role: 'user', content: userPrompt });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.5,
      max_tokens: 1200
    });

    return completion.choices[0]?.message?.content || null;
  }

  /**
   * Context-aware follow-up suggestion generator
   */
  generateFollowUps(topicId) {
    const followUpsMap = {
      'istqb-7-principles': [
        "What is the Pesticide Paradox in testing?",
        "How do I apply Defect Clustering to test planning?",
        "Explain Defect Removal Efficiency (DRE) formula",
        "How does InsightQA identify high-risk areas?"
      ],
      'test-design-techniques': [
        "Show me 2-value vs 3-value BVA for age 18 to 65",
        "What are the rules for Equivalence Partitioning?",
        "When should I use a Decision Table in QA?",
        "Generate test cases for a numeric field"
      ],
      'severity-vs-priority': [
        "Give me an example of High Severity and Low Priority",
        "Give me an example of Low Severity and High Priority",
        "What are the mandatory fields in an ISO 29119 bug report?",
        "How do I triage S1 vs S2 defects in sprint planning?"
      ],
      'bug-reporting-standard': [
        "Draft a bug report for a failed checkout",
        "What is the difference between Severity and Priority?",
        "What information belongs in Preconditions vs Steps to Reproduce?",
        "How does the bug lifecycle work from New to Closed?"
      ],
      'agile-qa-quality-gates': [
        "What is the difference between DoR and DoD?",
        "How do I apply the INVEST criteria to user stories?",
        "Review this user story: As a customer I want fast search",
        "What are Given-When-Then acceptance criteria rules?"
      ],
      'accessibility-wcag-rules': [
        "What is the minimum color contrast for WCAG AA?",
        "What are the 4 principles in the POUR framework?",
        "What are keyboard trap rules and how to test them?",
        "How does InsightQA recommend accessibility testing?"
      ],
      'security-owasp-top-10': [
        "How do I test for Broken Object Level Authorization (BOLA/IDOR)?",
        "What are common SQL injection test payloads?",
        "What security tests does InsightQA recommend for login?",
        "How do I test brute-force rate limiting?"
      ],
      'compliance-hipaa-gdpr-pci': [
        "What are data masking rules for QA environments in GDPR?",
        "What is PHI in HIPAA and how should it be tested?",
        "Why are real credit cards banned in PCI-DSS testing?",
        "How do I test Right to Erasure (GDPR Article 17)?"
      ],
      'qa-metrics-and-kpis': [
        "What is the formula for Defect Removal Efficiency (DRE)?",
        "What is the benchmark for healthy Defect Density?",
        "What is the difference between Defect Leakage and Slippage?",
        "How to calculate Test Execution Rate?"
      ],
      'app-overview': [
        "How does InsightQA calculate risk scores?",
        "What 12 test types does InsightQA support?",
        "How do I analyze a Jira story using AMCC key?",
        "What export formats are available?"
      ],
      'app-risk-scoring': [
        "What are the weights for the 8 risk factors in InsightQA?",
        "What triggers a CRITICAL risk score in a user story?",
        "How do security keywords affect the risk score?",
        "How can I reduce the risk score of a story?"
      ],
      'app-12-test-types': [
        "How does InsightQA decide to recommend Security testing?",
        "What are the estimated effort hours for each test type?",
        "When is Boundary Value testing recommended?",
        "How to export recommended test cases to Excel?"
      ],
      'app-jira-qmetry-guide': [
        "How do I analyze Jira story AMCC-998?",
        "What is the QMetry test cycle key format (e.g. AMCC-TR-689)?",
        "What execution statuses does QMetry test analysis track?",
        "How does InsightQA handle QMetry API rate limits?"
      ],
      'app-export-and-templates': [
        "How to export analysis as an Excel spreadsheet?",
        "Can I import CSV test cases into QMetry or Zephyr?",
        "What story templates are available in InsightQA?",
        "How do I generate a PDF QA report?"
      ],
      'app-troubleshooting-env': [
        "What ports does InsightQA use locally?",
        "How do I configure my OpenAI API key in .env?",
        "How do I connect my Jira and QMetry credentials?",
        "Where is the SQLite database stored?"
      ]
    };

    return followUpsMap[topicId] || [
      "What are the 7 ISTQB testing principles?",
      "How does InsightQA calculate risk scores?",
      "Explain Severity vs Priority with examples",
      "Generate test cases for a feature"
    ];
  }

  /**
   * Get categorized prompt suggestions for the UI
   */
  getSuggestedPrompts() {
    return [
      {
        category: "QA Rules & Standards",
        icon: "BookOpen",
        prompts: [
          "What are the 7 ISTQB testing principles?",
          "Explain Severity vs Priority with real-world examples",
          "What are the rules for Boundary Value Analysis (BVA)?",
          "What is the IEEE 829 standard bug report format?"
        ]
      },
      {
        category: "InsightQA Application",
        icon: "Sparkles",
        prompts: [
          "How does InsightQA calculate the risk score?",
          "What 12+ test types does InsightQA support?",
          "How do I analyze Jira stories and QMetry test cycles?",
          "What export formats (Excel, PDF, CSV) are available?"
        ]
      },
      {
        category: "Compliance & Security",
        icon: "ShieldCheck",
        prompts: [
          "What is the WCAG 2.1 AA accessibility checklist?",
          "What are the OWASP Top 10 security test rules?",
          "What are GDPR and HIPAA test data masking rules?",
          "How do I test PCI-DSS payment workflows?"
        ]
      },
      {
        category: "Interactive QA Tools",
        icon: "Zap",
        prompts: [
          "Generate test cases for User Login with OTP",
          "Review this user story: As a buyer I want fast checkout",
          "Boundary values for numeric range 1 to 100",
          "Draft a bug report for payment gateway failure"
        ]
      }
    ];
  }

  /**
   * Return list of all topics for the knowledge browser
   */
  getKnowledgeTopics() {
    return this.allTopics.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      summary: t.summary
    }));
  }
}

module.exports = new QAChatbotService();
