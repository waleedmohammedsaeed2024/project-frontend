import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchSalesOrders, fetchSalesOrderById, createSalesOrder, cancelSalesOrder,
  deleteSalesOrder, updateSalesOrderLineQty, deleteSalesOrderLine, addSalesOrderLine,
  type CreateSalesOrderInput,
} from './sales.service'
import type { InventoryItem } from '@/lib/database.types'
import type { OrderStatus } from '@/lib/database.types'

export function useSalesOrders(status?: OrderStatus | '') {
  return useQuery({
    queryKey: queryKeys.salesOrders(status),
    queryFn: () => fetchSalesOrders(status),
  })
}

export function useSalesOrderDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.salesOrder(id ?? ''),
    queryFn: () => fetchSalesOrderById(id!),
    enabled: !!id,
  })
}

export function useCreateSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSalesOrderInput) => createSalesOrder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      qc.invalidateQueries({ queryKey: queryKeys.items() })
    },
  })
}

export function useCancelSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelSalesOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  })
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSalesOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  })
}

export function useUpdateSalesOrderLineQty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateSalesOrderLineQty(lineId, quantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      qc.invalidateQueries({ queryKey: ['sales-order'] })
    },
  })
}

export function useDeleteSalesOrderLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lineId: string) => deleteSalesOrderLine(lineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      qc.invalidateQueries({ queryKey: ['sales-order'] })
    },
  })
}

export function useAddSalesOrderLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      sales_order_id: string
      item_id: string
      packaging_id: string | null
      quantity: number
      items: InventoryItem[]
    }) => addSalesOrderLine(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      qc.invalidateQueries({ queryKey: ['sales-order'] })
    },
  })
}
