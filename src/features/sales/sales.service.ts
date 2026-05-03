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

export async function deleteSalesOrder(id: string): Promise<void> {
  // Verify the order is still in 'o' state before soft-deleting it.
  const { data: order, error: fetchErr } = await supabase
    .from('sales_order')
    .select('status')
    .eq('id', id)
    .single()
  assertNoError(fetchErr)
  if (!order || order.status !== 'o') throw new Error('لا يمكن حذف الطلب في هذه الحالة')

  // Soft-delete header
  const { error: orderErr } = await supabase
    .from('sales_order')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'o')
  assertNoError(orderErr)

  // Soft-delete its line items so the items list stays clean too
  const { error: linesErr } = await supabase
    .from('sales_order_item')
    .update({ deleted_at: new Date().toISOString() })
    .eq('sales_order_id', id)
    .is('deleted_at', null)
  assertNoError(linesErr)
}

export async function updateSalesOrderLineQty(lineId: string, quantity: number): Promise<void> {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('الكمية يجب أن تكون أكبر من صفر')
  }
  const { error } = await supabase
    .from('sales_order_item')
    .update({ quantity })
    .eq('id', lineId)
    .is('deleted_at', null)
  assertNoError(error)
}

export async function deleteSalesOrderLine(lineId: string): Promise<void> {
  const { error } = await supabase
    .from('sales_order_item')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lineId)
  assertNoError(error)
}

export async function addSalesOrderLine(input: {
  sales_order_id: string
  item_id: string
  packaging_id: string | null
  quantity: number
  items: InventoryItem[]
}): Promise<void> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('الكمية يجب أن تكون أكبر من صفر')
  }

  // Verify the order is still in 'o' state
  const { data: order, error: fetchErr } = await supabase
    .from('sales_order')
    .select('status')
    .eq('id', input.sales_order_id)
    .single()
  assertNoError(fetchErr)
  if (!order || order.status !== 'o') throw new Error('لا يمكن إضافة أصناف إلى الطلب في هذه الحالة')

  const item = input.items.find(i => i.id === input.item_id)
  if (!item) throw new Error('الصنف غير موجود')

  const { error } = await supabase
    .from('sales_order_item')
    .insert({
      sales_order_id: input.sales_order_id,
      item_id: input.item_id,
      packaging_id: input.packaging_id,
      quantity: input.quantity,
      item_cost: item.avg_cost,
      item_price: calcItemPrice(item.avg_cost),
    })
  assertNoError(error)
}
