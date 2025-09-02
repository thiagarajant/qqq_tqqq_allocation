# Database - Stock Market Analysis SQLite Database

## 🎯 **Overview**

The database component provides a robust, file-based SQLite3 database system designed for high-performance stock market analysis. It features optimized schemas, comprehensive indexing, and efficient data storage for historical price data and symbol metadata.

## 🏗️ **Architecture**

### **Database Engine**
- **Type**: SQLite3 (file-based, serverless)
- **Version**: SQLite 3.x with full-text search support
- **Storage**: Single file database with journaling
- **Concurrency**: Read-write access with proper locking

### **Key Features**
- **High Performance**: Optimized indexes and views
- **Data Integrity**: ACID compliance and constraints
- **Scalability**: Efficient handling of large datasets
- **Portability**: Single file that can be easily backed up
- **Real-time Access**: Direct file access for fast queries

## 📁 **Database Structure**

### **File Organization**
```
database/
├── market_data.db              # Main database file (4.5GB+)
├── market_data_backup.db       # Backup database (189MB)
└── 📁 migrations/              # Database schema migrations
    ├── 004_create_symbols_table.sql
    └── 005_create_historical_prices_table.sql
```

### **Database Files**
- **`market_data.db`**: Primary database with all data
- **`market_data_backup.db`**: Compressed backup for recovery
- **Migration Files**: SQL scripts for schema evolution

## 🗄️ **Schema Design**

### **Core Tables**

#### **1. Symbols Table (`symbols`)**
```sql
CREATE TABLE symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    sector TEXT,
    market_cap TEXT,
    exchange TEXT DEFAULT 'NASDAQ',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Central repository for all stock symbols and metadata
**Data Types**:
- **symbol**: Stock ticker symbol (e.g., AAPL, QQQ)
- **name**: Company or fund name
- **sector**: Business sector classification
- **market_cap**: Market capitalization category
- **exchange**: Trading exchange (default: NASDAQ)
- **is_active**: Whether symbol is currently active

**Sample Data**:
```sql
-- Major ETFs
('QQQ', 'Invesco QQQ Trust', 'ETF', 'ETF', 'NASDAQ', 1)
('TQQQ', 'ProShares UltraPro QQQ', 'ETF', 'ETF', 'NASDAQ', 1)
('SQQQ', 'ProShares UltraPro Short QQQ', 'ETF', 'ETF', 'NASDAQ', 1)

