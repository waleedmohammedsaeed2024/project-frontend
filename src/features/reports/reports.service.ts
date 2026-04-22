import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { Partner, InventoryItem, SalesInvoice, PurchaseInvoice } from '@/lib/database.types'

export type ReportType = 'client-statement' | 'supplier-statement' | 'inventory' | 'sales-summary' | 'purchase-summary'

export interface ReportFilter {
  client_id?: string
  supplier_id?: string
  from?: string
  to?: string
}

export async function fetchReportMeta(): Promise<{
  clients: Pick<Partner, 'id' | 'partner_name'>[]
  suppliers: Pick<Partner, 'id' | 'partner_name'>[]
  items: Pick<InventoryItem, 'id' | 'item_name'>[]
}> {
  const [clientsRes, suppliersRes, itemsRes] = await Promise.all([
    supabase.from('partner').select('id, partner_name').eq('partner_type', 'c').is('deleted_at', null),
    supabase.from('partner').select('id, partner_name').eq('partner_type', 's').is('deleted_at', null),
    supabase.from('inventory_item').select('id, item_name').is('deleted_at', null).order('item_name'),
  ])
  return {
    clients: (clientsRes.data ?? []) as Pick<Partner, 'id' | 'partner_name'>[],
    suppliers: (suppliersRes.data ?? []) as Pick<Partner, 'id' | 'partner_name'>[],
    items: (itemsRes.data ?? []) as Pick<InventoryItem, 'id' | 'item_name'>[],
  }
}

export async function runInventoryReport(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_item')
    .select('*, packaging(pack_eng)')
    .is('deleted_at', null)
    .order('item_name')
  assertNoError(error)
  return data as unknown as InventoryItem[]
}

export async function runClientStatement(clientId: string, filter: ReportFilter): Promise<SalesInvoice[]> {
  const from = filter.from ? new Date(filter.from).toISOString() : '2000-01-01'
  const to = filter.to ? new Date(filter.to + 'T23:59:59').toISOString() : new Date().toISOString()

  const { data, error } = await supabase
    .from('sales_invoice')
    .select('*, sales_order:sales_order(client_id, customer:partner!customer_id(partner_name))')
    .eq('is_cancelled', false)
    .is('deleted_at', null)
    .gte('invoice_date', from)
    .lte('invoice_date', to)
  assertNoError(error)
  return (data as unknown as SalesInvoice[]).filter(
    r => (r as unknown as { sales_order: { client_id: string } }).sales_order?.client_id === clientId,
  )
}

export async function runSupplierStatement(supplierId: string, filter: ReportFilter): Promise<PurchaseInvoice[]> {
  const from = filter.from ? new Date(filter.from).toISOString() : '2000-01-01'
  const to = filter.to ? new Date(filter.to + 'T23:59:59').toISOString() : new Date().toISOString()

  const { data, error } = await supabase
    .from('purchase_invoice')
    .select('*')
    .eq('supplier_id', supplierId)
    .is('deleted_at', null)
    .gte('invoice_date', from)
    .lte('invoice_date', to)
  assertNoError(error)
  return data as unknown as PurchaseInvoice[]
}

export async function runSalesSummary(filter: ReportFilter): Promise<SalesInvoice[]> {
  const from = filter.from ? new Date(filter.from).toISOString() : '2000-01-01'
  const { data, error } = await supabase
    .from('sales_invoice')
    .select('*, sales_order:sales_order(client:partner!client_id(partner_name))')
    .eq('is_cancelled', false)
    .is('deleted_at', null)
    .gte('invoice_date', from)
  assertNoError(error)
  return data as unknown as SalesInvoice[]
}

export async function runPurchaseSummary(filter: ReportFilter): Promise<PurchaseInvoice[]> {
  const from = filter.from ? new Date(filter.from).toISOString() : '2000-01-01'
  const { data, error } = await supabase
    .from('purchase_invoice')
    .select('*, supplier:partner!supplier_id(partner_name)')
    .is('deleted_at', null)
    .gte('invoice_date', from)
  assertNoError(error)
  return data as unknown as PurchaseInvoice[]
}
