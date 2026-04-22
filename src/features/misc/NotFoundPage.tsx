import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 72, fontWeight: 800, color: 'var(--color-border)', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: 24, marginTop: 16, marginBottom: 8 }}>Page Not Found</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
        <Home size={16} /> Back to Dashboard
      </Link>
    </div>
  )
}
