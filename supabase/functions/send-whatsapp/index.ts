// Supabase Edge Function: send-whatsapp
// Sends WhatsApp notification via Twilio when a purchase invoice is created

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER')
const ENABLE_WHATSAPP = Deno.env.get('ENABLE_WHATSAPP_NOTIFICATIONS') === 'true'

interface WhatsAppPayload {
  to: string               // Phone number in international format (+966...)
  message: string          // Message body
  partner_id?: string      // Optional: partner ID for logging
}

serve(async (req) => {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if WhatsApp is enabled
    if (!ENABLE_WHATSAPP) {
      console.log('WhatsApp notifications are disabled')
      return new Response(JSON.stringify({ success: false, message: 'WhatsApp disabled' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate Twilio config
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.error('Missing Twilio configuration')
      return new Response(JSON.stringify({ error: 'Missing Twilio config' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const payload: WhatsAppPayload = await req.json()
    const { to, message, partner_id } = payload

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Format phone number for WhatsApp
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    // Send via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const authHeader = `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`

    const formBody = new URLSearchParams({
      From: TWILIO_WHATSAPP_NUMBER!,
      To: whatsappTo,
      Body: message,
    })

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    })

    const twilioData = await twilioRes.json()

    // Log to notification_log table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const logEntry = {
      partner_id: partner_id || null,
      message,
      status: twilioRes.ok ? 'sent' : 'failed',
      sent_at: twilioRes.ok ? new Date().toISOString() : null,
      error_message: twilioRes.ok ? null : twilioData.message || 'Unknown error',
    }

    await supabase.from('notification_log').insert(logEntry)

    if (!twilioRes.ok) {
      console.error('Twilio error:', twilioData)
      return new Response(JSON.stringify({ success: false, error: twilioData }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, sid: twilioData.sid }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
