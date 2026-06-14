import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Sparkles, Loader2, Send, ArrowLeft } from 'lucide-react'
import { getSegments, createCampaign, sendCampaign, aiDraftMessage } from '../api'

const CHANNELS = ['email', 'sms', 'whatsapp']

export default function NewCampaign() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [segments, setSegments] = useState([])
  const [name, setName] = useState('')
  const [segmentId, setSegmentId] = useState(searchParams.get('segmentId') || '')
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('email')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSegments().then(r => setSegments(r.data))
  }, [])

  const selectedSegment = segments.find(s => String(s.id) === String(segmentId))

  const handleAiDraft = async () => {
    if (!selectedSegment) return
    setAiLoading(true)
    try {
      const r = await aiDraftMessage({
        segment_name: selectedSegment.name,
        segment_description: selectedSegment.description || '',
        channel,
        brand_name: 'Fashion Brand Co.',
        tone: 'friendly',
      })
      setMessage(r.data.message)
    } catch (e) {
      setError(e.response?.data?.detail || 'AI draft failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (andSend = false) => {
    if (!name.trim() || !segmentId || !message.trim()) {
      setError('Please fill in all fields')
      return
    }
    setSaving(true)
    setError('')
    try {
      const r = await createCampaign({ name, segment_id: Number(segmentId), message_template: message, channel })
      if (andSend) {
        await sendCampaign(r.data.id)
      }
      navigate(`/campaigns/${r.data.id}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create campaign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link to="/campaigns" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} />Back to Campaigns
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Campaign</h1>
        <p className="text-slate-500 text-sm mt-1">Create and send a targeted campaign to a segment</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Campaign name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Re-engage lapsed shoppers — June"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        {/* Segment */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Audience Segment</label>
          <select value={segmentId} onChange={e => setSegmentId(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
            <option value="">Select a segment...</option>
            {segments.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.customer_count} customers)</option>
            ))}
          </select>
          {segments.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">
              No segments yet. <Link to="/segments" className="text-violet-600 hover:underline">Create one first →</Link>
            </p>
          )}
        </div>

        {/* Channel */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Channel</label>
          <div className="flex gap-2">
            {CHANNELS.map(ch => (
              <button key={ch} onClick={() => setChannel(ch)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
                  channel === ch
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                {ch === 'email' ? '✉️' : ch === 'sms' ? '💬' : '📱'} {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">Message</label>
            <button onClick={handleAiDraft} disabled={aiLoading || !selectedSegment}
              className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 disabled:opacity-40 font-medium">
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {aiLoading ? 'Writing...' : 'AI Draft'}
            </button>
          </div>
          <textarea rows={5} value={message} onChange={e => setMessage(e.target.value)}
            placeholder='Write your message, or click "AI Draft" to generate one. Use {{name}} for personalization.'
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          <p className="text-xs text-slate-400 mt-1">Use <code className="bg-slate-100 px-1 rounded">{'{{name}}'}</code> to personalize with customer name</p>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={() => handleSubmit(false)} disabled={saving}
            className="flex-1 py-2.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700 disabled:opacity-50">
            Save as Draft
          </button>
          <button onClick={() => handleSubmit(true)} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
            <Send size={15} />
            {saving ? 'Sending...' : `Send to ${selectedSegment ? selectedSegment.customer_count + ' customers' : 'Segment'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
