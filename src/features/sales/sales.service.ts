import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import { calcItemPrice } from '@/lib/utils'
import type { SalesOrder, InventoryItem, OrderStatus } from '@/lib/database.types'

export type SalesLineInput = {
  item_id: string
  packaging_id?: string | null
  quantity: number
}

export type CreateSalesOrderInput = {
  client_id: string
  customer_id: string
  site?: string | null
  description?: string | null
  lines: SalesLineInput[]
  items: InventoryItem[]
}

export async function fetchSalesOrderById(id: string): Promise<SalesOrder> {
  const { data, error } = await supabase
    .from('sales_order')
    .select('*, client:partner!client_id(partner_name, phone_no), customer:partner!customer_id(partner_name, phone_no), items:sales_order_item(*, item:inventory_item(item_name, item_english_name), packaging:packaging(pack_eng, pack_arab))')
    .eq('id', id)
    .single()
  assertNoError(error)
  return data as unknown as SalesOrder
}

export async function fetchSalesOrders(status?: OrderStatus | ''): Promise<SalesOrder[]> {
  let q = supabase
    .from('sales_order')
    .select('*, client:partner!client_id(partner_name), customer:partner!customer_id(partner_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  assertNoError(error)
  return data as unknown as SalesOrder[]
}

export async function createSalesOrder(input: CreateSalesOrderInput): Promise<void> {
  const validLines = input.lines.filter(l => l.item_id && l.quantity > 0)
  if (validLines.length === 0) throw new Error('أضف صنفاً واحداً على الأقل')

  const { data: order, error: orderErr } = await supabase
    .from('sales_order')
    .insert({
      client_id: input.client_id,
      customer_id: input.customer_id,
      site: input.site ?? null,
      description: input.description ?? null,
      status: 'o',
    })
    .select()
    .single()
  assertNoError(orderErr)

  for (const line of validLines) {
    const item = input.items.find(i => i.id === line.item_id)!
    const { error: lineErr } = await supabase
      .from('sales_order_item')
      .insert({
        sales_order_id: order.id,
        item_id: line.item_id,
        packaging_id: line.packaging_id ?? null,
        quantity: line.quantity,
        item_cost: item.avg_cost,
        item_price: calcItemPrice(item.avg_cost),
      })
    assertNoError(lineErr)
  }
}

export async function cancelSalesOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from('sales_order')
    .update({ status: 'd' })
    .eq('id', id)
    .eq('status', 'o')
  assertNoError(error)
}
