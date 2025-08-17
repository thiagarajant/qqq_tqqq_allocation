import React, { useEffect, useState } from 'react'
import { Download, Search, TrendingDown, X, Calendar, TrendingUp } from 'lucide-react'
import { useThreshold } from '../contexts/ThresholdContext'
import { useData } from '../contexts/DataContext'
import { useETF } from '../contexts/ETFContext'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea
} from 'recharts'

export default function Cycles() {
  const { threshold, availableThresholds, setThreshold } = useThreshold()
  const { cycles, fetchCycles, isLoading, error } = useData()
  const { selectedETF } = useETF()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [sortField, setSortField] = useState('ath_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedCycle, setSelectedCycle] = useState<any>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [chartData, setChartData] = useState<any>(null)

  // Function to fetch current price - IMPROVED with better error handling and fallbacks
  const fetchCurrentPrice = async () => {
    if (!selectedETF) return
    
    try {
      console.log(`🔍 Fetching current price for ${selectedETF}...`)
      
      // Try to get the most recent price from the database first
      const response = await fetch(`/api/chart-data/${threshold}/${selectedETF}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`📊 Chart data response:`, data)
        
        if (data && data.data && data.data.length > 0) {
          // Get the most recent price (last entry in the data)
          const latestPrice = data.data[data.data.length - 1].close
          console.log(`✅ Using latest price from chart data: $${latestPrice}`)
          setCurrentPrice(latestPrice)
          return
        } else {
          console.log(`⚠️ No price data in chart-data response for ${selectedETF}`)
        }
      } else {
        console.log(`⚠️ Chart data request failed: ${response.status}`)
      }
      
      // If no data in database, fetch fresh data from Stooq
      console.log(`🔄 Fetching fresh price data for ${selectedETF} from Stooq...`)
      const stooqResponse = await fetch(`/api/fetch-historical-data/${selectedETF}`)
      if (stooqResponse.ok) {
        const stooqData = await stooqResponse.json()
        console.log(`📊 Stooq response:`, stooqData)
        
        if (stooqData.status === 'success' && stooqData.data && stooqData.data.length > 0) {
          const latestPrice = stooqData.data[stooqData.data.length - 1].close
          console.log(`✅ Using latest price from Stooq: $${latestPrice}`)
          setCurrentPrice(latestPrice)
        } else {
          console.error(`❌ Failed to get price data for ${selectedETF}:`, stooqData)
        }
      } else {
        console.error(`❌ Stooq API request failed for ${selectedETF}:`, stooqResponse.status)
      }
      
      // If we still don't have a price, try to get it from the cycles data as a last resort
      if (!currentPrice && cycles && cycles.length > 0) {
        console.log(`🔄 Last resort: Using most recent cycle data for ${selectedETF}`)
        const mostRecentCycle = cycles[0];
        if (mostRecentCycle.recovery_price) {
          console.log(`✅ Using recovery price from most recent cycle: $${mostRecentCycle.recovery_price}`)
          setCurrentPrice(mostRecentCycle.recovery_price)
        } else if (mostRecentCycle.low_price) {
          console.log(`✅ Using low price from most recent cycle as current: $${mostRecentCycle.low_price}`)
          setCurrentPrice(mostRecentCycle.low_price)
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching current price:', error)
      
      // Final fallback: use cycle data if available
      if (!currentPrice && cycles && cycles.length > 0) {
        console.log(`🔄 Error fallback: Using cycle data for ${selectedETF}`)
        const mostRecentCycle = cycles[0];
        if (mostRecentCycle.recovery_price) {
          setCurrentPrice(mostRecentCycle.recovery_price)
        } else if (mostRecentCycle.low_price) {
          setCurrentPrice(mostRecentCycle.low_price)
        }
      }
    }
  }

  useEffect(() => {
    fetchCycles(threshold)
  }, [threshold, selectedETF, fetchCycles])

  useEffect(() => {
    fetchCurrentPrice()
  }, [selectedETF]) // Fetch when ETF changes

  // Function to fetch chart data for the selected cycle
  const fetchChartData = async () => {
    if (!selectedETF) return
    
    try {
      const response = await fetch(`/api/chart-data/${threshold}/${selectedETF}`)
      if (response.ok) {
        const data = await response.json()
        setChartData(data)
      } else {
        console.error('Failed to fetch chart data')
      }
    } catch (err) {
      console.error('Error fetching chart data:', err)
    }
  }

  // Fetch chart data when a cycle is selected
  useEffect(() => {
    if (selectedCycle) {
      fetchChartData()
    }
  }, [selectedCycle, selectedETF, threshold])

  const filteredCycles = cycles
    .filter(cycle => {
      const matchesSearch = 
        cycle.cycle_number.toString().includes(searchTerm) ||
        cycle.severity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cycle.ath_date.includes(searchTerm) ||
        cycle.low_date.includes(searchTerm)
      
      const matchesSeverity = severityFilter === 'all' || cycle.severity.toLowerCase() === severityFilter.toLowerCase()
      
      return matchesSearch && matchesSeverity
    })
    .sort((a, b) => {
      const aValue = a[sortField as keyof typeof a]
      const bValue = b[sortField as keyof typeof b]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Cycle', 'Severity', 'ATH Date', 'ATH Price', 'Low Date', 'Low Price',
      'Recovery Date', 'Recovery Price', 'Drawdown %', 'ATH to Low (Days)', 'Low to Recovery (Days)'
    ]
    
    const csvContent = [
      headers.join(','),
      ...filteredCycles.map(cycle => [
        cycle.cycle_number,
        cycle.severity,
        cycle.ath_date,
        cycle.ath_price,
        cycle.low_date,
        cycle.low_price,
        cycle.recovery_date || '',
        cycle.recovery_price || '',
        cycle.drawdown_pct,
        calculateDuration(cycle.ath_date, cycle.low_date),
        cycle.recovery_date ? calculateDuration(cycle.low_date, cycle.recovery_date) : 'Ongoing'
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedETF.toLowerCase()}_cycles_${threshold}pct.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getSeverityBadge = (severity: string) => {
    const colors = {
      severe: 'badge-danger',
      moderate: 'badge-warning',
      mild: 'badge-success'
    }
    return colors[severity.toLowerCase() as keyof typeof colors] || 'badge-info'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Chart helper functions
  const formatChartDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatChartPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }

  // Get filtered chart data for the selected cycle period
  const getCycleChartData = () => {
    if (!chartData || !selectedCycle) return []
    
    const cycleStart = new Date(selectedCycle.ath_date)
    const cycleEnd = selectedCycle.recovery_date ? new Date(selectedCycle.recovery_date) : new Date()
    
    // Add some padding before and after the cycle for context
    const paddingDays = 30
    const paddedStart = new Date(cycleStart.getTime() - (paddingDays * 24 * 60 * 60 * 1000))
    const paddedEnd = new Date(cycleEnd.getTime() + (paddingDays * 24 * 60 * 60 * 1000))
    
    return chartData.data.filter((point: any) => {
      const pointDate = new Date(point.date)
      return pointDate >= paddedStart && pointDate <= paddedEnd
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center">
          <div className="text-danger-600 mb-4">
            <TrendingDown className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchCycles(threshold)}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {selectedETF} Drawdown Cycles
        </h1>
        <p className="text-gray-600 text-lg">
          {threshold}%+ threshold • {cycles.length} total cycles
        </p>
        <p className="text-sm text-blue-600 mt-2">
          💡 Click on any row to view detailed analysis for that cycle
        </p>
      </div>



      {/* Controls */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search cycles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="all">All Severities</option>
              <option value="severe">Severe</option>
              <option value="moderate">Moderate</option>
              <option value="mild">Mild</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Showing {filteredCycles.length} of {cycles.length} cycles
        </p>
      </div>

      {/* Cycles Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { key: 'cycle_number', label: 'Cycle', sortable: true },
                  { key: 'severity', label: 'Severity', sortable: true },
                  { key: 'ath_date', label: 'ATH Date', sortable: true },
                  { key: 'ath_price', label: 'ATH Price', sortable: true },
                  { key: 'low_date', label: 'Low Date', sortable: true },
                  { key: 'low_price', label: 'Low Price', sortable: true },
                  { key: 'drawdown_pct', label: 'Drawdown %', sortable: true },
                  { key: 'ath_to_low_days', label: 'ATH→Low', sortable: true },
                  { key: 'low_to_recovery_days', label: 'Low→Recovery', sortable: true }
                ].map(column => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                      column.sortable ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && sortField === column.key && (
                        <span className="text-primary-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCycles.map((cycle, index) => (
                <React.Fragment key={cycle.cycle_number}>
                  <tr 
                    className={`cursor-pointer transition-colors ${
                      selectedCycle?.cycle_number === cycle.cycle_number
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCycle(selectedCycle?.cycle_number === cycle.cycle_number ? null : cycle)}
                  >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <span>{cycle.cycle_number}</span>
                        {selectedCycle?.cycle_number === cycle.cycle_number && (
                          <TrendingUp className="w-4 h-4 ml-2 text-blue-500" />
                        )}
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${getSeverityBadge(cycle.severity)}`}>
                      {cycle.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(cycle.ath_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${cycle.ath_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(cycle.low_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${cycle.low_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cycle.drawdown_pct.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium text-gray-700">
                        {calculateDuration(cycle.ath_date, cycle.low_date)} days
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cycle.recovery_date ? (
                        <span className="font-medium text-green-600">
                          {calculateDuration(cycle.low_date, cycle.recovery_date)} days
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Ongoing</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* Inline Analysis Panel - Shows immediately after selected row */}
                  {selectedCycle?.cycle_number === cycle.cycle_number && (
                    <tr className="bg-blue-50">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
                          {/* Analysis Header */}
                          <div className="flex justify-between items-start p-4 border-b border-blue-200">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                                Cycle {selectedCycle.cycle_number} Analysis - {formatDate(selectedCycle.ath_date)}
                              </h4>
                              <p className="text-gray-600 mt-1">
                                Detailed breakdown of this {selectedCycle.severity.toLowerCase()} drawdown cycle
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedCycle(null)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Analysis Content */}
                          <div className="p-4">
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              {/* All-Time High */}
                              <div className="space-y-2">
                                <h5 className="font-semibold text-gray-900 flex items-center text-sm">
                                  <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                                  All-Time High
                                </h5>
                                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                  <p className="text-xl font-bold text-green-600">{formatPrice(selectedCycle.ath_price)}</p>
                                  <p className="text-xs text-gray-600">{formatDate(selectedCycle.ath_date)}</p>
                                </div>
                              </div>

                              {/* Low Point */}
                              <div className="space-y-2">
                                <h5 className="font-semibold text-gray-900 flex items-center text-sm">
                                  <TrendingDown className="w-4 h-4 mr-2 text-red-500" />
                                  Low Point
                                </h5>
                                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                  <p className="text-xl font-bold text-red-600">{formatPrice(selectedCycle.low_price)}</p>
                                  <p className="text-xs text-gray-600">{formatDate(selectedCycle.low_date)}</p>
                                  <p className="text-xs text-red-600 font-medium">
                                    {selectedCycle.drawdown_pct.toFixed(1)}% drawdown
                                  </p>
                                </div>
                              </div>

                              {/* Recovery */}
                              <div className="space-y-2">
                                <h5 className="font-semibold text-gray-900 flex items-center text-sm">
                                  <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                                  Recovery
                                </h5>
                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                  <p className="text-xl font-bold text-blue-600">
                                    {selectedCycle.recovery_price ? formatPrice(selectedCycle.recovery_price) : 'Ongoing'}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {selectedCycle.recovery_date ? formatDate(selectedCycle.recovery_date) : 'Not recovered yet'}
                                  </p>
                                </div>
                              </div>

                              {/* Current Price - Show for all cycles */}
                              <div className="space-y-2">
                                <h5 className="font-semibold text-gray-900 flex items-center text-sm">
                                  <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                                  Current Price
                                </h5>
                                <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                                  <p className="text-xl font-bold text-purple-600">
                                    ${currentPrice?.toFixed(2) || 'Fetching...'}
                                  </p>
                                  {currentPrice && (
                                    <div className="text-xs space-y-1 mt-2">
                                      <div className={`flex items-center ${
                                        currentPrice >= selectedCycle.ath_price ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        <span className="mr-1">
                                          {currentPrice >= selectedCycle.ath_price ? '↗' : '↘'}
                                        </span>
                                        {currentPrice >= selectedCycle.ath_price ? 'Above ATH' : 'Below ATH'}
                                      </div>
                                      <div className={`flex items-center ${
                                        currentPrice >= selectedCycle.low_price ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        <span className="mr-1">
                                          {currentPrice >= selectedCycle.low_price ? '↗' : '↘'}
                                        </span>
                                        {currentPrice >= selectedCycle.low_price ? 'Above Low' : 'Below Low'}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Last traded: {currentPrice ? 'Available' : 'Fetching...'}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Timeline and Price Changes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Timeline */}
                              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                                  Timeline
                                </h5>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">ATH to Low:</span>
                                    <span className="font-medium">{calculateDuration(selectedCycle.ath_date, selectedCycle.low_date)} days</span>
                                  </div>
                                  {selectedCycle.recovery_date && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Low to Recovery:</span>
                                        <span className="font-medium">{calculateDuration(selectedCycle.low_date, selectedCycle.recovery_date)} days</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-2">
                                        <span className="text-gray-600 font-medium">Total Cycle:</span>
                                        <span className="font-bold">{calculateDuration(selectedCycle.ath_date, selectedCycle.recovery_date)} days</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Price Changes */}
                              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                                  <TrendingDown className="w-4 h-4 mr-2 text-gray-500" />
                                  Price Changes
                                </h5>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">ATH to Low:</span>
                                    <span className="font-medium text-red-600">
                                      {((selectedCycle.low_price - selectedCycle.ath_price) / selectedCycle.ath_price * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  {selectedCycle.recovery_price && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Low to Recovery:</span>
                                        <span className="font-medium text-green-600">
                                          {((selectedCycle.recovery_price - selectedCycle.low_price) / selectedCycle.low_price * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      <div className="flex justify-between border-t pt-2">
                                        <span className="text-gray-600 font-medium">Net Change:</span>
                                        <span className={`font-bold ${
                                          selectedCycle.recovery_price >= selectedCycle.ath_price ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {((selectedCycle.recovery_price - selectedCycle.ath_price) / selectedCycle.ath_price * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Summary Info */}
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  <div className={`w-3 h-3 rounded-full mt-1 ${
                                    selectedCycle.severity === 'severe' ? 'bg-red-500' :
                                    selectedCycle.severity === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}></div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-blue-900">
                                    {selectedCycle.severity.charAt(0).toUpperCase() + selectedCycle.severity.slice(1)} Drawdown Cycle
                                  </p>
                                  <p className="text-xs text-blue-700 mt-1">
                                    This cycle represents a {selectedCycle.drawdown_pct.toFixed(1)}% decline from the all-time high, 
                                    {selectedCycle.recovery_date 
                                      ? ` which took ${calculateDuration(selectedCycle.ath_date, selectedCycle.recovery_date)} days to fully recover.`
                                      : ' and is currently ongoing without full recovery.'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Cycle Price Chart */}
                            {chartData && (
                              <div className="mt-6">
                                <h5 className="font-semibold text-gray-900 mb-4 flex items-center text-sm">
                                  <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                                  Cycle Price Chart
                                </h5>
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <ComposedChart data={getCycleChartData()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis 
                                          dataKey="date" 
                                          tickFormatter={(value) => formatChartDate(value)}
                                          tick={{ fontSize: 10 }}
                                          stroke="#6b7280"
                                        />
                                        <YAxis 
                                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                                          tick={{ fontSize: 10 }}
                                          stroke="#6b7280"
                                        />
                                        <Tooltip 
                                          content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                              return (
                                                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                                  <p className="font-medium text-gray-900">{formatChartDate(label)}</p>
                                                  <p className="text-blue-600">{selectedETF}: ${payload[0].value?.toFixed(2)}</p>
                                                </div>
                                              )
                                            }
                                            return null
                                          }}
                                        />
                                        <Area 
                                          type="monotone" 
                                          dataKey="close" 
                                          stroke="#2563eb" 
                                          fill="#dbeafe" 
                                          strokeWidth={2}
                                          fillOpacity={0.3}
                                        />
                                        
                                        {/* Highlight the current cycle */}
                                        <ReferenceLine
                                          x={selectedCycle.ath_date}
                                          stroke="#ef4444"
                                          strokeDasharray="3 3"
                                          strokeWidth={2}
                                          label={{
                                            value: `ATH: ${formatChartPrice(selectedCycle.ath_price)}`,
                                            position: 'top',
                                            fill: '#ef4444',
                                            fontSize: 10
                                          }}
                                        />
                                        <ReferenceLine
                                          x={selectedCycle.low_date}
                                          stroke="#dc2626"
                                          strokeDasharray="3 3"
                                          strokeWidth={2}
                                          label={{
                                            value: `Low: ${formatChartPrice(selectedCycle.low_price)}`,
                                            position: 'bottom',
                                            fill: '#dc2626',
                                            fontSize: 10
                                          }}
                                        />
                                        {selectedCycle.recovery_date && (
                                          <ReferenceLine
                                            x={selectedCycle.recovery_date}
                                            stroke="#059669"
                                            strokeDasharray="3 3"
                                            strokeWidth={2}
                                            label={{
                                              value: `Recovery: ${formatChartPrice(selectedCycle.recovery_price)}`,
                                              position: 'top',
                                              fill: '#059669',
                                              fontSize: 10
                                            }}
                                          />
                                        )}
                                        
                                        {/* Highlight the cycle period */}
                                        <ReferenceArea
                                          x1={selectedCycle.ath_date}
                                          x2={selectedCycle.recovery_date || new Date().toISOString().split('T')[0]}
                                          fill="#fef3c7"
                                          fillOpacity={0.3}
                                          stroke="none"
                                        />
                                      </ComposedChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div className="mt-3 text-xs text-gray-600 text-center">
                                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                                    ATH • 
                                    <span className="inline-block w-3 h-3 bg-red-600 rounded-full mx-1"></span>
                                    Low • 
                                    <span className="inline-block w-3 h-3 bg-green-600 rounded-full mx-1"></span>
                                    Recovery • 
                                    <span className="inline-block w-3 h-3 bg-yellow-200 rounded-full mx-1"></span>
                                    Cycle Period
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                  </td>
                </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCycles.length === 0 && (
          <div className="text-center py-12">
            <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cycles found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>


    </div>
  )
}
