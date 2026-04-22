import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
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
  item_code: string
  packaging_ids: string[]
  orderpoint: string
}

interface PackagingForm {
  pack_arab: string
  pack_eng: string
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

function PackagingBadges({ item }: { item: InventoryItem }) {
  const pkgs = item.item_packaging ?? []
  if (pkgs.length === 0) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {pkgs.map(ip => (
        <span key={ip.packaging_id} style={PKG_BADGE}>
          {ip.packaging?.pack_eng ?? ip.packaging_id}
        </span>
      ))}
    </div>
  )
}

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
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            style={{
              padding: '5px 13px',
              borderRadius: 999,
              fontSize: 13,
              cursor: 'pointer',
              border: on ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: on ? 'oklch(0.93 0.05 240 / 0.4)' : 'transparent',
              color: on ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: on ? 600 : 400,
              transition: 'all 0.12s',
            }}
          >
            {on && '✓ '}{p.pack_eng} / {p.pack_arab}
          </button>
        )
      })}
    </div>
  )
}

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
  const [form, setForm] = useState<ItemForm>({ item_name: '', item_english_name: '', item_code: '', packaging_ids: [], orderpoint: '0' })
  const [formError, setFormError] = useState<string | null>(null)

  const [showPackModal, setShowPackModal] = useState(false)
  const [editingPack, setEditingPack] = useState<Packaging | null>(null)
  const [packForm, setPackForm] = useState<PackagingForm>({ pack_arab: '', pack_eng: '' })

  function openCreate() {
    setEditing(null)
    setForm({ item_name: '', item_english_name: '', item_code: '', packaging_ids: [], orderpoint: '0' })
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(item: InventoryItem) {
    setEditing(item)
    setForm({
      item_name: item.item_name,
      item_english_name: item.item_english_name ?? '',
      item_code: item.item_code,
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
      item_code: form.item_code.trim(),
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

  const filtered = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    i.item_code.toLowerCase().includes(search.toLowerCase()),
  )

  const saving = createItem.isPending || updateItem.isPending

  return (
    <div>
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
          <button className="btn btn-primary" onClick={() => { setEditingPack(null); setPackForm({ pack_arab: '', pack_eng: '' }); setShowPackModal(true) }} id="packaging-create-btn">
            <Plus size={16} /> تعبئة جديدة
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--color-border)', borderRadius: 'var(--radius-md)', padding: 3, width: 'fit-content', marginBottom: 20 }}>
        {(['items', 'packaging'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none', cursor: 'pointer',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--color-heading)' : 'var(--color-text-muted)',
            fontWeight: tab === t ? 600 : 400, fontSize: 14,
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s',
          }}>
            {t === 'items' ? 'الأصناف' : 'التعبئة'}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <>
          <input className="form-input" style={{ maxWidth: 320, marginBottom: 20 }} placeholder="بحث…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الكود</th>
                  <th>التعبئة</th>
                  <th style={{ textAlign: 'end' }}>متوسط التكلفة</th>
                  <th style={{ textAlign: 'end' }}>الكمية</th>
                  <th>نقطة الطلب</th>
                  <th style={{ textAlign: 'end' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد أصناف</td></tr>
                ) : filtered.map(item => {
                  const low = item.quantity <= item.orderpoint
                  return (
                    <tr key={item.id} className={low ? 'orderpoint-alert' : ''}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.item_name}</div>
                        {item.item_english_name && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.item_english_name}</div>}
                      </td>
                      <td><code style={{ fontSize: 12 }}>{item.item_code}</code></td>
                      <td><PackagingBadges item={item} /></td>
                      <td style={{ textAlign: 'end', fontWeight: 600 }}>{formatCurrency(item.avg_cost, 4)}</td>
                      <td style={{ textAlign: 'end', color: low ? 'oklch(0.45 0.14 18)' : 'inherit', fontWeight: low ? 700 : 400 }}>
                        {low && <AlertTriangle size={12} style={{ marginInlineEnd: 4 }} color="oklch(0.60 0.14 60)" />}
                        {item.quantity}
                      </td>
                      <td style={{ fontSize: 13 }}>{item.orderpoint}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(item)}><Pencil size={14} /></button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('حذف الصنف؟')) deleteItem.mutate(item.id) }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'packaging' && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>الاسم بالعربية</th><th>الاسم بالإنجليزية</th><th>تاريخ الإضافة</th><th style={{ textAlign: 'end' }}>الإجراءات</th></tr></thead>
            <tbody>
              {packaging.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد أنواع تعبئة</td></tr>
              ) : packaging.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.pack_arab}</td>
                  <td>{p.pack_eng}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDate(p.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingPack(p); setPackForm({ pack_arab: p.pack_arab, pack_eng: p.pack_eng }); setShowPackModal(true) }}><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('حذف التعبئة؟')) deletePkg.mutate(p.id) }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  <input className="form-input" required value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">الاسم بالإنجليزية</label>
                  <input className="form-input" value={form.item_english_name} onChange={e => setForm(f => ({ ...f, item_english_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">كود الصنف *</label>
                  <input className="form-input" required value={form.item_code} onChange={e => setForm(f => ({ ...f, item_code: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">التعبئة</label>
                  {form.packaging_ids.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {form.packaging_ids.map(id => {
                        const p = packaging.find(x => x.id === id)
                        return p ? <span key={id} style={PKG_BADGE}>{p.pack_eng} / {p.pack_arab}</span> : null
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
                  <input type="number" min="0" step="0.01" className="form-input" value={form.orderpoint} onChange={e => setForm(f => ({ ...f, orderpoint: e.target.value }))} />
                </div>
                {formError && <div style={{ color: 'oklch(0.40 0.14 18)', fontSize: 13 }}>{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="item-save-btn">{saving ? 'جاري الحفظ…' : editing ? 'حفظ التغييرات' : 'إضافة الصنف'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPackModal && (
        <div className="modal-overlay" onClick={() => setShowPackModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingPack ? 'تعديل التعبئة' : 'تعبئة جديدة'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPackModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePackSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">الاسم بالعربية *</label><input className="form-input" required value={packForm.pack_arab} onChange={e => setPackForm(f => ({ ...f, pack_arab: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">الاسم بالإنجليزية *</label><input className="form-input" required value={packForm.pack_eng} onChange={e => setPackForm(f => ({ ...f, pack_eng: e.target.value }))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPackModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={createPkg.isPending || updatePkg.isPending}>{editingPack ? 'حفظ' : 'إضافة'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
