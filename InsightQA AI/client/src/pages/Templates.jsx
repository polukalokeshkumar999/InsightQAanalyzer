import { useState, useEffect } from 'react'
import { 
  FileText, 
  Copy, 
  Download,
  CheckCircle,
  Shield,
  Zap,
  Globe,
  Lock,
  Database
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getTemplates, getTemplate, generateFromTemplate } from '../services/api'

const templateIcons = {
  functional: CheckCircle,
  security: Shield,
  boundary: Zap,
  api: Globe,
  performance: Zap,
  accessibility: Globe,
  integration: Database,
  regression: CheckCircle
}

function Templates() {
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateContent, setTemplateContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generatedContent, setGeneratedContent] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await getTemplates()
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template)
    try {
      const response = await getTemplate(template.id)
      setTemplateContent(response.data)
      setGeneratedContent(response.data.template)
    } catch (error) {
      toast.error('Failed to load template')
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent)
    toast.success('Copied to clipboard!')
  }

  const downloadTemplate = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTemplate?.id || 'template'}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded!')
  }

  const getTemplateIcon = (id) => {
    const Icon = templateIcons[id] || FileText
    return Icon
  }

  const getTemplateColor = (id) => {
    const colors = {
      functional: 'bg-blue-500',
      security: 'bg-red-500',
      boundary: 'bg-purple-500',
      api: 'bg-green-500',
      performance: 'bg-orange-500',
      accessibility: 'bg-teal-500',
      integration: 'bg-indigo-500',
      regression: 'bg-pink-500'
    }
    return colors[id] || 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 spinner"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Test Case Templates</h1>
        <p className="text-gray-500 mt-1">
          Ready-to-use templates for different types of testing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Available Templates
          </h3>
          
          <div className="space-y-3">
            {templates.map((template) => {
              const Icon = getTemplateIcon(template.id)
              const isSelected = selectedTemplate?.id === template.id
              
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected 
                      ? 'bg-primary-50 border-primary-300 shadow-sm' 
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${getTemplateColor(template.id)} w-10 h-10 rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Template Preview */}
        <div className="lg:col-span-2">
          {selectedTemplate && templateContent ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{templateContent.name}</h3>
                  <p className="text-sm text-gray-500">{templateContent.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="btn-secondary text-sm py-2 flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={downloadTemplate}
                    className="btn-primary text-sm py-2 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 overflow-auto max-h-[600px] whitespace-pre-wrap font-mono">
                  {generatedContent}
                </pre>
              </div>

              {templateContent.variables?.length > 0 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Template Variables</h4>
                  <div className="flex flex-wrap gap-2">
                    {templateContent.variables.map((variable) => (
                      <span 
                        key={variable}
                        className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 font-mono"
                      >
                        {`{${variable}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-96 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a template to preview</p>
                <p className="text-sm mt-2">Choose from the list on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
        <h3 className="font-semibold text-gray-900 mb-3">💡 Tips for Using Templates</h3>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-primary-500">•</span>
            Replace variables in curly braces {`{variable}`} with your actual values
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500">•</span>
            Customize templates based on your project's specific requirements
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500">•</span>
            Use the analysis results to automatically populate template values
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500">•</span>
            Save customized templates for future use in your test management tool
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Templates
