import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AppRole = 'admin' | 'purchase_manager' | 'salesman' | 'manager'

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
    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes
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

// Permission checks per plan.md §11.2
export function useCanDo() {
  const { role } = useAuth()
  return {
    createOrders:        role === 'admin' || role === 'purchase_manager',
    shipOrders:          role === 'admin' || role === 'purchase_manager',
    confirmDelivery:     role === 'admin' || role === 'purchase_manager' || role === 'salesman',
    createPurchase:      role === 'admin' || role === 'purchase_manager',
    adjustInventory:     role === 'admin' || role === 'purchase_manager',
    manageReturns:       role === 'admin' || role === 'purchase_manager',
    manageItemsPackaging:role === 'admin',
    manageUsers:         role === 'admin',
    viewReports:         role === 'admin' || role === 'purchase_manager' || role === 'manager',
    cancelInvoice:       role === 'admin',
  }
}
