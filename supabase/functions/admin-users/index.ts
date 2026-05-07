// Supabase Edge Function: admin-users
// Admin-only user management. Uses the service-role key (auto-injected) to call
// supabase.auth.admin.*. Role validity is enforced by the public.app_roles table
// via the admin_set_user_role RPC; here we just pass role through on create.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function isValidRole(admin: ReturnType<typeof createClient>, role: string): Promise<boolean> {
  if (!role) return true
  const { data, error } = await admin.from('app_roles').select('name').eq('name', role).maybeSingle()
  if (error) return false
  return !!data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Missing auth token' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !callerData.user) return json({ error: 'Invalid token' }, 401)
  const callerRole = callerData.user.app_metadata?.role as string | undefined
  if (callerRole !== 'admin') return json({ error: 'Forbidden — admin only' }, 403)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const action = payload.action as string

  try {
    switch (action) {
      case 'list': {
        const all: Array<Record<string, unknown>> = []
        const seen = new Set<string>()
        const perPage = 1000
        for (let page = 1; page < 100; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
          if (error) throw error
          for (const u of data.users) {
            if (seen.has(u.id)) continue
            seen.add(u.id)
            all.push({
              id: u.id,
              email: u.email ?? null,
              phone: u.phone ?? null,
              role: (u.app_metadata?.role as string | undefined) ?? null,
              banned_until: (u as unknown as { banned_until?: string | null }).banned_until ?? null,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
            })
          }
          if (data.users.length < perPage) break
        }
        return json({ users: all })
      }

      case 'create': {
        const email = String(payload.email ?? '').trim()
        const password = String(payload.password ?? '')
        const role = payload.role ? String(payload.role) : ''
        if (!email || !password) return json({ error: 'email and password required' }, 400)
        if (role && !(await isValidRole(admin, role))) {
          return json({ error: `role does not exist: ${role}` }, 400)
        }
        const attrs: Record<string, unknown> = {
          email,
          password,
          email_confirm: true,
        }
        if (role) attrs.app_metadata = { role }
        const { data, error } = await admin.auth.admin.createUser(attrs as never)
        if (error) throw error
        return json({ user: data.user })
      }

      case 'update': {
        const id = String(payload.id ?? '')
        if (!id) return json({ error: 'id required' }, 400)
        const attrs: Record<string, unknown> = {}
        if (payload.email)    attrs.email = String(payload.email).trim()
        if (payload.password) attrs.password = String(payload.password)
        if (payload.role !== undefined) {
          const role = payload.role ? String(payload.role) : ''
          if (id === callerData.user.id && role !== 'admin') {
            return json({ error: 'cannot change your own role' }, 400)
          }
          if (role && !(await isValidRole(admin, role))) {
            return json({ error: `role does not exist: ${role}` }, 400)
          }
          attrs.app_metadata = role ? { role } : {}
        }
        if (Object.keys(attrs).length === 0) return json({ error: 'nothing to update' }, 400)
        const { data, error } = await admin.auth.admin.updateUserById(id, attrs)
        if (error) throw error
        return json({ user: data.user })
      }

      case 'disable': {
        const id = String(payload.id ?? '')
        if (!id) return json({ error: 'id required' }, 400)
        if (id === callerData.user.id) return json({ error: 'cannot disable yourself' }, 400)
        const { data, error } = await admin.auth.admin.updateUserById(id, {
          ban_duration: '876000h',
        } as never)
        if (error) throw error
        return json({ user: data.user })
      }

      case 'enable': {
        const id = String(payload.id ?? '')
        if (!id) return json({ error: 'id required' }, 400)
        const { data, error } = await admin.auth.admin.updateUserById(id, {
          ban_duration: 'none',
        } as never)
        if (error) throw error
        return json({ user: data.user })
      }

      case 'delete': {
        const id = String(payload.id ?? '')
        if (!id) return json({ error: 'id required' }, 400)
        if (id === callerData.user.id) return json({ error: 'cannot delete yourself' }, 400)
        const { error } = await admin.auth.admin.deleteUser(id)
        if (error) throw error
        return json({ ok: true })
      }

      default:
        return json({ error: `unknown action: ${action}` }, 400)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('admin-users error:', msg)
    return json({ error: msg }, 500)
  }
})
