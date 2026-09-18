/**
 * Template Routes
 * API endpoints for test case templates
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Predefined test case templates
const templates = {
  functional: {
    id: 'functional',
    name: 'Functional Test Case',
    description: 'Standard functional test case template following best practices',
    template: `## Test Case: [TC-{id}] {title}

**Module:** {module}
**Priority:** {priority}
**Type:** Functional

### Preconditions
- {precondition_1}
- {precondition_2}

### Test Data
| Field | Value |
|-------|-------|
| {field_1} | {value_1} |

### Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | {action_1} | {expected_1} |
| 2 | {action_2} | {expected_2} |
| 3 | {action_3} | {expected_3} |

### Postconditions
- {postcondition_1}

### Notes
{notes}
`,
    variables: ['id', 'title', 'module', 'priority', 'precondition_1', 'precondition_2', 'field_1', 'value_1', 'action_1', 'expected_1', 'action_2', 'expected_2', 'action_3', 'expected_3', 'postcondition_1', 'notes']
  },

  security: {
    id: 'security',
    name: 'Security Test Case',
    description: 'Security testing template for vulnerability assessment',
    template: `## Security Test Case: [SEC-{id}] {title}

**OWASP Category:** {owasp_category}
**Severity:** {severity}
**Attack Vector:** {attack_vector}

### Vulnerability Description
{vulnerability_description}

### Prerequisites
- {prerequisite_1}
- Security testing tools ready

### Test Procedure
| Step | Action | Payload/Input | Expected Behavior |
|------|--------|---------------|-------------------|
| 1 | {step_1} | {payload_1} | {expected_1} |
| 2 | {step_2} | {payload_2} | {expected_2} |

### Verification
- [ ] Application rejects malicious input
- [ ] No sensitive data exposed in error messages
- [ ] Audit log captures the attempt

### Remediation Recommendation
{remediation}

### References
- {reference_1}
`,
    variables: ['id', 'title', 'owasp_category', 'severity', 'attack_vector', 'vulnerability_description', 'prerequisite_1', 'step_1', 'payload_1', 'expected_1', 'step_2', 'payload_2', 'expected_2', 'remediation', 'reference_1']
  },

  boundary: {
    id: 'boundary',
    name: 'Boundary Value Test Case',
    description: 'Template for boundary value analysis testing',
    template: `## Boundary Value Test: [BVT-{id}] {field_name}

**Input Field:** {field_name}
**Data Type:** {data_type}
**Valid Range:** {min_value} to {max_value}

### Boundary Values Matrix

| Test | Input Value | Classification | Expected Result | Status |
|------|-------------|----------------|-----------------|--------|
| Min - 1 | {below_min} | Invalid | Error message | |
| Min | {min_value} | Valid | Accepted | |
| Min + 1 | {above_min} | Valid | Accepted | |
| Nominal | {nominal} | Valid | Accepted | |
| Max - 1 | {below_max} | Valid | Accepted | |
| Max | {max_value} | Valid | Accepted | |
| Max + 1 | {above_max} | Invalid | Error message | |

### Additional Edge Cases
- Empty input: {empty_behavior}
- Null input: {null_behavior}
- Special characters: {special_char_behavior}

### Notes
{notes}
`,
    variables: ['id', 'field_name', 'data_type', 'min_value', 'max_value', 'below_min', 'above_min', 'nominal', 'below_max', 'above_max', 'empty_behavior', 'null_behavior', 'special_char_behavior', 'notes']
  },

  api: {
    id: 'api',
    name: 'API Test Case',
    description: 'REST API testing template',
    template: `## API Test Case: [API-{id}] {endpoint_name}

**Endpoint:** {method} {endpoint_url}
**Authentication:** {auth_type}
**Content-Type:** application/json

### Request
\`\`\`json
{
  {request_body}
}
\`\`\`

### Headers
| Header | Value |
|--------|-------|
| Authorization | {auth_header} |
| Content-Type | application/json |

### Test Scenarios

#### Positive Test
| Scenario | Request | Expected Status | Expected Response |
|----------|---------|-----------------|-------------------|
| Valid request | {valid_request} | 200 OK | {success_response} |

#### Negative Tests
| Scenario | Request | Expected Status | Expected Response |
|----------|---------|-----------------|-------------------|
| Missing required field | {missing_field_request} | 400 Bad Request | {error_response_1} |
| Invalid format | {invalid_format_request} | 400 Bad Request | {error_response_2} |
| Unauthorized | No auth header | 401 Unauthorized | {unauthorized_response} |

### Response Validation
- [ ] Status code matches expected
- [ ] Response body structure is correct
- [ ] Response time < {max_response_time}ms
- [ ] Headers include required fields
`,
    variables: ['id', 'endpoint_name', 'method', 'endpoint_url', 'auth_type', 'request_body', 'auth_header', 'valid_request', 'success_response', 'missing_field_request', 'error_response_1', 'invalid_format_request', 'error_response_2', 'unauthorized_response', 'max_response_time']
  },

  performance: {
    id: 'performance',
    name: 'Performance Test Case',
    description: 'Load and performance testing template',
    template: `## Performance Test Case: [PERF-{id}] {test_name}

**Test Type:** {test_type}
**Target System:** {target_system}
**Environment:** {environment}

### Performance Requirements
| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| Response Time (avg) | {target_response_time} | < {max_response_time} |
| Throughput | {target_throughput} | > {min_throughput} |
| Error Rate | < 1% | < {max_error_rate}% |
| CPU Usage | < 70% | < {max_cpu}% |
| Memory Usage | < 80% | < {max_memory}% |

### Test Scenario
**Concurrent Users:** {concurrent_users}
**Ramp-up Period:** {ramp_up_period}
**Test Duration:** {test_duration}
**Think Time:** {think_time}

### User Journey
1. {step_1}
2. {step_2}
3. {step_3}

### Test Data Requirements
- {data_requirement_1}
- {data_requirement_2}

### Monitoring Points
- [ ] Application server metrics
- [ ] Database performance
- [ ] Network latency
- [ ] Error logs

### Exit Criteria
- All performance targets met
- No memory leaks detected
- System stable throughout test duration
`,
    variables: ['id', 'test_name', 'test_type', 'target_system', 'environment', 'target_response_time', 'max_response_time', 'target_throughput', 'min_throughput', 'max_error_rate', 'max_cpu', 'max_memory', 'concurrent_users', 'ramp_up_period', 'test_duration', 'think_time', 'step_1', 'step_2', 'step_3', 'data_requirement_1', 'data_requirement_2']
  },

  accessibility: {
    id: 'accessibility',
    name: 'Accessibility Test Case',
    description: 'WCAG compliance testing template',
    template: `## Accessibility Test Case: [A11Y-{id}] {component_name}

**WCAG Level:** {wcag_level}
**Success Criterion:** {wcag_criterion}
**Component:** {component_name}

### Test Environment
- Screen Reader: {screen_reader}
- Browser: {browser}
- Assistive Technology: {assistive_tech}

### Keyboard Navigation
| Action | Key Combination | Expected Behavior | Pass/Fail |
|--------|-----------------|-------------------|-----------|
| Focus element | Tab | {focus_expected} | |
| Activate | Enter/Space | {activate_expected} | |
| Navigate | Arrow keys | {navigate_expected} | |
| Exit | Escape | {exit_expected} | |

### Screen Reader Testing
| Element | Announced Text | Expected Announcement | Pass/Fail |
|---------|---------------|----------------------|-----------|
| {element_1} | | {expected_announcement_1} | |
| {element_2} | | {expected_announcement_2} | |

### Visual Testing
- [ ] Color contrast ratio >= 4.5:1 for normal text
- [ ] Color contrast ratio >= 3:1 for large text
- [ ] Focus indicator visible
- [ ] No information conveyed by color alone

### ARIA Attributes
- [ ] Proper role attributes
- [ ] aria-label present where needed
- [ ] aria-describedby for complex elements
- [ ] Live regions for dynamic content

### Notes
{notes}
`,
    variables: ['id', 'component_name', 'wcag_level', 'wcag_criterion', 'screen_reader', 'browser', 'assistive_tech', 'focus_expected', 'activate_expected', 'navigate_expected', 'exit_expected', 'element_1', 'expected_announcement_1', 'element_2', 'expected_announcement_2', 'notes']
  },

  integration: {
    id: 'integration',
    name: 'Integration Test Case',
    description: 'System integration testing template',
    template: `## Integration Test Case: [INT-{id}] {integration_name}

**Source System:** {source_system}
**Target System:** {target_system}
**Integration Type:** {integration_type}
**Protocol:** {protocol}

### Integration Overview
{integration_description}

### Prerequisites
- [ ] {source_system} is accessible
- [ ] {target_system} is accessible
- [ ] Test credentials configured
- [ ] Test data prepared

### Data Flow
\`\`\`
{source_system} -> {data_format} -> {target_system}
\`\`\`

### Test Scenarios

#### Happy Path
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger integration from {source_system} | Request sent successfully |
| 2 | Verify {target_system} receives data | Data received correctly |
| 3 | Validate data transformation | Data matches expected format |

#### Error Scenarios
| Scenario | Trigger | Expected Behavior |
|----------|---------|-------------------|
| Target unavailable | Stop {target_system} | Retry mechanism activated |
| Invalid data format | Send malformed data | Error logged, data rejected |
| Timeout | Simulate slow response | Timeout handled gracefully |

### Data Validation
| Field | Source Value | Expected Target Value | Transformation |
|-------|--------------|----------------------|----------------|
| {field_1} | {source_value_1} | {target_value_1} | {transformation_1} |

### Rollback Testing
- [ ] Partial failure handling
- [ ] Data consistency maintained
- [ ] No orphaned records

### Monitoring
- [ ] Integration logs captured
- [ ] Metrics recorded
- [ ] Alerts configured
`,
    variables: ['id', 'integration_name', 'source_system', 'target_system', 'integration_type', 'protocol', 'integration_description', 'data_format', 'field_1', 'source_value_1', 'target_value_1', 'transformation_1']
  },

  regression: {
    id: 'regression',
    name: 'Regression Test Suite',
    description: 'Regression testing checklist template',
    template: `## Regression Test Suite: [REG-{id}] {release_version}

**Release:** {release_version}
**Date:** {test_date}
**Environment:** {environment}
**Tester:** {tester_name}

### Scope
**Features Changed:** {changed_features}
**Impact Areas:** {impact_areas}

### Critical Path Tests
| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| REG-001 | {critical_test_1} | Critical | | |
| REG-002 | {critical_test_2} | Critical | | |
| REG-003 | {critical_test_3} | Critical | | |

### Smoke Tests
- [ ] Application launches successfully
- [ ] Login functionality works
- [ ] Core navigation functional
- [ ] Database connectivity confirmed

### Affected Module Tests
| Module | Test Cases | Passed | Failed | Blocked |
|--------|------------|--------|--------|---------|
| {module_1} | {module_1_tests} | | | |
| {module_2} | {module_2_tests} | | | |

### Integration Points
- [ ] API endpoints functional
- [ ] Third-party integrations verified
- [ ] Data synchronization working

### Performance Baseline
- [ ] Response times within baseline ± 10%
- [ ] No memory leaks
- [ ] No performance degradation

### Sign-off
| Role | Name | Status | Date |
|------|------|--------|------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |
`,
    variables: ['id', 'release_version', 'test_date', 'environment', 'tester_name', 'changed_features', 'impact_areas', 'critical_test_1', 'critical_test_2', 'critical_test_3', 'module_1', 'module_1_tests', 'module_2', 'module_2_tests']
  }
};

/**
 * GET /api/templates
 * Get all available templates
 */
