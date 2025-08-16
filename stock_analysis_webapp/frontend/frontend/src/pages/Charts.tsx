import React, { useState, useEffect } from 'react';
import { useThreshold } from '../contexts/ThresholdContext';
import { useData } from '../contexts/DataContext';
import { useETF } from '../contexts/ETFContext';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Bar
} from 'recharts';

interface ChartData {
  threshold: number;
  etf: string;
  data: Array<{ date: string; close: number }>;
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
    dataPoints: number;
    cycles: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

const Charts: React.FC = () => {
  const { threshold, setThreshold, availableThresholds } = useThreshold();
  const { error } = useData();
  const { selectedETF } = useETF();
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1Y' | '2Y' | '5Y' | 'ALL'>('1Y');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (threshold) {
      fetchChartData(threshold);
    }
  }, [threshold, selectedETF]);

  const fetchChartData = async (thresh: number) => {
    setIsLoading(true);
    setChartData(null); // Clear previous data
    try {
      const response = await fetch(`/api/chart-data/${thresh}/${selectedETF}`);
      if (response.ok) {
        const data = await response.json();
        setChartData(data);
      } else {
        console.error('Failed to fetch chart data');
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
    } finally {
      setIsLoading(false);
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

  const getPerformanceData = (data: Array<{ date: string; close: number }>, timeframe: string) => {
    const filteredData = getFilteredData(data, timeframe);
    
    if (filteredData.length === 0) return [];
    
    const startPrice = filteredData[0].close;
    
    return filteredData.map((item) => {
      const performance = ((item.close - startPrice) / startPrice) * 100;
      
      return {
        date: item.date,
        performance: performance,
        price: item.close
      };
    });
  };

  const calculatePerformance = (data: Array<{ date: string; close: number }>) => {
    if (data.length < 2) return { change: 0, changePercent: 0 };
    
    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    
    return { change, changePercent };
  };

  if (isLoading || !chartData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Charts...</h2>
          <p className="text-gray-500 mt-2">Fetching market data and preparing visualizations</p>
        </div>
      </div>
    );
  }

  if (!chartData.data || !chartData.cycles) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Data Error</h2>
          <p className="text-gray-500">Unable to load chart data. Please check your connection and try again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
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
            Visualize {selectedETF} price movements with cycle annotations
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap items-center gap-6">


            <div className="flex gap-4">
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
              
              <div className="flex gap-2 no-print">
                <button
                  onClick={() => {
                    const element = document.createElement('a');
                    const data = JSON.stringify(chartData, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    element.href = URL.createObjectURL(blob);
                    element.download = `chart_data_${selectedTimeframe}_${new Date().toISOString().split('T')[0]}.json`;
                    element.click();
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
                
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 00-2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                  </svg>
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Price Charts */}
        {chartData && (
          <div className="space-y-8 chart-container">
            {/* ETF Price Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{selectedETF} Price Chart</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={getFilteredData(chartData.data, selectedTimeframe)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => formatDate(value)}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium text-gray-900">{formatDate(label)}</p>
                              <p className="text-blue-600">QQQ: ${payload[0].value?.toFixed(2)}</p>
                            </div>
                          );
                        }
                        return null;
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
                    {/* Cycle Annotations */}
                    {chartData.cycles
                      .filter(cycle => {
                        const cycleDate = new Date(cycle.ath_date);
                        const now = new Date();
                        let cutoffDate = new Date();
                        switch (selectedTimeframe) {
                          case '1Y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
                          case '2Y': cutoffDate.setFullYear(now.getFullYear() - 2); break;
                          case '5Y': cutoffDate.setFullYear(now.getFullYear() - 5); break;
                          case 'ALL': return true;
                        }
                        return cycleDate >= cutoffDate;
                      })
                      .map((cycle, index) => (
                        <ReferenceLine
                          key={`qqq-${index}`}
                          x={cycle.ath_date}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                          strokeWidth={2}
                          label={{
                            value: `ATH: $${cycle.ath_price.toFixed(2)}`,
                            position: 'top',
                            fill: '#ef4444',
                            fontSize: 10
                          }}
                        />
                      ))}
                    
                    {/* Chart Legend */}
                    <Legend 
                      content={({ payload }) => (
                        <div className="flex justify-center mt-4 space-x-6">
                          {payload?.map((entry, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              ></div>
                              <span className="text-sm text-gray-600">{entry.value}</span>
                            </div>
                          ))}
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 border-2 border-red-500 border-dashed"></div>
                            <span className="text-sm text-gray-600">ATH Markers</span>
                          </div>
                        </div>
                      )}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>



            {/* Performance Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{selectedETF} Performance Over Time</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getPerformanceData(chartData.data, selectedTimeframe)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => formatDate(value)}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium text-gray-900">{formatDate(label)}</p>
                              {payload.map((entry, index) => (
                                <p key={index} style={{ color: entry.color }}>
                                  {entry.name}: {entry.value?.toFixed(2)}%
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="performance" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={false}
                      name={`${selectedETF} Performance`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cycle Timeline Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cycle Timeline</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData.cycles
                    .filter(cycle => {
                      const cycleDate = new Date(cycle.ath_date);
                      const now = new Date();
                      let cutoffDate = new Date();
                      switch (selectedTimeframe) {
                        case '1Y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
                        case '2Y': cutoffDate.setFullYear(now.getFullYear() - 2); break;
                        case '5Y': cutoffDate.setFullYear(now.getFullYear() - 5); break;
                        case 'ALL': return true;
                      }
                      return cycleDate >= cutoffDate;
                    })
                    .map((cycle, index) => ({
                      cycle: index + 1,
                      ath_date: cycle.ath_date,
                      drawdown: Math.abs(cycle.drawdown_pct),
                      severity: cycle.drawdown_pct >= 15 ? 'severe' : cycle.drawdown_pct >= 10 ? 'moderate' : 'mild'
                    }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="ath_date" 
                      tickFormatter={(value) => formatDate(value)}
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium text-gray-900">{formatDate(label)}</p>
                              <p className="text-red-600">Drawdown: {payload[0].value?.toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="drawdown" 
                      fill="#ef4444" 
                      radius={[2, 2, 0, 0]}
                      opacity={0.8}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Data Summary */}
        {chartData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* ETF Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedETF} Performance</h3>
              {(() => {
                const filteredData = getFilteredData(chartData.data, selectedTimeframe);
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

            {/* Cycle Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cycle Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Cycles</span>
                  <span className="font-medium">{chartData.cycles.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Threshold</span>
                  <span className="font-medium">{threshold}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Average Drawdown</span>
                  <span className="font-medium text-red-600">
                    {chartData.cycles.length > 0 
                      ? (chartData.cycles.reduce((sum, cycle) => sum + Math.abs(cycle.drawdown_pct), 0) / chartData.cycles.length).toFixed(2)
                      : '0.00'}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Max Drawdown</span>
                  <span className="font-medium text-red-600">
                    {chartData.cycles.length > 0 
                      ? Math.min(...chartData.cycles.map(cycle => cycle.drawdown_pct)).toFixed(2)
                      : '0.00'}%
                  </span>
                </div>
              </div>
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
                    // const lowDate = new Date(cycle.low_date);
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

        {/* Chart Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 chart-container">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{selectedETF} Data Points:</span>
                <span className="font-medium">{chartData.metadata?.dataPoints?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date Range:</span>
                <span className="font-medium">{chartData.metadata?.dateRange?.start} - {chartData.metadata?.dateRange?.end}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Cycles:</span>
                <span className="font-medium">{chartData.cycles?.length || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{selectedETF} Current:</span>
                <span className="font-medium text-blue-600">
                  ${chartData.data[chartData.data.length - 1]?.close?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Points:</span>
                <span className="font-medium text-green-600">
                  {chartData.metadata?.dataPoints?.toLocaleString() || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Update:</span>
                <span className="font-medium">
                  {chartData.data[chartData.data.length - 1]?.date || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chart Features</h3>
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Interactive tooltips
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Cycle annotations
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Performance comparison
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Timeframe filtering
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts;
