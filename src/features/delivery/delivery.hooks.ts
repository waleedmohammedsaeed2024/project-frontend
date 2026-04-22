import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchDeliveryNotes, fetchOrdersForDelivery,
  createDeliveryNote, confirmDelivery,
} from './delivery.service'
import type { DeliveryNote } from '@/lib/database.types'

export function useDeliveryNotes() {
  return useQuery({ queryKey: queryKeys.deliveryNotes(), queryFn: fetchDeliveryNotes })
}

export function useOrdersForDelivery() {
  return useQuery({ queryKey: queryKeys.pendingOrders(), queryFn: fetchOrdersForDelivery })
}

export function useCreateDeliveryNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ salesOrderId, notes }: { salesOrderId: string; notes?: string }) =>
      createDeliveryNote(salesOrderId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveryNotes() })
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
    },
  })
}

export function useConfirmDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note: DeliveryNote) => confirmDelivery(note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveryNotes() })
      qc.invalidateQueries({ queryKey: queryKeys.salesInvoices() })
      qc.invalidateQueries({ queryKey: queryKeys.items() })
      qc.invalidateQueries({ queryKey: queryKeys.inventory() })
      qc.invalidateQueries({ queryKey: queryKeys.partners('c') })
    },
  })
}
