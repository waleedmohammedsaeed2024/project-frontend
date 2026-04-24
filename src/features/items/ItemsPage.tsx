import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InventoryItem, Packaging } from '@/lib/database.types'
import {
  useItems, usePackaging,
  useCreateItem, useUpdateItem, useDeleteItem,
  useCreatePackaging, useUpdatePackaging, useDeletePackaging,
} from './items.hooks'

type Tab = 'items' | 'packaging'

interface ItemForm {
  item_name: string
  item_english_name: string
  packaging_ids: string[]
  orderpoint: string
}

interface PackagingForm {
  pack_arab: string
  pack_eng: string
}

// Stable color palette — assigned by hashing the packaging UUID
const PALETTE = [
  { bg: 'oklch(0.92 0.06 240 / 0.45)', fg: 'oklch(0.32 0.16 240)' }, // blue
  { bg: 'oklch(0.92 0.08 145 / 0.45)', fg: 'oklch(0.30 0.18 145)' }, // green
  { bg: 'oklch(0.92 0.06 300 / 0.45)', fg: 'oklch(0.32 0.14 300)' }, // purple
  { bg: 'oklch(0.93 0.09 55 / 0.45)',  fg: 'oklch(0.38 0.14 50)' },  // amber
  { bg: 'oklch(0.92 0.07 20 / 0.45)',  fg: 'oklch(0.35 0.16 18)' },  // red
  { bg: 'oklch(0.92 0.05 185 / 0.45)', fg: 'oklch(0.30 0.12 185)' }, // cyan
  { bg: 'oklch(0.92 0.06 340 / 0.45)', fg: 'oklch(0.33 0.14 340)' }, // pink
]

function pkgColor(id: string) {
  const h = id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0)
  return PALETTE[h % PALETTE.length]
}

