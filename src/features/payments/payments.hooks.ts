import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPayments, recordPayment, type RecordPaymentInput } from './payments.service'
import type { Payment } from '@/lib/database.types'

export function usePayments() {
  return useQuery({ queryKey: queryKeys.payments(), queryFn: fetchPayments })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation<Payment, Error, RecordPaymentInput>({
    mutationFn: recordPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments() })
      qc.invalidateQueries({ queryKey: queryKeys.partners('c') })
      qc.invalidateQueries({ queryKey: queryKeys.partners('s') })
      qc.invalidateQueries({ queryKey: queryKeys.clientBalances() })
    },
  })
}
