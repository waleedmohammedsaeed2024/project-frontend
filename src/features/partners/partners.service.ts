import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { Partner, PartnerType } from '@/lib/database.types'

export type PartnerInsert = {
  partner_name: string
  partner_type: PartnerType
  phone_no?: string | null
  balance?: number
  parent_client_id?: string | null
}

export async function fetchPartners(type: PartnerType): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partner')
    .select('*')
    .eq('partner_type', type)
    .is('deleted_at', null)
    .order('partner_name')
  assertNoError(error)
  return (data ?? []) as Partner[]
}

export async function fetchCustomersByClient(clientId: string): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partner')
    .select('*')
    .eq('partner_type', 'u')
    .eq('parent_client_id', clientId)
    .is('deleted_at', null)
    .order('partner_name')
  assertNoError(error)
  return (data ?? []) as Partner[]
}

export async function fetchClients(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partner')
    .select('id, partner_name, balance')
    .eq('partner_type', 'c')
    .is('deleted_at', null)
    .order('partner_name')
  assertNoError(error)
  return (data ?? []) as Partner[]
}

export async function fetchSuppliers(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partner')
    .select('id, partner_name, phone_no, balance')
    .eq('partner_type', 's')
    .is('deleted_at', null)
    .order('partner_name')
  assertNoError(error)
  return (data ?? []) as Partner[]
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}

export async function createPartner(payload: PartnerInsert): Promise<Partner> {
  const { data, error } = await supabase
    .from('partner')
    .insert(stripUndefined(payload))
    .select()
    .single()
  assertNoError(error)
  return data as Partner
}

export async function updatePartner(id: string, payload: Partial<PartnerInsert>): Promise<Partner> {
  const { data, error } = await supabase
    .from('partner')
    .update(stripUndefined(payload))
    .eq('id', id)
    .select()
    .single()
  assertNoError(error)
  return data as Partner
}

export async function softDeletePartner(id: string): Promise<void> {
  const { error } = await supabase
    .from('partner')
    .update({ deleted_at: new Date().toISOString() } as Partner)
    .eq('id', id)
  assertNoError(error)
}
