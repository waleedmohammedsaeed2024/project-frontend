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
import NotFoundPage from '@/features/misc/NotFoundPage'

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
                { path: '/', element: <DashboardPage /> },
                { path: '/partners/clients', element: <PartnersPage type="c" /> },
                { path: '/partners/customers', element: <PartnersPage type="u" /> },
                { path: '/partners/suppliers', element: <PartnersPage type="s" /> },
                { path: '/items', element: <ItemsPage /> },
                { path: '/purchase-invoices', element: <PurchaseInvoicesPage /> },
                { path: '/sales-orders', element: <SalesOrdersPage /> },
                { path: '/delivery-notes', element: <DeliveryNotesPage /> },
                { path: '/sales-invoices', element: <SalesInvoicesPage /> },
                { path: '/inventory', element: <InventoryPage /> },
                { path: '/returns', element: <ReturnsPage /> },
                { path: '/adjustments', element: <AdjustmentsPage /> },
                { path: '/reports', element: <ReportsPage /> },
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
