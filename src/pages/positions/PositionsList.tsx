import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { BENEFICIARY_TYPE_LABELS, POSITION_STATUS_COLORS } from '../../types'
import type { Enterprise, Position, Profile } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile }

type PositionRow = Position & { benefit_plans: { name: string } | null; beneficiaries: { full_name: string; user_id: string | null } | null }

const statuses = ['created', 'funded', 'active', 'claimed', 'settled', 'revoked', 'closed'] as const
const fmt = (n: string) => (Number(n) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })

export default function PositionsList({ enterprise, profile }: Props) {
  const nav = useNavigate()
  const [positions, setPositions] = useState<PositionRow[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const isBeneficiary = profile.role === 'beneficiary'

  useEffect(() => {
    let query = supabase.from('positions')
      .select('*, benefit_plans(name), beneficiaries(full_name, user_id)')
      .eq('enterprise_id', enterprise.id)
      .order('created_at', { ascending: false })

    if (isBeneficiary) {
      query = query.eq('beneficiaries.user_id', profile.id)
    }

    query.then(({ data }) => {
      const rows = (data ?? []) as PositionRow[]
      setPositions(isBeneficiary ? rows.filter(p => p.beneficiaries !== null) : rows)
      setLoading(false)
    })
  }, [enterprise.id, isBeneficiary, profile.id])

  const displayed = positions.filter(p => {
    const matchStatus = filter === 'all' || p.status === filter
    const matchSearch = !search || p.beneficiaries?.full_name?.toLowerCase().includes(search.toLowerCase()) || p.grant_id.includes(search)
    return matchStatus && matchSearch
  })

  return (
    <Layout
      enterprise={enterprise}
      profile={profile}
      header={
        <PageHeader
          title="Positions"
          subtitle={`${positions.length} grants`}
          action={!isBeneficiary && <Link to="/positions/create"><Button size="sm"><Plus size={14} /> New Position</Button></Link>}
        />
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or grant ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-56"
        />
        <div className="flex gap-1 border-b border-gray-200">
          {['all', ...statuses].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer capitalize ${
                filter === s ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-4">No positions found.</p>
          {!isBeneficiary && <Link to="/positions/create"><Button size="sm"><Plus size={14} /> New Position</Button></Link>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Grant ID', 'Beneficiary', 'Type', 'Plan', 'Principal', 'Funded', 'Vesting start', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => nav(`/positions/${p.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs">{p.grant_id}</td>
                  <td className="px-4 py-3 font-medium">{p.beneficiaries?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{BENEFICIARY_TYPE_LABELS[p.beneficiary_type]}</td>
                  <td className="px-4 py-3 text-gray-500">{p.benefit_plans?.name ?? '—'}</td>
                  <td className="px-4 py-3">{fmt(p.principal)}</td>
                  <td className="px-4 py-3 text-blue-600">{fmt(p.funded_amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(p.vesting_start).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge className={POSITION_STATUS_COLORS[p.status]} dot>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
