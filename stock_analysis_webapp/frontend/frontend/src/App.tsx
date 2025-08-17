import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Cycles from './pages/Cycles'
import Simulation from './pages/Simulation'
import { ThresholdProvider } from './contexts/ThresholdContext'
import { DataProvider } from './contexts/DataContext'
import { ETFProvider } from './contexts/ETFContext'

function App() {
  return (
    <ETFProvider>
      <ThresholdProvider>
        <DataProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cycles" element={<Cycles />} />
              <Route path="/simulation" element={<Simulation />} />
            </Routes>
          </div>
        </DataProvider>
      </ThresholdProvider>
    </ETFProvider>
  )
}

export default App
