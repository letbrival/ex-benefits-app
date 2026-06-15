import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
        color: '#1d1d1f',
        WebkitFontSmoothing: 'antialiased',
        minHeight: '100vh',
        background: '#fff',
      }}
    >
      {/* NAV */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          background: 'rgba(255,255,255,0.72)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: '0 auto',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: '#1d1d1f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '-0.06em',
                  lineHeight: 1,
                  color: '#fff',
                }}
              >
                E<span style={{ color: '#2997ff' }}>x</span>
              </span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
              ExBenefits
            </span>
          </div>

          <nav style={{ display: 'flex', gap: 34, fontSize: 13, color: '#1d1d1f' }}>
            {['Platform', 'Plans', 'Treasury', 'On-chain', 'Docs'].map(item => (
              <span key={item} style={{ opacity: 0.85, cursor: 'pointer' }}>
                {item}
              </span>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span
              onClick={() => navigate('/login')}
              style={{ fontSize: 13, color: '#1d1d1f', cursor: 'pointer', opacity: 0.85 }}
            >
              Sign in
            </span>
            <button
              onClick={() => navigate('/register')}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: '#0071e3',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                padding: '7px 15px',
                borderRadius: 980,
              }}
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: '#fff', padding: '80px 22px 0', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{ fontSize: 19, fontWeight: 600, color: '#0071e3', letterSpacing: '-0.01em' }}
          >
            ExBenefits
          </div>
          <h1
            style={{
              fontSize: 68,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: '-0.035em',
              margin: '8px 0 0',
            }}
          >
            Benefits, settled
            <br />
            on-chain.
          </h1>
          <p
            style={{
              fontSize: 24,
              lineHeight: 1.4,
              fontWeight: 400,
              color: '#6e6e73',
              margin: '22px auto 0',
              maxWidth: 620,
            }}
          >
            Issue equity-lite grants, loyalty, and revenue-share as programmable positions —
            funded from a transparent treasury, vested by code, claimable by the people who earned
            them.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 26,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 30,
            }}
          >
            <button
              onClick={() => navigate('/register')}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: '#0071e3',
                color: '#fff',
                fontSize: 17,
                fontWeight: 500,
                padding: '13px 28px',
                borderRadius: 980,
              }}
            >
              Get started
            </button>
            <span style={{ fontSize: 17, color: '#0071e3', cursor: 'pointer' }}>
              See how it works&nbsp;›
            </span>
          </div>
        </div>

        {/* Hero visual */}
        <div
          style={{
            position: 'relative',
            maxWidth: 980,
            margin: '56px auto 0',
            height: 430,
          }}
        >
          {/* Treasury card */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 36,
              transform: 'translateX(-58%) rotate(-5deg)',
              width: 340,
              background: '#1d1d1f',
              borderRadius: 22,
              padding: 24,
              boxShadow: '0 30px 70px rgba(0,0,0,0.18)',
              color: '#fff',
              animation: 'ebfloat 5s ease-in-out infinite',
            }}
          >
            <div style={{ fontSize: 12, color: '#a1a1a6', fontWeight: 590 }}>Treasury balance</div>
            <div
              style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}
            >
              $1.71M{' '}
              <span style={{ fontSize: 14, color: '#a1a1a6', fontWeight: 500 }}>USDC</span>
            </div>
            <div
              style={{
                fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                fontSize: 12,
                color: '#a1a1a6',
                marginTop: 6,
              }}
            >
              authority 4kPq…8sNd
            </div>
            <div
              style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '18px 0' }}
            />
            {[
              { label: 'Vesting reserves', val: '$980k', pct: '57%' },
              { label: 'Unallocated', val: '$730k', pct: '43%' },
            ].map(r => (
              <div
                key={r.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, color: '#a1a1a6' }}>{r.label}</span>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>
                  {r.val}{' '}
                  <span style={{ color: '#a1a1a6', fontWeight: 400 }}>{r.pct}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Position card */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 60,
              transform: 'translateX(6%) rotate(4deg)',
              width: 300,
              background: '#fff',
              borderRadius: 18,
              padding: '20px 22px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
              animation: 'ebfloat 6s ease-in-out infinite 1s',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: '#6e6e73' }}>Position</div>
                <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>
                  Seed Grant · USDC
                </div>
              </div>
              <span
                style={{
                  background: '#e8f5e9',
                  color: '#2e7d32',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                VESTING
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
              $24,000
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
              $8,000 vested · $4,200 claimable
            </div>
            <div
              style={{
                marginTop: 14,
                height: 6,
                background: '#f0f0f0',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{ width: '35%', height: '100%', background: '#0071e3', borderRadius: 3 }}
              />
            </div>
            <div
              style={{
                fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                fontSize: 11,
                color: '#a1a1a6',
                marginTop: 10,
              }}
            >
              tx 3HzK…9mFp
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: '#f5f5f7', padding: '64px 22px' }}>
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            gap: 0,
          }}
        >
          {[
            { val: '$24M+', label: 'Benefits issued on-chain' },
            { val: '3,400+', label: 'Positions active' },
            { val: '180+', label: 'Enterprises onboarded' },
            { val: '99.9%', label: 'Uptime on Solana' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0 30px',
                borderLeft: i > 0 ? '1px solid #d2d2d7' : 'none',
              }}
            >
              <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em' }}>
                {s.val}
              </div>
              <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AUDIENCES */}
      <section style={{ background: '#fff', padding: '96px 22px' }}>
        <div style={{ maxWidth: 1024, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              textAlign: 'center',
              margin: '0 0 16px',
            }}
          >
            Built for every stakeholder.
          </h2>
          <p
            style={{
              fontSize: 20,
              color: '#6e6e73',
              textAlign: 'center',
              maxWidth: 560,
              margin: '0 auto 56px',
              lineHeight: 1.4,
            }}
          >
            One platform, four roles — each with their own on-chain experience.
          </p>

          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}
          >
            {[
              {
                role: 'Enterprise',
                icon: '🏢',
                desc: 'Define benefit plans, fund the treasury, issue positions, and govern the multisig.',
                cta: 'Start as Enterprise',
              },
              {
                role: 'Employee',
                icon: '👤',
                desc: "Track vesting schedules, watch your balance grow, and claim to your wallet — all from a single view.",
                cta: 'Join as Employee',
              },
              {
                role: 'Partner',
                icon: '🤝',
                desc: 'Receive revenue-share and milestone grants. Withdraw funds on your schedule.',
                cta: 'Join as Partner',
              },
              {
                role: 'Client',
                icon: '💎',
                desc: 'Redeem loyalty rewards and cashback positions earned through your relationship.',
                cta: 'Join as Client',
              },
            ].map(card => (
              <div
                key={card.role}
                style={{
                  background: '#f5f5f7',
                  borderRadius: 20,
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 36 }}>{card.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {card.role}
                </div>
                <p
                  style={{
                    fontSize: 15,
                    color: '#6e6e73',
                    lineHeight: 1.45,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {card.desc}
                </p>
                <button
                  onClick={() => navigate('/register', { state: { role: card.role.toLowerCase() } })}
                  style={{
                    marginTop: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: '#0071e3',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '9px 18px',
                    borderRadius: 980,
                    alignSelf: 'flex-start',
                  }}
                >
                  {card.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ON-CHAIN SECTION */}
      <section
        style={{ background: '#1d1d1f', padding: '96px 22px', color: '#fff' }}
      >
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#2997ff',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            On Solana
          </div>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              margin: '12px 0 16px',
            }}
          >
            Every benefit, a transaction.
          </h2>
          <p
            style={{ fontSize: 19, color: '#a1a1a6', lineHeight: 1.5, margin: '0 auto 44px' }}
          >
            Position issuance, vesting unlocks, and claims all settle on-chain. Verify any
            event in seconds with a Solana Explorer link.
          </p>

          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 16,
              padding: '22px 24px',
              textAlign: 'left',
            }}
          >
            {[
              {
                label: 'initializePlan',
                sig: '3HzKmPq9…mFpL',
                slot: '285,441,203',
                status: 'Confirmed',
              },
              {
                label: 'issuePosition',
                sig: '7Vn2sLd4…tRfY',
                slot: '285,441,891',
                status: 'Confirmed',
              },
              {
                label: 'claimVested',
                sig: 'bWcXuZ1g…H5jK',
                slot: '285,443,120',
                status: 'Confirmed',
              },
            ].map((tx, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 0',
                  borderBottom:
                    i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
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
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                      fontSize: 14,
                      color: '#f5f5f7',
                    }}
                  >
                    {tx.label}
                  </span>
                  <span
                    style={{
                      marginLeft: 16,
                      fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                      fontSize: 13,
                      color: '#6e6e73',
                    }}
                  >
                    {tx.sig}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#6e6e73' }}>slot {tx.slot}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#30d158',
                    background: 'rgba(48,209,88,0.12)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section style={{ background: '#fff', padding: '96px 22px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 46,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              textAlign: 'center',
              margin: '0 0 56px',
            }}
          >
            Live in three steps.
          </h2>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              {
                n: '1',
                title: 'Create your account',
                body: 'Register as an enterprise, employee, partner, or client — takes 60 seconds.',
              },
              {
                n: '2',
                title: 'Connect your wallet',
                body: 'Link a Solana wallet or import with a public address. Your keys, your benefits.',
              },
              {
                n: '3',
                title: 'Go live on-chain',
                body: 'Fund the treasury, define your first plan, and issue positions. Everything settles in seconds.',
              },
            ].map((step, i) => (
              <div
                key={step.n}
                style={{
                  flex: 1,
                  padding: '0 36px',
                  borderLeft: i > 0 ? '1px solid #d2d2d7' : 'none',
                }}
              >
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 700,
                    letterSpacing: '-0.04em',
                    color: '#0071e3',
                    lineHeight: 1,
                  }}
                >
                  {step.n}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    marginTop: 14,
                  }}
                >
                  {step.title}
                </div>
                <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.45, marginTop: 10 }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#f5f5f7', padding: '96px 22px', textAlign: 'center' }}>
        <h2
          style={{ fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}
        >
          Start in minutes.
        </h2>
        <p
          style={{
            fontSize: 20,
            color: '#6e6e73',
            margin: '14px auto 28px',
            maxWidth: 520,
            lineHeight: 1.4,
          }}
        >
          Connect a wallet and issue your first on-chain position today. Free on Devnet.
        </p>
        <button
          onClick={() => navigate('/register')}
          style={{
            border: 'none',
            cursor: 'pointer',
            background: '#0071e3',
            color: '#fff',
            fontSize: 17,
            fontWeight: 500,
            padding: '14px 30px',
            borderRadius: 980,
          }}
        >
          Create your account
        </button>
      </section>

      {/* FOOTER */}
      <footer
        style={{ background: '#f5f5f7', borderTop: '1px solid #d2d2d7', padding: '30px 22px' }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#86868b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, letterSpacing: '-0.06em', color: '#6e6e73' }}>
              E<span style={{ color: '#0071e3' }}>x</span>
            </span>
            <span>ExBenefits · On-chain benefits for enterprises</span>
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            {['Privacy', 'Terms', 'Security', 'Docs'].map(item => (
              <span key={item} style={{ cursor: 'pointer' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes ebfloat {
          0%, 100% { transform: translateX(-58%) rotate(-5deg) translateY(0); }
          50% { transform: translateX(-58%) rotate(-5deg) translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
