import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ChevronLeft, ChevronRight, Download, Printer, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  runInventoryReport, runClientStatement, runSupplierStatement,
  runSalesSummary, runPurchaseSummary, runBankCashFlow, fetchReportMeta,
  type ReportType, type ReportFilter,
} from './reports.service'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { exportCSV, printReport, type ExportColumn } from '@/lib/exportReport'

const PAGE_OPTIONS = [20, 50, 100] as const

interface Column<T> {
  key: string
  label: string
  align?: 'start' | 'end' | 'center'
  render: (row: T) => React.ReactNode
  text: (row: T) => string | number | null | undefined
  searchable?: boolean
}

function BalanceBadge({ label, value, tint, fg }: { label: string; value: number; tint: string; fg: string }) {
  const negative = value < 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 14px',
      borderRadius: 999,
      background: tint,
      color: fg,
      border: `1px solid ${fg}33`,
      boxShadow: 'var(--shadow-sm)',
      minWidth: 140,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>
        {label}
      </span>
      <span style={{
        marginInlineStart: 'auto',
        fontSize: 15, fontWeight: 800,
        color: negative ? 'oklch(0.45 0.10 18)' : fg,
      }}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

const REPORTS: { value: ReportType; label: string }[] = [
  { value: 'inventory',          label: 'تقرير المخزون' },
  { value: 'client-statement',   label: 'كشف حساب عميل' },
  { value: 'supplier-statement', label: 'كشف حساب مورد' },
  { value: 'sales-summary',      label: 'ملخص المبيعات' },
  { value: 'purchase-summary',   label: 'ملخص المشتريات' },
  { value: 'bank-cash',          label: 'البنك والنقدية' },
]

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('inventory')
  const [filters, setFilters] = useState<ReportFilter>({ from: '', to: '' })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<unknown[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)

  const { data: meta } = useQuery({
    queryKey: queryKeys.reports(),
    queryFn: fetchReportMeta,
  })

  const clients = meta?.clients ?? []
  const suppliers = meta?.suppliers ?? []

  async function runReport() {
    setRunning(true)
    setResults([])
    setPage(1)
    setSearch('')
    try {
      let data: unknown[] = []
      if (activeReport === 'inventory') data = await runInventoryReport()
      else if (activeReport === 'client-statement' && filters.client_id)
        data = await runClientStatement(filters.client_id, filters)
      else if (activeReport === 'supplier-statement' && filters.supplier_id)
        data = await runSupplierStatement(filters.supplier_id, filters)
      else if (activeReport === 'sales-summary') data = await runSalesSummary(filters)
      else if (activeReport === 'purchase-summary') data = await runPurchaseSummary(filters)
      else if (activeReport === 'bank-cash') data = await runBankCashFlow(filters)
      setResults(data)
    } finally {
      setRunning(false)
    }
  }

  const columns = useMemo<Column<Record<string, unknown>>[]>(() => {
    if (activeReport === 'inventory') {
      type R = { id: string; item_name: string; quantity: number; avg_cost: number }
      return [
        {
          key: 'item_name', label: 'الصنف', searchable: true,
          render: (r) => {
            const row = r as R
            return (
              <Link
                to={`/reports/item/${row.id}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {row.item_name}
                <ChevronLeft size={14} />
              </Link>
            )
          },
          text: (r) => (r as R).item_name,
        },
        { key: 'quantity', label: 'الكمية', align: 'end',
          render: (r) => (r as R).quantity, text: (r) => (r as R).quantity },
        { key: 'avg_cost', label: 'متوسط التكلفة', align: 'end',
          render: (r) => formatCurrency((r as R).avg_cost, 4), text: (r) => formatCurrency((r as R).avg_cost, 4) },
        { key: 'total_value', label: 'القيمة الإجمالية', align: 'end',
          render: (r) => <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency((r as R).quantity * (r as R).avg_cost)}</span>,
          text: (r) => formatCurrency((r as R).quantity * (r as R).avg_cost) },
      ] as Column<Record<string, unknown>>[]
    }

    if (activeReport === 'sales-summary') {
      type R = { id: string; invoice_no: string; invoice_date: string; total_amount: number; is_cancelled: boolean; client_name?: string }
      return [
        { key: 'invoice_no', label: 'رقم الفاتورة', searchable: true,
          render: (r) => <code style={{ fontSize: 13 }}>{(r as R).invoice_no}</code>,
          text: (r) => (r as R).invoice_no },
        { key: 'invoice_date', label: 'التاريخ',
          render: (r) => formatDate((r as R).invoice_date), text: (r) => formatDate((r as R).invoice_date) },
        { key: 'client_name', label: 'العميل', searchable: true,
          render: (r) => (r as R).client_name ?? '—', text: (r) => (r as R).client_name ?? '' },
        { key: 'total_amount', label: 'الإجمالي', align: 'end',
          render: (r) => <span style={{ fontWeight: 700 }}>{formatCurrency((r as R).total_amount)}</span>,
          text: (r) => formatCurrency((r as R).total_amount) },
        { key: 'status', label: 'الحالة',
          render: (r) => <span className={`badge ${(r as R).is_cancelled ? 'badge-cancelled' : 'badge-completed'}`}>{(r as R).is_cancelled ? 'ملغاة' : 'فعّالة'}</span>,
          text: (r) => (r as R).is_cancelled ? 'ملغاة' : 'فعّالة' },
      ] as Column<Record<string, unknown>>[]
    }

    if (activeReport === 'client-statement' || activeReport === 'supplier-statement') {
      type R = { row_id: string; entry_date: string; kind: 'invoice' | 'payment'; reference: string | null; description: string | null; debit: number; credit: number; balance: number }
      return [
        { key: 'entry_date', label: 'التاريخ',
          render: (r) => formatDate((r as R).entry_date), text: (r) => formatDate((r as R).entry_date) },
        { key: 'kind', label: 'النوع',
          render: (r) => {
            const isInv = (r as R).kind === 'invoice'
            return (
              <span style={{
                display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
                fontSize: 12, fontWeight: 600,
                background: isInv ? 'oklch(0.94 0.07 240 / 0.5)' : 'oklch(0.95 0.08 140 / 0.5)',
                color: isInv ? 'oklch(0.42 0.18 240)' : 'oklch(0.40 0.16 140)',
              }}>{isInv ? 'فاتورة' : 'دفعة'}</span>
            )
          },
          text: (r) => (r as R).kind === 'invoice' ? 'فاتورة' : 'دفعة' },
        { key: 'reference', label: 'المرجع', searchable: true,
          render: (r) => <code style={{ fontSize: 13 }}>{(r as R).reference ?? '—'}</code>,
          text: (r) => (r as R).reference ?? '' },
        { key: 'description', label: 'البيان', searchable: true,
          render: (r) => <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{(r as R).description ?? '—'}</span>,
          text: (r) => (r as R).description ?? '' },
        { key: 'debit', label: 'مدين', align: 'end',
          render: (r) => (r as R).debit > 0 ? formatCurrency((r as R).debit) : '—',
          text: (r) => (r as R).debit > 0 ? formatCurrency((r as R).debit) : '' },
        { key: 'credit', label: 'دائن', align: 'end',
          render: (r) => (r as R).credit > 0
            ? <span style={{ color: 'oklch(0.40 0.16 140)' }}>{formatCurrency((r as R).credit)}</span>
            : '—',
          text: (r) => (r as R).credit > 0 ? formatCurrency((r as R).credit) : '' },
        { key: 'balance', label: 'الرصيد', align: 'end',
          render: (r) => <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency((r as R).balance)}</span>,
          text: (r) => formatCurrency((r as R).balance) },
      ] as Column<Record<string, unknown>>[]
    }

    if (activeReport === 'bank-cash') {
      type R = {
        payment_id: string; paydate: string; channel: 'cash' | 'bank'; paytype: string;
        partner_name: string | null; partner_type: 'c' | 's'; source: 'sales' | 'purchase';
        direction: 'in' | 'out'; inflow: number; outflow: number;
        paymemo: string | null; bank_balance: number; cash_balance: number
      }
      return [
        { key: 'paydate', label: 'التاريخ',
          render: (r) => formatDate((r as R).paydate), text: (r) => formatDate((r as R).paydate) },
        { key: 'channel', label: 'القناة', searchable: true,
          render: (r) => {
            const isBank = (r as R).channel === 'bank'
            return (
              <span style={{
                display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
                fontSize: 12, fontWeight: 600,
                background: isBank ? 'oklch(0.94 0.07 240 / 0.5)' : 'oklch(0.96 0.08 70 / 0.5)',
                color: isBank ? 'oklch(0.42 0.18 240)' : 'oklch(0.45 0.14 68)',
              }}>{isBank ? 'بنك' : 'نقدية'}</span>
            )
          },
          text: (r) => (r as R).channel === 'bank' ? 'بنك البنك bank' : 'نقدية النقدية cash' },
        { key: 'source', label: 'العملية',
          render: (r) => (r as R).source === 'sales' ? 'مبيعات' : 'مشتريات',
          text: (r) => (r as R).source === 'sales' ? 'مبيعات' : 'مشتريات' },
        { key: 'partner_name', label: 'الطرف', searchable: true,
          render: (r) => (r as R).partner_name ?? '—', text: (r) => (r as R).partner_name ?? '' },
        { key: 'reference', label: 'مرجع الدفعة', searchable: true,
          render: (r) => <code style={{ fontSize: 12 }}>{(r as R).payment_id.slice(0, 8).toUpperCase()}</code>,
          text: (r) => (r as R).payment_id.slice(0, 8).toUpperCase() },
        { key: 'paymemo', label: 'البيان', searchable: true,
          render: (r) => <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{(r as R).paymemo ?? '—'}</span>,
          text: (r) => (r as R).paymemo ?? '' },
        { key: 'inflow', label: 'وارد', align: 'end',
          render: (r) => (r as R).inflow > 0
            ? <span style={{ color: 'oklch(0.40 0.16 140)', fontWeight: 600 }}>{formatCurrency((r as R).inflow)}</span>
            : '—',
          text: (r) => (r as R).inflow > 0 ? formatCurrency((r as R).inflow) : '' },
        { key: 'outflow', label: 'صادر', align: 'end',
          render: (r) => (r as R).outflow > 0
            ? <span style={{ color: 'oklch(0.45 0.10 18)', fontWeight: 600 }}>{formatCurrency((r as R).outflow)}</span>
            : '—',
          text: (r) => (r as R).outflow > 0 ? formatCurrency((r as R).outflow) : '' },
        { key: 'bank_balance', label: 'رصيد البنك', align: 'end',
          render: (r) => <span style={{ fontWeight: 700, color: 'oklch(0.42 0.18 240)' }}>{formatCurrency((r as R).bank_balance)}</span>,
          text: (r) => formatCurrency((r as R).bank_balance) },
        { key: 'cash_balance', label: 'رصيد النقدية', align: 'end',
          render: (r) => <span style={{ fontWeight: 700, color: 'oklch(0.45 0.14 68)' }}>{formatCurrency((r as R).cash_balance)}</span>,
          text: (r) => formatCurrency((r as R).cash_balance) },
      ] as Column<Record<string, unknown>>[]
    }

    // purchase-summary
    type R = { id: string; invoice_no: string; invoice_date: string; supplier_inv_no?: string | null; supplier?: { partner_name: string }; total_amount?: number }
    return [
      { key: 'invoice_no', label: 'رقم الفاتورة', searchable: true,
        render: (r) => <code style={{ fontSize: 13 }}>{(r as R).invoice_no}</code>,
        text: (r) => (r as R).invoice_no },
      { key: 'supplier_inv_no', label: 'فاتورة المورد', searchable: true,
        render: (r) => (r as R).supplier_inv_no ?? '—', text: (r) => (r as R).supplier_inv_no ?? '' },
      { key: 'supplier', label: 'المورد', searchable: true,
        render: (r) => (r as R).supplier?.partner_name ?? '—', text: (r) => (r as R).supplier?.partner_name ?? '' },
      { key: 'invoice_date', label: 'التاريخ',
        render: (r) => formatDate((r as R).invoice_date), text: (r) => formatDate((r as R).invoice_date) },
      { key: 'total_amount', label: 'الإجمالي', align: 'end',
        render: (r) => <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
          {(r as R).total_amount != null ? formatCurrency(Number((r as R).total_amount)) : '—'}
        </span>,
        text: (r) => (r as R).total_amount != null ? formatCurrency(Number((r as R).total_amount)) : '' },
    ] as Column<Record<string, unknown>>[]
  }, [activeReport])

  // Search filter
  const searched = useMemo(() => {
    if (!search.trim()) return results as Record<string, unknown>[]
    const q = search.toLowerCase()
    return (results as Record<string, unknown>[]).filter(row =>
      columns.some(c => c.searchable && String(c.text(row) ?? '').toLowerCase().includes(q)),
    )
  }, [results, search, columns])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(searched.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = searched.slice((safePage - 1) * pageSize, safePage * pageSize)

  function exportCols(): ExportColumn<Record<string, unknown>>[] {
    return columns.map(c => ({ key: c.key, label: c.label, align: c.align, value: c.text }))
  }

  const reportLabel = REPORTS.find(r => r.value === activeReport)?.label ?? 'تقرير'

  function handlePrint() {
    printReport(reportLabel, exportCols(), searched)
  }

  function handleCSV() {
    const stamp = new Date().toISOString().slice(0, 10)
    exportCSV(`${reportLabel}-${stamp}`, exportCols(), searched)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">التقارير</h1>
          <p className="page-subtitle">تقارير المخزون والحسابات والعمليات</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleCSV} disabled={results.length === 0}>
            <Download size={16} /> Excel
          </button>
          <button className="btn btn-secondary" onClick={handlePrint} disabled={results.length === 0}>
            <Printer size={16} /> PDF
          </button>
          <button className="btn btn-primary" onClick={runReport} disabled={running}>
            <FileText size={16} /> {running ? 'جاري التشغيل…' : 'تشغيل التقرير'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {REPORTS.map(r => (
            <button key={r.value} onClick={() => { setActiveReport(r.value); setResults([]); setSearch(''); setPage(1) }} style={{
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
              {activeReport === 'bank-cash' && results.length > 0 && (
                <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 10, alignSelf: 'flex-end' }}>
                  <BalanceBadge
                    label="البنك"
                    value={(results[0] as { bank_balance: number }).bank_balance}
                    tint="oklch(0.94 0.07 240 / 0.55)"
                    fg="oklch(0.42 0.18 240)"
                  />
                  <BalanceBadge
                    label="النقدية"
                    value={(results[0] as { cash_balance: number }).cash_balance}
                    tint="oklch(0.96 0.08 70 / 0.55)"
                    fg="oklch(0.45 0.14 68)"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          {/* Search + page-size */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 360 }}>
              <Search size={15} style={{
                position: 'absolute', insetInlineStart: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
              }} />
              <input
                className="form-input"
                style={{ paddingInlineStart: 36 }}
                placeholder="بحث في النتائج…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {searched.length} سجل
              </span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 10px' }}
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              >
                {PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} / صفحة</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {columns.map(c => (
                    <th key={c.key} style={{ textAlign: c.align ?? 'start' }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                      لا توجد نتائج مطابقة
                    </td>
                  </tr>
                ) : paginated.map((row, i) => (
                  <tr key={(row.row_id as string) ?? (row.id as string) ?? (row.payment_id as string) ?? i}>
                    {columns.map(c => (
                      <td key={c.key} style={{ textAlign: c.align ?? 'start' }}>{c.render(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 16, gap: 8, flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                صفحة {safePage} من {totalPages}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronRight size={14} /> السابق
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  التالي <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
