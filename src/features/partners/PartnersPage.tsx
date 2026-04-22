import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Partner, PartnerType } from '@/lib/database.types'
import {
  usePartners, useCreatePartner, useUpdatePartner, useDeletePartner,
  useClients,
} from './partners.hooks'

const TYPE_TITLE: Record<PartnerType, string> = { c: 'العملاء', s: 'الموردون', u: 'الزبائن' }

interface Props { type: PartnerType }

interface FormState {
  partner_name: string
  phone_no: string
  balance: string
  parent_client_id: string
}

export default function PartnersPage({ type }: Props) {
  const { data: partners = [], isLoading } = usePartners(type)
  const { data: clients = [] } = useClients()
  const createMutation = useCreatePartner(type)
  const updateMutation = useUpdatePartner(type)
  const deleteMutation = useDeletePartner(type)

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [form, setForm] = useState<FormState>({ partner_name: '', phone_no: '', balance: '0', parent_client_id: '' })
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ partner_name: '', phone_no: '', balance: '0', parent_client_id: '' })
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(p: Partner) {
    setEditing(p)
    setForm({ partner_name: p.partner_name, phone_no: p.phone_no ?? '', balance: String(p.balance), parent_client_id: p.parent_client_id ?? '' })
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const payload = {
      partner_name: form.partner_name.trim(),
      partner_type: type,
      phone_no: form.phone_no.trim() || null,
      balance: parseFloat(form.balance) || 0,
      ...(type === 'u' && { parent_client_id: form.parent_client_id || null }),
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      setShowModal(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل تريد حذف هذا السجل؟')) return
    deleteMutation.mutate(id)
  }

  const filtered = partners.filter(p =>
    p.partner_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone_no ?? '').includes(search),
  )

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{TYPE_TITLE[type]}</h1>
          <p className="page-subtitle">إدارة {TYPE_TITLE[type]}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="partner-create-btn">
          <Plus size={16} /> إضافة جديد
        </button>
      </div>

      <input
        className="form-input"
        style={{ maxWidth: 320, marginBottom: 20 }}
        placeholder="بحث…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              {type === 'u' && <th>العميل</th>}
              <th style={{ textAlign: 'end' }}>الرصيد</th>
              <th style={{ textAlign: 'end' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد نتائج</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.partner_name}</td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{p.phone_no ?? '—'}</td>
                {type === 'u' && (
                  <td style={{ fontSize: 13 }}>
                    {clients.find(c => c.id === p.parent_client_id)?.partner_name ?? '—'}
                  </td>
                )}
                <td style={{ textAlign: 'end', fontWeight: 600 }}>{formatCurrency(p.balance)}</td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'تعديل' : 'إضافة'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم *</label>
                  <input className="form-input" required value={form.partner_name} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">الهاتف</label>
                  <input className="form-input" value={form.phone_no} onChange={e => setForm(f => ({ ...f, phone_no: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">الرصيد</label>
                  <input type="number" step="0.01" className="form-input" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
                </div>
                {type === 'u' && (
                  <div className="form-group">
                    <label className="form-label">العميل *</label>
                    <select className="form-select" required value={form.parent_client_id} onChange={e => setForm(f => ({ ...f, parent_client_id: e.target.value }))}>
                      <option value="">— اختر العميل —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.partner_name}</option>)}
                    </select>
                  </div>
                )}
                {formError && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13 }}>{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="partner-save-btn">
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
