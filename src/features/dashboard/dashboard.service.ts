import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { Partner, InventoryItem, SalesOrder } from '@/lib/database.types'

export interface DashboardFilter {
  from: string   // YYYY-MM-DD
  to: string     // YYYY-MM-DD
  client_id?: string
  supplier_id?: string
}

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  lowStockItems: number
  totalClients: number
  todaySalesTotal: number
}

export interface DailyPoint { date: string; sales: number }
export interface NamedAmount { name: string; value: number }

export interface DashboardData {
  stats: DashboardStats
  todayOrders: SalesOrder[]
  clientBalances: Partner[]
  lowStock: InventoryItem[]
  salesSeries: DailyPoint[]      // sales by day in range
  topCustomers: NamedAmount[]    // top customers by sales in range
  topItems: NamedAmount[]        // top inventory items by stock value
}

function todayISO() {
  // Local date (YYYY-MM-DD), not UTC — avoids off-by-one near midnight in +TZ regions.
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface SalesSummaryRow {
  id: string
  invoice_no: string
  invoice_date: string
  total_amount: number
  is_cancelled: boolean
  client_name: string | null
}

export async function fetchDashboardData(filter: DashboardFilter): Promise<DashboardData> {
  const today = todayISO()
  const todayStart = `${today}T00:00:00`
  const todayEnd = `${today}T23:59:59`

  const [ordersRes, pendingRes, clientsRes, todayOrdersRes, lowRes, summaryRes, itemsRes, todayInvoicesRes] = await Promise.all([
    supabase.from('sales_order').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('sales_order').select('*', { count: 'exact', head: true }).eq('status', 'o').is('deleted_at', null),
    supabase
      .from('partner')
      .select('*')
      .eq('partner_type', 'c')
      .is('deleted_at', null)
      .order('balance', { ascending: false })
      .limit(8),
    (() => {
      let q = supabase
        .from('sales_order')
        .select('*, client:partner!client_id(partner_name), customer:partner!customer_id(partner_name), items:sales_order_item(quantity, item_price)')
        .is('deleted_at', null)
        .gte('order_date', todayStart)
        .lte('order_date', todayEnd)
        .order('created_at', { ascending: false })
      if (filter.client_id) q = q.eq('client_id', filter.client_id)
      return q
    })(),
    supabase.from('inventory_item').select('*').is('deleted_at', null).filter('quantity', 'lte', 'orderpoint').limit(8),
    supabase.rpc('sales_summary', { p_from: filter.from, p_to: filter.to }),
    supabase
      .from('inventory_item')
      .select('id, item_name, quantity, avg_cost')
      .is('deleted_at', null)
      .order('quantity', { ascending: false })
      .limit(8),
    supabase
      .from('sales_invoice')
      .select('total_amount, is_cancelled')
      .is('deleted_at', null)
      .eq('is_cancelled', false)
      .gte('invoice_date', todayStart)
      .lte('invoice_date', todayEnd),
  ])
  assertNoError(summaryRes.error)

  const summaryRows = ((summaryRes.data ?? []) as SalesSummaryRow[]).filter(r => {
    if (filter.client_id) return r.client_name && true // RPC has no client_id; filter client-side via name match below if needed
    return true
  })

  // Daily sales aggregation
  const byDay = new Map<string, number>()
  summaryRows.forEach(r => {
    const day = r.invoice_date.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + Number(r.total_amount))
  })
  const salesSeries: DailyPoint[] = Array.from(byDay.entries())
    .map(([date, sales]) => ({ date, sales }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  // Top customers
  const byCustomer = new Map<string, number>()
  summaryRows.forEach(r => {
    const name = r.client_name ?? '—'
    byCustomer.set(name, (byCustomer.get(name) ?? 0) + Number(r.total_amount))
  })
  const topCustomers: NamedAmount[] = Array.from(byCustomer.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // Top items by stock value
  const itemRows = (itemsRes.data ?? []) as Pick<InventoryItem, 'id' | 'item_name' | 'quantity' | 'avg_cost'>[]
  const topItems: NamedAmount[] = itemRows
    .map(it => ({ name: it.item_name, value: Number(it.quantity) * Number(it.avg_cost) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Today sales total — sum of invoices issued today (invoice is created on delivery).
  // Falls back to today's non-cancelled sales orders for the case where a sale was
  // placed today but not yet delivered/invoiced.
  type TodayOrderRow = SalesOrder & {
    status: string
    items?: { quantity: number | string; item_price: number | string }[]
  }
  const todayOrderRows = (todayOrdersRes.data ?? []) as unknown as TodayOrderRow[]
  const todayInvoiceRows = (todayInvoicesRes.data ?? []) as { total_amount: number | string }[]
  const todayInvoiceTotal = todayInvoiceRows.reduce((s, r) => s + Number(r.total_amount), 0)
  // Exclude 'c' (closed/invoiced — counted in invoices) and 'd' (cancelled).
  const todayOrdersTotal = todayOrderRows
    .filter(o => o.status === 'o' || o.status === 'p')
    .reduce(
      (sum, o) =>
        sum +
        (o.items ?? []).reduce(
          (s, it) => s + Number(it.quantity) * Number(it.item_price),
          0,
        ),
      0,
    )
  const todaySalesTotal = todayInvoiceTotal + todayOrdersTotal

  return {
    stats: {
      totalOrders: ordersRes.count ?? 0,
      pendingOrders: pendingRes.count ?? 0,
      totalClients: (clientsRes.data ?? []).length,
      lowStockItems: (lowRes.data ?? []).length,
      todaySalesTotal,
    },
    todayOrders: (todayOrdersRes.data ?? []) as unknown as SalesOrder[],
    clientBalances: (clientsRes.data ?? []) as Partner[],
    lowStock: (lowRes.data ?? []) as unknown as InventoryItem[],
    salesSeries,
    topCustomers,
    topItems,
  }
}
