import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Eye, Pencil, Search, PackageOpen, Phone, Calendar, Hash, Building2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePurchaseInvoices, useCreatePurchaseInvoice, usePurchaseInvoiceDetail } from './purchase.hooks'
import { useItems } from '@/features/items/items.hooks'
import { useSuppliers } from '@/features/partners/partners.hooks'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineForm {
  item_id: string
  packaging_id: string
  quantity: string
  item_cost: string
  repack_factor: string
}

interface ConfirmedLine {
  item_id: string
  packaging_id: string
  quantity: string
  item_cost: string
  repack_factor: string
}

const EMPTY_LINE: LineForm = { item_id: '', packaging_id: '', quantity: '', item_cost: '', repack_factor: '1' }
const today = () => new Date().toISOString().split('T')[0]

// ─── Searchable item dropdown ──────────────────────────────────────────────────
function ItemSearch({
  items,
  value,
  onSelect,
}: {
  items: Array<{ id: string; item_name: string; item_english_name?: string | null }>
  value: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = items.find(i => i.id === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = items.filter(i =>
    !query ||
    i.item_name.toLowerCase().includes(query.toLowerCase()) ||
    i.item_english_name?.toLowerCase().includes(query.toLowerCase()),
  )

  function pick(id: string) {
    onSelect(id)
    setQuery('')
    setOpen(false)
  }

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
          maxHeight: 220, overflowY: 'auto', zIndex: 200,
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
                fontWeight: i.id === value ? 600 : 400,
              }}
              onMouseEnter={e => { if (i.id !== value) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-border)' }}
              onMouseLeave={e => { if (i.id !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div>{i.item_name}</div>
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
export default function PurchaseInvoicesPage() {
  const { data: invoices = [], isLoading } = usePurchaseInvoices()
  const { data: suppliers = [] } = useSuppliers()
  const { data: items = [] } = useItems()
  const createMutation = useCreatePurchaseInvoice()

  // Detail view
  const [viewingId, setViewingId] = useState<string | null>(null)
  const { data: detailInv, isLoading: detailLoading } = usePurchaseInvoiceDetail(viewingId)

  // Modal visibility
  const [showModal, setShowModal] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Invoice header
  const [header, setHeader] = useState({ supplier_id: '', supplier_inv_no: '', invoice_date: today() })

  // Add / edit line form
  const [lineForm, setLineForm] = useState<LineForm>(EMPTY_LINE)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [lineError, setLineError] = useState<string | null>(null)

  // Confirmed line items
  const [lines, setLines] = useState<ConfirmedLine[]>([])

  // Derived
  const selectedItem = items.find(i => i.id === lineForm.item_id)
  const availablePackaging = selectedItem?.item_packaging ?? []

  function resetLineForm() {
    setLineForm(EMPTY_LINE)
    setEditingIdx(null)
    setLineError(null)
  }

  function handleItemSelect(itemId: string) {
    setLineForm(f => ({ ...f, item_id: itemId, packaging_id: '' }))
  }

  function validateLine(): string | null {
    if (!lineForm.item_id) return 'اختر الصنف'
    if (!lineForm.quantity || parseFloat(lineForm.quantity) <= 0) return 'الكمية يجب أن تكون أكبر من صفر'
    if (!lineForm.item_cost || parseFloat(lineForm.item_cost) < 0) return 'أدخل التكلفة'
    return null
  }

  function addOrUpdateLine() {
    const err = validateLine()
    if (err) { setLineError(err); return }
    setLineError(null)
    if (editingIdx !== null) {
      setLines(ls => ls.map((l, i) => i === editingIdx ? { ...lineForm } : l))
    } else {
      setLines(ls => [...ls, { ...lineForm }])
    }
    resetLineForm()
  }

  function startEdit(idx: number) {
    setLineForm({ ...lines[idx] })
    setEditingIdx(idx)
    setLineError(null)
  }

  function deleteLine(idx: number) {
    setLines(ls => ls.filter((_, i) => i !== idx))
    if (editingIdx === idx) resetLineForm()
  }

  function openModal() {
    setSubmitError(null)
    setHeader({ supplier_id: '', supplier_inv_no: '', invoice_date: today() })
    setLines([])
    resetLineForm()
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!header.supplier_id) { setSubmitError('اختر المورد'); return }
    if (lines.length === 0) { setSubmitError('أضف بنداً على الأقل'); return }
    const supplier = suppliers.find(s => s.id === header.supplier_id)
    if (!supplier) return
    try {
      await createMutation.mutateAsync({
        supplier_id: header.supplier_id,
        supplier_inv_no: header.supplier_inv_no || null,
        invoice_date: header.invoice_date,
        lines: lines.map(l => ({
          item_id: l.item_id,
          packaging_id: l.packaging_id || null,
          quantity: parseFloat(l.quantity),
          item_cost: parseFloat(l.item_cost),
          repack_factor: parseFloat(l.repack_factor) || 1,
        })),
        items,
        supplier,
      })
      setShowModal(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const invoiceTotal = lines.reduce(
    (sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.item_cost) || 0),
    0,
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">فواتير الشراء</h1>
          <p className="page-subtitle">تسجيل المشتريات من الموردين وتحديث المخزون</p>
        </div>
        <button className="btn btn-primary" onClick={openModal} id="purchase-create-btn">
          <Plus size={16} /> فاتورة جديدة
        </button>
      </div>

      {/* Invoice list table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>المورد</th>
              <th>مرجع المورد</th>
              <th>التاريخ</th>
              <th style={{ textAlign: 'end' }}>الإجمالي</th>
              <th style={{ textAlign: 'end' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد فواتير</td></tr>
            ) : invoices.map(inv => {
              const total = inv.items?.reduce((s, it) => s + it.quantity * it.item_cost, 0) ?? 0
              return (
              <tr key={inv.id}>
                <td><code style={{ fontSize: 13, fontWeight: 600 }}>{inv.invoice_no}</code></td>
                <td style={{ fontWeight: 500 }}>{(inv as unknown as { supplier?: { partner_name: string } }).supplier?.partner_name ?? '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{inv.supplier_inv_no ?? '—'}</td>
                <td style={{ fontSize: 13 }}>{formatDate(inv.invoice_date)}</td>
                <td style={{ textAlign: 'end', fontWeight: 600, color: 'var(--color-primary)' }}>{formatCurrency(total)}</td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      aria-label="عرض"
                      onClick={() => setViewingId(inv.id)}
                    ><Eye size={14} /></button>
                  </div>
                </td>
              </tr>
            )})}

          </tbody>
        </table>
      </div>

      {/* ── Create invoice modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 820, width: '95vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">فاتورة شراء جديدة</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── Invoice header ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">المورد *</label>
                    <select
                      className="form-select" required
                      value={header.supplier_id}
                      onChange={e => setHeader(h => ({ ...h, supplier_id: e.target.value }))}
                    >
                      <option value="">— اختر المورد —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.partner_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">مرجع المورد</label>
                    <input
                      className="form-input"
                      placeholder="INV-123"
                      value={header.supplier_inv_no}
                      onChange={e => setHeader(h => ({ ...h, supplier_inv_no: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">التاريخ</label>
                    <input
                      type="date" className="form-input"
                      value={header.invoice_date}
                      onChange={e => setHeader(h => ({ ...h, invoice_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* ── Add / edit line block ── */}
                <div style={{
                  background: 'oklch(0.97 0.01 240 / 0.6)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PackageOpen size={14} />
                    {editingIdx !== null ? `تعديل البند رقم ${editingIdx + 1}` : 'إضافة بند'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.7fr', gap: 10, alignItems: 'end' }}>
                    {/* Item search */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>الصنف</label>
                      <ItemSearch
                        items={items}
                        value={lineForm.item_id}
                        onSelect={handleItemSelect}
                      />
                    </div>

                    {/* Packaging select — dependent on item */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>التعبئة</label>
                      <select
                        className="form-select"
                        value={lineForm.packaging_id}
                        disabled={!lineForm.item_id}
                        onChange={e => setLineForm(f => ({ ...f, packaging_id: e.target.value }))}
                        style={{ opacity: lineForm.item_id ? 1 : 0.5 }}
                      >
                        <option value="">
                          {lineForm.item_id
                            ? availablePackaging.length === 0 ? '— لا توجد تعبئة —' : '— اختر التعبئة —'
                            : '— اختر الصنف أولاً —'}
                        </option>
                        {availablePackaging.map(ip => (
                          <option key={ip.packaging_id} value={ip.packaging_id}>
                            {ip.packaging?.pack_eng} / {ip.packaging?.pack_arab}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>الكمية</label>
                      <input
                        type="number" min="0.001" step="0.001" className="form-input"
                        placeholder="0"
                        value={lineForm.quantity}
                        onChange={e => setLineForm(f => ({ ...f, quantity: e.target.value }))}
                      />
                    </div>

                    {/* Unit cost */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>التكلفة / وحدة</label>
                      <input
                        type="number" min="0" step="0.01" className="form-input"
                        placeholder="0.00"
                        value={lineForm.item_cost}
                        onChange={e => setLineForm(f => ({ ...f, item_cost: e.target.value }))}
                      />
                    </div>

                    {/* Repack factor */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>معامل التعبئة</label>
                      <input
                        type="number" min="0.001" step="0.001" className="form-input"
                        title="1 = بدون إعادة تعبئة"
                        value={lineForm.repack_factor}
                        onChange={e => setLineForm(f => ({ ...f, repack_factor: e.target.value }))}
                      />
                    </div>
                  </div>

                  {lineError && (
                    <div style={{ fontSize: 12, color: 'oklch(0.40 0.14 18)', marginTop: 8 }}>{lineError}</div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    {editingIdx !== null && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={resetLineForm}>
                        إلغاء التعديل
                      </button>
                    )}
                    <button type="button" className="btn btn-primary btn-sm" onClick={addOrUpdateLine}>
                      <Plus size={13} />
                      {editingIdx !== null ? 'حفظ التعديل' : 'إضافة البند'}
                    </button>
                  </div>
                </div>

                {/* ── Line items table ── */}
                {lines.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-heading)' }}>
                      بنود الفاتورة ({lines.length})
                    </div>
                    <div className="table-wrapper" style={{ margin: 0 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>الصنف</th>
                            <th>التعبئة</th>
                            <th style={{ textAlign: 'end' }}>الكمية</th>
                            <th style={{ textAlign: 'end' }}>التكلفة</th>
                            <th style={{ textAlign: 'end' }}>الإجمالي</th>
                            <th style={{ textAlign: 'end' }}>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line, idx) => {
                            const item = items.find(i => i.id === line.item_id)
                            const pkg = item?.item_packaging?.find(ip => ip.packaging_id === line.packaging_id)
                            const qty = parseFloat(line.quantity) || 0
                            const cost = parseFloat(line.item_cost) || 0
                            const isEditing = editingIdx === idx
                            return (
                              <tr key={idx} style={{ background: isEditing ? 'oklch(0.93 0.05 240 / 0.2)' : undefined }}>
                                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                                <td style={{ fontWeight: 500 }}>{item?.item_name ?? '—'}</td>
                                <td>
                                  {pkg ? (
                                    <span style={{
                                      fontSize: 11, fontWeight: 600, padding: '2px 8px',
                                      borderRadius: 999, background: 'oklch(0.93 0.05 240 / 0.35)',
                                      color: 'oklch(0.35 0.14 240)',
                                    }}>
                                      {pkg.packaging?.pack_eng}
                                    </span>
                                  ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'end' }}>{qty}</td>
                                <td style={{ textAlign: 'end' }}>{formatCurrency(cost, 4)}</td>
                                <td style={{ textAlign: 'end', fontWeight: 600, color: 'var(--color-primary)' }}>
                                  {formatCurrency(qty * cost)}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-sm btn-icon"
                                      onClick={() => startEdit(idx)}
                                      title="تعديل"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm btn-icon"
                                      onClick={() => deleteLine(idx)}
                                      title="حذف"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'end', fontWeight: 700, fontSize: 14, paddingInlineEnd: 12 }}>
                              الإجمالي:
                            </td>
                            <td style={{ textAlign: 'end', fontWeight: 700, fontSize: 15, color: 'var(--color-primary)' }}>
                              {formatCurrency(invoiceTotal)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {lines.length === 0 && (
                  <div style={{
                    textAlign: 'center', padding: '20px 0',
                    color: 'var(--color-text-muted)', fontSize: 13,
                    border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
                  }}>
                    لا توجد بنود بعد — أضف بنداً من الحقل أعلاه
                  </div>
                )}

                {submitError && (
                  <div style={{
                    color: 'oklch(0.40 0.14 18)', fontSize: 13,
                    padding: '10px 14px', background: 'oklch(0.95 0.04 20/0.3)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    {submitError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button
                  type="submit" className="btn btn-primary"
                  disabled={createMutation.isPending || lines.length === 0}
                  id="purchase-save-btn"
                >
                  {createMutation.isPending ? 'جاري الحفظ…' : `إنشاء الفاتورة (${lines.length} بند)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Invoice detail dialog ── */}
      {viewingId && (
        <div className="modal-overlay" onClick={() => setViewingId(null)}>
          <div
            className="modal"
            style={{ maxWidth: 760, width: '95vw' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Hash size={16} style={{ color: 'var(--color-primary)' }} />
                <h2 className="modal-title">
                  {detailLoading ? 'جاري التحميل…' : detailInv?.invoice_no ?? '—'}
                </h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewingId(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  جاري تحميل التفاصيل…
                </div>
              ) : detailInv ? (() => {
                const supplier = (detailInv as unknown as { supplier?: { partner_name: string; phone_no?: string | null } }).supplier
                const lineItems = detailInv.items ?? []
                const grandTotal = lineItems.reduce((s, it) => s + it.quantity * it.item_cost, 0)
                return (
                  <>
                    {/* Info strip */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                      background: 'oklch(0.97 0.01 240 / 0.6)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={11} /> المورد
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{supplier?.partner_name ?? '—'}</div>
                        {supplier?.phone_no && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Phone size={10} /> {supplier.phone_no}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>مرجع المورد</div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{detailInv.supplier_inv_no ?? '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} /> التاريخ
                        </div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{formatDate(detailInv.invoice_date)}</div>
                      </div>
                    </div>

                    {/* Line items */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-heading)' }}>
                        بنود الفاتورة ({lineItems.length})
                      </div>
                      {lineItems.length === 0 ? (
                        <div style={{
                          textAlign: 'center', padding: '20px 0',
                          color: 'var(--color-text-muted)', fontSize: 13,
                          border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
                        }}>لا توجد بنود</div>
                      ) : (
                        <div className="table-wrapper" style={{ margin: 0 }}>
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>الصنف</th>
                                <th>التعبئة</th>
                                <th style={{ textAlign: 'end' }}>الكمية</th>
                                <th style={{ textAlign: 'end' }}>م. التعبئة</th>
                                <th style={{ textAlign: 'end' }}>التكلفة / وحدة</th>
                                <th style={{ textAlign: 'end' }}>الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lineItems.map((line, idx) => {
                                const lineTotal = line.quantity * line.item_cost
                                return (
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
                                        <span style={{
                                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                                          borderRadius: 999, background: 'oklch(0.93 0.05 240 / 0.35)',
                                          color: 'oklch(0.35 0.14 240)',
                                        }}>
                                          {line.packaging.pack_eng}
                                        </span>
                                      ) : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>}
                                    </td>
                                    <td style={{ textAlign: 'end' }}>{line.quantity}</td>
                                    <td style={{ textAlign: 'end', color: 'var(--color-text-muted)', fontSize: 13 }}>{line.repack_factor}×</td>
                                    <td style={{ textAlign: 'end' }}>{formatCurrency(line.item_cost, 4)}</td>
                                    <td style={{ textAlign: 'end', fontWeight: 600, color: 'var(--color-primary)' }}>
                                      {formatCurrency(lineTotal)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'end', fontWeight: 700, fontSize: 14, paddingInlineEnd: 12 }}>
                                  الإجمالي الكلي:
                                </td>
                                <td style={{ textAlign: 'end', fontWeight: 700, fontSize: 15, color: 'var(--color-primary)' }}>
                                  {formatCurrency(grandTotal)}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
