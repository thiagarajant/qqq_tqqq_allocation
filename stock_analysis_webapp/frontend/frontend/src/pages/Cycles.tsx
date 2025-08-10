import { useEffect, useState } from 'react'
import { Download, Filter, Search, Calendar, DollarSign, TrendingDown } from 'lucide-react'
import { useThreshold } from '../contexts/ThresholdContext'
import { useData } from '../contexts/DataContext'

export default function Cycles() {
  const { threshold } = useThreshold()
  const { cycles, fetchCycles, isLoading, error } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [sortField, setSortField] = useState('qqq_ath_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchCycles(threshold)
  }, [threshold, fetchCycles])

  const filteredCycles = cycles
    .filter(cycle => {
      const matchesSearch = 
        cycle.cycle_number.toString().includes(searchTerm) ||
        cycle.severity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cycle.qqq_ath_date.includes(searchTerm) ||
        cycle.qqq_low_date.includes(searchTerm)
      
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
      'Recovery Date', 'Recovery Price', 'Drawdown %', 'TQQQ ATH', 'TQQQ Low', 'TQQQ Recovery'
    ]
    
    const csvContent = [
      headers.join(','),
      ...filteredCycles.map(cycle => [
        cycle.cycle_number,
        cycle.severity,
        cycle.qqq_ath_date,
        cycle.qqq_ath_price,
        cycle.qqq_low_date,
        cycle.qqq_low_price,
        cycle.qqq_recovery_date,
        cycle.qqq_recovery_price,
        cycle.qqq_drawdown_pct,
        cycle.tqqq_ath_price || '',
        cycle.tqqq_low_price || '',
        cycle.tqqq_recovery_price || ''
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qqq_cycles_${threshold}pct.csv`
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
          QQQ Drawdown Cycles
        </h1>
        <p className="text-gray-600 text-lg">
          {threshold}%+ threshold • {cycles.length} total cycles
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
                  { key: 'qqq_ath_date', label: 'ATH Date', sortable: true },
                  { key: 'qqq_ath_price', label: 'ATH Price', sortable: true },
                  { key: 'qqq_low_date', label: 'Low Date', sortable: true },
                  { key: 'qqq_low_price', label: 'Low Price', sortable: true },
                  { key: 'qqq_drawdown_pct', label: 'Drawdown %', sortable: true },
                  { key: 'tqqq_drawdown_pct', label: 'TQQQ DD %', sortable: true }
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
              {filteredCycles.map((cycle) => (
                <tr key={cycle.cycle_number} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cycle.cycle_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${getSeverityBadge(cycle.severity)}`}>
                      {cycle.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(cycle.qqq_ath_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${cycle.qqq_ath_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(cycle.qqq_low_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${cycle.qqq_low_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cycle.qqq_drawdown_pct.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cycle.tqqq_drawdown_pct ? `${cycle.tqqq_drawdown_pct.toFixed(1)}%` : '-'}
                  </td>
                </tr>
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
