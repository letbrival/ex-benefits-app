import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api, SYSTEM_PROGRAM, extractPDA } from '../../lib/api'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { BENEFICIARY_TYPE_LABELS } from '../../types'
import type { BenefitPlan, Beneficiary, Enterprise, Profile } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile; onRefresh: () => void }

export default function PositionCreate({ enterprise, profile }: Props) {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<BenefitPlan[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [selectedPlan, setSelectedPlan] = useState<BenefitPlan | null>(null)

  const [form, setForm] = useState({
    planId: params.get('planId') ?? '',
    beneficiaryId: '',
    grantId: '',
    principal: '',
    vestingStart: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    supabase.from('benefit_plans').select('*').eq('enterprise_id', enterprise.id).eq('status', 'active')
      .then(({ data }) => { setPlans(data ?? []); if (data?.length === 1 && !form.planId) setForm(f => ({ ...f, planId: data[0].id })) })
    supabase.from('beneficiaries').select('*').eq('enterprise_id', enterprise.id)
      .then(({ data }) => setBeneficiaries(data ?? []))
  }, [enterprise.id])

  useEffect(() => {
    const plan = plans.find(p => p.id === form.planId) ?? null
    setSelectedPlan(plan)
    setForm(f => ({ ...f, beneficiaryId: '', grantId: '' }))
  }, [form.planId, plans])

  // Auto-assign next grant ID (per beneficiary per plan, starts at 1000)
  useEffect(() => {
    if (!form.planId || !form.beneficiaryId) return
    supabase
      .from('positions')
      .select('grant_id')
      .eq('plan_id', form.planId)
      .eq('beneficiary_id', form.beneficiaryId)
      .then(({ data }) => {
        const ids = (data ?? []).map(r => Number(r.grant_id)).filter(n => !isNaN(n))
        const next = ids.length > 0 ? Math.max(...ids) + 1 : 1000
        setForm(f => ({ ...f, grantId: String(next) }))
      })
  }, [form.planId, form.beneficiaryId])

  const eligibleBeneficiaries = form.planId && selectedPlan
    ? beneficiaries.filter(b => selectedPlan.eligible_types.includes(b.beneficiary_type))
    : beneficiaries

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!enterprise.pda_address) { toast('error', 'Missing enterprise PDA'); return }
    const plan = plans.find(p => p.id === form.planId)
    if (!plan?.pda_address) { toast('error', 'Missing plan PDA'); return }
    const ben = beneficiaries.find(b => b.id === form.beneficiaryId)
    if (!ben) { toast('error', 'Select a beneficiary'); return }

    setLoading(true)
    try {
      const startTs = String(Math.floor(new Date(form.vestingStart).getTime() / 1000))
      const principalUnits = String(Math.round(parseFloat(form.principal)))

      const tx = await api.createPosition({
        adminAuthority: enterprise.admin_authority,
        enterprise: enterprise.pda_address,
        plan: plan.pda_address,
        settlementMint: enterprise.settlement_mint,
        systemProgram: SYSTEM_PROGRAM,
        args: {
          grantId: form.grantId,
          beneficiary: ben.wallet_address,
          beneficiaryType: ben.beneficiary_type,
          principal: principalUnits,
          startTimestamp: startTs,
        },
      })

      const positionPDA = extractPDA(tx, 'position')
      const vaultPDA = extractPDA(tx, 'position_vault')

      const { data: pos, error } = await supabase.from('positions').insert({
        enterprise_id: enterprise.id,
        plan_id: plan.id,
        beneficiary_id: ben.id,
        grant_id: form.grantId,
        pda_address: positionPDA ?? null,
        vault_address: vaultPDA ?? null,
        principal: principalUnits,
        funded_amount: '0',
        claimed_amount: '0',
        vesting_start: new Date(form.vestingStart).toISOString(),
        status: 'created',
        beneficiary_type: ben.beneficiary_type,
        created_by: profile.id,
      }).select().single()

      if (error) throw new Error(error.message)

      await supabase.from('transactions').insert({
        enterprise_id: enterprise.id, action: 'create_position',
        signature: tx.signature, status: 'confirmed', created_by: profile.id,
        related_entity_id: pos.id, related_entity_type: 'position',
      })

      toast('success', 'Position created!', `Grant #${form.grantId}`, tx.signature)
      nav(`/positions/${pos.id}`)
    } catch (err: unknown) {
      toast('error', 'Transaction failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  return (
    <Layout enterprise={enterprise} profile={profile} header={
      <PageHeader
        title="Create Position"
        subtitle="Issue a new benefit grant"
        action={<Button variant="ghost" size="sm" onClick={() => nav('/positions')}><ArrowLeft size={14} /> Back</Button>}
      />
    }>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan & beneficiary</h3>
          <div className="space-y-4">
            <Select label="Active plan" value={form.planId} onChange={set('planId')} required>
              <option value="">Select a plan…</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            {selectedPlan && (
              <div className="text-xs text-gray-500 px-1">
                Eligible: {selectedPlan.eligible_types.map((t: number) => BENEFICIARY_TYPE_LABELS[t]).join(', ')}
              </div>
            )}
            <Select label="Beneficiary" value={form.beneficiaryId} onChange={set('beneficiaryId')} required>
              <option value="">Select a beneficiary…</option>
              {eligibleBeneficiaries.map(b => (
                <option key={b.id} value={b.id}>
                  {b.full_name} — {BENEFICIARY_TYPE_LABELS[b.beneficiary_type]}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Grant details</h3>
          <div className="space-y-4">
            <Input label="Principal (tokens)" type="number" step="any" min="0" placeholder="1000" value={form.principal} onChange={set('principal')}  required />
            <Input label="Vesting start date" type="date" value={form.vestingStart} onChange={set('vestingStart')} required />
          </div>
        </Card>

        <Button type="submit" loading={loading} className="w-full justify-center">
          Create Position on Solana
        </Button>
      </form>
    </Layout>
  )
}
