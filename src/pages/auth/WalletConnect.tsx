import { useState } from 'react'
import { Wallet, Zap, AlertTriangle, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import type { Profile } from '../../types'

interface Props { profile: Profile }

export default function WalletConnect({ profile }: Props) {
  const { toast } = useToast()
  const [walletAddress, setWalletAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [devWallet, setDevWallet] = useState<{ publicKey: string; keypairJson: number[] } | null>(null)
  const [copied, setCopied] = useState(false)

  async function generateDevWallet() {
    setGenLoading(true)
    try {
      const w = await api.generateWallet()
      setDevWallet(w)
      setWalletAddress(w.publicKey)
      toast('info', 'Dev wallet generated', 'Save the keypair JSON — it cannot be recovered!')
    } catch (err: unknown) {
      toast('error', 'Failed to generate wallet', err instanceof Error ? err.message : '')
    } finally {
      setGenLoading(false) }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!walletAddress.trim()) return
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      wallet_address: walletAddress.trim(),
      wallet_type: devWallet ? 'managed' : 'external',
    }).eq('id', profile.id)
    if (error) {
      toast('error', 'Failed to save wallet', error.message)
    } else {
      toast('success', 'Wallet connected!')
      window.location.reload()
    }
    setLoading(false)
  }

  function copyKeypair() {
    if (!devWallet) return
    navigator.clipboard.writeText(JSON.stringify(devWallet.keypairJson))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Connect Wallet</p>
            <p className="text-xs text-slate-400">Link your Solana wallet to get started</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <p className="text-sm text-gray-500 mb-6">
            Connect an external Solana wallet (Phantom, Solflare, Backpack) by pasting its public key, or generate a dev wallet for testing.
          </p>

          {devWallet && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">Save your keypair JSON — this is the only time it's shown.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-200 mb-2 max-h-24 overflow-y-auto">
                <code className="text-xs text-gray-600 break-all">{JSON.stringify(devWallet.keypairJson)}</code>
              </div>
              <Button variant="secondary" size="sm" onClick={copyKeypair} className="w-full justify-center">
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy keypair JSON</>}
              </Button>
            </div>
          )}

          <form onSubmit={handleConnect} className="space-y-4">
            <Input
              label="Solana wallet address"
              placeholder="Base58 public key"
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value)}
              hint="Paste a Solana public key (44 chars, base58)"
            />
            <Button type="submit" loading={loading} className="w-full justify-center" disabled={!walletAddress.trim()}>
              <Wallet size={16} /> Connect wallet
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">or</p>
            <Button variant="secondary" className="w-full justify-center" loading={genLoading} onClick={generateDevWallet}>
              <Zap size={14} /> Generate dev wallet (Devnet only)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
