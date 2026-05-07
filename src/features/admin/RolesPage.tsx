import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Lock, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Privilege, Privileges } from '@/context/AuthContext'

interface RoleRow {
  name: string
  display_name: string
  privileges: Privileges
  is_builtin: boolean
  created_at: string
  updated_at: string
}

const PRIVILEGE_GROUPS: { label: string; items: { key: Privilege; label: string }[] }[] = [
  {
    label: 'المبيعات وطلبات البيع',
    items: [
      { key: 'createOrders', label: 'إنشاء طلبات البيع' },
      { key: 'shipOrders', label: 'شحن الطلبات' },
      { key: 'confirmDelivery', label: 'تأكيد التوصيل' },
      { key: 'salesmanShipToDelivered', label: 'مندوب: تحويل من شحن إلى توصيل' },
      { key: 'cancelInvoice', label: 'إلغاء الفواتير' },
    ],
  },
  {
    label: 'المشتريات',
    items: [
      { key: 'createPurchase', label: 'إنشاء فواتير الشراء' },
      { key: 'viewPurchase', label: 'عرض فواتير الشراء' },
    ],
  },
  {
    label: 'المخزون والأصناف',
    items: [
      { key: 'viewInventory', label: 'عرض المخزون' },
      { key: 'adjustInventory', label: 'تسويات المخزون' },
      { key: 'manageReturns', label: 'إدارة المرتجعات' },
      { key: 'viewItems', label: 'عرض الأصناف' },
      { key: 'manageItemsPackaging', label: 'إدارة الأصناف والتعبئة' },
    ],
  },
  {
    label: 'الشركاء',
    items: [
      { key: 'viewPartners', label: 'عرض الشركاء' },
      { key: 'managePartners', label: 'إدارة الشركاء' },
    ],
  },
  {
    label: 'المالية',
    items: [
      { key: 'viewPayments', label: 'عرض المدفوعات' },
      { key: 'recordPayments', label: 'تسجيل المدفوعات' },
    ],
  },
  {
    label: 'التقارير',
    items: [
      { key: 'viewReports', label: 'عرض التقارير' },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { key: 'manageUsers', label: 'إدارة المستخدمين' },
      { key: 'manageRoles', label: 'إدارة الأدوار والصلاحيات' },
    ],
  },
]

const ALL_KEYS: Privilege[] = PRIVILEGE_GROUPS.flatMap(g => g.items.map(i => i.key))

interface FormState {
  name: string
  display_name: string
  privileges: Privileges
  isEdit: boolean
  originalIsBuiltin: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  display_name: '',
  privileges: Object.fromEntries(ALL_KEYS.map(k => [k, false])) as Privileges,
  isEdit: false,
  originalIsBuiltin: false,
}

