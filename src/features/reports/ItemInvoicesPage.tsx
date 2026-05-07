import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Package, ShoppingCart, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchItemInvoices } from './reports.service'
import { formatCurrency, formatDate } from '@/lib/utils'

type Filter = 'all' | 'purchase' | 'sales'

export default function ItemInvoicesPage() {
  const { itemId = '' } = useParams<{ itemId: string }>()
  const [filter, setFilter] = useState<Filter>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['item-invoices', itemId],
    queryFn: () => fetchItemInvoices(itemId),
    enabled: !!itemId,
  })

  const item = data?.item
  const lines = data?.lines ?? []

  const filtered = useMemo(
    () => filter === 'all' ? lines : lines.filter(l => l.kind === filter),
    [filter, lines],
  )

  const totals = useMemo(() => {
    const purchases = lines.filter(l => l.kind === 'purchase')
    const sales = lines.filter(l => l.kind === 'sales')
    return {
      purchaseQty: purchases.reduce((s, l) => s + l.quantity, 0),
      purchaseValue: purchases.reduce((s, l) => s + l.total, 0),
      salesQty: sales.reduce((s, l) => s + l.quantity, 0),
      salesValue: sales.reduce((s, l) => s + l.total, 0),
    }
  }, [lines])

  return (
    <div>
      <div className="page-header">
        <div>
          <Link
            to="/reports"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none',
              marginBottom: 4,
            }}
          >
            <ArrowRight size={14} /> العودة إلى التقارير
          </Link>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={22} style={{ color: 'var(--color-primary)' }} />
            {item?.item_name ?? '...'}
          </h1>
          <p className="page-subtitle">
            جميع الفواتير التي تحتوي على هذا الصنف
            {item?.item_english_name ? ` • ${item.item_english_name}` : ''}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-container" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ flex: '1 1 220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'oklch(0.96 0.08 70 / 0.5)', color: 'oklch(0.45 0.14 68)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={18} />
            </div>
            <span className="stat-label" style={{ fontSize: 12 }}>إجمالي المشتريات</span>
          </div>
          <div className="stat-value">{formatCurrency(totals.purchaseValue)}</div>
          <div className="stat-sub">{totals.purchaseQty} وحدة</div>
        </div>
        <div className="stat-card" style={{ flex: '1 1 220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'oklch(0.95 0.08 140 / 0.5)', color: 'oklch(0.40 0.16 140)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingCart size={18} />
            </div>
            <span className="stat-label" style={{ fontSize: 12 }}>إجمالي المبيعات</span>
          </div>
          <div className="stat-value">{formatCurrency(totals.salesValue)}</div>
          <div className="stat-sub">{totals.salesQty} وحدة</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{
        display: 'inline-flex', gap: 6, marginBottom: 20,
        background: 'var(--color-bg-card)', padding: 4,
        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
      }}>
        {(['all', 'purchase', 'sales'] as Filter[]).map(f => {
          const label = f === 'all' ? 'الكل' : f === 'purchase' ? 'مشتريات' : 'مبيعات'
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: 'none',
                background: active ? 'var(--color-primary)' : 'transparent',
                color: active ? 'white' : 'var(--color-text-muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>النوع</th>
              <th>رقم الفاتورة</th>
              <th>التاريخ</th>
              <th>الطرف</th>
              <th style={{ textAlign: 'end' }}>الكمية</th>
              <th style={{ textAlign: 'end' }}>سعر الوحدة</th>
              <th style={{ textAlign: 'end' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد فواتير</td></tr>
            ) : filtered.map((l, i) => (
              <tr key={`${l.kind}-${l.invoice_id}-${i}`}>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: l.kind === 'purchase'
                      ? 'oklch(0.96 0.08 70 / 0.5)'
                      : 'oklch(0.95 0.08 140 / 0.5)',
                    color: l.kind === 'purchase'
                      ? 'oklch(0.45 0.14 68)'
                      : 'oklch(0.40 0.16 140)',
                  }}>
                    {l.kind === 'purchase' ? 'شراء' : 'بيع'}
                  </span>
                </td>
                <td><code style={{ fontSize: 13 }}>{l.invoice_no ?? '—'}</code></td>
                <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDate(l.invoice_date)}</td>
                <td style={{ fontWeight: 500 }}>{l.partner_name ?? '—'}</td>
                <td style={{ textAlign: 'end' }}>{l.quantity}</td>
                <td style={{ textAlign: 'end' }}>{formatCurrency(l.unit)}</td>
                <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatCurrency(l.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
