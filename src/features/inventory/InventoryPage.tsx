import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate, OPERATION_LABEL } from '@/lib/utils'
import type { OperationType } from '@/lib/database.types'
import { useStockLevels, useInventoryTransactions } from './inventory.hooks'
import type { InventoryTransaction } from './inventory.service'
import { useCreateItem, usePackaging } from '@/features/items/items.hooks'

type Tab = 'stock' | 'transactions'

interface ItemForm {
  item_name: string
  item_english_name: string
  item_code: string
  packaging_ids: string[]
  orderpoint: string
}

const PKG_BADGE = {
  background: 'oklch(0.93 0.05 240 / 0.35)',
  color: 'oklch(0.35 0.14 240)',
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 999,
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
}

export default function InventoryPage() {
  const navigate = useNavigate()
  const { data: items = [], isLoading: loadingItems } = useStockLevels()
  const { data: transactions = [], isLoading: loadingTx } = useInventoryTransactions()
  const { data: packaging = [] } = usePackaging()
  const createItem = useCreateItem()

  const [tab, setTab] = useState<Tab>('stock')
  const [search, setSearch] = useState('')
  const [txSearch, setTxSearch] = useState('')

  const [showAddItem, setShowAddItem] = useState(false)
  const [itemForm, setItemForm] = useState<ItemForm>({ item_name: '', item_english_name: '', item_code: '', packaging_ids: [], orderpoint: '0' })
  const [itemFormError, setItemFormError] = useState<string | null>(null)

  function openAddItem() {
    setItemForm({ item_name: '', item_english_name: '', item_code: '', packaging_ids: [], orderpoint: '0' })
    setItemFormError(null)
    setShowAddItem(true)
  }

  function togglePackaging(id: string) {
    setItemForm(f => ({
      ...f,
      packaging_ids: f.packaging_ids.includes(id)
        ? f.packaging_ids.filter(x => x !== id)
        : [...f.packaging_ids, id],
    }))
  }

  async function handleAddItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    setItemFormError(null)
    try {
      await createItem.mutateAsync({
        item_name: itemForm.item_name.trim(),
        item_english_name: itemForm.item_english_name.trim() || null,
        item_code: itemForm.item_code.trim(),
        packaging_ids: itemForm.packaging_ids,
        orderpoint: parseFloat(itemForm.orderpoint) || 0,
      })
      setShowAddItem(false)
    } catch (err) {
      setItemFormError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const filtered = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    i.item_code.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredTx = transactions.filter(tx =>
    tx.records?.some(r =>
      r.item?.item_name.toLowerCase().includes(txSearch.toLowerCase()) ||
      r.item?.item_code.toLowerCase().includes(txSearch.toLowerCase()),
    ),
  )

  const opColor = (type: OperationType) => ({
    pur: { bg: 'oklch(0.94 0.07 140 / 0.25)', fg: 'oklch(0.40 0.16 140)' },
    sal: { bg: 'oklch(0.94 0.07 240 / 0.25)', fg: 'oklch(0.40 0.18 240)' },
    adj: { bg: 'oklch(0.94 0.07 60 / 0.25)',  fg: 'oklch(0.40 0.14 55)' },
    ren: { bg: 'oklch(0.94 0.04 300 / 0.25)', fg: 'oklch(0.40 0.14 290)' },
  }[type])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المخزون</h1>
          <p className="page-subtitle">مستويات المخزون الفعلية وسجل الحركات</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/items')}>
            <ExternalLink size={15} /> إدارة الأصناف
          </button>
          <button className="btn btn-primary" onClick={openAddItem}>
            <Plus size={15} /> إضافة صنف
          </button>
        </div>
      </div>

      <div className="grid-cols-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-label">إجمالي الأصناف</span>
          <div className="stat-value">{items.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">تنبيهات المخزون المنخفض</span>
          <div className="stat-value" style={{ color: 'oklch(0.60 0.14 60)' }}>
            {items.filter(i => i.quantity <= i.orderpoint && i.orderpoint > 0).length}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">إجمالي الحركات</span>
          <div className="stat-value">{transactions.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--color-border)', borderRadius: 'var(--radius-md)', padding: 3, width: 'fit-content', marginBottom: 20 }}>
        {(['stock', 'transactions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none', cursor: 'pointer',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--color-heading)' : 'var(--color-text-muted)',
            fontWeight: tab === t ? 600 : 400, fontSize: 14,
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s',
          }}>
            {t === 'stock' ? 'مستويات المخزون' : 'سجل الحركات'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <input className="form-input" style={{ maxWidth: 320, marginBottom: 16 }}
            placeholder="بحث…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الصنف</th><th>الكود</th><th>التعبئة</th>
                  <th style={{ textAlign: 'end' }}>الكمية</th>
                  <th style={{ textAlign: 'end' }}>متوسط التكلفة</th>
                  <th style={{ textAlign: 'end' }}>القيمة الإجمالية</th>
                  <th>نقطة الطلب</th><th>التنبيه</th>
                </tr>
              </thead>
              <tbody>
                {loadingItems ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
                ) : filtered.map(item => {
                  const low = item.quantity <= item.orderpoint && item.orderpoint > 0
                  return (
                    <tr key={item.id} className={low ? 'orderpoint-alert' : ''}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.item_name}</div>
                        {item.item_english_name && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.item_english_name}</div>}
                      </td>
                      <td><code style={{ fontSize: 12 }}>{item.item_code}</code></td>
                      <td>
                        {(item.item_packaging ?? []).length === 0
                          ? <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {item.item_packaging!.map(ip => (
                                <span key={ip.packaging_id} style={PKG_BADGE}>{ip.packaging?.pack_eng ?? ip.packaging_id}</span>
                              ))}
                            </div>
                        }
                      </td>
                      <td style={{ textAlign: 'end', fontWeight: 600, color: low ? 'oklch(0.45 0.14 18)' : 'inherit' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'end' }}>{formatCurrency(item.avg_cost, 4)}</td>
                      <td style={{ textAlign: 'end', fontWeight: 600, color: 'var(--color-primary)' }}>{formatCurrency(item.quantity * item.avg_cost)}</td>
                      <td style={{ fontSize: 13 }}>{item.orderpoint || '—'}</td>
                      <td>
                        {low && (
                          <span style={{ fontSize: 12, background: 'oklch(0.92 0.10 60 / 0.4)', color: 'oklch(0.45 0.14 55)', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                            ⚠ منخفض
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'transactions' && (
        <>
          <input className="form-input" style={{ maxWidth: 320, marginBottom: 16 }}
            placeholder="بحث بالصنف أو الكود…" value={txSearch} onChange={e => setTxSearch(e.target.value)} />
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>النوع</th><th>الصنف</th>
                  <th style={{ textAlign: 'end' }}>تغيير الكمية</th>
                  <th style={{ textAlign: 'end' }}>التكلفة عند العملية</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {loadingTx ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
                ) : filteredTx.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد حركات</td></tr>
                ) : (filteredTx as InventoryTransaction[]).flatMap(tx =>
                  (tx.records ?? []).map(rec => {
                    const c = opColor(tx.operation_type)
                    return (
                      <tr key={rec.id}>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: c.bg, color: c.fg }}>
                            {OPERATION_LABEL[tx.operation_type]}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{rec.item?.item_name ?? '—'}</td>
                        <td style={{ textAlign: 'end', fontWeight: 600, color: rec.qty_change > 0 ? 'oklch(0.45 0.14 140)' : 'oklch(0.45 0.14 18)' }}>
                          {rec.qty_change > 0 ? '+' : ''}{rec.qty_change}
                        </td>
                        <td style={{ textAlign: 'end' }}>{formatCurrency(rec.cost_at_operation, 4)}</td>
                        <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDate(tx.operation_date)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAddItem && (
        <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">إضافة صنف جديد</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddItem(false)}>✕</button>
            </div>
            <form onSubmit={handleAddItemSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالعربية *</label>
                  <input className="form-input" required value={itemForm.item_name} onChange={e => setItemForm(f => ({ ...f, item_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">الاسم بالإنجليزية</label>
                  <input className="form-input" value={itemForm.item_english_name} onChange={e => setItemForm(f => ({ ...f, item_english_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">كود الصنف *</label>
                  <input className="form-input" required value={itemForm.item_code} onChange={e => setItemForm(f => ({ ...f, item_code: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">التعبئة</label>
                  {itemForm.packaging_ids.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {itemForm.packaging_ids.map(id => {
                        const p = packaging.find(x => x.id === id)
                        return p ? <span key={id} style={PKG_BADGE}>{p.pack_eng} / {p.pack_arab}</span> : null
                      })}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {packaging.length === 0
                      ? <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>لا توجد أنواع تعبئة</span>
                      : packaging.map(p => {
                          const on = itemForm.packaging_ids.includes(p.id)
                          return (
                            <button key={p.id} type="button" onClick={() => togglePackaging(p.id)} style={{
                              padding: '5px 13px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                              border: on ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                              background: on ? 'oklch(0.93 0.05 240 / 0.4)' : 'transparent',
                              color: on ? 'var(--color-primary)' : 'var(--color-text-muted)',
                              fontWeight: on ? 600 : 400, transition: 'all 0.12s',
                            }}>
                              {on && '✓ '}{p.pack_eng} / {p.pack_arab}
                            </button>
                          )
                        })
                    }
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">نقطة الطلب</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={itemForm.orderpoint} onChange={e => setItemForm(f => ({ ...f, orderpoint: e.target.value }))} />
                </div>
                {itemFormError && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13 }}>{itemFormError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddItem(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createItem.isPending}>
                  {createItem.isPending ? 'جاري الحفظ…' : 'إضافة الصنف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
