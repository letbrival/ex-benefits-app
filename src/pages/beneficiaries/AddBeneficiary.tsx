import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { BENEFICIARY_TYPE_LABELS } from '../../types'
import type { Enterprise, Profile } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile }

export default function AddBeneficiary({ enterprise, profile }: Props) {
  const nav = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    beneficiaryType: '0',
    walletAddress: '',
    walletType: 'external' as 'external' | 'managed',
  })
  const [devKeypair, setDevKeypair] = useState<number[] | null>(null)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function generateWallet() {
    setGenLoading(true)
    try {
      const w = await api.generateWallet()
      setForm(f => ({ ...f, walletAddress: w.publicKey, walletType: 'managed' }))
      setDevKeypair(w.keypairJson)
      toast('info', 'Dev wallet generated', 'Save the keypair JSON shown below!')
    } catch (err: unknown) {
      toast('error', 'Failed to generate wallet', err instanceof Error ? err.message : '')
    } finally { setGenLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('beneficiaries').insert({
        enterprise_id: enterprise.id,
        full_name: form.fullName,
        email: form.email || null,
        beneficiary_type: parseInt(form.beneficiaryType),
        wallet_address: form.walletAddress,
        wallet_type: form.walletType,
      })
      if (error) throw new Error(error.message)
      toast('success', 'Beneficiary added!', form.fullName)
      nav('/beneficiaries')
    } catch (err: unknown) {
      toast('error', 'Failed to add beneficiary', err instanceof Error ? err.message : '')
    } finally { setLoading(false) }
  }

  return (
    <Layout enterprise={enterprise} profile={profile} header={
      <PageHeader
        title="Add Beneficiary"
        subtitle="Add an employee, client, partner or contractor"
        action={<Button variant="ghost" size="sm" onClick={() => nav('/beneficiaries')}><ArrowLeft size={14} /> Back</Button>}
      />
    }>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Personal details</h3>
          <div className="space-y-4">
            <Input label="Full name" placeholder="Jane Doe" value={form.fullName} onChange={set('fullName')} required />
            <Input label="Email" type="email" placeholder="jane@company.com" value={form.email} onChange={set('email')} />
            <Select label="Beneficiary type" value={form.beneficiaryType} onChange={set('beneficiaryType')}>
              {([0, 1, 2, 3, 4] as const).map(t => (
                <option key={t} value={t}>{BENEFICIARY_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Wallet</h3>
          <div className="space-y-3">
            <Input
              label="Wallet address"
              placeholder="Solana public key (base58)"
              value={form.walletAddress}
              onChange={set('walletAddress')}
              required
            />
            <Button type="button" variant="secondary" size="sm" loading={genLoading} onClick={generateWallet}>
              <Zap size={14} /> Generate dev wallet
            </Button>
            {devKeypair && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">Save this keypair now — it cannot be recovered later.</p>
                </div>
                <div className="bg-white rounded p-2 border border-amber-200 max-h-20 overflow-y-auto">
                  <code className="text-xs text-gray-600 break-all">{JSON.stringify(devKeypair)}</code>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(devKeypair))}
                  className="mt-2 text-xs text-violet-600 hover:underline cursor-pointer"
                >
                  Copy keypair JSON
                </button>
              </div>
            )}
          </div>
        </Card>

        <Button type="submit" loading={loading} className="w-full justify-center">
          Add beneficiary
        </Button>
      </form>
    </Layout>
  )
}
