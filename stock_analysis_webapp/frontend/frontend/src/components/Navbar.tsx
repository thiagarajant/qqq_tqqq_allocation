import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, BarChart3, TrendingUp, Activity, Home, Calculator } from 'lucide-react'
import { useThreshold } from '../contexts/ThresholdContext'
import { useETF } from '../contexts/ETFContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Cycles', href: '/cycles', icon: TrendingUp },
  { name: 'Simulation', href: '/simulation', icon: Calculator },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { threshold, setThreshold, availableThresholds } = useThreshold()
  const { selectedETF, setSelectedETF, availableETFs, isValidETF, fetchStockData, isLoading } = useETF()
  const [inputValue, setInputValue] = useState(selectedETF)
  const [symbolStatus, setSymbolStatus] = useState<'valid' | 'unknown' | 'invalid' | 'loading'>('valid')

  // Sync input value with selected ETF
  useEffect(() => {
    setInputValue(selectedETF)
  }, [selectedETF])

  // Check symbol status as user types
  useEffect(() => {
    const checkSymbol = async () => {
      if (!inputValue || inputValue === selectedETF) {
        setSymbolStatus('valid')
        return
      }

      const upperSymbol = inputValue.toUpperCase().trim()
      if (!upperSymbol) {
        setSymbolStatus('invalid')
        return
      }

      // Check if already in database by making an API call
      try {
        const response = await fetch(`/api/cycles/5/${upperSymbol}`)
        if (response.ok) {
          setSymbolStatus('valid')
        } else {
          setSymbolStatus('unknown')
        }
      } catch (error) {
        setSymbolStatus('unknown')
      }
    }

    const timeoutId = setTimeout(checkSymbol, 500) // Debounce
    return () => clearTimeout(timeoutId)
  }, [inputValue, selectedETF])

  const handleStockSymbolSubmit = async (symbol: string) => {
    const upperSymbol = symbol.toUpperCase().trim()
    if (!upperSymbol) return

    setSymbolStatus('loading')

    // First check if symbol exists in database
    try {
      const response = await fetch(`/api/cycles/5/${upperSymbol}`)
      if (response.ok) {
        // Symbol exists, select it immediately
        setSelectedETF(upperSymbol)
        setSymbolStatus('valid')
        return
      }
    } catch (error) {
      console.log('Symbol not in database, will try to fetch')
    }

    // Symbol not in database, try to fetch it
    const success = await fetchStockData(upperSymbol)
    if (success) {
      setSelectedETF(upperSymbol)
      setSymbolStatus('valid')
    } else {
      setSymbolStatus('invalid')
    }
  }

  return (
    <nav className="bg-white shadow-medium border-b border-gray-100 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Stock Analysis</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Stock Symbol text input */}
          <div className="hidden md:flex items-center space-x-2">
            <label htmlFor="stock-input" className="text-sm font-medium text-gray-700">
              Symbol:
            </label>
            <div className="relative">
              <input
                id="stock-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                placeholder="Any stock symbol..."
                disabled={symbolStatus === 'loading'}
                className={`input-field w-32 py-1 px-2 text-sm font-mono ${
                  symbolStatus === 'loading' 
                    ? 'bg-gray-100 cursor-wait'
                    : symbolStatus === 'valid'
                    ? 'border-green-300 bg-green-50'
                    : symbolStatus === 'unknown'
                    ? 'border-amber-300 bg-amber-50' 
                    : symbolStatus === 'invalid'
                    ? 'border-red-300 bg-red-50'
                    : ''
                }`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleStockSymbolSubmit(inputValue)
                    e.currentTarget.blur()
                  }
                }}
                onBlur={() => {
                  if (inputValue !== selectedETF) {
                    handleStockSymbolSubmit(inputValue)
                  }
                }}
              />
              {symbolStatus === 'loading' && (
                <div className="absolute -bottom-5 left-0 text-xs text-blue-600">
                  Fetching data...
                </div>
              )}
              {symbolStatus === 'unknown' && (
                <div className="absolute -bottom-5 left-0 text-xs text-amber-600">
                  Press Enter to fetch
                </div>
              )}
              {symbolStatus === 'invalid' && (
                <div className="absolute -bottom-5 left-0 text-xs text-red-600">
                  Symbol not found
                </div>
              )}
            </div>
          </div>

          {/* Threshold text field */}
          <div className="hidden md:flex items-center space-x-2">
            <label htmlFor="threshold-input" className="text-sm font-medium text-gray-700">
              Threshold:
            </label>
            <div className="relative">
              <input
                id="threshold-input"
                type="text"
                value={threshold}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow typing decimal numbers
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0.25 && numValue <= 30) {
                      setThreshold(numValue);
                    } else if (value === '') {
                      // Allow empty for editing
                    } else {
                      // Keep current value if invalid
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '' || isNaN(parseFloat(value))) {
                    // Reset to default if empty or invalid
                    setThreshold(5);
                  } else {
                    const numValue = parseFloat(value);
                    if (numValue < 0.25) {
                      setThreshold(0.25);
                    } else if (numValue > 30) {
                      setThreshold(30);
                    } else {
                      setThreshold(numValue);
                    }
                  }
                }}
                placeholder="5.0"
                className="input-field w-16 py-1 px-2 text-sm text-center font-mono"
              />
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                %
              </span>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-600 hover:text-gray-900 p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Mobile threshold text field */}
            <div className="pt-4 border-t border-gray-200">
              <label htmlFor="mobile-threshold" className="block text-sm font-medium text-gray-700 mb-2">
                Drawdown Threshold (%)
              </label>
              <div className="relative">
                <input
                  id="mobile-threshold"
                  type="text"
                  value={threshold}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow typing decimal numbers
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0.25 && numValue <= 30) {
                        setThreshold(numValue);
                      } else if (value === '') {
                        // Allow empty for editing
                      } else {
                        // Keep current value if invalid
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseFloat(value))) {
                      // Reset to default if empty or invalid
                      setThreshold(5);
                    } else {
                      const numValue = parseFloat(value);
                      if (numValue < 0.25) {
                        setThreshold(0.25);
                      } else if (numValue > 30) {
                        setThreshold(30);
                      } else {
                        setThreshold(numValue);
                      }
                    }
                  }}
                  placeholder="5.0"
                  className="input-field w-full pr-8 text-center font-mono"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Range: 0.25% to 30% (e.g., 5.0, 10.5, 20)
              </p>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
