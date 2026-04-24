import { ShoppingCart, TrendingUp, AlertTriangle, Users } from 'lucide-react'
import { formatCurrency, formatDateTime, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from '@/lib/utils'
import { useDashboardData } from './dashboard.hooks'

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData()

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        جاري التحميل…
      </div>
    )
  }

  const { stats, recentOrders, clientBalances, lowStock } = data ?? {
    stats: { totalOrders: 0, pendingOrders: 0, lowStockItems: 0, totalClients: 0 },
    recentOrders: [],
    clientBalances: [],
    lowStock: [],
  }

  const statCards = [
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: ShoppingCart, color: 'var(--color-primary)' },
    { label: 'طلبات معلقة', value: stats.pendingOrders, icon: TrendingUp, color: 'oklch(0.65 0.15 240)' },
    { label: 'أصناف منخفضة', value: stats.lowStockItems, icon: AlertTriangle, color: 'oklch(0.72 0.14 60)' },
    { label: 'عملاء نشطون', value: stats.totalClients, icon: Users, color: 'oklch(0.55 0.10 280)' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">نظرة عامة على العمليات اليومية</p>
        </div>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: 28 }}>
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{s.label}</span>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                background: s.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={18} color={s.color} />
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-cols-2" style={{ marginBottom: 28 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>أحدث طلبات البيع</h3>
          {recentOrders.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
              لا توجد طلبات بعد
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentOrders.map((order) => (
                <div key={order.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--color-border)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-heading)' }}>
                      {(order as unknown as { client?: { partner_name: string } }).client?.partner_name ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {formatDateTime(order.order_date)}
                    </div>
                  </div>
                  <span className={`badge ${ORDER_STATUS_CLASS[order.status]}`}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>أرصدة العملاء</h3>
          {clientBalances.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
              لا يوجد عملاء بعد
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clientBalances.map((client) => (
                <div key={client.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white',
                    }}>
                      {client.partner_name[0]}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{client.partner_name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatCurrency(client.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={16} color="oklch(0.60 0.14 60)" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'oklch(0.45 0.12 60)' }}>
              تنبيهات المخزون المنخفض ({lowStock.length})
            </h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الكمية</th>
                  <th>نقطة الطلب</th>
                  <th>متوسط التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.id} className="orderpoint-alert">
                    <td style={{ fontWeight: 500 }}>{item.item_name}</td>
                    <td style={{ color: 'oklch(0.50 0.14 18)', fontWeight: 600 }}>{item.quantity}</td>
                    <td>{item.orderpoint}</td>
                    <td>{formatCurrency(item.avg_cost, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
