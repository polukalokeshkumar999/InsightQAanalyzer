import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CircleDotDashed,
  ExternalLink,
  Layers3,
  Loader2,
  Search,
  Smartphone,
  TestTube2,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeJiraTests } from '../services/api'

const STATUS_META = {
  passed: { label: 'Passed', color: '#16a34a', badge: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: '#dc2626', badge: 'bg-red-100 text-red-800' },
  blocked: { label: 'Blocked', color: '#d97706', badge: 'bg-amber-100 text-amber-800' },
  executed: { label: 'Executed', color: '#2563eb', badge: 'bg-blue-100 text-blue-800' },
  notExecuted: { label: 'Not Executed', color: '#94a3b8', badge: 'bg-gray-100 text-gray-700' },
  other: { color: '#7c3aed', badge: 'bg-violet-100 text-violet-800' }
}

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
      </div>
    </div>
  )
}

function JiraTestAnalysis() {
  const [scope, setScope] = useState('story')
  const [identifier, setIdentifier] = useState('')
  const [qmetryCycleKey, setQmetryCycleKey] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runAnalysis = async (event) => {
    event.preventDefault()
    if (!identifier.trim()) return
    if (scope === 'story' && !qmetryCycleKey.trim()) {
      toast.error('Enter the QMetry cycle key shown for this story, for example AMCC-TR-689.')
      return
    }

    setLoading(true)
    try {
      const response = await analyzeJiraTests(scope, identifier.trim(), scope === 'story' ? qmetryCycleKey.trim() : '')
      setResult(response.data)
      if (!response.data.testCases.length) {
        toast(scope === 'module' ? 'No QMetry test cycles were found for this module.' : 'No linked test cases were found for this selection.')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to analyze Jira tests'
      toast.error(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const summary = result?.overall
  const metrics = summary ? [
    ['Total (includes device)', summary.total, TestTube2, 'bg-slate-100 text-slate-700'],
    ['Normal', result.normal?.total || 0, Layers3, 'bg-cyan-100 text-cyan-700'],
    ['Device', result.device?.total || result.mobile?.total || 0, Smartphone, 'bg-indigo-100 text-indigo-700'],
    ['Executed', summary.totalExecuted, CircleDotDashed, 'bg-blue-100 text-blue-700'],
    ['Passed', summary.passed, CheckCircle2, 'bg-green-100 text-green-700'],
    ['Failed', summary.failed, XCircle, 'bg-red-100 text-red-700'],
    ['Not executed', summary.notExecuted, AlertCircle, 'bg-gray-100 text-gray-600'],
    ['Blocked', summary.blocked, Layers3, 'bg-amber-100 text-amber-700'],
    ...Object.entries(summary.otherStatuses || {}).map(([status, count]) => [status, count, Layers3, 'bg-violet-100 text-violet-700'])
  ] : []

  return (
    <div className="space-y-6 animate-fade-in max-w-[1500px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-sm font-semibold mb-2">
            <CircleDotDashed className="w-4 h-4" /> Jira test intelligence
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Execution analysis</h1>
          <p className="text-sm text-gray-500 mt-1">Inspect test coverage and execution status by story or module.</p>
        </div>

        <form onSubmit={runAnalysis} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0" aria-label="Analysis scope">
            {['story', 'module'].map(option => (
              <button
                key={option}
                type="button"
                onClick={() => { setScope(option); setIdentifier(''); setQmetryCycleKey(''); setResult(null) }}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${scope === option ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <input
            value={identifier}
            onChange={event => setIdentifier(event.target.value)}
            placeholder={scope === 'story' ? 'Jira story key, e.g. QA-142' : 'QMetry module name'}
            className="w-full sm:w-80 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={scope === 'story' ? 'Jira story key' : 'Module name'}
          />
          {scope === 'story' && (
            <input
              value={qmetryCycleKey}
              onChange={event => setQmetryCycleKey(event.target.value.toUpperCase())}
              placeholder="Required: QMetry cycle, e.g. AMCC-TR-689"
              className="w-full sm:w-64 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="QMetry test cycle key"
              required
            />
          )}
          <button type="submit" disabled={loading || !identifier.trim()} className="btn-primary py-2 px-4 flex items-center justify-center gap-2 whitespace-nowrap">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Analyze
          </button>
        </form>
      </header>

      {!result && !loading && (
        <div className="border border-dashed border-gray-300 rounded-lg min-h-[420px] flex flex-col items-center justify-center text-center px-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center mb-4">
            <TestTube2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Choose an analysis scope</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-md">
            Analyze a Jira story with its QMetry cycle, or enter a QMetry module name to discover all matching test cycles.
          </p>
        </div>
      )}

      {loading && (
        <div className="min-h-[420px] flex items-center justify-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> Reading live test execution data...
        </div>
      )}

      {result && !loading && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-semibold text-gray-500">{result.scope} analysis</p>
              <h2 className="text-xl font-bold text-gray-900">{result.identifier}</h2>
              {result.matchedRoots?.length > 1 ? (
                <div className="mt-1 text-xs text-gray-500">
                  <p>Matched QMetry folders: {result.matchedRoots.length}</p>
                  {result.matchedRoots.map(root => <p key={root.id}>{root.path}</p>)}
                </div>
              ) : result.selectedRoot?.path && (
                <p className="text-xs text-gray-500 mt-1">Selected QMetry folder: {result.selectedRoot.path}</p>
              )}
            </div>
            <span className="text-xs text-gray-500">Statuses are read live from {result.scope === 'module' ? 'QMetry' : 'Jira and QMetry'}</span>
          </div>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map(([label, value, icon, tone]) => <Metric key={label} label={label} value={value} icon={icon} tone={tone} />)}
          </section>

          <p className="text-sm text-gray-600">
            Total includes both normal and device executions. Device analysis is discovered from nested Device, Mobile, Tablet, Android, iOS, and Mac folders.
          </p>

          {result.scope === 'module' && result.folderScope?.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Folder scope</h2>
                <p className="text-xs text-gray-500 mt-1">Parents provide context only. Analysis totals include every matching folder and all its subfolders.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Relationship</th>
                      <th className="px-5 py-3">Folder</th>
                      <th className="px-5 py-3">Full path</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3 text-right">Cycles</th>
                      <th className="px-5 py-3 text-right">Direct executions</th>
                      <th className="px-5 py-3 text-right">Passed</th>
                      <th className="px-5 py-3 text-right">Failed</th>
                      <th className="px-5 py-3 text-right">Not executed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.folderScope.map(folder => (
                      <tr key={`${folder.relationship}:${folder.id}`} className={folder.relationship === 'Selected' ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${folder.relationship === 'Selected' ? 'bg-blue-100 text-blue-800' : folder.relationship === 'Parent' ? 'bg-gray-100 text-gray-700' : 'bg-cyan-100 text-cyan-800'}`}>
                            {folder.relationship}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-900">{folder.name}</td>
                        <td className="px-5 py-3 text-gray-600">{folder.path}</td>
                        <td className="px-5 py-3 text-gray-600">{folder.relationship === 'Parent' ? 'Context only' : folder.deviceRelated ? 'Device' : 'Normal'}</td>
                        <td className="px-5 py-3 text-right text-gray-700">{folder.cycles ?? '-'}</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">{folder.overall?.total ?? '-'}</td>
                        <td className="px-5 py-3 text-right text-green-700">{folder.overall?.passed ?? '-'}</td>
                        <td className="px-5 py-3 text-right text-red-700">{folder.overall?.failed ?? '-'}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{folder.overall?.notExecuted ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Testing type coverage</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Testing type</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-right">Passed</th>
                    <th className="px-5 py-3 text-right">Failed</th>
                    <th className="px-5 py-3 text-right">Blocked</th>
                    <th className="px-5 py-3 text-right">Executed</th>
                    <th className="px-5 py-3 text-right">Not executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(result.byCategory).map(([category, categorySummary]) => (
                    <tr key={category} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{category}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{categorySummary.total}</td>
                      <td className="px-5 py-3 text-right text-green-700">{categorySummary.passed}</td>
                      <td className="px-5 py-3 text-right text-red-700">{categorySummary.failed}</td>
                      <td className="px-5 py-3 text-right text-amber-700">{categorySummary.blocked}</td>
                      <td className="px-5 py-3 text-right text-blue-700">{categorySummary.executed}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{categorySummary.notExecuted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {result.scope === 'module' && result.cycles?.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">QMetry test cycles</h2>
                  <p className="text-xs text-gray-500 mt-1">Discovered across {result.folders?.length || 0} module and descendant folders</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{result.cycles.length} cycles</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Cycle</th>
                      <th className="px-5 py-3">Summary</th>
                      <th className="px-5 py-3">Folder</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-5 py-3 text-right">Passed</th>
                      <th className="px-5 py-3 text-right">Failed</th>
                      <th className="px-5 py-3 text-right">Not executed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.cycles.map(cycle => (
                      <tr key={cycle.key} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-blue-700">{cycle.key}</td>
                        <td className="px-5 py-3 text-gray-800 max-w-md">{cycle.summary}</td>
                        <td className="px-5 py-3 text-gray-600">{cycle.folderPath || '-'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${cycle.deviceRelated ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                            {cycle.deviceRelated ? 'Device' : 'Normal'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">{cycle.overall.total}</td>
                        <td className="px-5 py-3 text-right text-green-700">{cycle.overall.passed}</td>
                        <td className="px-5 py-3 text-right text-red-700">{cycle.overall.failed}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{cycle.overall.notExecuted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Test executions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Key</th>
                    <th className="px-5 py-3">Test case</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Module / folder</th>
                    <th className="px-5 py-3">Execution status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.testCases.map(testCase => (
                    <tr key={testCase.id || testCase.key} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <a href={testCase.url} target="_blank" rel="noreferrer" className="text-blue-700 font-medium inline-flex items-center gap-1">
                          {testCase.key}<ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-5 py-3 text-gray-800 max-w-md">{testCase.summary}</td>
                      <td className="px-5 py-3 text-gray-600">{testCase.category}</td>
                      <td className="px-5 py-3 text-gray-600">{testCase.source || 'Jira'}</td>
                      <td className="px-5 py-3 text-gray-600">{[testCase.module, testCase.folder].filter(Boolean).join(' / ') || '-'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_META[testCase.statusGroup].badge}`}>
                          {testCase.rawStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!result.testCases.length && (
                    <tr><td colSpan="6" className="px-5 py-10 text-center text-gray-500">No matching test cases found in Jira or QMetry.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default JiraTestAnalysis