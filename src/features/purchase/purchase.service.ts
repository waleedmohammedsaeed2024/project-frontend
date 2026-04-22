import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import { calcAvgCost, calcRepackUnitCost } from '@/lib/utils'
import { sendWhatsAppNotification, formatPurchaseInvoiceMessage } from '@/lib/whatsapp'
import type { PurchaseInvoice, InventoryItem, Partner } from '@/lib/database.types'

export type PurchaseLineInput = {
  item_id: string
  quantity: number
  item_cost: number
  repack_factor: number
  description?: string | null
}

export type CreatePurchaseInvoiceInput = {
  supplier_id: string
  supplier_inv_no?: string | null
  invoice_date: string
  lines: PurchaseLineInput[]
  invoiceCount: number
  items: InventoryItem[]
  supplier: Partner
}

export async function fetchPurchaseInvoices(): Promise<PurchaseInvoice[]> {
  const { data, error } = await supabase
    .from('purchase_invoice')
    .select('*, supplier:partner!supplier_id(partner_name, phone_no)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  assertNoError(error)
  return data as unknown as PurchaseInvoice[]
}

export async function createPurchaseInvoice(input: CreatePurchaseInvoiceInput): Promise<void> {
  const invoice_no = `PI-${String(input.invoiceCount + 1).padStart(6, '0')}`

  const { data: inv, error: invErr } = await supabase
    .from('purchase_invoice')
    .insert({
      supplier_id: input.supplier_id,
      supplier_inv_no: input.supplier_inv_no ?? null,
      invoice_date: new Date(input.invoice_date).toISOString(),
      invoice_no,
    })
    .select()
    .single()
  assertNoError(invErr)

  const { data: invOp, error: opErr } = await supabase
    .from('inventory')
    .insert({ operation_type: 'pur', reference_id: inv.id })
    .select()
    .single()
  assertNoError(opErr)

  for (const line of input.lines) {
    if (!line.item_id || !line.quantity || !line.item_cost) continue
    const rf = line.repack_factor || 1
    const unitCost = calcRepackUnitCost(line.quantity, line.item_cost, rf)
    const effectiveQty = line.quantity * rf

    const { error: lineErr } = await supabase
      .from('purchase_invoice_item')
      .insert({
        purchase_invoice_id: inv.id,
        item_id: line.item_id,
        quantity: line.quantity,
        item_cost: line.item_cost,
        repack_factor: rf,
        description: line.description ?? null,
      })
    assertNoError(lineErr)

    const item = input.items.find(i => i.id === line.item_id)
    if (item) {
      const newAvg = calcAvgCost(item.quantity, item.avg_cost, effectiveQty, unitCost)
      await supabase
        .from('inventory_item')
        .update({ quantity: item.quantity + effectiveQty, avg_cost: newAvg })
        .eq('id', item.id)
    }

    if (invOp) {
      await supabase
        .from('inventory_record')
        .insert({
          inventory_id: invOp.id,
          item_id: line.item_id,
          qty_change: effectiveQty,
          cost_at_operation: unitCost,
        })
    }
  }

  const totalCost = input.lines.reduce(
    (sum, l) => sum + l.quantity * l.item_cost,
    0,
  )
  await supabase
    .from('partner')
    .update({ balance: (input.supplier.balance ?? 0) + totalCost })
    .eq('id', input.supplier_id)

  if (input.supplier.phone_no) {
    const message = formatPurchaseInvoiceMessage(
      input.supplier.partner_name,
      invoice_no,
      input.lines.filter(l => l.item_id).length,
    )
    sendWhatsAppNotification(input.supplier.phone_no, message, input.supplier_id).catch(() => {})
  }
}
