import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchStockLevels, fetchInventoryTransactions } from './inventory.service'

export function useStockLevels() {
  return useQuery({ queryKey: queryKeys.items(), queryFn: fetchStockLevels })
}

export function useInventoryTransactions() {
  return useQuery({ queryKey: queryKeys.inventory(), queryFn: fetchInventoryTransactions })
}
