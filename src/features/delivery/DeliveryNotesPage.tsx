import { useEffect, useState } from 'react'
import { CheckCircle2, Plus, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { DeliveryNote } from '@/lib/database.types'
import { useDeliveryNotes, useOrdersForDelivery, useCreateDeliveryNote, useConfirmDelivery } from './delivery.hooks'
import { usePagination, PaginationFooter } from '@/components/Pagination'

export default function DeliveryNotesPage() {
  const { data: notes = [], isLoading } = useDeliveryNotes()
  const { data: pendingOrders = [] } = useOrdersForDelivery()
  const createMutation = useCreateDeliveryNote()
  const confirmMutation = useConfirmDelivery()

  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ sales_order_id: '', notes: '' })
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filteredNotes = q ? notes.filter(n => {
    const j = n as unknown as { sales_order?: { client?: { partner_name?: string }; customer?: { partner_name?: string }; site?: string | null } }
    return (
      (j.sales_order?.client?.partner_name ?? '').toLowerCase().includes(q) ||
      (j.sales_order?.customer?.partner_name ?? '').toLowerCase().includes(q) ||
      (j.sales_order?.site ?? '').toLowerCase().includes(q)
    )
  }) : notes

  const { visible: visibleNotes, page, setPage, pageSize, setPageSize, pageCount, total, start, resetToFirst } = usePagination(filteredNotes, 20)
  useEffect(() => { resetToFirst() }, [q, pageSize, resetToFirst])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createMutation.mutateAsync({ salesOrderId: form.sales_order_id, notes: form.notes })
      setShowModal(false)
      setForm({ sales_order_id: '', notes: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  async function handleConfirm(note: DeliveryNote) {
    if (!confirm('تأكيد التسليم؟ سيتم خصم المخزون وإنشاء فاتورة مبيعات.')) return
    try {
      await confirmMutation.mutateAsync(note)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">إذونات التسليم</h1>
          <p className="page-subtitle">إنشاء إذونات التسليم وتأكيد الاستلام</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(null); setShowModal(true) }} disabled={pendingOrders.length === 0} id="delivery-create-btn">
          <Plus size={16} /> إذن تسليم جديد
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
        <Search size={14} style={{
          position: 'absolute', insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-text-muted)', pointerEvents: 'none',
        }} />
        <input
          className="form-input"
          style={{ paddingInlineStart: 32 }}
          placeholder="ابحث بالعميل أو الزبون أو الموقع…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>العميل</th><th>الزبون</th><th>الموقع</th>
              <th>تاريخ التسليم</th><th>الحالة</th><th style={{ textAlign: 'end' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : visibleNotes.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد إذونات تسليم</td></tr>
            ) : visibleNotes.map(note => {
              const order = (note as unknown as { sales_order: { client?: { partner_name: string }; customer?: { partner_name: string }; site?: string | null } }).sales_order
              const confirmed = !!note.confirmed_at
              return (
                <tr key={note.id}>
                  <td style={{ fontWeight: 500 }}>{order?.client?.partner_name ?? '—'}</td>
                  <td style={{ fontSize: 13 }}>{order?.customer?.partner_name ?? '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{order?.site ?? '—'}</td>
                  <td style={{ fontSize: 13 }}>{formatDate(note.delivery_date)}</td>
                  <td>
                    {confirmed
                      ? <span className="badge badge-completed">تم التسليم</span>
                      : <span className="badge badge-shipped">قيد الشحن</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {!confirmed && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleConfirm(note)} disabled={confirmMutation.isPending} id={`confirm-${note.id}`}>
                          <CheckCircle2 size={14} /> تأكيد التسليم
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <PaginationFooter page={page} pageCount={pageCount} pageSize={pageSize} total={total} start={start} setPage={setPage} setPageSize={setPageSize} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">إذن تسليم جديد</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الطلب المعلق *</label>
                  <select className="form-select" required value={form.sales_order_id} onChange={e => setForm(f => ({ ...f, sales_order_id: e.target.value }))}>
                    <option value="">— اختر الطلب —</option>
                    {pendingOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {(o as unknown as { client?: { partner_name: string } }).client?.partner_name} → {(o as unknown as { customer?: { partner_name: string } }).customer?.partner_name} {o.site ? `(${o.site})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                {error && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13 }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending} id="delivery-save-btn">
                  {createMutation.isPending ? 'جاري الإنشاء…' : 'إنشاء (تحديث الحالة إلى مشحون)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
