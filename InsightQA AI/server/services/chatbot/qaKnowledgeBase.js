/**
 * Comprehensive QA & InsightQA Knowledge Base
 * Authoritative reference for Software Quality Assurance rules, regulations,
 * standards (ISTQB, IEEE 829, ISO 29119, WCAG, OWASP, HIPAA, GDPR),
 * and complete operational documentation for the InsightQA AI application.
 */

const QA_KNOWLEDGE_BASE = {
  // ==========================================
  // SECTION 1: QA RULES, STANDARDS & PRINCIPLES
  // ==========================================
  rulesAndPrinciples: [
    {
      id: 'istqb-7-principles',
      title: 'The 7 Core Principles of Software Testing (ISTQB)',
      category: 'QA Rules & Principles',
      keywords: ['principles', 'istqb', 'testing principles', 'rules of testing', '7 principles', 'core principles', 'basics', 'fundamentals'],
      summary: 'The 7 fundamental testing principles defined by ISTQB that govern all professional software testing.',
      content: `### 🎯 The 7 Core Principles of Software Testing (ISTQB Standard)

1. **Testing shows the presence of defects, not their absence**:
   Testing reduces the probability of undiscovered defects remaining in the software, but even if no defects are found, it is not proof of correctness.

2. **Exhaustive testing is impossible**:
   Testing everything (all combinations of inputs, preconditions, and timing) is infeasible except for trivial cases. Instead, use **Risk Analysis**, **Equivalence Partitioning**, and **Boundary Value Analysis** to focus test efforts.

3. **Early testing saves time and money**:
   Defects identified in requirement or design phases cost 10x to 100x less to fix than in production. Testing activities must start at the very beginning of the SDLC (Shift-Left Testing).

4. **Defect clustering (Pareto Principle / 80-20 Rule)**:
   A small number of modules usually contain most of the defects discovered during pre-release testing or are responsible for most operational failures (~80% of defects originate in ~20% of modules).

5. **Beware of the Pesticide Paradox**:
   If the same tests are repeated over and over again, eventually they will no longer find any new defects. Test cases and automated suites must be regularly reviewed, revised, and updated with new scenarios.

6. **Testing is context-dependent**:
   Testing is done differently in different contexts. For example, safety-critical medical device software is tested differently from an e-commerce mobile app or an internal reporting tool.

7. **Absence-of-errors fallacy**:
   Finding and fixing defects does not help if the system built is unusable and does not fulfill the users' needs and business expectations.`
    },
    {
      id: 'test-design-techniques',
      title: 'Black-Box Test Design Techniques (BVA, EP, Decision Tables)',
      category: 'Test Design Regulations',
      keywords: ['bva', 'boundary value analysis', 'equivalence partitioning', 'decision table', 'state transition', 'test design techniques', 'test techniques', 'black box'],
      summary: 'Rules and mathematical definitions for Boundary Value Analysis, Equivalence Partitioning, and Decision Tables.',
      content: `### 🧪 Standard Test Design Techniques & Rules

#### 1. Boundary Value Analysis (BVA)
BVA tests the boundaries between equivalence partitions where defects cluster most frequently.
- **2-Value BVA (ISTQB Standard)**: Test the boundary value itself and its immediate neighbors just outside the boundary.
  - *Example for Age (18 to 65)*: Test values: **17** (Invalid just below), **18** (Valid Min), **65** (Valid Max), **66** (Invalid just above).
- **3-Value BVA (High-Criticality Systems)**: Test value below, on boundary, and above boundary for both minimum and maximum.
  - *Example for Age (18 to 65)*: **17, 18, 19** and **64, 65, 66**.

#### 2. Equivalence Partitioning (EP)
Divides input domain into classes of data where all values are expected to be treated equivalently by the software:
- **Valid Partitions**: Values accepted by system logic.
- **Invalid Partitions**: Values that must trigger error handling and rejection.
- **Rule**: Every partition must be covered by at least one test case. Never combine multiple invalid partitions in a single test case (masking effect).

#### 3. Decision Table Testing
Used when complex business logic contains multiple condition combinations producing specific actions:
- **Rule**: If there are $N$ binary conditions, the complete table has $2^N$ rule columns.
- Collapse overlapping columns only after verifying independence.

#### 4. State Transition Testing
Evaluates systems where outputs depend on current state plus input (finite state machines):
- Test valid state transitions, invalid transitions (error states), and round-trip transitions.`
    },
    {
      id: 'severity-vs-priority',
      title: 'Defect Severity vs. Priority Matrix & Classification Rules',
      category: 'Defect Regulations',
      keywords: ['severity', 'priority', 'severity vs priority', 'defect classification', 'bug matrix', 'blocker', 'critical', 'major', 'minor', 'p1', 'p2', 'p3'],
      summary: 'Rules for classifying bug severity (technical impact) vs priority (business urgency) with concrete examples.',
      content: `### ⚖️ Defect Severity vs. Priority Matrix & Guidelines

**Severity** reflects the **technical impact** on the system or functionality.
**Priority** reflects the **business urgency** of fixing the defect.

#### Severity Levels (Technical Impact)
- **S1 - Blocker / Fatal**: System crash, data corruption, total core feature failure with no workaround.
- **S2 - Critical**: Core feature broken, severe performance degradation, major security flaw; complex workaround only.
- **S3 - Major**: Important feature fails, but standard workaround exists; secondary flows broken.
- **S4 - Minor**: Cosmetic defect, layout misalignment, non-critical validation message inaccuracy.
- **S5 - Trivial / Enhancement**: Typos, minor font size issues, suggestion for UX improvement.

#### Priority Levels (Business Urgency)
- **P1 - Immediate (Hotfix)**: Must be resolved immediately; blocks release or production deployment.
- **P2 - High**: Must be resolved before current sprint/release completes.
- **P3 - Medium**: Can be fixed in next scheduled sprint or patch release.
- **P4 - Low**: Backlog candidate; fix when time permits.

#### 📊 Real-World Scenario Matrix

| Severity | Priority | Real-World Example |
|---|---|---|
| **High (S1)** | **High (P1)** | Payment gateway throws 500 error on checkout for all customers. Database crashes on user login. |
| **High (S1)** | **Low (P4)** | System crashes when running on Windows 98 or using an unsupported, decommissioned legacy browser. |
| **Low (S4)** | **High (P1)** | Company logo or CEO name is misspelled on the public homepage; legal disclaimer text missing on launch day. |
| **Low (S4)** | **Low (P4)** | Small 2px padding misalignment in a footer link on an internal employee admin view. |`
    },
    {
      id: 'bug-reporting-standard',
      title: 'IEEE 829 / ISO 29119 Defect Reporting Regulations & Standard',
      category: 'Defect Regulations',
      keywords: ['bug report', 'defect report', 'how to report bug', 'ieee 829', 'iso 29119', 'bug template', 'steps to reproduce', 'reproducible', 'defect lifecycle'],
      summary: 'Mandatory fields and best practices for writing high-quality, actionable bug reports according to industry standards.',
      content: `### 📋 Standard Bug Report Structure (IEEE 829 / ISO 29119-3)

A high-quality defect report must be **Clear**, **Concise**, **Complete**, and **Reproducible**.

#### Mandatory Fields Checklist:
1. **Defect Title / Summary**: Concise, specific description in format: \`[Module] [Action] fails under [Condition]\`
   - *Good*: "[Checkout] 'Place Order' button disabled when applying 100% discount coupon"
   - *Bad*: "Checkout is broken"
2. **Environment**:
   - Application version / build number (e.g., v1.4.2-b108)
   - Browser & version / OS (e.g., Chrome 124.0.6367.91 on Windows 11 64-bit)
   - Test Data / User role used (e.g., QA Test Tenant, Admin Role)
3. **Preconditions**: State the system must be in prior to testing (e.g., user logged in with 2 items in cart).
4. **Steps to Reproduce (Numbered & Exact)**:
   1. Navigate to \`/checkout\`
   2. Enter promo code 'FREE100' and click 'Apply'
   3. Observe order total updates to $0.00
   4. Click 'Place Order'
5. **Expected Result**: System processes the free order and redirects to the confirmation receipt page.
6. **Actual Result**: System throws modal error: "Payment method required for zero-dollar order" and button disables.
7. **Severity & Priority**: S2 (Critical) / P1 (High).
8. **Artifacts**: Console logs, network HAR logs, screenshots/screen recording showing error timestamp.`
    },
    {
      id: 'agile-qa-quality-gates',
      title: 'Quality Gates: Definition of Ready (DoR), Definition of Done (DoD) & INVEST',
      category: 'Agile QA Regulations',
      keywords: ['dor', 'dod', 'definition of ready', 'definition of done', 'invest', 'quality gates', 'acceptance criteria', 'agile qa'],
      summary: 'Rules governing user story quality and exit/entry criteria in Agile QA workflows.',
      content: `### 🛡️ Agile QA Quality Gates & Story Rules

#### 1. Definition of Ready (DoR) - Entry Criteria for Sprint
A user story CANNOT be pulled into development until:
- [x] Clear business value statement in standard user story format.
- [x] Unambiguous, testable **Acceptance Criteria** written in Given-When-Then (BDD) format.
- [x] UI/UX wireframes/mockups attached with responsive states.
- [x] Dependencies (APIs, third-party services) identified and accessible in test environments.
- [x] Non-functional requirements (security, performance, accessibility) defined.
- [x] Story sized and meets the **INVEST** criteria.

#### 2. The INVEST Criteria for User Stories
- **I - Independent**: Can be developed and tested without coupling to other in-flight stories.
- **N - Negotiable**: Captures intent, leaving room for technical collaboration.
- **V - Valuable**: Delivers clear business or end-user value.
- **E - Estimable**: QA and Dev have enough clarity to estimate effort.
- **S - Small**: Completable within a single iteration/sprint (typically 1-3 days QA effort).
- **T - Testable**: Clear pass/fail verification criteria exist.

#### 3. Definition of Done (DoD) - Release Criteria
A feature cannot be released until:
- [x] All acceptance criteria tested and passed.
- [x] Automated unit and integration tests written and passing in CI/CD pipeline (>80% coverage).
- [x] Zero open S1/S2 (Blocker/Critical) defects.
- [x] Regression test suite executed with 100% pass rate on impacted modules.
- [x] Accessibility (WCAG 2.1 AA) and security automated scans clean.
- [x] Test execution recorded and signed off in QMetry/Jira.`
    },
    {
      id: 'accessibility-wcag-rules',
      title: 'WCAG 2.1 / 2.2 AA Accessibility Testing Regulations',
      category: 'Compliance & Regulations',
      keywords: ['wcag', 'accessibility', 'a11y', 'wcag 2.1', 'wcag 2.2', 'screen reader', 'contrast', 'keyboard navigation', 'pour', 'section 508'],
      summary: 'Mandatory accessibility testing rules and compliance checklists for web and mobile software.',
      content: `### ♿ WCAG 2.1 / 2.2 AA Testing Regulations (The POUR Framework)

Software must comply with the 4 core principles of digital accessibility:

#### 1. Perceivable
- **Text Alternatives (1.1.1)**: All non-text content (images, icons, charts) must have meaningful \`alt\` text or \`aria-label\`. Decorative icons must use \`aria-hidden="true"\`.
- **Color Contrast (1.4.3)**:
  - Normal text (< 18pt or < 14pt bold): minimum contrast ratio of **4.5:1** against background.
  - Large text (≥ 18pt or ≥ 14pt bold) and UI components/borders: minimum **3.0:1**.
- **No Color-Only Information (1.4.1)**: Never use color alone to convey meaning (e.g., error fields must have icons or text, not just red borders).

#### 2. Operable
- **Full Keyboard Navigation (2.1.1 & 2.1.2)**: Every interactive element must be reachable and actionable via \`Tab\`, \`Enter\`, \`Space\`, and Arrow keys. No keyboard traps.
- **Visible Focus Indicator (2.4.7)**: Clear outline or ring must be visible when an element receives keyboard focus. Never use \`outline: none\` without a custom focus style.
- **Target Size (2.5.8 - WCAG 2.2)**: Minimum clickable touch target size of 24x24 CSS pixels (44x44 CSS pixels recommended for mobile).

#### 3. Understandable
- **Predictable Navigation (3.2.1/3.2.2)**: Receiving focus must not automatically trigger a page change or form submission.
- **Error Identification & Suggestion (3.3.1/3.3.3)**: Form errors must clearly explain what went wrong and provide exact guidance on how to correct it.

#### 4. Robust
- **ARIA & Semantic HTML (4.1.2)**: Use native HTML elements (\`<button>\`, \`<nav>\`, \`<dialog>\`) before ARIA roles. Custom controls must have correct \`role\`, \`aria-expanded\`, and \`aria-checked\` states.`
    },
    {
      id: 'security-owasp-top-10',
      title: 'OWASP Top 10 Security Testing Rules & Vulnerability Checklist',
      category: 'Compliance & Regulations',
      keywords: ['owasp', 'security', 'vulnerability', 'sql injection', 'xss', 'csrf', 'idor', 'authentication', 'security testing', 'penetration testing'],
      summary: 'Critical security testing rules based on OWASP Top 10 vulnerabilities.',
      content: `### 🔒 OWASP Top 10 Security Testing Regulations & QA Checklist

Every user story touching input, authentication, or sensitive data must be validated against OWASP standards:

1. **A01: Broken Access Control (IDOR / Privilege Escalation)**:
   - *Rule*: Verify that User A cannot access or modify User B's resources by tampering with IDs in URLs or payload (e.g., changing \`/api/orders/101\` to \`/api/orders/102\`).
   - Test vertical escalation (standard user invoking admin APIs) and horizontal escalation.

2. **A02: Cryptographic Failures (Sensitive Data Exposure)**:
   - *Rule*: All data in transit must enforce TLS 1.3/1.2. Passwords, credit cards, and PII must never appear in logs, URLs, or local storage in cleartext.

3. **A03: Injection (SQL, NoSQL, OS Command, LDAP)**:
   - *Rule*: All user inputs, query parameters, and file uploads must be sanitized and validated using parameterized queries.
   - Test single quotes (\`'\`), SQL payloads (\`' OR 1=1 --\`), and script tags (\`<script>alert(1)</script>\`).

4. **A07: Identification & Authentication Failures**:
   - *Rule*: Enforce brute force protection (account lockout or CAPTCHA after 5 failed attempts). Enforce strong password complexity. Invalidate session tokens upon logout.

5. **A05: Security Misconfiguration**:
   - *Rule*: Stack traces and verbose database errors must never be exposed to the client in production responses.`
    },
    {
      id: 'compliance-hipaa-gdpr-pci',
      title: 'Regulatory Testing: HIPAA, GDPR & PCI-DSS Rules in QA',
      category: 'Compliance & Regulations',
      keywords: ['hipaa', 'gdpr', 'pci dss', 'compliance', 'privacy', 'pii', 'phi', 'data masking', 'synthetic data', 'audit logging'],
      summary: 'Rules for handling test data and testing compliance for healthcare, privacy, and payment systems.',
      content: `### 📜 Regulatory Testing Rules: HIPAA, GDPR & PCI-DSS

#### 1. GDPR (General Data Protection Regulation)
- **Data Minimization in QA**: Production databases containing real user names, emails, or phone numbers must NEVER be copied directly into QA environments without automated anonymization/pseudonymization.
- **Right to Erasure (Article 17)**: Test user deletion workflows to ensure personal records are purged or anonymized across primary databases, search indexes, and cache.
- **Explicit Consent**: Verify consent checkboxes are unchecked by default (no pre-ticked opt-in).

#### 2. HIPAA (Health Insurance Portability and Accountability Act)
- **Protected Health Information (PHI)**: 18 identifiers (names, medical record numbers, dates, photos) must be scrubbed in test environments.
- **Audit Trails**: Every view, update, export, or deletion of PHI must generate an immutable audit log entry containing User ID, Timestamp, Action, and IP Address.

#### 3. PCI-DSS (Payment Card Industry Data Security Standard)
- **Card Data Rules in QA**: Live credit card numbers must NEVER be used in QA environments. Always use payment gateway sandbox test cards (e.g., Stripe 4242...).
- **Prohibited Storage**: Never store CVV/CVC codes, PIN blocks, or magnetic stripe track data after transaction authorization, even in encrypted form.`
    },
    {
      id: 'qa-metrics-and-kpis',
      title: 'Essential QA Metrics, Formulas & KPIs',
      category: 'QA Metrics',
      keywords: ['metrics', 'kpi', 'dre', 'defect density', 'pass rate', 'execution rate', 'formula', 'calculations', 'qa metrics'],
      summary: 'Formulas and benchmarks for Defect Removal Efficiency, Defect Density, and Test Execution metrics.',
      content: `### 📈 Essential QA Metrics, Formulas & Benchmarks

1. **Defect Removal Efficiency (DRE)**:
   Measures testing effectiveness before software hits production.
   $$\\text{DRE} = \\frac{\\text{Defects found before release}}{\\text{Defects found before release} + \\text{Defects found in production}} \\times 100$$
   - *Target*: **> 90%** (World-class QA organizations achieve > 95%).

2. **Defect Density**:
   Measures the quality of software relative to its size.
   $$\\text{Defect Density} = \\frac{\\text{Total Confirmed Defects}}{\\text{Size (KLOC or Story Points)}}$$
   - *Benchmark*: < 1.0 defect per Story Point in healthy teams.

3. **Test Case Execution Rate**:
   $$\\text{Execution Rate} = \\frac{\\text{Executed Test Cases}}{\\text{Total Planned Test Cases}} \\times 100$$

4. **Defect Leakage (Slippage) Ratio**:
   $$\\text{Defect Leakage} = \\frac{\\text{Defects found by Customer/Production}}{\\text{Total Defects (QA + Prod)}} \\times 100$$
   - *Target*: **< 5%** defect leakage.`
    }
  ],

  // ==========================================
  // SECTION 2: INSIGHTQA AI APPLICATION MANUAL
  // ==========================================
  applicationGuide: [
    {
      id: 'app-overview',
      title: 'InsightQA AI - Core Capabilities & Architecture',
      category: 'InsightQA Application',
      keywords: ['insightqa', 'what is insightqa', 'application overview', 'features', 'capabilities', 'bluebolt', 'purpose', 'how it works'],
      summary: 'High-level overview of what InsightQA AI does and how it transforms user stories into complete test strategies.',
      content: `### 🚀 InsightQA AI - Intelligent QA Assistant Overview

**InsightQA AI** is an intelligent testing assistant that automatically analyzes user stories, identifies risks, generates prioritized test recommendations, dynamic edge cases, and helps QA engineers create thorough test plans faster than ever before.

#### Core Platform Features:
1. **NLP Story Analyzer**: Deconstructs user stories to extract Actors, Primary Actions, Business Rules, Data Fields, and Ambiguities.
2. **Multi-Factor Risk Scoring Engine**: Evaluates 8 weighted dimensions to calculate accurate risk levels (LOW, MEDIUM, HIGH, CRITICAL).
3. **12+ Test Type Recommender**: Recommends prioritized test types (Functional, Boundary, Negative, Security, Performance, Accessibility, Integration, API, Usability, Regression, Smoke, Exploratory).
4. **Dynamic Edge Case Generator**: Generates boundary conditions, missing scenario detections, and technical edge cases.
5. **Stakeholder Clarification Questions**: Detects ambiguities in requirements and generates questions for Product Owners before development begins.
6. **Jira & QMetry Test Analysis**: Directly inspects Jira issues, queries QMetry test cycle executions (e.g., AMCC-TR-689), and calculates live execution status metrics.
7. **Enterprise Exporting**: Exports reports to Excel (.xlsx), PDF, CSV, JSON, Markdown, and HTML.
8. **History & Analytics Tracking**: Persistent SQLite database storing analysis history, trends, and risk heatmaps.`
    },
    {
      id: 'app-risk-scoring',
      title: 'InsightQA Risk Scoring Algorithm & 8 Weighted Factors',
      category: 'InsightQA Application',
      keywords: ['risk score', 'risk calculation', 'how risk is calculated', '8 factors', 'risk algorithm', 'weights', 'hotspots', 'risk levels'],
      summary: 'Complete technical breakdown of how InsightQA calculates risk scores (0-10) and risk levels (LOW, MEDIUM, HIGH, CRITICAL).',
      content: `### 🎯 How InsightQA AI Calculates Risk Scores

InsightQA AI uses a multi-factor risk assessment engine defined in \`server/services/analyzer/riskAnalyzer.js\`. It evaluates 8 weighted dimensions plus specialized high-risk regex patterns:

#### The 8 Weighted Risk Factors:
1. **Security (Weight: 3.0)**:
   - Triggers: \`authentication\`, \`authorization\`, \`password\`, \`login\`, \`token\`, \`session\`, \`permission\`, \`admin\`, \`access control\`.
2. **Financial (Weight: 2.8)**:
   - Triggers: \`payment\`, \`transaction\`, \`credit\`, \`debit\`, \`billing\`, \`refund\`, \`invoice\`, \`currency\`.
3. **Compliance (Weight: 2.7)**:
   - Triggers: \`gdpr\`, \`hipaa\`, \`pci\`, \`compliance\`, \`audit\`, \`privacy\`, \`consent\`, \`pii\`.
4. **Data Integrity (Weight: 2.5)**:
   - Triggers: \`create\`, \`update\`, \`delete\`, \`database\`, \`import\`, \`export\`, \`migrate\`, \`save\`.
5. **Integration (Weight: 2.3)**:
   - Triggers: \`api\`, \`integration\`, \`third-party\`, \`external\`, \`sync\`, \`webhook\`, \`endpoint\`.
6. **Performance (Weight: 2.0)**:
   - Triggers: \`speed\`, \`load\`, \`concurrent\`, \`bulk\`, \`batch\`, \`scale\`, \`real-time\`.
7. **Complexity (Weight: 2.0)**:
   - Triggers: \`workflow\`, \`multiple\`, \`condition\`, \`rule\`, \`algorithm\`, \`validation\`.
8. **User Experience (Weight: 1.5)**:
   - Triggers: \`display\`, \`view\`, \`navigate\`, \`search\`, \`filter\`, \`responsive\`, \`mobile\`.

#### Risk Score Formula & Levels:
$$\\text{Risk Score} = \\min\\left(10, \\frac{\\sum (\\text{Match Count} \\times \\text{Factor Weight}) + \\sum \\text{Pattern Scores}}{\\text{Normalization Factor}}\\right)$$

- **CRITICAL (Score 8.0 - 10.0)**: Red badge. Immediate QA architect attention required; full security and boundary suite mandatory.
- **HIGH (Score 6.0 - 7.9)**: Orange badge. Extensive negative, integration, and performance coverage needed.
- **MEDIUM (Score 4.0 - 5.9)**: Yellow badge. Standard functional, boundary, and regression tests.
- **LOW (Score 0.0 - 3.9)**: Green badge. Straightforward UI/content story; smoke and basic positive tests sufficient.`
    },
    {
      id: 'app-12-test-types',
      title: 'InsightQA 12+ Test Types & Recommendation Engine',
      category: 'InsightQA Application',
      keywords: ['12 test types', 'test types', 'test recommendations', 'recommended tests', 'what tests are supported'],
      summary: 'Details on the 12+ test types generated by InsightQA AI, their trigger conditions, and default priorities.',
      content: `### 📊 InsightQA AI: The 12+ Recommended Test Types

InsightQA AI analyzes story keywords and NLP entities to generate customized test strategies across:

1. **Functional Testing** (High Priority, ~4 hrs): Verifies core business rules, user workflows, and Given-When-Then criteria.
2. **Boundary Value Testing** (High Priority, ~3 hrs): Tests field limits, numeric ranges, character lengths, and date thresholds.
3. **Negative Testing** (High Priority, ~3 hrs): Tests invalid inputs, rejected formats, missing parameters, and exception handling.
4. **Security Testing** (Critical Priority, ~8 hrs): Tests authentication, role-based authorization, SQLi, XSS, token expiration, and CSRF.
5. **Integration Testing** (High Priority, ~6 hrs): Verifies external API handshakes, database transactions, webhooks, and third-party services.
6. **Performance Testing** (Medium Priority, ~6 hrs): Measures response latency, concurrent user load, pagination, and bulk data operations.
7. **Accessibility Testing (WCAG)** (Medium Priority, ~3 hrs): Assesses keyboard navigation, screen reader ARIA tags, and color contrast.
8. **Usability Testing** (Medium Priority, ~4 hrs): Evaluates intuitive user flow, clear error messages, and responsive mobile layouts.
9. **API Testing** (High Priority, ~4 hrs): Verifies HTTP status codes, payload contracts, schema validations, and rate limiting.
10. **Database Testing** (High Priority, ~4 hrs): Checks data persistence, ACID transactions, foreign key constraints, and rollback states.
11. **Regression Testing** (High Priority, ~5 hrs): Validates that new changes have not broken existing upstream or downstream workflows.
12. **Smoke / Exploratory Testing** (High/Medium Priority, ~2-3 hrs): Rapid sanity checks on critical user journeys followed by time-boxed unscripted testing.`
    },
    {
      id: 'app-jira-qmetry-guide',
      title: 'Jira & QMetry Test Analysis Guide',
      category: 'InsightQA Application',
      keywords: ['jira', 'qmetry', 'jira tests', 'amcc', 'test cycle', 'how to use jira tests', 'integrations', 'test execution'],
      summary: 'Step-by-step instructions on using the Jira Story & QMetry Test Analysis features in InsightQA.',
      content: `### 🔗 Jira & QMetry Test Analysis Guide

InsightQA AI features direct integration with Jira and QMetry Test Management.

#### How to Analyze Jira Stories:
1. Navigate to **Analyze Story** (\`/analyze\`) in the left sidebar.
2. Enter the Jira Story Key (e.g., \`AMCC-998\`).
3. Click **Analyze Story**: The application fetches the issue summary, description, and acceptance criteria from Jira and generates full test recommendations, edge cases, and risk scoring.

#### How to Run QMetry Test Analysis:
1. Navigate to **Jira Tests** (\`/jira-tests\`) in the left sidebar.
2. Select your scope:
   - **Story Scope**: Enter a Jira Story Key (e.g., \`AMCC-998\`) AND the linked QMetry Test Cycle Key (e.g., \`AMCC-TR-689\`).
   - **Module Scope**: Enter a module or epic identifier to retrieve all linked test cycles.
3. Click **Analyze Test Coverage**.
4. The dashboard displays:
   - Total linked test cases
   - Status breakdown: **Passed**, **Failed**, **Blocked**, **Executed**, **Not Executed**
   - Execution progress bar & Pass rate percentage
   - Detailed list of test case keys, summaries, steps, and execution logs.`
    },
    {
      id: 'app-export-and-templates',
      title: 'InsightQA Templates & Export Capabilities',
      category: 'InsightQA Application',
      keywords: ['export', 'excel', 'pdf', 'csv', 'templates', 'how to export', 'json', 'markdown', 'html'],
      summary: 'Instructions on using pre-built user story templates and exporting test analyses.',
      content: `### 📄 Templates & Export Options in InsightQA AI

#### 1. Pre-built Story Templates:
Navigate to **Templates** (\`/templates\`) to generate standardized user stories:
- **Authentication & Security**: Login, MFA, Password Reset, SSO.
- **E-Commerce & Payments**: Cart Checkout, Payment Gateway, Promo Codes.
- **Data & Reporting**: Search, Advanced Filtering, Bulk CSV Export.
- **CRUD Operations**: Record creation, editing, soft deletion, audit logs.
- Click any template, fill in the custom parameters (e.g. Actor, Action, Data fields), and click **Analyze Generated Story** for instant QA strategy creation.

#### 2. Export Formats:
From any completed analysis screen, click the **Export** button to generate:
- 📊 **Excel (.xlsx)**: Formatted workbook with separate tabs for Summary, Test Recommendations, Edge Cases, and Test Case Templates.
- 📑 **PDF Document**: Executive QA strategy document with charts and risk heatmaps.
- 📋 **CSV File**: Tabular test cases ready for direct import into QMetry, Zephyr, or TestRail.
- 📝 **Markdown / HTML**: Ready to paste into Jira comments or Confluence wiki pages.
- 💻 **JSON**: Raw structured payload for CI/CD automation.`
    },
    {
      id: 'app-troubleshooting-env',
      title: 'InsightQA Setup, Ports & Configuration (.env)',
      category: 'InsightQA Application',
      keywords: ['ports', 'setup', 'config', '.env', 'openai key', 'qmetry api', 'jira token', 'troubleshooting', 'localhost'],
      summary: 'Technical architecture, default ports, environment variables, and troubleshooting steps for InsightQA AI.',
      content: `### ⚙️ InsightQA Architecture, Ports & Configuration

#### Port Allocation:
- **Frontend (Vite + React)**: \`http://localhost:5173\`
- **Backend (Express + Node.js)**: \`http://localhost:3001\`
- **API Base Route**: \`http://localhost:3001/api\`
- **Health Check**: \`http://localhost:3001/api/health\`

#### Environment Variables in \`.env\`:
\`\`\`bash
PORT=3001
NODE_ENV=development

# Optional: Enables OpenAI hybrid AI enhancements (system falls back to local engine if omitted)
OPENAI_API_KEY=your_key_here

# Jira Configuration
JIRA_BASE_URL="https://your-domain.atlassian.net"
JIRA_EMAIL="your-email@domain.com"
JIRA_API_TOKEN="your_jira_token"

# QMetry Configuration
QMETRY_API_KEY="your_qmetry_api_key"
QMETRY_PROJECT_ID=10524
\`\`\`

#### Database:
- SQLite database located at \`data/insightqa.db\`.
- Operates in WAL mode for concurrent, zero-latency reads and writes.`
    }
  ]
};

module.exports = QA_KNOWLEDGE_BASE;
