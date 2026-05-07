import { useMemo, useState } from 'react'
import {
  ShoppingCart, TrendingUp, AlertTriangle, Users, Wallet,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatCurrency, formatDateTime, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from '@/lib/utils'
import { useClients, useSuppliers } from '@/features/partners/partners.hooks'
import { useDashboardData } from './dashboard.hooks'

function todayISO() { return new Date().toISOString().slice(0, 10) }
function isoDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const PALETTE = [
  'oklch(0.55 0.18 265)',
  'oklch(0.65 0.15 200)',
  'oklch(0.65 0.15 140)',
  'oklch(0.72 0.16 70)',
  'oklch(0.60 0.18 25)',
  'oklch(0.55 0.18 320)',
  'oklch(0.65 0.13 180)',
  'oklch(0.65 0.16 100)',
]

export default function DashboardPage() {
  const [filter, setFilter] = useState({
    from: isoDaysAgo(30),
    to: todayISO(),
    client_id: '',
    supplier_id: '',
  })

  const { data, isLoading } = useDashboardData(filter)
  const { data: clients = [] } = useClients()
  const { data: suppliers = [] } = useSuppliers()

  const stats = data?.stats ?? { totalOrders: 0, pendingOrders: 0, lowStockItems: 0, totalClients: 0, todaySalesTotal: 0 }
  const todayOrders = data?.todayOrders ?? []
  const clientBalances = data?.clientBalances ?? []
  const lowStock = data?.lowStock ?? []
  const salesSeries = data?.salesSeries ?? []
  const topCustomers = data?.topCustomers ?? []
  const topItems = data?.topItems ?? []

  const statCards = useMemo(() => [
    { label: 'مبيعات اليوم', value: formatCurrency(stats.todaySalesTotal), icon: Wallet, tint: 'oklch(0.94 0.07 240 / 0.55)', fg: 'oklch(0.42 0.18 240)' },
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: ShoppingCart, tint: 'oklch(0.95 0.08 140 / 0.55)', fg: 'oklch(0.40 0.16 140)' },
    { label: 'طلبات معلقة', value: stats.pendingOrders, icon: TrendingUp, tint: 'oklch(0.96 0.08 70 / 0.55)', fg: 'oklch(0.45 0.14 68)' },
    { label: 'أصناف منخفضة', value: stats.lowStockItems, icon: AlertTriangle, tint: 'oklch(0.94 0.04 20 / 0.55)', fg: 'oklch(0.45 0.14 18)' },
    { label: 'عملاء', value: stats.totalClients, icon: Users, tint: 'oklch(0.95 0.06 320 / 0.55)', fg: 'oklch(0.45 0.16 320)' },
  ], [stats])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">نظرة عامة على المبيعات والمخزون والعمليات</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ minWidth: 150 }}>
            <label className="form-label">من تاريخ</label>
            <input type="date" className="form-input" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div className="form-group" style={{ minWidth: 150 }}>
            <label className="form-label">إلى تاريخ</label>
            <input type="date" className="form-input" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} />
          </div>
          <div className="form-group" style={{ minWidth: 180 }}>
            <label className="form-label">العميل</label>
            <select className="form-select" value={filter.client_id} onChange={e => setFilter(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">— كل العملاء —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.partner_name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 180 }}>
            <label className="form-label">المورد</label>
            <select className="form-select" value={filter.supplier_id} onChange={e => setFilter(f => ({ ...f, supplier_id: e.target.value }))}>
              <option value="">— كل الموردين —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.partner_name}</option>)}
            </select>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFilter({ from: isoDaysAgo(30), to: todayISO(), client_id: '', supplier_id: '' })}
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-container" style={{ marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card" style={{ flex: '1 1 180px', minWidth: 170 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: s.tint, color: s.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={18} />
              </div>
              <span className="stat-label" style={{ fontSize: 12 }}>{s.label}</span>
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>جاري التحميل…</div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, minHeight: 320 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-heading)' }}>
            مبيعات يومية
          </h3>
          {salesSeries.length === 0 ? (
            <Empty>لا توجد مبيعات في الفترة المحددة</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salesSeries} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="oklch(0.92 0.005 240)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={((v: unknown) => formatCurrency(Number(v))) as never}
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }}
                />
                <Bar dataKey="sales" fill="oklch(0.55 0.18 265)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: 20, minHeight: 320 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-heading)' }}>
            أعلى العملاء
          </h3>
          {topCustomers.length === 0 ? (
            <Empty>لا توجد بيانات</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topCustomers} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {topCustomers.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={((v: unknown) => formatCurrency(Number(v))) as never} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Inventory chart + Today's sales */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, minHeight: 320 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-heading)' }}>
            أعلى الأصناف من حيث القيمة
          </h3>
          {topItems.length === 0 ? (
            <Empty>لا توجد بيانات</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topItems} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                <CartesianGrid stroke="oklch(0.92 0.005 240)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={((v: unknown) => formatCurrency(Number(v))) as never} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="oklch(0.65 0.15 140)" radius={[0, 6, 6, 0]}>
                  {topItems.map((_, i) => (
                    <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-heading)' }}>
            مبيعات اليوم
          </h3>
          {todayOrders.length === 0 ? (
            <Empty>لا توجد طلبات اليوم</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {todayOrders.map((o) => (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'oklch(0.985 0.003 240)',
                  border: '1px solid var(--color-border)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {(o as unknown as { client?: { partner_name: string } }).client?.partner_name ?? '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {formatDateTime(o.order_date)}
                    </div>
                  </div>
                  <span className={`badge ${ORDER_STATUS_CLASS[o.status]}`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client balances + low stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-heading)' }}>
            أرصدة العملاء
          </h3>
          {clientBalances.length === 0 ? (
            <Empty>لا يوجد عملاء</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clientBalances.map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: PALETTE[i % PALETTE.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white',
                    }}>
                      {c.partner_name[0]}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.partner_name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatCurrency(c.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={16} color="oklch(0.60 0.14 60)" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'oklch(0.45 0.12 60)' }}>
              تنبيهات المخزون المنخفض ({lowStock.length})
            </h3>
          </div>
          {lowStock.length === 0 ? (
            <Empty>لا توجد تنبيهات</Empty>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th style={{ textAlign: 'end' }}>الكمية</th>
                    <th style={{ textAlign: 'end' }}>نقطة الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map(item => (
                    <tr key={item.id} className="orderpoint-alert">
                      <td style={{ fontWeight: 500 }}>{item.item_name}</td>
                      <td style={{ textAlign: 'end', color: 'oklch(0.50 0.14 18)', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ textAlign: 'end' }}>{item.orderpoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 220, color: 'var(--color-text-muted)', fontSize: 13,
    }}>
      {children}
    </div>
  )
}
