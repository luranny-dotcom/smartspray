import React from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { OperatorProvider, useOperator } from './context/OperatorContext'
import LoginScreen          from './screens/LoginScreen'
import HomeScreen           from './screens/HomeScreen'
import LotsScreen           from './screens/LotsScreen'
import NewLotScreen         from './screens/NewLotScreen'
import WaterEngineScreen    from './screens/WaterEngineScreen'
import PrepGuideScreen      from './screens/PrepGuideScreen'
import JarTestScreen        from './screens/JarTestScreen'
import LotDetailScreen      from './screens/LotDetailScreen'
import LaudoScreen          from './screens/LaudoScreen'
import ManagerDashboardScreen from './screens/ManagerDashboardScreen'

const MANAGER_ROLES = ['Engenheiro Agrônomo', 'Técnico Agrícola']

function TabBar() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const { operator } = useOperator()
  const isManager = MANAGER_ROLES.includes(operator?.role || '')
  const isTab = ['/', '/lots', '/manager'].some(p => pathname === p)
  if (!isTab) return null

  const tabs = [
    { path: '/',       icon: '🏠', label: 'Início'    },
    { path: '/lots',   icon: '⚗️', label: 'Misturas'  },
    ...(isManager ? [{ path: '/manager', icon: '📊', label: 'Gestor' }] : []),
  ]

  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button key={t.path} onClick={() => navigate(t.path)}
          className={`tab-btn ${pathname === t.path ? 'active' : ''}`}>
          <span className="tab-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

function AppShell() {
  const { operator, loading } = useOperator()
  if (loading) return (
    <div className="app-shell items-center justify-center">
      <div className="text-4xl mb-4">🌱</div>
      <div className="text-primary font-bold">FertigeoTech</div>
    </div>
  )
  if (!operator) return <div className="app-shell"><LoginScreen /></div>

  return (
    <div className="app-shell">
      <div className="flex-1 overflow-hidden flex flex-col">
        <Routes>
          <Route path="/"                  element={<HomeScreen />} />
          <Route path="/lots"              element={<LotsScreen />} />
          <Route path="/new"               element={<NewLotScreen />} />
          <Route path="/water/:lotId"      element={<WaterEngineScreen />} />
          <Route path="/prep/:lotId"       element={<PrepGuideScreen />} />
          <Route path="/jartest/:lotId"    element={<JarTestScreen />} />
          <Route path="/detail/:lotId"     element={<LotDetailScreen />} />
          <Route path="/laudo/:lotId"      element={<LaudoScreen />} />
          <Route path="/manager"           element={<ManagerDashboardScreen />} />
        </Routes>
      </div>
      <TabBar />
    </div>
  )
}

export default function App() {
  return (
    <OperatorProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </OperatorProvider>
  )
}
