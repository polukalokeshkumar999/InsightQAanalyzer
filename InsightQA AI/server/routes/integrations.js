/**
 * Integration Routes
 * API endpoints for Jira and Azure DevOps integration
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

const TEST_CATEGORIES = [
  'Functional',
  'API',
  'Integration',
  'Data Validation',
  'Device',
  'Responsive',
  'Database',
  'Exploratory'
];

const QMETRY_MAX_RETRIES = 1;
const QMETRY_MAX_INLINE_RETRY_MS = 10000;
let qmetryRequestPacing = Promise.resolve();
let qmetryNextRequestAt = 0;
let qmetryBlockedUntil = 0;

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function paceQmetryRequest() {
  const interval = Math.max(0, Number(process.env.QMETRY_REQUEST_INTERVAL_MS) || 250);
  const reservation = qmetryRequestPacing.then(async () => {
    const waitTime = Math.max(0, qmetryNextRequestAt - Date.now());
    if (waitTime) await delay(waitTime);
    qmetryNextRequestAt = Date.now() + interval;
  });

  qmetryRequestPacing = reservation.catch(() => { });
  await reservation;
}

function qmetryRetryDelay(response) {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now());
  }

  const configuredDelay = Number(process.env.QMETRY_RATE_LIMIT_RETRY_MS);
  return configuredDelay > 0 ? configuredDelay : null;
}

function qmetryRateLimitError(retryDelay) {
  const error = new Error('QMetry request limit reached. Wait a minute, then run the analysis again.');
  error.statusCode = 429;
  error.retryAfterSeconds = retryDelay ? Math.ceil(retryDelay / 1000) : 60;
  return error;
}

function getJiraAuth() {
  return Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
}

function getJiraBaseUrl() {
  const baseUrl = String(process.env.JIRA_BASE_URL || '').trim().replace(/\/+$/, '');

  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured.');
  if (!/^https?:\/\//i.test(baseUrl)) throw new Error('JIRA_BASE_URL must be an absolute HTTP(S) URL.');
  if (/mcp\.atlassian\.com/i.test(baseUrl)) {
    throw new Error('JIRA_BASE_URL must be your Jira site URL (for example https://company.atlassian.net), not the Atlassian MCP endpoint.');
  }

  return baseUrl;
}

function escapeJql(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function fieldValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(fieldValue).filter(Boolean).join(', ');
  return value.value || value.name || value.displayName || value.key || '';
}

function normalizeStatus(rawStatus) {
  const status = rawStatus.toLowerCase().replace(/[_-]/g, ' ').trim();
  if (/\b(pass|passed|success|successful)\b/.test(status)) return 'passed';
  if (/\b(fail|failed|failure|defect)\b/.test(status)) return 'failed';
  if (/\b(blocked|aborted)\b/.test(status)) return 'blocked';
  if (/\b(not executed|unexecuted|not run|todo|to do|open|ready|draft)\b/.test(status)) return 'notExecuted';
  if (/\b(executed|complete|completed|done|in progress)\b/.test(status)) return 'executed';
  return 'other';
}

function normalizeCategory(issue) {
  const fields = issue.fields || {};
  const configuredType = fieldValue(fields[process.env.JIRA_TEST_TYPE_FIELD]);
  const configuredFolder = fieldValue(fields[process.env.JIRA_TEST_FOLDER_FIELD]);
  const configuredModule = fieldValue(fields[process.env.JIRA_TEST_MODULE_FIELD]);
  const searchable = [
    configuredType,
    configuredFolder,
    configuredModule,
    fields.summary,
    ...(fields.labels || []),
    ...(fields.components || []).map(component => component.name)
  ].filter(Boolean).join(' ').toLowerCase();

  const rules = [
    ['Data Validation', /data[ -]?validation|field validation|schema/],
    ['API', /\bapi\b|endpoint|rest|graphql/],
    ['Integration', /integration|end[ -]?to[ -]?end|e2e/],
    ['Mobile', /mobile|android|ios|iphone|ipad/],
    ['Responsive', /responsive|viewport|breakpoint|tablet/],
    ['Database', /database|\bdb\b|sql|persistence/],
    ['Exploratory', /exploratory|session based|charter/]
  ];

  return rules.find(([, pattern]) => pattern.test(searchable))?.[0] || 'Functional';
}

function emptySummary() {
  return { total: 0, passed: 0, failed: 0, blocked: 0, executed: 0, notExecuted: 0, other: 0, otherStatuses: {} };
}

function summarize(testCases) {
  const summary = emptySummary();
  testCases.forEach(testCase => {
    summary.total += 1;
    summary[testCase.statusGroup] += 1;
    if (testCase.statusGroup === 'other') {
      const exactStatus = testCase.rawStatus || 'Unknown';
      summary.otherStatuses[exactStatus] = (summary.otherStatuses[exactStatus] || 0) + 1;
    }
  });
  summary.totalExecuted = summary.passed + summary.failed + summary.blocked + summary.executed;
  return summary;
}

async function jiraSearch(jql, fields) {
  const baseUrl = getJiraBaseUrl();
  const issues = [];
  let nextPageToken;

  do {
    const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${getJiraAuth()}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jql, fields, maxResults: 100, nextPageToken })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Jira search failed (${response.status}): ${details.slice(0, 300)}`);
    }

    const page = await response.json();
    issues.push(...(page.issues || []));
    nextPageToken = page.nextPageToken;
  } while (nextPageToken);

  return { issues };
}

async function qmetryRequest(path, options = {}) {
  const baseUrl = String(process.env.QMETRY_BASE_URL || 'https://qtmcloud.qmetry.com').trim().replace(/\/+$/, '');
  for (let attempt = 0; attempt <= QMETRY_MAX_RETRIES; attempt += 1) {
    if (Date.now() < qmetryBlockedUntil) {
      throw qmetryRateLimitError(qmetryBlockedUntil - Date.now());
    }

    await paceQmetryRequest();
    const response = await fetch(`${baseUrl}/rest/api/latest${path}`, {
      method: options.method || 'GET',
      headers: {
        'apiKey': process.env.QMETRY_API_KEY,
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (response.ok) return response.json();

    const details = await response.text();
    if (response.status !== 429) {
      throw new Error(`QMetry request failed (${response.status}): ${details.slice(0, 300)}`);
    }

    const retryDelay = qmetryRetryDelay(response);
    if (!retryDelay || retryDelay > QMETRY_MAX_INLINE_RETRY_MS || attempt === QMETRY_MAX_RETRIES) {
      qmetryBlockedUntil = Date.now() + (retryDelay || 60000);
      throw qmetryRateLimitError(retryDelay);
    }

    qmetryNextRequestAt = Math.max(qmetryNextRequestAt, Date.now() + retryDelay);
    logger.warn(`QMetry rate limit reached; retrying in ${Math.ceil(retryDelay / 1000)}s.`);
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function getQmetryModuleCycles(moduleName, projectId) {
  const folders = await qmetryRequest(
    `/projects/${projectId}/testcycle-folders/search?folderName=${encodeURIComponent(moduleName)}&mode=STRICT`
  );

  const exactFolders = (Array.isArray(folders) ? folders : []).filter(
    folder => folder.name?.localeCompare(moduleName, undefined, { sensitivity: 'accent' }) === 0
  );

  if (!exactFolders.length) return { folders: [], cycles: [] };

  const allFolders = await qmetryRequest(
    `/projects/${projectId}/testcycle-folders/search?folderName=&mode=CONTAINS`
  );
  const availableFolders = Array.isArray(allFolders) ? allFolders : [];
  const rootCandidates = exactFolders.map(root => {
    const rootPath = String(root.folderPath || root.name).replace(/\/+$/, '');
    const descendants = availableFolders.filter(folder => {
      const folderPath = String(folder.folderPath || folder.name);
      return folder.id === root.id || folderPath.startsWith(`${rootPath}/`);
    });
    return { root, descendants };
  });
  rootCandidates.sort((left, right) => right.descendants.length - left.descendants.length);
  const selectedRoot = rootCandidates[0];
  const matchedRoots = rootCandidates.map(candidate => candidate.root);
  const moduleFolders = rootCandidates.flatMap(candidate => candidate.descendants);
  const foldersById = new Map(availableFolders.map(folder => [folder.id, folder]));
  const uniqueFolders = moduleFolders.filter((folder, index, foldersToSearch) =>
    foldersToSearch.findIndex(candidate => candidate.id === folder.id) === index
  );
  const moduleFolderIds = new Set(uniqueFolders.map(folder => folder.id));
  const parentFoldersById = new Map();

  matchedRoots.forEach(root => {
    const parentChain = [];
    let parentId = root.parentId;

    while (parentId && parentId !== -1 && foldersById.has(parentId)) {
      const parent = foldersById.get(parentId);
      if (!moduleFolderIds.has(parent.id)) parentChain.unshift(parent);
      parentId = parent.parentId;
    }

    parentChain.forEach(parent => parentFoldersById.set(parent.id, parent));
  });
  const parentFolders = [...parentFoldersById.values()];

  const cyclesByFolder = await mapWithConcurrency(uniqueFolders, 4, async folder => {
    const cycles = [];
    let fetched = 0;
    let startAt = 0;
    let total = 0;

    do {
      const page = await qmetryRequest(
        '/testcycles/search?startAt=' + startAt + '&maxResults=100&fields=key,summary,folder,testcaseCount,testcaseExecutionProgress,archived',
        {
          method: 'POST',
          body: { projectId, filter: { projectId, folderId: folder.id } }
        }
      );
      const pageCycles = page.data || [];
      fetched += pageCycles.length;
      cycles.push(...pageCycles.filter(cycle => !cycle.archived));
      total = page.total || 0;
      startAt += page.maxResults || 100;
    } while (fetched < total);

    return cycles.map(cycle => ({
      ...cycle,
      folderId: folder.id,
      folderPath: folder.folderPath || folder.name
    }));
  });

  const cycles = cyclesByFolder.flat().filter((cycle, index, all) =>
    all.findIndex(candidate => candidate.key === cycle.key) === index
  );
  return { folders: uniqueFolders, parentFolders, cycles, root: selectedRoot.root, roots: matchedRoots };
}

function isDeviceFolderPath(folderPath) {
  return /(^|\/)(device(?: testing)?|mobile|tablet|android|ios|iphone|ipad|mac)(\/|$)/i.test(folderPath || '');
}

async function getQmetryCycleTests(cycle, jiraBaseUrl, options = {}) {
  const { fetchMissingDetails = true, testCaseDetails = new Map() } = options;
  const cycleKey = typeof cycle === 'string' ? cycle : cycle.key;
  const cycleSummary = typeof cycle === 'string' ? cycle : cycle.summary;
  const folderPath = typeof cycle === 'string' ? '' : cycle.folderPath;
  const executions = [];
  let startAt = 0;
  let total = 0;

  do {
    const page = await qmetryRequest(`/testcycles/${encodeURIComponent(cycleKey)}/executions?startAt=${startAt}&maxResults=100`);
    executions.push(...(page.data || []));
    total = page.total || 0;
    startAt += page.maxResults || 100;
  } while (executions.length < total);

  const details = await mapWithConcurrency(executions, 8, async execution => {
    try {
      const executionSummary = execution.testCaseSummary || execution.testcaseSummary || execution.testCase?.summary || execution.summary;
      if (executionSummary) return { summary: executionSummary };
      if (!fetchMissingDetails) return {};

      const version = execution.versionNo || 1;
      const cacheKey = `${execution.testCaseKey}:${version}`;
      if (!testCaseDetails.has(cacheKey)) {
        const detailRequest = qmetryRequest(`/testcases/${encodeURIComponent(execution.testCaseKey)}/versions/${version}`)
          .then(response => response.data || {})
          .catch(error => {
            testCaseDetails.delete(cacheKey);
            throw error;
          });
        testCaseDetails.set(cacheKey, detailRequest);
      }
      return await testCaseDetails.get(cacheKey);
    } catch (error) {
      logger.warn(`Unable to read QMetry test case ${execution.testCaseKey}: ${error.message}`);
      return {};
    }
  });

  return executions.map((execution, index) => {
    const detail = details[index];
    const rawStatus = execution.executionResult?.name || 'Not Executed';
    const issue = {
      fields: {
        summary: detail.summary || execution.testCaseKey,
        labels: [cycleSummary, folderPath].filter(Boolean),
        components: []
      }
    };
    const category = normalizeCategory(issue);

    return {
      id: `${cycleKey}:${execution.testCaseExecutionId || execution.testCycleTestCaseMapId || index}`,
      key: execution.testCaseKey,
      summary: detail.summary || execution.testCaseKey,
      rawStatus,
      statusGroup: normalizeStatus(rawStatus),
      category,
      folder: folderPath,
      module: cycleKey,
      mobileRelated: isDeviceFolderPath(folderPath) || category === 'Mobile' || category === 'Responsive',
      url: jiraBaseUrl,
      source: 'QMetry'
    };
  });
}

/**
 * POST /api/integrations/jira/import
 * Import user story from Jira
 */
