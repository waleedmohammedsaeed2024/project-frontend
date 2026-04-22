import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useAdjustments, useCreateAdjustment } from './adjustments.hooks'
import { useItems } from '@/features/items/items.hooks'

interface LineItem { item_id: string; quantity: string; cost_price: string }

export default function AdjustmentsPage() {
  const { data: adjustments = [], isLoading } = useAdjustments()
  const { data: items = [] } = useItems()
  const createMutation = useCreateAdjustment()

  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ item_id: '', quantity: '', cost_price: '' }])

  function addLine() { setLines(l => [...l, { item_id: '', quantity: '', cost_price: '' }]) }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: keyof LineItem, val: string) {
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createMutation.mutateAsync({
        reason,
        lines: lines.filter(l => l.item_id && l.quantity && l.cost_price).map(l => ({
          item_id: l.item_id,
          quantity: parseFloat(l.quantity),
          cost_price: parseFloat(l.cost_price),
        })),
        items,
      })
      setShowModal(false)
      setReason('')
      setLines([{ item_id: '', quantity: '', cost_price: '' }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">تعديلات المخزون</h1>
          <p className="page-subtitle">تعديل كميات المخزون مع تحديث متوسط التكلفة</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(null); setShowModal(true) }} id="adjustment-create-btn">
          <Plus size={16} /> تعديل جديد
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>السبب</th><th>التاريخ</th><th>عدد الأصناف</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : adjustments.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد تعديلات</td></tr>
            ) : adjustments.map(adj => (
              <tr key={adj.id}>
                <td style={{ fontWeight: 500 }}>{adj.reason}</td>
                <td style={{ fontSize: 13 }}>{formatDate(adj.adjustment_date)}</td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{(adj.items ?? []).length} صنف</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 660 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">تعديل مخزون جديد</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">السبب *</label>
                  <input className="form-input" required value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب التعديل" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>الأصناف</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13} /> إضافة صنف</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    الكمية يمكن أن تكون سالبة لتخفيض المخزون
                  </div>
                  {lines.map((line, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                      <select className="form-select" value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}>
                        <option value="">— الصنف —</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.item_name} (المخزون: {it.quantity})</option>)}
                      </select>
                      <input type="number" step="0.001" className="form-input" placeholder="الكمية (±)" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                      <input type="number" min="0" step="0.0001" className="form-input" placeholder="سعر التكلفة" value={line.cost_price} onChange={e => updateLine(i, 'cost_price', e.target.value)} />
                      <button type="button" className="btn btn-danger btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                {error && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13, padding: 10, background: 'oklch(0.95 0.04 20/0.3)', borderRadius: 'var(--radius-md)' }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending} id="adjustment-save-btn">
                  {createMutation.isPending ? 'جاري الحفظ…' : 'إنشاء التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