-- Top Tech Companies
('NVDA', 'NVIDIA Corporation', 'Technology', 'Large Cap', 'NASDAQ', 1)
('MSFT', 'Microsoft Corporation', 'Technology', 'Large Cap', 'NASDAQ', 1)
('AAPL', 'Apple Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1)
```

#### **2. Historical Prices Table (`historical_prices`)**
```sql
CREATE TABLE historical_prices (
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
```

**Purpose**: Stores daily OHLCV (Open, High, Low, Close, Volume) price data
**Data Types**:
- **symbol**: Reference to symbols table
- **date**: Trading date (YYYY-MM-DD format)
- **open**: Opening price for the day
- **high**: Highest price during the day
- **low**: Lowest price during the day
- **close**: Closing price for the day
- **volume**: Number of shares traded

**Constraints**:
- **UNIQUE(symbol, date)**: Prevents duplicate entries for same symbol/date
- **NOT NULL**: Essential fields cannot be empty

#### **3. Data Freshness Table (`data_freshness`)**
```sql
CREATE TABLE data_freshness (
    symbol TEXT PRIMARY KEY,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_source TEXT DEFAULT 'stooq',
    status TEXT DEFAULT 'active',
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Tracks data update status, sources, and error handling
**Data Types**:
- **symbol**: Reference to symbols table
- **last_updated**: Timestamp of last successful update
- **data_source**: Source of the data (e.g., 'stooq', 'api')
- **status**: Current status ('active', 'inactive', 'error')
- **error_count**: Number of consecutive update failures
- **last_error**: Description of last error encountered

### **Database Views**

#### **1. Latest Prices View (`latest_prices`)**
```sql
CREATE VIEW latest_prices AS
SELECT 
    symbol,
    MAX(date) as latest_date,
    close as latest_close,
    volume as latest_volume
FROM historical_prices 
GROUP BY symbol;
```

**Purpose**: Quick access to most recent price data for each symbol
**Usage**: Efficient queries for current market prices without complex joins

#### **2. Price Statistics View (`price_statistics`)**
```sql
CREATE VIEW price_statistics AS
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
```

**Purpose**: Pre-computed statistics for performance analysis
**Benefits**: Eliminates need for expensive aggregations on every query

## 🔍 **Indexing Strategy**

### **Primary Indexes**

#### **Symbols Table Indexes**
```sql
-- Fast symbol lookups
CREATE INDEX idx_symbols_symbol ON symbols(symbol);

-- Sector-based filtering
CREATE INDEX idx_symbols_sector ON symbols(sector);

-- Market cap filtering
CREATE INDEX idx_symbols_market_cap ON symbols(market_cap);

-- Exchange filtering
CREATE INDEX idx_symbols_exchange ON symbols(exchange);

-- Active symbol filtering
CREATE INDEX idx_symbols_active ON symbols(is_active);
```

#### **Historical Prices Table Indexes**
```sql
-- Symbol-based queries
CREATE INDEX idx_historical_prices_symbol ON historical_prices(symbol);

-- Date-based queries
CREATE INDEX idx_historical_prices_date ON historical_prices(date);

-- Composite symbol+date queries (most common)
CREATE INDEX idx_historical_prices_symbol_date ON historical_prices(symbol, date);

-- Price-based queries
CREATE INDEX idx_historical_prices_close ON historical_prices(close);
```

#### **Data Freshness Table Indexes**
```sql
-- Update time queries
CREATE INDEX idx_data_freshness_last_updated ON data_freshness(last_updated);

-- Status filtering
CREATE INDEX idx_data_freshness_status ON data_freshness(status);

-- Error tracking
CREATE INDEX idx_data_freshness_error_count ON data_freshness(error_count);
```

### **Index Performance Benefits**
- **Symbol Lookups**: O(log n) instead of O(n) for symbol searches
- **Date Range Queries**: Fast filtering by date ranges
- **Price Analysis**: Efficient price-based filtering and sorting
- **Status Queries**: Quick filtering by data freshness status

## 📊 **Data Population & Management**

### **Initial Data Population**

#### **Symbol Data Sources**
1. **Major ETFs**: QQQ, TQQQ, SQQQ, SPY, VTI, VOO, ARKK, IWM
2. **Top Tech Companies**: NVDA, MSFT, AAPL, GOOG, AMZN, META
3. **Healthcare Leaders**: AZN, REGN, BIIB, VRTX, ILMN, DXCM
4. **Financial Services**: CME, ADP, PAYX, BKNG
5. **Consumer Companies**: COST, PEP, ORLY, MNST, MAR

#### **Data Population Strategy**
```javascript
// Automatic population on server startup
console.log('🚀 Starting US symbols population in 2 seconds...');
console.log('💡 To skip population, use: SKIP_POPULATION=true npm start');

// Population process
1. Check existing symbols
2. Insert new symbols with INSERT OR IGNORE
3. Update existing symbols if needed
4. Create necessary indexes
5. Validate data integrity
```

### **Historical Data Management**

#### **Data Sources**
- **Primary**: Uploaded CSV/TXT files via Admin interface
- **Coverage**: NASDAQ stocks + Major ETFs
- **Frequency**: Daily updates during market hours

#### **Data Quality Assurance**
```sql
-- Data validation queries
SELECT COUNT(*) as total_symbols FROM symbols WHERE is_active = 1;
SELECT COUNT(*) as total_prices FROM historical_prices;
SELECT COUNT(DISTINCT symbol) as symbols_with_data FROM historical_prices;

-- Data freshness check
SELECT 
    symbol,
    last_updated,
    status,
    error_count
FROM data_freshness 
WHERE status != 'active' OR error_count > 0;
```

## 🔄 **Migration System**

### **Migration Files**

#### **004_create_symbols_table.sql**
- **Purpose**: Create symbols table with initial data
- **Date**: January 2025
- **Features**: 
  - Table creation with proper constraints
  - Index creation for performance
  - Initial symbol data population
  - Data validation and integrity checks

#### **005_create_historical_prices_table.sql**
- **Purpose**: Create historical prices table and related views
- **Date**: January 2025
- **Features**:
  - Historical prices table creation
  - Performance views for common queries
  - Data freshness tracking table
  - Comprehensive indexing strategy

### **Migration Process**
```bash
# Apply migrations manually
sqlite3 market_data.db < migrations/004_create_symbols_table.sql
sqlite3 market_data.db < migrations/005_create_historical_prices_table.sql

# Check migration status
sqlite3 market_data.db ".schema"
sqlite3 market_data.db "SELECT name FROM sqlite_master WHERE type='table';"
```

## 🚀 **Performance Optimization**

### **Query Optimization**

#### **Efficient Symbol Search**
```sql
-- Optimized symbol search with limit
SELECT symbol, name, sector, market_cap 
FROM symbols 
WHERE is_active = 1 
  AND (symbol LIKE ? OR name LIKE ?)
ORDER BY 
  CASE WHEN symbol LIKE ? THEN 1 ELSE 2 END,
  symbol
LIMIT 20;
```

#### **Fast Price Data Retrieval**
```sql
-- Optimized price data query
SELECT date, open, high, low, close, volume
FROM historical_prices 
WHERE symbol = ? 
  AND date BETWEEN ? AND ?
ORDER BY date;
```

#### **Efficient Statistics Calculation**
```sql
-- Use pre-computed view for statistics
SELECT * FROM price_statistics WHERE symbol = ?;

-- Instead of expensive aggregation
SELECT 
    MIN(date), MAX(date), COUNT(*), 
    MIN(close), MAX(close), AVG(close)
FROM historical_prices 
WHERE symbol = ?;
```

### **Database Optimization**

#### **VACUUM and ANALYZE**
```sql
-- Reclaim unused space
VACUUM;

-- Update statistics for query optimizer
ANALYZE;

-- Optimize indexes
REINDEX;
```

#### **WAL Mode (Write-Ahead Logging)**
```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Optimize WAL settings
PRAGMA wal_autocheckpoint = 1000;
PRAGMA synchronous = NORMAL;
```

## 🔒 **Data Security & Integrity**

### **Data Validation**

#### **Constraint Enforcement**
```sql
-- Ensure data integrity
PRAGMA foreign_keys = ON;
PRAGMA check_same_thread = OFF;

-- Validate symbol references
SELECT COUNT(*) FROM historical_prices hp
LEFT JOIN symbols s ON hp.symbol = s.symbol
WHERE s.symbol IS NULL;
```

#### **Data Consistency Checks**
```sql
-- Check for orphaned price data
SELECT DISTINCT symbol FROM historical_prices 
WHERE symbol NOT IN (SELECT symbol FROM symbols WHERE is_active = 1);

-- Validate date ranges
SELECT symbol, MIN(date), MAX(date) 
FROM historical_prices 
GROUP BY symbol 
HAVING MIN(date) < '1990-01-01' OR MAX(date) > DATE('now');
```

### **Backup Strategy**

#### **Automated Backups**
```bash
# Create compressed backup
sqlite3 market_data.db ".backup 'market_data_backup_$(date +%Y%m%d).db'"

# Compress backup file
gzip market_data_backup_$(date +%Y%m%d).db

# Clean old backups (keep last 7 days)
find . -name "market_data_backup_*.db.gz" -mtime +7 -delete
```

#### **Backup Verification**
```bash
# Verify backup integrity
sqlite3 market_data_backup.db "PRAGMA integrity_check;"

# Compare table counts
echo "Original DB:"; sqlite3 market_data.db "SELECT COUNT(*) FROM symbols;"
echo "Backup DB:"; sqlite3 market_data_backup.db "SELECT COUNT(*) FROM symbols;"
```

## 📊 **Monitoring & Maintenance**

### **Database Health Monitoring**

#### **Size and Growth Tracking**
```sql
-- Database size information
SELECT 
    page_count * page_size as size_bytes,
    page_count * page_size / 1024 / 1024 as size_mb
FROM pragma_page_count(), pragma_page_size();

-- Table sizes
SELECT 
    name,
    sqlite_compileoption_get('ENABLE_DBSTAT_VTAB') as dbstat_enabled
FROM sqlite_master 
WHERE type = 'table';
```

#### **Performance Metrics**
```sql
-- Query performance statistics
SELECT 
    sql,
    calls,
    total_time,
    avg_time
FROM sqlite_stat1;

-- Index usage statistics
SELECT 
    name,
    stat
FROM sqlite_stat1 
WHERE name LIKE 'idx_%';
```

### **Maintenance Tasks**

#### **Regular Maintenance Schedule**
```bash
# Daily: Check data freshness
sqlite3 market_data.db "SELECT COUNT(*) FROM data_freshness WHERE status != 'active';"

# Weekly: Update statistics
sqlite3 market_data.db "ANALYZE;"

# Monthly: Full optimization
sqlite3 market_data.db "VACUUM; REINDEX;"
```

#### **Data Cleanup**
```sql
-- Remove old error records
DELETE FROM data_freshness 
WHERE error_count > 10 AND last_updated < DATE('now', '-30 days');

-- Archive old price data (if needed)
-- CREATE TABLE historical_prices_archive AS 
-- SELECT * FROM historical_prices WHERE date < DATE('now', '-5 years');
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Database Locked**
```bash
# Check for other processes
lsof market_data.db

# Kill locking processes
kill -9 <PID>

# Check WAL mode
sqlite3 market_data.db "PRAGMA journal_mode;"
```

#### **Corrupted Database**
```bash
# Check integrity
sqlite3 market_data.db "PRAGMA integrity_check;"

# Recover from backup
cp market_data_backup.db market_data.db

# Rebuild indexes
sqlite3 market_data.db "REINDEX;"
```

#### **Performance Issues**
```sql
-- Check index usage
EXPLAIN QUERY PLAN SELECT * FROM historical_prices WHERE symbol = 'AAPL';

-- Analyze query performance
SELECT sql, calls, total_time FROM sqlite_stat1 WHERE sql LIKE '%AAPL%';
```

### **Recovery Procedures**

#### **Data Recovery**
```bash
# Extract data from corrupted database
sqlite3 market_data.db ".dump" > recovery.sql

# Recreate database
sqlite3 market_data_new.db < recovery.sql

# Verify data integrity
sqlite3 market_data_new.db "PRAGMA integrity_check;"
```

#### **Index Rebuilding**
```sql
-- Drop and recreate all indexes
DROP INDEX IF EXISTS idx_symbols_symbol;
DROP INDEX IF EXISTS idx_historical_prices_symbol_date;

-- Recreate indexes
CREATE INDEX idx_symbols_symbol ON symbols(symbol);
CREATE INDEX idx_historical_prices_symbol_date ON historical_prices(symbol, date);
```

## 📚 **Additional Resources**

- **SQLite Documentation**: https://www.sqlite.org/docs.html
- **SQLite Performance**: https://www.sqlite.org/optoverview.html
- **Database Design**: https://www.sqlite.org/foreignkeys.html
- **WAL Mode**: https://www.sqlite.org/wal.html

---

**Database Status**: ✅ **FULLY OPERATIONAL**  
**Last Updated**: August 2025  
**Version**: 1.5.0  
**Size**: Variable (supports dynamic data management)
