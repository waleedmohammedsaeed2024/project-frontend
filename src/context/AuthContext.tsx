import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Built-in roles. Custom roles created via /admin/roles are also allowed (any string).
export type AppRole = string

export type Privilege =
  | 'viewDashboard'
  | 'createOrders' | 'editSalesOrder' | 'shipOrders' | 'confirmDelivery' | 'cancelInvoice' | 'salesmanShipToDelivered'
  | 'createPurchase' | 'viewPurchase'
  | 'adjustInventory' | 'manageReturns' | 'manageItemsPackaging' | 'viewInventory' | 'viewItems'
  | 'managePartners' | 'viewPartners'
  | 'recordPayments' | 'viewPayments'
  | 'viewReports'
  | 'manageUsers' | 'manageRoles'

export type Privileges = Partial<Record<Privilege, boolean>>

interface AuthContextValue {
  user: User | null
  session: Session | null
  role: AppRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const role = (session?.user?.app_metadata?.role as AppRole) ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Hardcoded fallback matrix, used when the DB privileges row is unavailable
// (e.g. migration not yet applied, or for a custom role that hasn't loaded).
function fallbackPrivileges(role: AppRole | null): Privileges {
  const isAdmin       = role === 'admin'
  const isAccountant  = role === 'accountant'
  const isManager     = role === 'manager'
  const isPurchase    = role === 'purchase_manager'
  const isSalesman    = role === 'salesman'
  return {
    viewDashboard:        !isSalesman,
    createOrders:         isAdmin || isAccountant,
    editSalesOrder:       isAdmin || isAccountant || isPurchase,
    shipOrders:           isAdmin || isAccountant || isPurchase,
    confirmDelivery:      isAdmin || isAccountant || isPurchase,
    salesmanShipToDelivered: isSalesman,
    cancelInvoice:        isAdmin || isAccountant,
    createPurchase:       isAdmin || isAccountant || isPurchase,
    viewPurchase:         isAdmin || isAccountant || isPurchase || isManager,
    adjustInventory:      isAdmin || isAccountant || isPurchase,
    manageReturns:        isAdmin || isAccountant || isPurchase,
    manageItemsPackaging: isAdmin || isAccountant,
    viewInventory:        isAdmin || isAccountant || isPurchase || isManager,
    viewItems:            isAdmin || isAccountant || isPurchase || isManager,
    managePartners:       isAdmin || isAccountant || isPurchase,
    viewPartners:         isAdmin || isAccountant || isPurchase || isManager,
    recordPayments:       isAdmin || isAccountant,
    viewPayments:         isAdmin || isAccountant || isManager,
    viewReports:          isAdmin || isAccountant || isPurchase || isManager,
    manageUsers:          isAdmin,
    manageRoles:          isAdmin,
  }
}

// Loads the current user's privilege map from the DB (driven by /admin/roles).
// Falls back to the hardcoded matrix while loading or if the RPC is unavailable.
export function usePrivileges(): Privileges {
  const { role, user } = useAuth()
  const { data } = useQuery({
    queryKey: ['my-privileges', role, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_privileges')
      if (error) throw error
      return (data ?? {}) as Privileges
    },
    staleTime: 60_000,
  })
  // If DB returned an empty object (custom role with no flags set), still merge
  // the fallback for built-ins so the app doesn't lock the admin out mid-migration.
  const fallback = fallbackPrivileges(role)
  return { ...fallback, ...(data ?? {}) }
}

// Backward-compatible permission accessor used across the app.
export function useCanDo() {
  const p = usePrivileges()
  // Coerce undefined → false so callers can `if (can.foo)` safely.
  return new Proxy(p, {
    get(target, key: string) {
      return target[key as Privilege] === true
    },
  }) as Record<Privilege, boolean>
}
