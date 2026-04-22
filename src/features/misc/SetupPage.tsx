import { AlertTriangle, ExternalLink } from 'lucide-react'

export default function SetupPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, oklch(0.97 0.01 95) 0%, oklch(0.93 0.02 100) 100%)',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '600px',
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 40px oklch(0.20 0.02 110 / 0.12)',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'oklch(0.95 0.08 60 / 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <AlertTriangle size={32} color="oklch(0.55 0.14 60)" />
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '12px',
          color: 'oklch(0.22 0.03 110)',
        }}>
          Supabase Not Configured
        </h1>

        <p style={{
          textAlign: 'center',
          color: 'oklch(0.45 0.02 110)',
          marginBottom: '32px',
          lineHeight: '1.6',
        }}>
          Your app needs to be connected to a Supabase project to work.
          Follow the steps below to get started.
        </p>

        <div style={{
          background: 'oklch(0.97 0.01 95)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '16px',
            color: 'oklch(0.35 0.03 110)',
          }}>
            Quick Setup (3 minutes)
          </h2>

          <ol style={{
            margin: 0,
            paddingLeft: '20px',
            lineHeight: '1.8',
            color: 'oklch(0.40 0.02 110)',
            fontSize: '14px',
          }}>
            <li>
              Create a free Supabase project at{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'oklch(0.65 0.12 140)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                supabase.com
                <ExternalLink size={12} />
              </a>
            </li>
            <li>Go to <strong>Settings → API</strong></li>
            <li>Copy your <strong>Project URL</strong> and <strong>anon/public key</strong></li>
            <li>
              Open <code style={{
                background: 'oklch(1 0 0)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}>.env</code> file in your project root
            </li>
            <li>Replace the placeholder values with your real credentials</li>
            <li>Save and refresh this page</li>
          </ol>
        </div>

        <div style={{
          background: 'oklch(0.92 0.04 140 / 0.15)',
          borderLeft: '3px solid oklch(0.65 0.12 140)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'oklch(0.40 0.03 110)',
            lineHeight: '1.6',
          }}>
            💡 <strong>Tip:</strong> After setting up Supabase, you'll also need to run the database migration.
            See <code style={{
              background: 'oklch(1 0 0)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}>README.md</code> for detailed instructions.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 20px',
              background: 'oklch(0.65 0.12 140)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Create Supabase Project
            <ExternalLink size={14} />
          </a>

          <a
            href="https://github.com/anthropics/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 20px',
              background: 'oklch(0.93 0.02 110)',
              color: 'oklch(0.35 0.03 110)',
              border: '1px solid oklch(0.90 0.01 100)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            View Docs
          </a>
        </div>
      </div>
    </div>
  )
}
