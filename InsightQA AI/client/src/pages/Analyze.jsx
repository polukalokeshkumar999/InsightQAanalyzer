import { useState } from 'react'
import {
  FileSearch,
  Loader2,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Star,
  Lightbulb,
  Shield,
  Zap,
  Copy,
  ExternalLink,
  Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeStory, exportAnalysis, importFromJira } from '../services/api'

function Analyze() {
  const [storyId, setStoryId] = useState('')
  const [analyzedStory, setAnalyzedStory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('recommendations')
  const [expandedSections, setExpandedSections] = useState({})

  const handleAnalyze = async (event) => {
    event.preventDefault()
    const issueKey = storyId.trim().toUpperCase()

    if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(issueKey)) {
      toast.error('Enter a valid Jira story ID, for example AMCC-998.')
      return
    }

    setLoading(true)
    setResult(null)
    setAnalyzedStory(null)

    try {
      const imported = await importFromJira(issueKey)
      const jiraStory = imported.data
      const response = await analyzeStory(jiraStory.userStory, {
        storyId: jiraStory.issueKey,
        storyTitle: jiraStory.summary,
        project: jiraStory.issueKey.split('-')[0]
      })
      setResult(response.data)
      setAnalyzedStory(jiraStory)
      toast.success(`${jiraStory.issueKey} analysis complete`)
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error(error.response?.data?.message || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    if (!result?.id) return

    try {
      const response = await exportAnalysis(result.id, format)

      // Create download link
      const contentTypes = {
        json: 'application/json',
        csv: 'text/csv',
        html: 'text/html',
        markdown: 'text/markdown',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
      const content = typeof response === 'string' || response instanceof Blob
        ? response
        : JSON.stringify(response, null, 2)
      const blob = response instanceof Blob ? response : new Blob([content], { type: contentTypes[format] })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis-${result.id}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('Export failed')
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200'
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      CRITICAL: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-green-500'
    }
    return colors[priority] || 'bg-gray-500'
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Analyze Jira Story</h2>
            <p className="text-gray-500 text-sm mt-1">
              Enter a Jira story ID to retrieve its details and generate testing insights.
            </p>
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-1 h-12 overflow-hidden border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
            <span className="w-12 shrink-0 flex items-center justify-center text-gray-400" aria-hidden="true">
              <Search className="w-5 h-5" />
            </span>
            <input
              value={storyId}
              onChange={(event) => setStoryId(event.target.value.toUpperCase())}
              placeholder="AMCC-998"
              aria-label="Jira story ID"
              className="min-w-0 flex-1 h-full pr-4 border-0 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !storyId.trim()}
            className="btn-primary h-12 flex items-center justify-center gap-2 sm:px-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileSearch className="w-5 h-5" />
                Analyze Story
              </>
            )}
          </button>
        </form>

        {analyzedStory && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Analyzed from Jira</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{analyzedStory.issueKey}: {analyzedStory.summary}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Risk Score */}
            <div className={`rounded-xl p-6 border ${getRiskColor(result.riskAssessment?.riskLevel)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-80">Risk Level</p>
                  <p className="text-3xl font-bold mt-1">{result.riskAssessment?.riskLevel}</p>
                </div>
                <AlertTriangle className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-sm mt-2 opacity-70">
                Score: {result.riskAssessment?.overallScore}/10
              </p>
            </div>

            {/* Test Types */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Test Types</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">
                    {result.testRecommendations?.testTypes?.length || 0}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-sm mt-2 text-blue-600">
                Recommended tests
              </p>
            </div>

            {/* Edge Cases */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Edge Cases</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">
                    {Object.values(result.edgeCases || {}).reduce((sum, arr) => sum + arr.length, 0)}
                  </p>
                </div>
                <Lightbulb className="w-10 h-10 text-purple-400" />
              </div>
              <p className="text-sm mt-2 text-purple-600">
                Scenarios identified
              </p>
            </div>

            {/* Questions */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Questions</p>
                  <p className="text-3xl font-bold text-amber-900 mt-1">
                    {result.clarificationQuestions?.length || 0}
                  </p>
                </div>
                <HelpCircle className="w-10 h-10 text-amber-400" />
              </div>
              <p className="text-sm mt-2 text-amber-600">
                Need clarification
              </p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">Export:</span>
            <button onClick={() => handleExport('xlsx')} className="btn-secondary text-sm py-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => handleExport('json')} className="btn-secondary text-sm py-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> JSON
            </button>
            <button onClick={() => handleExport('csv')} className="btn-secondary text-sm py-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => handleExport('html')} className="btn-secondary text-sm py-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> HTML
            </button>
            <button onClick={() => handleExport('markdown')} className="btn-secondary text-sm py-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> Markdown
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="border-b border-gray-100">
              <nav className="flex gap-1 p-2">
                {[
                  { id: 'recommendations', label: 'Test Recommendations', icon: CheckCircle },
                  { id: 'edgecases', label: 'Edge Cases', icon: Lightbulb },
                  { id: 'risks', label: 'Risk Analysis', icon: AlertTriangle },
                  { id: 'questions', label: 'Questions', icon: HelpCircle },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:bg-gray-100'
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Test Recommendations Tab */}
              {activeTab === 'recommendations' && (
                <div className="space-y-4">
                  {result.testRecommendations?.testTypes?.map((test, index) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`${getPriorityBadge(test.priority)} text-white text-xs font-medium px-2 py-1 rounded`}>
                            {test.priority}
                          </span>
                          <h4 className="font-semibold text-gray-900">{test.type}</h4>
                        </div>
                        <span className="text-sm text-gray-500">{test.estimatedHours}h est.</span>
                      </div>
                      <p className="text-gray-600 text-sm mt-2">{test.description}</p>

                      {test.scenarios?.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleSection(`test-${index}`)}
                            className="text-sm text-primary-600 flex items-center gap-1"
                          >
                            {expandedSections[`test-${index}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {test.scenarios.length} scenarios
                          </button>
                          {expandedSections[`test-${index}`] && (
                            <ul className="mt-2 space-y-1 pl-4">
                              {test.scenarios.map((scenario, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="text-primary-500 mt-1">•</span>
                                  {scenario}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Edge Cases Tab */}
              {activeTab === 'edgecases' && (
                <div className="space-y-6">
                  {Object.entries(result.edgeCases || {}).map(([category, cases]) => (
                    cases.length > 0 && (
                      <div key={category}>
                        <h4 className="font-semibold text-gray-900 capitalize mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary-500" />
                          {category} Edge Cases
                        </h4>
                        <div className="grid gap-3">
                          {cases.slice(0, 10).map((ec, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3 text-sm">
                              <div className="flex items-start justify-between">
                                <span className="text-gray-800 font-medium">
                                  {ec.edgeCase || ec.testValue || ec.description}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(ec.description || ec.edgeCase)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                              {ec.description && ec.edgeCase && (
                                <p className="text-gray-500 mt-1">{ec.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Risk Analysis Tab */}
              {activeTab === 'risks' && (
                <div className="space-y-6">
                  {/* Risk Factors */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Risk Factors</h4>
                    <div className="space-y-3">
                      {result.riskAssessment?.factors?.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-800 capitalize">{factor.category}</span>
                            <p className="text-sm text-gray-500">{factor.reason || `Score: ${factor.score}`}</p>
                          </div>
                          <span className={`${getPriorityBadge(factor.impact)} text-white text-xs font-medium px-2 py-1 rounded`}>
                            {factor.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hotspots */}
                  {result.riskAssessment?.hotspots?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-500" />
                        High-Risk Hotspots
                      </h4>
                      <div className="space-y-3">
                        {result.riskAssessment.hotspots.map((hotspot, index) => (
                          <div key={index} className="border-l-4 border-orange-400 bg-orange-50 p-4 rounded-r-lg">
                            <p className="font-medium text-orange-800">{hotspot.description}</p>
                            <p className="text-sm text-orange-600 mt-1">{hotspot.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Questions Tab */}
              {activeTab === 'questions' && (
                <div className="space-y-4">
                  {result.clarificationQuestions?.map((q, index) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4 hover:border-primary-200 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className={`${getPriorityBadge(q.priority)} text-white text-xs font-medium px-2 py-1 rounded shrink-0`}>
                          {q.priority}
                        </span>
                        <div>
                          <p className="text-gray-800">{q.question}</p>
                          <p className="text-sm text-gray-500 mt-1">{q.context}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
              <h3 className="font-semibold text-gray-900 mb-3">{result.summary.headline}</h3>
              <ul className="space-y-2">
                {result.summary.keyFindings?.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <Star className="w-4 h-4 text-primary-500 mt-1 shrink-0" />
                    {finding}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-primary-700 font-medium">{result.summary.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Analyze
