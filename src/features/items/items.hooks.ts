import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchItems, fetchPackaging,
  createItem, updateItem, softDeleteItem,
  createPackaging, updatePackaging, softDeletePackaging,
  type ItemInsert, type PackagingInsert,
} from './items.service'
import type { InventoryItem, Packaging } from '@/lib/database.types'

export function useItems() {
  return useQuery({ queryKey: queryKeys.items(), queryFn: fetchItems })
}

export function usePackaging() {
  return useQuery({ queryKey: queryKeys.packaging(), queryFn: fetchPackaging })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation<InventoryItem, Error, ItemInsert>({
    mutationFn: createItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items() }),
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation<InventoryItem, Error, { id: string; payload: Partial<ItemInsert> }>({
    mutationFn: ({ id, payload }) => updateItem(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items() }),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: softDeleteItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items() }),
  })
}

export function useCreatePackaging() {
  const qc = useQueryClient()
  return useMutation<Packaging, Error, PackagingInsert>({
    mutationFn: createPackaging,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.packaging() }),
  })
}

export function useUpdatePackaging() {
  const qc = useQueryClient()
  return useMutation<Packaging, Error, { id: string; payload: Partial<PackagingInsert> }>({
    mutationFn: ({ id, payload }) => updatePackaging(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.packaging() }),
  })
}

export function useDeletePackaging() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: softDeletePackaging,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.packaging() }),
  })
}
