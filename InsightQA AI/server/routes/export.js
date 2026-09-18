/**
 * Export Routes
 * API endpoints for exporting analysis results
 */

const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();
const { getAnalysis } = require('../services/database');
const logger = require('../utils/logger');

const EXCEL_COLORS = {
  navy: '1E3A5F',
  blue: '2563EB',
  white: 'FFFFFF',
  text: '1F2937',
  border: 'CBD5E1'
};

function bulletList(items) {
  const bullet = String.fromCharCode(8226);
  const values = (items || []).filter(Boolean);
  return values.length ? values.map(item => `${bullet} ${item}`).join('\n') : '-';
}

function addTableSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 20 }
  });

  sheet.columns = columns;
  sheet.addRows(rows);
  sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(columns.length).letter}1` };

  const header = sheet.getRow(1);
  header.height = 28;
  header.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.navy } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    let maxLineCount = 1;
    row.eachCell(cell => {
      maxLineCount = Math.max(maxLineCount, String(cell.value ?? '').split('\n').length);
      cell.font = { name: 'Calibri', size: 11, color: { argb: EXCEL_COLORS.text } };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: EXCEL_COLORS.border } } };
      if (rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    });
    row.height = Math.min(390, Math.max(22, maxLineCount * 15));
  });

  return sheet;
}

function addSummarySheet(workbook, analysis, result) {
  const sheet = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { key: 'label', width: 24 },
    { key: 'value', width: 34 },
    { key: 'detail', width: 24 },
    { key: 'notes', width: 44 }
  ];
  sheet.mergeCells('A1:D1');
  const title = sheet.getCell('A1');
  title.value = 'InsightQA AI Analysis Report';
  title.font = { name: 'Calibri', size: 20, bold: true, color: { argb: EXCEL_COLORS.white } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.navy } };
  title.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 38;

  [
    ['Story ID', analysis.story_id || '-', 'Story title', analysis.story_title || '-'],
    ['Created', new Date(analysis.created_at).toLocaleString(), 'Analysis ID', analysis.id],
    ['Risk level', analysis.risk_level || '-', 'Risk score', `${analysis.risk_score || 0}/10`],
    ['Coverage score', `${result.metrics?.coverageScore || 0}%`, 'Estimated effort', `${result.testRecommendations?.estimatedEffort?.total || 0} hours`]
  ].forEach(values => sheet.addRow(values));

  sheet.addRow([]);
  const storyHeading = sheet.addRow(['User Story']);
  sheet.mergeCells(`A${storyHeading.number}:D${storyHeading.number}`);
  const storyRow = sheet.addRow([analysis.user_story]);
  sheet.mergeCells(`A${storyRow.number}:D${storyRow.number}`);
  storyRow.height = 110;

  const findingsHeading = sheet.addRow(['Key Findings']);
  sheet.mergeCells(`A${findingsHeading.number}:D${findingsHeading.number}`);
  const findingsRow = sheet.addRow([bulletList(result.summary?.keyFindings)]);
  sheet.mergeCells(`A${findingsRow.number}:D${findingsRow.number}`);
  findingsRow.height = Math.max(45, (result.summary?.keyFindings?.length || 1) * 18);

  [storyHeading, findingsHeading].forEach(row => {
    row.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.blue } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  sheet.eachRow((row, rowNumber) => {
    if ([1, storyHeading.number, findingsHeading.number].includes(rowNumber)) return;
    row.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 11, color: { argb: EXCEL_COLORS.text } };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    });
  });

  for (let rowNumber = 2; rowNumber <= 5; rowNumber += 1) {
    ['A', 'C'].forEach(column => {
      sheet.getCell(`${column}${rowNumber}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.navy } };
    });
  }
}

/**
 * POST /api/export/json
 * Export analysis as JSON
 */
