import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ExternalLink, AlertTriangle, Search } from 'lucide-react'
import { formatCurrency, formatDate, OPERATION_LABEL } from '@/lib/utils'
import type { OperationType, InventoryItem } from '@/lib/database.types'
import { useStockLevels, useInventoryTransactions } from './inventory.hooks'
import type { InventoryTransaction } from './inventory.service'
import { useCreateItem, usePackaging } from '@/features/items/items.hooks'

const PALETTE = [
  { bg: 'oklch(0.92 0.06 240 / 0.45)', fg: 'oklch(0.32 0.16 240)' },
  { bg: 'oklch(0.92 0.08 145 / 0.45)', fg: 'oklch(0.30 0.18 145)' },
  { bg: 'oklch(0.92 0.06 300 / 0.45)', fg: 'oklch(0.32 0.14 300)' },
  { bg: 'oklch(0.93 0.09 55 / 0.45)',  fg: 'oklch(0.38 0.14 50)' },
  { bg: 'oklch(0.92 0.07 20 / 0.45)',  fg: 'oklch(0.35 0.16 18)' },
  { bg: 'oklch(0.92 0.05 185 / 0.45)', fg: 'oklch(0.30 0.12 185)' },
  { bg: 'oklch(0.92 0.06 340 / 0.45)', fg: 'oklch(0.33 0.14 340)' },
]
function pkgColor(id: string) {
  const h = id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0)
  return PALETTE[h % PALETTE.length]
}

function StockCard({ item }: { item: InventoryItem }) {
  const stocks = item.stock ?? []
  const low = stocks.some(s => s.quantity <= item.orderpoint && item.orderpoint > 0)
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: low ? '1.5px solid oklch(0.82 0.10 55)' : '1px solid var(--color-border)',
      borderInlineStart: low ? '4px solid oklch(0.65 0.14 55)' : '4px solid transparent',
      borderRadius: 'var(--radius-lg, 12px)',
      padding: '16px 18px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-heading)', lineHeight: 1.3 }}>
          {item.item_name}
        </div>
        {item.item_english_name && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {item.item_english_name}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 22 }}>
        {stocks.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>لا يوجد مخزون</span>
        ) : stocks.map(s => {
          const pkgId = s.packaging_id ?? 'none'
          const c = pkgColor(pkgId)
          const label = s.packaging?.pack_arab ?? s.packaging?.pack_eng ?? 'بدون تعبئة'
          const stockLow = s.quantity <= item.orderpoint && item.orderpoint > 0
          return (
            <span key={s.id ?? pkgId} style={{
              padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: c.bg, color: c.fg, whiteSpace: 'nowrap',
              border: stockLow ? `1.5px solid ${c.fg}` : 'none',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {stockLow && <AlertTriangle size={10} />}
              {label}: {s.quantity}
            </span>
          )
        })}
      </div>

      {stocks.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'right', fontWeight: 600, fontSize: 10, color: 'var(--color-text-muted)', paddingBottom: 4 }}>التعبئة</th>
                <th style={{ textAlign: 'end', fontWeight: 600, fontSize: 10, color: 'var(--color-text-muted)', paddingBottom: 4 }}>الكمية</th>
                <th style={{ textAlign: 'end', fontWeight: 600, fontSize: 10, color: 'var(--color-text-muted)', paddingBottom: 4 }}>متوسط التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => {
                const pkgLabel = s.packaging?.pack_arab ?? s.packaging?.pack_eng ?? 'بدون تعبئة'
                const stockLow = s.quantity <= item.orderpoint && item.orderpoint > 0
                return (
                  <tr key={s.id ?? s.packaging_id ?? 'none'}>
                    <td style={{ paddingBlock: 2, color: 'var(--color-heading)', fontWeight: 500 }}>{pkgLabel}</td>
                    <td style={{ textAlign: 'end', fontWeight: 700, color: stockLow ? 'oklch(0.42 0.14 18)' : 'var(--color-heading)' }}>
                      {stockLow && <AlertTriangle size={10} color="oklch(0.60 0.14 55)" style={{ marginInlineEnd: 3 }} />}
                      {s.quantity}
                    </td>
                    <td style={{ textAlign: 'end', color: 'var(--color-primary)', fontWeight: 600 }}>
                      {formatCurrency(s.avg_cost, 3)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 3 }}>نقطة الطلب</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.orderpoint || '—'}</div>
        </div>
      </div>
    </div>
  )
}

type Tab = 'stock' | 'transactions'

interface ItemForm {
  item_name: string
  item_english_name: string
  packaging_ids: string[]
  orderpoint: string
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
  const [itemForm, setItemForm] = useState<ItemForm>({ item_name: '', item_english_name: '', packaging_ids: [], orderpoint: '0' })
  const [itemFormError, setItemFormError] = useState<string | null>(null)

  function openAddItem() {
    setItemForm({ item_name: '', item_english_name: '', packaging_ids: [], orderpoint: '0' })
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

  async function handleAddItemSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setItemFormError(null)
    try {
      await createItem.mutateAsync({
        item_name: itemForm.item_name.trim(),
        item_english_name: itemForm.item_english_name.trim() || null,
        packaging_ids: itemForm.packaging_ids,
        orderpoint: parseFloat(itemForm.orderpoint) || 0,
      })
      setShowAddItem(false)
    } catch (err) {
      setItemFormError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const filtered = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredTx = transactions.filter(tx =>
    tx.records?.some(r =>
      r.item?.item_name.toLowerCase().includes(txSearch.toLowerCase()),
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
          <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
            <Search size={15} style={{
              position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)', pointerEvents: 'none',
            }} />
            <input
              className="form-input"
              style={{ paddingInlineStart: 36, width: '100%' }}
              placeholder="بحث بالاسم…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {loadingItems ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>جاري التحميل…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
              {search ? 'لا توجد نتائج مطابقة' : 'لا توجد أصناف'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {filtered.map(item => <StockCard key={item.id} item={item} />)}
            </div>
          )}
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
