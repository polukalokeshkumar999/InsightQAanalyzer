import { Menu, Bell, HelpCircle, User, Bot, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

function Navbar({ onMenuClick }) {
  const triggerAssistantWidget = () => {
    window.dispatchEvent(new CustomEvent('open-insightqa-assistant'))
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
          AI-Powered QA Analysis
        </h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Quick QA Assistant Trigger Button */}
        <button
          onClick={triggerAssistantWidget}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors border border-primary-200"
          title="Open QA Assistant Chatbot"
        >
          <Bot className="w-4 h-4 text-primary-600" />
          <span>Ask Assistant</span>
        </button>

        {/* Help */}
        <button
          onClick={triggerAssistantWidget}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="QA Rules & Help Assistant"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-700">QA Engineer</p>
            <p className="text-xs text-gray-500">BlueBolt Team</p>
          </div>
          <button className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
