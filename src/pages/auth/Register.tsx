import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Role = 'enterprise' | 'employee' | 'partner' | 'client'
type Step = 'role' | 'details' | 'wallet' | 'done'
type WalletStatus = 'idle' | 'manual' | 'connecting' | 'connected'

const ROLES: { id: Role; label: string; icon: string; desc: string }[] = [
  {
    id: 'enterprise',
    label: 'Enterprise',
    icon: '🏢',
    desc: 'HR, finance, or founder — issue plans and govern the treasury.',
  },
  {
    id: 'employee',
    label: 'Employee',
    icon: '👤',
    desc: 'Track your vesting, view positions, and claim to your wallet.',
  },
  {
    id: 'partner',
    label: 'Partner',
    icon: '🤝',
    desc: 'Revenue-share and milestone grants — withdraw on your schedule.',
  },
  {
    id: 'client',
    label: 'Client',
    icon: '💎',
    desc: 'Redeem loyalty rewards and cashback positions.',
  },
]

const WALLETS = [
  { id: 'phantom', name: 'Phantom', color: '#ab9ff2' },
  { id: 'solflare', name: 'Solflare', color: '#f08634' },
  { id: 'backpack', name: 'Backpack', color: '#e33d3d' },
]

function fakeAddr() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  return Array.from({ length: 44 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function fakeTx() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  return Array.from({ length: 88 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function trunc(s: string, head = 4, tail = 4) {
  return s ? `${s.slice(0, head)}…${s.slice(-tail)}` : ''
}

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefillRole = (location.state as { role?: string })?.role as Role | undefined

  const [step, setStep] = useState<Step>(prefillRole ? 'details' : 'role')
  const [role, setRole] = useState<Role | null>(prefillRole ?? null)

  // details form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [detailsLoading, setDetailsLoading] = useState(false)

  // wallet
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('idle')
  const [wallet, setWallet] = useState<string | null>(null)
  const [walletAddr, setWalletAddr] = useState('')
  const [manualAddr, setManualAddr] = useState('')
  const [manualKey, setManualKey] = useState('')

  // done
  const [txSig] = useState(() => fakeTx())
  const [slot] = useState(() => Math.floor(285_440_000 + Math.random() * 10_000))

  // simulate wallet connect
  useEffect(() => {
    if (walletStatus === 'connecting') {
      const t = setTimeout(() => {
        const addr = fakeAddr()
        setWalletAddr(addr)
        setWalletStatus('connected')
      }, 1800)
      return () => clearTimeout(t)
    }
  }, [walletStatus])

  const stepIndex = step === 'details' ? 1 : step === 'wallet' ? 2 : 1
  const progressPct = `${(stepIndex / 3) * 100}%`
  const stepLabel =
    step === 'details' ? 'Your details' : step === 'wallet' ? 'Connect wallet' : ''

  async function handleDetails(e: React.FormEvent) {
    e.preventDefault()
    setDetailsError('')
    if (!name.trim() || !email.trim() || !password.trim()) return
    setDetailsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role,
            company: company || null,
            invite_code: inviteCode || null,
          },
        },
      })
      if (error) throw error
      setStep('wallet')
      window.scrollTo(0, 0)
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : 'Sign-up failed')
    } finally {
      setDetailsLoading(false)
    }
  }

  function connectWallet(id: string) {
    setWallet(id)
    setWalletStatus('connecting')
  }

  function connectManual() {
    if (!manualAddr.trim()) return
    setWallet('manual')
    setWalletStatus('connecting')
  }

  function goBack() {
    if (step === 'wallet') { setStep('details'); setWalletStatus('idle') }
    else if (step === 'details') { setStep('role'); setRole(null) }
  }

  const displayAddr =
    wallet === 'manual' ? manualAddr : walletAddr

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
        color: '#1d1d1f',
        WebkitFontSmoothing: 'antialiased',
        minHeight: '100vh',
        background: '#f5f5f7',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          background: 'rgba(245,245,247,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '0 22px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: '#1d1d1f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '-0.06em',
                color: '#fff',
                lineHeight: 1,
              }}
            >
              E<span style={{ color: '#2997ff' }}>x</span>
            </span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f' }}>
            ExBenefits
          </span>
        </button>
        <span
          onClick={() => navigate('/login')}
          style={{ fontSize: 13, color: '#0071e3', cursor: 'pointer' }}
        >
          Already have an account? Sign in
        </span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 22px 64px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* STEP: role */}
          {step === 'role' && (
            <div>
              <h1
                style={{
                  fontSize: 34,
                  fontWeight: 600,
                  letterSpacing: '-0.025em',
                  margin: '0 0 8px',
                  textAlign: 'center',
                }}
              >
                Create your account
              </h1>
              <p
                style={{
                  fontSize: 17,
                  color: '#6e6e73',
                  textAlign: 'center',
                  margin: '0 0 36px',
                  lineHeight: 1.4,
                }}
              >
                Choose your account type to get started.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setRole(r.id); setStep('details'); window.scrollTo(0, 0) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      background: '#fff',
                      border: '1px solid #d2d2d7',
                      borderRadius: 16,
                      padding: '18px 20px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#0071e3')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#d2d2d7')}
                  >
                    <span style={{ fontSize: 32, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 600 }}>{r.label}</div>
                      <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 3 }}>{r.desc}</div>
                    </div>
                    <span style={{ fontSize: 18, color: '#a1a1a6' }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP: details or wallet */}
          {(step === 'details' || step === 'wallet') && (
            <div>
              {/* Progress header */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '18px 20px',
                  marginBottom: 24,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{stepLabel}</span>
                  <span style={{ fontSize: 12, color: '#86868b' }}>Step {stepIndex} of 3</span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: '#f0f0f0',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: progressPct,
                      background: '#0071e3',
                      borderRadius: 2,
                      transition: 'width 0.4s',
                    }}
                  />
                </div>
              </div>

              {/* DETAILS FORM */}
              {step === 'details' && (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: '28px 28px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <h2
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      margin: '0 0 6px',
                    }}
                  >
                    {role ? ROLES.find(r => r.id === role)!.label : ''} account
                  </h2>
                  <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 24px' }}>
                    Tell us a bit about yourself.
                  </p>

                  <form onSubmit={handleDetails} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Field label="Full name">
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Jane Smith"
                        required
                        style={inputStyle}
                      />
                    </Field>

                    {role === 'enterprise' && (
                      <Field label="Company name">
                        <input
                          value={company}
                          onChange={e => setCompany(e.target.value)}
                          placeholder="Acme Corp"
                          style={inputStyle}
                        />
                      </Field>
                    )}

                    <Field label="Email">
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Password">
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        style={inputStyle}
                      />
                    </Field>

                    {role !== 'enterprise' && (
                      <Field label="Invite code (optional)">
                        <input
                          value={inviteCode}
                          onChange={e => setInviteCode(e.target.value)}
                          placeholder="Provided by your enterprise"
                          style={inputStyle}
                        />
                      </Field>
                    )}

                    {detailsError && (
                      <p
                        style={{
                          fontSize: 13,
                          color: '#ff3b30',
                          background: '#fff2f0',
                          padding: '10px 14px',
                          borderRadius: 10,
                          margin: 0,
                        }}
                      >
                        {detailsError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={detailsLoading}
                      style={{
                        marginTop: 4,
                        border: 'none',
                        cursor: detailsLoading ? 'default' : 'pointer',
                        background: '#0071e3',
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 500,
                        padding: '14px',
                        borderRadius: 12,
                        opacity: detailsLoading ? 0.7 : 1,
                      }}
                    >
                      {detailsLoading ? 'Creating account…' : 'Continue'}
                    </button>
                  </form>
                </div>
              )}

              {/* WALLET STEP */}
              {step === 'wallet' && (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: '28px 28px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <h2
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      margin: '0 0 6px',
                    }}
                  >
                    Connect your wallet
                  </h2>
                  <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 24px' }}>
                    Link a Solana wallet to sign transactions and receive benefits.
                  </p>

                  {walletStatus === 'idle' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {WALLETS.map(w => (
                          <button
                            key={w.id}
                            onClick={() => connectWallet(w.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16,
                              background: '#f5f5f7',
                              border: '1px solid transparent',
                              borderRadius: 14,
                              padding: '14px 18px',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = '#0071e3')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: w.color,
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 16, fontWeight: 600 }}>{w.name}</div>
                              <div style={{ fontSize: 13, color: '#86868b' }}>
                                Browser extension wallet
                              </div>
                            </div>
                            <span style={{ fontSize: 16, color: '#a1a1a6' }}>›</span>
                          </button>
                        ))}

                        {/* Manual entry */}
                        <button
                          onClick={() => setWalletStatus('manual')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            background: '#f5f5f7',
                            border: '1px solid transparent',
                            borderRadius: 14,
                            padding: '14px 18px',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = '#0071e3')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: '#e5e5ea',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: 18,
                            }}
                          >
                            ⌨️
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>Add wallet manually</div>
                            <div style={{ fontSize: 13, color: '#86868b' }}>
                              Import with address &amp; secret key
                            </div>
                          </div>
                          <span style={{ fontSize: 16, color: '#a1a1a6' }}>›</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Manual form */}
                  {walletStatus === 'manual' && (
                    <div>
                      <div
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fbbf24',
                          borderRadius: 12,
                          padding: '12px 14px',
                          marginBottom: 20,
                          fontSize: 13,
                          color: '#92400e',
                          lineHeight: 1.5,
                        }}
                      >
                        ⚠️ <strong>Security notice:</strong> Never share your private key on
                        mainnet. This import is for Devnet testing only. Real wallets will never
                        ask for your secret key.
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <Field label="Wallet address">
                          <input
                            value={manualAddr}
                            onChange={e => setManualAddr(e.target.value)}
                            placeholder="e.g. 7Hx9aE3kPq2mVn8sLd4tRfYbWcXuZ1gH5jKpN6vQm4Qe"
                            style={{ ...inputStyle, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 13 }}
                          />
                        </Field>
                        <Field label="Secret key (Devnet only)">
                          <input
                            type="password"
                            value={manualKey}
                            onChange={e => setManualKey(e.target.value)}
                            placeholder="Paste your private key"
                            style={{ ...inputStyle, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 13 }}
                          />
                        </Field>
                      </div>

                      <button
                        onClick={connectManual}
                        disabled={!manualAddr.trim()}
                        style={{
                          width: '100%',
                          marginTop: 18,
                          border: 'none',
                          cursor: manualAddr.trim() ? 'pointer' : 'default',
                          background: manualAddr.trim() ? '#0071e3' : '#b0c8e8',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 500,
                          padding: 14,
                          borderRadius: 12,
                        }}
                      >
                        Import wallet
                      </button>

                      <button
                        onClick={() => setWalletStatus('idle')}
                        style={{
                          width: '100%',
                          marginTop: 10,
                          border: 'none',
                          cursor: 'pointer',
                          background: 'none',
                          color: '#6e6e73',
                          fontSize: 14,
                          padding: '10px',
                        }}
                      >
                        ← Back to wallets
                      </button>
                    </div>
                  )}

                  {/* Connecting */}
                  {walletStatus === 'connecting' && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          border: '3px solid #e5e5ea',
                          borderTopColor: '#0071e3',
                          borderRadius: '50%',
                          animation: 'ebspin 0.8s linear infinite',
                          margin: '0 auto 16px',
                        }}
                      />
                      <div style={{ fontSize: 16, fontWeight: 600 }}>Connecting wallet…</div>
                      <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 6 }}>
                        Approve the connection in {wallet === 'manual' ? 'the import dialog' : `your ${wallet} wallet`}.
                      </div>
                    </div>
                  )}

                  {/* Connected */}
                  {walletStatus === 'connected' && (
                    <div>
                      <div
                        style={{
                          background: '#f0faf4',
                          border: '1px solid #86efac',
                          borderRadius: 14,
                          padding: '18px 20px',
                          marginBottom: 20,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                        }}
                      >
                        <div style={{ fontSize: 24, flexShrink: 0 }}>✅</div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#16a34a' }}>
                            {wallet === 'manual' ? 'Imported wallet connected' : `${wallet} connected`}
                          </div>
                          <div
                            style={{
                              fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                              fontSize: 12,
                              color: '#6e6e73',
                              marginTop: 3,
                            }}
                          >
                            {trunc(displayAddr, 6, 6)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => { setStep('done'); window.scrollTo(0, 0) }}
                        style={{
                          width: '100%',
                          border: 'none',
                          cursor: 'pointer',
                          background: '#0071e3',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 500,
                          padding: 14,
                          borderRadius: 12,
                        }}
                      >
                        {role === 'enterprise' ? 'Create organization →' : 'Go to my portal →'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Back button */}
              {walletStatus !== 'connecting' && walletStatus !== 'connected' && (
                <button
                  onClick={goBack}
                  style={{
                    display: 'block',
                    marginTop: 16,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6e6e73',
                    fontSize: 14,
                    padding: '8px 0',
                  }}
                >
                  ← Back
                </button>
              )}
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', animation: 'ebrise 0.4s ease' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  background: '#f0faf4',
                  border: '2px solid #86efac',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  margin: '0 auto 24px',
                }}
              >
                ✅
              </div>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  letterSpacing: '-0.025em',
                  margin: '0 0 8px',
                }}
              >
                You're in.
              </h1>
              <p style={{ fontSize: 17, color: '#6e6e73', margin: '0 0 32px', lineHeight: 1.4 }}>
                Your account is live on Solana Devnet.
              </p>

              {/* TX receipt */}
              <div
                style={{
                  background: '#1d1d1f',
                  borderRadius: 18,
                  padding: '22px 24px',
                  textAlign: 'left',
                  marginBottom: 28,
                  color: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#30d158',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#30d158',
                    }}
                  >
                    Transaction confirmed
                  </span>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 16 }} />

                {[
                  { label: 'Instruction', val: 'createUserAccount' },
                  { label: 'Role', val: role! },
                  { label: 'Network', val: 'Solana Devnet' },
                  { label: 'Slot', val: slot.toLocaleString() },
                ].map(r => (
                  <div
                    key={r.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                      fontSize: 14,
                    }}
                  >
                    <span style={{ color: '#a1a1a6' }}>{r.label}</span>
                    <span
                      style={{
                        fontFamily: r.label === 'Instruction' || r.label === 'Slot'
                          ? "ui-monospace,'SF Mono',Menlo,monospace"
                          : 'inherit',
                        color: '#f5f5f7',
                        fontWeight: 500,
                        textTransform: r.label === 'Role' ? 'capitalize' : 'none',
                      }}
                    >
                      {r.val}
                    </span>
                  </div>
                ))}

                <div style={{ marginTop: 6, fontSize: 13, color: '#a1a1a6' }}>
                  Transaction signature
                </div>
                <div
                  style={{
                    fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                    fontSize: 12,
                    color: '#6e6e73',
                    marginTop: 4,
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                  }}
                >
                  {txSig}
                </div>
                <div style={{ marginTop: 12 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#2997ff',
                      cursor: 'pointer',
                    }}
                  >
                    View on Solana Explorer ›
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate(role === 'enterprise' ? '/dashboard' : '/portal')}
                style={{
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#0071e3',
                  color: '#fff',
                  fontSize: 17,
                  fontWeight: 500,
                  padding: '15px',
                  borderRadius: 14,
                  marginBottom: 12,
                }}
              >
                {role === 'enterprise' ? 'Go to dashboard →' : 'Go to my portal →'}
              </button>

              <button
                onClick={() => navigate('/')}
                style={{
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'none',
                  color: '#6e6e73',
                  fontSize: 15,
                  padding: '10px',
                }}
              >
                Back to home
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ebspin { to { transform: rotate(360deg); } }
        @keyframes ebrise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 500,
          color: '#1d1d1f',
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid #d2d2d7',
  borderRadius: 10,
  fontSize: 15,
  color: '#1d1d1f',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
}
