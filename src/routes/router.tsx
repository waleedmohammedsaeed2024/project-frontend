import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from './ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import SetupPage from '@/features/misc/SetupPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import PartnersPage from '@/features/partners/PartnersPage'
import ItemsPage from '@/features/items/ItemsPage'
import PurchaseInvoicesPage from '@/features/purchase/PurchaseInvoicesPage'
import SalesOrdersPage from '@/features/sales/SalesOrdersPage'
import DeliveryNotesPage from '@/features/delivery/DeliveryNotesPage'
import SalesInvoicesPage from '@/features/invoices/SalesInvoicesPage'
import InventoryPage from '@/features/inventory/InventoryPage'
import ReturnsPage from '@/features/returns/ReturnsPage'
import AdjustmentsPage from '@/features/adjustments/AdjustmentsPage'
import ReportsPage from '@/features/reports/ReportsPage'
import PaymentsPage from '@/features/payments/PaymentsPage'
import ItemInvoicesPage from '@/features/reports/ItemInvoicesPage'
import UsersPage from '@/features/admin/UsersPage'
import RolesPage from '@/features/admin/RolesPage'
import NotFoundPage from '@/features/misc/NotFoundPage'
import GuardedRoute from './GuardedRoute'

// Check if Supabase is configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const isConfigured = supabaseUrl && !supabaseUrl.includes('placeholder')

export const router = createBrowserRouter(
  isConfigured
    ? [
        {
          path: '/login',
          element: <LoginPage />,
        },
        {
          element: <ProtectedRoute />,
          children: [
            {
              element: <AppLayout />,
              children: [
                { path: '/', element: <GuardedRoute privilege="viewDashboard"><DashboardPage /></GuardedRoute> },
                { path: '/partners/clients',   element: <GuardedRoute privilege="viewPartners"><PartnersPage type="c" /></GuardedRoute> },
                { path: '/partners/customers', element: <GuardedRoute privilege="viewPartners"><PartnersPage type="u" /></GuardedRoute> },
                { path: '/partners/suppliers', element: <GuardedRoute privilege="viewPartners"><PartnersPage type="s" /></GuardedRoute> },
                { path: '/items',              element: <GuardedRoute privilege="viewItems"><ItemsPage /></GuardedRoute> },
                { path: '/purchase-invoices',  element: <GuardedRoute privilege="viewPurchase"><PurchaseInvoicesPage /></GuardedRoute> },
                { path: '/sales-orders',       element: <SalesOrdersPage /> },
                { path: '/delivery-notes',     element: <GuardedRoute privilege="confirmDelivery"><DeliveryNotesPage /></GuardedRoute> },
                { path: '/sales-invoices',     element: <GuardedRoute privilege="viewPartners"><SalesInvoicesPage /></GuardedRoute> },
                { path: '/inventory',          element: <GuardedRoute privilege="viewInventory"><InventoryPage /></GuardedRoute> },
                { path: '/returns',            element: <GuardedRoute privilege="manageReturns"><ReturnsPage /></GuardedRoute> },
                { path: '/adjustments',        element: <GuardedRoute privilege="adjustInventory"><AdjustmentsPage /></GuardedRoute> },
                { path: '/payments',           element: <GuardedRoute privilege="viewPayments"><PaymentsPage partnerType="c" /></GuardedRoute> },
                { path: '/supplier-payments',  element: <GuardedRoute privilege="viewPayments"><PaymentsPage partnerType="s" /></GuardedRoute> },
                { path: '/reports',            element: <GuardedRoute privilege="viewReports"><ReportsPage /></GuardedRoute> },
                { path: '/reports/item/:itemId', element: <GuardedRoute privilege="viewReports"><ItemInvoicesPage /></GuardedRoute> },
                { path: '/admin/users',        element: <GuardedRoute privilege="manageUsers"><UsersPage /></GuardedRoute> },
                { path: '/admin/roles',        element: <GuardedRoute privilege="manageRoles"><RolesPage /></GuardedRoute> },
                { path: '*', element: <NotFoundPage /> },
              ],
            },
          ],
        },
      ]
    : [
        {
          path: '*',
          element: <SetupPage />,
        },
      ]
)
