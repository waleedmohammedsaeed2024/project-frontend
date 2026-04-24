import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPurchaseInvoices, fetchPurchaseInvoiceById, createPurchaseInvoice, type CreatePurchaseInvoiceInput } from './purchase.service'

export function usePurchaseInvoices() {
  return useQuery({
    queryKey: queryKeys.purchaseInvoices(),
    queryFn: fetchPurchaseInvoices,
  })
}

export function usePurchaseInvoiceDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.purchaseInvoice(id ?? ''),
    queryFn: () => fetchPurchaseInvoiceById(id!),
    enabled: !!id,
  })
}

export function useCreatePurchaseInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePurchaseInvoiceInput) => createPurchaseInvoice(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.purchaseInvoices() })
      qc.invalidateQueries({ queryKey: queryKeys.items() })
      qc.invalidateQueries({ queryKey: queryKeys.inventory() })
      qc.invalidateQueries({ queryKey: queryKeys.partners('s') })
    },
  })
}
