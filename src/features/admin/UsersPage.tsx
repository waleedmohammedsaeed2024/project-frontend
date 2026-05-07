import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, KeyRound, Ban, Check, Trash2, ShieldAlert, ShieldOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth, type AppRole } from '@/context/AuthContext'

interface AdminUser {
  id: string
  email: string | null
  phone?: string | null
  role: AppRole | null
  banned_until: string | null
  created_at: string
  last_sign_in_at: string | null
}

interface RoleOption {
  name: string
  display_name: string
  is_builtin: boolean
}

// Stable color hash so any custom role gets a consistent color.
function colorFor(name: string): string {
  if (name === 'admin')            return 'oklch(0.55 0.22 25)'
  if (name === 'accountant')       return 'oklch(0.55 0.18 270)'
  if (name === 'manager')          return 'oklch(0.55 0.16 200)'
  if (name === 'purchase_manager') return 'oklch(0.55 0.16 145)'
  if (name === 'salesman')         return 'oklch(0.60 0.15 60)'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `oklch(0.55 0.16 ${hue})`
}

async function invokeAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('admin-users', { body })
  if (error) {
    // The edge function returns errors as 4xx/5xx with JSON `{ error: msg }`.
    // Across supabase-js versions, error.context can be either a Response,
    // a parsed object, or undefined. Try each shape.
    const ctx = (error as unknown as { context?: unknown }).context
    let extracted: string | null = null
    try {
      if (ctx && typeof (ctx as Response).text === 'function') {
        const txt = await (ctx as Response).text()
        try {
          extracted = (JSON.parse(txt) as { error?: string }).error ?? txt
        } catch {
          extracted = txt
        }
      } else if (ctx && typeof ctx === 'object') {
        const obj = ctx as { error?: string; body?: string; message?: string }
        extracted = obj.error ?? obj.message ?? (typeof obj.body === 'string' ? obj.body : null)
      }
    } catch {
      // ignore — fall through to error.message
    }
    throw new Error(extracted ?? error.message)
  }
  return data as T
}

interface FormState {
  email: string
  password: string
  role: AppRole
}

const EMPTY_FORM: FormState = { email: '', password: '', role: '' }

function isBanned(u: AdminUser) {
  if (!u.banned_until) return false
  const t = Date.parse(u.banned_until)
  return Number.isFinite(t) && t > Date.now()
}

