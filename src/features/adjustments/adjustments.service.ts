import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import { calcAvgCost } from '@/lib/utils'
import type { Adjustment, InventoryItem } from '@/lib/database.types'

export type AdjustmentLineInput = {
  item_id: string
  packaging_id: string | null
  quantity: number  // signed: positive = increase, negative = decrease
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
    .select('*, items:adjustment_item(*, item:inventory_item(item_name), packaging:packaging(pack_eng, pack_arab))')
    .is('deleted_at', null)
    .order('adjustment_date', { ascending: false })
  assertNoError(error)
  return data as unknown as Adjustment[]
}

async function adjustItemStock(
  itemId: string,
  packagingId: string | null,
  qtyDelta: number,
  unitCost: number,
): Promise<void> {
  let q = supabase.from('item_stock').select('id, quantity, avg_cost').eq('item_id', itemId)
  q = packagingId ? q.eq('packaging_id', packagingId) : q.is('packaging_id', null)
  const { data: existing } = await q.maybeSingle()

  if (existing) {
    const nextQty = existing.quantity + qtyDelta
    if (nextQty < 0) throw new Error('التعديل سيؤدي إلى مخزون سالب لهذه التعبئة')
    const newAvg = qtyDelta > 0
      ? calcAvgCost(existing.quantity, existing.avg_cost, qtyDelta, unitCost)
      : existing.avg_cost
    await supabase.from('item_stock')
      .update({ quantity: nextQty, avg_cost: newAvg })
      .eq('id', existing.id)
  } else {
    if (qtyDelta < 0) throw new Error('لا يوجد مخزون لهذه التعبئة لتخفيضه')
    await supabase.from('item_stock').insert({
      item_id: itemId,
      packaging_id: packagingId,
      quantity: qtyDelta,
      avg_cost: unitCost,
    })
  }
}

export async function createAdjustment(input: CreateAdjustmentInput): Promise<void> {
  if (!input.reason.trim()) throw new Error('سبب التعديل مطلوب')

  const validLines = input.lines.filter(l => l.item_id && l.quantity)
  if (validLines.length === 0) throw new Error('أضف صنفاً واحداً على الأقل')

  for (const line of validLines) {
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

  for (const line of validLines) {
    if (!line.cost_price && line.quantity > 0) {
      throw new Error('سعر التكلفة مطلوب للزيادة')
    }

    await supabase.from('adjustment_item').insert({
      adjustment_id: adj.id,
      item_id: line.item_id,
      packaging_id: line.packaging_id,
      quantity: line.quantity,
      cost_price: line.cost_price,
    })

    await adjustItemStock(line.item_id, line.packaging_id, line.quantity, line.cost_price)

    const item = input.items.find(i => i.id === line.item_id)
    if (item) {
      const newQty = item.quantity + line.quantity
      const newAvg = line.quantity > 0
        ? calcAvgCost(item.quantity, item.avg_cost, line.quantity, line.cost_price)
        : item.avg_cost
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
