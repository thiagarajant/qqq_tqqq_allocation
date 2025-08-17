import { useState } from 'react'
import { ETFProvider } from './contexts/ETFContext'
import { ThresholdProvider } from './contexts/ThresholdContext'
import { DataProvider } from './contexts/DataContext'
import Dashboard from './pages/Dashboard'
import Cycles from './pages/Cycles'
import Simulation from './pages/Simulation'
import Admin from './pages/Admin'

// Custom routing component
function AppRouter() {
  const [currentRoute, setCurrentRoute] = useState('dashboard')
  const [routeParams, setRouteParams] = useState<Record<string, string>>({})
  
  // Handle URL hash changes
  const handleHashChange = () => {
    const hash = window.location.hash.slice(1) // Remove the #
    if (hash) {
      const [route, queryString] = hash.split('?')
      const params: Record<string, string> = {}
      
      if (queryString) {
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=')
          if (key && value) {
            params[key] = decodeURIComponent(value)
          }
        })
      }
      
      setCurrentRoute(route || 'dashboard')
      setRouteParams(params)
    }
  }
  
  // Listen for hash changes
  useState(() => {
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  })
  
  const renderRoute = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard />
      case 'cycles':
        return <Cycles selectedSymbol={routeParams.symbol || undefined} />
      case 'simulation':
        return <Simulation selectedSymbol={routeParams.symbol} />
      case 'admin':
        return <Admin />
      default:
        return <Dashboard />
    }
  }
  
  const Navigation = () => (
    <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => setCurrentRoute('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentRoute === 'dashboard' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentRoute('cycles')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentRoute === 'cycles' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Cycles
            </button>
            <button
              onClick={() => setCurrentRoute('simulation')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentRoute === 'simulation' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Simulation
            </button>
            <button
              onClick={() => setCurrentRoute('admin')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentRoute === 'admin' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
  
  return (
    <div className="App">
      <Navigation />
      <div className="pt-16">
        {renderRoute()}
      </div>
    </div>
  )
}

function App() {
  return (
    <ETFProvider>
      <ThresholdProvider>
        <DataProvider>
          <AppRouter />
        </DataProvider>
      </ThresholdProvider>
    </ETFProvider>
  )
}

export default App
