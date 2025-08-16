import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Cycles from './pages/Cycles'
import Charts from './pages/Charts'
import Simulation from './pages/Simulation'
import { ThresholdProvider } from './contexts/ThresholdContext'
import { DataProvider } from './contexts/DataContext'
import { ETFProvider } from './contexts/ETFContext'

function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Stock Analysis...</h2>
          <p className="text-gray-500 mt-2">Preparing your dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <ETFProvider>
      <ThresholdProvider>
        <DataProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/cycles" element={<Cycles />} />
                <Route path="/charts" element={<Charts />} />
                <Route path="/simulation" element={<Simulation />} />
              </Routes>
            </main>
          </div>
        </DataProvider>
      </ThresholdProvider>
    </ETFProvider>
  )
}

export default App
