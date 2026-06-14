import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, ShoppingBag, TrendingUp } from 'lucide-react'
import { getCustomers, getCustomerStats } from '../api'

const tagColor = {
  vip: 'bg-amber-100 text-amber-700',
  loyal: 'bg-emerald-100 text-emerald-700',
  new: 'bg-blue-100 text-blue-700',
  churned: 'bg-red-100 text-red-700',
  seasonal: 'bg-orange-100 text-orange-700',
  'high-value': 'bg-violet-100 text-violet-700',
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState(null)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchCustomers = async (s = search, p = page) => {
    setLoading(true)
    const r = await getCustomers({ search: s || undefined, page: p, page_size: 20 })
    setCustomers(r.data.customers)
    setTotal(r.data.total)
    setLoading(false)
  }

  useEffect(() => {
    getCustomerStats().then(r => setStats(r.data))
    fetchCustomers('', 1)
  }, [])

  const handleSearch = (v) => {
    setSearch(v)
    setPage(1)
    fetchCustomers(v, 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 text-sm mt-1">{total.toLocaleString()} shoppers in your database</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Customers', value: stats.total_customers, icon: TrendingUp },
            { label: 'Total Revenue', value: `₹${(stats.total_revenue / 1000).toFixed(0)}K`, icon: ShoppingBag },
            { label: 'Avg. Spend', value: `₹${Math.round(stats.avg_order_value)}`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Name', 'City', 'Total Spent', 'Orders', 'Last Purchase', 'Tags'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">Loading...</td></tr>
              )}
              {!loading && customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/customers/${c.id}`} className="text-sm font-medium text-slate-900 hover:text-violet-600">{c.name}</Link>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-slate-600">
                      <MapPin size={12} className="text-slate-400" />{c.city || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">₹{c.total_spent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.visit_count}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).map(t => (
                        <span key={t} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tagColor[t] || 'bg-slate-100 text-slate-600'}`}>{t}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              <button onClick={() => { setPage(p => p - 1); fetchCustomers(search, page - 1) }} disabled={page === 1}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
              <button onClick={() => { setPage(p => p + 1); fetchCustomers(search, page + 1) }} disabled={page * 20 >= total}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
