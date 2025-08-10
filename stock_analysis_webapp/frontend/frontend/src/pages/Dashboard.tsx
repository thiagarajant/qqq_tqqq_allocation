import { useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, BarChart3, AlertTriangle } from 'lucide-react'
import { useThreshold } from '../contexts/ThresholdContext'
import { useData } from '../contexts/DataContext'

export default function Dashboard() {
  const { threshold, availableThresholds, setThreshold } = useThreshold()
  const { summary, fetchSummary } = useData()

  useEffect(() => {
    fetchSummary(threshold)
  }, [threshold, fetchSummary])

  const getThresholdInfo = () => {
    return availableThresholds.find(t => t.value === threshold) || availableThresholds[2]
  }

  // const getSeverityColor = (severity: string) => {
  //   switch (severity.toLowerCase()) {
  //     case 'severe': return 'danger'
  //     case 'moderate': return 'warning'
  //     case 'mild': return 'success'
  //     default: return 'info'
  //   }
  // }

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'severe': return <AlertTriangle className="w-5 h-5 text-danger-600" />
      case 'moderate': return <TrendingDown className="w-5 h-5 text-warning-600" />
      case 'mild': return <TrendingUp className="w-5 h-5 text-success-600" />
      default: return <Activity className="w-5 h-5 text-primary-600" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Market Analysis Dashboard
        </h1>
        <p className="text-gray-600 text-lg">
          QQQ & TQQQ drawdown cycle analysis for {getThresholdInfo()?.label} threshold
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cycles</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.totalCycles || '...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Max Drawdown</p>
              <p className="text-2xl font-bold text-danger-600">
                {summary?.maxDrawdown ? `${summary.maxDrawdown.toFixed(1)}%` : '...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-danger-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Drawdown</p>
              <p className="text-2xl font-bold text-warning-600">
                {summary?.avgDrawdown ? `${summary.avgDrawdown.toFixed(1)}%` : '...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">TQQQ Avg DD</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.avgTQQQDrawdown ? `${summary.avgTQQQDrawdown.toFixed(1)}%` : '...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Severity Breakdown */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cycle Severity Breakdown</h3>
            <div className="space-y-4">
              {[
                { label: 'Severe', count: summary.severeCycles, severity: 'severe' },
                { label: 'Moderate', count: summary.moderateCycles, severity: 'moderate' },
                { label: 'Mild', count: summary.mildCycles, severity: 'mild' }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getSeverityIcon(item.severity)}
                    <span className="font-medium text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{item.count}</span>
                    <span className="text-sm text-gray-500">
                      ({((item.count / summary.totalCycles) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{summary.totalCycles}</span> drawdown cycles identified
                    with {threshold}%+ threshold
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-warning-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-700">
                    Average recovery time and TQQQ leverage effects available
                    in detailed analysis
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-700">
                    Use the navigation above to explore cycles, charts, and
                    detailed analysis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About {getThresholdInfo()?.label} Threshold</h3>
        <p className="text-gray-600 mb-4">
          {getThresholdInfo()?.description} - This analysis identifies periods when QQQ has fallen 
          {threshold}% or more from its all-time high, providing insights into market cycles 
          and TQQQ's leveraged performance during these periods.
        </p>
        <div className="flex flex-wrap gap-2">
          {availableThresholds.map((t) => (
            <span
              key={t.value}
              onClick={() => setThreshold(t.value)}
              className={`badge cursor-pointer transition-colors ${
                t.value === threshold
                  ? 'badge-info'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
