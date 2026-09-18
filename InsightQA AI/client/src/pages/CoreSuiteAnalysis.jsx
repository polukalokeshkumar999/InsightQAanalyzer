import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import {
  Layers,
  Sparkles,
  ShieldCheck,
  Download,
  RotateCcw,
  Search,
  CheckCircle2,
  FileText,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  FolderGit2,
  Sliders,
  Clock,
  RefreshCw,
  Zap,
  Copy,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
  TrendingDown,
  Activity,
  BookOpen,
  Filter,
  ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getAmccCoreSuite, exportCoreSuite } from '../services/api'

const PRESETS = [
  { label: '10% Smoke', value: 10, desc: 'P0 critical paths & sanity', color: 'rose' },
  { label: '20% Critical Path', value: 20, desc: 'High priority business flows', color: 'orange' },
  { label: '30% Core Suite', value: 30, desc: 'Recommended default core', color: 'primary' },
  { label: '50% Extended Core', value: 50, desc: 'Core + secondary business logic', color: 'indigo' },
  { label: '75% Deep Regression', value: 75, desc: 'Comprehensive functional coverage', color: 'violet' },
  { label: '100% Full Suite', value: 100, desc: 'Entire test repository', color: 'gray' }
]

const PRESET_COLOR_MAP = {
  rose: { chip: 'bg-rose-50 border-rose-400 ring-rose-500/20 text-rose-700', bar: '#f43f5e' },
  orange: { chip: 'bg-orange-50 border-orange-400 ring-orange-500/20 text-orange-700', bar: '#f97316' },
  primary: { chip: 'bg-primary-50 border-primary-500 ring-primary-500/20 text-primary-700', bar: '#2563eb' },
  indigo: { chip: 'bg-indigo-50 border-indigo-400 ring-indigo-500/20 text-indigo-700', bar: '#6366f1' },
  violet: { chip: 'bg-violet-50 border-violet-400 ring-violet-500/20 text-violet-700', bar: '#8b5cf6' },
  gray: { chip: 'bg-gray-100 border-gray-400 ring-gray-500/20 text-gray-700', bar: '#6b7280' }
}

function getPresetColor(val) {
  const p = PRESETS.find(p => p.value === val)
  return p ? PRESET_COLOR_MAP[p.color] : PRESET_COLOR_MAP.primary
}

/** Animated integer counter */
function useAnimatedCount(target, duration = 600) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const start = prev.current
    const diff = target - start
    if (diff === 0) return
    const steps = Math.min(40, Math.abs(diff))
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplay(Math.round(start + (diff * i) / steps))
      if (i >= steps) {
        clearInterval(interval)
        prev.current = target
      }
    }, duration / steps)
    return () => clearInterval(interval)
  }, [target, duration])
  return display
}

/** Score → priority band */
function scoreBand(score) {
  if (score >= 9) return { label: 'P0', bg: 'bg-rose-100 text-rose-700 border border-rose-300', dot: 'bg-rose-500' }
  if (score >= 7) return { label: 'P1', bg: 'bg-orange-100 text-orange-700 border border-orange-300', dot: 'bg-orange-500' }
  if (score >= 5) return { label: 'P2', bg: 'bg-amber-100 text-amber-700 border border-amber2-300', dot: 'bg-amber-500' }
  return { label: 'P3', bg: 'bg-gray-100 text-gray-600 border border-gray-300', dot: 'bg-gray-400' }
}

/** Coverage band label */
function coverageLabel(pct) {
  if (pct <= 10) return 'Smoke'
  if (pct <= 20) return 'Critical'
  if (pct <= 30) return 'Core'
  if (pct <= 50) return 'Extended'
  if (pct <= 75) return 'Deep Regression'
  return 'Full'
}

