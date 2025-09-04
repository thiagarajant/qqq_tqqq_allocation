import React, { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { useETF } from '../contexts/ETFContext'
import { useThreshold } from '../contexts/ThresholdContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts'
import Cycles from './Cycles'
import Simulation from './Simulation'
import { formatDateForChart } from '../utils/dateUtils'


interface NASDAQSymbol {
  symbol: string
  name: string
  sector?: string
  marketCap?: string
  exchange?: string
  isActive?: boolean
}

interface ChartDataPoint {
  date: string
  close: number
}

interface StockInfo {
  name: string
  currentPrice: number
  change: number
  changePercent: number
  volume: number
  dataPoints: number
  dateRange: string
}



export default function Dashboard() {
  const { selectedETF, setSelectedETF } = useETF()
  const { threshold, setThreshold } = useThreshold()
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false)
  const [symbolSearchTerm, setSymbolSearchTerm] = useState('')
  const [selectedDateRange, setSelectedDateRange] = useState('1Y')
  const [searchResults, setSearchResults] = useState<NASDAQSymbol[]>([])
  


  const dateRanges = [
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
    { value: '2Y', label: '2 Years' },
    { value: '5Y', label: '5 Years' },
    { value: 'MAX', label: 'Max' }
  ]





  // Handle symbol selection
  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol)
    setSelectedETF(symbol)
    setShowSymbolSuggestions(false)
    setSymbolSearchTerm('')
  }

  // Search for symbols
  const searchSymbols = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    console.log(`🔍 Searching for symbols: "${query}"`)
    
    try {
      const response = await fetch(`/api/symbols?query=${encodeURIComponent(query)}&limit=20`)
      console.log(`📡 API response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`📊 API response data:`, data)
        
        if (data.status === 'success' && Array.isArray(data.symbols)) {
          console.log(`✅ Found ${data.symbols.length} symbols`)
          setSearchResults(data.symbols)
        } else {
          console.warn('⚠️ API returned unexpected data format:', data)
          setSearchResults([])
        }
      } else {
        console.warn(`⚠️ API request failed: ${response.status}`)
        setSearchResults([])
      }
    } catch (error) {
      console.error('❌ Error searching symbols:', error)
      setSearchResults([])
    }
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (symbolSearchTerm) {
        searchSymbols(symbolSearchTerm)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [symbolSearchTerm])

  // Fetch chart data
  const fetchChartData = async () => {
    if (!selectedSymbol) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/chart-data/${threshold}/${selectedSymbol}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${selectedSymbol}`)
      }
      
      const data = await response.json()
      if (data.data && Array.isArray(data.data)) {
        setChartData(data.data)
        
        // Extract stock info from the data
        if (data.data.length > 0) {
          const latest = data.data[data.data.length - 1]
          const earliest = data.data[0]
          const change = latest.close - earliest.close
          const changePercent = (change / earliest.close) * 100
          
          setStockInfo({
            name: data.name || selectedSymbol,
            currentPrice: latest.close,
            change: change,
            changePercent: changePercent,
            volume: latest.volume || 0,
            dataPoints: data.data.length,
            dateRange: `${formatDateForChart(earliest.date)} - ${formatDateForChart(latest.date)}`
          })
        }
      } else {
        setChartData([])
        setStockInfo(null)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data')
      setChartData([])
      setStockInfo(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchChartData()
    }
  }, [selectedSymbol, threshold])



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Market Analysis Dashboard</h1>
          <p className="text-gray-600">Analyze stock performance, cycles, and simulate investment strategies</p>
        </div>

        {/* Symbol Search */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl mb-8">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Stock Symbol
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={symbolSearchTerm}
                onChange={(e) => {
                  // Enhanced input handling with validation
                  const value = e.target.value
                  // Only allow letters, numbers, and dots
                  const cleanValue = value.replace(/[^A-Za-z0-9.]/g, '').toUpperCase()
                  setSymbolSearchTerm(cleanValue)
                }}
                onFocus={() => setShowSymbolSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSymbolSuggestions(false), 200)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                      handleSymbolSelect(searchResults[0].symbol)
                    } else if (symbolSearchTerm.trim()) {
                      // Allow direct symbol entry even if no suggestions
                      handleSymbolSelect(symbolSearchTerm.trim().toUpperCase())
                    }
                  }
                }}
                placeholder="Enter symbol (e.g., QQQ, AAPL, TSLA)"
                maxLength={10}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
              
              {/* Symbol Suggestions */}
              {showSymbolSuggestions && symbolSearchTerm.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((symbol) => (
                      <div
                        key={symbol.symbol}
                        onClick={() => handleSymbolSelect(symbol.symbol)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{symbol.symbol}</div>
                        <div className="text-sm text-gray-600">{symbol.name}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      {searchResults.length === 0 && symbolSearchTerm.length >= 2 ? 'No symbols found' : 'Type to search...'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart and Simulation Section - Side by Side */}
        {selectedSymbol && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
            {/* Chart Section - Takes 3/5 of the width */}
            <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSymbol} Price Chart</h2>
                  {stockInfo && (
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-2xl font-bold text-gray-900">${stockInfo.currentPrice.toFixed(2)}</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        stockInfo.change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {stockInfo.change >= 0 ? '+' : ''}{stockInfo.change.toFixed(2)} ({stockInfo.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Date Range Selector */}
                <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                  {dateRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setSelectedDateRange(range.value)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        selectedDateRange === range.value
                          ? 'bg-white text-blue-600 shadow-md border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading chart data...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingDown className="w-10 h-10 text-red-600" />
                  </div>
                  <p className="text-red-600 font-medium text-lg">{error}</p>
                  <button 
                    onClick={fetchChartData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => formatDateForChart(value)}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                        stroke="#6b7280"
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const value = payload[0].value;
                            const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{formatDateForChart(label)}</p>
                                <p className="text-blue-600">{selectedSymbol}: ${formattedValue}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium text-lg">No chart data available</p>
                  <p className="text-gray-500 mt-2">Try selecting a different symbol or date range</p>
                </div>
              )}
            </div>

            {/* Simulation Section - Takes 2/5 of the width */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-xl">
              <Simulation selectedSymbol={selectedSymbol} />
            </div>
          </div>
        )}

        {/* Integrated Analysis Sections - Only show when symbol is selected */}
        {selectedSymbol && (
          <div className="space-y-8">

            
            {/* Threshold Selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg w-full">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Drawdown Threshold</h3>
                <p className="text-gray-600 text-lg">Set the threshold for cycle analysis</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                <div className="flex items-center gap-3">
                  <label className="text-lg font-semibold text-gray-700">
                    Current Threshold:
                  </label>
                  <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-lg font-bold border border-blue-300">
                    {threshold}%
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="text-lg font-semibold text-gray-700">New Threshold:</label>
                  <input
                    type="number"
                    min="0.1"
                    max="99"
                    step="0.1"
                    placeholder="Enter % (e.g., 15.5)"
                    className="w-32 px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        const value = parseFloat(input.value);
                        if (value >= 0.1 && value <= 99) {
                          setThreshold(value);
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <span className="text-lg font-semibold text-gray-700">%</span>
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                      if (input) {
                        const value = parseFloat(input.value);
                        if (value >= 0.1 && value <= 99) {
                          setThreshold(value);
                          input.value = '';
                        }
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <div className="text-sm text-gray-600">
                  💡 Enter any threshold from 0.1% to 99% and press Enter or click Apply
                </div>
              </div>
            </div>

            {/* Cycles Analysis Section */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl w-full">
              <Cycles selectedSymbol={selectedSymbol} />
            </div>


          </div>
        )}
      </div>
    </div>
  )
}
