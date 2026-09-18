import { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  Download,
  Copy,
  Check,
  BookOpen,
  ShieldCheck,
  Zap,
  Info,
  ChevronRight,
  Search,
  X,
  MessageSquare,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react'
import toast from 'react-hot-toast'
import MarkdownView from '../components/MarkdownView'
import {
  sendChatMessage,
  getChatSuggestions,
  getKnowledgeTopics,
  getChatHistory,
  saveChatHistory
} from '../services/api'

export default function ChatAssistant() {
  const [messages, setMessages] = useState(() => {
    // Try restoring current session from localStorage
    const saved = localStorage.getItem('insightqa_current_chat')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { return [] }
    }
    return []
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [knowledgeTopics, setKnowledgeTopics] = useState([])
  const [showTopicsDrawer, setShowTopicsDrawer] = useState(false)
  const [topicSearch, setTopicSearch] = useState('')
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [sessionId] = useState(() => 'sess-' + Date.now())

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Save current messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('insightqa_current_chat', JSON.stringify(messages))
    }
  }, [messages])

  // Load suggestions and knowledge topics on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [sugRes, topRes] = await Promise.all([
        getChatSuggestions().catch(() => ({ data: [] })),
        getKnowledgeTopics().catch(() => ({ data: [] }))
      ])
      setSuggestions(sugRes.data || [])
      setKnowledgeTopics(topRes.data || [])
    } catch (err) {
      console.error('Failed to load chat metadata:', err)
    }
  }

  const handleSend = async (textToSend = null) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const historyForApi = updatedMessages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text
      }))

      const response = await sendChatMessage(query, historyForApi, sessionId)
      const data = response.data

      const botMessage = {
        id: 'bot-' + Date.now(),
        sender: 'assistant',
        text: data.reply,
        category: data.category || 'QA Guidance',
        source: data.source || 'Expert Engine',
        suggestedFollowUps: data.suggestedFollowUps || [],
        timestamp: new Date().toISOString()
      }

      const finalMessages = [...updatedMessages, botMessage]
      setMessages(finalMessages)

      // Background persist to server database
      saveChatHistory(sessionId, query.slice(0, 40), finalMessages).catch(() => {})
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to receive response. Please try again.')
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'assistant',
          text: '⚠️ An error occurred while communicating with the QA service. Please check backend server status.',
          category: 'Error',
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    if (messages.length === 0) return
    if (window.confirm('Are you sure you want to clear the conversation?')) {
      setMessages([])
      localStorage.removeItem('insightqa_current_chat')
      toast.success('Conversation cleared')
    }
  }

  const handleCopyMessage = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Response copied to clipboard')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (e) {
      toast.error('Failed to copy')
    }
  }

  const handleExportChat = () => {
    if (messages.length === 0) {
      toast('No messages to export')
      return
    }

    let markdown = `# InsightQA Assistant Conversation Export\n`
    markdown += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`

    messages.forEach((m) => {
      const role = m.sender === 'user' ? '👤 User' : '🤖 InsightQA Assistant'
      markdown += `### ${role}\n${m.text}\n\n`
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `InsightQA_QA_Chat_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Chat exported as Markdown')
  }

  const filteredTopics = knowledgeTopics.filter(
    (t) =>
      t.title.toLowerCase().includes(topicSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(topicSearch.toLowerCase()) ||
      t.summary.toLowerCase().includes(topicSearch.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between bg-white z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">InsightQA Assistant</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Instant Expert Engine
                </span>
              </div>
              <p className="text-xs text-gray-500">
                QA Regulations • ISTQB • WCAG • OWASP • App Guide • Interactive Tools
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTopicsDrawer(!showTopicsDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Browse Knowledge Base"
            >
              <BookOpen className="w-4 h-4 text-primary-600" />
              <span className="hidden sm:inline">QA Knowledge Base</span>
            </button>

            <button
              onClick={handleExportChat}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export Conversation"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear Conversation"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/50">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto py-8 text-center space-y-8 animate-fade-in">
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  How can I help you with QA or InsightQA today?
                </h2>
                <p className="text-sm text-gray-500 max-w-lg mx-auto">
                  Ask me anything about software testing rules, regulations, bug classifications, compliance, or how to operate any feature in InsightQA AI.
                </p>
              </div>

              {/* Categorized Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {suggestions.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-all space-y-2.5"
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-gray-900 uppercase tracking-wider">
                      {idx === 0 && <BookOpen className="w-4 h-4 text-primary-600" />}
                      {idx === 1 && <Sparkles className="w-4 h-4 text-indigo-600" />}
                      {idx === 2 && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                      {idx === 3 && <Zap className="w-4 h-4 text-amber-600" />}
                      <span>{cat.category}</span>
                    </div>
                    <div className="space-y-1.5">
                      {cat.prompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSend(p)}
                          className="w-full text-left p-2 text-xs text-gray-700 bg-gray-50 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors flex items-center justify-between group"
                        >
                          <span className="truncate pr-2">{p}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className={`flex gap-3 animate-fade-in ${
                    m.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.sender === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 transition-shadow ${
                      m.sender === 'user'
                        ? 'bg-primary-600 text-white rounded-br-none shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-xs'
                    }`}
                  >
                    {m.sender === 'assistant' && (
                      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-gray-100 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded text-[11px]">
                            {m.category || 'QA Guidance'}
                          </span>
                          <span className="text-[11px] text-gray-400">•</span>
                          <span className="text-[11px] text-gray-500">{m.source || 'Expert Engine'}</span>
                        </div>
                        <button
                          onClick={() => handleCopyMessage(m.text, idx)}
                          className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
                          title="Copy message"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {m.sender === 'user' ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                    ) : (
                      <MarkdownView content={m.text} />
                    )}

                    {/* Follow-up suggestions */}
                    {m.sender === 'assistant' && m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary-500" /> Suggested Follow-ups
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {m.suggestedFollowUps.map((fu, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => handleSend(fu)}
                              className="text-xs text-left px-2.5 py-1 bg-gray-50 hover:bg-primary-50 text-gray-700 hover:text-primary-700 border border-gray-200 hover:border-primary-200 rounded-full transition-colors flex items-center gap-1"
                            >
                              <span>{fu}</span>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping"></span>
                    <span className="text-xs text-gray-500 font-medium">
                      Consulting QA knowledge base & regulations...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <div className="max-w-4xl mx-auto">
            {/* Quick Prompt Pills Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none text-xs text-gray-600">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Quick:
              </span>
              <button
                onClick={() => handleSend('What are the 7 ISTQB testing principles?')}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 border border-transparent hover:border-primary-200 whitespace-nowrap transition-colors"
              >
                7 Principles
              </button>
              <button
                onClick={() => handleSend('Explain Severity vs Priority with real-world examples')}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 border border-transparent hover:border-primary-200 whitespace-nowrap transition-colors"
              >
                Severity vs Priority
              </button>
              <button
                onClick={() => handleSend('How does InsightQA calculate the risk score?')}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 border border-transparent hover:border-primary-200 whitespace-nowrap transition-colors"
              >
                Risk Scoring Algorithm
              </button>
              <button
                onClick={() => handleSend('What is the WCAG 2.1 AA accessibility checklist?')}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 border border-transparent hover:border-primary-200 whitespace-nowrap transition-colors"
              >
                WCAG 2.1 Checklist
              </button>
              <button
                onClick={() => handleSend('How to analyze Jira stories and QMetry test cycles in InsightQA?')}
                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 border border-transparent hover:border-primary-200 whitespace-nowrap transition-colors"
              >
                Jira & QMetry Guide
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask any QA rule, regulation, bug standard, or InsightQA application question..."
                rows={1}
                className="flex-1 bg-transparent border-0 resize-none outline-none text-sm text-gray-800 placeholder-gray-400 max-h-32 px-2 py-1.5"
                style={{ height: 'auto', minHeight: '38px' }}
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Send Message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400 px-1">
              <span>Press <b>Enter</b> to send, <b>Shift + Enter</b> for new line</span>
              <span>InsightQA Knowledge Assistant v1.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side Knowledge Drawer */}
      {showTopicsDrawer && (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full z-20 animate-slide-in">
          <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-600" />
              <h3 className="font-semibold text-sm text-gray-900">QA Knowledge Base</h3>
            </div>
            <button
              onClick={() => setShowTopicsDrawer(false)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                placeholder="Search QA topics..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => {
                  handleSend(`Tell me about: ${topic.title}`)
                  if (window.innerWidth < 1024) setShowTopicsDrawer(false)
                }}
                className="w-full text-left p-2.5 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/40 transition-colors group"
              >
                <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">
                  {topic.category}
                </span>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-primary-700 line-clamp-1 mt-0.5">
                  {topic.title}
                </p>
                <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                  {topic.summary}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
