import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Analysis APIs
export const analyzeStory = async (userStory, options = {}) => {
  const response = await api.post('/analyze', { userStory, options })
  return response.data
}

export const quickAnalyze = async (userStory) => {
  const response = await api.post('/analyze/quick', { userStory })
  return response.data
}

export const batchAnalyze = async (stories) => {
  const response = await api.post('/analyze/batch', { stories })
  return response.data
}

export const getAnalysis = async (id) => {
  const response = await api.get(`/analyze/${id}`)
  return response.data
}

// History APIs
export const getHistory = async (params = {}) => {
  const response = await api.get('/history', { params })
  return response.data
}

export const getHistoryItem = async (id) => {
  const response = await api.get(`/history/${id}`)
  return response.data
}

export const deleteHistoryItem = async (id) => {
  const response = await api.delete(`/history/${id}`)
  return response.data
}

export const toggleFavorite = async (id) => {
  const response = await api.post(`/history/${id}/favorite`)
  return response.data
}

export const getAnalytics = async (days = 30) => {
  const response = await api.get('/history/analytics/summary', { params: { days } })
  return response.data
}

// Export APIs
export const exportAnalysis = async (analysisId, format) => {
  const response = await api.post(`/export/${format}`, { analysisId }, {
    responseType: format === 'xlsx' ? 'blob' : 'json'
  })
  return response.data
}

// Template APIs
export const getTemplates = async () => {
  const response = await api.get('/templates')
  return response.data
}

export const getTemplate = async (id) => {
  const response = await api.get(`/templates/${id}`)
  return response.data
}

export const generateFromTemplate = async (templateId, values) => {
  const response = await api.post(`/templates/${templateId}/generate`, { values })
  return response.data
}

// Feedback APIs
export const submitFeedback = async (analysisId, type, data) => {
  const response = await api.post('/feedback', { analysisId, type, data })
  return response.data
}

export const submitRating = async (analysisId, rating, comment) => {
  const response = await api.post('/feedback/rating', { analysisId, rating, comment })
  return response.data
}

// Integration APIs
export const getIntegrationStatus = async () => {
  const response = await api.get('/integrations/status')
  return response.data
}

export const importFromJira = async (issueKey) => {
  const response = await api.post('/integrations/jira/import', { issueKey })
  return response.data
}

export const analyzeJiraTests = async (scope, identifier, qmetryCycleKey = '') => {
  const response = await api.post('/integrations/jira/test-analysis', { scope, identifier, qmetryCycleKey })
  return response.data
}

export const importFromAzure = async (workItemId) => {
  const response = await api.post('/integrations/azure/import', { workItemId })
  return response.data
}

// Health check
export const checkHealth = async () => {
  const response = await api.get('/health')
  return response.data
}

// Chatbot APIs
export const sendChatMessage = async (message, conversationHistory = [], sessionId = null) => {
  const response = await api.post('/chat/message', { message, conversationHistory, sessionId })
  return response.data
}

export const getChatSuggestions = async () => {
  const response = await api.get('/chat/suggestions')
  return response.data
}

export const getKnowledgeTopics = async () => {
  const response = await api.get('/chat/knowledge-topics')
  return response.data
}

export const getChatHistory = async (limit = 20) => {
  const response = await api.get('/chat/history', { params: { limit } })
  return response.data
}

export const getChatSession = async (id) => {
  const response = await api.get(`/chat/history/${id}`)
  return response.data
}

export const saveChatHistory = async (sessionId, title, messages) => {
  const response = await api.post('/chat/history', { sessionId, title, messages })
  return response.data
}

export const deleteChatSession = async (id) => {
  const response = await api.delete(`/chat/history/${id}`)
  return response.data
}

// Dynamic Core Suite APIs
export const getAmccCoreSuite = async (coverage = 30, refresh = false) => {
  const response = await api.get('/core-suite/amcc', { params: { coverage, refresh } })
  return response.data
}

export const checkCoreSuiteSync = async (repoPath = '') => {
  const response = await api.get('/core-suite/check-sync', { params: { repoPath } })
  return response.data
}

export const analyzeRepositoryPath = async (repoPath, coverage = 30) => {
  const response = await api.post('/core-suite/analyze-path', { repoPath, coverage })
  return response.data
}

export const exportCoreSuite = async (format = 'json', coverage = 30) => {
  const response = await api.get(`/core-suite/export/${format}`, {
    params: { coverage },
    responseType: format === 'json' ? 'json' : 'blob'
  })
  return response.data
}

export default api


