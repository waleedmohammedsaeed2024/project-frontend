import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchReturns, fetchSalesInvoicesForReturn, fetchPurchaseInvoicesForReturn,
  createReturn, type CreateReturnInput,
} from './returns.service'

export function useReturns() {
  return useQuery({ queryKey: queryKeys.returns(), queryFn: fetchReturns })
}

export function useSalesInvoicesForReturn() {
  return useQuery({ queryKey: ['return-sales-invoices'], queryFn: fetchSalesInvoicesForReturn })
}

export function usePurchaseInvoicesForReturn() {
  return useQuery({ queryKey: ['return-purchase-invoices'], queryFn: fetchPurchaseInvoicesForReturn })
}

export function useCreateReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateReturnInput) => createReturn(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.returns() })
      qc.invalidateQueries({ queryKey: queryKeys.items() })
      qc.invalidateQueries({ queryKey: queryKeys.inventory() })
    },
  })
}
