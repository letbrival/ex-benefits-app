import { useState } from 'react'
import { LogOut, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import type { Profile } from '../../types'

interface Props { profile: Profile }

export default function Settings({ profile }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    fullName: profile.full_name ?? '',
    walletAddress: profile.wallet_address ?? '',
  })
  const [loading, setLoading] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.fullName,
      wallet_address: form.walletAddress || null,
    }).eq('id', profile.id)
    if (error) toast('error', 'Save failed', error.message)
    else toast('success', 'Settings saved')
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <Layout enterprise={null} profile={profile} header={
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your profile and wallet</p>
        </div>
      </div>
    }>
      <div className="max-w-lg space-y-4">
        <form onSubmit={save} className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{profile.email}</p>
              </div>
              <Input label="Full name" placeholder="Jane Doe" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 capitalize">{profile.role}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Wallet</h3>
            <div className="space-y-3">
              <Input
                label="Wallet address"
                placeholder="Solana public key"
                value={form.walletAddress}
                onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))}
                hint={profile.wallet_type === 'managed' ? 'Managed (platform-generated) wallet' : 'External wallet (Phantom / Solflare / Backpack)'}
              />
              {profile.wallet_address && (
                <a
                  href={`https://explorer.solana.com/address/${profile.wallet_address}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-violet-600 hover:underline"
                >
                  View on Solana Explorer ↗
                </a>
              )}
            </div>
          </Card>

          <Button type="submit" loading={loading} className="w-full justify-center">
            <Save size={14} /> Save changes
          </Button>
        </form>

        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Account</h3>
          <Button variant="danger" size="sm" onClick={signOut}>
            <LogOut size={14} /> Sign out
          </Button>
        </Card>
      </div>
    </Layout>
  )
}
