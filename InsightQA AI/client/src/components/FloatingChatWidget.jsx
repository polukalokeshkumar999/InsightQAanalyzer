import { useState, useRef, useEffect } from 'react'
import {
  Bot,
  X,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronRight,
  RotateCcw,
  BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'
import MarkdownView from './MarkdownView'
import { sendChatMessage } from '../services/api'

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `👋 **Hi there!** I'm your **InsightQA Assistant**. Need quick help with QA rules, testing standards, or using any feature on this screen? Ask me anytime!`,
      category: 'Assistant',
      suggestedFollowUps: [
        'What are the 7 ISTQB testing principles?',
        'How does InsightQA calculate the risk score?',
        'Explain Severity vs Priority'
      ]
    }
  ])

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, loading])

  // Global listener for opening widget from Navbar or custom events
  useEffect(() => {
    const handleOpenWidget = () => setIsOpen(true)
    window.addEventListener('open-insightqa-assistant', handleOpenWidget)
    return () => window.removeEventListener('open-insightqa-assistant', handleOpenWidget)
  }, [])

  const handleSend = async (customText = null) => {
    const query = (customText || input).trim()
    if (!query || loading) return

    const userMsg = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await sendChatMessage(query, nextMessages.slice(-4))
      const data = response.data

      const botMsg = {
        id: 'bot-' + Date.now(),
        sender: 'assistant',
        text: data.reply,
        category: data.category || 'QA Guidance',
        source: data.source || 'Expert Engine',
        suggestedFollowUps: data.suggestedFollowUps || [],
        timestamp: new Date().toISOString()
      }

      setMessages([...nextMessages, botMsg])
    } catch (err) {
      console.error('Widget chat error:', err)
      toast.error('Failed to get answer')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleClear = () => {
    setMessages([
      {
        id: 'init-1',
        sender: 'assistant',
        text: `Conversation cleared. What QA rule or application feature would you like to explore?`,
        suggestedFollowUps: [
          'What are the rules for Boundary Value Analysis?',
          'What is the WCAG 2.1 AA checklist?',
          'How does the story analysis engine work?'
        ]
      }
    ])
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Popup Window */}
      {isOpen && (
        <div
          className={`mb-3 bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fade-in ${
            isExpanded
              ? 'w-[92vw] sm:w-[600px] h-[80vh] max-h-[700px]'
              : 'w-[92vw] sm:w-[400px] h-[520px]'
          }`}
        >
          {/* Header */}
          <div className="h-14 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  InsightQA Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-white/80">QA Rules & App Companion</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Reset Chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-block"
                title={isExpanded ? 'Collapse Size' : 'Expand Size'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick suggestions header strip */}
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[11px] text-gray-600 shrink-0 scrollbar-none">
            <span className="font-semibold text-primary-700 whitespace-nowrap">Ask:</span>
            <button
              onClick={() => handleSend('What are the 7 ISTQB testing principles?')}
              className="px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:border-primary-300 hover:text-primary-700 whitespace-nowrap transition-colors"
            >
              7 Principles
            </button>
            <button
              onClick={() => handleSend('How does InsightQA calculate the risk score?')}
              className="px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:border-primary-300 hover:text-primary-700 whitespace-nowrap transition-colors"
            >
              Risk Formula
            </button>
            <button
              onClick={() => handleSend('Explain Severity vs Priority')}
              className="px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:border-primary-300 hover:text-primary-700 whitespace-nowrap transition-colors"
            >
              Severity/Priority
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-gray-50/40 text-xs">
            {messages.map((m, idx) => (
              <div
                key={m.id || idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-xl p-3 ${
                    m.sender === 'user'
                      ? 'bg-primary-600 text-white rounded-br-none shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  {m.sender === 'user' ? (
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  ) : (
                    <div>
                      {m.category && (
                        <div className="mb-1 text-[10px] font-semibold text-primary-600 uppercase tracking-wider">
                          {m.category}
                        </div>
                      )}
                      <MarkdownView content={m.text} />
                      {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                          {m.suggestedFollowUps.slice(0, 3).map((fu, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => handleSend(fu)}
                              className="text-[11px] text-left px-2 py-0.5 rounded-md bg-gray-50 hover:bg-primary-50 text-gray-700 hover:text-primary-700 border border-gray-200 hover:border-primary-200 transition-colors flex items-center gap-1"
                            >
                              <span className="truncate max-w-[200px]">{fu}</span>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-gray-500 text-xs pl-2">
                <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping"></span>
                <span>InsightQA Assistant is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask QA rules, app questions, generate tests..."
              className="flex-1 text-xs py-2 px-3 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 p-3.5 rounded-full bg-gradient-to-tr from-primary-600 via-primary-700 to-indigo-700 text-white shadow-lg shadow-primary-600/35 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative group"
        aria-label="Open QA Assistant"
        title="Open QA Assistant Chatbot"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></span>
          </>
        )}

        {/* Hover Tooltip when closed */}
        {!isOpen && (
          <div className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none">
            Ask QA Assistant
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
          </div>
        )}
      </button>
    </div>
  )
}
