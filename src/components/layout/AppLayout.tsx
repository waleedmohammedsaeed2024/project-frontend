import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="layout">
      <Sidebar />
      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Topbar sidebarCollapsed={collapsed} />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
