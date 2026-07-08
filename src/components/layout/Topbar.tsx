import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bell, Search, ChevronDown, KeyRound, LogOut, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface TopbarProps {
  sidebarCollapsed?: boolean
}

interface NotificationRow {
  id: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  created_at: string
}

export default function Topbar({ sidebarCollapsed: _ }: TopbarProps) {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()

  // ── Role display name (dynamic from app_roles, fall back to a static map) ──
  const { data: roleLabel } = useQuery({
    queryKey: ['role-display', role],
    enabled: !!role,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_roles')
        .select('display_name')
        .eq('name', role!)
        .maybeSingle()
      if (error) return null
      return data?.display_name ?? null
    },
    staleTime: 5 * 60_000,
  })
  const STATIC_FALLBACK: Record<string, string> = {
    admin: 'مسؤول',
    accountant: 'محاسب',
    manager: 'مدير',
    purchase_manager: 'مدير مشتريات',
    salesman: 'مندوب مبيعات',
  }
  const displayRole = roleLabel ?? (role ? STATIC_FALLBACK[role] ?? role : '')

  // ── Notifications (last 10 from notification_log) ──────────────────────────
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['topbar-notifications'],
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from('notification_log')
        .select('id, message, status, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) return []
      return (data ?? []) as NotificationRow[]
    },
    staleTime: 60_000,
  })
  const unreadCount = notifications.filter(n => n.status === 'pending').length

  // ── Dropdown open state + outside-click handling ───────────────────────────
  const [openMenu, setOpenMenu] = useState<'none' | 'user' | 'notif'>('none')
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpenMenu('none')
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // ── Password modal ─────────────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  function openPasswordModal() {
    setPwForm({ next: '', confirm: '' })
    setPwError(null)
    setPwSuccess(false)
    setPwOpen(true)
    setOpenMenu('none')
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (pwForm.next.length < 6) {
      setPwError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('كلمتا المرور غير متطابقتين')
      return
    }
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwBusy(false)
    if (error) {
      setPwError(error.message)
      return
    }
    setPwSuccess(true)
    setPwForm({ next: '', confirm: '' })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="topbar" ref={rootRef as React.RefObject<HTMLElement>}>
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
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 14, color: 'var(--color-text)', width: '100%',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* ── Notification bell ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn-icon btn-ghost"
          aria-label="Notifications"
          id="topbar-notifications"
          onClick={() => {
            setOpenMenu(m => (m === 'notif' ? 'none' : 'notif'))
            void refetchNotifications()
          }}
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: 4, insetInlineEnd: 4,
              minWidth: 16, height: 16,
              borderRadius: 999,
              background: 'oklch(0.55 0.22 25)',
              color: 'white',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {openMenu === 'notif' && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineEnd: 0,
            width: 320,
            maxHeight: 420,
            overflowY: 'auto',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px oklch(0 0 0 / 0.12)',
            zIndex: 400,
          }}>
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--color-border)',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>الإشعارات</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                لا توجد إشعارات
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: 13,
                  background: n.status === 'pending' ? 'oklch(0.97 0.02 240 / 0.5)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      color: n.status === 'failed'
                        ? 'oklch(0.50 0.16 18)'
                        : n.status === 'sent' ? 'oklch(0.45 0.14 145)' : 'oklch(0.45 0.16 240)',
                    }}>{n.status === 'pending' ? 'جديد' : n.status === 'sent' ? 'مُرسل' : 'فشل'}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                      {new Date(n.created_at).toLocaleString('ar-EG', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div style={{ lineHeight: 1.4, color: 'var(--color-text)' }}>
                    {n.message}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── User avatar + menu ────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpenMenu(m => (m === 'user' ? 'none' : 'user'))}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 12px', borderRadius: 'var(--radius-md)',
            border: '1px solid transparent', background: 'transparent',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, textAlign: 'start' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-heading)' }}>
              {user?.email?.split('@')[0] ?? 'User'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{displayRole}</span>
          </div>
          <ChevronDown size={14} color="var(--color-text-muted)" />
        </button>

        {openMenu === 'user' && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineEnd: 0,
            width: 240,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px oklch(0 0 0 / 0.12)',
            overflow: 'hidden',
            zIndex: 400,
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-heading)' }}>
                {user?.email ?? '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {displayRole}
              </div>
            </div>
            <button
              onClick={openPasswordModal}
              style={menuItemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.96 0.01 95)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <KeyRound size={15} />
              <span>تغيير كلمة المرور</span>
            </button>
            <button
              onClick={handleSignOut}
              style={{ ...menuItemStyle, color: 'oklch(0.50 0.16 18)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.96 0.04 18 / 0.4)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={15} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Change-password modal ─────────────────────────────────────────── */}
      {pwOpen && (
        <div className="modal-overlay" onClick={() => setPwOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">تغيير كلمة المرور</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setPwOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">كلمة المرور الجديدة *</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    minLength={6}
                    value={pwForm.next}
                    onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                    placeholder="6 أحرف على الأقل"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">تأكيد كلمة المرور *</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  />
                </div>
                {pwError && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 6,
                    background: 'oklch(0.95 0.04 20 / 0.4)',
                    color: 'oklch(0.40 0.14 18)', fontSize: 13,
                  }}>{pwError}</div>
                )}
                {pwSuccess && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 6,
                    background: 'oklch(0.93 0.05 145 / 0.4)',
                    color: 'oklch(0.38 0.14 145)', fontSize: 13,
                  }}>تم تغيير كلمة المرور بنجاح</div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPwOpen(false)}>
                  {pwSuccess ? 'إغلاق' : 'إلغاء'}
                </button>
                {!pwSuccess && (
                  <button type="submit" className="btn btn-primary" disabled={pwBusy}>
                    {pwBusy ? 'جاري الحفظ…' : 'حفظ'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '10px 14px',
  border: 'none', background: 'transparent',
  cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
  color: 'var(--color-text)', textAlign: 'start',
  transition: 'background 0.12s',
}