router.post('/jira/import', async (req, res) => {
  try {
    const { issueKey } = req.body;

    if (!issueKey) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Jira issue key is required'
      });
    }

    // Check if Jira is configured
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_API_TOKEN) {
      return res.status(400).json({
        error: 'Configuration error',
        message: 'Jira integration is not configured. Please set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN in environment variables.'
      });
    }

    // Fetch from Jira API
    const jiraUrl = `${process.env.JIRA_BASE_URL}/rest/api/3/issue/${issueKey}`;
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    const response = await fetch(jiraUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    const issue = await response.json();

    // Extract user story content
    const userStory = extractJiraUserStory(issue);

    res.json({
      success: true,
      data: {
        issueKey: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        userStory,
        issueType: issue.fields.issuetype?.name,
        status: issue.fields.status?.name,
        priority: issue.fields.priority?.name
      }
    });

  } catch (error) {
    logger.error('Jira import failed:', error);
    res.status(500).json({
      error: 'Import failed',
      message: error.message
    });
  }
});

/**
 * POST /api/integrations/jira/test-analysis
 * Analyze test execution statuses for a Jira story or module.
 */
router.post('/jira/test-analysis', async (req, res) => {
  try {
    const scope = req.body.scope === 'module' ? 'module' : 'story';
    const identifier = String(req.body.identifier || '').trim();
    const qmetryCycleKey = String(req.body.qmetryCycleKey || '').trim().toUpperCase();

    if (!identifier) {
      return res.status(400).json({ error: 'Invalid request', message: 'A Jira story key or module name is required' });
    }
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
      return res.status(400).json({
        error: 'Configuration error',
        message: 'Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN before running Jira analysis.'
      });
    }
    if (scope === 'story' && !/^[A-Z][A-Z0-9_]*-\d+$/i.test(identifier)) {
      return res.status(400).json({ error: 'Invalid request', message: 'Enter a valid Jira story key, for example QA-142.' });
    }
    if (scope === 'module' && identifier.length > 100) {
      return res.status(400).json({ error: 'Invalid request', message: 'Module names must be 100 characters or fewer.' });
    }
    if (scope === 'module' && (!process.env.QMETRY_API_KEY || !process.env.QMETRY_PROJECT_ID)) {
      return res.status(400).json({
        error: 'Configuration error',
        message: 'Set QMETRY_API_KEY and QMETRY_PROJECT_ID before analyzing a QMetry module.'
      });
    }
    if (qmetryCycleKey && !/^[A-Z][A-Z0-9_]*-TR-\d+$/.test(qmetryCycleKey)) {
      return res.status(400).json({ error: 'Invalid request', message: 'Enter a valid QMetry cycle key, for example AMCC-TR-689.' });
    }
    if (qmetryCycleKey && !process.env.QMETRY_API_KEY) {
      return res.status(400).json({ error: 'Configuration error', message: 'Set QMETRY_API_KEY before analyzing a QMetry test cycle.' });
    }

    let jiraBaseUrl;
    try {
      jiraBaseUrl = getJiraBaseUrl();
    } catch (error) {
      return res.status(400).json({ error: 'Configuration error', message: error.message });
    }

    let jql = null;
    let result = { issues: [] };

    if (scope === 'story') {
      const escapedIdentifier = escapeJql(identifier);
      const issueTypes = process.env.JIRA_TEST_ISSUE_TYPES || 'Test,Test Case,Test Execution';
      const quotedTypes = issueTypes.split(',').map(type => `"${escapeJql(type.trim())}"`).join(', ');
      jql = `issuetype in (${quotedTypes}) AND (issue in linkedIssues("${escapedIdentifier}") OR parent = "${escapedIdentifier}") ORDER BY key`;
      const customFields = [
        process.env.JIRA_TEST_STATUS_FIELD,
        process.env.JIRA_TEST_TYPE_FIELD,
        process.env.JIRA_TEST_FOLDER_FIELD,
        process.env.JIRA_TEST_MODULE_FIELD
      ].filter(Boolean);
      result = await jiraSearch(jql, ['summary', 'status', 'issuetype', 'labels', 'components', ...customFields]);
    }

    const jiraTestCases = (result.issues || []).map(issue => {
      const fields = issue.fields || {};
      const rawStatus = fieldValue(fields[process.env.JIRA_TEST_STATUS_FIELD]) || fieldValue(fields.status) || 'Unknown';
      const folder = fieldValue(fields[process.env.JIRA_TEST_FOLDER_FIELD]);
      const moduleName = fieldValue(fields[process.env.JIRA_TEST_MODULE_FIELD]) || fields.components?.[0]?.name || '';
      const category = normalizeCategory(issue);
      const mobileRelated = category === 'Mobile' || /mobile|android|ios/i.test(folder);

      return {
        key: issue.key,
        summary: fields.summary || issue.key,
        rawStatus,
        statusGroup: normalizeStatus(rawStatus),
        category,
        folder,
        module: moduleName,
        mobileRelated,
        url: `${jiraBaseUrl}/browse/${issue.key}`,
        source: 'Jira'
      };
    });

    let qmetryFolders = [];
    let qmetryCycles = [];
    let qmetryTestCases = [];
    let qmetryRoot = null;
    let qmetryRoots = [];
    let qmetryParentFolders = [];

    if (scope === 'module') {
      const projectId = Number(process.env.QMETRY_PROJECT_ID);
      const moduleResult = await getQmetryModuleCycles(identifier, projectId);
      qmetryFolders = moduleResult.folders;
      qmetryCycles = moduleResult.cycles;
      qmetryRoot = moduleResult.root;
      qmetryRoots = moduleResult.roots || (moduleResult.root ? [moduleResult.root] : []);
      qmetryParentFolders = moduleResult.parentFolders;
      const testCaseDetails = new Map();
      const testsByCycle = await mapWithConcurrency(qmetryCycles, 4, cycle => getQmetryCycleTests(cycle, jiraBaseUrl, {
        fetchMissingDetails: false,
        testCaseDetails
      }));
      qmetryTestCases = testsByCycle.flat();
    } else if (qmetryCycleKey) {
      qmetryCycles = [{ key: qmetryCycleKey, summary: qmetryCycleKey, folderPath: '' }];
      qmetryTestCases = await getQmetryCycleTests(qmetryCycles[0], jiraBaseUrl);
    }

    const testCases = [...jiraTestCases, ...qmetryTestCases];
    const cycles = qmetryCycles.map(cycle => ({
      key: cycle.key,
      summary: cycle.summary || cycle.key,
      folderPath: cycle.folderPath || cycle.folder?.name || '',
      deviceRelated: isDeviceFolderPath(cycle.folderPath || cycle.folder?.name || ''),
      overall: summarize(qmetryTestCases.filter(testCase => testCase.module === cycle.key))
    }));

    const deviceTests = testCases.filter(testCase => testCase.mobileRelated);
    const normalTests = testCases.filter(testCase => !testCase.mobileRelated);
    const byCategory = Object.fromEntries(TEST_CATEGORIES.map(category => [
      category,
      category === 'Device'
        ? summarize(deviceTests)
        : summarize(testCases.filter(testCase => !testCase.mobileRelated && testCase.category === category))
    ]));
    const qmetryRootIds = new Set(qmetryRoots.map(root => root.id));
    const folderScope = [
      ...qmetryParentFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        path: folder.folderPath,
        relationship: 'Parent',
        cycles: null,
        overall: null
      })),
      ...qmetryFolders.map(folder => {
        const folderCycles = cycles.filter(cycle => cycle.folderPath === folder.folderPath);
        const folderTests = qmetryTestCases.filter(testCase => testCase.folder === folder.folderPath);
        return {
          id: folder.id,
          name: folder.name,
          path: folder.folderPath,
          relationship: qmetryRootIds.has(folder.id) ? 'Selected' : 'Subfolder',
          deviceRelated: isDeviceFolderPath(folder.folderPath),
          cycles: folderCycles.length,
          overall: summarize(folderTests)
        };
      })
    ];

    res.json({
      success: true,
      data: {
        scope,
        identifier,
        qmetryCycleKey: qmetryCycleKey || null,
        jql,
        overall: summarize(testCases),
        normal: summarize(normalTests),
        device: summarize(deviceTests),
        mobile: summarize(deviceTests),
        hasMobileTests: deviceTests.length > 0,
        byCategory,
        selectedRoot: qmetryRoot ? { id: qmetryRoot.id, name: qmetryRoot.name, path: qmetryRoot.folderPath } : null,
        matchedRoots: qmetryRoots.map(root => ({ id: root.id, name: root.name, path: root.folderPath })),
        folderScope,
        folders: qmetryFolders.map(folder => ({ id: folder.id, name: folder.name, path: folder.folderPath })),
        cycles,
        testCases
      }
    });
  } catch (error) {
    logger.error('Jira test analysis failed:', error);
    if (error.retryAfterSeconds) res.set('Retry-After', String(error.retryAfterSeconds));
    res.status(error.statusCode || 500).json({ error: 'Jira test analysis failed', message: error.message });
  }
});

