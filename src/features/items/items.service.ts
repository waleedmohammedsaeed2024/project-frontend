import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { InventoryItem, Packaging } from '@/lib/database.types'

const ITEM_SELECT = '*, item_packaging(packaging_id, packaging:packaging(id, pack_eng, pack_arab))'

export type ItemInsert = {
  item_name: string
  item_english_name?: string | null
  item_code: string
  packaging_ids?: string[]
  orderpoint?: number
  avg_cost?: number
  quantity?: number
}

export type PackagingInsert = {
  pack_arab: string
  pack_eng: string
}

export async function fetchItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_item')
    .select(ITEM_SELECT)
    .is('deleted_at', null)
    .order('item_name')
  assertNoError(error)
  return data as unknown as InventoryItem[]
}

export async function fetchPackaging(): Promise<Packaging[]> {
  const { data, error } = await supabase
    .from('packaging')
    .select('*')
    .is('deleted_at', null)
    .order('pack_eng')
  assertNoError(error)
  return (data ?? []) as Packaging[]
}

export async function createItem(payload: ItemInsert): Promise<InventoryItem> {
  const { packaging_ids, ...itemPayload } = payload
  const { data, error } = await supabase
    .from('inventory_item')
    .insert({ ...itemPayload, avg_cost: 0, quantity: 0 })
    .select()
    .single()
  assertNoError(error)
  const item = data as InventoryItem

  if (packaging_ids?.length) {
    const { error: pkgErr } = await supabase
      .from('item_packaging')
      .insert(packaging_ids.map(pid => ({ item_id: item.id, packaging_id: pid })))
    assertNoError(pkgErr)
  }

  return item
}

export async function updateItem(id: string, payload: Partial<ItemInsert>): Promise<InventoryItem> {
  const { packaging_ids, ...itemPayload } = payload

  if (Object.keys(itemPayload).length > 0) {
    const { error } = await supabase
      .from('inventory_item')
      .update(itemPayload)
      .eq('id', id)
    assertNoError(error)
  }

  if (packaging_ids !== undefined) {
    const { error: delErr } = await supabase
      .from('item_packaging')
      .delete()
      .eq('item_id', id)
    assertNoError(delErr)

    if (packaging_ids.length > 0) {
      const { error: insErr } = await supabase
        .from('item_packaging')
        .insert(packaging_ids.map(pid => ({ item_id: id, packaging_id: pid })))
      assertNoError(insErr)
    }
  }

  const { data, error } = await supabase
    .from('inventory_item')
    .select(ITEM_SELECT)
    .eq('id', id)
    .single()
  assertNoError(error)
  return data as unknown as InventoryItem
}

export async function softDeleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_item')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  assertNoError(error)
}

export async function createPackaging(payload: PackagingInsert): Promise<Packaging> {
  const { data, error } = await supabase
    .from('packaging')
    .insert(payload)
    .select()
    .single()
  assertNoError(error)
  return data as Packaging
}

export async function updatePackaging(id: string, payload: Partial<PackagingInsert>): Promise<Packaging> {
  const { data, error } = await supabase
    .from('packaging')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  assertNoError(error)
  return data as Packaging
}

export async function softDeletePackaging(id: string): Promise<void> {
  const { error } = await supabase
    .from('packaging')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  assertNoError(error)
}
