import React, { useState, useEffect } from 'react';
import { useThreshold } from '../contexts/ThresholdContext';
import { useData } from '../contexts/DataContext';
import { useETF } from '../contexts/ETFContext';

interface Cycle {
  ath_date: string;
  ath_price: number;
  low_date: string;
  low_price: number;
  recovery_date: string;
  recovery_price: number;
  drawdown_pct: number;
  threshold: number;
}

interface AnalysisData {
  threshold: number;
  totalCycles: number;
  cycles: Cycle[];
  dataPoints: number;
}

const Analysis: React.FC = () => {
  const { threshold, setThreshold, availableThresholds } = useThreshold();
  const { error } = useData();
  const { selectedETF } = useETF();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  


  useEffect(() => {
    if (threshold) {
      fetchAnalysisData(threshold);
    }
  }, [threshold, selectedETF]);

  const fetchAnalysisData = async (thresh: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/cycles/${thresh}/${selectedETF}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysisData({
          threshold: data.threshold,
          totalCycles: data.totalCycles,
          cycles: data.cycles,
          dataPoints: data.dataPoints
        });
      } else {
        console.error('Failed to fetch analysis data');
      }
    } catch (err) {
      console.error('Error fetching analysis data:', err);
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
      currency: 'USD'
    }).format(price);
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Analysis...</h2>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedETF} Cycle Analysis</h1>
          <p className="text-gray-600">
            Detailed analysis of {selectedETF} price cycles with customizable drawdown thresholds
          </p>
        </div>



        {/* Analysis Results */}
        {analysisData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Summary Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Threshold</p>
                    <p className="text-2xl font-bold text-blue-600">{threshold}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Cycles</p>
                    <p className="text-2xl font-bold text-gray-900">{analysisData.totalCycles}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data Points</p>
                    <p className="text-2xl font-bold text-gray-900">{analysisData.dataPoints.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cycles List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cycles ({analysisData.cycles.length})</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {analysisData.cycles.map((cycle, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedCycle === cycle
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedCycle(cycle)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">Cycle {index + 1}</h4>
                        <span className="text-sm text-gray-500">
                          {formatDate(cycle.ath_date)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">ATH</p>
                          <p className="font-medium">{formatPrice(cycle.ath_price)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Low</p>
                          <p className="font-medium text-red-600">{formatPrice(cycle.low_price)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Recovery</p>
                          <p className="font-medium text-green-600">{formatPrice(cycle.recovery_price)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                        <span>Drawdown: {cycle.drawdown_pct.toFixed(1)}%</span>
                        <span>Duration: {calculateDuration(cycle.ath_date, cycle.recovery_date)} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Cycle View */}
        {selectedCycle && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Cycle Details - {formatDate(selectedCycle.ath_date)}
              </h3>
              <button
                onClick={() => setSelectedCycle(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">All-Time High</h4>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{formatPrice(selectedCycle.ath_price)}</p>
                  <p className="text-sm text-gray-600">{formatDate(selectedCycle.ath_date)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Low Point</h4>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{formatPrice(selectedCycle.low_price)}</p>
                  <p className="text-sm text-gray-600">{formatDate(selectedCycle.low_date)}</p>
                  <p className="text-sm text-red-600 font-medium">
                    {selectedCycle.drawdown_pct.toFixed(1)}% drawdown
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Recovery</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{formatPrice(selectedCycle.recovery_price)}</p>
                  <p className="text-sm text-gray-600">{formatDate(selectedCycle.recovery_date)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>ATH to Low:</span>
                    <span className="font-medium">{calculateDuration(selectedCycle.ath_date, selectedCycle.low_date)} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low to Recovery:</span>
                    <span className="font-medium">{calculateDuration(selectedCycle.low_date, selectedCycle.recovery_date)} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cycle:</span>
                    <span className="font-medium">{calculateDuration(selectedCycle.ath_date, selectedCycle.recovery_date)} days</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Price Changes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>ATH to Low:</span>
                    <span className="font-medium text-red-600">
                      {((selectedCycle.low_price - selectedCycle.ath_price) / selectedCycle.ath_price * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low to Recovery:</span>
                    <span className="font-medium text-green-600">
                      {((selectedCycle.recovery_price - selectedCycle.low_price) / selectedCycle.low_price * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;
