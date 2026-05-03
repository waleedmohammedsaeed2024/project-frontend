import { useState } from 'react'
import { Plus, Trash2, Eye } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useAdjustments, useCreateAdjustment } from './adjustments.hooks'
import { useItems } from '@/features/items/items.hooks'
import { usePagination, PaginationFooter } from '@/components/Pagination'
import type { Adjustment } from '@/lib/database.types'

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
  const { data: adjustments = [], isLoading, isError, error: adjustmentsError } = useAdjustments()
  const { data: items = [] } = useItems()
  const createMutation = useCreateAdjustment()

  const { visible: visibleAdjustments, page, setPage, pageSize, setPageSize, pageCount, total, start } = usePagination(adjustments, 20)

  const [showModal, setShowModal] = useState(false)
  const [viewing, setViewing] = useState<Adjustment | null>(null)
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
            <tr><th>السبب</th><th>التاريخ</th><th>عدد الأصناف</th><th style={{ textAlign: 'end' }}>الإجراءات</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : isError ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'oklch(0.40 0.14 18)' }}>{adjustmentsError instanceof Error ? adjustmentsError.message : 'حدث خطأ أثناء تحميل التعديلات'}</td></tr>
            ) : visibleAdjustments.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد تعديلات</td></tr>
            ) : visibleAdjustments.map(adj => (
              <tr key={adj.id}>
                <td style={{ fontWeight: 500 }}>{adj.reason}</td>
                <td style={{ fontSize: 13 }}>{formatDate(adj.adjustment_date)}</td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{(adj.items ?? []).length} صنف</td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="عرض التفاصيل" onClick={() => setViewing(adj)}>
                      <Eye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationFooter page={page} pageCount={pageCount} pageSize={pageSize} total={total} start={start} setPage={setPage} setPageSize={setPageSize} />

      {/* ── Detail dialog ─────────────────────────────────────────────────── */}
      {viewing && (() => {
        const lineItems = (viewing.items ?? []) as Array<{
          id?: string
          item_id: string
          packaging_id?: string | null
          quantity: number
          cost_price: number
          item?: { item_name?: string } | null
          packaging?: { pack_arab?: string; pack_eng?: string } | null
        }>
        return (
          <div className="modal-overlay" onClick={() => setViewing(null)}>
            <div className="modal" style={{ maxWidth: 880, width: '95vw' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">تفاصيل التعديل</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewing(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                  background: 'oklch(0.97 0.01 240 / 0.6)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: '14px 16px',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>التاريخ</div>
                    <div style={{ fontWeight: 500 }}>{formatDate(viewing.adjustment_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>السبب</div>
                    <div style={{ fontWeight: 500 }}>{viewing.reason ?? '—'}</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>الأصناف ({lineItems.length})</div>
                  {lineItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      لا توجد أصناف
                    </div>
                  ) : (
                    <div className="table-wrapper" style={{ margin: 0 }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 36 }}>#</th>
                            <th>الصنف</th>
                            <th style={{ width: 130 }}>التعبئة</th>
                            <th style={{ width: 80, textAlign: 'center' }}>الاتجاه</th>
                            <th style={{ width: 100, textAlign: 'end' }}>الكمية</th>
                            <th style={{ width: 110, textAlign: 'end' }}>التكلفة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((l, i) => {
                            const pkgLabel = l.packaging?.pack_arab ?? l.packaging?.pack_eng ?? null
                            const isIncrease = l.quantity > 0
                            return (
                              <tr key={l.id ?? `${l.item_id}-${i}`}>
                                <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                                <td style={{ fontWeight: 500 }}>{l.item?.item_name ?? '—'}</td>
                                <td>
                                  {pkgLabel
                                    ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'oklch(0.93 0.05 240 / 0.35)', color: 'oklch(0.35 0.14 240)' }}>{pkgLabel}</span>
                                    : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{
                                    display: 'inline-block', width: 26, height: 26, lineHeight: '26px',
                                    borderRadius: 999, fontWeight: 700,
                                    background: isIncrease ? 'oklch(0.65 0.16 145)' : 'oklch(0.62 0.18 25)',
                                    color: 'white',
                                  }}>{isIncrease ? '+' : '−'}</span>
                                </td>
                                <td style={{ textAlign: 'end', fontWeight: 600 }}>{Math.abs(l.quantity)}</td>
                                <td style={{ textAlign: 'end', fontSize: 12, color: 'var(--color-text-muted)' }}>{formatCurrency(l.cost_price, 3)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setViewing(null)}>إغلاق</button>
              </div>
            </div>
          </div>
        )
      })()}

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
