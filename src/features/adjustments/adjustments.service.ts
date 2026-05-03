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
  const { data: adjustments, error } = await supabase
    .from('adjustment')
    .select('*')
    .is('deleted_at', null)
    .order('adjustment_date', { ascending: false })
  assertNoError(error)
  if (!adjustments?.length) return [] as unknown as Adjustment[]

  const adjIds = adjustments.map(a => a.id)
  const { data: lines, error: linesErr } = await supabase
    .from('adjustment_item')
    .select('*')
    .in('adjustment_id', adjIds)
    .is('deleted_at', null)
  assertNoError(linesErr)

  const itemIds = Array.from(new Set((lines ?? []).map(l => (l as { item_id: string }).item_id).filter(Boolean)))
  const pkgIds  = Array.from(new Set((lines ?? []).map(l => (l as { packaging_id?: string | null }).packaging_id).filter((x): x is string => !!x)))

  const { data: invItems } = itemIds.length
    ? await supabase.from('inventory_item').select('id, item_name').in('id', itemIds)
    : { data: [] as { id: string; item_name: string }[] }
  const { data: pkgs } = pkgIds.length
    ? await supabase.from('packaging').select('id, pack_arab, pack_eng').in('id', pkgIds)
    : { data: [] as { id: string; pack_arab: string; pack_eng: string }[] }

  const itemById = new Map((invItems ?? []).map(i => [i.id, i]))
  const pkgById  = new Map((pkgs ?? []).map(p => [p.id, p]))

  const linesByAdj = new Map<string, unknown[]>()
  for (const l of lines ?? []) {
    const lj = l as { adjustment_id: string; item_id: string; packaging_id?: string | null }
    const enriched = {
      ...l,
      item: itemById.get(lj.item_id) ?? null,
      packaging: lj.packaging_id ? pkgById.get(lj.packaging_id) ?? null : null,
    }
    const arr = linesByAdj.get(lj.adjustment_id) ?? []
    arr.push(enriched)
    linesByAdj.set(lj.adjustment_id, arr)
  }

  return adjustments.map(a => ({
    ...a,
    items: linesByAdj.get(a.id) ?? [],
  })) as unknown as Adjustment[]
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

  try {
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

      const { error: lineErr } = await supabase.from('adjustment_item').insert({
        adjustment_id: adj.id,
        item_id: line.item_id,
        packaging_id: line.packaging_id,
        quantity: line.quantity,
        cost_price: line.cost_price,
      })
      assertNoError(lineErr)

      await adjustItemStock(line.item_id, line.packaging_id, line.quantity, line.cost_price)

      const item = input.items.find(i => i.id === line.item_id)
      if (item) {
        const newQty = item.quantity + line.quantity
        const newAvg = line.quantity > 0
          ? calcAvgCost(item.quantity, item.avg_cost, line.quantity, line.cost_price)
          : item.avg_cost
        const { error: aggErr } = await supabase.from('inventory_item').update({ quantity: newQty, avg_cost: newAvg }).eq('id', line.item_id)
        assertNoError(aggErr)
      }

      const { error: recErr } = await supabase.from('inventory_record').insert({
        inventory_id: invOp.id,
        item_id: line.item_id,
        qty_change: line.quantity,
        cost_at_operation: line.cost_price,
      })
      assertNoError(recErr)
    }
  } catch (err) {
    // Roll back the parent adjustment so we don't leave an orphan with no items.
    await supabase.from('adjustment').delete().eq('id', adj.id)
    throw err
  }
}