export default function RolesPage() {
  const qc = useQueryClient()

  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async (): Promise<RoleRow[]> => {
      const { data, error } = await supabase.rpc('admin_list_roles')
      if (error) throw new Error(error.message)
      return (data ?? []) as RoleRow[]
    },
  })

  const upsertMut = useMutation({
    mutationFn: async (vars: { name: string; display_name: string; privileges: Privileges }) => {
      const { data, error } = await supabase.rpc('admin_upsert_role', {
        p_name: vars.name,
        p_display_name: vars.display_name,
        p_privileges: vars.privileges,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      qc.invalidateQueries({ queryKey: ['my-privileges'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.rpc('admin_delete_role', { p_name: name })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(r: RoleRow) {
    const merged: Privileges = Object.fromEntries(
      ALL_KEYS.map(k => [k, r.privileges[k] === true]),
    ) as Privileges
    setForm({
      name: r.name,
      display_name: r.display_name,
      privileges: merged,
      isEdit: true,
      originalIsBuiltin: r.is_builtin,
    })
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      await upsertMut.mutateAsync({
        name: form.name.trim().toLowerCase(),
        display_name: form.display_name.trim() || form.name.trim(),
        privileges: form.privileges,
      })
      setShowModal(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  async function handleDelete(r: RoleRow) {
    if (r.is_builtin) return
    if (!confirm(`حذف الدور "${r.display_name}"؟ سيُلغى من أي مستخدم مُعيَّن له.`)) return
    try {
      await deleteMut.mutateAsync(r.name)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الحذف')
    }
  }

  function togglePrivilege(key: Privilege) {
    setForm(f => ({ ...f, privileges: { ...f.privileges, [key]: !f.privileges[key] } }))
  }

  function setAll(val: boolean) {
    setForm(f => ({
      ...f,
      privileges: Object.fromEntries(ALL_KEYS.map(k => [k, val])) as Privileges,
    }))
  }

  function privilegeCount(p: Privileges) {
    return ALL_KEYS.reduce((n, k) => n + (p[k] === true ? 1 : 0), 0)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الأدوار والصلاحيات</h1>
          <p className="page-subtitle">إدارة أدوار المستخدمين وتخصيص صلاحياتهم</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="role-create-btn">
          <Plus size={16} /> إضافة دور جديد
        </button>
      </div>

      {error && (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 8,
          background: 'oklch(0.95 0.04 20 / 0.3)',
          border: '1px solid oklch(0.80 0.08 18 / 0.4)',
          color: 'oklch(0.40 0.14 18)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <ShieldAlert size={16} />
          {error instanceof Error ? error.message : 'تعذر تحميل الأدوار. هل تم تطبيق migration 013_app_roles.sql؟'}
        </div>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الدور</th>
              <th>المعرّف</th>
              <th>عدد الصلاحيات</th>
              <th>النوع</th>
              <th style={{ textAlign: 'end' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : roles.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد أدوار</td></tr>
            ) : roles.map(r => (
              <tr key={r.name}>
                <td style={{ fontWeight: 500 }}>{r.display_name}</td>
                <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {r.name}
                </td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                    fontSize: 12, fontWeight: 600,
                    background: 'oklch(0.93 0.05 240 / 0.5)',
                    color: 'oklch(0.40 0.16 240)',
                  }}>{privilegeCount(r.privileges)} / {ALL_KEYS.length}</span>
                </td>
                <td>
                  {r.is_builtin ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
                      <Lock size={12} /> مدمج
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'oklch(0.40 0.16 145)' }}>مخصّص</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="تعديل" onClick={() => openEdit(r)}>
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      title={r.is_builtin ? 'لا يمكن حذف الأدوار المدمجة' : 'حذف'}
                      onClick={() => handleDelete(r)}
                      disabled={r.is_builtin}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2 className="modal-title">{form.isEdit ? `تعديل الدور: ${form.display_name}` : 'إضافة دور جديد'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">المعرّف (إنجليزي) *</label>
                    <input
                      className="form-input"
                      required
                      pattern="[a-z][a-z0-9_]{1,30}"
                      title="أحرف صغيرة وأرقام وشرطة سفلية، يبدأ بحرف"
                      value={form.name}
                      disabled={form.isEdit}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase() }))}
                      placeholder="warehouse_clerk"
                    />
                    {form.isEdit && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                        لا يمكن تغيير المعرّف بعد الإنشاء
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">الاسم المعروض *</label>
                    <input
                      className="form-input"
                      required
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      placeholder="مسؤول المستودع"
                    />
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 16, marginBottom: 8,
                  paddingBlock: 8, borderTop: '1px solid var(--color-border)',
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600 }}>الصلاحيات</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll(true)}>تحديد الكل</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll(false)}>إلغاء الكل</button>
                  </div>
                </div>

                {PRIVILEGE_GROUPS.map(group => (
                  <div key={group.label} style={{ marginBottom: 14 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      marginBottom: 6,
                    }}>{group.label}</div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 6,
                    }}>
                      {group.items.map(item => (
                        <label
                          key={item.key}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: form.privileges[item.key] ? 'oklch(0.96 0.04 240 / 0.4)' : 'transparent',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={form.privileges[item.key] === true}
                            onChange={() => togglePrivilege(item.key)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {formError && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13 }}>{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={upsertMut.isPending} id="role-save-btn">
                  {upsertMut.isPending ? 'جاري الحفظ…' : form.isEdit ? 'حفظ التغييرات' : 'إضافة الدور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