export default function CoreSuiteAnalysis() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [coveragePercent, setCoveragePercent] = useState(30)
  const [updatingCoverage, setUpdatingCoverage] = useState(false)
  const [selectedModule, setSelectedModule] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('ALL')
  const [expandedTestId, setExpandedTestId] = useState(null)
  const [repoChangeAlert, setRepoChangeAlert] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [sortKey, setSortKey] = useState('coreRank')
  const [sortDir, setSortDir] = useState('asc')
  const [showTagPanel, setShowTagPanel] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareData, setCompareData] = useState(null)
  const [comparePercent, setComparePercent] = useState(null)

  const debounceTimerRef = useRef(null)

  useEffect(() => {
    fetchCoreSuite(30, false)
  }, [])

  const fetchCoreSuite = async (cov = coveragePercent, forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    else if (!data) setLoading(true)
    else setUpdatingCoverage(true)

    try {
      const response = await getAmccCoreSuite(cov, forceRefresh)
      setData(response.data)
      if (response.data.changeDetected) {
        setRepoChangeAlert(true)
        toast.success('Repository changes in AMCC detected & synchronized!', { duration: 4000 })
      } else if (forceRefresh) {
        toast.success('AMCC repository re-analyzed successfully')
      }
    } catch (error) {
      console.error('Failed to load core suite:', error)
      toast.error('Failed to load AMCC dynamic core suite analysis.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setUpdatingCoverage(false)
    }
  }

  const handleCoverageChange = (newVal) => {
    const clamped = Math.max(1, Math.min(100, parseInt(newVal) || 1))
    setCoveragePercent(clamped)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    setUpdatingCoverage(true)
    debounceTimerRef.current = setTimeout(() => fetchCoreSuite(clamped, false), 180)
  }

  const handleCompare = async (pct) => {
    if (comparePercent === pct) { setCompareMode(false); setCompareData(null); setComparePercent(null); return }
    try {
      const res = await getAmccCoreSuite(pct, false)
      setCompareData(res.data)
      setComparePercent(pct)
      setCompareMode(true)
      toast.success(`Comparing ${coveragePercent}% vs ${pct}% coverage`)
    } catch (e) {
      toast.error('Comparison failed')
    }
  }

  const handleExport = async (format) => {
    try {
      const result = await exportCoreSuite(format, coveragePercent)
      const contentTypes = { csv: 'text/csv', json: 'application/json', markdown: 'text/markdown' }
      const blob = result instanceof Blob
        ? result
        : new Blob([typeof result === 'string' ? result : JSON.stringify(result, null, 2)], {
            type: contentTypes[format] || 'text/plain'
          })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AMCC_${coveragePercent}Percent_Core_Suite.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${coveragePercent}% Core Suite as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('Export failed. Please try again.')
    }
  }

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1800)
      toast.success('Copied to clipboard', { duration: 1500 })
    })
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-primary-100 animate-pulse" />
          <div className="absolute inset-0 rounded-2xl bg-primary-600/10 flex items-center justify-center">
            <Layers className="w-8 h-8 text-primary-600 animate-bounce" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Scanning AMCC Test Repository...</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            Scoring 475+ feature files, Python scripts, CSVs &amp; Excel suites with deterministic ranking.
          </p>
          <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mx-auto mt-2">
            <div className="h-full bg-primary-500 rounded-full animate-[loading-bar_1.4s_ease-in-out_infinite]" style={{ width: '60%', animation: 'pulse 1.2s ease-in-out infinite alternate' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Analysis Data Unavailable</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Could not load the dynamic core functionality suite for AMCC_NEWFRAME_CLONE1.
        </p>
        <button onClick={() => fetchCoreSuite(coveragePercent, true)} className="btn-primary">
          Retry Analysis
        </button>
      </div>
    )
  }

  const { summary, modules = [] } = data

  const allCoreCases = modules.flatMap((m) =>
    (m.coreTestCases || []).map((tc) => ({ ...tc, moduleName: m.moduleName }))
  )

  // Collect all unique tags
  const allTags = [...new Set(allCoreCases.flatMap(tc => tc.tags || []))].sort()

  const filteredCases = allCoreCases.filter((tc) => {
    const matchesModule = selectedModule === 'ALL' || tc.moduleName === selectedModule
    const matchesSearch =
      searchQuery === '' ||
      (tc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tc.issueKey || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tc.fileName || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag =
      selectedTag === 'ALL' || (tc.tags || []).some((t) => t.toLowerCase() === selectedTag.toLowerCase())
    return matchesModule && matchesSearch && matchesTag
  })

  // Sortable
  const sortedCases = [...filteredCases].sort((a, b) => {
    let av, bv
    if (sortKey === 'coreRank') { av = a.coreRank || 999; bv = b.coreRank || 999 }
    else if (sortKey === 'score') { av = a.score || 0; bv = b.score || 0 }
    else if (sortKey === 'title') { av = a.title || ''; bv = b.title || '' }
    else if (sortKey === 'module') { av = a.moduleName || ''; bv = b.moduleName || '' }
    else { av = a.coreRank || 999; bv = b.coreRank || 999 }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const chartData = modules.slice(0, 20).map((m) => ({
    name: m.moduleName.length > 14 ? m.moduleName.substring(0, 12) + '…' : m.moduleName,
    fullName: m.moduleName,
    Total: m.totalScenarios,
    Core: m.coreCount || m.core30Count || 0,
    ratio: m.totalScenarios > 0 ? Math.round(((m.coreCount || 0) / m.totalScenarios) * 100) : 0
  }))

  const barColor = getPresetColor(PRESETS.find(p => p.value === coveragePercent)?.value || 30)

  // KPI targets for animation
  const kpiTotal = summary.grandTotalScenarios || 0
  const kpiCore = summary.grandTotalCoreScenarios || 0
  const kpiMods = summary.totalModules || 0
  const kpiSaved = summary.overallCompression || 0

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-400 inline ml-1" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary-600 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-primary-600 inline ml-1" />
  }

  return (
    <div className="space-y-5 pb-12 animate-fade-in">

      {/* ── TOP BANNER ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-primary-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Read-Only Safe Mode Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-primary-300" /> AMCC_NEWFRAME_CLONE1
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-500/30 text-primary-200 border border-primary-400/30 flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                {(summary.totalFilesScanned || 2191).toLocaleString()} Test Files Monitored
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-primary-300 shrink-0" />
              Dynamic Core Functionality Test Suite
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/80 max-w-2xl">
              Algorithmic priority extraction across 475+ feature files, Python test scripts, and test data spreadsheets.
              Target any coverage % — results are 100% deterministic and rank-stable.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchCoreSuite(coveragePercent, true)}
              disabled={refreshing}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium backdrop-blur-sm transition-all flex items-center gap-1.5 disabled:opacity-50 border border-white/10"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Re-Analyzing...' : 'Re-Analyze Repo'}
            </button>

            <div className="relative group">
              <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-1.5 border border-emerald-400/40">
                <Download className="w-3.5 h-3.5" />
                Export {coveragePercent}% Suite
              </button>
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 hidden group-hover:block z-50 text-gray-800 text-xs">
                {[
                  { fmt: 'csv', label: 'CSV Spreadsheet', color: 'text-emerald-600' },
                  { fmt: 'markdown', label: 'Markdown Summary', color: 'text-primary-600' },
                  { fmt: 'json', label: 'Raw JSON Payload', color: 'text-indigo-600' }
                ].map(({ fmt, label, color }) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <FileText className={`w-3.5 h-3.5 ${color}`} /> Export {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Coverage Progress Bar */}
        <div className="mt-5 relative z-10">
          <div className="flex justify-between text-[11px] text-white/60 mb-1.5">
            <span>Coverage target</span>
            <span className="font-bold text-white">{coveragePercent}% — {coverageLabel(coveragePercent)} Mode · {kpiCore.toLocaleString()} of {kpiTotal.toLocaleString()} scenarios</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${coveragePercent}%`,
                background: coveragePercent <= 10 ? '#f43f5e'
                  : coveragePercent <= 20 ? '#f97316'
                  : coveragePercent <= 30 ? '#3b82f6'
                  : coveragePercent <= 50 ? '#6366f1'
                  : coveragePercent <= 75 ? '#8b5cf6'
                  : '#6b7280'
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-white/30">
            {[0, 10, 20, 30, 50, 75, 100].map(m => (
              <span key={m} style={{ position: 'relative', left: m === 0 ? 0 : m === 100 ? 'auto' : `${m}%` }}>{m}%</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── REPO CHANGE ALERT ──────────────────────────────────────────── */}
      {repoChangeAlert && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Repository Changes Detected &amp; Synchronized</p>
              <p className="text-[11px] text-emerald-700">
                New/updated test cases in <code className="font-mono bg-emerald-100/80 px-1 rounded">AMCC_NEWFRAME_CLONE1</code> were automatically re-ranked into the dynamic suite.
              </p>
            </div>
          </div>
          <button onClick={() => setRepoChangeAlert(false)} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded hover:bg-emerald-100 transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* ── DYNAMIC COVERAGE CONTROLLER ────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary-600" />
              <h2 className="text-base font-bold text-gray-900">Dynamic Coverage Controller</h2>
              {updatingCoverage && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-primary-600 animate-pulse bg-primary-50 px-2 py-0.5 rounded-full">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Recalculating...
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Rankings are 100% deterministic — switching percentages always returns the same ranked results.
            </p>
          </div>

          {/* Sync Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-gray-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-emerald-800">Folder In-Sync</span>
            <span className="text-gray-400">|</span>
            <span className="text-[11px] text-gray-500">
              {kpiTotal.toLocaleString()} scenarios available
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Quick Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PRESETS.map((preset) => {
              const isSelected = coveragePercent === preset.value
              const colors = PRESET_COLOR_MAP[preset.color]
              return (
                <button
                  key={preset.value}
                  onClick={() => handleCoverageChange(preset.value)}
                  className={`px-3 py-2.5 rounded-xl text-left transition-all border ${
                    isSelected
                      ? `${colors.chip} ring-2 shadow-sm`
                      : 'bg-gray-50/70 hover:bg-gray-100 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? '' : 'text-gray-800'}`}>
                      {preset.label}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{preset.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Slider */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:flex-1 space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-gray-600">
              <span>1% (Ultra Lean)</span>
              <span className="font-bold text-primary-700 text-sm">{coveragePercent}% Target</span>
              <span>100% (Complete Repo)</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={coveragePercent}
              onChange={(e) => handleCoverageChange(e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
          </div>
          {/* Custom Number Input */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-gray-500">Custom %:</span>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                value={coveragePercent}
                onChange={(e) => handleCoverageChange(e.target.value)}
                className="w-20 px-3 py-1.5 text-center text-sm font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              />
              <span className="absolute right-2 top-2 text-xs font-bold text-gray-400 pointer-events-none">%</span>
            </div>
          </div>
        </div>

        {/* Compare CTA strip */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-indigo-500" /> Compare with:
          </span>
          {PRESETS.filter(p => p.value !== coveragePercent).map(p => (
            <button
              key={p.value}
              onClick={() => handleCompare(p.value)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all border ${
                comparePercent === p.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300'
              }`}
            >
              {p.value}%
            </button>
          ))}
          {compareMode && (
            <button
              onClick={() => { setCompareMode(false); setCompareData(null); setComparePercent(null) }}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors ml-1"
            >
              Clear Compare
            </button>
          )}
        </div>
      </div>

      {/* ── COMPARE PANEL ─────────────────────────────────────────────── */}
      {compareMode && compareData && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-5 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-indigo-900">Coverage Comparison: {coveragePercent}% vs {comparePercent}%</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: `${coveragePercent}% Core Cases`, value: kpiCore.toLocaleString(), color: 'text-primary-700' },
              { label: `${comparePercent}% Core Cases`, value: (compareData.summary?.grandTotalCoreScenarios || 0).toLocaleString(), color: 'text-indigo-700' },
              { label: 'Difference', value: `+${Math.abs((compareData.summary?.grandTotalCoreScenarios || 0) - kpiCore).toLocaleString()}`, color: 'text-violet-700' },
              { label: 'Time Impact', value: `~${Math.abs(Math.round(((compareData.summary?.grandTotalCoreScenarios || 0) - kpiCore) * 0.05))} hrs`, color: 'text-rose-600' }
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/70 rounded-xl p-3 border border-indigo-100">
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <FolderGit2 className="w-6 h-6" />,
            value: kpiTotal.toLocaleString(),
            label: 'Total Scenarios in Repo',
            iconBg: 'bg-blue-50 text-blue-600',
            accent: ''
          },
          {
            icon: <CheckCircle2 className="w-6 h-6" />,
            value: kpiCore.toLocaleString(),
            badge: `Top ${coveragePercent}%`,
            label: 'Selected Suite Cases',
            iconBg: 'bg-emerald-50 text-emerald-600',
            accent: 'border-l-4 border-l-emerald-500',
            valueColor: 'text-emerald-700'
          },
          {
            icon: <Layers className="w-6 h-6" />,
            value: kpiMods,
            label: 'Modules Covered',
            iconBg: 'bg-indigo-50 text-indigo-600',
            accent: ''
          },
          {
            icon: <Clock className="w-6 h-6" />,
            value: `${kpiSaved}% Saved`,
            sub: `~${summary.estimatedHoursSaved || Math.round((kpiTotal - kpiCore) * 0.05)} hrs execution saved`,
            label: 'Execution Time Reduction',
            iconBg: 'bg-primary-50 text-primary-600',
            accent: 'border-l-4 border-l-primary-500',
            valueColor: 'text-primary-700'
          }
        ].map((kpi, i) => (
          <div key={i} className={`bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow ${kpi.accent}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
              {kpi.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <p className={`text-2xl font-black leading-none ${kpi.valueColor || 'text-gray-900'}`}>{kpi.value}</p>
                {kpi.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">{kpi.badge}</span>
                )}
              </div>
              {kpi.sub && <p className="text-[11px] text-primary-700 font-semibold">{kpi.sub}</p>}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── MODULE BREAKDOWN CHART ───────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Module Distribution — Total vs {coveragePercent}% Core Suite
            </h3>
            <p className="text-xs text-gray-500">
              Showing top 20 of {modules.length} modules by scenario count
            </p>
          </div>
          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full w-fit">
            {modules.length} Modules Total
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    return (
                      <div className="bg-gray-900 text-white p-3 rounded-lg text-xs shadow-xl space-y-1.5 min-w-[160px]">
                        <p className="font-bold text-primary-300 truncate">{item.fullName}</p>
                        <p>Total: <b>{item.Total}</b></p>
                        <p className="text-emerald-400">{coveragePercent}% Core: <b>{item.Core}</b></p>
                        <p className="text-indigo-300">Coverage ratio: <b>{item.ratio}%</b></p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Total Scenarios" />
              <Bar dataKey="Core" radius={[4, 4, 0, 0]} name={`${coveragePercent}% Core`}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={
                    coveragePercent <= 10 ? '#f43f5e'
                    : coveragePercent <= 20 ? '#f97316'
                    : coveragePercent <= 30 ? '#2563eb'
                    : coveragePercent <= 50 ? '#6366f1'
                    : coveragePercent <= 75 ? '#8b5cf6'
                    : '#6b7280'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── MAIN TEST SUITE TABLE ────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {/* Controls Header */}
        <div className="p-5 border-b border-gray-200 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-600" />
                {coveragePercent}% Dynamic Core Functionality Test Suite
              </h2>
              <p className="text-xs text-gray-500">
                Showing {sortedCases.length.toLocaleString()} of {(summary.grandTotalCoreScenarios || 0).toLocaleString()} core test cases (Top {coveragePercent}%)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, key, file..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              {/* Module Filter */}
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 outline-none font-medium text-gray-700 focus:ring-1 focus:ring-primary-500"
              >
                <option value="ALL">All Modules ({modules.length})</option>
                {modules.map((m) => (
                  <option key={m.moduleName} value={m.moduleName}>
                    {m.moduleName} ({m.coreCount || m.core30Count} Core)
                  </option>
                ))}
              </select>

              {/* Tag Filter Toggle */}
              {allTags.length > 0 && (
                <button
                  onClick={() => setShowTagPanel(p => !p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                    showTagPanel || selectedTag !== 'ALL'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  Tags {selectedTag !== 'ALL' && `· ${selectedTag}`}
                  {showTagPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* Tag Pills Panel */}
          {showTagPanel && allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in">
              <button
                onClick={() => setSelectedTag('ALL')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  selectedTag === 'ALL' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                All Tags
              </button>
              {allTags.slice(0, 30).map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? 'ALL' : tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    selectedTag === tag
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                  }`}
                >
                  @{tag}
                </button>
              ))}
            </div>
          )}

          {/* Module Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setSelectedModule('ALL')}
              className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                selectedModule === 'ALL' ? 'bg-primary-600 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({summary.grandTotalCoreScenarios})
            </button>
            {modules.slice(0, 12).map((m) => (
              <button
                key={m.moduleName}
                onClick={() => setSelectedModule(m.moduleName)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                  selectedModule === m.moduleName ? 'bg-primary-600 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {m.moduleName} ({m.coreCount || m.core30Count})
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50/80">
              <tr>
                {[
                  { key: 'coreRank', label: 'Rank' },
                  { key: null, label: 'Priority' },
                  { key: null, label: 'Test Key' },
                  { key: 'module', label: 'Module' },
                  { key: 'title', label: 'Scenario Title' },
                  { key: 'score', label: 'Score' },
                  { key: null, label: 'File Source' },
                  { key: null, label: 'Actions' }
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    onClick={key ? () => handleSort(key) : undefined}
                    className={`px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap ${key ? 'cursor-pointer hover:bg-gray-100 select-none transition-colors' : ''}`}
                  >
                    {label}
                    {key && <SortIcon col={key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    No core test cases found matching your search or filters.
                  </td>
                </tr>
              ) : (
                sortedCases.map((tc, idx) => {
                  const tcId = tc.id || `${tc.issueKey}-${idx}`
                  const isExpanded = expandedTestId === tcId
                  const band = scoreBand(typeof tc.score === 'number' ? tc.score : parseFloat(tc.score) || 5)
                  const isCopied = copiedId === tcId

                  return (
                    <React.Fragment key={tcId}>
                      <tr className="hover:bg-blue-50/30 transition-colors group">
                        {/* Rank */}
                        <td className="px-4 py-3 font-bold text-primary-700 whitespace-nowrap">
                          #{tc.coreRank || idx + 1}
                        </td>

                        {/* Priority Band */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${band.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${band.dot}`} />
                            {band.label}
                          </span>
                        </td>

                        {/* Test Key */}
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {tc.issueKey || '—'}
                        </td>

                        {/* Module */}
                        <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap max-w-[140px] truncate" title={tc.moduleName}>
                          {tc.moduleName}
                        </td>

                        {/* Scenario Title */}
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate">{tc.title}</span>
                            {tc.tags && tc.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold shrink-0">
                                @{tag}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {typeof tc.score === 'number' ? tc.score.toFixed(1) : tc.score || '—'}
                          </span>
                        </td>

                        {/* File Source */}
                        <td className="px-4 py-3 font-mono text-gray-400 text-[11px] truncate max-w-[160px]" title={tc.filePath || tc.fileName}>
                          {tc.fileName}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center gap-1 ml-auto justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopy(`${tc.issueKey} - ${tc.title}`, tcId)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                              title="Copy to clipboard"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setExpandedTestId(isExpanded ? null : tcId)}
                              className="px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 rounded-md transition-colors flex items-center gap-1"
                            >
                              {isExpanded ? 'Hide' : 'View'}
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Steps */}
                      {isExpanded && (
                        <tr className="bg-blue-50/40 border-b border-blue-100">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="space-y-3 text-xs">
                              {/* Meta row */}
                              <div className="flex flex-wrap items-center gap-4 text-gray-500 text-[11px]">
                                <span className="font-semibold text-gray-700 flex items-center gap-1">
                                  <FolderGit2 className="w-3.5 h-3.5 text-gray-400" />
                                  <code className="font-mono text-gray-700 bg-gray-100 px-1 rounded">{tc.filePath}</code>
                                </span>
                                <span>Feature: <b>{tc.featureTitle || tc.fileName}</b></span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${band.bg}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${band.dot}`} /> {band.label} · Score {typeof tc.score === 'number' ? tc.score.toFixed(1) : tc.score}
                                </span>
                                {tc.tags && tc.tags.map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                                    @{tag}
                                  </span>
                                ))}
                              </div>

                              {/* Steps */}
                              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1.5 font-mono text-[11px] shadow-xs">
                                {tc.steps && tc.steps.length > 0 ? (
                                  tc.steps.map((step, sIdx) => {
                                    const keyword = step.split(' ')[0]
                                    const rest = step.substring(step.indexOf(' ') + 1)
                                    const kwColor = keyword.toLowerCase() === 'given' ? 'text-blue-600'
                                      : keyword.toLowerCase() === 'when' ? 'text-violet-600'
                                      : keyword.toLowerCase() === 'then' ? 'text-emerald-600'
                                      : keyword.toLowerCase() === 'and' ? 'text-gray-500'
                                      : 'text-primary-600'
                                    return (
                                      <div key={sIdx} className="flex gap-2 text-gray-800">
                                        <span className={`font-bold shrink-0 ${kwColor}`}>{keyword}</span>
                                        <span>{rest}</span>
                                      </div>
                                    )
                                  })
                                ) : (
                                  <p className="text-gray-400 italic">Step execution script defined in <code>{tc.fileName}</code></p>
                                )}
                              </div>

                              {/* Copy full step block */}
                              <button
                                onClick={() => handleCopy(
                                  (tc.steps || []).join('\n') || `${tc.issueKey}: ${tc.title}`,
                                  `steps-${tcId}`
                                )}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-primary-700 transition-colors"
                              >
                                {copiedId === `steps-${tcId}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedId === `steps-${tcId}` ? 'Copied!' : 'Copy all steps'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {sortedCases.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              Showing <b className="text-gray-700">{sortedCases.length.toLocaleString()}</b> core test cases
              {selectedModule !== 'ALL' && <span> in <b className="text-primary-700">{selectedModule}</b></span>}
              {selectedTag !== 'ALL' && <span> tagged <b className="text-emerald-700">@{selectedTag}</b></span>}
              {searchQuery && <span> matching <b className="text-gray-700">"{searchQuery}"</b></span>}
            </span>
            <div className="flex items-center gap-3">
              <span>Sorted by <b className="text-gray-700">{sortKey === 'coreRank' ? 'Rank' : sortKey === 'score' ? 'Score' : sortKey === 'title' ? 'Title' : 'Module'}</b> ({sortDir})</span>
              <button
                onClick={() => { setSortKey('coreRank'); setSortDir('asc'); setSearchQuery(''); setSelectedModule('ALL'); setSelectedTag('ALL') }}
                className="text-[11px] text-primary-600 hover:text-primary-800 font-semibold hover:underline"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
