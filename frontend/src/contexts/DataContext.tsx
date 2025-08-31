import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useETF } from './ETFContext'
import { useThreshold } from './ThresholdContext'

interface CycleData {
  cycle_number: number
  severity: string
  // Dynamic fields based on selected ETF
  ath_date: string
  ath_price: number
  low_date: string
  low_price: number
  recovery_date: string | null
  recovery_price: number | null
  drawdown_pct: number
  // Keep original fields for compatibility
  [key: string]: any
}

interface SummaryData {
  threshold: number
  totalCycles: number
  severeCycles: number
  moderateCycles: number
  mildCycles: number
  maxDrawdown: number
  avgDrawdown: number
  avgTQQQDrawdown?: number
}

interface DataContextType {
  cycles: CycleData[]
  summary: SummaryData | null
  isLoading: boolean
  error: string | null
  fetchCycles: (threshold: number) => Promise<void>
  fetchSummary: (threshold: number) => Promise<void>
  clearError: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { selectedETF } = useETF()
  const { threshold } = useThreshold()
  const [cycles, setCycles] = useState<CycleData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCycles = useCallback(async (threshold: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/cycles/${threshold}/${selectedETF}`)
      if (!response.ok) throw new Error('Failed to fetch cycles data')
      const data = await response.json()
      setCycles(data.cycles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedETF])

  const fetchSummary = useCallback(async (threshold: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/summary/${threshold}/${selectedETF}`)
      if (!response.ok) throw new Error('Failed to fetch summary data')
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedETF])

  // Auto-fetch data when selectedETF or threshold changes
  useEffect(() => {
    if (selectedETF && threshold) {
      fetchCycles(threshold)
      fetchSummary(threshold)
    }
  }, [selectedETF, threshold, fetchCycles, fetchSummary])

  const clearError = () => setError(null)

  return (
    <DataContext.Provider value={{
      cycles,
      summary,
      isLoading,
      error,
      fetchCycles,
      fetchSummary,
      clearError
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
