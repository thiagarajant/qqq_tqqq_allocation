import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

interface ETFInfo {
  symbol: string
  name: string
  description: string
  category?: string
}

interface ETFContextType {
  selectedETF: string
  setSelectedETF: (symbol: string) => void
  availableETFs: ETFInfo[]
  isLoading: boolean
  error: string | null
  fetchAvailableETFs: () => Promise<void>
  isValidETF: (symbol: string) => boolean
  getETFInfo: (symbol: string) => ETFInfo | null
  fetchStockData: (symbol: string) => Promise<boolean>
  isValidSymbol: (symbol: string) => Promise<boolean>
}

const ETFContext = createContext<ETFContextType | undefined>(undefined)

// Define available ETFs (extensible for future additions)
const DEFAULT_ETFS: ETFInfo[] = [
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    description: 'NASDAQ-100 Index ETF',
    category: 'Large Cap Growth'
  },
  {
    symbol: 'TQQQ',
    name: 'ProShares UltraPro QQQ',
    description: '3x Leveraged NASDAQ-100 ETF',
    category: 'Leveraged'
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    description: 'S&P 500 Index ETF',
    category: 'Large Cap Blend'
  }
  // Future additions can go here automatically from database
]

export function ETFProvider({ children }: { children: ReactNode }) {
  const [selectedETF, setSelectedETF] = useState<string>('QQQ')
  const [availableETFs, setAvailableETFs] = useState<ETFInfo[]>(DEFAULT_ETFS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableETFs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/available-single-etfs')
      if (response.ok) {
        const data = await response.json()
        // Update available ETFs based on what's actually in the database
        setAvailableETFs(data.etfs || DEFAULT_ETFS)
      } else {
        // Fallback to default if API fails
        setAvailableETFs(DEFAULT_ETFS)
      }
    } catch (error) {
      console.error('Failed to fetch available ETFs:', error)
      setError('Failed to load available ETFs')
      setAvailableETFs(DEFAULT_ETFS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailableETFs()
  }, [fetchAvailableETFs])

  // Helper function to check if ETF exists in database
  const isValidETF = (symbol: string) => {
    return availableETFs.some(etf => etf.symbol.toLowerCase() === symbol.toLowerCase())
  }

  // Helper function to get ETF info
  const getETFInfo = (symbol: string) => {
    return availableETFs.find(etf => etf.symbol.toLowerCase() === symbol.toLowerCase()) || null
  }

  // Function to fetch stock data from external source
  const fetchStockData = useCallback(async (symbol: string): Promise<boolean> => {
    if (!symbol || symbol.trim() === '') return false
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/fetch-historical-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol: symbol.toUpperCase() }),
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.status === 'success') {
          // Refresh available ETFs to include the new symbol
          await fetchAvailableETFs()
          // Small delay to ensure database operations are complete
          await new Promise(resolve => setTimeout(resolve, 500))
          return true
        } else {
          setError(result.message || 'Failed to fetch stock data')
          return false
        }
      } else {
        setError('Failed to fetch stock data')
        return false
      }
    } catch (error) {
      console.error('Error fetching stock data:', error)
      setError('Network error while fetching stock data')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [fetchAvailableETFs])

  // Function to check if a symbol is valid (exists in DB or can be fetched)
  const isValidSymbol = useCallback(async (symbol: string): Promise<boolean> => {
    if (!symbol || symbol.trim() === '') return false
    
    const upperSymbol = symbol.toUpperCase().trim()
    
    // First check if it's already in our database
    if (isValidETF(upperSymbol)) {
      return true
    }
    
    // If not in database, try to fetch it
    try {
      const success = await fetchStockData(upperSymbol)
      return success
    } catch (error) {
      console.error('Error validating symbol:', error)
      return false
    }
  }, [isValidETF, fetchStockData])

  return (
    <ETFContext.Provider 
      value={{ 
        selectedETF, 
        setSelectedETF, 
        availableETFs, 
        isLoading,
        error,
        fetchAvailableETFs,
        isValidETF,
        getETFInfo,
        fetchStockData,
        isValidSymbol
      }}
    >
      {children}
    </ETFContext.Provider>
  )
}

export function useETF() {
  const context = useContext(ETFContext)
  if (context === undefined) {
    throw new Error('useETF must be used within an ETFProvider')
  }
  return context
}
