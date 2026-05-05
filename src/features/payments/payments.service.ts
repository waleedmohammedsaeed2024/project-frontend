import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/shared/types'
import type { Payment, PaymentType } from '@/lib/database.types'

export interface RecordPaymentInput {
  partner_id: string
  payamt: number
  paytype: PaymentType
  paydate: string
  paymemo?: string | null
}

export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, partner:partner_id ( id, partner_name )')
    .order('paydate', { ascending: false })
    .order('created_at', { ascending: false })
  assertNoError(error)
  return (data ?? []) as Payment[]
}

export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const { data, error } = await supabase.rpc('record_payment', {
    p_partner_id: input.partner_id,
    p_payamt: input.payamt,
    p_paytype: input.paytype,
    p_paydate: input.paydate,
    p_paymemo: input.paymemo ?? null,
  })
  assertNoError(error)
  return data as Payment
}