// ─── Packaging chips (multi-select toggle) ───────────────────────────────────
function PackagingChips({
  packaging,
  selected,
  onChange,
}: {
  packaging: Packaging[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  if (packaging.length === 0)
    return <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>لا توجد أنواع تعبئة — أضف من تبويب التعبئة أولاً</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {packaging.map(p => {
        const on = selected.includes(p.id)
        const c = pkgColor(p.id)
        return (
          <button key={p.id} type="button" onClick={() => toggle(p.id)} style={{
            padding: '5px 13px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
            border: on ? `1.5px solid ${c.fg}` : '1px solid var(--color-border)',
            background: on ? c.bg : 'transparent',
            color: on ? c.fg : 'var(--color-text-muted)',
            fontWeight: on ? 600 : 400, transition: 'all 0.12s',
          }}>
            {on && '✓ '}{p.pack_eng} / {p.pack_arab}
          </button>
        )
      })}
    </div>
  )
}

// ─── Item card ────────────────────────────────────────────────────────────────
function ItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => Promise<void>
}) {
  const [hovered, setHovered] = useState(false)
  const low = item.quantity <= item.orderpoint && item.orderpoint > 0
  const pkgs = item.item_packaging ?? []

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`تعديل ${item.item_name}`}
      onClick={() => onEdit(item)}
      onKeyDown={e => e.key === 'Enter' && onEdit(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-bg-card)',
        border: low
          ? '1.5px solid oklch(0.82 0.10 55)'
          : '1px solid var(--color-border)',
        borderInlineStart: low
          ? '4px solid oklch(0.65 0.14 55)'
          : '4px solid transparent',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: hovered
          ? '0 6px 20px oklch(0 0 0 / 0.10)'
          : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        outline: 'none',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-heading)', lineHeight: 1.3 }}>
            {item.item_name}
          </div>
          {item.item_english_name && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {item.item_english_name}
            </div>
          )}
        </div>
        {/* Action buttons — stop card click propagation */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => onEdit(item)}
            title="تعديل"
            aria-label="تعديل"
          >
            <Pencil size={13} />
          </button>
          <button
            className="btn btn-danger btn-sm btn-icon"
            onClick={async () => { if (confirm('حذف الصنف؟')) try { await onDelete(item.id) } catch (e) { alert(e instanceof Error ? e.message : 'حدث خطأ') } }}
            title="حذف"
            aria-label="حذف"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Packaging badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 22 }}>
        {pkgs.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            بدون تعبئة
          </span>
        ) : pkgs.map(ip => {
          const c = pkgColor(ip.packaging_id)
          return (
            <span key={ip.packaging_id} style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: c.bg, color: c.fg, whiteSpace: 'nowrap',
            }}>
              {ip.packaging?.pack_eng ?? ip.packaging?.pack_arab ?? '—'}
            </span>
          )
        })}
      </div>

      {/* Per-packaging stock breakdown */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
        {(item.stock ?? []).length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>لا يوجد مخزون بعد</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'right', fontWeight: 600, fontSize: 10, color: 'var(--color-text-muted)', paddingBottom: 4 }}>التعبئة</th>
                <th style={{ textAlign: 'end', fontWeight: 600, fontSize: 10, color: 'var(--color-text-muted)', paddingBottom: 4 }}>الكمية</th>
                <th style={{ textAlign: 'end', fontWeight: 600, fontSize: 10, color: 'var(--color-text-muted)', paddingBottom: 4 }}>متوسط التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {(item.stock ?? []).map(s => {
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
        )}
      </div>

      {/* Orderpoint row */}
      <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 3 }}>نقطة الطلب</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.orderpoint || '—'}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ItemsPage() {
  const { data: items = [], isLoading } = useItems()
  const { data: packaging = [] } = usePackaging()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const createPkg = useCreatePackaging()
  const updatePkg = useUpdatePackaging()
  const deletePkg = useDeletePackaging()

  const [tab, setTab] = useState<Tab>('items')
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState<ItemForm>({ item_name: '', item_english_name: '', packaging_ids: [], orderpoint: '0' })
  const [formError, setFormError] = useState<string | null>(null)

  const [showPackModal, setShowPackModal] = useState(false)
  const [editingPack, setEditingPack] = useState<Packaging | null>(null)
  const [packForm, setPackForm] = useState<PackagingForm>({ pack_arab: '', pack_eng: '' })

  function openCreate() {
    setEditing(null)
    setForm({ item_name: '', item_english_name: '', packaging_ids: [], orderpoint: '0' })
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(item: InventoryItem) {
    setEditing(item)
    setForm({
      item_name: item.item_name,
      item_english_name: item.item_english_name ?? '',
      packaging_ids: item.item_packaging?.map(ip => ip.packaging_id) ?? [],
      orderpoint: String(item.orderpoint),
    })
    setFormError(null)
    setShowModal(true)
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const payload = {
      item_name: form.item_name.trim(),
      item_english_name: form.item_english_name.trim() || null,
      packaging_ids: form.packaging_ids,
      orderpoint: parseFloat(form.orderpoint) || 0,
    }
    try {
      if (editing) {
        await updateItem.mutateAsync({ id: editing.id, payload })
      } else {
        await createItem.mutateAsync(payload)
      }
      setShowModal(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  async function handlePackSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingPack) {
        await updatePkg.mutateAsync({ id: editingPack.id, payload: packForm })
      } else {
        await createPkg.mutateAsync(packForm)
      }
      setShowPackModal(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const q = search.toLowerCase()
  const filtered = items.filter(i => {
    if (!q) return true
    if (i.item_name.toLowerCase().includes(q)) return true
    if (i.item_english_name?.toLowerCase().includes(q)) return true
    return (i.item_packaging ?? []).some(
      ip =>
        ip.packaging?.pack_eng.toLowerCase().includes(q) ||
        ip.packaging?.pack_arab.toLowerCase().includes(q),
    )
  })

  const saving = createItem.isPending || updateItem.isPending

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">الأصناف والتعبئة</h1>
          <p className="page-subtitle">إدارة أصناف المخزون وأنواع التعبئة</p>
        </div>
        {tab === 'items' && (
          <button className="btn btn-primary" onClick={openCreate} id="item-create-btn">
            <Plus size={16} /> صنف جديد
          </button>
        )}
        {tab === 'packaging' && (
          <button className="btn btn-primary" onClick={() => {
            setEditingPack(null)
            setPackForm({ pack_arab: '', pack_eng: '' })
            setShowPackModal(true)
          }} id="packaging-create-btn">
            <Plus size={16} /> تعبئة جديدة
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--color-border)', borderRadius: 'var(--radius-md)', padding: 3, width: 'fit-content', marginBottom: 20 }}>
        {(['items', 'packaging'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none', cursor: 'pointer',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--color-heading)' : 'var(--color-text-muted)',
            fontWeight: tab === t ? 600 : 400, fontSize: 14,
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s',
          }}>
            {t === 'items' ? `الأصناف ${items.length > 0 ? `(${items.length})` : ''}` : 'التعبئة'}
          </button>
        ))}
      </div>

      {/* ── Items tab ── */}
      {tab === 'items' && (
        <>
          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
            <Search size={15} style={{
              position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)', pointerEvents: 'none',
            }} />
            <input
              className="form-input"
              style={{ paddingInlineStart: 36, width: '100%' }}
              placeholder="بحث بالاسم أو نوع التعبئة…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Card grid */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
              جاري التحميل…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
              {search ? 'لا توجد نتائج مطابقة' : 'لا توجد أصناف — أضف صنفاً جديداً'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {filtered.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={openEdit}
                  onDelete={id => deleteItem.mutateAsync(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Packaging tab ── */}
      {tab === 'packaging' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>اللون</th>
                <th>الاسم بالعربية</th>
                <th>الاسم بالإنجليزية</th>
                <th>تاريخ الإضافة</th>
                <th style={{ textAlign: 'end' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {packaging.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد أنواع تعبئة</td></tr>
              ) : packaging.map(p => {
                const c = pkgColor(p.id)
                return (
                  <tr key={p.id}>
                    <td>
                      <span style={{
                        display: 'inline-block', width: 28, height: 20, borderRadius: 999,
                        background: c.bg, border: `1.5px solid ${c.fg}`,
                      }} />
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.pack_arab}</td>
                    <td>{p.pack_eng}</td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDate(p.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => {
                          setEditingPack(p)
                          setPackForm({ pack_arab: p.pack_arab, pack_eng: p.pack_eng })
                          setShowPackModal(true)
                        }}><Pencil size={14} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => {
                          if (confirm('حذف التعبئة؟')) deletePkg.mutate(p.id)
                        }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Item create/edit modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'تعديل الصنف' : 'صنف جديد'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleItemSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالعربية *</label>
                  <input
                    className="form-input" required
                    value={form.item_name}
                    onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الاسم بالإنجليزية</label>
                  <input
                    className="form-input"
                    value={form.item_english_name}
                    onChange={e => setForm(f => ({ ...f, item_english_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">التعبئة</label>
                  {/* Preview selected badges */}
                  {form.packaging_ids.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      {form.packaging_ids.map(id => {
                        const p = packaging.find(x => x.id === id)
                        if (!p) return null
                        const c = pkgColor(id)
                        return (
                          <span key={id} style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 12,
                            fontWeight: 600, background: c.bg, color: c.fg,
                          }}>
                            {p.pack_eng} / {p.pack_arab}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <PackagingChips
                    packaging={packaging}
                    selected={form.packaging_ids}
                    onChange={ids => setForm(f => ({ ...f, packaging_ids: ids }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">نقطة الطلب</label>
                  <input
                    type="number" min="0" step="0.01" className="form-input"
                    value={form.orderpoint}
                    onChange={e => setForm(f => ({ ...f, orderpoint: e.target.value }))}
                  />
                </div>
                {formError && (
                  <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13 }}>{formError}</div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="item-save-btn">
                  {saving ? 'جاري الحفظ…' : editing ? 'حفظ التغييرات' : 'إضافة الصنف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Packaging create/edit modal ── */}
      {showPackModal && (
        <div className="modal-overlay" onClick={() => setShowPackModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingPack ? 'تعديل التعبئة' : 'تعبئة جديدة'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPackModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePackSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالعربية *</label>
                  <input className="form-input" required value={packForm.pack_arab} onChange={e => setPackForm(f => ({ ...f, pack_arab: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">الاسم بالإنجليزية *</label>
                  <input className="form-input" required value={packForm.pack_eng} onChange={e => setPackForm(f => ({ ...f, pack_eng: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPackModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createPkg.isPending || updatePkg.isPending}>
                  {editingPack ? 'حفظ' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
