// WhatsApp notification service — calls Supabase Edge Function
import { supabase } from './supabase'

/**
 * Send WhatsApp notification (non-blocking)
 * Calls Supabase Edge Function which handles Twilio integration
 */
export async function sendWhatsAppNotification(
  phone: string,
  message: string,
  partnerId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if WhatsApp is enabled
    if (import.meta.env.VITE_ENABLE_WHATSAPP !== 'true') {
      console.log('WhatsApp notifications are disabled in .env')
      return { success: false, error: 'WhatsApp disabled' }
    }

    // Call edge function
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { to: phone, message, partner_id: partnerId },
    })

    if (error) {
      console.error('WhatsApp send error:', error)
      return { success: false, error: error.message }
    }

    return { success: data?.success ?? false, error: data?.error }
  } catch (err) {
    console.error('WhatsApp send exception:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Format purchase invoice notification message
 */
export function formatPurchaseInvoiceMessage(
  supplierName: string,
  invoiceNo: string,
  itemsCount: number,
): string {
  return `📦 Purchase Invoice Created

Supplier: ${supplierName}
Invoice No: ${invoiceNo}
Items Count: ${itemsCount}

System Notification`
}

/**
 * Format sales invoice notification message (sent to client on delivery confirmation)
 */
export function formatSalesInvoiceMessage(
  clientName: string,
  invoiceNo: string,
  totalAmount: number,
): string {
  return `🧾 فاتورة مبيعات

العميل: ${clientName}
رقم الفاتورة: ${invoiceNo}
الإجمالي: ${totalAmount.toFixed(3)}

تم إصدار الفاتورة تلقائياً عند تأكيد التسليم`
}
