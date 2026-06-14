import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Plus, Filter, Users, ChevronRight, Loader2 } from 'lucide-react'
import { getSegments, previewSegment, createSegment, aiParseSegment } from '../api'

const FIELD_LABELS = {
  total_spent: 'Total Spent (₹)',
  visit_count: 'Number of Orders',
  days_since_last_purchase: 'Days Since Last Purchase',
  city: 'City',
  tags: 'Tag',
}

const OP_LABELS = { gt: '>', lt: '<', gte: '≥', lte: '≤', eq: '=', contains: 'contains' }

function FilterRuleDisplay({ rules }) {
  if (!rules?.conditions?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {rules.conditions.map((c, i) => (
        <span key={i} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
          {FIELD_LABELS[c.field] || c.field} {OP_LABELS[c.op] || c.op} {c.value}
        </span>
      ))}
    </div>
  )
}

export default function Segments() {
  const [segments, setSegments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [nlInput, setNlInput] = useState('')
  const [name, setName] = useState('')
  const [parsedRules, setParsedRules] = useState(null)
  const [preview, setPreview] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiError, setAiError] = useState('')

  const load = () => getSegments().then(r => setSegments(r.data))
  useEffect(() => { load() }, [])

  const handleAiParse = async () => {
    if (!nlInput.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const r = await aiParseSegment(nlInput)
      const rules = r.data.filter_rules
      setParsedRules(rules)
      // Auto-preview
      setPreviewLoading(true)
      const prev = await previewSegment({ name: name || 'preview', filter_rules: rules })
      setPreview(prev.data)
    } catch (e) {
      setAiError(e.response?.data?.detail || 'AI parsing failed. Try rephrasing.')
    } finally {
      setAiLoading(false)
      setPreviewLoading(false)
    }
  }

  const handlePreview = async () => {
    if (!parsedRules) return
    setPreviewLoading(true)
    try {
      const r = await previewSegment({ name: name || 'preview', filter_rules: parsedRules })
      setPreview(r.data)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSave = async () => {
    if (!parsedRules || !name.trim()) return
    setSaving(true)
    try {
      await createSegment({ name, filter_rules: parsedRules })
      setShowForm(false)
      setNlInput('')
      setName('')
      setParsedRules(null)
      setPreview(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Segments</h1>
          <p className="text-slate-500 text-sm mt-1">Define audiences with AI or manual filters</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} />{showForm ? 'Cancel' : 'New Segment'}
        </button>
      </div>

      {/* AI Segment Builder */}
      {showForm && (
        <div className="bg-white rounded-xl border border-violet-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">AI Segment Builder</p>
              <p className="text-xs text-slate-400">Describe your audience in plain English</p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              rows={2}
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
              placeholder={`e.g. "Customers from Mumbai who spent over ₹2000 but haven't bought in 45 days"`}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <button onClick={handleAiParse} disabled={aiLoading || !nlInput.trim()}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {aiLoading ? 'Parsing with AI...' : 'Parse with AI'}
            </button>

            {aiError && <p className="text-sm text-red-500">{aiError}</p>}

            {parsedRules && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-600 mb-1">Parsed Filter Rules:</p>
                <FilterRuleDisplay rules={parsedRules} />
                <p className="text-xs text-slate-400 mt-2">Logic: {parsedRules.logic}</p>
              </div>
            )}

            {previewLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Counting matching customers...
              </div>
            )}

            {preview && !previewLoading && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-emerald-700">
                  {preview.count} customers match this segment
                </p>
                {preview.sample.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    e.g. {preview.sample.map(s => s.name).join(', ')}
                  </p>
                )}
              </div>
            )}

            {parsedRules && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Segment name (required to save)"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button onClick={handleSave} disabled={saving || !name.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  {saving ? 'Saving...' : 'Save Segment'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Segments list */}
      <div className="grid gap-3">
        {segments.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Filter size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No segments yet. Create your first audience above.</p>
          </div>
        )}
        {segments.map(seg => (
          <div key={seg.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-violet-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{seg.name}</p>
                  <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <Users size={11} />{seg.customer_count} customers
                  </span>
                </div>
                {seg.description && <p className="text-sm text-slate-400 mt-0.5">{seg.description}</p>}
                <FilterRuleDisplay rules={seg.filter_rules} />
              </div>
              <Link to={`/campaigns/new?segmentId=${seg.id}&segmentName=${encodeURIComponent(seg.name)}`}
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium ml-4 whitespace-nowrap">
                Use in campaign <ChevronRight size={14} />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-2">Created {new Date(seg.created_at).toLocaleDateString('en-IN')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