/**
 * POST /api/integrations/azure/import
 * Import user story from Azure DevOps
 */
router.post('/azure/import', async (req, res) => {
  try {
    const { workItemId } = req.body;

    if (!workItemId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Azure DevOps work item ID is required'
      });
    }

    // Check if Azure DevOps is configured
    if (!process.env.AZURE_DEVOPS_ORG || !process.env.AZURE_DEVOPS_PAT) {
      return res.status(400).json({
        error: 'Configuration error',
        message: 'Azure DevOps integration is not configured. Please set AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, and AZURE_DEVOPS_PAT in environment variables.'
      });
    }

    const azureUrl = `https://dev.azure.com/${process.env.AZURE_DEVOPS_ORG}/${process.env.AZURE_DEVOPS_PROJECT}/_apis/wit/workitems/${workItemId}?api-version=7.0`;
    const auth = Buffer.from(`:${process.env.AZURE_DEVOPS_PAT}`).toString('base64');

    const response = await fetch(azureUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.status}`);
    }

    const workItem = await response.json();

    // Extract user story content
    const userStory = extractAzureUserStory(workItem);

    res.json({
      success: true,
      data: {
        workItemId: workItem.id,
        title: workItem.fields['System.Title'],
        description: workItem.fields['System.Description'],
        acceptanceCriteria: workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria'],
        userStory,
        workItemType: workItem.fields['System.WorkItemType'],
        state: workItem.fields['System.State'],
        priority: workItem.fields['Microsoft.VSTS.Common.Priority']
      }
    });

  } catch (error) {
    logger.error('Azure DevOps import failed:', error);
    res.status(500).json({
      error: 'Import failed',
      message: error.message
    });
  }
});

/**
 * GET /api/integrations/status
 * Check integration configuration status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      jira: {
        configured: !!(process.env.JIRA_BASE_URL && process.env.JIRA_API_TOKEN),
        baseUrl: process.env.JIRA_BASE_URL ? process.env.JIRA_BASE_URL.replace(/\/+$/, '') : null
      },
      azureDevOps: {
        configured: !!(process.env.AZURE_DEVOPS_ORG && process.env.AZURE_DEVOPS_PAT),
        organization: process.env.AZURE_DEVOPS_ORG || null,
        project: process.env.AZURE_DEVOPS_PROJECT || null
      }
    }
  });
});

/**
 * POST /api/integrations/jira/test
 * Test Jira connection
 */
router.post('/jira/test', async (req, res) => {
  try {
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_API_TOKEN) {
      return res.status(400).json({
        error: 'Not configured',
        message: 'Jira credentials not configured'
      });
    }

    const jiraUrl = `${process.env.JIRA_BASE_URL}/rest/api/3/myself`;
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    const response = await fetch(jiraUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Connection failed: ${response.status}`);
    }

    const user = await response.json();

    res.json({
      success: true,
      message: 'Jira connection successful',
      data: {
        email: user.emailAddress,
        displayName: user.displayName
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Connection failed',
      message: error.message
    });
  }
});

