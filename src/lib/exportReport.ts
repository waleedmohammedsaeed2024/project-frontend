export interface ExportColumn<T> {
  key: string
  label: string
  align?: 'start' | 'end' | 'center'
  /** Plain-text accessor for export (no JSX). Falls back to row[key]. */
  value: (row: T) => string | number | null | undefined
}

function escapeCSV(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function exportCSV<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const header = columns.map(c => escapeCSV(c.label)).join(',')
  const body = rows
    .map(r => columns.map(c => escapeCSV(c.value(r))).join(','))
    .join('\n')
  // BOM so Excel detects UTF-8 (Arabic)
  const csv = '﻿' + header + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escapeHTML(v: unknown): string {
  if (v == null) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function printReport<T>(title: string, columns: ExportColumn<T>[], rows: T[]) {
  const headHTML = columns
    .map(c => `<th style="text-align:${c.align ?? 'start'}">${escapeHTML(c.label)}</th>`)
    .join('')
  const bodyHTML = rows
    .map(
      r =>
        `<tr>${columns
          .map(c => `<td style="text-align:${c.align ?? 'start'}">${escapeHTML(c.value(r))}</td>`)
          .join('')}</tr>`,
    )
    .join('')

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>${escapeHTML(title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:12px;color:#111;direction:rtl;padding:28px}
  h1{font-size:20px;font-weight:800;margin-bottom:4px}
  .meta{font-size:12px;color:#666;margin-bottom:18px;display:flex;justify-content:space-between}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{padding:8px 10px;border-bottom:1px solid #e5e5e5}
  th{background:#f4f4f5;font-weight:700;text-align:start}
  tbody tr:nth-child(even){background:#fafafa}
  @media print{body{padding:0}}
</style></head>
<body>
  <h1>${escapeHTML(title)}</h1>
  <div class="meta"><span>تاريخ الطباعة: ${today}</span><span>عدد السجلات: ${rows.length}</span></div>
  <table><thead><tr>${headHTML}</tr></thead><tbody>${bodyHTML}</tbody></table>
  <script>window.onload=()=>{window.print();}</script>
</body></html>`

  const w = window.open('', '_blank', 'width=1000,height=700')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
}
