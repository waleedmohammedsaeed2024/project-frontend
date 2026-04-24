import type { SalesOrder, SalesOrderItem } from './database.types'
import { formatDate } from './utils'

const STATUS_AR: Record<string, string> = {
  o: 'قيد التنفيذ',
  p: 'قيد التوصيل',
  c: 'تم التسليم',
  d: 'ملغى',
}

export function printOrderPDF(order: SalesOrder) {
  type PartnerShape = { partner_name: string; phone_no?: string | null }
  const client = (order as unknown as { client?: PartnerShape }).client
  const customer = (order as unknown as { customer?: PartnerShape }).customer
  const lines = (order.items ?? []) as SalesOrderItem[]
  const grandTotal = lines.reduce((s, l) => s + l.quantity * l.item_price, 0)
  const ref = order.id.slice(0, 8).toUpperCase()

  // ── Line items rows ───────────────────────────────────────────────────────
  const rowsHTML = lines.map((l, i) => {
    const name = l.item?.item_name ?? '—'
    const eng = l.item?.item_english_name ?? ''
    const pkgAr = l.packaging?.pack_arab ?? '—'
    const pkgEn = l.packaging?.pack_eng ?? ''
    const total = l.quantity * l.item_price
    return `<tr>
      <td style="text-align:center;color:#666">${i + 1}</td>
      <td>${name}${eng ? `<br><span style="font-size:10px;color:#888">${eng}</span>` : ''}</td>
      <td style="text-align:center">
        <span style="font-weight:600">${pkgAr}</span>${pkgEn && pkgEn !== pkgAr ? `<br><span style="font-size:10px;color:#888">${pkgEn}</span>` : ''}
      </td>
      <td style="text-align:center">${l.quantity}</td>
      <td style="text-align:right">${l.item_price.toFixed(3)}</td>
      <td style="text-align:right;font-weight:600">${total.toFixed(3)}</td>
    </tr>`
  }).join('')

  // ── Packaging detail rows (one row per line, expandable fill area) ────────
  const pkgDetailRows = lines.map((l, i) => {
    const name = l.item?.item_name ?? '—'
    const pkgAr = l.packaging?.pack_arab ?? '—'
    return `<tr>
      <td style="text-align:center;color:#666;width:36px">${i + 1}</td>
      <td style="width:160px">${name}</td>
      <td style="width:100px;font-weight:600;text-align:center">${pkgAr}</td>
      <td style="width:60px;text-align:center">${l.quantity}</td>
      <td style="min-width:80px">&nbsp;</td>
      <td style="min-width:140px">&nbsp;</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>إذن تسليم — ${ref}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:13px;color:#111;direction:rtl;padding:36px}
  h1{font-size:22px;text-align:center;margin-bottom:4px;font-weight:800}
  .ref{text-align:center;color:#666;font-size:12px;margin-bottom:28px}
  .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;border:1px solid #ddd;border-radius:8px;padding:14px;margin-bottom:24px;background:#f8fafc}
  .meta label{font-size:10px;color:#888;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px}
  .meta .val{font-weight:600;font-size:13px}
  .meta .sub{font-size:11px;color:#555;margin-top:2px}
  h2{font-size:14px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #1e293b}
  h2.pkg-title{border-bottom-color:#0f766e;color:#0f4c42}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th{background:#1e293b;color:#fff;padding:9px 10px;text-align:right;font-size:11px;font-weight:600}
  th.pkg-head{background:#0f766e}
  td{padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;vertical-align:middle}
  .pkg-table td{padding:10px 10px;border:1px solid #ddd;height:38px}
  .total-row td{font-weight:700;background:#f1f5f9;font-size:14px;border-top:2px solid #cbd5e1}
  .ack{margin-top:40px}
  .ack h2{border-bottom-color:#64748b;color:#334155}
  .ack-body{font-size:12px;color:#444;margin:14px 0 24px;line-height:1.7}
  .sig-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
  .sig-box label{font-size:11px;color:#555;display:block;margin-bottom:10px;font-weight:600}
  .sig-line{border-bottom:1px solid #333;height:40px}
  @media print{@page{size:A4;margin:18mm} body{padding:0}}
</style></head>
<body>
  <h1>إذن تسليم / Delivery Note</h1>
  <div class="ref">المرجع: ${ref} &nbsp;|&nbsp; ${formatDate(order.order_date)} &nbsp;|&nbsp; ${STATUS_AR[order.status] ?? order.status}</div>

  <div class="meta">
    <div>
      <label>العميل / Client</label>
      <div class="val">${client?.partner_name ?? '—'}</div>
      ${client?.phone_no ? `<div class="sub">${client.phone_no}</div>` : ''}
    </div>
    <div>
      <label>الزبون / Customer</label>
      <div class="val">${customer?.partner_name ?? '—'}</div>
      ${customer?.phone_no ? `<div class="sub">${customer.phone_no}</div>` : ''}
    </div>
    <div>
      <label>الموقع / Site</label>
      <div class="val">${order.site ?? '—'}</div>
      ${order.description ? `<div class="sub">${order.description}</div>` : ''}
    </div>
  </div>

  <!-- ── Line items ──────────────────────────────────────────────────── -->
  <h2>الأصناف / Line Items</h2>
  <table>
    <thead><tr>
      <th style="width:36px;text-align:center">#</th>
      <th>الصنف / Item</th>
      <th style="width:110px;text-align:center">التعبئة</th>
      <th style="width:70px;text-align:center">الكمية</th>
      <th style="width:100px;text-align:right">السعر / وحدة</th>
      <th style="width:110px;text-align:right">الإجمالي</th>
    </tr></thead>
    <tbody>${rowsHTML || '<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">لا توجد أصناف</td></tr>'}</tbody>
    <tfoot><tr class="total-row">
      <td colspan="5" style="text-align:right;padding-left:12px">الإجمالي الكلي / Grand Total:</td>
      <td style="text-align:right">${grandTotal.toFixed(3)}</td>
    </tr></tfoot>
  </table>

  <!-- ── Packaging details fill area ────────────────────────────────── -->
  <div style="margin-top:28px">
    <h2 class="pkg-title">تفاصيل التعبئة / Packaging Details</h2>
    <table class="pkg-table">
      <thead><tr>
        <th class="pkg-head" style="width:36px;text-align:center">#</th>
        <th class="pkg-head">الصنف</th>
        <th class="pkg-head" style="width:110px;text-align:center">نوع التعبئة</th>
        <th class="pkg-head" style="width:70px;text-align:center">الكمية</th>
        <th class="pkg-head" style="width:90px;text-align:center">العدد المستلم</th>
        <th class="pkg-head">ملاحظات التعبئة</th>
      </tr></thead>
      <tbody>
        ${pkgDetailRows || '<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">لا توجد بنود</td></tr>'}
        <!-- extra blank rows for manual additions -->
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
      </tbody>
    </table>
  </div>

  <!-- ── Acknowledgement ─────────────────────────────────────────────── -->
  <div class="ack">
    <h2>إقرار الاستلام / Acknowledgement of Receipt</h2>
    <p class="ack-body">
      أقر أنا الموقع أدناه باستلام البضاعة المذكورة أعلاه بحالة جيدة وكاملة وفق الكميات والمواصفات المدرجة في هذا الإذن.<br>
      I, the undersigned, acknowledge receipt of the above-mentioned goods in good condition and complete as per the quantities and specifications listed in this delivery note.
    </p>
    <div class="sig-grid">
      <div class="sig-box">
        <label>اسم المستلم / Receiver Name</label>
        <div class="sig-line"></div>
      </div>
      <div class="sig-box">
        <label>التوقيع / Signature</label>
        <div class="sig-line"></div>
      </div>
      <div class="sig-box">
        <label>التاريخ / Date</label>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'width=960,height=720')
  if (win) {
    win.addEventListener('load', () => {
      setTimeout(() => { win.print(); URL.revokeObjectURL(url) }, 300)
    })
  }
}
