import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Landmark } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { EXPLORER_ADDR, EXPLORER_URL } from '../../lib/api'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import type { Enterprise, Profile, Transaction } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile }

export default function Treasury({ enterprise, profile }: Props) {
  const nav = useNavigate()
  const [txs, setTxs] = useState<Transaction[]>([])

  useEffect(() => {
    supabase.from('transactions')
      .select('*')
      .eq('enterprise_id', enterprise.id)
      .in('action', ['fund_position', 'settle_early', 'revoke_position', 'claim_vested'])
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setTxs(data ?? []))
  }, [enterprise.id])

  const txLabel = (a: string) => a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <Layout
      enterprise={enterprise}
      profile={profile}
      header={<PageHeader title="Treasury" subtitle={enterprise.name} action={
        <button
          onClick={() => nav('/positions')}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Fund positions
        </button>
      } />}
    >
      <div className="flex gap-5">
        <div className="flex-1 min-w-0 space-y-4">
          {/* Funding history */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Funding history</h3>
            </div>
            {txs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">No treasury transactions yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Action', 'Status', 'Date', 'Signature'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txs.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{txLabel(tx.action)}</td>
                      <td className="px-5 py-3">
                        <Badge className={tx.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} dot>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        {tx.signature ? (
                          <a href={EXPLORER_URL(tx.signature)} target="_blank" rel="noreferrer"
                            className="font-mono text-xs text-blue-500 hover:underline flex items-center gap-1">
                            {tx.signature.slice(0, 8)}… <ExternalLink size={10} />
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-64 shrink-0 space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Treasury authority</h3>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <code className="text-xs text-gray-600 break-all">{enterprise.treasury_authority}</code>
            </div>
            <a
              href={EXPLORER_ADDR(enterprise.treasury_authority)}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
            >
              View on Explorer <ExternalLink size={10} />
            </a>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Settlement mint</h3>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <code className="text-xs text-gray-600 break-all">{enterprise.settlement_mint}</code>
            </div>
            <a
              href={EXPLORER_ADDR(enterprise.settlement_mint)}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
            >
              View on Explorer <ExternalLink size={10} />
            </a>
          </Card>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <Landmark size={16} className="text-amber-500 mb-2" />
            <p className="text-xs font-medium text-amber-800 mb-1">To fund positions</p>
            <p className="text-xs text-amber-600">Go to Positions, open a position, and click "Fund" to transfer tokens from the treasury token account into the position vault.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