/**
 * Helper function to extract user story from Jira issue
 */
function extractJiraUserStory(issue) {
  let story = '';

  // Add summary
  if (issue.fields.summary) {
    story += issue.fields.summary + '\n\n';
  }

  // Add description (handle Atlassian Document Format)
  if (issue.fields.description) {
    if (typeof issue.fields.description === 'string') {
      story += issue.fields.description;
    } else if (issue.fields.description.content) {
      story += extractTextFromADF(issue.fields.description);
    }
  }

  // Add acceptance criteria if available
  const customFields = ['customfield_10001', 'customfield_10002', 'customfield_10003'];
  for (const field of customFields) {
    if (issue.fields[field]) {
      story += '\n\nAcceptance Criteria:\n' + issue.fields[field];
      break;
    }
  }

  return sanitizeImportedStoryText(story);
}

function sanitizeImportedStoryText(story) {
  return String(story)
    .replace(/\|\s*(?:password|passcode)\s*:\s*[^|\s\n]+/gi, '')
    .replace(/^\s*(?:figma|wireframe)\s+(?:password|passcode)\s*:\s*\S+\s*$/gim, '')
    .replace(/,\s*i\s+want\b/gi, ', I want')
    .replace(/([a-z])so\s+that\b/gi, '$1 so that')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Helper function to extract text from Atlassian Document Format
 */
function extractTextFromADF(adf) {
  let text = '';

  function processNode(node) {
    if (node.type === 'text') {
      text += node.text;
    } else if (node.type === 'paragraph') {
      if (node.content) {
        node.content.forEach(processNode);
      }
      text += '\n';
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      if (node.content) {
        node.content.forEach((item, index) => {
          text += node.type === 'orderedList' ? `${index + 1}. ` : '• ';
          if (item.content) {
            item.content.forEach(processNode);
          }
        });
      }
    } else if (node.content) {
      node.content.forEach(processNode);
    }
  }

  if (adf.content) {
    adf.content.forEach(processNode);
  }

  return text.trim();
}

/**
 * Helper function to extract user story from Azure DevOps work item
 */
function extractAzureUserStory(workItem) {
  let story = '';

  // Add title
  if (workItem.fields['System.Title']) {
    story += workItem.fields['System.Title'] + '\n\n';
  }

  // Add description (strip HTML)
  if (workItem.fields['System.Description']) {
    story += stripHtml(workItem.fields['System.Description']) + '\n\n';
  }

  // Add acceptance criteria
  if (workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria']) {
    story += 'Acceptance Criteria:\n' + stripHtml(workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria']);
  }

  return story.trim();
}

/**
 * Helper function to strip HTML tags
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

module.exports = router;
