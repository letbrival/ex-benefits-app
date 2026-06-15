import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, DollarSign, X, BarChart2, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api, EXPLORER_URL, EXPLORER_ADDR, TOKEN_PROGRAM, ASSOCIATED_TOKEN_PROGRAM, SYSTEM_PROGRAM } from '../../lib/api'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { VestingBar } from '../../components/ui/VestingBar'
import { useToast } from '../../components/ui/Toast'
import { BENEFICIARY_TYPE_LABELS, POSITION_STATUS_COLORS } from '../../types'
import type { BenefitPlan, Beneficiary, Enterprise, Position, Profile } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile; onRefresh: () => void }

type FullPosition = Position & { benefit_plans: BenefitPlan | null; beneficiaries: Beneficiary | null }

export default function PositionDetail({ enterprise, profile }: Props) {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { toast } = useToast()
  const [pos, setPos] = useState<FullPosition | null>(null)
  const [modal, setModal] = useState<'fund' | 'revoke' | 'close' | 'quote' | null>(null)
  const [loading, setLoading] = useState(false)
  const [fundForm, setFundForm] = useState({ amount: '', treasuryTokenAccount: '' })
  const [quoteResult, setQuoteResult] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('positions').select('*, benefit_plans(*), beneficiaries(*)')
      .eq('id', id).single().then(({ data }) => setPos(data as FullPosition))
  }, [id])

  function reload() {
    if (!id) return
    supabase.from('positions').select('*, benefit_plans(*), beneficiaries(*)')
      .eq('id', id).single().then(({ data }) => setPos(data as FullPosition))
  }

  async function logTx(action: string, sig: string, entityId: string) {
    await supabase.from('transactions').insert({
      enterprise_id: enterprise.id, action, signature: sig, status: 'confirmed',
      created_by: profile.id, related_entity_id: entityId, related_entity_type: 'position',
    })
  }

  async function handleFund() {
    if (!pos?.pda_address || !pos.benefit_plans?.pda_address || !enterprise.pda_address) {
      toast('error', 'Missing PDA addresses'); return
    }
    setLoading(true)
    try {
      const amountUnits = String(Math.round(parseFloat(fundForm.amount) * 1e9))
      const tx = await api.fundPosition({
        treasuryAuthority: enterprise.treasury_authority,
        enterprise: enterprise.pda_address,
        plan: pos.benefit_plans.pda_address,
        position: pos.pda_address,
        settlementMint: enterprise.settlement_mint,
        treasuryTokenAccount: fundForm.treasuryTokenAccount,
        positionVault: pos.vault_address!,
        tokenProgram: TOKEN_PROGRAM,
        amount: amountUnits,
      })
      await supabase.from('positions').update({
        funded_amount: String(BigInt(pos.funded_amount) + BigInt(amountUnits)),
        status: 'funded',
      }).eq('id', pos.id)
      await logTx('fund_position', tx.signature, pos.id)
      toast('success', 'Position funded!', `${fundForm.amount} tokens`, tx.signature)
      reload(); setModal(null)
    } catch (err: unknown) {
      toast('error', 'Fund failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  async function handleQuote() {
    if (!pos?.pda_address || !pos.benefit_plans?.pda_address || !enterprise.pda_address || !pos.vault_address) {
      toast('error', 'Missing PDA addresses'); return
    }
    setLoading(true)
    try {
      const tx = await api.quotePosition({
        enterprise: enterprise.pda_address,
        plan: pos.benefit_plans.pda_address,
        position: pos.pda_address,
        settlementMint: enterprise.settlement_mint,
        positionVault: pos.vault_address,
        tokenProgram: TOKEN_PROGRAM,
      })
      setQuoteResult(tx.signature)
      await logTx('quote_position', tx.signature, pos.id)
      toast('success', 'Quote submitted', 'View on Explorer', tx.signature)
    } catch (err: unknown) {
      toast('error', 'Quote failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  async function handleRevoke() {
    if (!pos?.pda_address || !pos.benefit_plans?.pda_address || !enterprise.pda_address || !pos.vault_address || !pos.beneficiaries) {
      toast('error', 'Missing required fields'); return
    }
    setLoading(true)
    try {
      const tx = await api.revokePosition({
        adminAuthority: enterprise.admin_authority,
        enterprise: enterprise.pda_address,
        plan: pos.benefit_plans.pda_address,
        position: pos.pda_address,
        beneficiary: pos.beneficiaries.wallet_address,
        settlementMint: enterprise.settlement_mint,
        positionVault: pos.vault_address,
        beneficiaryTokenAccount: pos.beneficiaries.wallet_address,
        treasuryAuthority: enterprise.treasury_authority,
        treasuryTokenAccount: enterprise.treasury_authority,
        tokenProgram: TOKEN_PROGRAM,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
        systemProgram: SYSTEM_PROGRAM,
      })
      await supabase.from('positions').update({ status: 'revoked' }).eq('id', pos.id)
      await logTx('revoke_position', tx.signature, pos.id)
      toast('success', 'Position revoked', undefined, tx.signature)
      reload(); setModal(null)
    } catch (err: unknown) {
      toast('error', 'Revoke failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  async function handleClose() {
    if (!pos?.pda_address || !pos.benefit_plans?.pda_address || !enterprise.pda_address || !pos.vault_address) {
      toast('error', 'Missing PDA addresses'); return
    }
    setLoading(true)
    try {
      const tx = await api.closePosition({
        adminAuthority: enterprise.admin_authority,
        enterprise: enterprise.pda_address,
        plan: pos.benefit_plans.pda_address,
        position: pos.pda_address,
        settlementMint: enterprise.settlement_mint,
        positionVault: pos.vault_address,
        rentRecipient: enterprise.admin_authority,
        tokenProgram: TOKEN_PROGRAM,
      })
      await supabase.from('positions').update({ status: 'closed' }).eq('id', pos.id)
      await logTx('close_position', tx.signature, pos.id)
      toast('success', 'Position closed', undefined, tx.signature)
      reload(); setModal(null)
    } catch (err: unknown) {
      toast('error', 'Close failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  const fmt = (n: string) => (Number(n) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })

  if (!pos) return (
    <Layout enterprise={enterprise} profile={profile}>
      <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
    </Layout>
  )

  const plan = pos.benefit_plans
  const ben = pos.beneficiaries
  const canFund = !['settled', 'revoked', 'closed'].includes(pos.status) && (profile.role === 'admin' || profile.role === 'treasury_manager')
  const canRevoke = plan?.revocable && !['settled', 'revoked', 'closed', 'claimed'].includes(pos.status) && profile.role === 'admin'
  const canClose = ['settled', 'revoked', 'claimed'].includes(pos.status) && profile.role === 'admin'

  return (
    <Layout enterprise={enterprise} profile={profile} header={
      <PageHeader
        title={`Grant #${pos.grant_id}`}
        subtitle={ben?.full_name ?? 'Position detail'}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/positions')}><ArrowLeft size={14} /> Back</Button>
            <Button variant="secondary" size="sm" onClick={() => { setModal('quote'); handleQuote() }}>
              <BarChart2 size={14} /> Quote
            </Button>
            {canFund && <Button size="sm" onClick={() => setModal('fund')}><DollarSign size={14} /> Fund</Button>}
            {canRevoke && <Button variant="danger" size="sm" onClick={() => setModal('revoke')}><XCircle size={14} /> Revoke</Button>}
            {canClose && <Button variant="secondary" size="sm" onClick={() => setModal('close')}><X size={14} /> Close</Button>}
          </div>
        }
      />
    }>
      <div className="space-y-4 max-w-2xl">
        {/* Status */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Position overview</h3>
            <Badge className={POSITION_STATUS_COLORS[pos.status]} dot>{pos.status}</Badge>
          </div>
          {plan && (
            <VestingBar
              startDate={pos.vesting_start}
              durationSeconds={plan.duration_seconds}
              funded={pos.funded_amount}
              claimed={pos.claimed_amount}
              principal={pos.principal}
            />
          )}
        </Card>

        {/* Details */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Details</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Beneficiary', value: ben?.full_name ?? '—' },
              { label: 'Type', value: BENEFICIARY_TYPE_LABELS[pos.beneficiary_type] },
              { label: 'Plan', value: plan?.name ?? '—' },
              { label: 'Vesting type', value: plan?.vesting_type ?? '—' },
              { label: 'Principal', value: fmt(pos.principal) },
              { label: 'Funded', value: fmt(pos.funded_amount) },
              { label: 'Claimed', value: fmt(pos.claimed_amount) },
              { label: 'Vesting start', value: new Date(pos.vesting_start).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* On-chain addresses */}
        {(pos.pda_address || pos.vault_address) && (
          <Card>
            <h3 className="text-sm font-semibold mb-3">On-chain addresses</h3>
            <div className="space-y-2">
              {pos.pda_address && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-28 shrink-0">Position PDA</span>
                  <code className="text-xs text-gray-700 flex-1 truncate">{pos.pda_address}</code>
                  <a href={EXPLORER_ADDR(pos.pda_address)} target="_blank" rel="noreferrer" className="text-violet-500"><ExternalLink size={12} /></a>
                </div>
              )}
              {pos.vault_address && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-28 shrink-0">Vault</span>
                  <code className="text-xs text-gray-700 flex-1 truncate">{pos.vault_address}</code>
                  <a href={EXPLORER_ADDR(pos.vault_address)} target="_blank" rel="noreferrer" className="text-violet-500"><ExternalLink size={12} /></a>
                </div>
              )}
              {quoteResult && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <span className="text-xs text-gray-500 w-28 shrink-0">Last quote tx</span>
                  <a href={EXPLORER_URL(quoteResult)} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline truncate flex-1">
                    {quoteResult.slice(0, 20)}… ↗
                  </a>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Fund modal */}
      <Modal open={modal === 'fund'} onClose={() => setModal(null)} title="Fund Position" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Transfer tokens from the treasury into this position's vault.</p>
          <Input label="Amount (tokens)" type="number" step="any" min="0" placeholder="250" value={fundForm.amount}
            onChange={e => setFundForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="Treasury token account" placeholder="SPL token account address" value={fundForm.treasuryTokenAccount}
            onChange={e => setFundForm(f => ({ ...f, treasuryTokenAccount: e.target.value }))}
            hint="Associated token account of the treasury authority" />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button size="sm" loading={loading} onClick={handleFund} disabled={!fundForm.amount || !fundForm.treasuryTokenAccount}>Fund</Button>
          </div>
        </div>
      </Modal>

      {/* Revoke modal */}
      <Modal open={modal === 'revoke'} onClose={() => setModal(null)} title="Revoke Position" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Vested funds will go to the beneficiary. Unvested funds return to treasury.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={loading} onClick={handleRevoke}>Confirm revoke</Button>
          </div>
        </div>
      </Modal>

      {/* Close modal */}
      <Modal open={modal === 'close'} onClose={() => setModal(null)} title="Close Position" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Close this completed position and recover rent to the admin authority.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button size="sm" loading={loading} onClick={handleClose}>Confirm close</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
