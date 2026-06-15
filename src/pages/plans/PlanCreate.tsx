import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api, SYSTEM_PROGRAM, extractPDA, typesToMask } from '../../lib/api'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { BENEFICIARY_TYPE_LABELS } from '../../types'
import type { Enterprise, Profile } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile; onRefresh: () => void }

export default function PlanCreate({ enterprise, profile }: Props) {
  const nav = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    planId: '',
    contractType: '0',
    durationDays: '365',
    curveKPpm: '0',
    earlySettlementEnabled: false,
    revocable: false,
    allowedTypes: [0, 1, 2, 3] as number[],
  })

  // Auto-assign next plan ID (per enterprise, starts at 1000)
  useEffect(() => {
    supabase
      .from('benefit_plans')
      .select('plan_id')
      .eq('enterprise_id', enterprise.id)
      .then(({ data }) => {
        const ids = (data ?? []).map(r => Number(r.plan_id)).filter(n => !isNaN(n))
        const next = ids.length > 0 ? Math.max(...ids) + 1 : 1000
        setForm(f => ({ ...f, planId: String(next) }))
      })
  }, [enterprise.id])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function toggleType(t: number) {
    setForm(f => ({
      ...f,
      allowedTypes: f.allowedTypes.includes(t)
        ? f.allowedTypes.filter(x => x !== t)
        : [...f.allowedTypes, t],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!enterprise.pda_address) {
      toast('error', 'Missing enterprise PDA', 'Enterprise was not initialized on-chain')
      return
    }
    setLoading(true)
    try {
      const durationSeconds = String(parseInt(form.durationDays) * 86400)
      const mask = typesToMask(form.allowedTypes)

      const tx = await api.createPlan({
        adminAuthority: enterprise.admin_authority,
        enterprise: enterprise.pda_address,
        settlementMint: enterprise.settlement_mint,
        systemProgram: SYSTEM_PROGRAM,
        planId: form.planId,
        args: {
          contractType: parseInt(form.contractType),
          allowedBeneficiaryTypes: mask,
          durationSeconds,
          curveKPpm: form.curveKPpm || '0',
          earlySettlementEnabled: form.earlySettlementEnabled,
          revocable: form.revocable,
        },
      })

      const planPDA = extractPDA(tx, 'plan')

      const { data: plan, error } = await supabase.from('benefit_plans').insert({
        enterprise_id: enterprise.id,
        plan_id: form.planId,
        pda_address: planPDA ?? null,
        name: form.name,
        vesting_type: form.contractType === '0' ? 'linear' : 'accelerated',
        duration_seconds: parseInt(durationSeconds),
        early_settlement: form.earlySettlementEnabled,
        revocable: form.revocable,
        eligible_types: form.allowedTypes,
        status: 'inactive',
        created_by: profile.id,
      }).select().single()

      if (error) throw new Error(error.message)

      await supabase.from('transactions').insert({
        enterprise_id: enterprise.id, action: 'create_plan',
        signature: tx.signature, status: 'confirmed', created_by: profile.id,
        related_entity_id: plan.id, related_entity_type: 'plan',
      })

      toast('success', 'Plan created!', form.name, tx.signature)
      nav(`/plans/${plan.id}`)
    } catch (err: unknown) {
      toast('error', 'Transaction failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  return (
    <Layout enterprise={enterprise} profile={profile} header={
      <PageHeader
        title="Create Benefit Plan"
        subtitle="Define a new vesting schedule for grants"
        action={<Button variant="ghost" size="sm" onClick={() => nav('/plans')}><ArrowLeft size={14} /> Back</Button>}
      />
    }>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan details</h3>
          <div className="space-y-4">
            <Input label="Plan name" placeholder="Employee 4-Year Vest" value={form.name} onChange={set('name')} required />
            <Select label="Contract type" value={form.contractType} onChange={set('contractType')}>
              <option value="0">Linear vesting</option>
              <option value="1">Exponential (accelerated)</option>
            </Select>
            <Input label="Duration (days)" type="number" min="1" value={form.durationDays} onChange={set('durationDays')} required />
            {form.contractType === '1' && (
              <Input label="Curve K (ppm)" value={form.curveKPpm} onChange={set('curveKPpm')} hint="Exponential coefficient in parts per million" />
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Eligible beneficiary types</h3>
          <div className="grid grid-cols-2 gap-2">
            {([0, 1, 2, 3] as const).map(t => (
              <label key={t} className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                form.allowedTypes.includes(t) ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={form.allowedTypes.includes(t)}
                  onChange={() => toggleType(t)}
                  className="accent-violet-600"
                />
                <span className="text-sm text-gray-700">{BENEFICIARY_TYPE_LABELS[t]}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan rules</h3>
          <div className="space-y-3">
            {[
              { key: 'earlySettlementEnabled', label: 'Allow early settlement', sub: 'Beneficiaries can exit early and receive vested funds' },
              { key: 'revocable', label: 'Revocable', sub: 'Admin can revoke positions, returning unvested funds to treasury' },
            ].map(({ key, label, sub }) => (
              <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                form[key as keyof typeof form] ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={!!form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="accent-violet-600 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Button type="submit" loading={loading} className="w-full justify-center">
          Create Plan on Solana
        </Button>
      </form>
    </Layout>
  )
}
