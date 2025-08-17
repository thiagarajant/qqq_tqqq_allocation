import React, { useState, useEffect } from 'react';
import { useThreshold } from '../contexts/ThresholdContext';
import { useETF } from '../contexts/ETFContext';
import { Calculator, DollarSign, TrendingUp, Calendar, RefreshCw, BarChart3, ChevronDown } from 'lucide-react';

// ETF pair interface for simulation
interface ETFPair {
  baseETF: string;
  leveragedETF: string;
  description: string;
  leverageRatio: string;
}

interface SimulationResult {
  startDate: string;
  endDate: string;
  initialInvestment: number;
  monthlyInvestment?: number;
  totalInvested?: number;
  strategy: string;
  
  // Dynamic results based on selected symbols
  baseETFFinalValue?: number;
  baseETFTotalReturn?: number;
  baseETFTotalReturnPct?: number;
  baseETFAnnualizedReturn?: number;
  
  leveragedETFFinalValue?: number;
  leveragedETFTotalReturn?: number;
  leveragedETFTotalReturnPct?: number;
  leveragedETFAnnualizedReturn?: number;
  
  // Legacy field names for backward compatibility
  qqqFinalValue?: number;
  qqqTotalReturn?: number;
  qqqTotalReturnPct?: number;
  qqqAnnualizedReturn?: number;
  
  tqqqFinalValue?: number;
  tqqqTotalReturn?: number;
  tqqqTotalReturnPct?: number;
  tqqqAnnualizedReturn?: number;
  
  // Strategy results (baseETF with leveragedETF during drawdowns)
  strategyFinalValue?: number;
  strategyTotalReturn?: number;
  strategyTotalReturnPct?: number;
  strategyAnnualizedReturn?: number;
  strategySwitches?: number;
  
  // Additional metrics
  durationDays: number;
  durationYears: number;
}

