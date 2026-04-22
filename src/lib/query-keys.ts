import type { PartnerType, OrderStatus } from './database.types'

export const queryKeys = {
  partners: (type: PartnerType) => ['partners', type] as const,
  partner: (id: string) => ['partner', id] as const,
  customers: (clientId: string) => ['customers', clientId] as const,

  items: () => ['items'] as const,
  item: (id: string) => ['item', id] as const,
  packaging: () => ['packaging'] as const,

  purchaseInvoices: () => ['purchase-invoices'] as const,
  purchaseInvoice: (id: string) => ['purchase-invoice', id] as const,

  salesOrders: (status?: OrderStatus | '') => ['sales-orders', status ?? ''] as const,
  salesOrder: (id: string) => ['sales-order', id] as const,
  salesOrderItems: (orderId: string) => ['sales-order-items', orderId] as const,

  deliveryNotes: () => ['delivery-notes'] as const,
  pendingOrders: () => ['sales-orders', 'o'] as const,

  salesInvoices: () => ['sales-invoices'] as const,
  salesInvoice: (id: string) => ['sales-invoice', id] as const,

  inventory: () => ['inventory'] as const,
  returns: () => ['returns'] as const,
  adjustments: () => ['adjustments'] as const,

  dashboardStats: () => ['dashboard-stats'] as const,
  recentOrders: () => ['recent-orders'] as const,
  clientBalances: () => ['client-balances'] as const,
  lowStock: () => ['low-stock'] as const,
  reports: () => ['reports'] as const,
} as const
