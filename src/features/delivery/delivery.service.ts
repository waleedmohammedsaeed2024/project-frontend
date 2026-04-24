import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import { sendWhatsAppNotification, formatSalesInvoiceMessage } from '@/lib/whatsapp'
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

export async function confirmDeliveryByOrderId(orderId: string): Promise<void> {
  let { data: note, error } = await supabase
    .from('delivery_note')
    .select('*')
    .eq('sales_order_id', orderId)
    .is('confirmed_at', null)
    .maybeSingle()
  assertNoError(error)

  if (!note) {
    // No delivery note yet — create one automatically then confirm
    const { data: created, error: createErr } = await supabase
      .from('delivery_note')
      .insert({ sales_order_id: orderId, notes: null })
      .select()
      .single()
    assertNoError(createErr)
    note = created
  }

  await confirmDelivery(note as unknown as DeliveryNote)
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
  const { data: orderData } = await supabase
    .from('sales_order')
    .select('client_id, client:partner!client_id(partner_name, phone_no)')
    .eq('id', note.sales_order_id)
    .single()

  const { data: orderItems, error: itemsErr } = await supabase
    .from('sales_order_item')
    .select('*, item:inventory_item(avg_cost, quantity)')
    .eq('sales_order_id', note.sales_order_id)
    .is('deleted_at', null)
  assertNoError(itemsErr)

  const items = orderItems ?? []

  for (const line of items) {
    const packagingId = (line as { packaging_id?: string | null }).packaging_id ?? null

    // Deduct from per-packaging stock
    let sq = supabase.from('item_stock').select('id, quantity').eq('item_id', line.item_id)
    sq = packagingId ? sq.eq('packaging_id', packagingId) : sq.is('packaging_id', null)
    const { data: stock } = await sq.maybeSingle()

    if (!stock || stock.quantity < line.quantity) throw new Error('المخزون غير كافٍ')
    await supabase.from('item_stock').update({ quantity: stock.quantity - line.quantity }).eq('id', stock.id)

    // Keep inventory_item aggregate in sync
    const item = (line as unknown as { item: { quantity: number } }).item
    if (item) {
      await supabase.from('inventory_item')
        .update({ quantity: Math.max(0, item.quantity - line.quantity) })
        .eq('id', line.item_id)
    }
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

  const invoiceNo = `SI-${String(seq).padStart(6, '0')}`
  const { error: invInsertErr } = await supabase.from('sales_invoice').insert({
    sales_order_id: note.sales_order_id,
    invoice_no: invoiceNo,
    invoice_date: new Date().toISOString(),
    total_amount: totalAmount,
    is_cancelled: false,
  })
  assertNoError(invInsertErr)

  const clientId = orderData?.client_id
  const clientInfo = (orderData as unknown as { client?: { partner_name: string; phone_no: string | null } })?.client
  if (clientInfo?.phone_no) {
    void sendWhatsAppNotification(
      clientInfo.phone_no,
      formatSalesInvoiceMessage(clientInfo.partner_name, invoiceNo, totalAmount),
      clientId ?? undefined,
    )
  }
  if (clientId) {
    const { data: client } = await supabase.from('partner').select('balance').eq('id', clientId).single()
    if (client) {
      await supabase.from('partner').update({ balance: client.balance + totalAmount }).eq('id', clientId)
    }
  }
}
