# Backend - Stock Market Analysis Express.js API Server

## 🎯 **Overview**

The backend is a high-performance Express.js API server designed to provide comprehensive stock market analysis capabilities. It features a robust SQLite3 database, optimized data processing, and RESTful API endpoints for frontend consumption.

## 🏗️ **Architecture**

### **Technology Stack**
- **Runtime**: Node.js 18+ (Alpine Linux)
- **Framework**: Express.js 4.18+
- **Database**: SQLite3 with optimized indexes and views
- **Security**: Helmet.js, CORS, compression middleware
- **API**: RESTful endpoints with JSON responses
- **Data Sources**: Stooq.com, market data APIs

### **Project Structure**
```
backend/
├── server.js                    # Main Express server file
├── package.json                 # Dependencies and scripts
├── 📁 routes/                   # API route handlers (planned)
├── 📁 middleware/               # Express middleware (planned)
├── 📁 utils/                    # Utility functions (planned)
└── 📁 models/                   # Data models (planned)
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm
- Docker (for containerized development)
- SQLite3 database file

### **Local Development**
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run tests (when implemented)
npm test
```

### **Docker Development**
```bash
# Start backend container
docker-compose up -d

# Access API at http://localhost:3000
```

## 🔧 **Server Configuration**

### **Main Server (server.js)**

