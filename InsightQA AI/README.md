# InsightQA AI 🚀

## AI-Powered User Story QA Analyzer

**Transform user stories into comprehensive test strategies in seconds.**

InsightQA AI is an intelligent testing assistant that automatically analyzes user stories, identifies risks, generates test recommendations, and helps QA engineers create thorough test plans faster than ever before.

![InsightQA AI Dashboard](./docs/images/dashboard-preview.png)

---

## ✨ Key Features That Make Us Unique

### 🧠 **AI-Powered Analysis Engine**
- Semantic understanding of user stories using NLP
- Context-aware test type recommendations
- Learning from team feedback to improve over time
- http://localhost:5173 -frontend
- http://localhost:3001 - backend
### 📊 **Smart Priority Scoring**
- Automated risk assessment with weighted factors
- Business impact analysis
- Technical complexity evaluation
- Historical defect pattern recognition

### 🎯 **Comprehensive Test Coverage**
- **12+ Test Types**: Functional, Boundary, Negative, Integration, Security, Performance, Accessibility, Usability, Regression, Smoke, Exploratory, API
- Dynamic edge case generation
- Missing scenario detection
- Acceptance criteria validation

### 🔗 **Seamless Integrations**
- Jira & Azure DevOps connectivity
- Import/Export capabilities (JSON, CSV, PDF)
- Team collaboration workspace
- Analysis history tracking

### 📈 **Visual Insights Dashboard**
- Risk heat maps
- Test coverage metrics
- Priority distribution charts
- Team productivity analytics

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone or navigate to the project
cd "InsightQA AI"

# Install all dependencies
npm run install-all

# Copy environment file
copy .env.example .env

# Start development servers
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## 📖 How It Works

### 1. Input Your User Story
Paste or import your user story in any format:
```
As a [user type], I want to [action] so that [benefit]
```

### 2. AI Analysis
InsightQA AI analyzes your story for:
- **Actors & Actions**: Who does what?
- **Data Fields**: What inputs/outputs exist?
- **Business Rules**: What conditions apply?
- **Dependencies**: What systems interact?
- **Ambiguities**: What needs clarification?

### 3. Get Actionable Insights
Receive a comprehensive report including:
- ✅ Prioritized test recommendations
- ⚠️ Risk assessment with severity scores
- 🔍 Edge cases & boundary conditions
- ❓ Clarification questions for stakeholders
- 📋 Ready-to-use test case templates

---

## 🎯 Test Types Covered

| Category | Test Types |
|----------|-----------|
| **Functional** | Positive, Negative, Boundary Value, Equivalence Partitioning |
| **Non-Functional** | Performance, Load, Stress, Security, Accessibility |
| **Integration** | API, Database, Third-party Services |
| **User Experience** | Usability, UI/UX, Cross-browser, Mobile Responsive |
| **Specialized** | Regression, Smoke, Sanity, Exploratory |

---

## 🔧 API Endpoints

### Core Analysis
```
POST /api/analyze          - Analyze a user story
GET  /api/analysis/:id     - Get analysis results
GET  /api/history          - Get analysis history
```

### Templates & Export
```
GET  /api/templates        - Get test case templates
POST /api/export/pdf       - Export as PDF
POST /api/export/csv       - Export as CSV
```

### Integrations
```
POST /api/integrations/jira/import         - Import from Jira
POST /api/integrations/jira/test-analysis  - Analyze Jira tests by story or module
POST /api/integrations/azure/import        - Import from Azure DevOps
POST /api/feedback                         - Submit feedback for learning
```

---

## 🏗️ Architecture

```
InsightQA AI/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS/Tailwind styles
│   └── ...
├── server/                 # Express.js backend
│   ├── controllers/        # Route controllers
│   ├── services/           # Business logic
│   │   ├── analyzer/       # Core analysis engine
│   │   ├── ai/             # AI/ML integration
│   │   └── integrations/   # External service connectors
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   └── utils/              # Utilities
├── docs/                   # Documentation
└── tests/                  # Test suites
```

---

## 🌟 What Makes InsightQA AI Special?

### For QA Engineers
- **Save 60%+ time** on test planning
- **Never miss edge cases** with AI suggestions
- **Standardized approach** across the team
- **Learn best practices** from intelligent recommendations

### For Team Leads
- **Consistent quality** across all projects
- **Track team metrics** and improvements
- **Knowledge sharing** through saved analyses
- **Audit trail** for compliance

### For Stakeholders
- **Faster releases** with better quality
- **Reduced production bugs** through comprehensive testing
- **Clear communication** with generated questions
- **ROI visibility** through productivity metrics

---

## 📊 Sample Analysis Output

```json
{
  "storyId": "US-1234",
  "summary": "User login with email and password",
  "riskScore": 8.5,
  "riskLevel": "HIGH",
  "testRecommendations": [
    {
      "type": "Security",
      "priority": "CRITICAL",
      "scenarios": [
        "SQL injection in email field",
        "Brute force attack prevention",
        "Session token security"
      ]
    }
  ],
  "edgeCases": [
    "Email with special characters",
    "Maximum password length",
    "Concurrent login attempts"
  ],
  "clarificationQuestions": [
    "What is the maximum number of failed login attempts?",
    "Should we support social login options?"
  ]
}
```

---

## 🛠️ Configuration

See `.env.example` for all configuration options including:
- OpenAI API integration for advanced analysis
- Jira/Azure DevOps connections
- Security settings
- Customization options

### Jira Test Analysis

Open **Jira Tests** in the application and search by Jira story key or module name. The report displays total, executed, passed, failed, not executed, blocked/other, an overall status pie chart, a separate mobile status chart, and coverage for Functional, API, Integration, Data Validation, Mobile, Responsive, Database, and Exploratory tests.

Set `JIRA_BASE_URL` to the Jira site URL, such as `https://company.atlassian.net`. Atlassian's MCP URL is not a Jira REST API base URL. Configure the `JIRA_TEST_*` variables in `.env` to match the issue types and custom field IDs used by Xray, Zephyr, or another Jira test-management app. In particular, map `JIRA_TEST_STATUS_FIELD` when execution status is stored separately from the Jira workflow status, and map `JIRA_TEST_FOLDER_FIELD` so mobile folders receive their own chart.

For QMetry-managed tests, set `QMETRY_API_KEY` and `QMETRY_PROJECT_ID`. Story analysis accepts the Jira story key and its QMetry test-cycle key (for example `AMCC-998` and `AMCC-TR-689`). Module analysis only needs a module name: it dynamically finds every exact-name QMetry test-cycle folder, retrieves the cycles in those folders, and aggregates their current execution results.

Story analysis finds Jira test issues linked to or parented by the story and includes the specified QMetry cycle. The Jira API user must have permission to browse the story and its test issues, and the QMetry API user must have Test Cycle View permission for the configured project.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

Built with ❤️ for QA Engineers everywhere.

**Transform your testing strategy with InsightQA AI!**
