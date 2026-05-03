import { useEffect, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSalesInvoices, useSalesInvoiceLines } from './invoices.hooks'
import { usePagination, PaginationFooter } from '@/components/Pagination'
import type { SalesInvoice } from '@/lib/database.types'

export default function SalesInvoicesPage() {
  const { data: invoices = [], isLoading, isError, error } = useSalesInvoices()
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<SalesInvoice | null>(null)
  const viewingOrderId = (viewing as unknown as { sales_order_id?: string } | null)?.sales_order_id ?? null
  const { data: viewingLines = [], isLoading: linesLoading } = useSalesInvoiceLines(viewingOrderId)

  const q = search.trim().toLowerCase()
  const filtered = q ? invoices.filter(inv => {
    const so = (inv as unknown as { sales_order?: { client?: { partner_name?: string }; customer?: { partner_name?: string } } }).sales_order
    return (
      inv.invoice_no.toLowerCase().includes(q) ||
      (so?.client?.partner_name ?? '').toLowerCase().includes(q) ||
      (so?.customer?.partner_name ?? '').toLowerCase().includes(q)
    )
  }) : invoices

  const { visible, page, setPage, pageSize, setPageSize, pageCount, total, start, resetToFirst } = usePagination(filtered, 20)
  useEffect(() => { resetToFirst() }, [q, pageSize, resetToFirst])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">فواتير المبيعات</h1>
          <p className="page-subtitle">عرض وإدارة فواتير المبيعات</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
        <Search size={14} style={{
          position: 'absolute', insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-text-muted)', pointerEvents: 'none',
        }} />
        <input
          className="form-input"
          style={{ paddingInlineStart: 32 }}
          placeholder="ابحث برقم الفاتورة أو العميل أو الزبون…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة</th><th>العميل</th><th>الزبون</th>
              <th style={{ textAlign: 'end' }}>الإجمالي</th>
              <th style={{ textAlign: 'end' }}>الإجمالي + ضريبة 15%</th>
              <th>التاريخ</th><th>الحالة</th>
              <th style={{ textAlign: 'end' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : isError ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'oklch(0.40 0.14 18)' }}>{error instanceof Error ? error.message : 'حدث خطأ أثناء تحميل الفواتير'}</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد فواتير</td></tr>
            ) : visible.map(inv => {
              const so = (inv as unknown as { sales_order?: { client?: { partner_name: string }; customer?: { partner_name: string } } }).sales_order
              return (
                <tr key={inv.id}>
                  <td><code style={{ fontSize: 13, fontWeight: 600 }}>{inv.invoice_no}</code></td>
                  <td style={{ fontWeight: 500 }}>{so?.client?.partner_name ?? '—'}</td>
                  <td style={{ fontSize: 13 }}>{so?.customer?.partner_name ?? '—'}</td>
                  <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(inv.total_amount)}</td>
                  <td style={{ textAlign: 'end', fontWeight: 700, color: 'oklch(0.55 0.15 145)' }}>{formatCurrency(inv.total_amount * 1.15)}</td>
                  <td style={{ fontSize: 13 }}>{formatDate(inv.invoice_date)}</td>
                  <td>
                    {inv.is_cancelled
                      ? <span className="badge badge-cancelled">ملغاة</span>
                      : <span className="badge badge-completed">فعّالة</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="عرض التفاصيل" onClick={() => setViewing(inv)}>
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <PaginationFooter page={page} pageCount={pageCount} pageSize={pageSize} total={total} start={start} setPage={setPage} setPageSize={setPageSize} />

      {/* ── Detail dialog ─────────────────────────────────────────────────── */}
      {viewing && (() => {
        const so = (viewing as unknown as { sales_order?: { client?: { partner_name?: string }; customer?: { partner_name?: string } } }).sales_order
        const grandTotal = viewingLines.reduce((s, l) => s + l.quantity * l.item_price, 0)
        return (
          <div className="modal-overlay" onClick={() => setViewing(null)}>
            <div className="modal" style={{ maxWidth: 920, width: '95vw' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">تفاصيل الفاتورة — <code style={{ fontSize: 14 }}>{viewing.invoice_no}</code></h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewing(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                  background: 'oklch(0.97 0.01 240 / 0.6)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: '14px 16px',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>العميل</div>
                    <div style={{ fontWeight: 600 }}>{so?.client?.partner_name ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>الزبون</div>
                    <div style={{ fontWeight: 600 }}>{so?.customer?.partner_name ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>التاريخ</div>
                    <div style={{ fontWeight: 500 }}>{formatDate(viewing.invoice_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>الحالة</div>
                    {viewing.is_cancelled
                      ? <span className="badge badge-cancelled">ملغاة</span>
                      : <span className="badge badge-completed">فعّالة</span>}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>الأصناف ({viewingLines.length})</div>
                  {linesLoading ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>جاري تحميل الأصناف…</div>
                  ) : viewingLines.length === 0 ? (
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
                            <th style={{ width: 90, textAlign: 'end' }}>الكمية</th>
                            <th style={{ width: 100, textAlign: 'end' }}>التكلفة</th>
                            <th style={{ width: 100, textAlign: 'end' }}>السعر</th>
                            <th style={{ width: 120, textAlign: 'end' }}>الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingLines.map((l, i) => (
                            <tr key={l.id}>
                              <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                              <td style={{ fontWeight: 500 }}>{l.item_name}</td>
                              <td>
                                {l.packaging_label
                                  ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'oklch(0.93 0.05 240 / 0.35)', color: 'oklch(0.35 0.14 240)' }}>{l.packaging_label}</span>
                                  : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'end' }}>{l.quantity}</td>
                              <td style={{ textAlign: 'end', fontSize: 12, color: 'var(--color-text-muted)' }}>{formatCurrency(l.item_cost, 3)}</td>
                              <td style={{ textAlign: 'end' }}>{formatCurrency(l.item_price, 3)}</td>
                              <td style={{ textAlign: 'end', fontWeight: 600, color: 'var(--color-primary)' }}>{formatCurrency(l.quantity * l.item_price, 3)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'end', fontWeight: 700, paddingInlineEnd: 12 }}>الإجمالي الكلي:</td>
                            <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(grandTotal, 3)}</td>
                          </tr>
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'end', fontWeight: 700, paddingInlineEnd: 12 }}>الإجمالي + ضريبة 15%:</td>
                            <td style={{ textAlign: 'end', fontWeight: 700, color: 'oklch(0.55 0.15 145)' }}>{formatCurrency(viewing.total_amount * 1.15, 3)}</td>
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
    </div>
  )
}
