-- Migration: Create historical prices table
-- Date: 2025-01-XX
-- Description: Add comprehensive historical prices table for all NASDAQ stocks

CREATE TABLE IF NOT EXISTS historical_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    date DATE NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_historical_prices_symbol ON historical_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(date);
CREATE INDEX IF NOT EXISTS idx_historical_prices_symbol_date ON historical_prices(symbol, date);
CREATE INDEX IF NOT EXISTS idx_historical_prices_close ON historical_prices(close);

-- Create a view for latest prices (useful for quick symbol validation)
CREATE VIEW IF NOT EXISTS latest_prices AS
SELECT 
    symbol,
    MAX(date) as latest_date,
    close as latest_close,
    volume as latest_volume
FROM historical_prices 
GROUP BY symbol;

-- Create a view for price statistics (useful for analysis)
CREATE VIEW IF NOT EXISTS price_statistics AS
SELECT 
    symbol,
    MIN(date) as first_date,
    MAX(date) as last_date,
    COUNT(*) as total_days,
    MIN(close) as min_close,
    MAX(close) as max_close,
    AVG(close) as avg_close,
    AVG(volume) as avg_volume
FROM historical_prices 
GROUP BY symbol;

-- Create a table to track data freshness
CREATE TABLE IF NOT EXISTS data_freshness (
    symbol TEXT PRIMARY KEY,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_source TEXT DEFAULT 'stooq',
    status TEXT DEFAULT 'active',
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for data freshness
CREATE INDEX IF NOT EXISTS idx_data_freshness_last_updated ON data_freshness(last_updated);
CREATE INDEX IF NOT EXISTS idx_data_freshness_status ON data_freshness(status);
CREATE INDEX IF NOT EXISTS idx_data_freshness_error_count ON data_freshness(error_count);
