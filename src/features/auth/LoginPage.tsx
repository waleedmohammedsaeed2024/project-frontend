import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError(err)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      background: 'var(--color-bg)',
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1,
        background: 'var(--color-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        gap: 28,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Boxes size={32} color="white" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 10 }}>
            InventoryERP
          </h1>
          <p style={{ color: 'oklch(0.65 0.02 110)', fontSize: 15, lineHeight: 1.6, maxWidth: 320 }}>
            A complete inventory-centric ERP — manage purchasing, stock, sales,
            and financial tracking in one place.
          </p>
        </div>

        {/* Feature highlights */}
        {[
          'Real-time inventory tracking with average cost',
          'Purchase → Sales → Invoice automation',
          'Role-based access control',
          'WhatsApp supplier notifications',
        ].map((feat) => (
          <div key={feat} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            color: 'oklch(0.78 0.02 110)', fontSize: 14,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-primary)', flexShrink: 0,
            }} />
            {feat}
          </div>
        ))}
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '420px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
            Sign in
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, fontSize: 14 }}>
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', padding: 2,
                  }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'oklch(0.95 0.04 20 / 0.3)',
                border: '1px solid oklch(0.80 0.08 18 / 0.4)',
                borderRadius: 'var(--radius-md)',
                color: 'oklch(0.40 0.14 18)',
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: 4, justifyContent: 'center', padding: '11px' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
