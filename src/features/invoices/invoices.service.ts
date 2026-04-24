import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { SalesInvoice } from '@/lib/database.types'

export async function fetchSalesInvoices(): Promise<SalesInvoice[]> {
  const { data, error } = await supabase
    .from('sales_invoice')
    .select('*, sales_order:sales_order(*, client:partner!client_id(partner_name), customer:partner!customer_id(partner_name))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  assertNoError(error)
  return data as unknown as SalesInvoice[]
}

export async function cancelSalesInvoice(inv: SalesInvoice): Promise<void> {
  const { error: cancelErr } = await supabase
    .from('sales_invoice')
    .update({ is_cancelled: true })
    .eq('id', inv.id)
  assertNoError(cancelErr)

  const order = (inv as unknown as { sales_order: { client_id: string } }).sales_order
  const clientId = order?.client_id
  if (clientId) {
    const { data: client } = await supabase
      .from('partner')
      .select('balance')
      .eq('id', clientId)
      .single()
    if (client) {
      await supabase.from('partner').update({ balance: client.balance - inv.total_amount }).eq('id', clientId)
    }
  }

  const { data: orderItems } = await supabase
    .from('sales_order_item')
    .select('*')
    .eq('sales_order_id', inv.sales_order_id)
    .is('deleted_at', null)

  const { data: invOp, error: invOpErr } = await supabase
    .from('inventory')
    .insert({ operation_type: 'ren', reference_id: inv.id })
    .select()
    .single()
  assertNoError(invOpErr)

  for (const line of orderItems ?? []) {
    const packagingId = (line as { packaging_id?: string | null }).packaging_id ?? null

    // Restore per-packaging stock
    let sq = supabase.from('item_stock').select('id, quantity').eq('item_id', line.item_id)
    sq = packagingId ? sq.eq('packaging_id', packagingId) : sq.is('packaging_id', null)
    const { data: stock } = await sq.maybeSingle()
    if (stock) {
      await supabase.from('item_stock').update({ quantity: stock.quantity + line.quantity }).eq('id', stock.id)
    }

    // Restore inventory_item aggregate
    const { data: item } = await supabase
      .from('inventory_item')
      .select('quantity')
      .eq('id', line.item_id)
      .single()
    if (item) {
      await supabase.from('inventory_item').update({ quantity: item.quantity + line.quantity }).eq('id', line.item_id)
    }

    await supabase.from('inventory_record').insert({
      inventory_id: invOp.id,
      item_id: line.item_id,
      qty_change: line.quantity,
      cost_at_operation: line.item_cost,
    })
  }
}
