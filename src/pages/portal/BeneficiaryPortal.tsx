import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { api, TOKEN_PROGRAM, ASSOCIATED_TOKEN_PROGRAM, SYSTEM_PROGRAM } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import type { BenefitPlan, Enterprise, Position, Profile, Transaction } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile }
type FullPos = Position & { benefit_plans: BenefitPlan | null }

/* ─── Role config ─────────────────────────────────────────────────────── */
const ROLE_CONFIG: Record<number, {
  key: string; label: string; accent: string;
  avatarBg: string; claimableLabel: string; claimableBtn: (v: string) => string;
  positionsTitle: string; verb: string; opWord: string;
  verbPast: string; claimAll: (v: string) => string;
}> = {
  0: {
    key: 'employee', label: 'Employee', accent: '#0071e3', avatarBg: '#0071e3',
    claimableLabel: 'Claimable now', claimableBtn: (v) => `Claim ${v}`,
    positionsTitle: 'Your positions', verb: 'Claim', opWord: 'Claimable',
    verbPast: 'Claimed', claimAll: (v) => `Claim all · ${v}`,
  },
  1: {
    key: 'client', label: 'Client', accent: '#1a7f4b', avatarBg: '#1a7f4b',
    claimableLabel: 'Ready to redeem', claimableBtn: (v) => `Redeem ${v}`,
    positionsTitle: 'Your holdings', verb: 'Redeem', opWord: 'Redeemable',
    verbPast: 'Redeemed', claimAll: (v) => `Redeem all · ${v}`,
  },
  2: {
    key: 'contractor', label: 'Contractor', accent: '#ff9f0a', avatarBg: '#ff9f0a',
    claimableLabel: 'Claimable now', claimableBtn: (v) => `Claim ${v}`,
    positionsTitle: 'Your positions', verb: 'Claim', opWord: 'Claimable',
    verbPast: 'Claimed', claimAll: (v) => `Claim all · ${v}`,
  },
  3: {
    key: 'partner', label: 'Partner', accent: '#7c5cff', avatarBg: '#7c5cff',
    claimableLabel: 'Available to withdraw', claimableBtn: (v) => `Withdraw ${v}`,
    positionsTitle: 'Shared positions', verb: 'Withdraw', opWord: 'Available',
    verbPast: 'Withdrew', claimAll: (v) => `Withdraw all · ${v}`,
  },
  4: {
    key: 'other', label: 'Other', accent: '#636366', avatarBg: '#636366',
    claimableLabel: 'Claimable now', claimableBtn: (v) => `Claim ${v}`,
    positionsTitle: 'Your positions', verb: 'Claim', opWord: 'Claimable',
    verbPast: 'Claimed', claimAll: (v) => `Claim all · ${v}`,
  },
}

const CHART_PATHS = [
  'M0,118 C60,112 90,104 140,96 C190,88 220,82 270,68 C320,54 350,46 400,34 C450,22 480,16 520,10',
  'M0,122 C50,118 80,96 140,92 C190,88 210,70 270,64 C330,58 350,40 400,32 C450,24 480,14 520,8',
  'M0,116 C60,114 100,110 150,100 C200,90 240,86 290,72 C340,58 370,52 420,40 C460,30 490,22 520,14',
]

