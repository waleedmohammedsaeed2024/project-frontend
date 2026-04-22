import { Bell, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface TopbarProps {
  sidebarCollapsed?: boolean
}

export default function Topbar({ sidebarCollapsed }: TopbarProps) {
  const { user, role } = useAuth()

  const roleLabel: Record<string, string> = {
    admin: 'Administrator',
    purchase_manager: 'Purchase Manager',
    salesman: 'Salesman',
    manager: 'Manager',
  }

  return (
    <header className="topbar">
      {/* Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'oklch(0.96 0.01 95)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '7px 14px',
        flex: 1,
        maxWidth: 360,
      }}>
        <Search size={15} color="var(--color-text-muted)" />
        <input
          type="text"
          placeholder="Search..."
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 14,
            color: 'var(--color-text)',
            width: '100%',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Notification bell */}
      <button className="btn-icon btn-ghost" aria-label="Notifications" id="topbar-notifications">
        <Bell size={18} />
      </button>

      {/* User avatar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        cursor: 'default',
      }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: '50%',
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'white',
          flexShrink: 0,
        }}>
          {user?.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-heading)' }}>
            {user?.email?.split('@')[0] ?? 'User'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {role ? roleLabel[role] : ''}
          </span>
        </div>
      </div>
    </header>
  )
}
