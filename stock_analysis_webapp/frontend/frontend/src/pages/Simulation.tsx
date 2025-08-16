import React, { useState, useEffect } from 'react';
import { useThreshold } from '../contexts/ThresholdContext';
import { Calculator, DollarSign, TrendingUp, Calendar, RefreshCw, BarChart3 } from 'lucide-react';

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
  
  // QQQ only results
  qqqFinalValue: number;
  qqqTotalReturn: number;
  qqqTotalReturnPct: number;
  qqqAnnualizedReturn: number;
  
  // TQQQ only results
  tqqqFinalValue: number;
  tqqqTotalReturn: number;
  tqqqTotalReturnPct: number;
  tqqqAnnualizedReturn: number;
  
  // Strategy results (QQQ with TQQQ during drawdowns)
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
  const [selectedETFPair, setSelectedETFPair] = useState<ETFPair>({
    baseETF: 'QQQ',
    leveragedETF: 'TQQQ',
    description: 'NASDAQ-100 (QQQ) vs 3x Leveraged (TQQQ)',
    leverageRatio: '3x'
  });
  const [availableETFPairs, setAvailableETFPairs] = useState<ETFPair[]>([]);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>('2024-12-31');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const runSimulation = async () => {
    if (!investmentAmount || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { baseETF, leveragedETF } = selectedETFPair;
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: investmentAmount,
          startDate,
          endDate,
          threshold: threshold,
          monthlyInvestment: useMonthlyInvestment ? monthlyInvestment : 0,
          baseETF,
          leveragedETF,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run simulation');
      }

      const result = await response.json();
      setSimulationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const getReturnColor = (percent: number) => {
    if (percent > 0) return 'text-success-600';
    if (percent < 0) return 'text-danger-600';
    return 'text-gray-600';
  };

  const getReturnBgColor = (percent: number) => {
    if (percent > 0) return 'bg-success-50 border-success-200';
    if (percent < 0) return 'bg-danger-50 border-danger-200';
    return 'bg-gray-50 border-gray-200';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Running Simulation...</h2>
          <p className="text-gray-500 mt-2">Calculating portfolio returns and strategy performance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Simulation</h1>
          <p className="text-gray-600">
            Simulate investment returns and test QQQ-to-TQQQ switching strategies during drawdowns
          </p>
        </div>

        {/* Simulation Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Simulation Parameters
              </h3>

              <div className="space-y-6">
                {/* Investment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Investment
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                      className="input-field pl-10"
                      placeholder="10000"
                      min="100"
                      max="10000000"
                      step="100"
                    />
                  </div>
                </div>

                {/* Monthly Investment */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Monthly Investment (Optional)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={useMonthlyInvestment}
                        onChange={(e) => setUseMonthlyInvestment(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">Enable DCA</span>
                    </label>
                  </div>
                  
                  {useMonthlyInvestment && (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={monthlyInvestment}
                        onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                        className="input-field pl-10"
                        placeholder="1000"
                        min="0"
                        max="100000"
                        step="50"
                      />
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {useMonthlyInvestment 
                      ? `Add $${monthlyInvestment.toLocaleString()} every month (Dollar-Cost Averaging)`
                      : 'Enable to add regular monthly investments throughout the period'
                    }
                  </p>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-field pl-10"
                      min="1999-01-01"
                      max="2025-12-31"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input-field pl-10"
                      min="1999-01-01"
                      max="2025-12-31"
                    />
                  </div>
                </div>



                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                    <p className="text-sm text-danger-700">{error}</p>
                  </div>
                )}

                {/* Run Simulation Button */}
                <button
                  onClick={runSimulation}
                  disabled={isLoading}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Running...' : 'Run Simulation'}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {simulationResult ? (
              <div className="space-y-6">
                {/* Investment Summary */}
                <div className="card bg-gray-50 border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Investment Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Initial Investment:</span>
                      <p className="font-semibold text-gray-900">{formatCurrency(simulationResult.initialInvestment)}</p>
                    </div>
                    {simulationResult.monthlyInvestment && simulationResult.monthlyInvestment > 0 && (
                      <>
                        <div>
                          <span className="text-gray-600">Monthly Investment:</span>
                          <p className="font-semibold text-gray-900">{formatCurrency(simulationResult.monthlyInvestment)}/month</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Invested:</span>
                          <p className="font-semibold text-blue-600">{formatCurrency(simulationResult.totalInvested || simulationResult.initialInvestment)}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-gray-600">Period:</span>
                      <p className="font-semibold text-gray-900">{simulationResult.durationYears.toFixed(1)} years</p>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* QQQ Only */}
                  <div className={`card ${getReturnBgColor(simulationResult.qqqTotalReturnPct)}`}>
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">QQQ Only</h4>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(simulationResult.qqqFinalValue)}
                      </p>
                      <p className={`text-sm font-medium ${getReturnColor(simulationResult.qqqTotalReturnPct)}`}>
                        {formatPercent(simulationResult.qqqTotalReturnPct)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPercent(simulationResult.qqqAnnualizedReturn)} annually
                      </p>
                    </div>
                  </div>

                  {/* TQQQ Only */}
                  <div className={`card ${getReturnBgColor(simulationResult.tqqqTotalReturnPct)}`}>
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">TQQQ Only</h4>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(simulationResult.tqqqFinalValue)}
                      </p>
                      <p className={`text-sm font-medium ${getReturnColor(simulationResult.tqqqTotalReturnPct)}`}>
                        {formatPercent(simulationResult.tqqqTotalReturnPct)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPercent(simulationResult.tqqqAnnualizedReturn)} annually
                      </p>
                    </div>
                  </div>

                  {/* Strategy */}
                  {simulationResult.strategyFinalValue && (
                    <div className={`card ${getReturnBgColor(simulationResult.strategyTotalReturnPct || 0)}`}>
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
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Detailed Results
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Strategy
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Final Value
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Return
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Annualized
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            QQQ Only
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(simulationResult.qqqFinalValue)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getReturnColor(simulationResult.qqqTotalReturnPct)}`}>
                            {formatPercent(simulationResult.qqqTotalReturnPct)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercent(simulationResult.qqqAnnualizedReturn)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Conservative approach
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            TQQQ Only
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(simulationResult.tqqqFinalValue)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getReturnColor(simulationResult.tqqqTotalReturnPct)}`}>
                            {formatPercent(simulationResult.tqqqTotalReturnPct)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercent(simulationResult.tqqqAnnualizedReturn)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            High risk/reward
                          </td>
                        </tr>
                        {simulationResult.strategyFinalValue && (
                          <tr className="bg-primary-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-900">
                              Smart Strategy
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                              {formatCurrency(simulationResult.strategyFinalValue)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getReturnColor(simulationResult.strategyTotalReturnPct || 0)}`}>
                              {formatPercent(simulationResult.strategyTotalReturnPct || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                              {formatPercent(simulationResult.strategyAnnualizedReturn || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600">
                              {simulationResult.strategySwitches} switches at {threshold}%+ drawdowns
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Strategy Explanation */}
                <div className="card bg-blue-50 border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Strategy Explanation</h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      <strong>Smart Strategy:</strong> Start with QQQ, switch to TQQQ when QQQ drops {threshold}%+ from its all-time high, 
                      then switch back to QQQ when QQQ recovers to a new all-time high.
                    </p>
                    <p>
                      <strong>Rationale:</strong> TQQQ's 3x leverage amplifies both gains and losses. During major drawdowns, 
                      the strategy aims to capture TQQQ's amplified recovery while avoiding prolonged exposure to leverage decay.
                    </p>
                    <p className="text-xs text-blue-600">
                      Period: {simulationResult.startDate} to {simulationResult.endDate} 
                      ({simulationResult.durationYears.toFixed(1)} years)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Simulate</h3>
                <p className="text-gray-600 mb-4">
                  Enter your investment parameters and click "Run Simulation" to see how different strategies would have performed.
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>• Compare QQQ vs TQQQ performance</p>
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
