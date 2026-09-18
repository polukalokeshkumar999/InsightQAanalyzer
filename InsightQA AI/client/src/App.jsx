import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import FloatingChatWidget from './components/FloatingChatWidget'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import History from './pages/History'
import Templates from './pages/Templates'
import JiraTestAnalysis from './pages/JiraTestAnalysis'
import ChatAssistant from './pages/ChatAssistant'
import CoreSuiteAnalysis from './pages/CoreSuiteAnalysis'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 relative">
        <Toaster position="top-right" />

        {/* Sidebar */}
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/core-suite" element={<CoreSuiteAnalysis />} />
              <Route path="/assistant" element={<ChatAssistant />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/history" element={<History />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/jira-tests" element={<JiraTestAnalysis />} />
            </Routes>
          </main>
        </div>

        {/* Global Omnipresent QA Assistant Widget */}
        <FloatingChatWidget />
      </div>
    </Router>
  )
}

export default App
