import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useReturns, useSalesInvoicesForReturn, usePurchaseInvoicesForReturn, useCreateReturn } from './returns.hooks'
import { useItems } from '@/features/items/items.hooks'
import { usePagination, PaginationFooter } from '@/components/Pagination'

interface LineItem { item_id: string; quantity: string; cost_price: string }

export default function ReturnsPage() {
  const { data: returns = [], isLoading } = useReturns()
  const { data: items = [] } = useItems()
  const { data: salesInvoices = [] } = useSalesInvoicesForReturn()
  const { data: purchaseInvoices = [] } = usePurchaseInvoicesForReturn()
  const createMutation = useCreateReturn()

  const { visible: visibleReturns, page, setPage, pageSize, setPageSize, pageCount, total, start } = usePagination(returns, 20)

  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ return_type: 'sales' as 'sales' | 'purchase', ref_invoice_id: '', reason: '' })
  const [lines, setLines] = useState<LineItem[]>([{ item_id: '', quantity: '', cost_price: '' }])

  function addLine() { setLines(l => [...l, { item_id: '', quantity: '', cost_price: '' }]) }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: keyof LineItem, val: string) {
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.ref_invoice_id) { setError('اختر الفاتورة المرجعية'); return }
    try {
      await createMutation.mutateAsync({
        return_type: form.return_type,
        ref_invoice_id: form.ref_invoice_id,
        reason: form.reason || undefined,
        lines: lines.filter(l => l.item_id && l.quantity && l.cost_price).map(l => ({
          item_id: l.item_id,
          quantity: parseFloat(l.quantity),
          cost_price: parseFloat(l.cost_price),
        })),
        items,
      })
      setShowModal(false)
      setLines([{ item_id: '', quantity: '', cost_price: '' }])
      setForm({ return_type: 'sales', ref_invoice_id: '', reason: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const invoiceOptions = form.return_type === 'sales' ? salesInvoices : purchaseInvoices

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المرتجعات</h1>
          <p className="page-subtitle">إدارة مرتجعات المبيعات والمشتريات</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(null); setShowModal(true) }} id="return-create-btn">
          <Plus size={16} /> مرتجع جديد
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>النوع</th><th>السبب</th><th>التاريخ</th><th>البنود</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : visibleReturns.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد مرتجعات</td></tr>
            ) : visibleReturns.map(r => (
              <tr key={r.id}>
                <td>
                  <span className={`badge ${r.return_type === 'sales' ? 'badge-completed' : 'badge-shipped'}`}>
                    {r.return_type === 'sales' ? 'مبيعات' : 'مشتريات'}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{r.reason ?? '—'}</td>
                <td style={{ fontSize: 13 }}>{formatDate(r.return_date)}</td>
                <td style={{ fontSize: 13 }}>{(r.items ?? []).length} صنف</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationFooter page={page} pageCount={pageCount} pageSize={pageSize} total={total} start={start} setPage={setPage} setPageSize={setPageSize} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 660 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">مرتجع جديد</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">نوع المرتجع</label>
                    <select className="form-select" value={form.return_type} onChange={e => setForm(f => ({ ...f, return_type: e.target.value as 'sales' | 'purchase', ref_invoice_id: '' }))}>
                      <option value="sales">مرتجع مبيعات</option>
                      <option value="purchase">مرتجع مشتريات</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الفاتورة المرجعية *</label>
                    <select className="form-select" required value={form.ref_invoice_id} onChange={e => setForm(f => ({ ...f, ref_invoice_id: e.target.value }))}>
                      <option value="">— اختر الفاتورة —</option>
                      {invoiceOptions.map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_no}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">السبب</label>
                  <input className="form-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>الأصناف</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13} /> إضافة صنف</button>
                  </div>
                  {lines.map((line, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                      <select className="form-select" value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}>
                        <option value="">— الصنف —</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.item_name}</option>)}
                      </select>
                      <input type="number" min="0.001" step="0.001" className="form-input" placeholder="الكمية" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                      <input type="number" min="0" step="0.0001" className="form-input" placeholder="سعر التكلفة" value={line.cost_price} onChange={e => updateLine(i, 'cost_price', e.target.value)} />
                      <button type="button" className="btn btn-danger btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                {error && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13 }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending} id="return-save-btn">
                  {createMutation.isPending ? 'جاري الحفظ…' : 'إنشاء المرتجع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
