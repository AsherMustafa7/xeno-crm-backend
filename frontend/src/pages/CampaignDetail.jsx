import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send, RefreshCw, CheckCircle, XCircle, Eye, MousePointer, Clock } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getCampaign, sendCampaign, getCampaignComms } from '../api'

const statusIcon = {
  sent: <Clock size={14} className="text-slate-400" />,
  delivered: <CheckCircle size={14} className="text-emerald-500" />,
  failed: <XCircle size={14} className="text-red-400" />,
  opened: <Eye size={14} className="text-blue-500" />,
  clicked: <MousePointer size={14} className="text-violet-500" />,
}

const PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#94a3b8']

export default function CampaignDetail() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [comms, setComms] = useState([])
  const [sending, setSending] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = useCallback(async () => {
    const [cr, comr] = await Promise.all([getCampaign(id), getCampaignComms(id)])
    setCampaign(cr.data)
    setComms(comr.data)
  }, [id])

  useEffect(() => { load() }, [load])

  // Auto-refresh while sending
  useEffect(() => {
    if (campaign?.status === 'sent' && campaign?.total_sent > 0) {
      const pending = comms.filter(c => c.status === 'sent').length
      if (pending > 0) setAutoRefresh(true)
      else setAutoRefresh(false)
    }
  }, [campaign, comms])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [autoRefresh, load])

  const handleSend = async () => {
    setSending(true)
    try {
      await sendCampaign(id)
      setAutoRefresh(true)
      await load()
    } finally {
      setSending(false)
    }
  }

  if (!campaign) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full" />
    </div>
  )

  const pending = comms.filter(c => c.status === 'sent').length
  const statusCounts = {
    delivered: campaign.delivered,
    failed: campaign.failed,
    opened: campaign.opened,
    clicked: campaign.clicked,
    pending,
  }

  const pieData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }))

  return (
    <div className="space-y-6">
      <div>
        <Link to="/campaigns" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} />Back to Campaigns
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <p className="text-slate-500 text-sm mt-1 capitalize">{campaign.channel} · {campaign.status}</p>
          </div>
          <div className="flex gap-2">
            {autoRefresh && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                <RefreshCw size={12} className="animate-spin" />Live updating…
              </span>
            )}
            {campaign.status === 'draft' && (
              <button onClick={handleSend} disabled={sending}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                <Send size={15} />{sending ? 'Sending...' : 'Send Campaign'}
              </button>
            )}
            <button onClick={load} className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50">
              <RefreshCw size={14} />Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: campaign.total_sent, color: 'text-slate-900' },
          { label: 'Delivered', value: campaign.delivered, color: 'text-emerald-600', rate: campaign.total_sent ? `${Math.round(campaign.delivered/campaign.total_sent*100)}%` : null },
          { label: 'Opened', value: campaign.opened, color: 'text-blue-600', rate: campaign.delivered ? `${Math.round(campaign.opened/campaign.delivered*100)}%` : null },
          { label: 'Clicked', value: campaign.clicked, color: 'text-violet-600', rate: campaign.opened ? `${Math.round(campaign.clicked/campaign.opened*100)}%` : null },
        ].map(({ label, value, color, rate }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {rate && <p className="text-xs text-slate-400 mt-0.5">{rate} rate</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Delivery Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Message */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Message Template</h2>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {campaign.message_template}
          </div>
        </div>
      </div>

      {/* Communications log */}
      {comms.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Communication Log</h2>
            <span className="text-xs text-slate-400">{pending > 0 ? `${pending} pending delivery` : 'All delivered'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['ID', 'Customer', 'Channel', 'Status', 'Time'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {comms.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-400">#{c.id}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">Cust #{c.customer_id}</td>
                    <td className="px-4 py-2.5 text-sm capitalize text-slate-600">{c.channel}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {statusIcon[c.status]}
                        <span className="text-xs capitalize text-slate-600">{c.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleTimeString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
