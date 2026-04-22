import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { DeliveryNote, SalesOrder } from '@/lib/database.types'

export async function fetchDeliveryNotes(): Promise<DeliveryNote[]> {
  const { data, error } = await supabase
    .from('delivery_note')
    .select('*, sales_order:sales_order(*, client:partner!client_id(partner_name), customer:partner!customer_id(partner_name))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  assertNoError(error)
  return data as unknown as DeliveryNote[]
}

export async function fetchOrdersForDelivery(): Promise<SalesOrder[]> {
  const { data, error } = await supabase
    .from('sales_order')
    .select('*, client:partner!client_id(partner_name), customer:partner!customer_id(partner_name)')
    .eq('status', 'o')
    .is('deleted_at', null)
  assertNoError(error)
  return data as unknown as SalesOrder[]
}

export async function createDeliveryNote(salesOrderId: string, notes?: string): Promise<void> {
  const { error: updErr } = await supabase
    .from('sales_order')
    .update({ status: 'p' })
    .eq('id', salesOrderId)
    .eq('status', 'o')
  assertNoError(updErr)

  const { error: noteErr } = await supabase
    .from('delivery_note')
    .insert({ sales_order_id: salesOrderId, notes: notes ?? null })
  assertNoError(noteErr)
}

export async function confirmDelivery(note: DeliveryNote): Promise<void> {
  const order = (note as unknown as { sales_order: SalesOrder }).sales_order

  const { data: orderItems, error: itemsErr } = await supabase
    .from('sales_order_item')
    .select('*, item:inventory_item(avg_cost, quantity)')
    .eq('sales_order_id', note.sales_order_id)
    .is('deleted_at', null)
  assertNoError(itemsErr)

  const items = orderItems ?? []

  for (const line of items) {
    const item = (line as unknown as { item: { avg_cost: number; quantity: number } }).item
    if (!item) continue
    const newQty = item.quantity - line.quantity
    if (newQty < 0) throw new Error('المخزون غير كافٍ')
    await supabase.from('inventory_item').update({ quantity: newQty }).eq('id', line.item_id)
  }

  const { data: invOp, error: invOpErr } = await supabase
    .from('inventory')
    .insert({ operation_type: 'sal', reference_id: note.sales_order_id })
    .select()
    .single()
  assertNoError(invOpErr)

  for (const line of items) {
    await supabase.from('inventory_record').insert({
      inventory_id: invOp.id,
      item_id: line.item_id,
      qty_change: -line.quantity,
      cost_at_operation: line.item_cost,
    })
  }

  await supabase.from('sales_order').update({ status: 'c' }).eq('id', note.sales_order_id)
  await supabase.from('delivery_note').update({ confirmed_at: new Date().toISOString() }).eq('id', note.id)

  const totalAmount = items.reduce(
    (sum: number, l: { quantity: number; item_price: number }) => sum + l.quantity * l.item_price,
    0,
  )

  const { count } = await supabase.from('sales_invoice').select('*', { count: 'exact', head: true })
  const seq = (count ?? 0) + 1

  await supabase.from('sales_invoice').insert({
    sales_order_id: note.sales_order_id,
    invoice_no: `SI-${String(seq).padStart(6, '0')}`,
    total_amount: totalAmount,
  })

  const clientId = order.client_id
  const { data: client } = await supabase.from('partner').select('balance').eq('id', clientId).single()
  if (client) {
    await supabase.from('partner').update({ balance: client.balance + totalAmount }).eq('id', clientId)
  }
}
