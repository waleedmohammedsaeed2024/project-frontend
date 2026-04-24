import { XCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSalesInvoices, useCancelSalesInvoice } from './invoices.hooks'
import { useCanDo } from '@/context/AuthContext'

export default function SalesInvoicesPage() {
  const { data: invoices = [], isLoading } = useSalesInvoices()
  const cancelMutation = useCancelSalesInvoice()
  const can = useCanDo()

  async function handleCancel(inv: (typeof invoices)[0]) {
    if (!confirm('إلغاء هذه الفاتورة بالعكس؟ سيتم استعادة المخزون ورصيد العميل.')) return
    try {
      await cancelMutation.mutateAsync(inv)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">فواتير المبيعات</h1>
          <p className="page-subtitle">عرض وإدارة فواتير المبيعات</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة</th><th>العميل</th><th>الزبون</th>
              <th style={{ textAlign: 'end' }}>الإجمالي</th>
              <th style={{ textAlign: 'end' }}>الإجمالي + ضريبة 15%</th>
              <th>التاريخ</th><th>الحالة</th>
              {can.cancelInvoice && <th style={{ textAlign: 'end' }}>الإجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>جاري التحميل…</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>لا توجد فواتير</td></tr>
            ) : invoices.map(inv => {
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
                  {can.cancelInvoice && (
                    <td>
                      {!inv.is_cancelled && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(inv)} disabled={cancelMutation.isPending}>
                            <XCircle size={14} /> إلغاء
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
