import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const

export function usePagination<T>(items: T[], defaultSize: number = 20) {
  const [pageSize, setPageSize] = useState<number>(defaultSize)
  const [page, setPage] = useState(0)

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // When the dataset shrinks (e.g. after a search), clamp the page index.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])

  const start = page * pageSize
  const visible = items.slice(start, start + pageSize)

  function resetToFirst() { setPage(0) }

  return { visible, page, setPage, pageSize, setPageSize, pageCount, total, start, resetToFirst }
}

interface PaginationFooterProps {
  page: number
  pageCount: number
  pageSize: number
  total: number
  start: number
  setPage: (p: number | ((p: number) => number)) => void
  setPageSize: (n: number) => void
}

export function PaginationFooter({ page, pageCount, pageSize, total, start, setPage, setPageSize }: PaginationFooterProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
        <span>عدد السجلات لكل صفحة:</span>
        <select className="form-select" style={{ width: 'auto', padding: '4px 28px 4px 8px' }} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>{total === 0 ? 0 : start + 1}–{Math.min(start + pageSize, total)} من {total}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} title="السابق"><ChevronRight size={14} /></button>
        <span style={{ fontSize: 13, minWidth: 64, textAlign: 'center' }}>صفحة {page + 1} من {pageCount}</span>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} title="التالي"><ChevronLeft size={14} /></button>
      </div>
    </div>
  )
}
