import React, { useState, useEffect } from 'react';
import { useThreshold } from '../contexts/ThresholdContext';
import { useData } from '../contexts/DataContext';

interface ChartData {
  threshold: number;
  qqqData: Array<{ date: string; close: number }>;
  tqqqData: Array<{ date: string; close: number }>;
  cycles: Array<{
    ath_date: string;
    ath_price: number;
    low_date: string;
    low_price: number;
    recovery_date: string;
    recovery_price: number;
    drawdown_pct: number;
  }>;
  metadata: {
    qqqPoints: number;
    tqqqPoints: number;
    cycles: number;
    dateRange: {
      qqq: { start: string; end: string };
      tqqq: { start: string; end: string };
    };
  };
}

const Charts: React.FC = () => {
  const { threshold, setThreshold } = useThreshold();
  const { data, loading, error } = useData();
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1Y' | '2Y' | '5Y' | 'ALL'>('1Y');

  useEffect(() => {
    if (threshold) {
      fetchChartData(threshold);
    }
  }, [threshold]);

  const fetchChartData = async (thresh: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/chart-data/${thresh}`);
      if (response.ok) {
        const data = await response.json();
        setChartData(data);
      } else {
        console.error('Failed to fetch chart data');
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getFilteredData = (data: Array<{ date: string; close: number }>, timeframe: string) => {
    if (timeframe === 'ALL') return data;
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (timeframe) {
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2Y':
        cutoffDate.setFullYear(now.getFullYear() - 2);
        break;
      case '5Y':
        cutoffDate.setFullYear(now.getFullYear() - 5);
        break;
    }
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  };

  const calculatePerformance = (data: Array<{ date: string; close: number }>) => {
    if (data.length < 2) return { change: 0, changePercent: 0 };
    
    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    
    return { change, changePercent };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Charts...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700">Error Loading Data</h2>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interactive Charts</h1>
          <p className="text-gray-600">
            Visualize QQQ and TQQQ price movements with cycle annotations
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Threshold</label>
              <div className="flex gap-2">
                {[2, 5, 10, 15, 20].map((thresh) => (
                  <button
                    key={thresh}
                    onClick={() => setThreshold(thresh)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      threshold === thresh
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {thresh}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1Y">1 Year</option>
                <option value="2Y">2 Years</option>
                <option value="5Y">5 Years</option>
                <option value="ALL">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chart Placeholder */}
        {chartData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Price Chart</h2>
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg font-medium">Chart Visualization</p>
                <p className="text-sm">Interactive chart component will be implemented here</p>
              </div>
              <div className="text-xs text-gray-400">
                <p>QQQ Data: {chartData.metadata.qqqPoints.toLocaleString()} points</p>
                <p>TQQQ Data: {chartData.metadata.tqqqPoints.toLocaleString()} points</p>
                <p>Cycles: {chartData.metadata.cycles}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data Summary */}
        {chartData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* QQQ Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">QQQ Performance</h3>
              {(() => {
                const filteredData = getFilteredData(chartData.qqqData, selectedTimeframe);
                const performance = calculatePerformance(filteredData);
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Data Points</span>
                      <span className="font-medium">{filteredData.length.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Date Range</span>
                      <span className="font-medium text-sm">
                        {formatDate(filteredData[0]?.date)} - {formatDate(filteredData[filteredData.length - 1]?.date)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Price Change</span>
                      <span className={`font-medium ${performance.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPrice(performance.change)} ({performance.changePercent >= 0 ? '+' : ''}{performance.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Current Price</span>
                      <span className="font-medium">{formatPrice(filteredData[filteredData.length - 1]?.close || 0)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* TQQQ Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">TQQQ Performance</h3>
              {(() => {
                const filteredData = getFilteredData(chartData.tqqqData, selectedTimeframe);
                const performance = calculatePerformance(filteredData);
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Data Points</span>
                      <span className="font-medium">{filteredData.length.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Date Range</span>
                      <span className="font-medium text-sm">
                        {formatDate(filteredData[0]?.date)} - {formatDate(filteredData[filteredData.length - 1]?.date)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Price Change</span>
                      <span className={`font-medium ${performance.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPrice(performance.change)} ({performance.changePercent >= 0 ? '+' : ''}{performance.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Current Price</span>
                      <span className="font-medium">{formatPrice(filteredData[filteredData.length - 1]?.close || 0)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Cycles Table */}
        {chartData && chartData.cycles.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cycles in Selected Timeframe</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cycle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ATH</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Low</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recovery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drawdown</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chartData.cycles.map((cycle, index) => {
                    const athDate = new Date(cycle.ath_date);
                    const lowDate = new Date(cycle.low_date);
                    const recoveryDate = new Date(cycle.recovery_date);
                    const isInTimeframe = (() => {
                      const now = new Date();
                      let cutoffDate = new Date();
                      switch (selectedTimeframe) {
                        case '1Y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
                        case '2Y': cutoffDate.setFullYear(now.getFullYear() - 2); break;
                        case '5Y': cutoffDate.setFullYear(now.getFullYear() - 5); break;
                        case 'ALL': return true;
                      }
                      return athDate >= cutoffDate;
                    })();

                    if (!isInTimeframe) return null;

                    const duration = Math.ceil((recoveryDate.getTime() - athDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{formatPrice(cycle.ath_price)}</div>
                            <div className="text-gray-500">{formatDate(cycle.ath_date)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium text-red-600">{formatPrice(cycle.low_price)}</div>
                            <div className="text-gray-500">{formatDate(cycle.low_date)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium text-green-600">{formatPrice(cycle.recovery_price)}</div>
                            <div className="text-gray-500">{formatDate(cycle.recovery_date)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-red-600 font-medium">{cycle.drawdown_pct.toFixed(1)}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {duration} days
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Chart Implementation Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Chart Implementation</h3>
          <p className="text-blue-800 text-sm">
            This page is ready for chart library integration. Recommended libraries include:
            <br />• <strong>Chart.js</strong> - Lightweight and easy to use
            <br />• <strong>D3.js</strong> - Powerful and customizable
            <br />• <strong>Recharts</strong> - React-specific charting library
            <br />• <strong>Apache ECharts</strong> - Feature-rich and performant
          </p>
        </div>
      </div>
    </div>
  );
};

export default Charts;
