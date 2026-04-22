import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchPartners, fetchCustomersByClient, fetchClients, fetchSuppliers,
  createPartner, updatePartner, softDeletePartner,
  type PartnerInsert,
} from './partners.service'
import type { Partner, PartnerType } from '@/lib/database.types'

export function usePartners(type: PartnerType) {
  return useQuery({ queryKey: queryKeys.partners(type), queryFn: () => fetchPartners(type) })
}

export function useClients() {
  return useQuery({ queryKey: queryKeys.partners('c'), queryFn: fetchClients })
}

export function useSuppliers() {
  return useQuery({ queryKey: queryKeys.partners('s'), queryFn: fetchSuppliers })
}

export function useCustomersByClient(clientId: string) {
  return useQuery({
    queryKey: queryKeys.customers(clientId),
    queryFn: () => fetchCustomersByClient(clientId),
    enabled: !!clientId,
  })
}

export function useCreatePartner(type: PartnerType) {
  const qc = useQueryClient()
  return useMutation<Partner, Error, PartnerInsert>({
    mutationFn: createPartner,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.partners(type) }),
  })
}

export function useUpdatePartner(type: PartnerType) {
  const qc = useQueryClient()
  return useMutation<Partner, Error, { id: string; payload: Partial<PartnerInsert> }>({
    mutationFn: ({ id, payload }) => updatePartner(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.partners(type) }),
  })
}

export function useDeletePartner(type: PartnerType) {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: softDeletePartner,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.partners(type) }),
  })
}
