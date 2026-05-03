import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSalesInvoices } from './invoices.hooks'
import { usePagination, PaginationFooter } from '@/components/Pagination'

export default function SalesInvoicesPage() {
  const { data: invoices = [], isLoading, isError, error } = useSalesInvoices()
  const [search, setSearch] = useState('')

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
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : isError ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'oklch(0.40 0.14 18)' }}>{error instanceof Error ? error.message : 'حدث خطأ أثناء تحميل الفواتير'}</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد فواتير</td></tr>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <PaginationFooter page={page} pageCount={pageCount} pageSize={pageSize} total={total} start={start} setPage={setPage} setPageSize={setPageSize} />
    </div>
  )
}
