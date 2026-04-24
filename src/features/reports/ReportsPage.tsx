import { useState } from 'react'
import { FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  runInventoryReport, runClientStatement, runSupplierStatement,
  runSalesSummary, runPurchaseSummary, fetchReportMeta,
  type ReportType, type ReportFilter,
} from './reports.service'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('inventory')
  const [filters, setFilters] = useState<ReportFilter>({ from: '', to: '' })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<unknown[]>([])

  const { data: meta } = useQuery({
    queryKey: queryKeys.reports(),
    queryFn: fetchReportMeta,
  })

  const clients = meta?.clients ?? []
  const suppliers = meta?.suppliers ?? []

  async function runReport() {
    setRunning(true)
    setResults([])
    try {
      let data: unknown[] = []
      if (activeReport === 'inventory') data = await runInventoryReport()
      else if (activeReport === 'client-statement' && filters.client_id)
        data = await runClientStatement(filters.client_id, filters)
      else if (activeReport === 'supplier-statement' && filters.supplier_id)
        data = await runSupplierStatement(filters.supplier_id, filters)
      else if (activeReport === 'sales-summary') data = await runSalesSummary(filters)
      else if (activeReport === 'purchase-summary') data = await runPurchaseSummary(filters)
      setResults(data)
    } finally {
      setRunning(false)
    }
  }

  const REPORTS: { value: ReportType; label: string }[] = [
    { value: 'inventory',          label: 'تقرير المخزون' },
    { value: 'client-statement',   label: 'كشف حساب عميل' },
    { value: 'supplier-statement', label: 'كشف حساب مورد' },
    { value: 'sales-summary',      label: 'ملخص المبيعات' },
    { value: 'purchase-summary',   label: 'ملخص المشتريات' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">التقارير</h1>
          <p className="page-subtitle">تقارير المخزون والحسابات والعمليات</p>
        </div>
        <button className="btn btn-primary" onClick={runReport} disabled={running}>
          <FileText size={16} /> {running ? 'جاري التشغيل…' : 'تشغيل التقرير'}
        </button>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {REPORTS.map(r => (
            <button key={r.value} onClick={() => { setActiveReport(r.value); setResults([]) }} style={{
              padding: '7px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: activeReport === r.value ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: activeReport === r.value ? 'white' : 'var(--color-text)',
            }}>
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {activeReport === 'client-statement' && (
            <div className="form-group" style={{ minWidth: 200 }}>
              <label className="form-label">العميل</label>
              <select className="form-select" value={filters.client_id ?? ''} onChange={e => setFilters(f => ({ ...f, client_id: e.target.value }))}>
                <option value="">— اختر العميل —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.partner_name}</option>)}
              </select>
            </div>
          )}
          {activeReport === 'supplier-statement' && (
            <div className="form-group" style={{ minWidth: 200 }}>
              <label className="form-label">المورد</label>
              <select className="form-select" value={filters.supplier_id ?? ''} onChange={e => setFilters(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">— اختر المورد —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.partner_name}</option>)}
              </select>
            </div>
          )}
          {activeReport !== 'inventory' && (
            <>
              <div className="form-group">
                <label className="form-label">من تاريخ</label>
                <input type="date" className="form-input" value={filters.from ?? ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">إلى تاريخ</label>
                <input type="date" className="form-input" value={filters.to ?? ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
              </div>
            </>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>النتائج ({results.length} سجل)</h3>
          </div>

          {activeReport === 'inventory' && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>الصنف</th><th style={{ textAlign: 'end' }}>الكمية</th><th style={{ textAlign: 'end' }}>متوسط التكلفة</th><th style={{ textAlign: 'end' }}>القيمة الإجمالية</th></tr>
                </thead>
                <tbody>
                  {(results as Array<{ id: string; item_name: string; quantity: number; avg_cost: number }>).map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 500 }}>{row.item_name}</td>
                      <td style={{ textAlign: 'end' }}>{row.quantity}</td>
                      <td style={{ textAlign: 'end' }}>{formatCurrency(row.avg_cost, 4)}</td>
                      <td style={{ textAlign: 'end', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(row.quantity * row.avg_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(activeReport === 'sales-summary' || activeReport === 'client-statement') && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>رقم الفاتورة</th><th>التاريخ</th><th style={{ textAlign: 'end' }}>الإجمالي</th><th>الحالة</th></tr>
                </thead>
                <tbody>
                  {(results as Array<{ id: string; invoice_no: string; invoice_date: string; total_amount: number; is_cancelled: boolean }>).map(row => (
                    <tr key={row.id}>
                      <td><code style={{ fontSize: 13 }}>{row.invoice_no}</code></td>
                      <td style={{ fontSize: 13 }}>{formatDate(row.invoice_date)}</td>
                      <td style={{ textAlign: 'end', fontWeight: 700 }}>{formatCurrency(row.total_amount)}</td>
                      <td><span className={`badge ${row.is_cancelled ? 'badge-cancelled' : 'badge-completed'}`}>{row.is_cancelled ? 'ملغاة' : 'فعّالة'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(activeReport === 'purchase-summary' || activeReport === 'supplier-statement') && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>رقم الفاتورة</th><th>المورد</th><th>التاريخ</th></tr>
                </thead>
                <tbody>
                  {(results as Array<{ id: string; invoice_no: string; invoice_date: string; supplier?: { partner_name: string } }>).map(row => (
                    <tr key={row.id}>
                      <td><code style={{ fontSize: 13 }}>{row.invoice_no}</code></td>
                      <td style={{ fontWeight: 500 }}>{row.supplier?.partner_name ?? '—'}</td>
                      <td style={{ fontSize: 13 }}>{formatDate(row.invoice_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
