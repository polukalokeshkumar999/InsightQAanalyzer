/**
 * AMCC Dynamic Core Functionality Analyzer Engine
 * Performs strictly READ-ONLY analysis of test repositories (AMCC_NEWFRAME_CLONE1)
 * Scans .feature files, Python test scripts, testData CSVs, and Excel test suites.
 * Supports dynamic coverage percentage (1% - 100%), 100% deterministic consistency,
 * and automatic change detection when test cases are added or modified.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const logger = require('../../utils/logger');

const DEFAULT_AMCC_PATH = 'c:\\Users\\Administrator\\Downloads\\AMCC_NEWFRAME_CLONE1';

class AMCCAnalyzer {
  constructor() {
    this.cachedPool = null;
  }

  /**
   * Computes a fast repository signature/fingerprint to detect any added, modified,
   * or deleted test files without needing to parse the full contents.
   */
  computeRepositoryFingerprint(repoPath) {
    let fileCount = 0;
    let totalSizeBytes = 0;
    let latestMtimeMs = 0;

    const scanForFingerprint = (dir) => {
      if (!fs.existsSync(dir)) return;
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (['.venv', 'venv', 'node_modules', '.git', '__pycache__', '.pytest_cache'].includes(item.name)) {
            continue;
          }
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            scanForFingerprint(fullPath);
          } else if (
            item.name.endsWith('.feature') ||
            (item.name.startsWith('test_') && item.name.endsWith('.py')) ||
            item.name.endsWith('.csv') ||
            item.name.endsWith('.xlsx')
          ) {
            try {
              const stat = fs.statSync(fullPath);
              fileCount++;
              totalSizeBytes += stat.size;
              if (stat.mtimeMs > latestMtimeMs) {
                latestMtimeMs = stat.mtimeMs;
              }
            } catch (e) {
              // ignore unreadable file
            }
          }
        }
      } catch (e) {
        logger.warn(`Fingerprint scan warning at ${dir}: ${e.message}`);
      }
    };

    scanForFingerprint(repoPath);

    return {
      fileCount,
      totalSizeBytes,
      latestMtimeMs,
      latestMtimeIso: new Date(latestMtimeMs || Date.now()).toISOString(),
      hash: `${fileCount}:${totalSizeBytes}:${Math.floor(latestMtimeMs)}`
    };
  }

  /**
   * Main analysis method supporting dynamic coverage percentage
   * Strictly READ-ONLY operations
   */
  async analyzeRepository(targetPath = DEFAULT_AMCC_PATH, coveragePercent = 30, forceRefresh = false) {
    const repoPath = targetPath || DEFAULT_AMCC_PATH;
    const clampedCoverage = Math.max(1, Math.min(100, parseFloat(coveragePercent) || 30));

    if (!fs.existsSync(repoPath)) {
      throw new Error(`Target repository path does not exist: ${repoPath}`);
    }

    const currentFingerprint = this.computeRepositoryFingerprint(repoPath);

    // Fast Cache Hit: Repository unchanged and we already have the scored test pool
    if (
      this.cachedPool &&
      !forceRefresh &&
      this.cachedPool.repoPath === repoPath &&
      this.cachedPool.fingerprint.hash === currentFingerprint.hash
    ) {
      logger.info(`AMCC Repo unchanged (${currentFingerprint.fileCount} test files). Fast dynamic slice for ${clampedCoverage}% coverage.`);
      return this.slicePool(this.cachedPool, clampedCoverage, currentFingerprint, false);
    }

    // Cache Miss or File Changes Detected: Re-scan and re-score
    const changeDetected = this.cachedPool !== null && this.cachedPool.fingerprint.hash !== currentFingerprint.hash;
    if (changeDetected) {
      logger.info(`Repository change detected in ${repoPath}! Previous hash: ${this.cachedPool.fingerprint.hash}, New hash: ${currentFingerprint.hash}. Re-scanning...`);
    } else {
      logger.info(`Starting initial read-only analysis of repository at: ${repoPath}`);
    }

    const startTime = Date.now();

    // Step 1: Read Sanity CSV and Excel test cases
    const sanityMatches = [
      ...this.parseSanityCsv(repoPath),
      ...this.parseExcelTestCases(repoPath)
    ];

    // Step 2: Discover and parse all .feature files
    const featureScenarios = this.parseAllFeatureFiles(repoPath);

    // Step 3: Discover and parse Python test scripts across tests/
    const pythonTests = this.parsePythonTestScripts(repoPath);

    // Step 4: Aggregate into Modules
    const modulesMap = {};

    const addToModule = (moduleName, testItem) => {
      const normalizedModule = this.normalizeModuleName(moduleName);
      if (!modulesMap[normalizedModule]) {
        modulesMap[normalizedModule] = {
          name: normalizedModule,
          featureFilesCount: 0,
          pythonFilesCount: 0,
          allTestCases: []
        };
      }
      modulesMap[normalizedModule].allTestCases.push(testItem);
    };

    featureScenarios.forEach(scen => addToModule(scen.module, scen));
    pythonTests.forEach(py => addToModule(py.module, py));

    // Count feature and python files per module
    Object.keys(modulesMap).forEach(modName => {
      const itemArr = modulesMap[modName].allTestCases;
      const uniqueFeatures = new Set(itemArr.filter(i => i.type === 'feature').map(i => i.filePath));
      const uniquePython = new Set(itemArr.filter(i => i.type === 'python').map(i => i.filePath));
      modulesMap[modName].featureFilesCount = uniqueFeatures.size;
      modulesMap[modName].pythonFilesCount = uniquePython.size;
    });

    // Step 5: Deterministically score and sort test cases per module
    let grandTotalScenarios = 0;
    const scoredModules = {};

    Object.keys(modulesMap).sort().forEach(modName => {
      const mod = modulesMap[modName];
      grandTotalScenarios += mod.allTestCases.length;

      // Score each test case
      const scoredCases = mod.allTestCases.map(tc => {
        const score = this.calculateCorePriorityScore(tc, sanityMatches);
        return { ...tc, score };
      });

      // Strict 4-level deterministic tie-breaker sorting:
      // 1. Score descending
      // 2. Issue key ascending
      // 3. Scenario title ascending
      // 4. File path ascending
      scoredCases.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const keyA = a.issueKey || '';
        const keyB = b.issueKey || '';
        const keyComp = keyA.localeCompare(keyB);
        if (keyComp !== 0) return keyComp;
        const titleComp = (a.title || '').localeCompare(b.title || '');
        if (titleComp !== 0) return titleComp;
        return (a.filePath || '').localeCompare(b.filePath || '');
      });

      scoredModules[modName] = {
        moduleName: modName,
        featureFilesCount: mod.featureFilesCount,
        pythonFilesCount: mod.pythonFilesCount,
        totalScenarios: mod.allTestCases.length,
        allScoredCases: scoredCases
      };
    });

    // Save to cache pool
    this.cachedPool = {
      repoPath,
      fingerprint: currentFingerprint,
      analyzedAt: new Date().toISOString(),
      scanDurationMs: Date.now() - startTime,
      grandTotalScenarios,
      sanityMatchesCount: sanityMatches.length,
      scoredModules
    };

    return this.slicePool(this.cachedPool, clampedCoverage, currentFingerprint, changeDetected);
  }

  /**
   * Slices the deterministic pool according to the requested coverage percentage.
   * Runs in sub-millisecond time.
   */
  slicePool(pool, coveragePercent, fingerprint, changeDetected) {
    let grandTotalCoreScenarios = 0;
    const modulesAnalysis = [];

    Object.keys(pool.scoredModules).sort().forEach(modName => {
      const mod = pool.scoredModules[modName];
      const totalCount = mod.totalScenarios;

      // Target core count: dynamic percentage of total cases (at least 1 if module has tests)
      const targetCoreCount = Math.max(1, Math.min(totalCount, Math.ceil(totalCount * (coveragePercent / 100))));
      grandTotalCoreScenarios += targetCoreCount;

      const coreTestCases = mod.allScoredCases.slice(0, targetCoreCount).map((tc, idx) => ({
        ...tc,
        coreRank: idx + 1,
        isCore: true,
        isCore30: coveragePercent === 30
      }));

      const secondaryTestCases = mod.allScoredCases.slice(targetCoreCount).map(tc => ({
        ...tc,
        isCore: false,
        isCore30: false
      }));

      modulesAnalysis.push({
        moduleName: modName,
        featureFilesCount: mod.featureFilesCount,
        pythonFilesCount: mod.pythonFilesCount,
        totalScenarios: totalCount,
        coreCount: targetCoreCount,
        core30Count: targetCoreCount, // backwards compatible alias
        coveragePercentage: coveragePercent,
        coreTestCases,
        secondaryCount: secondaryTestCases.length
      });
    });

    const compressionPercent = pool.grandTotalScenarios > 0
      ? Math.round(((pool.grandTotalScenarios - grandTotalCoreScenarios) / pool.grandTotalScenarios) * 100)
      : 0;

    const estimatedHoursSaved = Math.round((pool.grandTotalScenarios - grandTotalCoreScenarios) * (3 / 60));

    return {
      repositoryPath: pool.repoPath,
      analyzedAt: pool.analyzedAt,
      executionTimeMs: pool.scanDurationMs,
      coveragePercentage: coveragePercent,
      changeDetected,
      repositoryFingerprint: fingerprint,
      summary: {
        totalModules: modulesAnalysis.length,
        grandTotalScenarios: pool.grandTotalScenarios,
        grandTotalCoreScenarios,
        coveragePercentage: coveragePercent,
        overallCompression: compressionPercent,
        estimatedHoursSaved,
        sanityCsvCount: pool.sanityMatchesCount,
        totalFilesScanned: fingerprint.fileCount,
        lastRepositoryModified: fingerprint.latestMtimeIso
      },
      modules: modulesAnalysis
    };
  }

  /**
   * Parse sanityTestcases.csv and root csv files
   */
  parseSanityCsv(repoPath) {
    const csvMatches = [];
    const possibleCsvPaths = [
      path.join(repoPath, 'amc-cold-compass-portal-qa-automation', 'testData', 'sanityTestcases.csv'),
      path.join(repoPath, 'testcases_1786534294441.csv'),
      path.join(repoPath, 'testcases_1786622470983.csv')
    ];

    for (const p of possibleCsvPaths) {
      if (fs.existsSync(p)) {
        try {
          const text = fs.readFileSync(p, 'utf8');
          const lines = text.split('\n').filter(l => l.trim());
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
            if (cols.length >= 2) {
              csvMatches.push({
                issueKey: cols[0]?.replace(/"/g, '').trim() || `CSV-TC-${i}`,
                summary: cols[1]?.replace(/"/g, '').trim() || '',
                expectedResult: cols[6]?.replace(/"/g, '').trim() || ''
              });
            }
          }
        } catch (e) {
          logger.warn(`Failed reading CSV at ${p}: ${e.message}`);
        }
      }
    }
    return csvMatches;
  }

  /**
   * Parse Excel test case files in AMCC repo (e.g., testcases_*.xlsx)
   */
  parseExcelTestCases(repoPath) {
    const excelMatches = [];
    try {
      const files = fs.readdirSync(repoPath);
      const excelFiles = files.filter(f => f.startsWith('testcases_') && f.endsWith('.xlsx'));

      for (const ef of excelFiles) {
        const fullPath = path.join(repoPath, ef);
        try {
          const wb = xlsx.readFile(fullPath);
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          if (firstSheet) {
            const rows = xlsx.utils.sheet_to_json(firstSheet);
            rows.forEach(r => {
              const issueKey = r['Work Key'] || r['Issue Key'] || r['Key'] || '';
              const summary = r['Summary'] || r['Description'] || '';
              if (issueKey || summary) {
                excelMatches.push({
                  issueKey: String(issueKey).trim(),
                  summary: String(summary).trim(),
                  expectedResult: String(r['Expected Result'] || '').trim()
                });
              }
            });
          }
        } catch (err) {
          logger.warn(`Failed parsing excel file ${fullPath}: ${err.message}`);
        }
      }
    } catch (e) {
      logger.warn(`Could not read directory for excel files: ${e.message}`);
    }
    return excelMatches;
  }

  /**
   * Parse all Gherkin .feature files recursively
   */
  parseAllFeatureFiles(repoPath) {
    const scenarios = [];

    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (['.venv', 'venv', 'node_modules', '.git', '__pycache__', '.pytest_cache'].includes(item.name)) continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanDir(full);
        } else if (item.name.endsWith('.feature')) {
          this.parseSingleFeatureFile(repoPath, full, scenarios);
        }
      }
    };

    scanDir(repoPath);
    return scenarios;
  }

  /**
   * Parse single .feature file into Scenarios
   */
  parseSingleFeatureFile(repoPath, filePath, outScenarios) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(repoPath, filePath);
      const parts = relPath.split(path.sep);

      // Determine module — use the most specific named folder
      // For paths like features/Apps/actionPlans/... → use 'actionPlans'
      // For paths like features/reports/Outbound/ActualProjectedCuts/... → use 'ActualProjectedCuts'
      // For paths like features/accessManagement/... → use 'accessManagement'
      let moduleName = 'General';
      const featIdx = parts.indexOf('features');
      if (featIdx !== -1 && featIdx + 1 < parts.length) {
        const directChild = parts[featIdx + 1];
        // Containers whose children are distinct modules
        const groupFolders = ['Apps', 'R1-modules', 'reports'];
        if (groupFolders.includes(directChild) && featIdx + 2 < parts.length - 1) {
          // Use the sub-folder name (level below the group)
          moduleName = parts[featIdx + 2];
        } else {
          moduleName = directChild;
        }
      } else if (parts.length > 2) {
        moduleName = parts[parts.length - 2];
      }

      // Feature title
      const featureMatch = content.match(/Feature:\s*(.*)/i);
      const featureTitle = featureMatch ? featureMatch[1].trim() : path.basename(filePath, '.feature');

      // Extract scenarios
      const lines = content.split('\n');
      let currentTags = [];
      let currentScenario = null;

      lines.forEach((line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('@')) {
          const newTags = trimmed.split(/\s+/).filter(t => t.startsWith('@'));
          currentTags = [...currentTags, ...newTags];
        } else if (trimmed.match(/^(Scenario:|Scenario Outline:)\s*(.*)/i)) {
          const match = trimmed.match(/^(Scenario:|Scenario Outline:)\s*(.*)/i);
          const type = match[1];
          const title = match[2].trim() || 'Unnamed Scenario';

          // Extract issue key from tag, title, or filename (e.g., AMCC-TC-20191, AMCC-10891, AMCC-84)
          const tagWithKey = currentTags.find(t => /@?AMCC-(?:TC-)?\d+/i.test(t));
          const keyInTag = tagWithKey ? tagWithKey.replace(/^@/, '').toUpperCase() : null;
          const keyInTitle = title.match(/AMCC-(?:TC-)?\d+/i);
          const keyInPath = filePath.match(/AMCC-(?:TC-)?\d+/i);

          const issueKey = keyInTag || (keyInTitle ? keyInTitle[0].toUpperCase() : (keyInPath ? keyInPath[0].toUpperCase() : `AMCC-FT-${scenariosCount(outScenarios) + 1}`));

          currentScenario = {
            id: `scen-${scenariosCount(outScenarios) + 1}`,
            type: 'feature',
            issueKey,
            title,
            featureType: type,
            featureTitle,
            filePath: relPath,
            fileName: path.basename(filePath),
            module: moduleName,
            tags: currentTags,
            steps: [],
            preconditions: []
          };

          outScenarios.push(currentScenario);
          currentTags = [];
        } else if (currentScenario && (trimmed.startsWith('Given') || trimmed.startsWith('When') || trimmed.startsWith('Then') || trimmed.startsWith('And') || trimmed.startsWith('But'))) {
          currentScenario.steps.push(trimmed);
        }
      });
    } catch (e) {
      logger.warn(`Error reading feature file ${filePath}: ${e.message}`);
    }
  }

  /**
   * Parse Python test scripts across all test directories (step_defs, test_scripts, e2e, etc.)
   */
  parsePythonTestScripts(repoPath) {
    const pyTests = [];
    const testsBaseDir = path.join(repoPath, 'amc-cold-compass-portal-qa-automation', 'tests');

    if (!fs.existsSync(testsBaseDir)) return pyTests;

    const scanPy = (dir) => {
      let items;
      try {
        items = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        return;
      }

      for (const item of items) {
        if (['__pycache__', '.pytest_cache', '.venv', 'venv'].includes(item.name)) continue;
        const full = path.join(dir, item.name);

        if (item.isDirectory()) {
          // Avoid recursing into features dir since features are parsed separately
          if (item.name === 'features') continue;
          scanPy(full);
        } else if (item.name.startsWith('test_') && item.name.endsWith('.py')) {
          const relPath = path.relative(repoPath, full);
          const parts = relPath.split(path.sep);
          const moduleName = parts.length > 3 ? parts[parts.length - 2] : 'Global Test Scripts';

          try {
            const content = fs.readFileSync(full, 'utf8');

            // Check if this is pure pytest-bdd step definitions that just point to .feature
            // If it only binds scenarios without defining custom tests, we don't duplicate
            const testFuncs = content.match(/def test_[a-zA-Z0-9_]+/g) || [];

            if (testFuncs.length === 0) {
              // Standalone test script file without def test_ (or script-level runner)
              // Only add if it doesn't just re-import a feature file
              const bindsFeature = /scenarios\(["'].*\.feature["']\)/i.test(content);
              if (!bindsFeature) {
                pyTests.push({
                  id: `py-${pyTests.length + 1}`,
                  type: 'python',
                  issueKey: this.extractKeyFromFileName(item.name) || `PY-TEST-${pyTests.length + 1}`,
                  title: item.name.replace('.py', ''),
                  filePath: relPath,
                  fileName: item.name,
                  module: moduleName,
                  tags: ['@pytest', '@python'],
                  steps: ['Execute pytest test function in ' + item.name],
                  preconditions: ['Pytest environment initialized']
                });
              }
            } else {
              testFuncs.forEach(fn => {
                const funcName = fn.replace('def ', '');
                pyTests.push({
                  id: `py-${pyTests.length + 1}`,
                  type: 'python',
                  issueKey: this.extractKeyFromFileName(item.name) || `PY-${pyTests.length + 1}`,
                  title: funcName,
                  filePath: relPath,
                  fileName: item.name,
                  module: moduleName,
                  tags: ['@pytest', '@python'],
                  steps: [`Execute python test: ${funcName}`],
                  preconditions: ['Test environment active']
                });
              });
            }
          } catch (e) {
            logger.warn(`Error reading python script ${full}: ${e.message}`);
          }
        }
      }
    };

    scanPy(testsBaseDir);
    return pyTests;
  }

  /**
   * Calculate core priority score for dynamic extraction ranking
   */
  calculateCorePriorityScore(tc, sanityMatches) {
    let score = 5.0; // Base score

    const lowerTitle = (tc.title || '').toLowerCase();
    const lowerFile = (tc.fileName || '').toLowerCase();
    const tags = (tc.tags || []).map(t => t.toLowerCase());

    // 1. Critical QA Tag priority boosts
    if (tags.some(t => t.includes('critical') || t.includes('blocker') || t.includes('p0') || t.includes('sanity') || t.includes('smoke') || t.includes('core'))) {
      score += 6.0;
    } else if (tags.some(t => t.includes('p1') || t.includes('high') || t.includes('must-have') || t.includes('priority'))) {
      score += 4.0;
    }

    if (tags.some(t => t.includes('daas') || t.includes('regression') || t.includes('automated'))) {
      score += 2.0;
    }

    // 2. Sanity CSV / Excel match boost
    if (sanityMatches.some(m => (m.issueKey && m.issueKey === tc.issueKey) || (m.summary && lowerTitle.includes(m.summary.toLowerCase().substring(0, 25))))) {
      score += 4.5;
    }

    // 3. Primary business flow and operation keywords
    if (/login|auth|sso|create|submit|add|checkout|payment|order|role|user|permission|schedule|service|deprecate|deprecation|publish|active|security|audit|mandatory|validate|persist|save/i.test(lowerTitle)) {
      score += 3.0;
    }

    // 4. Primary landing page, services page or dashboard source
    if (/landing|service|services|primary|main|dashboard|home|details/i.test(lowerFile)) {
      score += 2.0;
    }

    // 5. Negative / Cosmetic / Cancel dialog penalty (core focuses on happy & critical business paths)
    if (/cancel|close|dialog|tooltip|paginate|sort|hover|icon/i.test(lowerTitle)) {
      score -= 1.5;
    }

    return Math.round(score * 10) / 10;
  }

  normalizeModuleName(rawModule) {
    // Exact 1-to-1 map: every real repository folder name → clean display label
    const map = {
      // ── features/ top-level folders ───────────────────────────────────────
      'accessManagement':        'Access Management',
      'analytics':               'Analytics & Reporting',
      'appointmentDashboard':    'Appointment Dashboard',
      'Apps':                    'Apps (Container)',
      'auditTrail':              'Audit Trail',
      'help':                    'Help',
      'homepageCustomization':   'Homepage Customization',
      'homePageDashboard':       'Homepage Dashboard',
      'homepageWidgets':         'Homepage Widgets',
      'Inbound':                 'Inbound Logistics',
      'login':                   'Login & Authentication',
      'menu':                    'Navigation Menu',
      'messageCenter':           'Message Center',
      'orderMaintainance':       'Order Maintenance',
      'outboundLoadStatus':      'Outbound Load Status',
      'profileManagement':       'Profile Management',
      'R1-modules':              'R1 Modules (Container)',
      'reports':                 'Reports (Container)',
      'roleManagement':          'Role Management',
      'rulesEngine':             'Rules Engine',
      'sanityTestcases':         'Sanity & Core Test Suite',
      'tms':                     'Transportation Management (TMS)',
      'userManagement':          'User Management',

      // ── features/Apps/ sub-folders ────────────────────────────────────────
      'actionPlans':             'Action Plans',
      'CIEvents':                'CI Events',
      'claims':                  'Claims',
      'claimsNew':               'Claims (New)',
      'CMO':                     'CMO Auditing & Templates',
      'createReceipt':           'Create Receipt',
      'dass':                    'DaaS API & Services',
      'Dass':                    'DaaS API & Services',
      'Help':                    'Help (Apps)',
      'holdsManagement':         'Holds Management',
      'manageCodes':             'Manage Codes',
      'manageConfigurations':    'Manage Configurations',
      'metrics':                 'Metrics',
      'Volumetrics':             'Volumetrics',

      // ── features/reports/ sub-folders ────────────────────────────────────
      'homePageWidgets':         'Reports – Homepage Widgets',
      'Inventory':               'Reports – Inventory',
      'Outbound':                'Reports – Outbound',
      'ProfileManagement':       'Reports – Profile Management',
      'USDALotLevelInventory':   'USDA Lot Level Inventory',
      'USDAMonthlyAgingHold':    'USDA Monthly Aging Hold',
      'USDAMonthlyInventoryAdjustment': 'USDA Monthly Inventory Adjustment',

      // ── reports/Inbound sub-folders ───────────────────────────────────────
      'ReceiptsEntry':           'Receipts Entry',

      // ── reports/Inventory sub-folders ────────────────────────────────────
      'Adjustments':             'Inventory Adjustments',
      'monthlySnapshot':         'Monthly Snapshot',
      'palletLevelInventory':    'Pallet Level Inventory',
      'TotalInventoryView':      'Total Inventory View',

      // ── reports/Outbound sub-folders ─────────────────────────────────────
      'ActualProjectedCuts':     'Actual Projected Cuts',
      'Orders':                  'Outbound Orders',
      'productOrderHistory':     'Product Order History',
      'ProjectedCut':            'Projected Cut',
      'ProjectedCuts':           'Projected Cuts',

      // ── Python / global ───────────────────────────────────────────────────
      'globalization':           'Globalization',
      'mcp_tests':               'MCP Tests',
      'reports_regression':      'Reports Regression',
      'Global Test Scripts':     'Global Test Scripts',
    };

    if (map[rawModule]) return map[rawModule];

    // Fallback: convert camelCase / PascalCase to space-separated Title Case
    return rawModule
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  extractKeyFromFileName(fileName) {
    const match = fileName.match(/AMCC-(?:TC-)?\d+/i);
    return match ? match[0].toUpperCase() : null;
  }
}

function scenariosCount(arr) {
  return arr ? arr.length : 0;
}

module.exports = new AMCCAnalyzer();
