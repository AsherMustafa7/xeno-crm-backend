import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Megaphone, CheckCircle, Eye, MousePointer, AlertCircle } from 'lucide-react'
import { getCampaigns } from '../api'

const statusBadge = {
  draft: 'bg-slate-100 text-slate-600',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-emerald-100 text-emerald-700',
}

const channelIcon = { email: '✉️', sms: '💬', whatsapp: '📱' }

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">{campaigns.length} total campaigns</p>
        </div>
        <Link to="/campaigns/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} />New Campaign
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Megaphone size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 mb-4">No campaigns yet</p>
          <Link to="/campaigns/new" className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700">
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <Link key={c.id} to={`/campaigns/${c.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-violet-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{channelIcon[c.channel] || '📣'}</span>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[c.status] || 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">{c.channel} · Sent {new Date(c.sent_at || c.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">{c.total_sent}</p>
                  <p className="text-xs text-slate-400">recipients</p>
                </div>
              </div>

              {c.total_sent > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle size={12} className="text-emerald-500" />
                      <span className="text-xs text-slate-500">Delivered</span>
                      <span className="text-xs font-medium text-slate-700 ml-auto">{c.delivered}</span>
                    </div>
                    <MiniBar value={c.delivered} max={c.total_sent} color="bg-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Eye size={12} className="text-blue-500" />
                      <span className="text-xs text-slate-500">Opened</span>
                      <span className="text-xs font-medium text-slate-700 ml-auto">{c.opened}</span>
                    </div>
                    <MiniBar value={c.opened} max={c.total_sent} color="bg-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <MousePointer size={12} className="text-violet-500" />
                      <span className="text-xs text-slate-500">Clicked</span>
                      <span className="text-xs font-medium text-slate-700 ml-auto">{c.clicked}</span>
                    </div>
                    <MiniBar value={c.clicked} max={c.total_sent} color="bg-violet-400" />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
