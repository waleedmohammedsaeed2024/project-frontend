import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { Partner, InventoryItem, PurchaseInvoice, SalesInvoice } from '@/lib/database.types'

export interface StatementRow {
  row_id: string
  entry_date: string
  kind: 'invoice' | 'payment'
  reference: string | null
  description: string | null
  debit: number
  credit: number
  balance: number
}

export type ReportType = 'client-statement' | 'supplier-statement' | 'inventory' | 'sales-summary' | 'purchase-summary' | 'bank-cash'

export interface BankCashFlowRow {
  payment_id: string
  paydate: string
  paytype: 'cash' | 'transfer'
  channel: 'cash' | 'bank'
  partner_id: string
  partner_name: string | null
  partner_type: 'c' | 's'
  source: 'sales' | 'purchase'
  direction: 'in' | 'out'
  inflow: number
  outflow: number
  paymemo: string | null
  bank_balance: number
  cash_balance: number
}

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

function toStatementRows(data: unknown): StatementRow[] {
  type Raw = {
    row_id: string; entry_date: string; kind: 'invoice' | 'payment';
    reference: string | null; description: string | null;
    debit: number | string; credit: number | string; balance: number | string;
  }
  return ((data ?? []) as Raw[]).map(r => ({
    row_id: r.row_id,
    entry_date: r.entry_date,
    kind: r.kind,
    reference: r.reference,
    description: r.description,
    debit: Number(r.debit),
    credit: Number(r.credit),
    balance: Number(r.balance),
  }))
}

export async function runClientStatement(clientId: string, filter: ReportFilter): Promise<StatementRow[]> {
  const { data, error } = await supabase.rpc('client_statement', {
    p_client_id: clientId,
    p_from: filter.from || null,
    p_to: filter.to || null,
  })
  assertNoError(error)
  return toStatementRows(data)
}

export async function runSupplierStatement(supplierId: string, filter: ReportFilter): Promise<StatementRow[]> {
  const { data, error } = await supabase.rpc('supplier_statement', {
    p_supplier_id: supplierId,
    p_from: filter.from || null,
    p_to: filter.to || null,
  })
  assertNoError(error)
  return toStatementRows(data)
}

export async function runBankCashFlow(filter: ReportFilter): Promise<BankCashFlowRow[]> {
  const { data, error } = await supabase.rpc('bank_cash_flow', {
    p_from: filter.from || null,
    p_to: filter.to || null,
  })
  assertNoError(error)
  type Raw = Omit<BankCashFlowRow, 'inflow' | 'outflow' | 'bank_balance' | 'cash_balance'> & {
    inflow: number | string
    outflow: number | string
    bank_balance: number | string
    cash_balance: number | string
  }
  return ((data ?? []) as Raw[]).map(r => ({
    ...r,
    inflow: Number(r.inflow),
    outflow: Number(r.outflow),
    bank_balance: Number(r.bank_balance),
    cash_balance: Number(r.cash_balance),
  }))
}

export async function runSalesSummary(filter: ReportFilter): Promise<SalesInvoice[]> {
  const { data, error } = await supabase.rpc('sales_summary', {
    p_from: filter.from || null,
    p_to: filter.to || null,
  })
  assertNoError(error)
  return (data ?? []) as unknown as SalesInvoice[]
}

export interface ItemInvoiceLine {
  kind: 'purchase' | 'sales'
  invoice_id: string
  invoice_no: string | null
  invoice_date: string
  partner_name: string | null
  quantity: number
  unit: number
  total: number
}

export async function fetchItemInvoices(itemId: string): Promise<{
  item: Pick<InventoryItem, 'id' | 'item_name' | 'item_english_name'> | null
  lines: ItemInvoiceLine[]
}> {
  const [itemRes, linesRes] = await Promise.all([
    supabase
      .from('inventory_item')
      .select('id, item_name, item_english_name')
      .eq('id', itemId)
      .maybeSingle(),
    supabase.rpc('item_invoices', { p_item_id: itemId }),
  ])
  assertNoError(itemRes.error)
  assertNoError(linesRes.error)

  type Row = {
    kind: 'purchase' | 'sales'
    invoice_id: string
    invoice_no: string | null
    invoice_date: string
    partner_name: string | null
    quantity: number | string
    unit: number | string
    total: number | string
  }

  const lines: ItemInvoiceLine[] = ((linesRes.data ?? []) as Row[]).map(r => ({
    kind: r.kind,
    invoice_id: r.invoice_id,
    invoice_no: r.invoice_no,
    invoice_date: r.invoice_date,
    partner_name: r.partner_name,
    quantity: Number(r.quantity),
    unit: Number(r.unit),
    total: Number(r.total),
  }))

  return { item: itemRes.data ?? null, lines }
}

export async function runPurchaseSummary(filter: ReportFilter): Promise<PurchaseInvoice[]> {
  const { data, error } = await supabase.rpc('purchase_summary', {
    p_from: filter.from || null,
    p_to: filter.to || null,
  })
  assertNoError(error)
  type Row = { id: string; invoice_no: string; invoice_date: string; supplier_inv_no: string | null; supplier_name: string | null; total_amount: number }
  return ((data ?? []) as Row[]).map(r => ({
    id: r.id,
    invoice_no: r.invoice_no,
    invoice_date: r.invoice_date,
    supplier_inv_no: r.supplier_inv_no,
    supplier_id: '',
    created_at: r.invoice_date,
    updated_at: r.invoice_date,
    deleted_at: null,
    supplier: r.supplier_name ? { partner_name: r.supplier_name } as PurchaseInvoice['supplier'] : undefined,
    total_amount: r.total_amount,
  }) as unknown as PurchaseInvoice)
}