const Simulation: React.FC = () => {
  const { threshold, setThreshold, availableThresholds } = useThreshold();
  const { selectedETF, availableETFs, isLoading: etfLoading } = useETF();
  
  const [selectedETFPair, setSelectedETFPair] = useState<ETFPair>({
    baseETF: '',
    leveragedETF: '',
    description: '',
    leverageRatio: 'Custom'
  });
  const [availableETFPairs, setAvailableETFPairs] = useState<ETFPair[]>([]);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>('2024-12-31');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  const [symbolSearchTerm, setSymbolSearchTerm] = useState('');

  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(0);
  const [useMonthlyInvestment, setUseMonthlyInvestment] = useState(false);

  // Fetch available ETF pairs for simulation
  useEffect(() => {
    const fetchETFPairs = async () => {
      try {
        const response = await fetch('/api/available-etfs');
        if (response.ok) {
          const data = await response.json();
          setAvailableETFPairs(data.etfPairs || []);
        }
      } catch (error) {
        console.error('Failed to fetch ETF pairs:', error);
      }
    };
    fetchETFPairs();
  }, []);

  // Auto-generate ETF pairs from available symbols
  useEffect(() => {
    if (availableETFs.length > 0) {
      const generatedPairs: ETFPair[] = [];
      
      // Create pairs for known leveraged relationships
      const knownLeveraged = {
        'QQQ': 'TQQQ',
        'SPY': 'UPRO', 
        'IWM': 'TNA'
      };
      
      availableETFs.forEach(etf => {
        if (knownLeveraged[etf.symbol as keyof typeof knownLeveraged]) {
          const leveraged = knownLeveraged[etf.symbol as keyof typeof knownLeveraged];
          if (availableETFs.some(e => e.symbol === leveraged)) {
            generatedPairs.push({
              baseETF: etf.symbol,
              leveragedETF: leveraged,
              description: `${etf.name} vs 3x Leveraged`,
              leverageRatio: '3x'
            });
          }
        }
      });
      
      // Add custom pairs for any two symbols
      if (availableETFs.length >= 2) {
        availableETFs.forEach((etf1, i) => {
          availableETFs.slice(i + 1).forEach(etf2 => {
            generatedPairs.push({
              baseETF: etf1.symbol,
              leveragedETF: etf2.symbol,
              description: `${etf1.symbol} vs ${etf2.symbol}`,
              leverageRatio: 'Custom'
            });
          });
        });
      }
      
      setAvailableETFPairs(generatedPairs);
    }
  }, [availableETFs]);

  const runSimulation = async () => {
    if (!investmentAmount || !startDate || !endDate || !threshold) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (!selectedETFPair.baseETF || !selectedETFPair.leveragedETF) {
      setError('Please select both base and secondary symbols');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: investmentAmount,
          startDate,
          endDate,
          threshold,
          monthlyInvestment: useMonthlyInvestment ? monthlyInvestment : 0,
          baseETF: selectedETFPair.baseETF,
          leveragedETF: selectedETFPair.leveragedETF
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Simulation failed');
      }

      const result = await response.json();
      setSimulationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getReturnColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getReturnBgColor = (value: number) => {
    return value >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  const handleETFPairChange = (baseETF: string, leveragedETF: string) => {
    const pair = availableETFPairs.find(p => 
      p.baseETF === baseETF && p.leveragedETF === leveragedETF
    );
    if (pair) {
      setSelectedETFPair(pair);
    }
  };

  // Show loading state while ETFs are being fetched
  if (etfLoading || availableETFs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Simulation...</h2>
            <p className="text-gray-600">Please wait while we load available symbols.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Simulation</h1>
          <p className="mt-2 text-gray-600">
            Compare different investment strategies and see how they would have performed historically.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Simulation Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Simulation Parameters</h2>
              
              {/* ETF Pair Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Smart Strategy Symbols
                </label>
                <div className="space-y-3">


                  {/* Base Symbol Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Base Symbol (Primary)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedETFPair.baseETF}
                        onChange={(e) => {
                          const newBase = e.target.value;
                          setSelectedETFPair({
                            ...selectedETFPair,
                            baseETF: newBase,
                            description: `${newBase} vs ${selectedETFPair.leveragedETF}`,
                            leverageRatio: 'Custom'
                          });
                          // Clear previous simulation results when symbols change
                          setSimulationResult(null);
                        }}
                        placeholder="Type symbol (e.g., QQQ, AAPL, TSLA)..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      
                      {/* Autocomplete Suggestions */}
                      {selectedETFPair.baseETF && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {availableETFs
                            .filter(etf => 
                              etf.symbol.toLowerCase().includes(selectedETFPair.baseETF.toLowerCase()) ||
                              etf.name.toLowerCase().includes(selectedETFPair.baseETF.toLowerCase())
                            )
                            .slice(0, 10) // Limit to 10 suggestions
                            .map((etf) => (
                              <div
                                key={etf.symbol}
                                onClick={() => {
                                  setSelectedETFPair({
                                    ...selectedETFPair,
                                    baseETF: etf.symbol,
                                    description: `${etf.symbol} vs ${selectedETFPair.leveragedETF}`,
                                    leverageRatio: 'Custom'
                                  });
                                  setSimulationResult(null);
                                }}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{etf.symbol}</div>
                                <div className="text-xs text-gray-500">{etf.name}</div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leveraged/Secondary Symbol Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Secondary Symbol (Switch Target)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedETFPair.leveragedETF}
                        onChange={(e) => {
                          const newLeveraged = e.target.value;
                          setSelectedETFPair({
                            ...selectedETFPair,
                            leveragedETF: newLeveraged,
                            description: `${selectedETFPair.baseETF} vs ${newLeveraged}`,
                            leverageRatio: 'Custom'
                          });
                          // Clear previous simulation results when symbols change
                          setSimulationResult(null);
                        }}
                        placeholder="Type symbol (e.g., QQQ, AAPL, TSLA)..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      
                      {/* Autocomplete Suggestions */}
                      {selectedETFPair.leveragedETF && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {availableETFs
                            .filter(etf => 
                              etf.symbol.toLowerCase().includes(selectedETFPair.leveragedETF.toLowerCase()) ||
                              etf.name.toLowerCase().includes(selectedETFPair.leveragedETF.toLowerCase())
                            )
                            .slice(0, 10) // Limit to 10 suggestions
                            .map((etf) => (
                              <div
                                key={etf.symbol}
                                onClick={() => {
                                  setSelectedETFPair({
                                    ...selectedETFPair,
                                    leveragedETF: etf.symbol,
                                    description: `${selectedETFPair.baseETF} vs ${etf.symbol}`,
                                    leverageRatio: 'Custom'
                                  });
                                  setSimulationResult(null);
                                }}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{etf.symbol}</div>
                                <div className="text-xs text-gray-500">{etf.name}</div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>



                  {/* Current Selection Info */}
                  {selectedETFPair.baseETF && selectedETFPair.leveragedETF && (
                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Strategy:</span> {selectedETFPair.baseETF} → {selectedETFPair.leveragedETF}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedETFPair.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Investment Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Investment
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10000"
                    min="100"
                    step="100"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Drawdown Threshold */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drawdown Threshold
                </label>
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableThresholds.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly Investment */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="monthlyInvestment"
                    checked={useMonthlyInvestment}
                    onChange={(e) => setUseMonthlyInvestment(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="monthlyInvestment" className="ml-2 text-sm font-medium text-gray-700">
                    Add Monthly Investment
                  </label>
                </div>
                {useMonthlyInvestment && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={monthlyInvestment}
                      onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1000"
                      min="100"
                      step="100"
                    />
                  </div>
                )}
              </div>

              {/* Run Simulation Button */}
              <button
                onClick={runSimulation}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Running...
                  </>
                ) : (
                  <>
                    <Calculator className="-ml-1 mr-2 h-4 w-4" />
                    Run Simulation
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Simulation Results */}
          <div className="lg:col-span-2">
            {simulationResult ? (
              <div className="space-y-6">
                {/* Results Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Base ETF Only */}
                  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${getReturnBgColor(simulationResult.baseETFFinalValue ? simulationResult.baseETFTotalReturnPct : 0)}`}>
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">{selectedETFPair.baseETF} Only</h4>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(simulationResult.baseETFFinalValue || simulationResult.qqqFinalValue || 0)}
                      </p>
                      <p className={`text-sm font-medium ${getReturnColor(simulationResult.baseETFTotalReturnPct || simulationResult.qqqTotalReturnPct || 0)}`}>
                        {formatPercent(simulationResult.baseETFTotalReturnPct || simulationResult.qqqTotalReturnPct || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPercent(simulationResult.baseETFAnnualizedReturn || simulationResult.qqqAnnualizedReturn || 0)} annually
                      </p>
                    </div>
                  </div>

                  {/* Leveraged ETF Only */}
                  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${getReturnBgColor(simulationResult.leveragedETFFinalValue ? simulationResult.leveragedETFTotalReturnPct : 0)}`}>
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">{selectedETFPair.leveragedETF} Only</h4>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(simulationResult.leveragedETFFinalValue || simulationResult.tqqqFinalValue || 0)}
                      </p>
                      <p className={`text-sm font-medium ${getReturnColor(simulationResult.leveragedETFTotalReturnPct || simulationResult.tqqqTotalReturnPct || 0)}`}>
                        {formatPercent(simulationResult.leveragedETFTotalReturnPct || simulationResult.tqqqTotalReturnPct || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPercent(simulationResult.leveragedETFAnnualizedReturn || simulationResult.tqqqAnnualizedReturn || 0)} annually
                      </p>
                    </div>
                  </div>

                  {/* Strategy */}
                  {simulationResult.strategyFinalValue && (
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${getReturnBgColor(simulationResult.strategyTotalReturnPct || 0)}`}>
                      <div className="text-center">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Smart Strategy</h4>
                        <p className="text-2xl font-bold text-gray-900 mb-1">
                          {formatCurrency(simulationResult.strategyFinalValue)}
                        </p>
                        <p className={`text-sm font-medium ${getReturnColor(simulationResult.strategyTotalReturnPct || 0)}`}>
                          {formatPercent(simulationResult.strategyTotalReturnPct || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {simulationResult.strategySwitches} switches
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Results */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Investment Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Initial Investment:</span>
                          <span className="font-medium">{formatCurrency(simulationResult.initialInvestment)}</span>
                        </div>
                        {simulationResult.monthlyInvestment && (
                          <div className="flex justify-between">
                            <span>Monthly Investment:</span>
                            <span className="font-medium">{formatCurrency(simulationResult.monthlyInvestment)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Total Invested:</span>
                          <span className="font-medium">{formatCurrency(simulationResult.totalInvested || simulationResult.initialInvestment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span className="font-medium">{simulationResult.durationYears.toFixed(1)} years</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Strategy Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Strategy:</span>
                          <span className="font-medium text-blue-600">{simulationResult.strategy}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Switches:</span>
                          <span className="font-medium">{simulationResult.strategySwitches || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Threshold:</span>
                          <span className="font-medium">{threshold}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy Explanation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Strategy Explanation</h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      <strong>Smart Strategy:</strong> Start with {selectedETFPair.baseETF}, switch to {selectedETFPair.leveragedETF} when {selectedETFPair.baseETF} drops {threshold}%+ from its all-time high, 
                      then switch back to {selectedETFPair.baseETF} when {selectedETFPair.baseETF} recovers to a new all-time high.
                    </p>
                    <p>
                      <strong>Rationale:</strong> {selectedETFPair.leveragedETF}'s leverage amplifies both gains and losses. During major drawdowns, 
                      the strategy aims to capture {selectedETFPair.leveragedETF}'s amplified recovery while avoiding prolonged exposure to leverage decay.
                    </p>
                    <p className="text-xs text-blue-600">
                      Period: {simulationResult.startDate} to {simulationResult.endDate} 
                      ({simulationResult.durationYears.toFixed(1)} years)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Simulate</h3>
                <p className="text-gray-600 mb-4">
                  Enter your investment parameters and click "Run Simulation" to see how different strategies would have performed.
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  {selectedETFPair.baseETF && selectedETFPair.leveragedETF ? (
                    <p>• Compare {selectedETFPair.baseETF} vs {selectedETFPair.leveragedETF} performance</p>
                  ) : (
                    <p>• Select symbols to compare performance</p>
                  )}
                  <p>• Test smart switching strategies</p>
                  <p>• See detailed return calculations</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
