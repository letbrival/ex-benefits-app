import { useState, useEffect } from 'react'
import { Building2, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api, SYSTEM_PROGRAM, extractPDA } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import type { Enterprise, Profile } from '../../types'

interface Props {
  profile: Profile
  onCreated: (e: Enterprise) => void
}

export default function EnterpriseSetup({ profile, onCreated }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: '',
    enterpriseId: '',
    adminAuthority: profile.wallet_address ?? '',
    treasuryAuthority: '',
    settlementMint: '',
  })
  const [loading, setLoading] = useState(false)

  // Auto-assign next enterprise ID (global, starts at 1000)
  useEffect(() => {
    supabase
      .from('enterprises')
      .select('enterprise_id')
      .then(({ data }) => {
        const ids = (data ?? []).map(r => Number(r.enterprise_id)).filter(n => !isNaN(n))
        const next = ids.length > 0 ? Math.max(...ids) + 1 : 1000
        setForm(f => ({ ...f, enterpriseId: String(next) }))
      })
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const tx = await api.initializeEnterprise({
        adminAuthority: form.adminAuthority,
        settlementMint: form.settlementMint,
        systemProgram: SYSTEM_PROGRAM,
        enterpriseId: form.enterpriseId,
        treasuryAuthority: form.treasuryAuthority,
      })

      const pdaAddress = extractPDA(tx, 'enterprise')

      const { data: ent, error } = await supabase.from('enterprises').insert({
        enterprise_id: form.enterpriseId,
        name: form.name,
        pda_address: pdaAddress ?? null,
        admin_authority: form.adminAuthority,
        treasury_authority: form.treasuryAuthority,
        settlement_mint: form.settlementMint,
        created_by: profile.id,
        status: 'active',
      }).select().single()

      if (error) throw new Error(error.message)

      await supabase.from('transactions').insert({
        enterprise_id: ent.id,
        action: 'initialize_enterprise',
        signature: tx.signature,
        status: 'confirmed',
        created_by: profile.id,
      })

      toast('success', 'Enterprise initialized!', `ID: ${form.enterpriseId}`, tx.signature)
      onCreated(ent as Enterprise)
    } catch (err: unknown) {
      toast('error', 'Transaction failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">ExBenefits</p>
            <p className="text-xs text-slate-400">Initialize your enterprise</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold mb-1">Setup Enterprise</h2>
          <p className="text-sm text-gray-500 mb-6">
            Creates your on-chain enterprise program account on Solana Devnet.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Enterprise name" placeholder="Acme Corp" value={form.name} onChange={set('name')} required />
            <Input
              label="Admin authority wallet"
              placeholder="Solana public key"
              value={form.adminAuthority}
              onChange={set('adminAuthority')}
              hint="Wallet that controls this enterprise (pre-filled from your profile)"
              required
            />
            <Input
              label="Treasury authority wallet"
              placeholder="Solana public key"
              value={form.treasuryAuthority}
              onChange={set('treasuryAuthority')}
              hint="Wallet authorized to fund positions"
              required
            />
            <Input
              label="Settlement token mint"
              placeholder="SPL token mint address"
              value={form.settlementMint}
              onChange={set('settlementMint')}
              hint="The SPL token used for benefit payouts"
              required
            />
            <Button type="submit" loading={loading} className="w-full justify-center mt-2">
              Initialize on Solana <ArrowRight size={16} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
