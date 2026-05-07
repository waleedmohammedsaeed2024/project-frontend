import { useQuery } from '@tanstack/react-query'
import { fetchDashboardData, type DashboardFilter } from './dashboard.service'

export function useDashboardData(filter: DashboardFilter) {
  return useQuery({
    queryKey: ['dashboard', filter],
    queryFn: () => fetchDashboardData(filter),
  })
}
