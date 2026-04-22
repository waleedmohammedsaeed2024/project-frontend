import { supabase } from '@/lib/supabase'
import type { Partner, InventoryItem, SalesOrder } from '@/lib/database.types'

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  lowStockItems: number
  totalClients: number
}

export interface DashboardData {
  stats: DashboardStats
  recentOrders: SalesOrder[]
  clientBalances: Partner[]
  lowStock: InventoryItem[]
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [ordersRes, pendingRes, clientsRes, recentRes, lowRes] = await Promise.all([
    supabase.from('sales_order').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('sales_order').select('*', { count: 'exact', head: true }).eq('status', 'o').is('deleted_at', null),
    supabase.from('partner').select('*').eq('partner_type', 'c').is('deleted_at', null).order('balance', { ascending: false }).limit(5),
    supabase.from('sales_order').select('*, client:partner!client_id(partner_name), customer:partner!customer_id(partner_name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(8),
    supabase.from('inventory_item').select('*, packaging(pack_eng)').is('deleted_at', null).filter('quantity', 'lte', 'orderpoint').limit(5),
  ])

  return {
    stats: {
      totalOrders: ordersRes.count ?? 0,
      pendingOrders: pendingRes.count ?? 0,
      totalClients: (clientsRes.data ?? []).length,
      lowStockItems: (lowRes.data ?? []).length,
    },
    recentOrders: (recentRes.data ?? []) as unknown as SalesOrder[],
    clientBalances: (clientsRes.data ?? []) as Partner[],
    lowStock: (lowRes.data ?? []) as unknown as InventoryItem[],
  }
}