router.post('/json', async (req, res) => {
  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis ID is required'
      });
    }

    const analysis = getAnalysis(analysisId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Analysis not found'
      });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      exportFormat: 'JSON',
      analysis: {
        id: analysis.id,
        userStory: analysis.user_story,
        storyTitle: analysis.story_title,
        storyId: analysis.story_id,
        createdAt: analysis.created_at,
        riskScore: analysis.risk_score,
        riskLevel: analysis.risk_level,
        result: analysis.analysis_result
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="analysis-${analysisId}.json"`);
    res.json(exportData);

  } catch (error) {
    logger.error('JSON export failed:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

/**
 * POST /api/export/csv
 * Export analysis as CSV
 */
router.post('/csv', async (req, res) => {
  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis ID is required'
      });
    }

    const analysis = getAnalysis(analysisId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Analysis not found'
      });
    }

    const result = analysis.analysis_result;

    // Build CSV content
    let csv = 'InsightQA AI Analysis Report\n';
    csv += `Export Date,${new Date().toISOString()}\n`;
    csv += `Analysis ID,${analysis.id}\n`;
    csv += `Risk Score,${analysis.risk_score}\n`;
    csv += `Risk Level,${analysis.risk_level}\n\n`;

    // Test Recommendations
    csv += 'TEST RECOMMENDATIONS\n';
    csv += 'Type,Priority,Estimated Hours,Description\n';
    result.testRecommendations?.testTypes?.forEach(test => {
      csv += `"${test.type}","${test.priority}",${test.estimatedHours},"${test.description}"\n`;
    });

    csv += '\nEDGE CASES\n';
    csv += 'Category,Edge Case,Description,Priority\n';

    // Flatten edge cases
    Object.entries(result.edgeCases || {}).forEach(([category, cases]) => {
      cases.forEach(ec => {
        const desc = ec.description || ec.edgeCase || '';
        const priority = ec.priority || 'MEDIUM';
        csv += `"${category}","${ec.edgeCase || ec.testValue || ''}","${desc}","${priority}"\n`;
      });
    });

    csv += '\nCLARIFICATION QUESTIONS\n';
    csv += 'Category,Question,Priority\n';
    result.clarificationQuestions?.forEach(q => {
      csv += `"${q.category}","${q.question}","${q.priority}"\n`;
    });

    csv += '\nRISK FACTORS\n';
    csv += 'Category,Score,Impact\n';
    result.riskAssessment?.factors?.forEach(f => {
      csv += `"${f.category}",${f.score},"${f.impact}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analysis-${analysisId}.csv"`);
    res.send(csv);

  } catch (error) {
    logger.error('CSV export failed:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

/**
 * POST /api/export/xlsx
 * Export analysis as a styled Excel workbook
 */
router.post('/xlsx', async (req, res) => {
  try {
    const { analysisId } = req.body;
    if (!analysisId) {
      return res.status(400).json({ error: 'Invalid request', message: 'Analysis ID is required' });
    }

    const analysis = getAnalysis(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Not found', message: 'Analysis not found' });
    }

    const result = analysis.analysis_result;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'InsightQA AI';
    workbook.created = new Date();
    workbook.modified = new Date();

    addSummarySheet(workbook, analysis, result);

    addTableSheet(workbook, 'Test Recommendations', [
      { header: 'Test Type', key: 'type', width: 24 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Description', key: 'description', width: 42 },
      { header: 'Scenarios', key: 'scenarios', width: 70 },
      { header: 'Techniques', key: 'techniques', width: 38 },
      { header: 'Est. Hours', key: 'hours', width: 14 }
    ], (result.testRecommendations?.testTypes || []).map(test => ({
      type: test.type,
      priority: test.priority,
      description: test.description,
      scenarios: bulletList(test.scenarios),
      techniques: bulletList(test.techniques),
      hours: test.estimatedHours
    })));

    const edgeCaseRows = [];
    Object.entries(result.edgeCases || {}).forEach(([category, cases]) => {
      cases.forEach(edgeCase => edgeCaseRows.push({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        edgeCase: edgeCase.edgeCase || edgeCase.testValue || '-',
        description: edgeCase.description || '-',
        expected: edgeCase.expectedBehavior || '-',
        priority: edgeCase.priority || 'MEDIUM'
      }));
    });
    addTableSheet(workbook, 'Edge Cases', [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Edge Case', key: 'edgeCase', width: 34 },
      { header: 'Description', key: 'description', width: 48 },
      { header: 'Expected Behavior', key: 'expected', width: 48 },
      { header: 'Priority', key: 'priority', width: 14 }
    ], edgeCaseRows);

    addTableSheet(workbook, 'Questions', [
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Question', key: 'question', width: 70 },
      { header: 'Context', key: 'context', width: 42 }
    ], (result.clarificationQuestions || []).map(question => ({
      category: question.category,
      priority: question.priority,
      question: question.question,
      context: question.context || '-'
    })));

    addTableSheet(workbook, 'Risks', [
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Score', key: 'score', width: 12 },
      { header: 'Impact', key: 'impact', width: 16 },
      { header: 'Reason', key: 'reason', width: 64 }
    ], (result.riskAssessment?.factors || []).map(risk => ({
      category: risk.category,
      score: risk.score,
      impact: risk.impact,
      reason: risk.reason || '-'
    })));

    addTableSheet(workbook, 'Test Templates', [
      { header: 'Test Type', key: 'type', width: 22 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Title', key: 'title', width: 42 },
      { header: 'Preconditions', key: 'preconditions', width: 55 },
      { header: 'Steps', key: 'steps', width: 65 },
      { header: 'Expected Result', key: 'expected', width: 48 },
      { header: 'Test Data', key: 'testData', width: 48 }
    ], (result.testCaseTemplates || []).map(item => ({
      type: item.type,
      priority: item.priority,
      title: item.template?.title || '-',
      preconditions: bulletList(item.template?.preconditions),
      steps: bulletList(item.template?.steps),
      expected: item.template?.expectedResult || '-',
      testData: bulletList(Object.entries(item.template?.testData || {}).map(([key, value]) => `${key}: ${value}`))
    })));

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="analysis-${analysis.story_id || analysisId}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    logger.error('Excel export failed:', error);
    res.status(500).json({ error: 'Export failed', message: error.message });
  }
});

/**
 * POST /api/export/html
 * Export analysis as HTML report
 */
router.post('/html', async (req, res) => {
  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis ID is required'
      });
    }

    const analysis = getAnalysis(analysisId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Analysis not found'
      });
    }

    const result = analysis.analysis_result;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InsightQA AI Analysis Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { color: #1e40af; margin: 30px 0 15px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    h3 { color: #374151; margin: 20px 0 10px; }
    .meta { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .meta p { margin: 5px 0; }
    .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; color: white; }
    .risk-CRITICAL { background: #dc2626; }
    .risk-HIGH { background: #ea580c; }
    .risk-MEDIUM { background: #ca8a04; }
    .risk-LOW { background: #16a34a; }
    .priority-CRITICAL { color: #dc2626; font-weight: bold; }
    .priority-HIGH { color: #ea580c; font-weight: bold; }
    .priority-MEDIUM { color: #ca8a04; }
    .priority-LOW { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 12px; text-align: left; border: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    tr:hover { background: #f3f4f6; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .metric { background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
    .metric-label { font-size: 0.9em; color: #6b7280; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .section { margin-bottom: 30px; }
    .story-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; }
    @media print { body { max-width: none; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>🎯 InsightQA AI Analysis Report</h1>
  
  <div class="meta">
    <p><strong>Analysis ID:</strong> ${analysis.id}</p>
    <p><strong>Created:</strong> ${new Date(analysis.created_at).toLocaleString()}</p>
    <p><strong>Risk Level:</strong> <span class="risk-badge risk-${analysis.risk_level}">${analysis.risk_level}</span></p>
    <p><strong>Risk Score:</strong> ${analysis.risk_score}/10</p>
  </div>

  <div class="section">
    <h2>📝 User Story</h2>
    <div class="story-box">
      <p>${analysis.user_story}</p>
    </div>
  </div>

  <div class="section">
    <h2>📊 Quality Metrics</h2>
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${result.metrics?.coverageScore || 0}%</div>
        <div class="metric-label">Coverage Score</div>
      </div>
      <div class="metric">
        <div class="metric-value">${result.metrics?.completenessScore || 0}%</div>
        <div class="metric-label">Completeness</div>
      </div>
      <div class="metric">
        <div class="metric-value">${result.metrics?.testabilityScore || 0}%</div>
        <div class="metric-label">Testability</div>
      </div>
      <div class="metric">
        <div class="metric-value">${result.testRecommendations?.estimatedEffort?.total || 0}h</div>
        <div class="metric-label">Est. Test Effort</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🧪 Test Recommendations</h2>
    <table>
      <thead>
        <tr><th>Test Type</th><th>Priority</th><th>Est. Hours</th><th>Description</th></tr>
      </thead>
      <tbody>
        ${result.testRecommendations?.testTypes?.map(t => `
          <tr>
            <td><strong>${t.type}</strong></td>
            <td><span class="priority-${t.priority}">${t.priority}</span></td>
            <td>${t.estimatedHours}h</td>
            <td>${t.description}</td>
          </tr>
        `).join('') || '<tr><td colspan="4">No recommendations</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>⚠️ Risk Factors</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Score</th><th>Impact</th></tr>
      </thead>
      <tbody>
        ${result.riskAssessment?.factors?.map(f => `
          <tr>
            <td>${f.category}</td>
            <td>${f.score}</td>
            <td><span class="priority-${f.impact}">${f.impact}</span></td>
          </tr>
        `).join('') || '<tr><td colspan="3">No risk factors identified</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>🔍 Edge Cases</h2>
    ${Object.entries(result.edgeCases || {}).map(([category, cases]) => `
      <div class="card">
        <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
        <ul>
          ${cases.slice(0, 5).map(c => `<li>${c.edgeCase || c.description || JSON.stringify(c)}</li>`).join('')}
        </ul>
      </div>
    `).join('') || '<p>No edge cases identified</p>'}
  </div>

  <div class="section">
    <h2>❓ Clarification Questions</h2>
    <div class="card">
      <ul>
        ${result.clarificationQuestions?.slice(0, 10).map(q => `
          <li><strong>[${q.priority}]</strong> ${q.question}</li>
        `).join('') || '<li>No questions generated</li>'}
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>📋 Summary</h2>
    <div class="card">
      <p><strong>${result.summary?.headline}</strong></p>
      <ul>
        ${result.summary?.keyFindings?.map(f => `<li>${f}</li>`).join('') || ''}
      </ul>
      <p style="margin-top: 15px;"><em>${result.summary?.recommendation}</em></p>
    </div>
  </div>

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.9em;">
    <p>Generated by InsightQA AI | ${new Date().toLocaleString()}</p>
  </footer>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="analysis-${analysisId}.html"`);
    res.send(html);

  } catch (error) {
    logger.error('HTML export failed:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

/**
 * POST /api/export/markdown
 * Export analysis as Markdown
 */
router.post('/markdown', async (req, res) => {
  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Analysis ID is required'
      });
    }

    const analysis = getAnalysis(analysisId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Analysis not found'
      });
    }

    const result = analysis.analysis_result;

    let md = `# 🎯 InsightQA AI Analysis Report

**Analysis ID:** ${analysis.id}
**Created:** ${new Date(analysis.created_at).toLocaleString()}
**Risk Level:** ${analysis.risk_level} (${analysis.risk_score}/10)

---

## 📝 User Story

> ${analysis.user_story}

---

## 📊 Quality Metrics

| Metric | Score |
|--------|-------|
| Coverage Score | ${result.metrics?.coverageScore || 0}% |
| Completeness | ${result.metrics?.completenessScore || 0}% |
| Testability | ${result.metrics?.testabilityScore || 0}% |
| Est. Test Effort | ${result.testRecommendations?.estimatedEffort?.total || 0} hours |

---

## 🧪 Test Recommendations

| Test Type | Priority | Est. Hours |
|-----------|----------|------------|
${result.testRecommendations?.testTypes?.map(t => `| ${t.type} | ${t.priority} | ${t.estimatedHours}h |`).join('\n') || '| No recommendations | - | - |'}

---

## ⚠️ Risk Factors

| Category | Score | Impact |
|----------|-------|--------|
${result.riskAssessment?.factors?.map(f => `| ${f.category} | ${f.score} | ${f.impact} |`).join('\n') || '| None identified | - | - |'}

---

## 🔍 Edge Cases

${Object.entries(result.edgeCases || {}).map(([category, cases]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)}
${cases.slice(0, 5).map(c => `- ${c.edgeCase || c.description || JSON.stringify(c)}`).join('\n')}
`).join('\n') || 'No edge cases identified'}

---

## ❓ Clarification Questions

${result.clarificationQuestions?.slice(0, 10).map(q => `- **[${q.priority}]** ${q.question}`).join('\n') || 'No questions generated'}

---

## 📋 Summary

**${result.summary?.headline}**

${result.summary?.keyFindings?.map(f => `- ${f}`).join('\n') || ''}

> ${result.summary?.recommendation}

---

*Generated by InsightQA AI | ${new Date().toLocaleString()}*
`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="analysis-${analysisId}.md"`);
    res.send(md);

  } catch (error) {
    logger.error('Markdown export failed:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

module.exports = router;