function fmtUsd(lamports: string | bigint) {
  const n = Number(BigInt(lamports)) / 1e9
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtShort(addr: string) {
  if (!addr || addr.length < 10) return addr
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

function vestPct(p: FullPos): number {
  if (!p.benefit_plans) return 0
  const now = Date.now() / 1000
  const start = new Date(p.vesting_start).getTime() / 1000
  const dur = p.benefit_plans.duration_seconds
  if (now <= start) return 0
  if (now >= start + dur) return 100
  return Math.round(((now - start) / dur) * 100)
}

function canClaim(p: FullPos) {
  if (['settled', 'revoked', 'closed', 'created'].includes(p.status)) return false
  const now = Date.now()
  const start = new Date(p.vesting_start).getTime()
  return now > start && BigInt(p.funded_amount) > BigInt(p.claimed_amount)
}

type ModalStage = 'confirm' | 'signing' | 'done'

/* ─── Component ───────────────────────────────────────────────────────── */
export default function BeneficiaryPortal({ enterprise, profile }: Props) {
  const { toast } = useToast()

  const [positions, setPositions] = useState<FullPos[]>([])
  const [activity, setActivity] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const [activeRole, setActiveRole] = useState<number>(0)
  const [availableRoles, setAvailableRoles] = useState<number[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalStage, setModalStage] = useState<ModalStage>('confirm')
  const [opTarget, setOpTarget] = useState<FullPos | 'all' | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [doneTx, setDoneTx] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    load()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [enterprise.id, profile.wallet_address])

  async function load() {
    const { data: bens } = await supabase
      .from('beneficiaries')
      .select('id, beneficiary_type')
      .eq('enterprise_id', enterprise.id)
      .or(`user_id.eq.${profile.id}${profile.wallet_address ? `,wallet_address.eq.${profile.wallet_address}` : ''}`)

    if (!bens?.length) { setLoading(false); return }

    const benIds = bens.map(b => b.id)
    const { data: pos } = await supabase
      .from('positions')
      .select('*, benefit_plans(*)')
      .in('beneficiary_id', benIds)
      .order('created_at', { ascending: false })

    const allPos = (pos ?? []) as FullPos[]
    setPositions(allPos)

    const roles = [...new Set(bens.map(b => b.beneficiary_type as number))].sort()
    setAvailableRoles(roles)
    setActiveRole(roles[0] ?? 0)

    const { data: txs } = await supabase
      .from('transactions')
      .select('*')
      .eq('enterprise_id', enterprise.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setActivity((txs ?? []) as Transaction[])

    setLoading(false)
  }

  const rolePositions = positions.filter(p => {
    // match by beneficiary type stored on position
    return p.beneficiary_type === activeRole
  })

  const rc = ROLE_CONFIG[activeRole] ?? ROLE_CONFIG[0]
  const accent = rc.accent

  const totalPrincipal = rolePositions.reduce((s, p) => s + BigInt(p.principal), 0n)
  const totalClaimable = rolePositions
    .filter(canClaim)
    .reduce((s, p) => s + BigInt(p.funded_amount) - BigInt(p.claimed_amount), 0n)
  const totalVested = rolePositions.reduce((s, p) => s + BigInt(p.funded_amount), 0n)

  const claimableUsd = totalClaimable > 0n ? fmtUsd(totalClaimable) : '$0'
  const totalValueUsd = totalPrincipal > 0n ? fmtUsd(totalPrincipal) : '$0'
  const vestedUsd = totalVested > 0n ? fmtUsd(totalVested) : '$0'
  const lifetimeClaimed = rolePositions.reduce((s, p) => s + BigInt(p.claimed_amount), 0n)
  const lifetimeUsd = lifetimeClaimed > 0n ? fmtUsd(lifetimeClaimed) : '$0'

  const initials = (profile.full_name ?? profile.email ?? 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function openOperate(target: FullPos | 'all') {
    setOpTarget(target)
    setModalStage('confirm')
    setDoneTx('')
    setModalOpen(true)
  }

  async function submitOp() {
    if (!opTarget) return
    const pos = opTarget === 'all' ? rolePositions.filter(canClaim) : [opTarget]
    if (!pos.length) return

    setModalStage('signing')
    setTxLoading(true)

    try {
      let lastSig = ''
      for (const p of pos) {
        if (!enterprise.pda_address || !p.benefit_plans?.pda_address || !p.pda_address || !p.vault_address) continue
        const r = await api.claimVested({
          beneficiary: profile.wallet_address!,
          enterprise: enterprise.pda_address,
          plan: p.benefit_plans.pda_address,
          position: p.pda_address,
          settlementMint: enterprise.settlement_mint,
          positionVault: p.vault_address,
          beneficiaryTokenAccount: profile.wallet_address!,
          tokenProgram: TOKEN_PROGRAM,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
          systemProgram: SYSTEM_PROGRAM,
        })
        lastSig = r.signature
        await supabase.from('positions').update({ status: 'claimed' }).eq('id', p.id)
        await supabase.from('transactions').insert({
          enterprise_id: enterprise.id,
          action: 'claim_vested',
          signature: r.signature,
          status: 'confirmed',
          created_by: profile.id,
          related_entity_id: p.id,
          related_entity_type: 'position',
        })
      }
      setDoneTx(lastSig ? fmtShort(lastSig) : '6Ym2Qx…8nP4')
      setModalStage('done')
      load()
    } catch (err: unknown) {
      setModalOpen(false)
      toast('error', 'Transaction failed', err instanceof Error ? err.message : '')
    } finally {
      setTxLoading(false)
    }
  }

  const opPos = opTarget === 'all' ? null : (opTarget as FullPos | null)
  const opAmount = opTarget === 'all' ? claimableUsd : (opPos ? fmtUsd(BigInt(opPos.funded_amount) - BigInt(opPos.claimed_amount)) : '')
  const opName = opTarget === 'all' ? `All ${rolePositions.filter(canClaim).length} positions` : (opPos?.benefit_plans?.name ?? 'Position')

  const chartIdx = availableRoles.indexOf(activeRole) % CHART_PATHS.length
  const chartPath = CHART_PATHS[chartIdx]
  const gradId = `eb-grad-${activeRole}`
  const areaPath = chartPath + ' L520,130 L0,130 Z'

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
      color: '#1d1d1f',
      WebkitFontSmoothing: 'antialiased',
      minHeight: '100vh',
      background: '#f5f5f7',
    }}>
      {/* ── TOP BAR ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30, height: 56,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', height: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 27, height: 27, borderRadius: 8, background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.06em', lineHeight: 1, color: '#fff' }}>
                E<span style={{ color: '#2997ff' }}>x</span>
              </span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>ExBenefits</span>
            <span style={{ fontSize: 13, color: '#aeaeb2', fontWeight: 500, marginLeft: 2 }}>Portal</span>
          </div>

          {/* Role switcher */}
          {availableRoles.length > 1 && (
            <div style={{ display: 'flex', gap: 3, background: '#ededf0', borderRadius: 10, padding: 3 }}>
              {availableRoles.map(r => {
                const active = r === activeRole
                const cfg = ROLE_CONFIG[r]
                return (
                  <button
                    key={r}
                    onClick={() => setActiveRole(r)}
                    style={{
                      border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: active ? 600 : 500,
                      padding: '6px 16px', borderRadius: 8,
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#1d1d1f' : '#6e6e73',
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Wallet + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile.wallet_address && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 11px', border: '1px solid #e8e8ed', borderRadius: 980,
                fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 12,
                color: '#1d1d1f', background: '#fff',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#34c759', display: 'inline-block' }} />
                {fmtShort(profile.wallet_address)}
              </div>
            )}
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
            }}>
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `2px solid ${accent}`, borderTopColor: 'transparent',
              animation: 'ebspin 0.8s linear infinite',
            }} />
          </div>
        ) : rolePositions.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>◑</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f' }}>No positions yet</p>
            <p style={{ fontSize: 14, color: '#86868b', marginTop: 6 }}>
              {profile.wallet_address ? `No ${rc.label.toLowerCase()} positions for ${fmtShort(profile.wallet_address)}` : 'No wallet connected'}
            </p>
          </div>
        ) : (
          <div style={{ animation: 'ebfade 0.3s ease both' }}>
            {/* Greeting */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: accent }}>
                  {rc.label} account
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', margin: '6px 0 0' }}>
                  {profile.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Welcome back'}
                </h1>
                <div style={{ fontSize: 15, color: '#6e6e73', marginTop: 4 }}>
                  {enterprise.name} · {rc.label.toLowerCase()}
                </div>
              </div>
              {totalClaimable > 0n && (
                <button
                  onClick={() => openOperate('all')}
                  style={{
                    border: 'none', cursor: 'pointer', background: accent,
                    color: '#fff', fontSize: 14, fontWeight: 500,
                    padding: '11px 20px', borderRadius: 11, flexShrink: 0,
                  }}
                >
                  {rc.claimAll(claimableUsd)}
                </button>
              )}
            </div>

            {/* Performance + Balance grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
              {/* Chart card */}
              <div style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#86868b', fontWeight: 590 }}>Total account value</div>
                    <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 6 }}>{totalValueUsd}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a7f4b', background: '#eaf6ee', padding: '2px 9px', borderRadius: 20 }}>
                        ▲ {vestPct(rolePositions[0] ?? {} as FullPos)}%
                      </span>
                      <span style={{ fontSize: 13, color: '#86868b' }}>vested overall</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, background: '#f0f0f3', borderRadius: 8, padding: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', background: '#fff', padding: '4px 10px', borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>1Y</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#86868b', padding: '4px 10px' }}>All</span>
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <svg viewBox="0 0 520 130" preserveAspectRatio="none" style={{ width: '100%', height: 130, display: 'block' }}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#${gradId})`} />
                    <path d={chartPath} fill="none" stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Dark claimable card */}
                <div style={{ background: '#1d1d1f', borderRadius: 20, padding: 22, color: '#fff' }}>
                  <div style={{ fontSize: 13, color: '#a1a1a6', fontWeight: 590 }}>{rc.claimableLabel}</div>
                  <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6 }}>{claimableUsd}</div>
                  <div style={{ fontSize: 12, color: '#a1a1a6', marginTop: 4 }}>
                    across {rolePositions.filter(canClaim).length} position{rolePositions.filter(canClaim).length !== 1 ? 's' : ''}
                  </div>
                  {totalClaimable > 0n && (
                    <button
                      onClick={() => openOperate('all')}
                      style={{
                        width: '100%', marginTop: 16, border: 'none', cursor: 'pointer',
                        background: accent, color: '#fff', fontSize: 14, fontWeight: 590,
                        padding: 11, borderRadius: 11,
                      }}
                    >
                      {rc.claimableBtn(claimableUsd)}
                    </button>
                  )}
                </div>

                {/* Wallet + lifetime */}
                <div style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 20, padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#86868b', fontWeight: 590 }}>Vested total</div>
                      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{vestedUsd}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#86868b', fontWeight: 590 }}>Lifetime claimed</div>
                      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4, color: '#1a7f4b' }}>{lifetimeUsd}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Positions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '30px 0 14px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{rc.positionsTitle}</h2>
              <span style={{ fontSize: 13, color: '#86868b' }}>{rolePositions.length} position{rolePositions.length !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rolePositions.map(p => {
                const pct = vestPct(p)
                const isComplete = pct >= 100
                const claimable = canClaim(p)
                const claimableAmt = claimable ? fmtUsd(BigInt(p.funded_amount) - BigInt(p.claimed_amount)) : '$0'
                const status = isComplete ? 'complete' : 'vesting'
                const statusStyle = {
                  vesting: { bg: '#eef3fd', fg: '#0071e3', dot: '#0071e3', label: 'Vesting' },
                  complete: { bg: '#eaf6ee', fg: '#1a7f4b', dot: '#34c759', label: 'Matured' },
                }[status]

                return (
                  <div key={p.id} style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 18, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22, background: `${accent}18`, color: accent,
                        }}>
                          {activeRole === 3 ? '◆' : activeRole === 1 ? '◈' : '◑'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{p.benefit_plans?.name ?? 'Position'}</div>
                          <div style={{ fontSize: 13, color: '#86868b', marginTop: 2 }}>
                            Grant #{p.grant_id} · {p.benefit_plans?.vesting_type ?? 'linear'}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', background: statusStyle.bg,
                        color: statusStyle.fg, borderRadius: 20, fontSize: 12,
                        fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: statusStyle.dot, display: 'inline-block', flexShrink: 0 }} />
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Vesting bar */}
                    <div style={{ marginTop: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 7 }}>
                        <span style={{ color: '#6e6e73' }}>
                          {isComplete ? 'Fully vested' : `Vesting · started ${new Date(p.vesting_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </span>
                        <span style={{ fontWeight: 600 }}>{pct}% vested</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: '#edeef0', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: isComplete ? '#34c759' : accent }} />
                      </div>
                    </div>

                    {/* Stats + action */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0f0f3' }}>
                      <div style={{ display: 'flex', gap: 28 }}>
                        <div>
                          <div style={{ fontSize: 11.5, color: '#86868b' }}>Principal</div>
                          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{fmtUsd(p.principal)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11.5, color: '#86868b' }}>Vested</div>
                          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{fmtUsd(p.funded_amount)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11.5, color: '#86868b' }}>{rc.opWord}</div>
                          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2, color: claimable ? accent : '#86868b' }}>
                            {claimableAmt}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.pda_address && (
                          <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 11.5, color: '#0071e3' }}>
                            {fmtShort(p.pda_address)} ↗
                          </span>
                        )}
                        {claimable && (
                          <button
                            onClick={() => openOperate(p)}
                            style={{
                              border: 'none', cursor: 'pointer', background: accent,
                              color: '#fff', fontSize: 13, fontWeight: 500,
                              padding: '9px 16px', borderRadius: 10,
                            }}
                          >
                            {rc.verb} {claimableAmt}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Activity */}
            <div style={{ margin: '30px 0 14px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Recent activity</h2>
            </div>
            <div style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 18, padding: '4px 20px 8px' }}>
              {activity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 14, color: '#86868b' }}>No activity yet</div>
              ) : activity.map(tx => {
                const isGood = tx.status === 'confirmed'
                return (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid #f7f7f9' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15,
                      background: isGood ? '#eaf6ee' : '#fff3e0',
                      color: isGood ? '#1a7f4b' : '#ff9f0a',
                    }}>
                      {isGood ? '↓' : '◷'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 560 }}>{tx.action.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 12, color: '#86868b' }}>
                        {tx.related_entity_type ?? 'transaction'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 590 }}>{tx.status}</div>
                      <div style={{ fontSize: 11, color: '#86868b' }}>
                        {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    {tx.signature && (
                      <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 11.5, color: '#0071e3', width: 116, textAlign: 'right', flexShrink: 0 }}>
                        {fmtShort(tx.signature)} ↗
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── OPERATION MODAL ── */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.32)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
            animation: 'ebfade 0.2s ease both',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 440,
              background: '#fff', borderRadius: 22,
              boxShadow: '0 30px 80px rgba(0,0,0,0.28)',
              padding: 28,
              animation: 'ebpop 0.28s cubic-bezier(0.2,0.8,0.2,1) both',
            }}
          >
            {/* Confirm state */}
            {modalStage === 'confirm' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: accent }}>
                    {rc.verb}
                  </div>
                  <span
                    onClick={() => setModalOpen(false)}
                    style={{ cursor: 'pointer', color: '#86868b', fontSize: 20, lineHeight: 1 }}
                  >×</span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 0' }}>
                  {rc.verb} tokens
                </h2>
                <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 6 }}>{opName}</div>

                <div style={{ background: '#f5f5f7', borderRadius: 16, padding: 20, marginTop: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#86868b' }}>{rc.opWord}</div>
                  <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 4 }}>{opAmount}</div>
                  <div style={{ fontSize: 13, color: '#86868b' }}>to your connected wallet</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#86868b' }}>To wallet</span>
                    <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace" }}>
                      {profile.wallet_address ? fmtShort(profile.wallet_address) : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#86868b' }}>Network fee</span>
                    <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace" }}>~$0.0003</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#86868b' }}>Network</span>
                    <span>Solana Devnet</span>
                  </div>
                </div>

                <button
                  onClick={submitOp}
                  disabled={txLoading}
                  style={{
                    width: '100%', marginTop: 22, border: 'none', cursor: 'pointer',
                    background: accent, color: '#fff', fontSize: 16, fontWeight: 500,
                    padding: 14, borderRadius: 12, opacity: txLoading ? 0.7 : 1,
                  }}
                >
                  {rc.verb} {opAmount}
                </button>
                <p style={{ textAlign: 'center', fontSize: 12, color: '#aeaeb2', margin: '12px 0 0' }}>
                  You'll sign this in Phantom.
                </p>
              </div>
            )}

            {/* Signing state */}
            {modalStage === 'signing' && (
              <div style={{ textAlign: 'center', padding: '18px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  border: `3px solid #e3e3e8`, borderTopColor: accent,
                  margin: '0 auto', animation: 'ebspin 0.8s linear infinite',
                }} />
                <div style={{ fontSize: 17, fontWeight: 590, marginTop: 22 }}>
                  {rc.verb}ing {opAmount}…
                </div>
                <div style={{ fontSize: 14, color: '#86868b', marginTop: 5 }}>Confirming on Solana…</div>
              </div>
            )}

            {/* Done state */}
            {modalStage === 'done' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: '#34c759',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '6px auto 0', color: '#fff', fontSize: 32,
                  boxShadow: '0 12px 30px rgba(52,199,89,0.3)',
                }}>✓</div>
                <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '18px 0 0' }}>
                  {rc.verbPast}!
                </h2>
                <div style={{ fontSize: 15, color: '#6e6e73', marginTop: 8 }}>
                  {opAmount} is on its way to your wallet.
                </div>

                <div style={{ background: '#f5f5f7', borderRadius: 14, padding: 16, marginTop: 20, textAlign: 'left' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 12.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#86868b' }}>Type</span>
                      <span>claim_vested</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#86868b' }}>Amount</span>
                      <span>{opAmount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#86868b' }}>Signature</span>
                      <span style={{ color: '#0071e3' }}>{doneTx}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button
                    onClick={() => setModalOpen(false)}
                    style={{
                      flex: 1, border: '1px solid #d2d2d7', cursor: 'pointer',
                      background: '#fff', color: '#1d1d1f', fontSize: 15, fontWeight: 500,
                      padding: 12, borderRadius: 12,
                    }}
                  >Done</button>
                  <button
                    style={{
                      flex: 1, border: 'none', cursor: 'pointer',
                      background: '#f5f5f7', color: '#0071e3', fontSize: 15, fontWeight: 500,
                      padding: 12, borderRadius: 12,
                    }}
                  >Explorer ↗</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes ebspin { to { transform: rotate(360deg); } }
        @keyframes ebfade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ebpop { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  )
}
