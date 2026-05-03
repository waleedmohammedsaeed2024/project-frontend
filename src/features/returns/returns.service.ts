import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { Return, InventoryItem } from '@/lib/database.types'

export type ReturnLineInput = {
  item_id: string
  packaging_id: string | null
  quantity: number
  cost_price: number
}

export type CreateReturnInput = {
  return_type: 'sales' | 'purchase'
  ref_invoice_id: string
  reason?: string
  lines: ReturnLineInput[]
  items: InventoryItem[]
}

export type InvoiceListItem = {
  id: string
  invoice_no: string
  invoice_date: string
  partner_name: string
}

export type InvoiceLine = {
  item_id: string
  packaging_id: string | null
  item_name: string
  packaging_label: string | null
  quantity: number
  cost_price: number
}

export async function fetchReturns(): Promise<Return[]> {
  const { data: returns, error } = await supabase
    .from('return')
    .select('*')
    .is('deleted_at', null)
    .order('return_date', { ascending: false })
  assertNoError(error)
  if (!returns?.length) return [] as unknown as Return[]

  const returnIds = returns.map(r => r.id)
  const { data: lines, error: linesErr } = await supabase
    .from('return_item')
    .select('*')
    .in('return_id', returnIds)
    .is('deleted_at', null)
  assertNoError(linesErr)

  const itemIds = Array.from(new Set((lines ?? []).map(l => (l as { item_id: string }).item_id).filter(Boolean)))
  const pkgIds  = Array.from(new Set((lines ?? []).map(l => (l as { packaging_id?: string | null }).packaging_id).filter((x): x is string => !!x)))

  const { data: invItems } = itemIds.length
    ? await supabase.from('inventory_item').select('id, item_name').in('id', itemIds)
    : { data: [] as { id: string; item_name: string }[] }
  const { data: pkgs } = pkgIds.length
    ? await supabase.from('packaging').select('id, pack_arab, pack_eng').in('id', pkgIds)
    : { data: [] as { id: string; pack_arab: string; pack_eng: string }[] }

  const itemById = new Map((invItems ?? []).map(i => [i.id, i]))
  const pkgById  = new Map((pkgs ?? []).map(p => [p.id, p]))

  const linesByReturn = new Map<string, unknown[]>()
  for (const l of lines ?? []) {
    const lj = l as { return_id: string; item_id: string; packaging_id?: string | null }
    const enriched = {
      ...l,
      item: itemById.get(lj.item_id) ?? null,
      packaging: lj.packaging_id ? pkgById.get(lj.packaging_id) ?? null : null,
    }
    const arr = linesByReturn.get(lj.return_id) ?? []
    arr.push(enriched)
    linesByReturn.set(lj.return_id, arr)
  }

  return returns.map(r => ({
    ...r,
    items: linesByReturn.get(r.id) ?? [],
  })) as unknown as Return[]
}

// ── Invoice list (for searchable picker) ────────────────────────────────────
export async function fetchSalesInvoicesForReturn(): Promise<InvoiceListItem[]> {
  // sales_invoice → sales_order_id → sales_order.client → partner.partner_name
  const { data: invoices, error } = await supabase
    .from('sales_invoice')
    .select('id, invoice_no, invoice_date, sales_order_id')
    .eq('is_cancelled', false)
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false })
  assertNoError(error)
  if (!invoices?.length) return []

  const orderIds = Array.from(new Set(invoices.map(i => i.sales_order_id)))
  const { data: orders } = await supabase
    .from('sales_order')
    .select('id, client_id')
    .in('id', orderIds)

  const clientIds = Array.from(new Set((orders ?? []).map(o => o.client_id).filter(Boolean)))
  const { data: partners } = clientIds.length
    ? await supabase.from('partner').select('id, partner_name').in('id', clientIds)
    : { data: [] }

  const partnerById = new Map((partners ?? []).map(p => [p.id, p.partner_name as string]))
  const orderById = new Map((orders ?? []).map(o => [o.id, o.client_id as string]))

  return invoices.map(inv => ({
    id: inv.id,
    invoice_no: inv.invoice_no,
    invoice_date: inv.invoice_date,
    partner_name: partnerById.get(orderById.get(inv.sales_order_id) ?? '') ?? '—',
  }))
}

export async function fetchPurchaseInvoicesForReturn(): Promise<InvoiceListItem[]> {
  const { data: invoices, error } = await supabase
    .from('purchase_invoice')
    .select('id, invoice_no, invoice_date, supplier_id')
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false })
  assertNoError(error)
  if (!invoices?.length) return []

  const supplierIds = Array.from(new Set(invoices.map(i => i.supplier_id).filter(Boolean)))
  const { data: partners } = supplierIds.length
    ? await supabase.from('partner').select('id, partner_name').in('id', supplierIds)
    : { data: [] }
  const partnerById = new Map((partners ?? []).map(p => [p.id, p.partner_name as string]))

  return invoices.map(inv => ({
    id: inv.id,
    invoice_no: inv.invoice_no,
    invoice_date: inv.invoice_date,
    partner_name: partnerById.get(inv.supplier_id) ?? '—',
  }))
}

