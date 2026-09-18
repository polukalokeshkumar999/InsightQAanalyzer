import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSearch,
  History,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CircleDotDashed,
  Bot,
  Layers
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/core-suite', icon: Layers, label: 'Dynamic Core Suite', badge: 'Core' },
  { path: '/assistant', icon: Bot, label: 'QA Assistant', badge: 'AI' },
  { path: '/analyze', icon: FileSearch, label: 'Analyze Story' },
  { path: '/jira-tests', icon: CircleDotDashed, label: 'Jira Tests' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/templates', icon: FileText, label: 'Templates' },
]

function Sidebar({ isOpen, onToggle, onNavigate }) {
  const location = useLocation()

  return (
    <aside
      className={`${isOpen ? 'translate-x-0 lg:w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'} fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col lg:static lg:shrink-0`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          {isOpen && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-gray-900">InsightQA</h1>
              <p className="text-xs text-primary-600 font-medium">AI Analyzer</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`} />
                {isOpen && (
                  <span className="animate-fade-in">{item.label}</span>
                )}
              </div>
              {isOpen && item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gradient-to-r from-primary-500 to-indigo-600 text-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Toggle Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isOpen ? (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Version */}
      {isOpen && (
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-gray-400">Version 1.0.0</p>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
