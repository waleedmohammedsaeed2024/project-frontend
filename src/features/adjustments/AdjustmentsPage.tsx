import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useAdjustments, useCreateAdjustment } from './adjustments.hooks'
import { useItems } from '@/features/items/items.hooks'
import { usePagination, PaginationFooter } from '@/components/Pagination'

type Direction = 'in' | 'out'
interface LineItem {
  item_id: string
  packaging_id: string
  direction: Direction
  quantity: string
  cost_price: string
}

const EMPTY_LINE: LineItem = { item_id: '', packaging_id: '', direction: 'in', quantity: '', cost_price: '' }

export default function AdjustmentsPage() {
  const { data: adjustments = [], isLoading } = useAdjustments()
  const { data: items = [] } = useItems()
  const createMutation = useCreateAdjustment()

  const { visible: visibleAdjustments, page, setPage, pageSize, setPageSize, pageCount, total, start } = usePagination(adjustments, 20)

  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }])

  function addLine() { setLines(l => [...l, { ...EMPTY_LINE }]) }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: keyof LineItem, val: string) {
    setLines(l => l.map((ln, idx) => {
      if (idx !== i) return ln
      if (field === 'item_id') return { ...ln, item_id: val, packaging_id: '' }
      return { ...ln, [field]: val }
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const valid = lines.filter(l => l.item_id && l.quantity)
      const payload = valid.map(l => {
        const qtyAbs = Math.abs(parseFloat(l.quantity))
        const signed = l.direction === 'in' ? qtyAbs : -qtyAbs
        return {
          item_id: l.item_id,
          packaging_id: l.packaging_id || null,
          quantity: signed,
          cost_price: parseFloat(l.cost_price) || 0,
        }
      })
      await createMutation.mutateAsync({ reason, lines: payload, items })
      setShowModal(false)
      setReason('')
      setLines([{ ...EMPTY_LINE }])
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
            ) : visibleAdjustments.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد تعديلات</td></tr>
            ) : visibleAdjustments.map(adj => (
              <tr key={adj.id}>
                <td style={{ fontWeight: 500 }}>{adj.reason}</td>
                <td style={{ fontSize: 13 }}>{formatDate(adj.adjustment_date)}</td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{(adj.items ?? []).length} صنف</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationFooter page={page} pageCount={pageCount} pageSize={pageSize} total={total} start={start} setPage={setPage} setPageSize={setPageSize} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
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
                    اختر الصنف والتعبئة، ثم اختر (+) لزيادة المخزون أو (−) لتخفيضه
                  </div>
                  {lines.map((line, i) => {
                    const item = items.find(it => it.id === line.item_id)
                    const availablePkg = item?.item_packaging ?? []
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 0.8fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                        <select className="form-select" value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}>
                          <option value="">— الصنف —</option>
                          {items.map(it => <option key={it.id} value={it.id}>{it.item_name} (إجمالي: {it.quantity})</option>)}
                        </select>

                        <select
                          className="form-select"
                          value={line.packaging_id}
                          disabled={!line.item_id}
                          onChange={e => updateLine(i, 'packaging_id', e.target.value)}
                          style={{ opacity: line.item_id ? 1 : 0.5 }}
                        >
                          <option value="">
                            {!line.item_id ? '— الصنف أولاً —'
                              : availablePkg.length === 0 ? '— بدون تعبئة —'
                              : '— التعبئة —'}
                          </option>
                          {availablePkg.map(ip => (
                            <option key={ip.packaging_id} value={ip.packaging_id}>
                              {ip.packaging?.pack_arab ?? ip.packaging?.pack_eng}
                            </option>
                          ))}
                        </select>

                        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                          {(['in', 'out'] as const).map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => updateLine(i, 'direction', d)}
                              style={{
                                flex: 1,
                                padding: '8px 0',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 16,
                                background: line.direction === d
                                  ? (d === 'in' ? 'oklch(0.65 0.16 145)' : 'oklch(0.62 0.18 25)')
                                  : 'transparent',
                                color: line.direction === d ? 'white' : 'var(--color-text-muted)',
                              }}
                            >{d === 'in' ? '+' : '−'}</button>
                          ))}
                        </div>

                        <input
                          type="number" min="0.001" step="0.001" className="form-input"
                          placeholder="الكمية" value={line.quantity}
                          onChange={e => updateLine(i, 'quantity', e.target.value)}
                        />

                        <input
                          type="number" min="0" step="0.0001" className="form-input"
                          placeholder="سعر التكلفة" value={line.cost_price}
                          onChange={e => updateLine(i, 'cost_price', e.target.value)}
                        />

                        <button type="button" className="btn btn-danger btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 size={14} /></button>
                      </div>
                    )
                  })}
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
