import { useState } from 'react'
import { Plus, Trash2, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePurchaseInvoices, useCreatePurchaseInvoice } from './purchase.hooks'
import { useItems } from '@/features/items/items.hooks'
import { useSuppliers } from '@/features/partners/partners.hooks'
import type { PurchaseInvoice } from '@/lib/database.types'

interface LineItem {
  item_id: string
  quantity: string
  item_cost: string
  repack_factor: string
  description: string
}

export default function PurchaseInvoicesPage() {
  const { data: invoices = [], isLoading } = usePurchaseInvoices()
  const { data: suppliers = [] } = useSuppliers()
  const { data: items = [] } = useItems()
  const createMutation = useCreatePurchaseInvoice()

  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ supplier_id: '', supplier_inv_no: '', invoice_date: new Date().toISOString().split('T')[0] })
  const [lines, setLines] = useState<LineItem[]>([{ item_id: '', quantity: '', item_cost: '', repack_factor: '1', description: '' }])

  function addLine() { setLines(l => [...l, { item_id: '', quantity: '', item_cost: '', repack_factor: '1', description: '' }]) }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: keyof LineItem, val: string) {
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.supplier_id) { setError('اختر المورد'); return }
    const supplier = suppliers.find(s => s.id === form.supplier_id)
    if (!supplier) return
    try {
      await createMutation.mutateAsync({
        supplier_id: form.supplier_id,
        supplier_inv_no: form.supplier_inv_no || null,
        invoice_date: form.invoice_date,
        lines: lines.filter(l => l.item_id && l.quantity && l.item_cost).map(l => ({
          item_id: l.item_id,
          quantity: parseFloat(l.quantity),
          item_cost: parseFloat(l.item_cost),
          repack_factor: parseFloat(l.repack_factor) || 1,
          description: l.description || null,
        })),
        invoiceCount: invoices.length,
        items,
        supplier,
      })
      setShowModal(false)
      setLines([{ item_id: '', quantity: '', item_cost: '', repack_factor: '1', description: '' }])
      setForm({ supplier_id: '', supplier_inv_no: '', invoice_date: new Date().toISOString().split('T')[0] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.item_cost) || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">فواتير الشراء</h1>
          <p className="page-subtitle">تسجيل المشتريات من الموردين وتحديث المخزون</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(null); setShowModal(true) }} id="purchase-create-btn">
          <Plus size={16} /> فاتورة جديدة
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>المورد</th>
              <th>مرجع المورد</th>
              <th>التاريخ</th>
              <th style={{ textAlign: 'end' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد فواتير</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id}>
                <td><code style={{ fontSize: 13, fontWeight: 600 }}>{inv.invoice_no}</code></td>
                <td style={{ fontWeight: 500 }}>{(inv as unknown as { supplier?: { partner_name: string } }).supplier?.partner_name ?? '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{inv.supplier_inv_no ?? '—'}</td>
                <td style={{ fontSize: 13 }}>{formatDate(inv.invoice_date)}</td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" aria-label="عرض"><Eye size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">فاتورة شراء جديدة</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">المورد *</label>
                    <select className="form-select" required value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                      <option value="">— اختر المورد —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.partner_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">مرجع فاتورة المورد</label>
                    <input className="form-input" value={form.supplier_inv_no} onChange={e => setForm(f => ({ ...f, supplier_inv_no: e.target.value }))} placeholder="INV-123" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التاريخ</label>
                    <input type="date" className="form-input" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>بنود الفاتورة</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13} /> إضافة بند</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {lines.map((line, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                        <select className="form-select" value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}>
                          <option value="">— صنف —</option>
                          {items.map(it => <option key={it.id} value={it.id}>{it.item_name}</option>)}
                        </select>
                        <input type="number" min="0.001" step="0.001" className="form-input" placeholder="الكمية" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                        <input type="number" min="0" step="0.01" className="form-input" placeholder="التكلفة" value={line.item_cost} onChange={e => updateLine(i, 'item_cost', e.target.value)} />
                        <input type="number" min="0.001" step="0.001" className="form-input" placeholder="معامل إعادة التعبئة" title="1 = بدون إعادة تعبئة" value={line.repack_factor} onChange={e => updateLine(i, 'repack_factor', e.target.value)} />
                        <button type="button" className="btn btn-danger btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: 'end', fontSize: 14, fontWeight: 700, marginTop: 8 }}>
                  الإجمالي: {formatCurrency(totalAmount)}
                </div>

                {error && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13, padding: 10, background: 'oklch(0.95 0.04 20/0.3)', borderRadius: 'var(--radius-md)' }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending} id="purchase-save-btn">
                  {createMutation.isPending ? 'جاري الحفظ…' : 'إنشاء الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
