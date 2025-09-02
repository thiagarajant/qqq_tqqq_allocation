import { Routes, Route } from 'react-router-dom'
import { ETFProvider } from './contexts/ETFContext'
import { ThresholdProvider } from './contexts/ThresholdContext'
import { DataProvider } from './contexts/DataContext'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Navbar from './components/Navbar'

function App() {
  return (
    <ETFProvider>
      <ThresholdProvider>
        <DataProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </DataProvider>
      </ThresholdProvider>
    </ETFProvider>
  )
}



export default App
