import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchSalesInvoices, fetchSalesInvoiceLines, cancelSalesInvoice } from './invoices.service'
import type { SalesInvoice } from '@/lib/database.types'

export function useSalesInvoices() {
  return useQuery({ queryKey: queryKeys.salesInvoices(), queryFn: fetchSalesInvoices })
}

export function useSalesInvoiceLines(salesOrderId: string | null) {
  return useQuery({
    queryKey: ['sales-invoice-lines', salesOrderId],
    queryFn: () => fetchSalesInvoiceLines(salesOrderId as string),
    enabled: !!salesOrderId,
  })
}

export function useCancelSalesInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inv: SalesInvoice) => cancelSalesInvoice(inv),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salesInvoices() })
      qc.invalidateQueries({ queryKey: queryKeys.items() })
      qc.invalidateQueries({ queryKey: queryKeys.inventory() })
      qc.invalidateQueries({ queryKey: queryKeys.partners('c') })
    },
  })
}
