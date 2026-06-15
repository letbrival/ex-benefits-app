import { useState } from 'react'
import { ExternalLink, Shield, RefreshCw, ArrowLeftRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'
import type { Enterprise, Profile } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile; onRefresh: () => void }

export default function Governance({ enterprise, profile, onRefresh }: Props) {
  const { toast } = useToast()
  const [modal, setModal] = useState<'pause' | 'treasury' | 'transfer' | null>(null)
  const [loading, setLoading] = useState(false)
  const [newTreasury, setNewTreasury] = useState('')
  const [proposedAdmin, setProposedAdmin] = useState('')

  async function handlePauseResume() {
    setLoading(true)
    try {
      const isPaused = enterprise.status === 'paused'
      const tx = isPaused
        ? await api.resumeEnterprise({ adminAuthority: enterprise.admin_authority, enterprise: enterprise.pda_address! })
        : await api.pauseEnterprise({ adminAuthority: enterprise.admin_authority, enterprise: enterprise.pda_address! })

      await supabase.from('enterprises').update({ status: isPaused ? 'active' : 'paused' }).eq('id', enterprise.id)
      await supabase.from('transactions').insert({
        enterprise_id: enterprise.id, action: isPaused ? 'resume_enterprise' : 'pause_enterprise',
        signature: tx.signature, status: 'confirmed', created_by: profile.id,
      })
      toast('success', isPaused ? 'Enterprise resumed' : 'Enterprise paused', undefined, tx.signature)
      onRefresh()
    } catch (err: unknown) {
      toast('error', 'Transaction failed', err instanceof Error ? err.message : '')
    } finally {
      setLoading(false); setModal(null)
    }
  }

  async function handleUpdateTreasury() {
    setLoading(true)
    try {
      const tx = await api.updateTreasuryAuthority({
        adminAuthority: enterprise.admin_authority,
        enterprise: enterprise.pda_address!,
        newTreasuryAuthority: newTreasury,
      })
      await supabase.from('enterprises').update({ treasury_authority: newTreasury }).eq('id', enterprise.id)
      await supabase.from('transactions').insert({
        enterprise_id: enterprise.id, action: 'update_treasury_authority',
        signature: tx.signature, status: 'confirmed', created_by: profile.id,
      })
      toast('success', 'Treasury authority updated', undefined, tx.signature)
      onRefresh(); setModal(null)
    } catch (err: unknown) {
      toast('error', 'Transaction failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  async function handleProposeTransfer() {
    setLoading(true)
    try {
      const tx = await api.proposeAdminTransfer({
        adminAuthority: enterprise.admin_authority,
        enterprise: enterprise.pda_address!,
        proposedAdminAuthority: proposedAdmin,
      })
      await supabase.from('transactions').insert({
        enterprise_id: enterprise.id, action: 'propose_admin_transfer',
        signature: tx.signature, status: 'confirmed', created_by: profile.id,
        metadata: { proposed: proposedAdmin },
      })
      toast('success', 'Admin transfer proposed', 'Proposed admin must accept', tx.signature)
      setModal(null)
    } catch (err: unknown) {
      toast('error', 'Transaction failed', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  if (!enterprise.pda_address) return (
    <Layout enterprise={enterprise} profile={profile} header={<PageHeader title="Governance" />}>
      <div className="text-center py-16 text-gray-400">
        <Shield size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Enterprise PDA not available. On-chain actions require a verified PDA address.</p>
      </div>
    </Layout>
  )

  return (
    <Layout enterprise={enterprise} profile={profile} header={<PageHeader title="Governance & Treasury" subtitle="Manage enterprise controls and authority" />}>
      <div className="space-y-4 max-w-2xl">
        {/* Status */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Enterprise Status</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={enterprise.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} dot>
                  {enterprise.status}
                </Badge>
                <span className="text-xs text-gray-500">ID: {enterprise.enterprise_id}</span>
              </div>
            </div>
            <Button
              variant={enterprise.status === 'active' ? 'danger' : 'primary'}
              size="sm"
              onClick={() => setModal('pause')}
            >
              <RefreshCw size={14} />
              {enterprise.status === 'active' ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </Card>

        {/* Treasury */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Treasury Authority</h3>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3">
            <code className="text-xs text-gray-700 flex-1 truncate">{enterprise.treasury_authority}</code>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setModal('treasury')}>
            Update treasury authority
          </Button>
        </Card>

        {/* Admin transfer */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Admin Transfer</h3>
          <p className="text-xs text-gray-500 mb-3">Two-step transfer: current admin proposes, proposed admin accepts.</p>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3">
            <code className="text-xs text-gray-700 flex-1 truncate">{enterprise.admin_authority}</code>
            <span className="text-xs text-gray-400">current admin</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setModal('transfer')}>
            <ArrowLeftRight size={14} /> Propose admin transfer
          </Button>
        </Card>

        {/* PDA info */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">On-Chain Details</h3>
          <div className="space-y-2">
            {[
              { label: 'Enterprise PDA', value: enterprise.pda_address },
              { label: 'Settlement Mint', value: enterprise.settlement_mint },
            ].map(({ label, value }) => value && (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500 w-32 shrink-0">{label}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <code className="text-xs text-gray-700 truncate flex-1">{value}</code>
                  <a href={`https://explorer.solana.com/address/${value}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-violet-500">
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modals */}
      <Modal open={modal === 'pause'} onClose={() => setModal(null)} title={enterprise.status === 'active' ? 'Pause Enterprise' : 'Resume Enterprise'} size="sm">
        <p className="text-sm text-gray-600 mb-4">
          {enterprise.status === 'active'
            ? 'Pausing will prevent new plans and positions from being created. Existing positions are not affected.'
            : 'Resuming will allow new plans and positions to be created again.'}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant={enterprise.status === 'active' ? 'danger' : 'primary'} size="sm" loading={loading} onClick={handlePauseResume}>
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal open={modal === 'treasury'} onClose={() => setModal(null)} title="Update Treasury Authority" size="sm">
        <div className="space-y-4">
          <Input label="New treasury authority" placeholder="Solana public key" value={newTreasury} onChange={e => setNewTreasury(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button size="sm" loading={loading} onClick={handleUpdateTreasury} disabled={!newTreasury}>Update</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'transfer'} onClose={() => setModal(null)} title="Propose Admin Transfer" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">The proposed wallet must call "Accept admin transfer" to complete the handover.</p>
          <Input label="Proposed admin wallet" placeholder="Solana public key" value={proposedAdmin} onChange={e => setProposedAdmin(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button size="sm" loading={loading} onClick={handleProposeTransfer} disabled={!proposedAdmin}>Propose</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
