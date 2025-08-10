import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CycleData {
  cycle_number: number
  severity: string
  qqq_ath_date: string
  qqq_ath_price: number
  qqq_low_date: string
  qqq_low_price: number
  qqq_recovery_date: string
  qqq_recovery_price: number
  qqq_drawdown_pct: number
  tqqq_ath_price?: number
  tqqq_low_price?: number
  tqqq_recovery_price?: number
  tqqq_drawdown_pct?: number
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
  const [cycles, setCycles] = useState<CycleData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCycles = useCallback(async (threshold: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/cycles/${threshold}`)
      if (!response.ok) throw new Error('Failed to fetch cycles data')
      const data = await response.json()
      setCycles(data.cycles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSummary = useCallback(async (threshold: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/summary/${threshold}`)
      if (!response.ok) throw new Error('Failed to fetch summary data')
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

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
