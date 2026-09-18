import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Trash2,
  Star,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getHistory, deleteHistoryItem, toggleFavorite, exportAnalysis } from '../services/api'
import { format } from 'date-fns'

function History() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [favoriteFilter, setFavoriteFilter] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [page, setPage] = useState(0)
  const limit = 10

  useEffect(() => {
    loadHistory()
  }, [page, riskFilter, favoriteFilter])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const response = await getHistory({
        limit,
        offset: page * limit,
        riskLevel: riskFilter || undefined,
        favorite: favoriteFilter || undefined,
        search: searchQuery || undefined
      })
      setAnalyses(response.data || [])
    } catch (error) {
      console.error('Failed to load history:', error)
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0)
    loadHistory()
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return

    try {
      await deleteHistoryItem(id)
      toast.success('Analysis deleted')
      loadHistory()
    } catch (error) {
      toast.error('Failed to delete analysis')
    }
  }

  const handleToggleFavorite = async (id) => {
    try {
      await toggleFavorite(id)
      loadHistory()
    } catch (error) {
      toast.error('Failed to update favorite status')
    }
  }

  const handleExport = async (id, format) => {
    try {
      const response = await exportAnalysis(id, format)
      const content = typeof response === 'string' || response instanceof Blob
        ? response
        : JSON.stringify(response, null, 2)
      const blob = response instanceof Blob ? response : new Blob([content])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis-${id}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('Export failed')
    }
  }

  const getRiskBadgeClass = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
          <p className="text-gray-500 mt-1">Review and manage your past analyses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search analyses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(0); }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <button
            type="button"
            onClick={() => { setFavoriteFilter(!favoriteFilter); setPage(0); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${favoriteFilter
                ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Star className={`w-4 h-4 ${favoriteFilter ? 'fill-yellow-500' : ''}`} />
            Favorites
          </button>

          <button type="submit" className="btn-primary">
            <Filter className="w-4 h-4 mr-2" />
            Apply
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 spinner"></div>
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No analyses found</p>
            <p className="text-sm mt-2">Start by analyzing a user story</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Story</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Risk</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Score</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr key={analysis.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleFavorite(analysis.id)}
                          className="text-gray-300 hover:text-yellow-500 transition-colors"
                        >
                          <Star className={`w-5 h-5 ${analysis.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </button>
                        <div>
                          <p className="text-gray-900 font-medium truncate max-w-xs">
                            {analysis.storyTitle || 'Untitled Analysis'}
                          </p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {analysis.userStory}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBadgeClass(analysis.riskLevel)}`}>
                        {analysis.riskLevel}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-600">{analysis.riskScore}/10</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-500 text-sm">
                        {format(new Date(analysis.createdAt), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedAnalysis(analysis)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExport(analysis.id, 'xlsx')}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Export Excel"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(analysis.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {page * limit + 1} to {page * limit + analyses.length} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">Page {page + 1}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={analyses.length < limit}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Analysis Details</h3>
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">User Story</h4>
                <p className="mt-1 text-gray-800 whitespace-pre-wrap">{selectedAnalysis.userStory}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Risk Level</h4>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskBadgeClass(selectedAnalysis.riskLevel)}`}>
                      {selectedAnalysis.riskLevel}
                    </span>
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Risk Score</h4>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{selectedAnalysis.riskScore}/10</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Created</h4>
                <p className="mt-1 text-gray-800">
                  {format(new Date(selectedAnalysis.createdAt), 'MMMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => handleExport(selectedAnalysis.id, 'xlsx')}
                className="btn-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </button>
              <button
                onClick={() => handleExport(selectedAnalysis.id, 'html')}
                className="btn-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Export HTML
              </button>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
