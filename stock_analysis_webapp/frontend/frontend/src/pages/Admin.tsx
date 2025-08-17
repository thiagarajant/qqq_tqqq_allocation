import React, { useState, useEffect } from 'react'
import { useETF } from '../contexts/ETFContext'
import { BarChart3, RefreshCw, Database, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface DataFreshness {
  symbol: string
  name: string
  sector: string
  last_updated: string
  status: string
  error_count: number
  last_error: string
  latest_date: string
  latest_close: number
}

interface BulkFetchResult {
  total: number
  successful: number
  failed: number
  skipped: number
  details: Array<{
    symbol: string
    status: string
    reason?: string
    error?: string
    rowsInserted?: number
  }>
}

export default function Admin() {
  const { availableETFs } = useETF()
  const [dataFreshness, setDataFreshness] = useState<DataFreshness[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [bulkFetchResult, setBulkFetchResult] = useState<BulkFetchResult | null>(null)
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([])
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [forceRefresh, setForceRefresh] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  // Fetch data freshness status
  const fetchDataFreshness = async () => {
    try {
      const response = await fetch('/api/data-freshness?limit=1000')
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success') {
          setDataFreshness(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching data freshness:', error)
    }
  }

  // Start bulk fetch
  const startBulkFetch = async () => {
    try {
      setIsLoading(true)
      setProgress({ current: 0, total: selectedSymbols.length || availableETFs.length })
      setBulkFetchResult(null)

      const response = await fetch('/api/bulk-fetch-historical-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: selectedSymbols.length > 0 ? selectedSymbols : undefined,
          startDate,
          endDate: endDate || undefined,
          forceRefresh
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success') {
          setBulkFetchResult(data.results)
          // Refresh data freshness after bulk fetch
          setTimeout(() => fetchDataFreshness(), 2000)
        }
      }
    } catch (error) {
      console.error('Error starting bulk fetch:', error)
    } finally {
      setIsLoading(false)
      setProgress(null)
    }
  }

  // Refresh specific symbol
  const refreshSymbol = async (symbol: string) => {
    try {
      const response = await fetch(`/api/symbols/${symbol}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate: endDate || undefined })
      })

      if (response.ok) {
        // Refresh data freshness
        setTimeout(() => fetchDataFreshness(), 1000)
      }
    } catch (error) {
      console.error(`Error refreshing ${symbol}:`, error)
    }
  }

  // Select all symbols
  const selectAllSymbols = () => {
    setSelectedSymbols(availableETFs.map(etf => etf.symbol))
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedSymbols([])
  }

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  }

  useEffect(() => {
    fetchDataFreshness()
  }, [])

  const totalSymbols = availableETFs.length
  const activeSymbols = dataFreshness.filter(df => df.status === 'active').length
  const errorSymbols = dataFreshness.filter(df => df.status === 'error').length
  const pendingSymbols = totalSymbols - activeSymbols - errorSymbols

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Data Management Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Manage historical price data for all NASDAQ symbols
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Symbols</p>
                <p className="text-2xl font-bold text-gray-900">{totalSymbols}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Data</p>
                <p className="text-2xl font-bold text-green-600">{activeSymbols}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{errorSymbols}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingSymbols}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Fetch Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Data Fetch</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="forceRefresh"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="forceRefresh" className="ml-2 text-sm text-gray-700">
                Force Refresh
              </label>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={selectAllSymbols}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Symbols ({selectedSymbols.length || 'All'})
            </label>
            {selectedSymbols.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSymbols.map(symbol => (
                  <span
                    key={symbol}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            )}
            {selectedSymbols.length === 0 && (
              <p className="text-sm text-gray-500">No symbols selected. Will fetch data for all active symbols.</p>
            )}
          </div>

          <button
            onClick={startBulkFetch}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Start Bulk Fetch
              </>
            )}
          </button>

          {/* Progress Bar */}
          {progress && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Bulk Fetch Results */}
          {bulkFetchResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Bulk Fetch Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{bulkFetchResult.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{bulkFetchResult.successful}</p>
                  <p className="text-sm text-gray-600">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{bulkFetchResult.failed}</p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{bulkFetchResult.skipped}</p>
                  <p className="text-sm text-gray-600">Skipped</p>
                </div>
              </div>
              
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Details
                </summary>
                <div className="mt-2 max-h-64 overflow-y-auto">
                  {bulkFetchResult.details.map((detail, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                      <span className="font-mono text-sm">{detail.symbol}</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        detail.status === 'success' ? 'bg-green-100 text-green-800' :
                        detail.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {detail.status}
                      </span>
                      {detail.rowsInserted && (
                        <span className="text-sm text-gray-600">{detail.rowsInserted} rows</span>
                      )}
                      {detail.error && (
                        <span className="text-sm text-red-600">{detail.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Data Freshness Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Data Freshness Status</h2>
              <button
                onClick={fetchDataFreshness}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latest Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataFreshness.map((item) => (
                  <tr key={item.symbol}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900">{item.symbol}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sector}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(item.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.latest_close ? `$${item.latest_close.toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => refreshSymbol(item.symbol)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Refresh
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
