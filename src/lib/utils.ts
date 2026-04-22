import type { OrderStatus, OperationType } from './database.types'

// ---- Number format ----
export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- Average cost calculation ----
export function calcAvgCost(
  oldQty: number,
  oldCost: number,
  newQty: number,
  newCost: number,
): number {
  const totalQty = oldQty + newQty
  if (totalQty === 0) return oldCost  // preserve last known cost
  const result = (oldQty * oldCost + newQty * newCost) / totalQty
  return round4(result)
}

// ---- Repack costing ----
export function calcRepackUnitCost(
  quantity: number,
  itemCost: number,
  repackFactor: number,
): number {
  const totalCost = quantity * itemCost
  const effectiveUnits = quantity * repackFactor
  if (effectiveUnits === 0) return 0
  return round4(totalCost / effectiveUnits)
}

// ---- Price from cost ----
export function calcItemPrice(itemCost: number): number {
  return round4(itemCost * 1.15)
}

// ---- Rounding ----
export function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

// ---- Order status helpers ----
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  o: 'Ordered',
  p: 'Shipped',
  c: 'Completed',
  d: 'Cancelled',
}

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  o: 'badge-ordered',
  p: 'badge-shipped',
  c: 'badge-completed',
  d: 'badge-cancelled',
}

// ---- Inventory operation label ----
export const OPERATION_LABEL: Record<OperationType, string> = {
  pur: 'Purchase',
  sal: 'Sale',
  adj: 'Adjustment',
  ren: 'Return',
}

// ---- Generate invoice number ----
export function generateInvoiceNo(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, '0')}`
}

// ---- Class merge utility ----
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
