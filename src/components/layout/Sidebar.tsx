import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Boxes,
  ReceiptText,
  ArrowLeftRight,
  Sliders,
} from 'lucide-react'
import { useAuth, useCanDo } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface NavSection {
  label: string
  items: NavItem[]
}

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  guard?: boolean
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { signOut, role } = useAuth()
  const can = useCanDo()
  const navigate = useNavigate()

  const sections: NavSection[] = [
    {
      label: 'عام',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'الرئيسية' },
      ],
    },
    {
      label: 'المبيعات',
      items: [
        { to: '/partners/clients', icon: Users, label: 'الوكلاء', guard: true },
        { to: '/partners/customers', icon: Users, label: 'العملاء', guard: true },
        { to: '/sales-orders', icon: ShoppingCart, label: 'طلبات البيع' },
        { to: '/delivery-notes', icon: Truck, label: 'التوصيل', guard: can.confirmDelivery },
        { to: '/sales-invoices', icon: ReceiptText, label: 'فواتير البيع' },
      ],
    },
    {
      label: 'المشتريات',
      items: [
        { to: '/partners/suppliers', icon: Users, label: 'الموردون' },
        { to: '/purchase-invoices', icon: FileText, label: 'فواتير الشراء', guard: can.createPurchase },
        { to: '/inventory', icon: Boxes, label: 'المخزون' },
        { to: '/items', icon: Package, label: 'الأصناف والتعبئة', guard: can.manageItemsPackaging },
      ],
    },
    {
      label: 'العمليات',
      items: [
        { to: '/returns', icon: ArrowLeftRight, label: 'المرتجعات', guard: can.manageReturns },
        { to: '/adjustments', icon: Sliders, label: 'التسويات', guard: can.adjustInventory },
      ],
    },
    {
      label: 'التقارير',
      items: [
        { to: '/reports', icon: BarChart2, label: 'التقارير', guard: can.viewReports },
      ],
    },
    {
      label: 'الإدارة',
      items: [
        { to: '/admin/users', icon: Settings, label: 'المستخدمون', guard: can.manageUsers },
      ],
    },
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px 16px',
        display: 'flex',
        alignItems: 'center',
        // justifyContent: 'center',
        gap: 10,
        borderBottom: '1px solid oklch(1 0 0 / 0.08)',
        marginBottom: 8,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Boxes size={18} color="white" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>نظام المخزون</div>
            {/* <div style={{ fontSize: 16, color: 'oklch(0.65 0.02, 240)', textTransform: 'capitalize' }}>{role ?? 'user'}</div> */}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}>
        {sections.map((section) => {
          const visibleItems = section.items.filter(item => item.guard !== false)
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label}>
              {!collapsed && (
                <div className="nav-section-label">{section.label}</div>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => cn('nav-item', isActive && 'active')}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={17} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid oklch(1 0 0 / 0.08)',
        padding: '12px 8px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <button
          onClick={handleSignOut}
          className="nav-item btn-ghost"
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
          title={collapsed ? 'تسجيل الخروج' : undefined}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="nav-item"
          style={{
            width: '100%', border: 'none', background: 'oklch(1 0 0 / 0.06)',
            cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-end',
          }}
          title={collapsed ? 'توسيع الشريط' : 'طي الشريط'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span style={{ fontSize: 12 }}>طي</span>}
        </button>
      </div>
    </aside>
  )
}
