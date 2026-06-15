import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, Plus, ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { EXPLORER_URL } from '../../lib/api'
import type { Enterprise, Profile, Transaction, BenefitPlan } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile }

interface Stats {
  positions: number
  totalPrincipal: bigint
  totalFunded: bigint
  totalClaimed: bigint
  claimable: bigint
  claimableCount: number
}

const ACTION_ICONS: Record<string, { icon: typeof ArrowDownLeft; color: string }> = {
  claim_vested:     { icon: ArrowDownLeft, color: 'bg-green-100 text-green-600' },
  fund_position:    { icon: ArrowUpRight,  color: 'bg-blue-100 text-blue-600' },
  create_position:  { icon: Plus,          color: 'bg-violet-100 text-violet-600' },
  settle_early:     { icon: ArrowDownLeft, color: 'bg-amber-100 text-amber-600' },
}

export default function Dashboard({ enterprise, profile }: Props) {
  const nav = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [plans, setPlans] = useState<BenefitPlan[]>([])
  const [weekFunded, setWeekFunded] = useState<bigint>(0n)

  useEffect(() => {
    if (!enterprise) return
    const eid = enterprise.id

    Promise.all([
      supabase.from('positions').select('principal,funded_amount,claimed_amount').eq('enterprise_id', eid),
      supabase.from('transactions').select('*').eq('enterprise_id', eid).order('created_at', { ascending: false }).limit(8),
      supabase.from('benefit_plans').select('*').eq('enterprise_id', eid).order('created_at', { ascending: false }).limit(6),
      // funded this week
      supabase.from('transactions').select('metadata').eq('enterprise_id', eid).eq('action', 'fund_position')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]).then(([pos, txRes, planRes, weekRes]) => {
      const positions = pos.data ?? []
      let claimable = 0n
      let claimableCount = 0

      for (const p of positions) {
        const funded = BigInt(p.funded_amount ?? '0')
        const claimed = BigInt(p.claimed_amount ?? '0')
        if (funded > claimed) { claimable += funded - claimed; claimableCount++ }
      }

      setStats({
        positions: positions.length,
        totalPrincipal: positions.reduce((s, p) => s + BigInt(p.principal ?? '0'), 0n),
        totalFunded: positions.reduce((s, p) => s + BigInt(p.funded_amount ?? '0'), 0n),
        totalClaimed: positions.reduce((s, p) => s + BigInt(p.claimed_amount ?? '0'), 0n),
        claimable,
        claimableCount,
      })
      setTxs(txRes.data ?? [])
      setPlans(planRes.data ?? [])

      const wf = (weekRes.data ?? []).reduce((s: bigint, r: { metadata: Record<string,unknown> | null }) => {
        const amt = r.metadata?.amount ? BigInt(r.metadata.amount as string) : 0n
        return s + amt
      }, 0n)
      setWeekFunded(wf)
    })
  }, [enterprise])

  const fmt = (n: bigint) => {
    const v = Number(n) / 1e9
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }

  const fundedPct = stats && stats.totalPrincipal > 0n
    ? Math.round(Number((stats.totalFunded * 100n) / stats.totalPrincipal))
    : 0

  const txLabel = (action: string) => action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const truncSig = (sig: string | null) => sig ? sig.slice(0, 6) + '…' + sig.slice(-4) : '—'

  return (
    <Layout
      enterprise={enterprise}
      profile={profile}
      header={
        <PageHeader
          title="Dashboard"
          subtitle={`${enterprise.name} · Devnet`}
          action={
            <div className="flex items-center gap-2">
              {profile.wallet_address && (
                <span className="text-xs text-gray-400 font-mono bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                  {profile.wallet_address.slice(0, 4)}…{profile.wallet_address.slice(-4)}
                </span>
              )}
              {profile.role !== 'beneficiary' && (
                <Link to="/positions/create">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                    <Plus size={14} /> New position
                  </button>
                </Link>
              )}
            </div>
          }
        />
      }
    >
      <div className="flex gap-5 h-full">
        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Principal granted', value: stats ? fmt(stats.totalPrincipal) : '—', sub: `across ${stats?.positions ?? 0} positions` },
              { label: 'Total funded', value: stats ? fmt(stats.totalFunded) : '—', sub: `${fundedPct}% of granted`, accent: weekFunded > 0n ? `+${fmt(weekFunded)} this week` : undefined },
              { label: 'Total claimed', value: stats ? fmt(stats.totalClaimed) : '—', sub: undefined },
              { label: 'Claimable now', value: stats ? fmt(stats.claimable) : '—', sub: `by ${stats?.claimableCount ?? 0} beneficiaries` },
            ].map(({ label, value, sub, accent }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                {accent && <p className="text-xs text-green-600 font-medium mt-0.5">{accent}</p>}
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Recent on-chain activity</h3>
              <a
                href={`https://explorer.solana.com/address/${enterprise.pda_address ?? enterprise.admin_authority}?cluster=devnet`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                Open explorer <ExternalLink size={11} />
              </a>
            </div>
            {txs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">No transactions yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {txs.map(tx => {
                  const cfg = ACTION_ICONS[tx.action] ?? { icon: TrendingUp, color: 'bg-gray-100 text-gray-500' }
                  const Icon = cfg.icon
                  return (
                    <div key={tx.id} className="px-5 py-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium">{txLabel(tx.action)}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {tx.metadata && (tx.metadata as Record<string,unknown>).name
                            ? String((tx.metadata as Record<string,unknown>).name)
                            : tx.action.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        {tx.signature && (
                          <a href={EXPLORER_URL(tx.signature)} target="_blank" rel="noreferrer"
                            className="text-[11px] font-mono text-blue-500 hover:underline flex items-center gap-0.5 justify-end mt-0.5">
                            {truncSig(tx.signature)} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="w-64 shrink-0 space-y-4">
          {/* Treasury balance */}
          <div className="bg-[#0f1117] rounded-xl p-5 text-white">
            <p className="text-xs text-slate-400 font-medium mb-1">Treasury balance</p>
            <p className="text-2xl font-semibold tracking-tight">—</p>
            <p className="text-xs text-slate-500 mt-0.5">USDC</p>
            <button
              onClick={() => nav('/treasury')}
              className="w-full mt-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Fund positions
            </button>
          </div>

          {/* Plans */}
          {profile.role !== 'beneficiary' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Plans</h3>
                <Link to="/plans" className="text-xs text-blue-600 hover:underline">See all</Link>
              </div>
              {plans.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-gray-400 mb-2">No plans yet</p>
                  <Link to="/plans/create" className="text-xs text-blue-600 hover:underline">Create plan →</Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {plans.map(p => (
                    <Link key={p.id} to={`/plans/${p.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        p.status === 'active' ? 'bg-green-400' : p.status === 'inactive' ? 'bg-gray-300' : 'bg-red-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-400 capitalize">
                          {p.vesting_type} · {Math.round(p.duration_seconds / 86400 / 365)} yr
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
