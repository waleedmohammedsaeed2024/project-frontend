import { Navigate } from 'react-router-dom'
import { useCanDo, type Privilege } from '@/context/AuthContext'

// Renders `children` only if the current user has the given privilege.
// Otherwise redirects to `redirect` (default: /sales-orders, the safe fallback
// for restricted roles like salesman).
export default function GuardedRoute({
  privilege,
  redirect = '/sales-orders',
  children,
}: {
  privilege: Privilege
  redirect?: string
  children: React.ReactNode
}) {
  const can = useCanDo()
  if (!can[privilege]) return <Navigate to={redirect} replace />
  return <>{children}</>
}
