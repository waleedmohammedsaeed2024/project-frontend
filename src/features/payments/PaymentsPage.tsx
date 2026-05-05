import { useMemo, useState } from 'react'
import { Plus, Wallet, CreditCard, Banknote, ArrowRightLeft, Search, X, Calendar, User2 } from 'lucide-react'
import { useClients } from '@/features/partners/partners.hooks'
import { usePayments, useRecordPayment } from './payments.hooks'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentType } from '@/lib/database.types'

interface FormState {
  partner_id: string
  payamt: string
  paytype: PaymentType
  paydate: string
  paymemo: string
}

const PAYTYPE_LABEL: Record<PaymentType, string> = {
  cash: 'نقدًا',
  transfer: 'تحويل',
  credit: 'آجل',
}

const PAYTYPE_ICON: Record<PaymentType, React.ElementType> = {
  cash: Banknote,
  transfer: ArrowRightLeft,
  credit: CreditCard,
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): FormState {
  return { partner_id: '', payamt: '', paytype: 'cash', paydate: todayISO(), paymemo: '' }
}

export default function PaymentsPage() {
  const { data: payments = [], isLoading } = usePayments()
  const { data: clients = [] } = useClients()
  const recordMutation = useRecordPayment()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<PaymentType | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const stats = useMemo(() => {
    const total = payments.reduce((s, p) => s + Number(p.payamt || 0), 0)
    const today = todayISO()
    const todayTotal = payments
      .filter(p => p.paydate === today)
      .reduce((s, p) => s + Number(p.payamt || 0), 0)
    return { total, todayTotal, count: payments.length }
  }, [payments])

  const selectedClient = clients.find(c => c.id === form.partner_id)
  const balanceAfter = selectedClient
    ? Number(selectedClient.balance || 0) - (parseFloat(form.payamt) || 0)
    : null

  const filtered = payments.filter(p => {
    if (filterType && p.paytype !== filterType) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.partner?.partner_name?.toLowerCase().includes(q) ||
      (p.paymemo ?? '').toLowerCase().includes(q)
    )
  })

  function openCreate() {
    setForm(emptyForm())
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const amt = parseFloat(form.payamt)
    if (!form.partner_id) return setFormError('يرجى اختيار العميل')
    if (!amt || amt <= 0) return setFormError('قيمة الدفعة يجب أن تكون أكبر من صفر')
    try {
      await recordMutation.mutateAsync({
        partner_id: form.partner_id,
        payamt: amt,
        paytype: form.paytype,
        paydate: form.paydate,
        paymemo: form.paymemo.trim() || null,
      })
      setShowModal(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const saving = recordMutation.isPending

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المدفوعات</h1>
          <p className="page-subtitle">تسجيل دفعات العملاء وتحديث الأرصدة</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> دفعة جديدة
        </button>
      </div>

      {/* Stats */}
      <div className="stat-container" style={{ marginBottom: 20 }}>
        <StatCard
          icon={<Wallet size={20} />}
          label="إجمالي المدفوعات"
          value={formatCurrency(stats.total)}
          tint="oklch(0.94 0.07 240 / 0.6)"
          fg="oklch(0.42 0.18 240)"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="مدفوعات اليوم"
          value={formatCurrency(stats.todayTotal)}
          tint="oklch(0.95 0.08 140 / 0.6)"
          fg="oklch(0.40 0.16 140)"
        />
        <StatCard
          icon={<User2 size={20} />}
          label="عدد الدفعات"
          value={String(stats.count)}
          tint="oklch(0.96 0.08 70 / 0.6)"
          fg="oklch(0.45 0.14 68)"
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 360 }}>
          <Search size={15} style={{
            position: 'absolute', insetInlineStart: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
          }} />
          <input
            className="form-input"
            style={{ paddingInlineStart: 36 }}
            placeholder="بحث باسم العميل أو الملاحظات…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, background: 'var(--color-bg-card)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <FilterChip active={filterType === ''} onClick={() => setFilterType('')}>الكل</FilterChip>
          {(['cash', 'transfer', 'credit'] as PaymentType[]).map(t => (
            <FilterChip key={t} active={filterType === t} onClick={() => setFilterType(t)}>
              {PAYTYPE_LABEL[t]}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>العميل</th>
              <th>طريقة الدفع</th>
              <th>الملاحظات</th>
              <th style={{ textAlign: 'end' }}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد مدفوعات</td></tr>
            ) : filtered.map(p => {
              const Icon = PAYTYPE_ICON[p.paytype]
              return (
                <tr key={p.id}>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{formatDate(p.paydate)}</td>
                  <td style={{ fontWeight: 500 }}>{p.partner?.partner_name ?? '—'}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: 'oklch(0.95 0.02 240 / 0.6)', color: 'var(--color-heading)',
                    }}>
                      <Icon size={13} />
                      {PAYTYPE_LABEL[p.paytype]}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{p.paymemo ?? '—'}</td>
                  <td style={{ textAlign: 'end', fontWeight: 700, color: 'oklch(0.40 0.16 140)' }}>
                    {formatCurrency(Number(p.payamt))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'oklch(0.94 0.07 240 / 0.5)',
                  color: 'oklch(0.42 0.18 240)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Wallet size={18} />
                </div>
                <h2 className="modal-title" style={{ margin: 0 }}>تسجيل دفعة جديدة</h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">العميل *</label>
                  <select
                    className="form-select"
                    required
                    value={form.partner_id}
                    onChange={e => setForm(f => ({ ...f, partner_id: e.target.value }))}
                  >
                    <option value="">— اختر العميل —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.partner_name}  •  رصيد: {formatCurrency(Number(c.balance || 0))}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">المبلغ *</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={form.payamt}
                      onChange={e => setForm(f => ({ ...f, payamt: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input
                      className="form-input"
                      type="date"
                      required
                      value={form.paydate}
                      onChange={e => setForm(f => ({ ...f, paydate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">طريقة الدفع *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {(['cash', 'transfer', 'credit'] as PaymentType[]).map(t => {
                      const Icon = PAYTYPE_ICON[t]
                      const active = form.paytype === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, paytype: t }))}
                          style={{
                            padding: '12px 8px',
                            borderRadius: 'var(--radius-md)',
                            border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: active ? 'oklch(0.96 0.04 265 / 0.5)' : 'var(--color-bg-card)',
                            color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            fontWeight: 600, fontSize: 13,
                            transition: 'all 0.15s',
                          }}
                        >
                          <Icon size={18} />
                          {PAYTYPE_LABEL[t]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input
                    className="form-input"
                    placeholder="اختياري"
                    value={form.paymemo}
                    onChange={e => setForm(f => ({ ...f, paymemo: e.target.value }))}
                  />
                </div>

                {selectedClient && form.payamt && (
                  <div style={{
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    background: 'oklch(0.97 0.02 240 / 0.6)',
                    border: '1px dashed oklch(0.85 0.04 240)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      الرصيد بعد الدفعة
                    </div>
                    <div style={{
                      fontSize: 18, fontWeight: 700,
                      color: (balanceAfter ?? 0) < 0 ? 'oklch(0.45 0.10 18)' : 'oklch(0.40 0.16 140)',
                    }}>
                      {formatCurrency(balanceAfter ?? 0)}
                    </div>
                  </div>
                )}

                {formError && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    background: 'oklch(0.94 0.04 20 / 0.4)', color: 'oklch(0.40 0.14 18)',
                    fontSize: 13,
                  }}>{formError}</div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ…' : 'تسجيل الدفعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, tint, fg }: { icon: React.ReactNode; label: string; value: string; tint: string; fg: string }) {
  return (
    <div className="stat-card" style={{ flex: '1 1 200px', minWidth: 180 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: tint, color: fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span className="stat-label" style={{ fontSize: 12 }}>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-sm, 6px)',
        border: 'none',
        background: active ? 'var(--color-primary)' : 'transparent',
        color: active ? 'white' : 'var(--color-text-muted)',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}
