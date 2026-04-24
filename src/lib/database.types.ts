// -------------------------------------------------------
// Database type definitions — mirrors 001_initial_schema.sql
// -------------------------------------------------------

export type PartnerType = 'c' | 's' | 'u'
export type OrderStatus = 'o' | 'p' | 'c' | 'd'
export type OperationType = 'pur' | 'sal' | 'adj' | 'ren'
export type ReturnType = 'sales' | 'purchase'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'
export type NotificationStatus = 'pending' | 'sent' | 'failed'

export interface Partner {
  id: string
  partner_name: string
  partner_type: PartnerType
  phone_no: string | null
  balance: number
  parent_client_id: string | null
  partner_code: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Packaging {
  id: string
  pack_arab: string
  pack_eng: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ItemPackaging {
  item_id: string
  packaging_id: string
  created_at: string
  packaging?: Packaging
}

export interface ItemStock {
  id: string
  item_id: string
  packaging_id: string | null
  quantity: number
  avg_cost: number
  created_at: string
  updated_at: string
  packaging?: Pick<Packaging, 'pack_eng' | 'pack_arab'>
}

export interface InventoryItem {
  id: string
  item_name: string
  item_english_name: string | null
  item_image: string | null
  avg_cost: number
  quantity: number
  orderpoint: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  item_packaging?: ItemPackaging[]
  stock?: ItemStock[]
}

export interface PurchaseInvoice {
  id: string
  invoice_no: string
  invoice_date: string
  supplier_id: string
  supplier_inv_no: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  supplier?: Partner
  items?: PurchaseInvoiceItem[]
}

export interface PurchaseInvoiceItem {
  id: string
  purchase_invoice_id: string
  item_id: string
  packaging_id: string | null
  quantity: number
  item_cost: number
  repack_factor: number
  tax: number
  description: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  item?: InventoryItem
  packaging?: Pick<Packaging, 'pack_eng' | 'pack_arab'>
}

export interface SalesOrder {
  id: string
  order_date: string
  client_id: string
  customer_id: string
  site: string | null
  status: OrderStatus
  description: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  client?: Partner
  customer?: Partner
  items?: SalesOrderItem[]
}

export interface SalesOrderItem {
  id: string
  sales_order_id: string
  item_id: string
  packaging_id: string | null
  quantity: number
  item_cost: number
  item_price: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  item?: InventoryItem
  packaging?: Pick<Packaging, 'pack_eng' | 'pack_arab'>
}

export interface DeliveryNote {
  id: string
  sales_order_id: string
  delivery_date: string
  notes: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  sales_order?: SalesOrder
}

export interface SalesInvoice {
  id: string
  sales_order_id: string
  invoice_no: string
  invoice_date: string
  total_amount: number
  is_cancelled: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  sales_order?: SalesOrder
}

export interface Inventory {
  id: string
  operation_type: OperationType
  reference_id: string | null
  operation_date: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  records?: InventoryRecord[]
}

export interface InventoryRecord {
  id: string
  inventory_id: string
  item_id: string
  qty_change: number
  cost_at_operation: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  item?: InventoryItem
}

export interface Return {
  id: string
  return_type: ReturnType
  ref_invoice_id: string
  reason: string | null
  return_date: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  items?: ReturnItem[]
}

export interface ReturnItem {
  id: string
  return_id: string
  item_id: string
  quantity: number
  cost_price: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  item?: InventoryItem
}

export interface Adjustment {
  id: string
  reason: string
  adjustment_date: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  items?: AdjustmentItem[]
}

export interface AdjustmentItem {
  id: string
  adjustment_id: string
  item_id: string
  quantity: number
  cost_price: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  item?: InventoryItem
}

export interface AuditLog {
  id: string
  user_id: string
  timestamp: string
  table_name: string
  record_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  action: AuditAction
}

export interface NotificationLog {
  id: string
  partner_id: string | null
  message: string
  status: NotificationStatus
  sent_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

// -------------------------------------------------------
// supabase-js v2 requires Views, Functions, Enums,
// CompositeTypes sections and Relationships per table.
// -------------------------------------------------------

type TableDef<R> = {
  Row: R
  Insert: Partial<R>
  Update: Partial<R>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      partner: TableDef<Partner>
      packaging: TableDef<Packaging>
      item_packaging: TableDef<ItemPackaging>
      inventory_item: TableDef<InventoryItem>
      purchase_invoice: TableDef<PurchaseInvoice>
      purchase_invoice_item: TableDef<PurchaseInvoiceItem>
      sales_order: TableDef<SalesOrder>
      sales_order_item: TableDef<SalesOrderItem>
      delivery_note: TableDef<DeliveryNote>
      sales_invoice: TableDef<SalesInvoice>
      inventory: TableDef<Inventory>
      inventory_record: TableDef<InventoryRecord>
      return: TableDef<Return>
      return_item: TableDef<ReturnItem>
      adjustment: TableDef<Adjustment>
      adjustment_item: TableDef<AdjustmentItem>
      audit_log: TableDef<AuditLog>
      notification_log: TableDef<NotificationLog>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