router.get('/', (req, res) => {
  const templateList = Object.values(templates).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    variableCount: t.variables.length
  }));

  res.json({
    success: true,
    data: templateList
  });
});

/**
 * GET /api/templates/:id
 * Get a specific template
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const template = templates[id];

  if (!template) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Template not found'
    });
  }

  res.json({
    success: true,
    data: template
  });
});

/**
 * POST /api/templates/:id/generate
 * Generate a test case from template with provided values
 */
router.post('/:id/generate', (req, res) => {
  try {
    const { id } = req.params;
    const { values = {} } = req.body;
    
    const template = templates[id];

    if (!template) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Template not found'
      });
    }

    // Replace variables in template
    let generated = template.template;
    
    template.variables.forEach(variable => {
      const regex = new RegExp(`\\{${variable}\\}`, 'g');
      const value = values[variable] || `[${variable}]`;
      generated = generated.replace(regex, value);
    });

    res.json({
      success: true,
      data: {
        templateId: id,
        templateName: template.name,
        generated,
        missingVariables: template.variables.filter(v => !values[v])
      }
    });

  } catch (error) {
    logger.error('Template generation failed:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/templates/from-analysis
 * Generate test cases from analysis results
 */
router.post('/from-analysis', (req, res) => {
  try {
    const { analysisResult, templateTypes = ['functional'] } = req.body;

    if (!analysisResult) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis result is required'
      });
    }

    const generatedCases = [];

    // Generate test cases based on analysis
    templateTypes.forEach(type => {
      const template = templates[type];
      if (template && analysisResult.testRecommendations?.testTypes) {
        const relevantTests = analysisResult.testRecommendations.testTypes
          .filter(t => t.type.toLowerCase().includes(type) || type === 'functional');

        relevantTests.forEach((test, index) => {
          const values = {
            id: `${Date.now()}-${index}`,
            title: test.scenarios?.[0] || test.type + ' Test',
            module: analysisResult.storyComponents?.action || 'Feature',
            priority: test.priority,
            action_1: test.scenarios?.[0] || 'Execute test',
            expected_1: 'Expected behavior',
            notes: `Auto-generated from analysis ${analysisResult.id}`
          };

          let generated = template.template;
          Object.entries(values).forEach(([key, value]) => {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            generated = generated.replace(regex, value);
          });

          generatedCases.push({
            type,
            priority: test.priority,
            content: generated
          });
        });
      }
    });

    res.json({
      success: true,
      data: {
        analysisId: analysisResult.id,
        generatedCount: generatedCases.length,
        testCases: generatedCases
      }
    });

  } catch (error) {
    logger.error('Test case generation failed:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error.message
    });
  }
});

module.exports = router;
