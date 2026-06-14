import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, Megaphone, Filter, IndianRupee, TrendingUp, Mail, CheckCircle, Eye, MousePointer } from 'lucide-react'
import { getDashboard } from '../api'

const StatCard = ({ label, value, icon: Icon, color = 'violet', sub }) => {
  const colors = {
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

const statusColor = { draft: 'bg-slate-100 text-slate-600', sending: 'bg-amber-100 text-amber-700', sent: 'bg-emerald-100 text-emerald-700' }

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full" />
    </div>
  )

  const { campaign_stats: cs, recent_campaigns } = data
  const funnelData = [
    { name: 'Sent', value: cs.total_sent, color: '#8b5cf6' },
    { name: 'Delivered', value: cs.total_delivered, color: '#6d28d9' },
    { name: 'Opened', value: cs.total_opened, color: '#4c1d95' },
    { name: 'Clicked', value: cs.total_clicked, color: '#2e1065' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Your CRM at a glance</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={data.total_customers.toLocaleString()} icon={Users} color="violet" />
        <StatCard label="Total Revenue" value={`₹${(data.total_revenue / 1000).toFixed(0)}K`} icon={IndianRupee} color="emerald" />
        <StatCard label="Campaigns" value={data.total_campaigns} icon={Megaphone} color="blue" />
        <StatCard label="Segments" value={data.total_segments} icon={Filter} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Campaign Funnel (All Time)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={funnelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
              <Tooltip formatter={(v) => [v.toLocaleString(), 'Count']} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Delivery Rate', value: `${cs.delivery_rate}%`, icon: CheckCircle, color: 'text-emerald-600' },
              { label: 'Open Rate', value: `${cs.open_rate}%`, icon: Eye, color: 'text-blue-600' },
              { label: 'Click Rate', value: `${cs.click_rate}%`, icon: MousePointer, color: 'text-violet-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center">
                <Icon size={16} className={`mx-auto mb-1 ${color}`} />
                <p className="text-lg font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent campaigns */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Recent Campaigns</h2>
            <Link to="/campaigns" className="text-xs text-violet-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recent_campaigns.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No campaigns yet. <Link to="/campaigns" className="text-violet-600">Create one →</Link></p>
            )}
            {recent_campaigns.map(c => (
              <Link key={c.id} to={`/campaigns/${c.id}`} className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{c.channel} · {c.total_sent} sent</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-3 ${statusColor[c.status] || 'bg-slate-100 text-slate-600'}`}>
                    {c.status}
                  </span>
                </div>
                {c.total_sent > 0 && (
                  <div className="mt-2 flex gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500" />{c.delivered}</span>
                    <span className="flex items-center gap-1"><Eye size={11} className="text-blue-500" />{c.opened}</span>
                    <span className="flex items-center gap-1"><MousePointer size={11} className="text-violet-500" />{c.clicked}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