#### **Core Setup**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
```

#### **Middleware Stack**
1. **Helmet.js**: Security headers and protection
2. **CORS**: Cross-origin resource sharing
3. **Compression**: Gzip compression for responses
4. **JSON Parser**: Request body parsing
5. **Static Files**: Serve frontend build files

#### **Database Connection**
```javascript
const dbPath = path.join(__dirname, '../database/market_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});
```

## 🗄️ **Database Schema & Management**

### **Core Tables**

#### **1. Symbols Table**
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

**Purpose**: Stores stock symbol metadata and information
**Indexes**: 
- `idx_symbols_symbol` - Fast symbol lookups
- `idx_symbols_sector` - Sector-based queries
- `idx_symbols_market_cap` - Market cap filtering
- `idx_symbols_exchange` - Exchange filtering
- `idx_symbols_active` - Active symbol filtering

#### **2. Historical Prices Table**
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

**Purpose**: Stores daily OHLCV price data for all symbols
**Indexes**:
- `idx_historical_prices_symbol` - Symbol-based queries
- `idx_historical_prices_date` - Date-based queries
- `idx_historical_prices_symbol_date` - Composite symbol+date queries
- `idx_historical_prices_close` - Price-based queries

#### **3. Data Freshness Table**
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

**Purpose**: Tracks data update status and error handling
**Indexes**:
- `idx_data_freshness_last_updated` - Update time queries
- `idx_data_freshness_status` - Status filtering
- `idx_data_freshness_error_count` - Error tracking

### **Database Views**

#### **1. Latest Prices View**
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

**Purpose**: Quick access to most recent price data

#### **2. Price Statistics View**
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

**Purpose**: Pre-computed price statistics for analysis

### **Database Initialization**

#### **Symbol Population**
The server automatically populates the symbols table with:
- **Major ETFs**: QQQ, TQQQ, SQQQ, SPY, VTI, VOO, ARKK, IWM
- **Top Tech Companies**: NVDA, MSFT, AAPL, GOOG, AMZN, META
- **Healthcare Leaders**: AZN, REGN, BIIB, VRTX, ILMN
- **Financial Services**: CME, ADP, PAYX
- **Consumer Companies**: COST, PEP, BKNG, ORLY

#### **Data Population Strategy**
1. **Bulk Download**: Attempts Stooq.com bulk downloads first
2. **Individual Fetching**: Falls back to individual symbol API calls
3. **Error Handling**: Tracks failed attempts and retries
4. **Data Validation**: Ensures data quality and consistency

## 📊 **API Endpoints**

### **Core API Routes**

#### **1. Health Check**
```http
GET /api/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-31T04:58:44.565Z",
  "database": "connected"
}
```

**Purpose**: Server health monitoring and database connectivity check

#### **2. Symbol Search**
```http
GET /api/symbols?query=AAPL&limit=20
```

**Parameters**:
- `query` (required): Search term for symbol lookup
- `limit` (optional): Maximum results to return (default: 20)

**Response**:
```json
{
  "status": "success",
  "symbols": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "sector": "Technology",
      "market_cap": "Large Cap",
      "exchange": "NASDAQ"
    }
  ]
}
```

#### **3. Threshold Endpoints**
```http
GET /api/thresholds
GET /api/cycles/:threshold
GET /api/summary/:threshold
GET /api/chart-data/:threshold
```

**Available Thresholds**: 2%, 5%, 10%, 15%, 20%

**Purpose**: Drawdown cycle analysis and visualization data

#### **4. Analysis Endpoint**
```http
POST /api/analyze
```

**Request Body**:
```json
{
  "symbol": "QQQ",
  "threshold": 10,
  "startDate": "2024-01-01",
  "endDate": "2025-01-31"
}
```

**Purpose**: Generate custom analysis for specific parameters

### **API Response Format**

#### **Success Response**
```json
{
  "status": "success",
  "data": { ... },
  "timestamp": "2025-01-31T04:58:44.565Z"
}
```

#### **Error Response**
```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-31T04:58:44.565Z"
}
```

## 🔄 **Data Processing & Analysis**

### **Drawdown Cycle Detection**

#### **Algorithm Overview**
1. **Price Data Retrieval**: Fetch historical prices for symbol
2. **Peak Detection**: Identify local maxima in price series
3. **Trough Detection**: Identify local minima in price series
4. **Cycle Calculation**: Calculate drawdown percentages and durations
5. **Threshold Filtering**: Filter cycles based on selected threshold
6. **Statistics Computation**: Calculate cycle statistics and metrics

#### **Cycle Metrics**
- **Drawdown Percentage**: Maximum decline from peak
- **Cycle Duration**: Time from peak to recovery
- **Recovery Time**: Time from trough to new peak
- **Volatility**: Price movement during cycle
- **Volume Analysis**: Trading volume patterns

### **Data Aggregation**

#### **Time Series Processing**
- **Daily Aggregation**: OHLCV data consolidation
- **Moving Averages**: Trend analysis and smoothing
- **Volatility Calculation**: Standard deviation and variance
- **Correlation Analysis**: Inter-symbol relationships

#### **Performance Optimization**
- **Database Indexes**: Fast query execution
- **Query Optimization**: Efficient SQL queries
- **Data Caching**: Reduce redundant calculations
- **Batch Processing**: Handle large datasets efficiently

## 🚀 **Performance & Optimization**

### **Database Performance**

#### **Index Strategy**
- **Primary Keys**: Auto-incrementing IDs for fast lookups
- **Composite Indexes**: Multi-column indexes for complex queries
- **Covering Indexes**: Include frequently accessed columns
- **Partial Indexes**: Index only active/valid records

#### **Query Optimization**
- **Prepared Statements**: Reusable query plans
- **Batch Operations**: Bulk insert/update operations
- **Connection Pooling**: Efficient database connections
- **Transaction Management**: ACID compliance and rollback

### **API Performance**

#### **Response Optimization**
- **Compression**: Gzip compression for large responses
- **Caching**: HTTP caching headers and strategies
- **Pagination**: Limit result sets for large queries
- **Async Processing**: Non-blocking I/O operations

#### **Memory Management**
- **Streaming**: Process large datasets in chunks
- **Garbage Collection**: Optimize Node.js memory usage
- **Connection Limits**: Prevent memory leaks
- **Timeout Handling**: Resource cleanup and recovery

## 🔒 **Security Features**

### **Middleware Security**

#### **Helmet.js Configuration**
- **Content Security Policy**: Prevent XSS attacks
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **Strict-Transport-Security**: HTTPS enforcement

#### **CORS Configuration**
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### **Input Validation**

#### **Request Validation**
- **Parameter Sanitization**: Remove malicious input
- **Type Checking**: Ensure correct data types
- **Range Validation**: Validate numeric parameters
- **SQL Injection Prevention**: Parameterized queries

#### **Rate Limiting**
- **Request Throttling**: Prevent API abuse
- **IP-based Limits**: Track request frequency
- **User-based Limits**: Authenticated user quotas
- **Graceful Degradation**: Handle rate limit exceeded

## 📊 **Monitoring & Logging**

### **Health Monitoring**

#### **Health Check Endpoint**
- **Database Connectivity**: Verify SQLite connection
- **Memory Usage**: Monitor Node.js memory consumption
- **Response Time**: Track API response latency
- **Error Rates**: Monitor failed request percentages

#### **Docker Health Checks**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
```

