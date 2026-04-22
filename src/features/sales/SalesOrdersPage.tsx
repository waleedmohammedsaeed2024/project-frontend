import { useState } from 'react'
import { Plus, Eye, XCircle } from 'lucide-react'
import { formatDate, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from '@/lib/utils'
import type { OrderStatus } from '@/lib/database.types'
import { useSalesOrders, useCreateSalesOrder, useCancelSalesOrder } from './sales.hooks'
import { useItems } from '@/features/items/items.hooks'
import { useClients, useCustomersByClient } from '@/features/partners/partners.hooks'

const STATUS_FILTERS = [
  { label: 'الكل', value: '' },
  { label: 'مؤكد', value: 'o' },
  { label: 'مشحون', value: 'p' },
  { label: 'مكتمل', value: 'c' },
  { label: 'ملغى', value: 'd' },
] as const

interface LineItem { item_id: string; quantity: string }

export default function SalesOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const { data: orders = [], isLoading } = useSalesOrders(statusFilter)
  const { data: items = [] } = useItems()
  const { data: clients = [] } = useClients()
  const createMutation = useCreateSalesOrder()
  const cancelMutation = useCancelSalesOrder()

  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ client_id: '', customer_id: '', site: '' })
  const [lines, setLines] = useState<LineItem[]>([{ item_id: '', quantity: '' }])

  const { data: customers = [] } = useCustomersByClient(form.client_id)

  function addLine() { setLines(l => [...l, { item_id: '', quantity: '' }]) }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: keyof LineItem, val: string) {
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createMutation.mutateAsync({
        client_id: form.client_id,
        customer_id: form.customer_id,
        site: form.site || null,
        lines: lines.filter(l => l.item_id && l.quantity).map(l => ({
          item_id: l.item_id,
          quantity: parseFloat(l.quantity),
        })),
        items,
      })
      setShowModal(false)
      setForm({ client_id: '', customer_id: '', site: '' })
      setLines([{ item_id: '', quantity: '' }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">طلبات البيع</h1>
          <p className="page-subtitle">إنشاء وإدارة طلبات البيع</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(null); setShowModal(true) }} id="order-create-btn">
          <Plus size={16} /> طلب جديد
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value as OrderStatus | '')} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
            cursor: 'pointer', background: statusFilter === f.value ? 'var(--color-primary)' : 'var(--color-bg-card)',
            color: statusFilter === f.value ? 'white' : 'var(--color-text)', fontWeight: 500, fontSize: 13,
          }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>رقم الطلب</th><th>العميل</th><th>الزبون</th><th>الموقع</th>
              <th>الحالة</th><th>التاريخ</th><th style={{ textAlign: 'end' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد طلبات</td></tr>
            ) : orders.map(o => (
              <tr key={o.id}>
                <td><code style={{ fontSize: 12 }}>{o.id.slice(0, 8)}…</code></td>
                <td style={{ fontWeight: 500 }}>{(o as unknown as { client?: { partner_name: string } }).client?.partner_name ?? '—'}</td>
                <td style={{ fontSize: 13 }}>{(o as unknown as { customer?: { partner_name: string } }).customer?.partner_name ?? '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{o.site ?? '—'}</td>
                <td><span className={`badge ${ORDER_STATUS_CLASS[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                <td style={{ fontSize: 13 }}>{formatDate(o.order_date)}</td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm btn-icon"><Eye size={14} /></button>
                    {o.status === 'o' && (
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => cancelMutation.mutate(o.id)}>
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">طلب بيع جديد</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">العميل *</label>
                    <select className="form-select" required value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value, customer_id: '' }))}>
                      <option value="">— اختر العميل —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.partner_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الزبون *</label>
                    <select className="form-select" required value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} disabled={!form.client_id}>
                      <option value="">— اختر الزبون —</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.partner_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">الموقع</label>
                  <input className="form-input" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>الأصناف</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13} /> إضافة صنف</button>
                  </div>
                  {lines.map((line, i) => {
                    const item = items.find(it => it.id === line.item_id)
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                        <select className="form-select" value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}>
                          <option value="">— الصنف —</option>
                          {items.map(it => <option key={it.id} value={it.id}>{it.item_name} ({it.quantity})</option>)}
                        </select>
                        <input type="number" min="0.001" step="0.001" className="form-input" placeholder="الكمية" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                          {item ? item.avg_cost.toFixed(4) : ''}
                        </div>
                        <button type="button" className="btn btn-danger btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1}>×</button>
                      </div>
                    )
                  })}
                </div>
                {error && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13, padding: 10, background: 'oklch(0.95 0.04 20/0.3)', borderRadius: 'var(--radius-md)' }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending} id="order-save-btn">
                  {createMutation.isPending ? 'جاري الحفظ…' : 'إنشاء الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
