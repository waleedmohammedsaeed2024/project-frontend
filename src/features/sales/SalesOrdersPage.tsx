import { useState, useRef, useEffect } from 'react'
import { Plus, Eye, XCircle, Search, Printer, CheckCircle2, Phone, MapPin, FileText } from 'lucide-react'
import { formatDate, formatCurrency, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from '@/lib/utils'
import { printOrderPDF } from '@/lib/printOrderPDF'
import type { OrderStatus } from '@/lib/database.types'
import { useSalesOrders, useCreateSalesOrder, useCancelSalesOrder, useSalesOrderDetail } from './sales.hooks'
import { useConfirmOrderDelivery } from '@/features/delivery/delivery.hooks'
import { fetchSalesOrderById } from './sales.service'
import { useItems } from '@/features/items/items.hooks'
import { useClients, useCustomersByClient } from '@/features/partners/partners.hooks'

const STATUS_FILTERS = [
  { label: 'الكل', value: '' },
  { label: 'قيد التنفيذ', value: 'o' },
  { label: 'قيد التوصيل', value: 'p' },
  { label: 'تم التسليم', value: 'c' },
  { label: 'ملغى', value: 'd' },
] as const

interface LineItem { item_id: string; packaging_id: string; quantity: string }

// ─── Searchable item dropdown ─────────────────────────────────────────────────
function ItemSearch({
  items,
  value,
  onSelect,
}: {
  items: Array<{ id: string; item_name: string; item_english_name?: string | null; quantity: number }>
  value: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = items.find(i => i.id === value)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = items.filter(i =>
    !query ||
    i.item_name.toLowerCase().includes(query.toLowerCase()) ||
    i.item_english_name?.toLowerCase().includes(query.toLowerCase()),
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
          placeholder={selected ? selected.item_name : 'ابحث عن صنف…'}
          value={selected && !open ? selected.item_name : query}
          onFocus={() => { setOpen(true); if (selected) setQuery('') }}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect('') }}
        />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', insetInlineStart: 0, insetInlineEnd: 0,
          background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 6px 20px oklch(0 0 0 / 0.10)',
          maxHeight: 200, overflowY: 'auto', zIndex: 300,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-muted)' }}>لا توجد نتائج</div>
          ) : filtered.map(i => (
            <div
              key={i.id}
              onMouseDown={() => pick(i.id)}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                background: i.id === value ? 'oklch(0.93 0.05 240 / 0.35)' : 'transparent',
                color: i.id === value ? 'var(--color-primary)' : 'var(--color-text)',
              }}
              onMouseEnter={e => { if (i.id !== value) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-border)' }}
              onMouseLeave={e => { if (i.id !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{i.item_name}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>مخزون: {i.quantity}</span>
              </div>
              {i.item_english_name && (
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{i.item_english_name}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SalesOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const { data: orders = [], isLoading } = useSalesOrders(statusFilter)
  const { data: items = [] } = useItems()
  const { data: clients = [] } = useClients()
  const createMutation = useCreateSalesOrder()
  const cancelMutation = useCancelSalesOrder()
  const confirmDeliveryMutation = useConfirmOrderDelivery()

  // Create modal
  const [showModal, setShowModal] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ client_id: '', customer_id: '', site: '' })
  const [lines, setLines] = useState<LineItem[]>([{ item_id: '', packaging_id: '', quantity: '' }])
  const { data: customers = [] } = useCustomersByClient(form.client_id)

  // Detail dialog
  const [viewingId, setViewingId] = useState<string | null>(null)
  const { data: detailOrder, isLoading: detailLoading } = useSalesOrderDetail(viewingId)

  // Print loading per row
  const [printingId, setPrintingId] = useState<string | null>(null)

  // ── Line helpers ─────────────────────────────────────────────────────────────
  function addLine() { setLines(l => [...l, { item_id: '', packaging_id: '', quantity: '' }]) }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: keyof LineItem, val: string) {
    setLines(l => l.map((ln, idx) => {
      if (idx !== i) return ln
      if (field === 'item_id') return { ...ln, item_id: val, packaging_id: '' }
      return { ...ln, [field]: val }
    }))
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setCreateError(null)
    try {
      await createMutation.mutateAsync({
        client_id: form.client_id,
        customer_id: form.customer_id,
        site: form.site || null,
        lines: lines.filter(l => l.item_id && l.quantity).map(l => ({
          item_id: l.item_id,
          packaging_id: l.packaging_id || null,
          quantity: parseFloat(l.quantity),
        })),
        items,
      })
      setShowModal(false)
      setForm({ client_id: '', customer_id: '', site: '' })
      setLines([{ item_id: '', packaging_id: '', quantity: '' }])
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  async function handleConfirmDelivery(orderId: string) {
    if (!confirm('تأكيد التسليم؟ سيتم خصم المخزون وإنشاء فاتورة مبيعات.')) return
    try {
      await confirmDeliveryMutation.mutateAsync(orderId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  async function handlePrint(orderId: string) {
    setPrintingId(orderId)
    try {
      const order = await fetchSalesOrderById(orderId)
      printOrderPDF(order)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ عند التحميل')
    } finally {
      setPrintingId(null)
    }
  }

  function handlePrintDetail() {
    if (detailOrder) printOrderPDF(detailOrder)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">طلبات البيع</h1>
          <p className="page-subtitle">إنشاء وإدارة طلبات البيع</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCreateError(null); setShowModal(true) }} id="order-create-btn">
          <Plus size={16} /> طلب جديد
        </button>
      </div>

      {/* Status filter tabs */}
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

      {/* Orders table */}
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
            ) : orders.map(o => {
              type WithJoins = { client?: { partner_name: string }; customer?: { partner_name: string } }
              const joined = o as unknown as WithJoins
              return (
                <tr key={o.id}>
                  <td><code style={{ fontSize: 12 }}>{o.id.slice(0, 8)}…</code></td>
                  <td style={{ fontWeight: 500 }}>{joined.client?.partner_name ?? '—'}</td>
                  <td style={{ fontSize: 13 }}>{joined.customer?.partner_name ?? '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{o.site ?? '—'}</td>
                  <td><span className={`badge ${ORDER_STATUS_CLASS[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                  <td style={{ fontSize: 13 }}>{formatDate(o.order_date)}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      {/* Eye — all statuses */}
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="عرض التفاصيل"
                        onClick={() => setViewingId(o.id)}
                      ><Eye size={14} /></button>

                      {/* Confirm delivery — قيد التنفيذ or قيد التوصيل */}
                      {(o.status === 'o' || o.status === 'p') && (
                        <button
                          className="btn btn-primary btn-sm"
                          title="تأكيد التسليم وإنشاء الفاتورة"
                          disabled={confirmDeliveryMutation.isPending}
                          onClick={() => handleConfirmDelivery(o.id)}
                          style={{ gap: 4 }}
                        >
                          <CheckCircle2 size={13} /> تسليم
                        </button>
                      )}

                      {/* Cancel — قيد التنفيذ only */}
                      {o.status === 'o' && (
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          title="إلغاء الطلب"
                          onClick={() => cancelMutation.mutate(o.id)}
                        ><XCircle size={14} /></button>
                      )}

                      {/* Print PDF — تم التسليم only */}
                      {o.status === 'c' && (
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="طباعة PDF"
                          disabled={printingId === o.id}
                          onClick={() => handlePrint(o.id)}
                        >
                          {printingId === o.id
                            ? <span style={{ fontSize: 10 }}>…</span>
                            : <Printer size={14} />}
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

      {/* ── Order detail dialog ───────────────────────────────────────────────── */}
      {viewingId && (
        <div className="modal-overlay" onClick={() => setViewingId(null)}>
          <div className="modal" style={{ maxWidth: 780, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                <h2 className="modal-title">
                  {detailLoading ? 'جاري التحميل…' : `تفاصيل الطلب — ${detailOrder?.id.slice(0, 8).toUpperCase() ?? '—'}`}
                </h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewingId(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>جاري تحميل التفاصيل…</div>
              ) : detailOrder ? (() => {
                type Joined = {
                  client?: { partner_name: string; phone_no?: string | null }
                  customer?: { partner_name: string; phone_no?: string | null }
                }
                const j = detailOrder as unknown as Joined
                const lineItems = detailOrder.items ?? []
                const grandTotal = lineItems.reduce((s, l) => s + l.quantity * l.item_price, 0)

                return (
                  <>
                    {/* Info strip */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                      background: 'oklch(0.97 0.01 240 / 0.6)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', padding: '14px 16px',
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>العميل</div>
                        <div style={{ fontWeight: 600 }}>{j.client?.partner_name ?? '—'}</div>
                        {j.client?.phone_no && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Phone size={10} /> {j.client.phone_no}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>الزبون</div>
                        <div style={{ fontWeight: 600 }}>{j.customer?.partner_name ?? '—'}</div>
                        {j.customer?.phone_no && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Phone size={10} /> {j.customer.phone_no}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} /> الموقع / الحالة
                        </div>
                        <div style={{ fontWeight: 500 }}>{detailOrder.site ?? '—'}</div>
                        <span className={`badge ${ORDER_STATUS_CLASS[detailOrder.status]}`} style={{ marginTop: 4, display: 'inline-block' }}>
                          {ORDER_STATUS_LABEL[detailOrder.status]}
                        </span>
                      </div>
                    </div>

                    {/* Line items table */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-heading)' }}>
                        الأصناف ({lineItems.length})
                      </div>
                      {lineItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 13, border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                          لا توجد أصناف
                        </div>
                      ) : (
                        <div className="table-wrapper" style={{ margin: 0 }}>
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>الصنف</th>
                                <th>التعبئة</th>
                                <th style={{ textAlign: 'end' }}>الكمية</th>
                                <th style={{ textAlign: 'end' }}>التكلفة</th>
                                <th style={{ textAlign: 'end' }}>السعر</th>
                                <th style={{ textAlign: 'end' }}>الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lineItems.map((line, idx) => (
                                <tr key={line.id ?? idx}>
                                  <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                                  <td>
                                    <div style={{ fontWeight: 500 }}>{line.item?.item_name ?? '—'}</div>
                                    {line.item?.item_english_name && (
                                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{line.item.item_english_name}</div>
                                    )}
                                  </td>
                                  <td>
                                    {line.packaging ? (
                                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'oklch(0.93 0.05 240 / 0.35)', color: 'oklch(0.35 0.14 240)' }}>
                                        {line.packaging.pack_eng}
                                      </span>
                                    ) : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>}
                                  </td>
                                  <td style={{ textAlign: 'end' }}>{line.quantity}</td>
                                  <td style={{ textAlign: 'end', fontSize: 12, color: 'var(--color-text-muted)' }}>{formatCurrency(line.item_cost, 3)}</td>
                                  <td style={{ textAlign: 'end' }}>{formatCurrency(line.item_price, 3)}</td>
                                  <td style={{ textAlign: 'end', fontWeight: 600, color: 'var(--color-primary)' }}>
                                    {formatCurrency(line.quantity * line.item_price, 3)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'end', fontWeight: 700, fontSize: 14, paddingInlineEnd: 12 }}>الإجمالي الكلي:</td>
                                <td style={{ textAlign: 'end', fontWeight: 700, fontSize: 15, color: 'var(--color-primary)' }}>
                                  {formatCurrency(grandTotal, 3)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )
              })() : null}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewingId(null)}>إغلاق</button>
              {detailOrder?.status === 'c' && (
                <button className="btn btn-primary" onClick={handlePrintDetail}>
                  <Printer size={14} /> طباعة PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create order modal ───────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 720, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">طلب بيع جديد</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Header fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">العميل *</label>
                    <select className="form-select" required value={form.client_id}
                      onChange={e => setForm(f => ({ ...f, client_id: e.target.value, customer_id: '' }))}>
                      <option value="">— اختر العميل —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.partner_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">الزبون *</label>
                    <select className="form-select" required value={form.customer_id}
                      onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                      disabled={!form.client_id}>
                      <option value="">— اختر الزبون —</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.partner_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">الموقع</label>
                    <input className="form-input" value={form.site}
                      onChange={e => setForm(f => ({ ...f, site: e.target.value }))} />
                  </div>
                </div>

                {/* Line items */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 0.8fr auto',
                    gap: 8, padding: '8px 12px',
                    background: 'oklch(0.97 0.01 240 / 0.6)',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
                  }}>
                    <span>الصنف</span><span>التعبئة</span><span>الكمية</span><span>التكلفة</span><span />
                  </div>

                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lines.map((line, i) => {
                      const item = items.find(it => it.id === line.item_id)
                      const availablePkg = item?.item_packaging ?? []
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 0.8fr auto', gap: 8, alignItems: 'center' }}>
                          <ItemSearch items={items} value={line.item_id} onSelect={id => updateLine(i, 'item_id', id)} />
                          <select
                            className="form-select"
                            value={line.packaging_id}
                            disabled={!line.item_id}
                            onChange={e => updateLine(i, 'packaging_id', e.target.value)}
                            style={{ opacity: line.item_id ? 1 : 0.5, fontSize: 13 }}
                          >
                            <option value="">
                              {!line.item_id ? '— الصنف أولاً —'
                                : availablePkg.length === 0 ? '— لا تعبئة —'
                                : '— التعبئة —'}
                            </option>
                            {availablePkg.map(ip => (
                              <option key={ip.packaging_id} value={ip.packaging_id}>
                                {ip.packaging?.pack_eng} / {ip.packaging?.pack_arab}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number" min="0.001" step="0.001" className="form-input"
                            placeholder="الكمية" value={line.quantity}
                            onChange={e => updateLine(i, 'quantity', e.target.value)}
                          />
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'end' }}>
                            {item ? item.avg_cost.toFixed(3) : '—'}
                          </div>
                          <button type="button" className="btn btn-danger btn-icon btn-sm"
                            onClick={() => removeLine(i)} disabled={lines.length === 1}
                            style={{ fontSize: 14 }}>×</button>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border)', background: 'oklch(0.97 0.01 240 / 0.4)' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
                      <Plus size={13} /> إضافة صنف
                    </button>
                  </div>
                </div>

                {createError && (
                  <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13, padding: 10, background: 'oklch(0.95 0.04 20/0.3)', borderRadius: 'var(--radius-md)' }}>
                    {createError}
                  </div>
                )}
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
