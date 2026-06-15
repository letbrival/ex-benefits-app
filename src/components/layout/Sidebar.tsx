import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, TrendingUp, Users, Landmark, Shield, ChevronDown, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Enterprise, Profile } from '../../types'

interface Props {
  enterprise: Enterprise | null
  profile: Profile | null
}

interface Counts {
  plans: number
  positions: number
  beneficiaries: number
  governance: number
}

export function Sidebar({ enterprise, profile }: Props) {
  const [counts, setCounts] = useState<Counts>({ plans: 0, positions: 0, beneficiaries: 0, governance: 0 })

  useEffect(() => {
    if (!enterprise) return
    Promise.all([
      supabase.from('benefit_plans').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterprise.id),
      supabase.from('positions').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterprise.id),
      supabase.from('beneficiaries').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterprise.id),
    ]).then(([plans, positions, bens]) => {
      setCounts({
        plans: plans.count ?? 0,
        positions: positions.count ?? 0,
        beneficiaries: bens.count ?? 0,
        governance: 2,
      })
    })
  }, [enterprise])

  const isAdmin = profile?.role !== 'beneficiary'

  const navItems = isAdmin ? [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', count: 0 },
    { to: '/plans', icon: FileText, label: 'Plans', count: counts.plans },
    { to: '/positions', icon: TrendingUp, label: 'Positions', count: counts.positions },
    { to: '/beneficiaries', icon: Users, label: 'Beneficiaries', count: counts.beneficiaries },
    { to: '/treasury', icon: Landmark, label: 'Treasury', count: 0 },
    { to: '/governance', icon: Shield, label: 'Governance', count: counts.governance },
  ] : [
    { to: '/portal', icon: TrendingUp, label: 'My Benefits', count: 0 },
  ]

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.[0].toUpperCase() ?? '?'

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 bg-[#0f1117] flex flex-col border-r border-white/5">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">Ex</span>
          </div>
          <span className="text-sm font-semibold text-white">ExBenefits</span>
        </div>
      </div>

      {/* Enterprise selector */}
      {enterprise && (
        <div className="mx-3 mb-4 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/8 transition-colors">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{enterprise.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Enterprise · Devnet</p>
            </div>
            <ChevronDown size={12} className="text-slate-500 shrink-0 ml-1" />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, count }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="flex-1 font-medium">{label}</span>
                {count > 0 && (
                  <span className={`text-[11px] font-medium ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                    {count}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-slate-300">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{profile?.full_name ?? profile?.email}</p>
            <p className="text-[10px] text-slate-500 truncate">
              {profile?.role} · {profile?.wallet_address ? profile.wallet_address.slice(0, 4) + '…' + profile.wallet_address.slice(-4) : 'no wallet'}
            </p>
          </div>
          <button onClick={signOut} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-slate-500 hover:text-slate-300">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
