import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, BarChart3, TrendingUp, Activity, Home } from 'lucide-react'
import { useThreshold } from '../contexts/ThresholdContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Analysis', href: '/analysis', icon: Activity },
  { name: 'Cycles', href: '/cycles', icon: TrendingUp },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { threshold, setThreshold, availableThresholds } = useThreshold()

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

          {/* Threshold selector */}
          <div className="hidden md:flex items-center space-x-4">
            <label htmlFor="threshold-select" className="text-sm font-medium text-gray-700">
              Threshold:
            </label>
            <select
              id="threshold-select"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="input-field w-24 py-1 px-2 text-sm"
            >
              {availableThresholds.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
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
            
            {/* Mobile threshold selector */}
            <div className="pt-4 border-t border-gray-200">
              <label htmlFor="mobile-threshold" className="block text-sm font-medium text-gray-700 mb-2">
                Drawdown Threshold
              </label>
              <select
                id="mobile-threshold"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="input-field w-full"
              >
                {availableThresholds.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} - {t.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
