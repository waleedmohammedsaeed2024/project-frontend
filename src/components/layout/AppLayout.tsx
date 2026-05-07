import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Footer from './Footer'

export default function AppLayout() {
  const [collapsed] = useState(false)

  return (
    <div className="layout">
      <Sidebar />
      <div
        className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        <Topbar sidebarCollapsed={collapsed} />
        <main className="page-container" style={{ flex: 1 }}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
