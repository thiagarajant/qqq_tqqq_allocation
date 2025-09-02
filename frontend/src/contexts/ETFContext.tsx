import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface ETF {
  symbol: string
  name: string
  sector?: string
  marketCap?: string
  exchange?: string
  isActive?: boolean
}

interface ETFContextType {
  selectedETF: string
  setSelectedETF: (symbol: string) => void
  availableETFs: ETF[]
  fetchAvailableETFs: () => Promise<void>
  isValidETF: (symbol: string) => Promise<boolean>
  fetchStockData: (symbol: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

const ETFContext = createContext<ETFContextType | undefined>(undefined)

export const useETF = () => {
  const context = useContext(ETFContext)
  if (context === undefined) {
    throw new Error('useETF must be used within an ETFProvider')
  }
  return context
}

export const ETFProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedETF, setSelectedETF] = useState('QQQ')
  const [availableETFs, setAvailableETFs] = useState<ETF[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableETFs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/symbols?limit=100')
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success') {
          setAvailableETFs(data.symbols)
        } else {
          setError('Failed to fetch symbols')
        }
      } else {
        setError('Failed to fetch symbols')
      }
    } catch (error) {
      console.error('Failed to fetch available ETFs:', error)
      setError('Failed to fetch symbols')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const isValidETF = useCallback(async (symbol: string): Promise<boolean> => {
    if (!symbol) return false

    try {
      // First check if it's in our available symbols
      const existsInDB = availableETFs.some(etf =>
        etf.symbol.toUpperCase() === symbol.toUpperCase()
      )

      if (existsInDB) return true

      // If not in our DB, check if it exists via API
      const response = await fetch(`/api/symbols/${symbol.toUpperCase()}`)
      if (response.ok) {
        const data = await response.json()
        return data.status === 'success'
      }

      return false
    } catch (error) {
      console.error('Error checking symbol validity:', error)
      return false
    }
  }, [availableETFs])

  const fetchStockData = useCallback(async (symbol: string): Promise<boolean> => {
    if (!symbol) return false

    try {
      setIsLoading(true)
      setError(null)

      // Check if symbol exists in database
      const response = await fetch(`/api/symbols/${symbol.toUpperCase()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success') {
          setIsLoading(false)
          return true
        } else {
          setError(`Symbol ${symbol} not found in database - please upload data via Admin page`)
          setIsLoading(false)
          return false
        }
      } else {
        setError(`Symbol ${symbol} not found in database - please upload data via Admin page`)
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('Error checking symbol:', error)
      setError(`Error checking symbol ${symbol}`)
      setIsLoading(false)
      return false
    }
  }, [])

  useEffect(() => {
    fetchAvailableETFs()
  }, [fetchAvailableETFs])

  const value: ETFContextType = {
    selectedETF,
    setSelectedETF,
    availableETFs,
    fetchAvailableETFs,
    isValidETF,
    fetchStockData,
    isLoading,
    error
  }

  return <ETFContext.Provider value={value}>{children}</ETFContext.Provider>
}
