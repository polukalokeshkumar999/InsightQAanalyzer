import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ArrowRight,
  FileSearch,
  Zap,
  Shield,
  Target
} from 'lucide-react'
import { getAnalytics, getHistory } from '../services/api'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e']

function Dashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [analyticsRes, historyRes] = await Promise.all([
        getAnalytics(30).catch(() => ({ data: null })),
        getHistory({ limit: 5 }).catch(() => ({ data: [] }))
      ])
      
      setAnalytics(analyticsRes.data)
      setRecentAnalyses(historyRes.data || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      label: 'Total Analyses',
      value: analytics?.totalAnalyses || 0,
      icon: FileSearch,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      label: 'Avg Risk Score',
      value: analytics?.averageRiskScore?.toFixed(1) || '0.0',
      icon: Target,
      color: 'bg-yellow-500',
      change: '-5%'
    },
    {
      label: 'High Risk Stories',
      value: analytics?.highRiskStories || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: '+3'
    },
    {
      label: 'Time Saved',
      value: `${(analytics?.totalAnalyses || 0) * 2}h`,
      icon: Clock,
      color: 'bg-green-500',
      change: 'Est.'
    }
  ]

  const riskDistribution = analytics?.riskDistribution 
    ? [
        { name: 'High', value: analytics.riskDistribution.high || 0 },
        { name: 'Medium', value: analytics.riskDistribution.medium || 0 },
        { name: 'Low', value: analytics.riskDistribution.low || 0 }
      ]
    : []

  const getRiskBadgeClass = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome to InsightQA AI</h1>
            <p className="text-primary-100">
              Transform user stories into comprehensive test strategies in seconds
            </p>
          </div>
          <Link 
            to="/analyze"
            className="bg-white text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Start Analysis
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div 
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-green-600 font-medium">{stat.change}</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          {riskDistribution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available. Start analyzing stories!
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-4">
            <Link 
              to="/analyze"
              className="flex items-center justify-between p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <FileSearch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Analyze New Story</h4>
                  <p className="text-sm text-gray-500">Get instant testing insights</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link 
              to="/templates"
              className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Test Templates</h4>
                  <p className="text-sm text-gray-500">Ready-to-use test case templates</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link 
              to="/history"
              className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">View History</h4>
                  <p className="text-sm text-gray-500">Review past analyses</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Analyses */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Analyses</h3>
          <Link to="/history" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View All
          </Link>
        </div>
        
        {recentAnalyses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Story</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Risk Level</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Score</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.map((analysis) => (
                  <tr key={analysis.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-900 truncate max-w-xs">
                        {analysis.storyTitle || analysis.userStory}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadgeClass(analysis.riskLevel)}`}>
                        {analysis.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{analysis.riskScore}/10</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No analyses yet. Start by analyzing your first user story!</p>
            <Link 
              to="/analyze" 
              className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
            >
              Analyze Now →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
