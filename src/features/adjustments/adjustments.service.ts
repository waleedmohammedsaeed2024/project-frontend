import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import { calcAvgCost } from '@/lib/utils'
import type { Adjustment, InventoryItem } from '@/lib/database.types'

export type AdjustmentLineInput = {
  item_id: string
  quantity: number
  cost_price: number
}

export type CreateAdjustmentInput = {
  reason: string
  lines: AdjustmentLineInput[]
  items: InventoryItem[]
}

export async function fetchAdjustments(): Promise<Adjustment[]> {
  const { data, error } = await supabase
    .from('adjustment')
    .select('*, items:adjustment_item(*, item:inventory_item(item_name))')
    .is('deleted_at', null)
    .order('adjustment_date', { ascending: false })
  assertNoError(error)
  return data as unknown as Adjustment[]
}

export async function createAdjustment(input: CreateAdjustmentInput): Promise<void> {
  if (!input.reason.trim()) throw new Error('سبب التعديل مطلوب')

  for (const line of input.lines) {
    if (!line.item_id || !line.quantity) continue
    const item = input.items.find(i => i.id === line.item_id)
    if (item && item.quantity + line.quantity < 0) {
      throw new Error(`التعديل سيؤدي إلى مخزون سالب للصنف: "${item.item_name}"`)
    }
  }

  const { data: adj, error: adjErr } = await supabase
    .from('adjustment')
    .insert({ reason: input.reason })
    .select()
    .single()
  assertNoError(adjErr)

  const { data: invOp, error: invErr } = await supabase
    .from('inventory')
    .insert({ operation_type: 'adj', reference_id: adj.id })
    .select()
    .single()
  assertNoError(invErr)

  for (const line of input.lines) {
    if (!line.item_id || !line.quantity || !line.cost_price) continue

    await supabase.from('adjustment_item').insert({
      adjustment_id: adj.id,
      item_id: line.item_id,
      quantity: line.quantity,
      cost_price: line.cost_price,
    })

    const item = input.items.find(i => i.id === line.item_id)
    if (item) {
      const newQty = item.quantity + line.quantity
      const newAvg = calcAvgCost(item.quantity, item.avg_cost, line.quantity, line.cost_price)
      await supabase.from('inventory_item').update({ quantity: newQty, avg_cost: newAvg }).eq('id', line.item_id)
    }

    await supabase.from('inventory_record').insert({
      inventory_id: invOp.id,
      item_id: line.item_id,
      qty_change: line.quantity,
      cost_at_operation: line.cost_price,
    })
  }
}
