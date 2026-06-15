import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'

export default function Signup() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'admin' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, role: form.role } },
    })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✓</span>
        </div>
        <h2 className="text-lg font-semibold mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 mb-4">We sent a confirmation link to {form.email}</p>
        <Link to="/login" className="text-violet-600 text-sm font-medium hover:underline">Back to login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">ExBenefits</p>
            <p className="text-xs text-slate-400">On-chain benefit platform</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create account</h2>
          <p className="text-sm text-gray-500 mb-6">Get started with ExBenefits</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" placeholder="Jane Doe" value={form.fullName} onChange={set('fullName')} required />
            <Input label="Email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
            <Input label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
            <Select label="Role" value={form.role} onChange={set('role')}>
              <option value="admin">Admin (HR / Finance)</option>
              <option value="treasury_manager">Treasury Manager</option>
              <option value="beneficiary">Beneficiary</option>
            </Select>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" loading={loading} className="w-full justify-center">Create account</Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
