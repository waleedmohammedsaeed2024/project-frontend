import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { InventoryItem, Inventory } from '@/lib/database.types'

export interface InventoryTransaction extends Inventory {
  records: Array<{
    id: string
    item_id: string
    qty_change: number
    cost_at_operation: number
    item?: { item_name: string; item_code: string }
  }>
}

export async function fetchStockLevels(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_item')
    .select('*, item_packaging(packaging_id, packaging:packaging(id, pack_eng, pack_arab))')
    .is('deleted_at', null)
    .order('item_name')
  assertNoError(error)
  return data as unknown as InventoryItem[]
}

export async function fetchInventoryTransactions(): Promise<InventoryTransaction[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, records:inventory_record(*, item:inventory_item(item_name, item_code))')
    .is('deleted_at', null)
    .order('operation_date', { ascending: false })
    .limit(100)
  assertNoError(error)
  return data as unknown as InventoryTransaction[]
}