// ── Lines for a selected invoice ────────────────────────────────────────────
export async function fetchSalesInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
  const { data: inv } = await supabase
    .from('sales_invoice')
    .select('sales_order_id')
    .eq('id', invoiceId)
    .single()
  if (!inv) return []

  const { data: lines, error } = await supabase
    .from('sales_order_item')
    .select('item_id, packaging_id, quantity, item_cost, item:inventory_item(item_name), packaging:packaging(pack_arab, pack_eng)')
    .eq('sales_order_id', inv.sales_order_id)
    .is('deleted_at', null)
  assertNoError(error)

  return (lines ?? []).map(l => {
    const j = l as unknown as {
      item_id: string
      packaging_id: string | null
      quantity: number
      item_cost: number
      item?: { item_name?: string }
      packaging?: { pack_arab?: string; pack_eng?: string }
    }
    return {
      item_id: j.item_id,
      packaging_id: j.packaging_id ?? null,
      item_name: j.item?.item_name ?? '—',
      packaging_label: j.packaging?.pack_arab ?? j.packaging?.pack_eng ?? null,
      quantity: j.quantity,
      cost_price: j.item_cost,
    }
  })
}

export async function fetchPurchaseInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
  const { data: lines, error } = await supabase
    .from('purchase_invoice_item')
    .select('item_id, packaging_id, quantity, item_cost, item:inventory_item(item_name), packaging:packaging(pack_arab, pack_eng)')
    .eq('purchase_invoice_id', invoiceId)
    .is('deleted_at', null)
  assertNoError(error)

  return (lines ?? []).map(l => {
    const j = l as unknown as {
      item_id: string
      packaging_id: string | null
      quantity: number
      item_cost: number
      item?: { item_name?: string }
      packaging?: { pack_arab?: string; pack_eng?: string }
    }
    return {
      item_id: j.item_id,
      packaging_id: j.packaging_id ?? null,
      item_name: j.item?.item_name ?? '—',
      packaging_label: j.packaging?.pack_arab ?? j.packaging?.pack_eng ?? null,
      quantity: j.quantity,
      cost_price: j.item_cost,
    }
  })
}

// ── Per-packaging stock movement (mirror of the adjustments service) ────────
async function moveItemStock(
  itemId: string,
  packagingId: string | null,
  qtyDelta: number, // +N for sales return, -N for purchase return
  unitCost: number,
): Promise<void> {
  let q = supabase.from('item_stock').select('id, quantity').eq('item_id', itemId)
  q = packagingId ? q.eq('packaging_id', packagingId) : q.is('packaging_id', null)
  const { data: existing } = await q.maybeSingle()

  if (existing) {
    await supabase
      .from('item_stock')
      .update({ quantity: existing.quantity + qtyDelta })
      .eq('id', existing.id)
  } else if (qtyDelta > 0) {
    // Sales return for a packaging that has no stock row yet — create it.
    await supabase.from('item_stock').insert({
      item_id: itemId,
      packaging_id: packagingId,
      quantity: qtyDelta,
      avg_cost: unitCost,
    })
  }
  // If qtyDelta < 0 and no row exists, silently skip (per the relaxed
  // "no constraint at delivery/return" policy elsewhere in the codebase).
}

export async function createReturn(input: CreateReturnInput): Promise<void> {
  const validLines = input.lines.filter(l => l.item_id && l.quantity > 0)
  if (validLines.length === 0) throw new Error('أدخل كمية مرتجع لصنف واحد على الأقل')

  const { data: ret, error: retErr } = await supabase
    .from('return')
    .insert({
      return_type: input.return_type,
      ref_invoice_id: input.ref_invoice_id,
      reason: input.reason ?? null,
    })
    .select()
    .single()
  assertNoError(retErr)

  try {
    const { data: invOp, error: invErr } = await supabase
      .from('inventory')
      .insert({ operation_type: 'ren', reference_id: ret.id })
      .select()
      .single()
    assertNoError(invErr)

    for (const line of validLines) {
      const { error: lineErr } = await supabase.from('return_item').insert({
        return_id: ret.id,
        item_id: line.item_id,
        packaging_id: line.packaging_id,
        quantity: line.quantity,
        cost_price: line.cost_price,
      })
      assertNoError(lineErr)

      const qtyDelta = input.return_type === 'sales' ? line.quantity : -line.quantity

      // 1. Per-packaging stock
      await moveItemStock(line.item_id, line.packaging_id, qtyDelta, line.cost_price)

      // 2. Inventory_item aggregate
      const item = input.items.find(i => i.id === line.item_id)
      if (item) {
        const { error: aggErr } = await supabase
          .from('inventory_item')
          .update({ quantity: Math.max(0, item.quantity + qtyDelta) })
          .eq('id', line.item_id)
        assertNoError(aggErr)
      }

      // 3. Audit row
      const { error: recErr } = await supabase.from('inventory_record').insert({
        inventory_id: invOp.id,
        item_id: line.item_id,
        qty_change: qtyDelta,
        cost_at_operation: line.cost_price,
      })
      assertNoError(recErr)
    }
  } catch (err) {
    // Roll back the parent return so we don't leave an orphan with no items.
    // Hard-delete since nothing references it yet (CASCADE on inventory.reference_id
    // is informational only — there's no FK).
    await supabase.from('return').delete().eq('id', ret.id)
    throw err
  }
}
