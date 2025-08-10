import { createContext, useContext, useState, ReactNode } from 'react'

interface ThresholdContextType {
  threshold: number
  setThreshold: (threshold: number) => void
  availableThresholds: Array<{ value: number; label: string; description: string }>
}

const ThresholdContext = createContext<ThresholdContextType | undefined>(undefined)

export function ThresholdProvider({ children }: { children: ReactNode }) {
  const [threshold, setThreshold] = useState(5)
  
  const availableThresholds = [
    { value: 2, label: '2%', description: 'Mild drawdowns' },
    { value: 5, label: '5%', description: 'Moderate drawdowns' },
    { value: 10, label: '10%', description: 'Significant drawdowns' },
    { value: 15, label: '15%', description: 'Major drawdowns' },
    { value: 20, label: '20%', description: 'Severe drawdowns' }
  ]

  return (
    <ThresholdContext.Provider value={{ threshold, setThreshold, availableThresholds }}>
      {children}
    </ThresholdContext.Provider>
  )
}

export function useThreshold() {
  const context = useContext(ThresholdContext)
  if (context === undefined) {
    throw new Error('useThreshold must be used within a ThresholdProvider')
  }
  return context
}
