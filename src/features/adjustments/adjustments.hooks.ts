import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchAdjustments, createAdjustment, type CreateAdjustmentInput } from './adjustments.service'

export function useAdjustments() {
  return useQuery({ queryKey: queryKeys.adjustments(), queryFn: fetchAdjustments })
}

export function useCreateAdjustment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAdjustmentInput) => createAdjustment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adjustments() })
      qc.invalidateQueries({ queryKey: queryKeys.items() })
      qc.invalidateQueries({ queryKey: queryKeys.inventory() })
    },
  })
}