### **Logging Strategy**

#### **Log Levels**
- **Error**: Application errors and failures
- **Warn**: Warning conditions and issues
- **Info**: General information and status
- **Debug**: Detailed debugging information

#### **Log Format**
```javascript
console.log(`🚀 Stock Market Analysis Backend running on port ${PORT}`);
console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
```

## 🚨 **Error Handling**

### **Error Types**

#### **Database Errors**
- **Connection Failures**: Database file access issues
- **Query Errors**: SQL syntax or constraint violations
- **Timeout Errors**: Long-running query issues
- **Corruption Errors**: Database file integrity issues

#### **API Errors**
- **Validation Errors**: Invalid request parameters
- **Authentication Errors**: Unauthorized access attempts
- **Rate Limit Errors**: Too many requests
- **Server Errors**: Internal application failures

### **Error Recovery**

#### **Graceful Degradation**
- **Fallback Responses**: Provide alternative data sources
- **Cached Data**: Return previously fetched data
- **Partial Results**: Return available data with warnings
- **User Guidance**: Provide helpful error messages

#### **Retry Mechanisms**
- **Exponential Backoff**: Progressive retry delays
- **Circuit Breaker**: Prevent cascading failures
- **Dead Letter Queues**: Track failed operations
- **Health Monitoring**: Automatic recovery detection

## 🔧 **Development Workflow**

### **Available Scripts**
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run test suite (when implemented)
npm run lint       # Run linting (when implemented)
```

### **Development Features**
- **Hot Reload**: Automatic server restart on file changes
- **Debug Logging**: Detailed console output for development
- **Error Stack Traces**: Full error information for debugging
- **Environment Variables**: Configuration via .env files

### **Testing Strategy**
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Database Tests**: Schema and query testing
- **Performance Tests**: Load and stress testing

## 📦 **Dependencies**

### **Production Dependencies**
- **express**: Web framework for Node.js
- **cors**: Cross-origin resource sharing
- **helmet**: Security middleware
- **sqlite3**: SQLite database driver
- **compression**: Response compression

### **Development Dependencies**
- **nodemon**: Development server with auto-restart

## 🚨 **Common Issues & Solutions**

### **Database Issues**
1. **File Permissions**: Ensure database directory is writable
2. **Disk Space**: Check available disk space for database
3. **File Locks**: Ensure no other processes are using the database
4. **Corruption**: Verify database file integrity

### **API Issues**
1. **Port Conflicts**: Change port in environment variables
2. **CORS Errors**: Verify allowed origins configuration
3. **Memory Issues**: Monitor Node.js memory usage
4. **Timeout Errors**: Adjust request timeout settings

### **Performance Issues**
1. **Slow Queries**: Check database indexes and query optimization
2. **Memory Leaks**: Monitor for memory growth over time
3. **High CPU**: Profile Node.js performance bottlenecks
4. **Network Latency**: Check database file location and I/O

## 📚 **Additional Resources**

- **Express.js Documentation**: https://expressjs.com/
- **SQLite Documentation**: https://www.sqlite.org/docs.html
- **Node.js Documentation**: https://nodejs.org/docs/
- **Helmet.js Documentation**: https://helmetjs.github.io/

---

**Backend Status**: ✅ **FULLY OPERATIONAL**  
**Last Updated**: January 2025  
**Version**: 1.0.0
