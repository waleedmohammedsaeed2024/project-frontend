import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchSalesOrders, createSalesOrder, cancelSalesOrder, type CreateSalesOrderInput } from './sales.service'
import type { OrderStatus } from '@/lib/database.types'

export function useSalesOrders(status?: OrderStatus | '') {
  return useQuery({
    queryKey: queryKeys.salesOrders(status),
    queryFn: () => fetchSalesOrders(status),
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
