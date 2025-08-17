import React, { useState, useEffect } from 'react'
import { Search, Calendar, ChevronDown, TrendingUp, TrendingDown, BarChart3, Calculator } from 'lucide-react'
import { useETF } from '../contexts/ETFContext'
import { useThreshold } from '../contexts/ThresholdContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
  const { threshold } = useThreshold()
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
    { value: 'ALL', label: 'All Time' }
  ]

  // Search symbols from database
  const searchSymbols = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/symbols?query=${encodeURIComponent(query)}&limit=20`)
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success' && Array.isArray(data.symbols)) {
          setSearchResults(data.symbols)
        } else {
          console.warn('API returned unexpected data format:', data)
          setSearchResults([])
        }
      } else {
        console.warn('API request failed:', response.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching symbols:', error)
      setSearchResults([])
    }
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSymbols(symbolSearchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [symbolSearchTerm])

  // Filter symbols to NASDAQ-only and provide suggestions
  const filteredSymbols = symbolSearchTerm.length >= 1 && Array.isArray(searchResults)
    ? searchResults.filter(symbol => 
        // Only show NASDAQ symbols (exclude some international symbols)
        !symbol.symbol.includes('.') && 
        symbol.symbol.length <= 5 &&
        symbol.sector !== 'International'
      )
    : []

  const handleSymbolSelect = (symbol: NASDAQSymbol) => {
    setSelectedSymbol(symbol.symbol)
    setSymbolSearchTerm(symbol.symbol)
    setShowSymbolSuggestions(false)
    setSelectedETF(symbol.symbol)
  }

  const handleSymbolSubmit = async (symbol: string) => {
    if (!symbol.trim()) return;
    
    const upperSymbol = symbol.trim().toUpperCase();
    setSelectedSymbol(upperSymbol);
    setShowSymbolSuggestions(false);
    
    // Try to fetch data for the symbol
    try {
      setIsLoading(true);
      setError(null);
      
      // First check if we have data in our database
      const response = await fetch(`/api/cycles/${threshold}/${upperSymbol}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.cycles && data.cycles.length > 0) {
          // We have data, show the chart
          setChartData(data.cycles);
          setIsLoading(false);
          return;
        }
      }
      
      // If no data in database, try to fetch from Stooq
      const fetchResponse = await fetch('/api/fetch-historical-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: upperSymbol })
      });
      
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        if (fetchData.status === 'success') {
          // Successfully fetched new data, now get the cycles
          const cyclesResponse = await fetch(`/api/cycles/${threshold}/${upperSymbol}`);
          if (cyclesResponse.ok) {
            const cyclesData = await cyclesResponse.json();
            if (cyclesData.cycles && cyclesData.cycles.length > 0) {
              setChartData(cyclesData.cycles);
              setIsLoading(false);
              return;
            }
          }
        } else {
          // Symbol not found in Stooq
          setError(`Symbol "${upperSymbol}" not found in Stooq. Please check the symbol and try again.`);
          setIsLoading(false);
          return;
        }
      }
      
      // If we get here, something went wrong
      setError(`Unable to fetch data for "${upperSymbol}". Please try again later.`);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error fetching symbol data:', error);
      setError(`Error fetching data for "${upperSymbol}". Please try again.`);
      setIsLoading(false);
    }
  };

  // Fetch stock data when symbol or date range changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchStockData(selectedSymbol, selectedDateRange)
    }
  }, [selectedSymbol, selectedDateRange])

  const fetchStockData = async (symbol: string, dateRange: string) => {
    setIsLoading(true)
    setError(null)
    console.log(`🚀 Starting data fetch for ${symbol}...`)
    
    try {
      // Use the existing historical data fetching logic that we know works
      console.log(`📡 Fetching historical data for ${symbol}...`)
      const fetchResponse = await fetch('/api/fetch-historical-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase() })
      })
      
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json()
        console.log(`✅ External fetch response:`, fetchData)
        
        if (fetchData.status === 'success') {
          // Wait a bit for the data to be processed, then get it from the database
          console.log(`⏳ External fetch successful, waiting for data processing...`)
          setTimeout(async () => {
            try {
              console.log(`🔄 Now trying to get processed data from database...`)
              // Now try to get the processed data from the database
              const dbResponse = await fetch(`/api/cycles/${threshold}/${symbol}`)
              if (dbResponse.ok) {
                const dbData = await dbResponse.json()
                console.log(`📊 Database response:`, dbData)
                
                if (dbData.cycles && dbData.cycles.length > 0) {
                  console.log(`🎯 Found ${dbData.cycles.length} cycles, creating chart data...`)
                  // Create chart data from the cycles data
                  const chartDataPoints: ChartDataPoint[] = []
                  
                  // Add ATH points, low points, and recovery points to create a meaningful chart
                  dbData.cycles.forEach((cycle: any, index: number) => {
                    console.log(`📈 Processing cycle ${index + 1}:`, cycle)
                    if (cycle.ath_date && cycle.ath_price) {
                      chartDataPoints.push({
                        date: cycle.ath_date,
                        close: cycle.ath_price
                      })
                      console.log(`➕ Added ATH: ${cycle.ath_date} at $${cycle.ath_price}`)
                    }
                    if (cycle.low_date && cycle.low_price) {
                      chartDataPoints.push({
                        date: cycle.low_date,
                        close: cycle.low_price
                      })
                      console.log(`➕ Added Low: ${cycle.low_date} at $${cycle.low_price}`)
                    }
                    if (cycle.recovery_date && cycle.recovery_price) {
                      chartDataPoints.push({
                        date: cycle.recovery_date,
                        close: cycle.recovery_price
                      })
                      console.log(`➕ Added Recovery: ${cycle.recovery_date} at $${cycle.recovery_price}`)
                    }
                  })
                  
                  console.log(`📊 Total chart data points: ${chartDataPoints.length}`)
                  
                  // Sort by date
                  chartDataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  
                  if (chartDataPoints.length > 0) {
                    console.log(`🎉 Setting chart data:`, chartDataPoints)
                    setChartData(chartDataPoints)
                    
                    // Get actual current price from database instead of chart data
                    try {
                      const latestPriceResponse = await fetch(`/api/symbols/${symbol}/price-summary`)
                      if (latestPriceResponse.ok) {
                        const priceData = await latestPriceResponse.json()
                        const actualCurrentPrice = priceData.latestPrice || chartDataPoints[chartDataPoints.length - 1]?.close || 0
                        const previousPrice = chartDataPoints[0]?.close || 0
                        const change = actualCurrentPrice - previousPrice
                        const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0
                        
                        console.log(`💰 Stock info - Actual Current: $${actualCurrentPrice}, Change: $${change}, Change%: ${changePercent}%`)
                        
                        setStockInfo({
                          name: symbol,
                          currentPrice: actualCurrentPrice,
                          change,
                          changePercent,
                          volume: 0,
                          dataPoints: chartDataPoints.length,
                          dateRange: dateRange
                        })
                      } else {
                        // Fallback to chart data if price summary fails
                        const currentPrice = chartDataPoints[chartDataPoints.length - 1]?.close || 0
                        const previousPrice = chartDataPoints[0]?.close || 0
                        const change = currentPrice - previousPrice
                        const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0
                        
                        console.log(`💰 Stock info - Fallback Current: $${currentPrice}, Change: $${change}, Change%: ${changePercent}%`)
                        
                        setStockInfo({
                          name: symbol,
                          currentPrice,
                          change,
                          changePercent,
                          volume: 0,
                          dataPoints: chartDataPoints.length,
                          dateRange: dateRange
                        })
                      }
                    } catch (priceErr) {
                      console.error('Error fetching current price:', priceErr)
                      // Fallback to chart data
                      const currentPrice = chartDataPoints[chartDataPoints.length - 1]?.close || 0
                      const previousPrice = chartDataPoints[0]?.close || 0
                      const change = currentPrice - previousPrice
                      const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0
                      
                      setStockInfo({
                        name: symbol,
                        currentPrice,
                        change,
                        changePercent,
                        volume: 0,
                        dataPoints: chartDataPoints.length,
                        dateRange: dateRange
                      })
                    }
                    
                    setIsLoading(false)
                    return
                  } else {
                    console.log(`❌ No chart data points created`)
                  }
                } else {
                  console.log(`❌ No cycles found in database response`)
                }
              } else {
                console.log(`❌ Database response not ok:`, dbResponse.status)
              }
              
              // If we still don't have data, show error
              console.log(`❌ Setting error: Data fetched but chart could not be generated`)
              setError('Data fetched but chart could not be generated')
              setChartData([])
              setStockInfo(null)
              setIsLoading(false)
            } catch (err) {
              console.error('❌ Error processing fetched data:', err)
              setError('Failed to process fetched data')
              setChartData([])
              setStockInfo(null)
              setIsLoading(false)
            }
          }, 2000)
          return
        } else {
          console.log(`❌ External fetch failed with status:`, fetchData.status)
        }
      } else {
        console.log(`❌ External fetch response not ok:`, fetchResponse.status)
      }
      
      // If external fetch failed, try to use existing cycles data
      console.log(`🔄 Trying to use existing cycles data for ${symbol}...`)
      const cyclesResponse = await fetch(`/api/cycles/5/${symbol}`)
      
      if (cyclesResponse.ok) {
        const cyclesData = await cyclesResponse.json()
        console.log(`📊 Cycles response:`, cyclesData)
        
        if (cyclesData.cycles && cyclesData.cycles.length > 0) {
          console.log(`🎯 Found ${cyclesData.cycles.length} existing cycles, creating chart data...`)
          // Create chart data from the cycles data
          const chartDataPoints: ChartDataPoint[] = []
          
          // Add ATH points, low points, and recovery points to create a meaningful chart
          cyclesData.cycles.forEach((cycle: any, index: number) => {
            console.log(`📈 Processing existing cycle ${index + 1}:`, cycle)
            if (cycle.ath_date && cycle.ath_price) {
              chartDataPoints.push({
                date: cycle.ath_date,
                close: cycle.ath_price
              })
              console.log(`➕ Added ATH: ${cycle.ath_date} at $${cycle.ath_price}`)
            }
            if (cycle.low_date && cycle.low_price) {
              chartDataPoints.push({
                date: cycle.low_date,
                close: cycle.low_price
              })
              console.log(`➕ Added Low: ${cycle.low_date} at $${cycle.low_price}`)
            }
            if (cycle.recovery_date && cycle.recovery_price) {
              chartDataPoints.push({
                date: cycle.recovery_date,
                close: cycle.recovery_price
              })
              console.log(`➕ Added Recovery: ${cycle.recovery_date} at $${cycle.recovery_price}`)
            }
          })
          
          console.log(`📊 Total chart data points: ${chartDataPoints.length}`)
          
          // Sort by date
          chartDataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          
          if (chartDataPoints.length > 0) {
            console.log(`🎉 Setting chart data from existing cycles:`, chartDataPoints)
            setChartData(chartDataPoints)
            
            // Get actual current price from database instead of cycles data
            try {
              const latestPriceResponse = await fetch(`/api/symbols/${symbol}/price-summary`)
              if (latestPriceResponse.ok) {
                const priceData = await latestPriceResponse.json()
                const actualCurrentPrice = priceData.latestPrice || chartDataPoints[chartDataPoints.length - 1]?.close || 0
                const previousPrice = chartDataPoints[0]?.close || 0
                const change = actualCurrentPrice - previousPrice
                const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0
                
                console.log(`💰 Stock info from existing cycles - Actual Current: $${actualCurrentPrice}, Change: $${change}, Change%: ${changePercent}%`)
                
                setStockInfo({
                  name: symbol,
                  currentPrice: actualCurrentPrice,
                  change,
                  changePercent,
                  volume: 0,
                  dataPoints: chartDataPoints.length,
                  dateRange: dateRange
                })
              } else {
                // Fallback to cycles data if price summary fails
                const currentPrice = chartDataPoints[chartDataPoints.length - 1]?.close || 0
                const previousPrice = chartDataPoints[0]?.close || 0
                const change = currentPrice - previousPrice
                const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0
                
                console.log(`💰 Stock info from existing cycles - Fallback Current: $${currentPrice}, Change: $${change}, Change%: ${changePercent}%`)
                
                setStockInfo({
                  name: symbol,
                  currentPrice,
                  change,
                  changePercent,
                  volume: 0,
                  dataPoints: chartDataPoints.length,
                  dateRange: dateRange
                })
              }
            } catch (priceErr) {
              console.error('Error fetching current price from cycles:', priceErr)
              // Fallback to cycles data
              const currentPrice = chartDataPoints[chartDataPoints.length - 1]?.close || 0
              const previousPrice = chartDataPoints[0]?.close || 0
              const change = currentPrice - previousPrice
              const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0
              
              setStockInfo({
                name: symbol,
                currentPrice,
                change,
                changePercent,
                volume: 0,
                dataPoints: chartDataPoints.length,
                dateRange: dateRange
              })
            }
            
            setIsLoading(false)
            return
          } else {
            console.log(`❌ No chart data points created from existing cycles`)
          }
        } else {
          console.log(`❌ No existing cycles found`)
        }
      } else {
        console.log(`❌ Cycles response not ok:`, cyclesResponse.status)
      }
      
      console.log(`❌ Setting final error: Unable to fetch stock data`)
      setError('Unable to fetch stock data')
      setChartData([])
      setStockInfo(null)
      setIsLoading(false)
      
    } catch (err) {
      console.error('❌ Error fetching stock data:', err)
      setError('Failed to fetch stock data')
      setChartData([])
      setStockInfo(null)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Symbol Input - Adjusted spacing and sizing */}
        <div className="mb-8">
          <div className="flex flex-col space-y-6">
            {/* Symbol Search Input - Better proportions */}
            <div className="text-center">
              <div className="relative max-w-2xl mx-auto">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-20"></div>
                  <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100">
                    <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-blue-500 w-6 h-6" />
                    <input
                      type="text"
                      value={symbolSearchTerm}
                      onChange={(e) => {
                        setSymbolSearchTerm(e.target.value)
                        setShowSymbolSuggestions(e.target.value.length >= 1)
                      }}
                      onFocus={() => setShowSymbolSuggestions(symbolSearchTerm.length >= 1)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSymbolSubmit(symbolSearchTerm)
                        }
                      }}
                      placeholder="Search for any stock symbol (e.g., AAPL, GOOGL, TSLA, QQQ, SPY, MSFT, F)..."
                      className="w-full pl-16 pr-6 py-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-300 text-lg font-medium placeholder-gray-400"
                    />
                  </div>
                </div>
                
                {/* Symbol Suggestions Dropdown - Better positioning */}
                {showSymbolSuggestions && symbolSearchTerm && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-64 overflow-auto backdrop-blur-sm">
                    {filteredSymbols.length > 0 ? (
                      filteredSymbols.map((symbol) => (
                        <div
                          key={symbol.symbol}
                          onClick={() => handleSymbolSelect(symbol)}
                          className="px-5 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-all duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                        >
                          <div className="font-bold text-base text-gray-900">{symbol.symbol}</div>
                          <div className="text-sm text-gray-600">{symbol.name}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-5 py-3 text-center text-gray-500">
                        No symbols found matching "{symbolSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Selected Symbol Display - Better proportions */}
            {selectedSymbol && (
              <div className="text-center">
                <div className="inline-flex items-center space-x-4 bg-white rounded-2xl px-6 py-4 shadow-xl border border-gray-100">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {selectedSymbol}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSymbol('')
                      setChartData([])
                      setStockInfo(null)
                      setError(null)
                      setSymbolSearchTerm('')
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-gray-300 hover:border-gray-400 hover:shadow-md"
                  >
                    Change Symbol
                  </button>
                </div>
              </div>
            )}
            
            {/* Instructions when no symbol selected - Better proportions */}
            {!selectedSymbol && (
              <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-blue-200 shadow-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Search for a Stock</h2>
                <p className="text-lg text-gray-600 mb-3">Enter any stock symbol above to view its price chart and analysis</p>
                <p className="text-base text-gray-500">Popular symbols: <span className="font-semibold text-blue-600">AAPL</span>, <span className="font-semibold text-blue-600">GOOGL</span>, <span className="font-semibold text-blue-600">TSLA</span>, <span className="font-semibold text-blue-600">QQQ</span>, <span className="font-semibold text-blue-600">SPY</span>, <span className="font-semibold text-blue-600">MSFT</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Info Cards - Better spacing and proportions */}
        {selectedSymbol && stockInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <p className="text-sm font-medium text-blue-700 mb-2">Price</p>
              <p className="text-xl font-bold text-blue-900">
                ${stockInfo.currentPrice.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <p className="text-sm font-medium text-green-700 mb-2">Change</p>
              <div className="flex items-center space-x-2">
                {stockInfo.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <p className={`text-xl font-bold ${stockInfo.change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {stockInfo.change >= 0 ? '+' : ''}{stockInfo.change.toFixed(2)}
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <p className="text-sm font-medium text-purple-700 mb-2">Change %</p>
              <p className={`text-xl font-bold ${stockInfo.changePercent >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {stockInfo.changePercent >= 0 ? '+' : ''}{stockInfo.changePercent.toFixed(2)}%
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <p className="text-sm font-medium text-indigo-700 mb-2">Volume</p>
              <p className="text-xl font-bold text-indigo-900">
                {(stockInfo.volume / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>
        )}

        {/* Chart Container - Better proportions and visibility */}
        {selectedSymbol ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedSymbol} Price Chart
              </h2>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {selectedDateRange} • {chartData.length} data points
              </div>
            </div>
            
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading chart data...</p>
                </div>
              </div>
            ) : error ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-red-600 font-medium">{error}</p>
                  <p className="text-gray-500 text-sm mt-2">Try selecting a different symbol or date range</p>
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        if (selectedDateRange === '1M') {
                          return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        } else if (selectedDateRange === '3M') {
                          return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        } else if (selectedDateRange === '6M') {
                          return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        } else if (selectedDateRange === '1Y') {
                          return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        } else if (selectedDateRange === '2Y') {
                          return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        } else if (selectedDateRange === '5Y') {
                          return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        } else {
                          return date.toLocaleDateString([], { month: 'short', year: '2-digit' })
                        }
                      }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      fontSize={12}
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString([], { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="close" 
                      stroke="url(#gradient)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No chart data available</p>
                  <p className="text-gray-500 text-sm mt-2">Select a symbol to view the price chart</p>
                </div>
              </div>
            )}
            
            {/* Date Range Selector - Better proportions */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center space-x-2 bg-gray-50 p-2 rounded-xl max-w-md mx-auto">
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
          </div>
        ) : null}

        {/* Quick Actions - Better proportions and spacing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => {
              if (selectedSymbol) {
                // Navigate to cycles page with the selected symbol
                window.location.hash = `cycles?symbol=${selectedSymbol}`;
                // Force a page reload to trigger the hash change
                window.location.reload();
              } else {
                alert('Please select a symbol first to view cycles');
              }
            }}
            disabled={!selectedSymbol}
            className={`bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 text-center shadow-lg transition-all duration-300 ${
              selectedSymbol 
                ? 'hover:shadow-xl hover:scale-105 cursor-pointer' 
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-base text-blue-900 mb-2">View Cycles</h3>
            <p className="text-sm text-blue-700">
              {selectedSymbol 
                ? `Analyze ${selectedSymbol} drawdown cycles` 
                : 'Select a symbol to view cycles'
              }
            </p>
          </button>
          
          <button 
            onClick={() => {
              window.location.hash = 'simulation';
              window.location.reload();
            }}
            className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-base text-green-900 mb-2">Run Simulation</h3>
            <p className="text-sm text-green-700">Test investment strategies with historical data</p>
          </button>
          
          <button 
            onClick={() => {
              window.location.hash = 'cycles';
              window.location.reload();
            }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-base text-purple-900 mb-2">Market Analysis</h3>
            <p className="text-sm text-purple-700">Deep dive into market cycles and trends</p>
          </button>
        </div>
      </div>
    </div>
  )
}
