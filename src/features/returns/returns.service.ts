import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { Return, InventoryItem, SalesInvoice, PurchaseInvoice } from '@/lib/database.types'

export type ReturnLineInput = {
  item_id: string
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

export async function fetchReturns(): Promise<Return[]> {
  const { data, error } = await supabase
    .from('return')
    .select('*, items:return_item(*, item:inventory_item(item_name))')
    .is('deleted_at', null)
    .order('return_date', { ascending: false })
  assertNoError(error)
  return data as unknown as Return[]
}

export async function fetchSalesInvoicesForReturn(): Promise<Pick<SalesInvoice, 'id' | 'invoice_no'>[]> {
  const { data, error } = await supabase
    .from('sales_invoice')
    .select('id, invoice_no')
    .eq('is_cancelled', false)
    .is('deleted_at', null)
  assertNoError(error)
  return data as Pick<SalesInvoice, 'id' | 'invoice_no'>[]
}

export async function fetchPurchaseInvoicesForReturn(): Promise<Pick<PurchaseInvoice, 'id' | 'invoice_no'>[]> {
  const { data, error } = await supabase
    .from('purchase_invoice')
    .select('id, invoice_no')
    .is('deleted_at', null)
  assertNoError(error)
  return data as Pick<PurchaseInvoice, 'id' | 'invoice_no'>[]
}

export async function createReturn(input: CreateReturnInput): Promise<void> {
  const { data: ret, error: retErr } = await supabase
    .from('return')
    .insert({ return_type: input.return_type, ref_invoice_id: input.ref_invoice_id, reason: input.reason ?? null })
    .select()
    .single()
  assertNoError(retErr)

  const { data: invOp, error: invErr } = await supabase
    .from('inventory')
    .insert({ operation_type: 'ren', reference_id: ret.id })
    .select()
    .single()
  assertNoError(invErr)

  for (const line of input.lines) {
    if (!line.item_id || !line.quantity || !line.cost_price) continue

    await supabase.from('return_item').insert({
      return_id: ret.id,
      item_id: line.item_id,
      quantity: line.quantity,
      cost_price: line.cost_price,
    })

    const item = input.items.find(i => i.id === line.item_id)
    if (item) {
      const qtyDelta = input.return_type === 'sales' ? line.quantity : -line.quantity
      await supabase.from('inventory_item').update({ quantity: item.quantity + qtyDelta }).eq('id', line.item_id)
    }

    await supabase.from('inventory_record').insert({
      inventory_id: invOp.id,
      item_id: line.item_id,
      qty_change: input.return_type === 'sales' ? line.quantity : -line.quantity,
      cost_at_operation: line.cost_price,
    })
  }
}
