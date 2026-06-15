import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { BENEFICIARY_TYPE_LABELS } from '../../types'
import type { Beneficiary, Enterprise, Profile } from '../../types'

const TYPE_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-blue-700',
  1: 'bg-green-100 text-green-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-gray-100 text-gray-700',
}

interface Props { enterprise: Enterprise; profile: Profile }

export default function BeneficiariesList({ enterprise, profile }: Props) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [filter, setFilter] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('beneficiaries').select('*').eq('enterprise_id', enterprise.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setBeneficiaries(data ?? []); setLoading(false) })
  }, [enterprise.id])

  const filtered = filter === 'all' ? beneficiaries : beneficiaries.filter(b => b.beneficiary_type === filter)

  const tabs = [
    { label: 'All', value: 'all' as const },
    ...([0, 1, 2, 3, 4] as const).filter(t => beneficiaries.some(b => b.beneficiary_type === t))
      .map(t => ({ label: BENEFICIARY_TYPE_LABELS[t], value: t })),
  ]

  const truncAddr = (a: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—'

  return (
    <Layout
      enterprise={enterprise}
      profile={profile}
      header={
        <PageHeader
          title="Beneficiaries"
          subtitle={`${beneficiaries.length} people`}
          action={profile.role !== 'beneficiary' && <Link to="/beneficiaries/add"><Button size="sm"><Plus size={14} /> Add Beneficiary</Button></Link>}
        />
      }
    >
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={String(t.value)}
            onClick={() => setFilter(t.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              filter === t.value ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-4">No beneficiaries yet.</p>
          {profile.role !== 'beneficiary' && <Link to="/beneficiaries/add"><Button size="sm"><Plus size={14} /> Add Beneficiary</Button></Link>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name', 'Email', 'Type', 'Wallet', 'Wallet type', 'Added'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{b.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{b.email ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Badge className={TYPE_COLORS[b.beneficiary_type]}>
                      {BENEFICIARY_TYPE_LABELS[b.beneficiary_type]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{truncAddr(b.wallet_address)}</td>
                  <td className="px-5 py-3">
                    <Badge className={b.wallet_type === 'managed' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}>
                      {b.wallet_type}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
