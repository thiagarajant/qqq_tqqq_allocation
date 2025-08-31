import { ETFProvider } from './contexts/ETFContext'
import { ThresholdProvider } from './contexts/ThresholdContext'
import { DataProvider } from './contexts/DataContext'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <ETFProvider>
      <ThresholdProvider>
        <DataProvider>
          <Dashboard />
        </DataProvider>
      </ThresholdProvider>
    </ETFProvider>
  )
}



export default App
