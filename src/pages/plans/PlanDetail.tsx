import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Plus, Play, Pause } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api, EXPLORER_ADDR } from '../../lib/api'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { BENEFICIARY_TYPE_LABELS, PLAN_STATUS_COLORS, POSITION_STATUS_COLORS } from '../../types'
import type { BenefitPlan, Enterprise, Position, Profile } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile; onRefresh: () => void }

export default function PlanDetail({ enterprise, profile }: Props) {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { toast } = useToast()
  const [plan, setPlan] = useState<BenefitPlan | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase.from('benefit_plans').select('*').eq('id', id).single().then(({ data }) => setPlan(data))
    supabase.from('positions').select('*, beneficiaries(full_name)').eq('plan_id', id)
      .order('created_at', { ascending: false }).then(({ data }) => setPositions(data ?? []))
  }, [id])

  async function togglePlan() {
    if (!plan?.pda_address || !enterprise.pda_address) {
      toast('error', 'Missing PDA', 'Plan or enterprise was not initialized on-chain')
      return
    }
    setLoading(true)
    try {
      const isActive = plan.status === 'active'
      const tx = isActive
        ? await api.deactivatePlan({ adminAuthority: enterprise.admin_authority, enterprise: enterprise.pda_address, plan: plan.pda_address })
        : await api.activatePlan({ adminAuthority: enterprise.admin_authority, enterprise: enterprise.pda_address, plan: plan.pda_address })

      const newStatus = isActive ? 'deactivated' : 'active'
      await supabase.from('benefit_plans').update({ status: newStatus }).eq('id', plan.id)
      await supabase.from('transactions').insert({
        enterprise_id: enterprise.id, action: isActive ? 'deactivate_plan' : 'activate_plan',
        signature: tx.signature, status: 'confirmed', created_by: profile.id,
        related_entity_id: plan.id, related_entity_type: 'plan',
      })
      setPlan(p => p ? { ...p, status: newStatus } : null)
      toast('success', isActive ? 'Plan deactivated' : 'Plan activated', undefined, tx.signature)
    } catch (err: unknown) {
      toast('error', 'Transaction failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  const fmt = (n: string) => (Number(n) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })
  const fmtDur = (s: number) => {
    const d = Math.round(s / 86400)
    return d >= 365 ? `${(d / 365).toFixed(1)} years` : d >= 30 ? `${Math.round(d / 30)} months` : `${d} days`
  }

  if (!plan) return (
    <Layout enterprise={enterprise} profile={profile}>
      <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
    </Layout>
  )

  return (
    <Layout enterprise={enterprise} profile={profile} header={
      <PageHeader
        title={plan.name}
        subtitle={`Plan ID: ${plan.plan_id}`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/plans')}><ArrowLeft size={14} /> Back</Button>
            <Button
              variant={plan.status === 'active' ? 'secondary' : 'primary'}
              size="sm"
              loading={loading}
              onClick={togglePlan}
              disabled={plan.status === 'deactivated'}
            >
              {plan.status === 'active' ? <><Pause size={14} /> Deactivate</> : <><Play size={14} /> Activate</>}
            </Button>
            {plan.status === 'active' && (
              <Link to={`/positions/create?planId=${plan.id}`}>
                <Button size="sm"><Plus size={14} /> New Position</Button>
              </Link>
            )}
          </div>
        }
      />
    }>
      <div className="space-y-4 max-w-3xl">
        {/* Plan config */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Plan configuration</h3>
            <Badge className={PLAN_STATUS_COLORS[plan.status]} dot>{plan.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-8">
            {[
              { label: 'Vesting type', value: plan.vesting_type === 'linear' ? 'Linear' : 'Accelerated (Exponential)' },
              { label: 'Duration', value: fmtDur(plan.duration_seconds) },
              { label: 'Early settlement', value: plan.early_settlement ? 'Enabled' : 'Disabled' },
              { label: 'Revocable', value: plan.revocable ? 'Yes' : 'No' },
              { label: 'Eligible types', value: plan.eligible_types.map(t => BENEFICIARY_TYPE_LABELS[t]).join(', ') },
              { label: 'Created', value: new Date(plan.created_at).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm text-gray-900 font-medium">{value}</p>
              </div>
            ))}
          </div>
          {plan.pda_address && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <span className="text-xs text-gray-500">Plan PDA:</span>
              <code className="text-xs text-gray-700 flex-1 truncate">{plan.pda_address}</code>
              <a href={EXPLORER_ADDR(plan.pda_address)} target="_blank" rel="noreferrer" className="text-violet-500">
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </Card>

        {/* Positions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Positions under this plan ({positions.length})</h3>
          </div>
          {positions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No positions yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {['Grant ID', 'Beneficiary', 'Principal', 'Funded', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {positions.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => nav(`/positions/${p.id}`)}>
                    <td className="px-5 py-3 font-mono text-xs">{p.grant_id}</td>
                    <td className="px-5 py-3">{(p as unknown as { beneficiaries?: { full_name: string } }).beneficiaries?.full_name ?? '—'}</td>
                    <td className="px-5 py-3">{fmt(p.principal)}</td>
                    <td className="px-5 py-3">{fmt(p.funded_amount)}</td>
                    <td className="px-5 py-3"><Badge className={POSITION_STATUS_COLORS[p.status]} dot>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