export default function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuth()

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.rpc('admin_list_users')
      if (error) throw new Error(error.message)
      return (data ?? []) as AdminUser[]
    },
  })

  // Available roles — driven by /admin/roles. Custom roles appear here.
  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async (): Promise<RoleOption[]> => {
      const { data, error } = await supabase.rpc('admin_list_roles')
      if (error) throw new Error(error.message)
      return ((data ?? []) as RoleOption[])
    },
  })

  const labelForRole = (name: string | null) =>
    (name && roles.find(r => r.name === name)?.display_name) || name || ''

  const createMut = useMutation({
    mutationFn: (form: FormState) => invokeAdmin<{ user: unknown }>({ action: 'create', ...form }),
    onSuccess: async (_d, vars) => {
      // After the user is created, also align their role in app_roles
      // (the edge function already wrote it, but RPC is the source of truth going forward).
      // The list query refresh below picks up the new row.
      await qc.invalidateQueries({ queryKey: ['admin-users'] })
      void vars
    },
  })
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; email?: string; password?: string; role?: AppRole | null }) =>
      invokeAdmin<{ user: unknown }>({ action: 'update', ...vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  // Setting/revoking role via SECURITY DEFINER RPC — no edge function needed.
  const setRoleMut = useMutation({
    mutationFn: async (vars: { id: string; role: string | null }) => {
      const { error } = await supabase.rpc('admin_set_user_role', {
        p_user_id: vars.id,
        p_role: vars.role,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const disableMut = useMutation({
    mutationFn: (id: string) => invokeAdmin({ action: 'disable', id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const enableMut = useMutation({
    mutationFn: (id: string) => invokeAdmin({ action: 'enable', id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => invokeAdmin({ action: 'delete', id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(u: AdminUser) {
    setEditing(u)
    setForm({ email: u.email ?? '', password: '', role: u.role ?? '' })
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      if (editing) {
        // Update email/password through edge function (auth admin API).
        if (form.email !== editing.email || form.password) {
          await updateMut.mutateAsync({
            id: editing.id,
            email: form.email !== editing.email ? form.email : undefined,
            password: form.password ? form.password : undefined,
          })
        }
        // Role change/revoke goes through the RPC.
        if ((form.role || '') !== (editing.role || '')) {
          await setRoleMut.mutateAsync({ id: editing.id, role: form.role || null })
        }
      } else {
        await createMut.mutateAsync(form)
      }
      setShowModal(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  async function handleRevokeRole(u: AdminUser) {
    if (!u.role) return
    if (!confirm(`إلغاء دور "${labelForRole(u.role)}" من المستخدم ${u.email}؟`)) return
    try {
      await setRoleMut.mutateAsync({ id: u.id, role: null })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل إلغاء الدور')
    }
  }

  async function handleResetPassword(u: AdminUser) {
    const pw = prompt(`كلمة مرور جديدة للمستخدم ${u.email}:`)
    if (!pw) return
    if (pw.length < 6) { alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    try {
      await updateMut.mutateAsync({ id: u.id, password: pw })
      alert('تم تغيير كلمة المرور')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل تغيير كلمة المرور')
    }
  }

  async function handleToggleDisable(u: AdminUser) {
    const banned = isBanned(u)
    const verb = banned ? 'تفعيل' : 'تعطيل'
    if (!confirm(`هل تريد ${verb} المستخدم ${u.email}؟`)) return
    try {
      if (banned) await enableMut.mutateAsync(u.id)
      else await disableMut.mutateAsync(u.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشلت العملية')
    }
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`حذف نهائي للمستخدم ${u.email}؟ لا يمكن التراجع.`)) return
    try {
      await deleteMut.mutateAsync(u.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل الحذف')
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? users.filter(u =>
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.role ?? '').toLowerCase().includes(q),
      )
    : users

  const saving = createMut.isPending || updateMut.isPending

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المستخدمون</h1>
          <p className="page-subtitle">إدارة المستخدمين والصلاحيات</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="user-create-btn">
          <Plus size={16} /> إضافة مستخدم
        </button>
      </div>

      <input
        className="form-input"
        style={{ maxWidth: 320, marginBottom: 20 }}
        placeholder="بحث بالبريد أو الدور…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {error && (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 8,
          background: 'oklch(0.95 0.04 20 / 0.3)',
          border: '1px solid oklch(0.80 0.08 18 / 0.4)',
          color: 'oklch(0.40 0.14 18)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <ShieldAlert size={16} />
          {error instanceof Error ? error.message : 'تعذر تحميل المستخدمين. تأكد من نشر edge function: admin-users.'}
        </div>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>البريد الإلكتروني</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>آخر دخول</th>
              <th>تاريخ الإنشاء</th>
              <th style={{ textAlign: 'end' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد نتائج</td></tr>
            ) : filtered.map(u => {
              const banned = isBanned(u)
              const isMe = u.id === me?.id
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>
                    {u.email || u.phone || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>(بدون بريد)</span>}
                    {isMe && <span style={{ marginInlineStart: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>(أنت)</span>}
                  </td>
                  <td>
                    {u.role ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 12, fontWeight: 600,
                        color: 'white',
                        background: colorFor(u.role),
                      }}>{labelForRole(u.role)}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>— لا يوجد —</span>
                    )}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 12, fontWeight: 600,
                      color: banned ? 'oklch(0.40 0.14 18)' : 'oklch(0.40 0.16 145)',
                      background: banned ? 'oklch(0.95 0.04 20 / 0.5)' : 'oklch(0.93 0.05 145 / 0.5)',
                    }}>{banned ? 'معطّل' : 'نشط'}</span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('ar-EG') : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="تعديل" onClick={() => openEdit(u)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="إعادة تعيين كلمة المرور" onClick={() => handleResetPassword(u)}>
                        <KeyRound size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="إلغاء الدور"
                        onClick={() => handleRevokeRole(u)}
                        disabled={!u.role || isMe}
                      >
                        <ShieldOff size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title={banned ? 'تفعيل' : 'تعطيل'}
                        onClick={() => handleToggleDisable(u)}
                        disabled={isMe}
                      >
                        {banned ? <Check size={14} /> : <Ban size={14} />}
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="حذف"
                        onClick={() => handleDelete(u)}
                        disabled={isMe}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {editing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور *'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    required={!editing}
                    minLength={editing ? 0 : 6}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editing ? 'اتركها فارغة لعدم التغيير' : '6 أحرف على الأقل'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الدور</label>
                  <select
                    className="form-select"
                    value={form.role}
                    disabled={!!editing && editing.id === me?.id}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as AppRole }))}
                  >
                    <option value="">— بدون دور (مُلغى) —</option>
                    {roles.map(r => (
                      <option key={r.name} value={r.name}>
                        {r.display_name}{r.is_builtin ? '' : ' (مخصّص)'}
                      </option>
                    ))}
                  </select>
                  {editing && editing.id === me?.id && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      لا يمكنك تغيير دورك الخاص
                    </p>
                  )}
                  {!editing && !form.role && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      المستخدم لن يستطيع الوصول لأي صفحة بدون دور
                    </p>
                  )}
                </div>
                {formError && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13 }}>{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="user-save-btn">
                  {saving ? 'جاري الحفظ…' : editing ? 'حفظ التغييرات' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
