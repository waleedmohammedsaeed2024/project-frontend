import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, Eye } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  useReturns,
  useSalesInvoicesForReturn,
  usePurchaseInvoicesForReturn,
  useInvoiceLinesForReturn,
  useCreateReturn,
} from './returns.hooks'
import { useItems } from '@/features/items/items.hooks'
import { usePagination, PaginationFooter } from '@/components/Pagination'
import type { InvoiceListItem } from './returns.service'
import type { Return } from '@/lib/database.types'

// ─── Searchable invoice dropdown ────────────────────────────────────────────
function InvoiceSearch({
  invoices,
  value,
  onSelect,
  placeholder = 'ابحث عن فاتورة…',
}: {
  invoices: InvoiceListItem[]
  value: string
  onSelect: (id: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = invoices.find(i => i.id === value)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = invoices.filter(i =>
    !query ||
    i.invoice_no.toLowerCase().includes(query.toLowerCase()) ||
    i.partner_name.toLowerCase().includes(query.toLowerCase()),
  )

  function pick(id: string) { onSelect(id); setQuery(''); setOpen(false) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{
          position: 'absolute', insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-text-muted)', pointerEvents: 'none',
        }} />
        <input
          className="form-input"
          style={{ paddingInlineStart: 30 }}
          placeholder={selected ? `${selected.invoice_no} — ${selected.partner_name}` : placeholder}
          value={selected && !open ? `${selected.invoice_no} — ${selected.partner_name}` : query}
          onFocus={() => { setOpen(true); if (selected) setQuery('') }}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect('') }}
        />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', insetInlineStart: 0, insetInlineEnd: 0,
          background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 6px 20px oklch(0 0 0 / 0.10)',
          maxHeight: 240, overflowY: 'auto', zIndex: 300,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-muted)' }}>لا توجد نتائج</div>
          ) : filtered.map(i => (
            <div
              key={i.id}
              onMouseDown={() => pick(i.id)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                background: i.id === value ? 'oklch(0.93 0.05 240 / 0.35)' : 'transparent',
                borderBottom: '1px solid var(--color-border)',
              }}
              onMouseEnter={e => { if (i.id !== value) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-border)' }}
              onMouseLeave={e => { if (i.id !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{i.invoice_no}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(i.invoice_date)}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{i.partner_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReturnsPage() {
  const { data: returns = [], isLoading, isError, error: returnsError } = useReturns()
  const { data: items = [] } = useItems()
  const { data: salesInvoices = [] } = useSalesInvoicesForReturn()
  const { data: purchaseInvoices = [] } = usePurchaseInvoicesForReturn()
  const createMutation = useCreateReturn()

  const { visible: visibleReturns, page, setPage, pageSize, setPageSize, pageCount, total, start } = usePagination(returns, 20)

  const [showModal, setShowModal] = useState(false)
  const [viewing, setViewing] = useState<Return | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [returnType, setReturnType] = useState<'sales' | 'purchase'>('sales')
  const [refInvoiceId, setRefInvoiceId] = useState('')
  const [reason, setReason] = useState('')
  // Map keyed by `${item_id}|${packaging_id ?? ''}` → returned-quantity string
  const [returnedQty, setReturnedQty] = useState<Record<string, string>>({})

  const invoiceOptions = returnType === 'sales' ? salesInvoices : purchaseInvoices
  const { data: invoiceLines = [], isLoading: linesLoading } = useInvoiceLinesForReturn(returnType, refInvoiceId)

  // Reset returned-qty map whenever the invoice changes
  useEffect(() => { setReturnedQty({}) }, [refInvoiceId])

  function lineKey(itemId: string, packagingId: string | null) {
    return `${itemId}|${packagingId ?? ''}`
  }

  function setLineQty(key: string, val: string) {
    setReturnedQty(m => ({ ...m, [key]: val }))
  }

  function resetForm() {
    setReturnType('sales')
    setRefInvoiceId('')
    setReason('')
    setReturnedQty({})
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!refInvoiceId) { setError('اختر الفاتورة المرجعية'); return }

    const lines = invoiceLines
      .map(l => {
        const key = lineKey(l.item_id, l.packaging_id)
        const qty = parseFloat(returnedQty[key] ?? '')
        return { line: l, qty: Number.isFinite(qty) ? qty : 0 }
      })
      .filter(x => x.qty > 0)

    if (lines.length === 0) { setError('أدخل كمية مرتجع لصنف واحد على الأقل'); return }

    // Validate: returned qty cannot exceed original line qty
    const exceeded = lines.find(({ line, qty }) => qty > line.quantity)
    if (exceeded) {
      const pkg = exceeded.line.packaging_label ? ` (${exceeded.line.packaging_label})` : ''
      setError(`الكمية المرتجعة للصنف "${exceeded.line.item_name}"${pkg} تتجاوز كمية الفاتورة (${exceeded.line.quantity})`)
      return
    }

    try {
      await createMutation.mutateAsync({
        return_type: returnType,
        ref_invoice_id: refInvoiceId,
        reason: reason || undefined,
        lines: lines.map(({ line, qty }) => ({
          item_id: line.item_id,
          packaging_id: line.packaging_id,
          quantity: qty,
          cost_price: line.cost_price,
        })),
        items,
      })
      setShowModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  // Memoise visible invoice list (search is local to InvoiceSearch component)
  const memoInvoices = useMemo(() => invoiceOptions, [invoiceOptions])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المرتجعات</h1>
          <p className="page-subtitle">إدارة مرتجعات المبيعات والمشتريات</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }} id="return-create-btn">
          <Plus size={16} /> مرتجع جديد
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>النوع</th><th>السبب</th><th>التاريخ</th><th>البنود</th><th style={{ textAlign: 'end' }}>الإجراءات</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : isError ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'oklch(0.40 0.14 18)' }}>{returnsError instanceof Error ? returnsError.message : 'حدث خطأ أثناء تحميل المرتجعات'}</td></tr>
            ) : visibleReturns.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد مرتجعات</td></tr>
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
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="عرض التفاصيل" onClick={() => setViewing(r)}>
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
        const grandTotal = lineItems.reduce((s, l) => s + l.quantity * l.cost_price, 0)
        return (
          <div className="modal-overlay" onClick={() => setViewing(null)}>
            <div className="modal" style={{ maxWidth: 880, width: '95vw' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  تفاصيل المرتجع — {viewing.return_type === 'sales' ? 'مبيعات' : 'مشتريات'}
                </h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewing(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                  background: 'oklch(0.97 0.01 240 / 0.6)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: '14px 16px',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>النوع</div>
                    <span className={`badge ${viewing.return_type === 'sales' ? 'badge-completed' : 'badge-shipped'}`}>
                      {viewing.return_type === 'sales' ? 'مبيعات' : 'مشتريات'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>التاريخ</div>
                    <div style={{ fontWeight: 500 }}>{formatDate(viewing.return_date)}</div>
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
                            <th style={{ width: 100, textAlign: 'end' }}>الكمية</th>
                            <th style={{ width: 110, textAlign: 'end' }}>التكلفة</th>
                            <th style={{ width: 120, textAlign: 'end' }}>الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((l, i) => {
                            const pkgLabel = l.packaging?.pack_arab ?? l.packaging?.pack_eng ?? null
                            return (
                              <tr key={l.id ?? `${l.item_id}-${i}`}>
                                <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                                <td style={{ fontWeight: 500 }}>{l.item?.item_name ?? '—'}</td>
                                <td>
                                  {pkgLabel
                                    ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'oklch(0.93 0.05 240 / 0.35)', color: 'oklch(0.35 0.14 240)' }}>{pkgLabel}</span>
                                    : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'end' }}>{l.quantity}</td>
                                <td style={{ textAlign: 'end', fontSize: 12, color: 'var(--color-text-muted)' }}>{formatCurrency(l.cost_price, 3)}</td>
                                <td style={{ textAlign: 'end', fontWeight: 600, color: 'var(--color-primary)' }}>{formatCurrency(l.quantity * l.cost_price, 3)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'end', fontWeight: 700, paddingInlineEnd: 12 }}>الإجمالي الكلي:</td>
                            <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(grandTotal, 3)}</td>
                          </tr>
                        </tfoot>
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
          <div className="modal" style={{ maxWidth: 960, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">مرتجع جديد</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">نوع المرتجع</label>
                    <select className="form-select" value={returnType} onChange={e => { setReturnType(e.target.value as 'sales' | 'purchase'); setRefInvoiceId('') }}>
                      <option value="sales">مرتجع مبيعات</option>
                      <option value="purchase">مرتجع مشتريات</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">الفاتورة المرجعية *</label>
                    <InvoiceSearch
                      invoices={memoInvoices}
                      value={refInvoiceId}
                      onSelect={setRefInvoiceId}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">السبب</label>
                  <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب المرتجع (اختياري)" />
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>أصناف الفاتورة</div>
                  {!refInvoiceId ? (
                    <div style={{ padding: 24, textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      اختر فاتورة لعرض أصنافها
                    </div>
                  ) : linesLoading ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>جاري تحميل الأصناف…</div>
                  ) : invoiceLines.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>لا توجد أصناف في هذه الفاتورة</div>
                  ) : (
                    <div className="table-wrapper" style={{ margin: 0 }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 36 }}>#</th>
                            <th>الصنف</th>
                            <th style={{ width: 130 }}>التعبئة</th>
                            <th style={{ width: 100, textAlign: 'end' }}>كمية الفاتورة</th>
                            <th style={{ width: 110, textAlign: 'end' }}>التكلفة</th>
                            <th style={{ width: 140, textAlign: 'end' }}>الكمية المرتجعة *</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceLines.map((l, i) => {
                            const key = lineKey(l.item_id, l.packaging_id)
                            return (
                              <tr key={key}>
                                <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                                <td style={{ fontWeight: 500 }}>{l.item_name}</td>
                                <td style={{ fontSize: 13 }}>
                                  {l.packaging_label
                                    ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'oklch(0.93 0.05 240 / 0.35)', color: 'oklch(0.35 0.14 240)' }}>{l.packaging_label}</span>
                                    : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'end', fontSize: 13 }}>{l.quantity}</td>
                                <td style={{ textAlign: 'end', fontSize: 13, color: 'var(--color-text-muted)' }}>{l.cost_price.toFixed(3)}</td>
                                <td style={{ textAlign: 'end' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max={l.quantity}
                                    step="0.001"
                                    className="form-input"
                                    style={{ textAlign: 'end' }}
                                    placeholder="0"
                                    value={returnedQty[key] ?? ''}
                                    onChange={e => setLineQty(key, e.target.value)}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {error && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13, padding: 10, background: 'oklch(0.95 0.04 20/0.3)', borderRadius: 'var(--radius-md)', marginTop: 12 }}>{error}</div>}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || !refInvoiceId} id="return-save-btn">
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
