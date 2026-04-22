import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDashboardData } from './dashboard.service'

export function useDashboardData() {
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: fetchDashboardData,
  })
}
