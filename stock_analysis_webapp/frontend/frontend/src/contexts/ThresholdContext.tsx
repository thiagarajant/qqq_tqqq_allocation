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
    { value: 1, label: '1%', description: 'Very mild corrections' },
    { value: 1.5, label: '1.5%', description: 'Minor corrections' },
    { value: 2, label: '2%', description: 'Small corrections' },
    { value: 2.5, label: '2.5%', description: 'Light corrections' },
    { value: 3, label: '3%', description: 'Mild corrections' },
    { value: 4, label: '4%', description: 'Moderate corrections' },
    { value: 5, label: '5%', description: 'Standard corrections' },
    { value: 6, label: '6%', description: 'Notable corrections' },
    { value: 7, label: '7%', description: 'Meaningful corrections' },
    { value: 8, label: '8%', description: 'Significant corrections' },
    { value: 9, label: '9%', description: 'Strong corrections' },
    { value: 10, label: '10%', description: 'Major corrections' },
    { value: 12, label: '12%', description: 'Large corrections' },
    { value: 15, label: '15%', description: 'Substantial drawdowns' },
    { value: 18, label: '18%', description: 'Major drawdowns' },
    { value: 20, label: '20%', description: 'Bear market territory' },
    { value: 25, label: '25%', description: 'Severe bear markets' },
    { value: 30, label: '30%', description: 'Extreme drawdowns' }
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
