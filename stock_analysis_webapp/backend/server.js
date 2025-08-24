const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Database connection
const dbPath = path.join(__dirname, '../database/market_data.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Create symbols table if it doesn't exist
    const createSymbolsTable = `
      CREATE TABLE IF NOT EXISTS symbols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        sector TEXT,
        market_cap TEXT,
        exchange TEXT DEFAULT 'NASDAQ',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createSymbolsIndexes = `
      CREATE INDEX IF NOT EXISTS idx_symbols_symbol ON symbols(symbol);
      CREATE INDEX IF NOT EXISTS idx_symbols_sector ON symbols(sector);
      CREATE INDEX IF NOT EXISTS idx_symbols_market_cap ON symbols(market_cap);
      CREATE INDEX IF NOT EXISTS idx_symbols_exchange ON symbols(exchange);
      CREATE INDEX IF NOT EXISTS idx_symbols_active ON symbols(is_active);
    `;
    
    db.serialize(() => {
      // Create symbols table
      db.run(createSymbolsTable, (err) => {
        if (err) {
          console.error('Error creating symbols table:', err.message);
        } else {
          console.log('Symbols table ready');
          
          // Always insert initial symbols data
          console.log('Populating symbols table with initial data...');
              
              const insertSymbols = `
                INSERT OR IGNORE INTO symbols (symbol, name, sector, market_cap, exchange, is_active) VALUES
                ('QQQ', 'Invesco QQQ Trust', 'ETF', 'ETF', 'NASDAQ', 1),
                ('TQQQ', 'ProShares UltraPro QQQ', 'ETF', 'ETF', 'NASDAQ', 1),
                ('SQQQ', 'ProShares UltraPro Short QQQ', 'ETF', 'ETF', 'NASDAQ', 1),
                ('SPY', 'SPDR S&P 500 ETF Trust', 'ETF', 'ETF', 'NASDAQ', 1),
                ('VTI', 'Vanguard Total Stock Market ETF', 'ETF', 'ETF', 'NASDAQ', 1),
                ('VOO', 'Vanguard S&P 500 ETF', 'ETF', 'ETF', 'NASDAQ', 1),
                ('ARKK', 'ARK Innovation ETF', 'ETF', 'ETF', 'NASDAQ', 1),
                ('IWM', 'iShares Russell 2000 ETF', 'ETF', 'ETF', 'NASDAQ', 1),
                ('NVDA', 'NVIDIA Corporation', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('MSFT', 'Microsoft Corporation', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('AAPL', 'Apple Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('GOOG', 'Alphabet Inc. (Class C)', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('GOOGL', 'Alphabet Inc. (Class A)', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('AMZN', 'Amazon.com Inc.', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('META', 'Meta Platforms Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('AVGO', 'Broadcom Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('TSLA', 'Tesla Inc.', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('NFLX', 'Netflix Inc.', 'Communication Services', 'Large Cap', 'NASDAQ', 1),
                ('COST', 'Costco Wholesale Corporation', 'Consumer Staples', 'Large Cap', 'NASDAQ', 1),
                ('PLTR', 'Palantir Technologies Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('ASML', 'ASML Holding N.V.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('AMD', 'Advanced Micro Devices Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('TMUS', 'T-Mobile US Inc.', 'Communication Services', 'Large Cap', 'NASDAQ', 1),
                ('CSCO', 'Cisco Systems Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('AZN', 'AstraZeneca PLC', 'Healthcare', 'Large Cap', 'NASDAQ', 1),
                ('LIN', 'Linde plc', 'Materials', 'Large Cap', 'NASDAQ', 1),
                ('PEP', 'PepsiCo Inc.', 'Consumer Staples', 'Large Cap', 'NASDAQ', 1),
                ('INTU', 'Intuit Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('SHOP', 'Shopify Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('TXN', 'Texas Instruments Incorporated', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('BKNG', 'Booking Holdings Inc.', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('ISRG', 'Intuitive Surgical Inc.', 'Healthcare', 'Large Cap', 'NASDAQ', 1),
                ('QCOM', 'QUALCOMM Incorporated', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('PDD', 'PDD Holdings Inc.', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('AMGN', 'Amgen Inc.', 'Healthcare', 'Large Cap', 'NASDAQ', 1),
                ('ADBE', 'Adobe Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('APP', 'AppLovin Corporation', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('ARM', 'Arm Holdings plc', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('GILD', 'Gilead Sciences Inc.', 'Healthcare', 'Large Cap', 'NASDAQ', 1),
                ('HON', 'Honeywell International Inc.', 'Industrials', 'Large Cap', 'NASDAQ', 1),
                ('MU', 'Micron Technology Inc.', 'Technology', 'Large Cap', 'NASDAQ', 1),
                ('SE', 'Sea Limited', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('F', 'Ford Motor Company', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('GM', 'General Motors Company', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('JPM', 'JPMorgan Chase & Co.', 'Financial Services', 'Large Cap', 'NASDAQ', 1),
                ('BAC', 'Bank of America Corporation', 'Financial Services', 'Large Cap', 'NASDAQ', 1),
                ('WFC', 'Wells Fargo & Company', 'Financial Services', 'Large Cap', 'NASDAQ', 1),
                ('GS', 'Goldman Sachs Group Inc.', 'Financial Services', 'Large Cap', 'NASDAQ', 1),
                ('MS', 'Morgan Stanley', 'Financial Services', 'Large Cap', 'NASDAQ', 1),
                ('V', 'Visa Inc.', 'Financial Services', 'Large Cap', 'NASDAQ', 1),
                ('MA', 'Mastercard Incorporated', 'Financial Services', 'Large Cap', 'NASDAQ', 1),
                ('JNJ', 'Johnson & Johnson', 'Healthcare', 'Large Cap', 'NASDAQ', 1),
                ('PFE', 'Pfizer Inc.', 'Healthcare', 'Large Cap', 'NASDAQ', 1),
                ('UNH', 'UnitedHealth Group Incorporated', 'Healthcare', 'Large Cap', 'NASDAQ', 1),
                ('WMT', 'Walmart Inc.', 'Consumer Staples', 'Large Cap', 'NASDAQ', 1),
                ('HD', 'The Home Depot Inc.', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('MCD', 'McDonald''s Corporation', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('SBUX', 'Starbucks Corporation', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('NKE', 'NIKE Inc.', 'Consumer Discretionary', 'Large Cap', 'NASDAQ', 1),
                ('CAT', 'Caterpillar Inc.', 'Industrials', 'Large Cap', 'NASDAQ', 1),
                ('DE', 'Deere & Company', 'Industrials', 'Large Cap', 'NASDAQ', 1),
                ('BA', 'Boeing Company', 'Industrials', 'Large Cap', 'NASDAQ', 1),
                ('GE', 'General Electric Company', 'Industrials', 'Large Cap', 'NASDAQ', 1),
                ('DIS', 'The Walt Disney Company', 'Communication Services', 'Large Cap', 'NASDAQ', 1),
                ('CMCSA', 'Comcast Corporation', 'Communication Services', 'Large Cap', 'NASDAQ', 1),
                ('VZ', 'Verizon Communications Inc.', 'Communication Services', 'Large Cap', 'NASDAQ', 1),
                ('T', 'AT&T Inc.', 'Communication Services', 'Large Cap', 'NASDAQ', 1)
              `;
              
              db.run('BEGIN TRANSACTION');
              db.run(insertSymbols, (err) => {
                if (err) {
                  console.error('Error inserting initial symbols:', err.message);
                  db.run('ROLLBACK');
                } else {
                  console.log('Initial symbols data inserted successfully');
                  db.run('COMMIT');
                }
              });
        }
      });
      
      // Create indexes
      db.run(createSymbolsIndexes, (err) => {
        if (err) {
          console.error('Error creating symbols indexes:', err.message);
        } else {
          console.log('Symbols indexes ready');
        }
      });
      
      // Create historical prices table
      const createHistoricalPricesTable = `
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
        )
      `;
      
      const createHistoricalIndexes = `
        CREATE INDEX IF NOT EXISTS idx_historical_prices_symbol ON historical_prices(symbol);
        CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(date);
        CREATE INDEX IF NOT EXISTS idx_historical_prices_symbol_date ON historical_prices(symbol, date);
        CREATE INDEX IF NOT EXISTS idx_historical_prices_close ON historical_prices(close);
      `;
      
      db.run(createHistoricalPricesTable, (err) => {
        if (err) {
          console.error('Error creating historical prices table:', err.message);
        } else {
          console.log('Historical prices table ready');
          
          // Create indexes
          db.run(createHistoricalIndexes, (err) => {
            if (err) {
              console.error('Error creating historical indexes:', err.message);
            } else {
              console.log('Historical indexes ready');
            }
          });
        }
      });
      
      // Create data freshness table
      const createDataFreshnessTable = `
        CREATE TABLE IF NOT EXISTS data_freshness (
          symbol TEXT PRIMARY KEY,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          data_source TEXT DEFAULT 'stooq',
          status TEXT DEFAULT 'active',
          error_count INTEGER DEFAULT 0,
          last_error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      const createFreshnessIndexes = `
        CREATE INDEX IF NOT EXISTS idx_data_freshness_last_updated ON data_freshness(last_updated);
        CREATE INDEX IF NOT EXISTS idx_data_freshness_status ON data_freshness(status);
        CREATE INDEX IF NOT EXISTS idx_data_freshness_error_count ON data_freshness(error_count);
      `;
      
      db.run(createDataFreshnessTable, (err) => {
        if (err) {
          console.error('Error creating data freshness table:', err.message);
        } else {
          console.log('Data freshness table ready');
          
          // Create indexes
          db.run(createFreshnessIndexes, (err) => {
            if (err) {
              console.error('Error creating freshness indexes:', err.message);
            } else {
              console.log('Freshness indexes ready');
            }
          });
        }
      });
      
      // Create views
      const createLatestPricesView = `
        CREATE VIEW IF NOT EXISTS latest_prices AS
        SELECT 
          symbol,
          MAX(date) as latest_date,
          close as latest_close,
          volume as latest_volume
        FROM historical_prices 
        GROUP BY symbol
      `;
      
      const createPriceStatisticsView = `
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
        GROUP BY symbol
      `;
      
      db.run(createLatestPricesView, (err) => {
        if (err) {
          console.error('Error creating latest prices view:', err.message);
        } else {
          console.log('Latest prices view ready');
        }
      });
      
      db.run(createPriceStatisticsView, (err) => {
        if (err) {
          console.error('Error creating price statistics view:', err.message);
        } else {
          console.log('Price statistics view ready');
        }
      });
    });
  }
});

// Available thresholds for validation
const VALID_THRESHOLDS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30];

function isValidThreshold(threshold) {
    const numThreshold = parseFloat(threshold);
    // Accept any reasonable threshold between 0.1% and 50%
    return !isNaN(numThreshold) && numThreshold >= 0.1 && numThreshold <= 50;
}

// Helper function to validate symbol exists in database
function validateSymbol(symbol, callback) {
    // Check if the symbol exists in the unified historical_prices table
    db.get("SELECT COUNT(*) as count FROM historical_prices WHERE symbol = ?", [symbol], (err, row) => {
        if (err) {
            callback(err, false);
        } else {
            callback(null, row.count > 0);
        }
    });
}

// Helper function to get dynamic table names
function getETFTableNames(baseETF, leveragedETF) {
    return {
        baseTable: 'historical_prices',
        leveragedTable: 'historical_prices'
    };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

// Get available drawdown thresholds
app.get('/api/thresholds', (req, res) => {
    res.json({
        thresholds: VALID_THRESHOLDS,
        default: 5,
        description: 'Available drawdown percentage thresholds for cycle analysis'
    });
});

// Get available ETF pairs
app.get('/api/available-etfs', (req, res) => {
    // Query database to find available ETF data from unified table
    db.all("SELECT DISTINCT symbol FROM historical_prices WHERE symbol IN ('QQQ', 'TQQQ', 'SPY', 'UPRO', 'IWM', 'TNA') ORDER BY symbol", (err, rows) => {
        if (err) {
            console.error('Error fetching ETF symbols:', err);
            return res.status(500).json({ error: 'Failed to fetch available ETFs' });
        }

        // Extract ETF symbols from results
        const etfSymbols = rows.map(row => row.symbol);
        
        // Define known ETF pairs (base ETF and leveraged ETF relationships)
        const knownPairs = [
            {
                baseETF: 'QQQ',
                leveragedETF: 'TQQQ',
                description: 'NASDAQ-100 (QQQ) vs 3x Leveraged (TQQQ)',
                leverageRatio: '3x'
            }
            // Future pairs can be added here as data becomes available
        ];

        // Filter pairs to only include those with available data
        const availablePairs = knownPairs.filter(pair => 
            etfSymbols.includes(pair.baseETF) && etfSymbols.includes(pair.leveragedETF)
        );

        res.json({
            etfPairs: availablePairs,
            availableETFs: etfSymbols,
            description: 'Available ETF pairs for analysis'
        });
    });
});

// Get available single ETFs endpoint (for main pages)
app.get('/api/available-single-etfs', (req, res) => {
    db.all("SELECT DISTINCT symbol FROM historical_prices WHERE symbol IN ('QQQ', 'TQQQ', 'SPY', 'UPRO', 'IWM', 'TNA', 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN') ORDER BY symbol", (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const etfs = [];
        
        // Enhanced ETF info with more comprehensive data
        const knownETFInfo = {
            'QQQ': { name: 'Invesco QQQ Trust', description: 'NASDAQ-100 Index ETF', category: 'Large Cap Growth' },
            'TQQQ': { name: 'ProShares UltraPro QQQ', description: '3x Leveraged NASDAQ-100 ETF', category: 'Leveraged' },
            'SPY': { name: 'SPDR S&P 500 ETF Trust', description: 'S&P 500 Index ETF', category: 'Large Cap Blend' },
            'UPRO': { name: 'ProShares UltraPro S&P500', description: '3x Leveraged S&P 500 ETF', category: 'Leveraged' },
            'IWM': { name: 'iShares Russell 2000 ETF', description: 'Russell 2000 Small-Cap ETF', category: 'Small Cap' },
            'TNA': { name: 'Direxion Daily Small Cap Bull 3X', description: '3x Leveraged Small-Cap ETF', category: 'Leveraged' },
            'NVDA': { name: 'NVIDIA Corporation', description: 'Graphics Processing Units & AI Technology', category: 'Technology Stock' },
            'TSLA': { name: 'Tesla Inc', description: 'Electric Vehicles & Clean Energy', category: 'Technology Stock' },
            'AAPL': { name: 'Apple Inc', description: 'Consumer Electronics & Software', category: 'Technology Stock' },
            'MSFT': { name: 'Microsoft Corporation', description: 'Software & Cloud Computing', category: 'Technology Stock' },
            'GOOGL': { name: 'Alphabet Inc', description: 'Internet Search & Advertising', category: 'Technology Stock' },
            'AMZN': { name: 'Amazon.com Inc', description: 'E-commerce & Cloud Computing', category: 'Technology Stock' }
        };

        rows.forEach(row => {
            const symbol = row.symbol;
            
            // Use known info if available, otherwise create generic info
            const info = knownETFInfo[symbol] || {
                name: `${symbol}`,
                description: `${symbol} Stock/ETF`,
                category: 'Stock/ETF'
            };
            
            etfs.push({
                symbol: symbol,
                ...info
            });
        });

        // Sort by symbol for consistent ordering
        etfs.sort((a, b) => a.symbol.localeCompare(b.symbol));

        res.json({
            etfs: etfs,
            description: 'All available stocks and ETFs for analysis'
        });
    });
});

// Fetch historical data for any ETF/stock symbol using Stooq
app.post('/api/fetch-historical-data', async (req, res) => {
    const { symbol, startDate, endDate } = req.body;
    
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
    }
    
    const upperSymbol = symbol.toUpperCase();
    console.log(`Fetching historical data for ${upperSymbol} from Stooq...`);
    
    try {
        // Fetch data from Stooq
        const historicalData = await fetchStooqData(upperSymbol);
        
        if (!historicalData || historicalData.length === 0) {
            return res.status(404).json({ 
                error: `No data found for symbol ${upperSymbol}. Please check if the symbol is valid.` 
            });
        }
        
        // Create table for the new symbol
        await createETFTable(upperSymbol);
        
        // Save data to database
        const insertedRows = await saveHistoricalData(upperSymbol, historicalData);
        
        res.json({
            message: `Successfully fetched and stored historical data for ${upperSymbol}`,
            symbol: upperSymbol,
            dataPoints: insertedRows,
            dateRange: {
                start: historicalData[historicalData.length - 1]?.date,
                end: historicalData[0]?.date
            },
            status: 'success',
            source: 'Stooq'
        });
    } catch (error) {
        console.error(`Error fetching historical data for ${upperSymbol}:`, error);
        res.status(500).json({ 
            error: `Failed to fetch historical data for ${upperSymbol}: ${error.message}` 
        });
    }
});

// Helper function to fetch data from Stooq with smart strategy
async function fetchStooqData(symbol) {
    const https = require('https');
    
    // Determine if symbol is likely an ETF or stock based on common patterns
    const isLikelyETF = isETFSymbol(symbol);
    
    let urls;
    if (isLikelyETF) {
        // For ETFs: try without suffix first, then with .US
        urls = [
            `https://stooq.com/q/d/l/?s=${symbol}&i=d`,           // Try without suffix FIRST (ETFs)
            `https://stooq.com/q/d/l/?s=${symbol}.US&i=d`,        // Try with .US suffix as fallback
            `https://stooq.com/q/d/l/?s=${symbol}&i=d&f=d,o,h,l,c,v`, // Try with explicit format
        ];
        console.log(`🔍 ${symbol} appears to be an ETF - trying without suffix first`);
    } else {
        // For stocks: try with .US suffix first, then without
        urls = [
            `https://stooq.com/q/d/l/?s=${symbol}.US&i=d`,        // Try with .US suffix FIRST (US stocks)
            `https://stooq.com/q/d/l/?s=${symbol}&i=d`,           // Try without suffix as fallback
            `https://stooq.com/q/d/l/?s=${symbol}.us&i=d`,        // Try with .us suffix (lowercase fallback)
            `https://stooq.com/q/d/l/?s=${symbol}&i=d&f=d,o,h,l,c,v`, // Try with explicit format as last resort
        ];
        console.log(`🔍 ${symbol} appears to be a stock - trying with .US suffix first`);
    }
    
    // Try each URL until one works
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`Trying Stooq URL ${i + 1}/${urls.length}: ${url}`);
        
        try {
            const data = await fetchFromURL(url);
            const parsedData = parseStooqCSV(data);
            console.log(`Success with URL ${i + 1}: Got ${parsedData.length} data points`);
            return parsedData;
        } catch (error) {
            console.log(`URL ${i + 1} failed: ${error.message}`);
            if (i === urls.length - 1) {
                // Last URL failed, throw the error
                throw new Error(`All Stooq URL attempts failed. Last error: ${error.message}`);
            }
        }
    }
}

// Helper function to determine if a symbol is likely an ETF
function isETFSymbol(symbol) {
    // Common ETF patterns
    const etfPatterns = [
        // Major ETF families
        /^SPY$|^QQQ$|^VOO$|^IVV$|^VTI$|^VEA$|^VWO$|^BND$|^AGG$/i,
        // Leveraged ETFs (2x, 3x)
        /^TQQQ$|^SQQQ$|^UPRO$|^SPXL$|^SOXL$|^LABU$/i,
        // Sector ETFs
        /^XL[KFLVUBCRE]$|^XLC$/i,
        // ARK ETFs
        /^ARK[KWFGQX]$/i,
        // Bond ETFs
        /^TLT$|^TBT$|^TMF$|^TMV$|^SHY$|^IEF$/i,
        // Commodity ETFs
        /^GLD$|^SLV$|^USO$|^UNG$/i,
        // International ETFs
        /^EFA$|^EEM$|^IEMG$|^ACWI$|^VXUS$/i,
        // Real Estate ETFs
        /^VNQ$|^IYR$|^SCHH$/i,
        // Volatility ETFs
        /^UVXY$|^SVXY$|^VIXY$/i,
        // Inverse ETFs
        /^SQQQ$|^SPXS$|^SOXS$|^LABD$/i
    ];
    
    // Check if symbol matches any ETF pattern
    return etfPatterns.some(pattern => pattern.test(symbol));
}

// Helper function to fetch from a single URL
function fetchFromURL(url) {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (error) => {
            reject(new Error(`Failed to fetch from ${url}: ${error.message}`));
        });
    });
}

// Helper function to parse Stooq CSV data
function parseStooqCSV(csvData) {
    console.log('Raw Stooq response:', csvData.substring(0, 200)); // Log first 200 chars for debugging
    
    const lines = csvData.trim().split('\n');
    
    // Check if Stooq returned "No data%" or similar error
    if (csvData.includes('No data%') || csvData.includes('No data') || lines.length < 2) {
        throw new Error(`Stooq returned no data. Response: "${csvData.substring(0, 100)}..."`);
    }
    
    // Skip header line and parse data
    const dataLines = lines.slice(1);
    const parsedData = [];
    
    for (const line of dataLines) {
        const columns = line.split(',');
        
        if (columns.length >= 5) {
            const [date, open, high, low, close, volume] = columns;
            
            // Parse the date (Stooq format: YYYY-MM-DD)
            const [year, month, day] = date.split('-').map(Number);
            
            // Parse numeric values with validation
            const openPrice = parseFloat(open);
            const highPrice = parseFloat(high);
            const lowPrice = parseFloat(low);
            const closePrice = parseFloat(close);
            const volumeNum = parseInt(volume);
            
            // Validate price data integrity
            if (isNaN(openPrice) || isNaN(highPrice) || isNaN(lowPrice) || isNaN(closePrice) || isNaN(volumeNum)) {
                console.log(`⚠️ Invalid numeric data, skipping: ${line}`);
                continue;
            }
            
            // Validate price logic (high >= low, etc.)
            if (highPrice < lowPrice || closePrice < 0 || openPrice < 0) {
                console.log(`⚠️ Illogical price data, skipping: ${line}`);
                continue;
            }
            
            parsedData.push({
                date: date,
                open: openPrice,
                high: highPrice,
                low: lowPrice,
                close: closePrice,
                volume: volumeNum
            });
            
        }
    }
    
    if (parsedData.length === 0) {
        throw new Error('No valid data points found');
    }
    
    // Sort by date (oldest first) and log date range
    parsedData.sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = parsedData[0]?.date;
    const endDate = parsedData[parsedData.length - 1]?.date;
    
    console.log(`📊 CLEAN DATA RANGE: ${startDate} to ${endDate}`);
    
    return parsedData;
}

// Helper function to create ETF table
function createETFTable(symbol) {
    const tableName = `${symbol.toLowerCase()}_all_history`;
    
    return new Promise((resolve, reject) => {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                date TEXT PRIMARY KEY,
                open REAL,
                high REAL,
                low REAL,
                close REAL NOT NULL,
                volume INTEGER
            )
        `;
        
        db.run(createTableSQL, (err) => {
            if (err) {
                reject(new Error(`Failed to create table ${tableName}: ${err.message}`));
            } else {
                console.log(`Table ${tableName} created successfully`);
                resolve();
            }
        });
    });
}

// Helper function to save historical data to database
function saveHistoricalData(symbol, data) {
    const tableName = `${symbol.toLowerCase()}_all_history`;
    
    return new Promise((resolve, reject) => {
        // Clear existing data first
        db.run(`DELETE FROM ${tableName}`, (err) => {
            if (err) {
                reject(new Error(`Failed to clear existing data: ${err.message}`));
                return;
            }
            
            // Insert new data
            const insertSQL = `
                INSERT INTO ${tableName} (date, open, high, low, close, volume)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const stmt = db.prepare(insertSQL);
            let insertedRows = 0;
            
            for (const row of data) {
                stmt.run([row.date, row.open, row.high, row.low, row.close, row.volume], (err) => {
                    if (err) {
                        console.error(`Error inserting row for ${symbol}:`, err);
                    } else {
                        insertedRows++;
                    }
                });
            }
            
            stmt.finalize((err) => {
                if (err) {
                    reject(new Error(`Failed to finalize insert: ${err.message}`));
                } else {
                    console.log(`Inserted ${insertedRows} rows for ${symbol}`);
                    resolve(insertedRows);
                }
            });
        });
    });
}



// Get cycles for specific threshold and single ETF
app.get('/api/cycles/:threshold/:etf?', async (req, res) => {
    const threshold = parseFloat(req.params.threshold);
    const etf = req.params.etf || 'QQQ';
    
    if (isNaN(threshold) || threshold < 0.1 || threshold > 50) {
        return res.status(400).json({ error: 'Invalid threshold. Must be between 0.1 and 50.' });
    }
    
    try {
        const cycles = await executeSingleETFCyclesQuery(etf, threshold);
        res.json(cycles);
    } catch (error) {
        console.error(`Error fetching cycles for ${etf}:`, error);
        res.status(500).json({ error: `Failed to fetch cycles for ${etf}: ${error.message}` });
    }
});

// Helper function for single ETF cycles query - COMPLETELY REWRITTEN
async function executeSingleETFCyclesQuery(etf, threshold) {
    return new Promise((resolve, reject) => {
        // Simple query: just get all price data ordered by date from unified table
        const query = `
            SELECT date, close
            FROM historical_prices
            WHERE symbol = ?
            ORDER BY date
        `;

        db.all(query, [etf.toUpperCase()], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(new Error('Database error'));
                return;
            }

            // Process the data with new cycle detection algorithm
            const cycles = detectCyclesFromScratch(rows, threshold, etf);
            
            resolve({
                threshold: threshold,
                etf: etf,
                totalCycles: cycles.length,
                cycles: cycles,
                dataPoints: rows.length
            });
        });
    });
}

// Get cycles for specific threshold and ETF pair (keep for simulation)
app.get('/api/cycles/:threshold/:baseETF?/:leveragedETF?', (req, res) => {
    const threshold = parseFloat(req.params.threshold);
    const baseETF = (req.params.baseETF || 'QQQ').toUpperCase();
    const leveragedETF = (req.params.leveragedETF || 'TQQQ').toUpperCase();
    
    if (!isValidThreshold(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be between 0.1% and 50%' 
        });
    }

    // Validate symbols exist in database
    const { baseTable, leveragedTable } = getETFTableNames(baseETF, leveragedETF);
    
    validateSymbol(baseETF, (err, baseExists) => {
        if (err || !baseExists) {
            return res.status(400).json({ error: `Symbol data not available for ${baseETF}` });
        }
        
        validateSymbol(leveragedETF, (err, leveragedExists) => {
            if (err || !leveragedExists) {
                return res.status(400).json({ error: `Symbol data not available for ${leveragedETF}` });
            }
            
            // Proceed with dynamic query
            executeCyclesQuery(threshold, baseETF, leveragedETF, baseTable, leveragedTable, res);
        });
    });
});

// Helper function to execute cycles query with dynamic ETF parameters
function executeCyclesQuery(threshold, baseETF, leveragedETF, baseTable, leveragedTable, res) {

    const query = `
        SELECT date, close
        FROM ${baseTable}
        ORDER BY date
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Process the data to identify complete cycles
        const cycles = detectCyclesFromScratch(rows, threshold, baseETF);
        
        res.json({
            threshold: threshold,
            baseETF: baseETF,
            leveragedETF: leveragedETF,
            totalCycles: cycles.length,
            cycles: cycles,
            dataPoints: rows.length
        });
    });
}

// COMPLETELY NEW CYCLE DETECTION ALGORITHM - WRITTEN FROM SCRATCH
function detectCyclesFromScratch(priceData, threshold, etf) {
    console.log(`🔄 Starting fresh cycle detection for ${etf} with ${threshold}% threshold`);
    console.log(`📊 Total data points: ${priceData.length}`);
    
    if (priceData.length < 2) {
        console.log('⚠️ Not enough data for cycle detection');
        return [];
    }
    
    const cycles = [];
    let cycleNumber = 1;
    
    // Step 1: Find all-time highs (true peaks, not local bounces)
    const athPoints = [];
    let runningMax = priceData[0].close;
    let runningMaxDate = priceData[0].date;
    
    for (let i = 1; i < priceData.length; i++) {
        const currentPrice = priceData[i].close;
        const currentDate = priceData[i].date;
        
        if (currentPrice > runningMax) {
            // New all-time high found
            athPoints.push({
                date: runningMaxDate,
                price: runningMax,
                index: i - 1
            });
            runningMax = currentPrice;
            runningMaxDate = currentDate;
        }
    }
    
    // Add the last ATH if it's not already included
    if (athPoints.length === 0 || athPoints[athPoints.length - 1].date !== runningMaxDate) {
        athPoints.push({
            date: runningMaxDate,
            price: runningMax,
            index: priceData.length - 1
        });
    }
    
    console.log(`🏔️ Found ${athPoints.length} all-time highs:`, athPoints.map(p => `${p.date}: $${p.price}`));
    
    // Step 2: Create cycles from each ATH
    for (let i = 0; i < athPoints.length; i++) {
        const ath = athPoints[i];
        const athIndex = ath.index;
        
        // Find the next ATH or end of data
        const nextAthIndex = i < athPoints.length - 1 ? athPoints[i + 1].index : priceData.length;
        
        // Get all data between this ATH and the next (or end)
        const cycleData = priceData.slice(athIndex, nextAthIndex);
        
        if (cycleData.length < 2) continue;
        
        // Find the lowest point in this cycle
        let lowestPrice = ath.price;
        let lowestDate = ath.date;
        let lowestIndex = 0;
        
        for (let j = 0; j < cycleData.length; j++) {
            if (cycleData[j].close < lowestPrice) {
                lowestPrice = cycleData[j].close;
                lowestDate = cycleData[j].date;
                lowestIndex = j;
            }
        }
        
        // Calculate drawdown percentage
        const drawdownPct = ((lowestPrice - ath.price) / ath.price) * 100;
        
        // Only create cycle if drawdown exceeds threshold
        if (drawdownPct < -threshold) {
            // Check if recovery happened - search from low point through ALL remaining data
            let recoveryDate = null;
            let recoveryPrice = null;
            
            // Calculate the actual index of the low point in the full dataset
            const actualLowIndex = athIndex + lowestIndex;
            
            // Search from the low point forward through ALL remaining data
            for (let j = actualLowIndex + 1; j < priceData.length; j++) {
                if (priceData[j].close >= ath.price) {
                    recoveryDate = priceData[j].date;
                    recoveryPrice = priceData[j].close;
                    break;
                }
            }
            
            // Determine severity
            let severity = 'mild';
            if (Math.abs(drawdownPct) >= 20) {
                severity = 'severe';
            } else if (Math.abs(drawdownPct) >= 10) {
                severity = 'moderate';
            }
            
            // Calculate durations
            const athToLowDays = Math.ceil((new Date(lowestDate) - new Date(ath.date)) / (1000 * 60 * 60 * 24));
            const lowToRecoveryDays = recoveryDate ? Math.ceil((new Date(recoveryDate) - new Date(lowestDate)) / (1000 * 60 * 60 * 24)) : null;
            
            const basePrefix = etf.toLowerCase();
            const cycle = {
                cycle_number: cycleNumber++,
                severity: severity,
                [`${basePrefix}_ath_date`]: ath.date,
                [`${basePrefix}_ath_price`]: ath.price,
                [`${basePrefix}_low_date`]: lowestDate,
                [`${basePrefix}_low_price`]: lowestPrice,
                [`${basePrefix}_drawdown_pct`]: drawdownPct,
                [`${basePrefix}_recovery_date`]: recoveryDate,
                [`${basePrefix}_recovery_price`]: recoveryPrice,
                threshold: threshold,
                // Legacy fields for backward compatibility
                qqq_ath_date: ath.date,
                qqq_ath_price: ath.price,
                qqq_low_date: lowestDate,
                qqq_low_price: lowestPrice,
                qqq_drawdown_pct: drawdownPct,
                qqq_recovery_date: recoveryDate,
                qqq_recovery_price: recoveryPrice,
                // Generic fields
                ath_date: ath.date,
                ath_price: ath.price,
                low_date: lowestDate,
                low_price: lowestPrice,
                drawdown_pct: drawdownPct,
                recovery_date: recoveryDate,
                recovery_price: recoveryPrice,
                // Duration fields
                ath_to_low_days: athToLowDays,
                low_to_recovery_days: lowToRecoveryDays
            };
            
            cycles.push(cycle);
            console.log(`✅ Created cycle ${cycle.cycle_number}: ${ath.date} ($${ath.price}) → ${lowestDate} ($${lowestPrice}) [${drawdownPct.toFixed(1)}%] ${recoveryDate ? `→ ${recoveryDate} ($${recoveryPrice})` : '→ Ongoing'}`);
            console.log(`   Debug: ATH index ${athIndex}, cycle data length ${cycleData.length}, lowest index ${lowestIndex}, next ATH index ${nextAthIndex}`);
        }
    }
    
    console.log(`🎯 Total cycles detected: ${cycles.length}`);
    return cycles;
}

// Get summary for specific threshold and single ETF
app.get('/api/summary/:threshold/:etf?', async (req, res) => {
    const threshold = parseFloat(req.params.threshold);
    const etf = req.params.etf || 'QQQ';
    
    if (isNaN(threshold) || threshold < 0.1 || threshold > 50) {
        return res.status(400).json({ error: 'Invalid threshold. Must be between 0.1 and 50.' });
    }
    
    try {
        const summary = await executeSummaryQuery(etf, threshold);
        res.json(summary);
    } catch (error) {
        console.error(`Error fetching summary for ${etf}:`, error);
        res.status(500).json({ error: `Failed to fetch summary for ${etf}: ${error.message}` });
    }
});

// Helper function to execute summary query with dynamic symbol parameters
async function executeSummaryQuery(etf, threshold) {
    return new Promise((resolve, reject) => {
    // Simple query: just get all price data ordered by date
    const query = `
        SELECT date, close
        FROM historical_prices
        WHERE symbol = ?
        ORDER BY date
    `;

    db.all(query, [etf], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
                reject(new Error('Database error'));
                return;
        }

            const cycles = detectCyclesFromScratch(rows, threshold, etf);
        
        if (cycles.length === 0) {
                resolve({
                threshold: threshold,
                    etf: etf,
                totalCycles: 0,
                summary: 'No cycles found for this threshold'
            });
                return;
        }

        // Calculate statistics
        const drawdowns = cycles.map(c => Math.abs(c.drawdown_pct));
        const durations = cycles.map(c => {
            const lowDate = new Date(c.low_date);
            const athDate = new Date(c.ath_date);
            return Math.ceil((lowDate - athDate) / (1000 * 60 * 60 * 24));
        });
        const recoveries = cycles.map(c => {
            const recoveryDate = new Date(c.recovery_date);
            const lowDate = new Date(c.low_date);
            return Math.ceil((recoveryDate - lowDate) / (1000 * 60 * 60 * 24));
        });

            // Calculate severity breakdown
            const severeCycles = cycles.filter(c => c.severity === 'severe').length;
            const moderateCycles = cycles.filter(c => c.severity === 'moderate').length;
            const mildCycles = cycles.filter(c => c.severity === 'mild').length;

        const summary = {
            threshold: threshold,
                etf: etf,
            totalCycles: cycles.length,
            averageDrawdown: drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length,
            maxDrawdown: Math.max(...drawdowns),
            minDrawdown: Math.min(...drawdowns),
            averageDurationToLow: durations.reduce((a, b) => a + b, 0) / durations.length,
            averageRecoveryTime: recoveries.reduce((a, b) => a + b, 0) / recoveries.length,
            totalDuration: durations.reduce((a, b) => a + b, 0) + recoveries.reduce((a, b) => a + b, 0),
                // Severity breakdown
                severeCycles: severeCycles,
                moderateCycles: moderateCycles,
                mildCycles: mildCycles,
            dateRange: {
                start: cycles[0].ath_date,
                end: cycles[cycles.length - 1].recovery_date
            }
        };

            resolve(summary);
    });
});
}

// Get chart data for specific threshold and single ETF
app.get('/api/chart-data/:threshold/:etf?', async (req, res) => {
    const threshold = parseFloat(req.params.threshold);
    const etf = req.params.etf || 'QQQ';
    
    if (isNaN(threshold) || threshold < 0.1 || threshold > 50) {
        return res.status(400).json({ error: 'Invalid threshold. Must be between 0.1 and 50.' });
    }
    
    try {
        const chartData = await executeSingleETFChartDataQuery(etf, threshold);
        res.json(chartData);
    } catch (error) {
        console.error(`Error fetching chart data for ${etf}:`, error);
        res.status(500).json({ error: `Failed to fetch chart data for ${etf}: ${error.message}` });
    }
});

// Helper function for single ETF chart data query
async function executeSingleETFChartDataQuery(etf, threshold) {
    return new Promise((resolve, reject) => {
        // Get price data from unified historical_prices table
        const priceQuery = `
            SELECT date, close
            FROM historical_prices
            WHERE symbol = ?
            ORDER BY date
        `;
        
        // Get cycle data - simple query
        const cycleQuery = `
            SELECT date, close
            FROM historical_prices
            WHERE symbol = ?
            ORDER BY date
        `;

        // Execute both queries
        db.all(priceQuery, [etf.toUpperCase()], (err, priceRows) => {
            if (err) {
                console.error('Database error:', err);
                reject(new Error('Database error'));
                return;
            }

            db.all(cycleQuery, [etf.toUpperCase()], (err, cycleRows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(new Error('Database error'));
                    return;
                }

                // Process the cycle data to identify complete cycles
                const cycles = detectCyclesFromScratch(cycleRows, threshold, etf);
                
                resolve({
                    threshold: threshold,
                    etf: etf,
                    data: priceRows,
                    cycles: cycles.map(cycle => ({
                        ath_date: cycle[`${etf.toLowerCase()}_ath_date`],
                        ath_price: cycle[`${etf.toLowerCase()}_ath_price`],
                        low_date: cycle[`${etf.toLowerCase()}_low_date`],
                        low_price: cycle[`${etf.toLowerCase()}_low_price`],
                        recovery_date: cycle[`${etf.toLowerCase()}_recovery_date`],
                        recovery_price: cycle[`${etf.toLowerCase()}_recovery_price`],
                        drawdown_pct: cycle[`${etf.toLowerCase()}_drawdown_pct`]
                    })),
                    metadata: {
                        dataPoints: priceRows.length,
                        cycles: cycles.length,
                        dateRange: {
                            start: priceRows[0]?.date,
                            end: priceRows[priceRows.length - 1]?.date
                        }
                    }
                });
            });
        });
    });
}

// Get chart data for visualization (ETF pairs - keep for simulation)
app.get('/api/chart-data/:threshold/:baseETF?/:leveragedETF?', (req, res) => {
    const threshold = parseFloat(req.params.threshold);
    const baseETF = (req.params.baseETF || 'QQQ').toUpperCase();
    const leveragedETF = (req.params.leveragedETF || 'TQQQ').toUpperCase();
    
    if (!isValidThreshold(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be between 0.1% and 50%' 
        });
    }

    // Validate symbols exist in database
    const { baseTable, leveragedTable } = getETFTableNames(baseETF, leveragedETF);
    
    validateSymbol(baseETF, (err, baseExists) => {
        if (err || !baseExists) {
            return res.status(400).json({ error: `Symbol data not available for ${baseETF}` });
        }
        
        validateSymbol(leveragedETF, (err, leveragedExists) => {
            if (err || !leveragedExists) {
                return res.status(400).json({ error: `Symbol data not available for ${leveragedETF}` });
            }
            
            // Proceed with dynamic chart data query
            executeChartDataQuery(threshold, baseETF, leveragedETF, baseTable, leveragedTable, res);
        });
    });
});

// Helper function to execute chart data query with dynamic ETF parameters  
function executeChartDataQuery(threshold, baseETF, leveragedETF, baseTable, leveragedTable, res) {

        // Get base ETF price data
    const baseQuery = `
        SELECT date, close 
        FROM ${baseTable}
        ORDER BY date
    `;

    // Get leveraged ETF price data  
    const leveragedQuery = `
        SELECT date, close 
        FROM ${leveragedTable}
        ORDER BY date
    `;

    db.all(baseQuery, [], (err, baseRows) => {
        if (err) {
            console.error(`${baseETF} database error:`, err);
            return res.status(500).json({ error: 'Database error' });
        }

        db.all(leveragedQuery, [], (err, leveragedRows) => {
            if (err) {
                console.error(`${leveragedETF} database error:`, err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Get cycles for this threshold - simple query
            const cyclesQuery = `
                SELECT date, close
                FROM ${baseTable}
                ORDER BY date
            `;

            db.all(cyclesQuery, [], (err, cycleRows) => {
                if (err) {
                    console.error('Cycles database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                const cycles = detectCyclesFromScratch(cycleRows, threshold, baseETF);

                res.json({
                    threshold: threshold,
                    baseETF: baseETF,
                    leveragedETF: leveragedETF,
                    [`${baseETF.toLowerCase()}Data`]: baseRows.map(row => ({
                        date: row.date,
                        close: row.close
                    })),
                    [`${leveragedETF.toLowerCase()}Data`]: leveragedRows.map(row => ({
                        date: row.date,
                        close: row.close
                    })),
                    // Legacy field names for backward compatibility
                    qqqData: baseRows.map(row => ({
                        date: row.date,
                        close: row.close
                    })),
                    tqqqData: leveragedRows.map(row => ({
                        date: row.date,
                        close: row.close
                    })),
                    cycles: cycles,
                    metadata: {
                        [`${baseETF.toLowerCase()}Points`]: baseRows.length,
                        [`${leveragedETF.toLowerCase()}Points`]: leveragedRows.length,
                        cycles: cycles.length,
                        dateRange: {
                            [baseETF.toLowerCase()]: {
                                start: baseRows[0]?.date,
                                end: baseRows[baseRows.length - 1]?.date
                            },
                            [leveragedETF.toLowerCase()]: {
                                start: leveragedRows[0]?.date,
                                end: leveragedRows[leveragedRows.length - 1]?.date
                            }
                        }
                    }
                });
            });
        });
    });
}

// Custom analysis endpoint
app.post('/api/analyze', (req, res) => {
    const { threshold, startDate, endDate } = req.body;
    
    if (!threshold || !isValidThreshold(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be between 0.1% and 50%' 
        });
    }

    let dateFilter = '';
    const params = [threshold];
    
    if (startDate && endDate) {
        dateFilter = 'AND date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    const query = `
        SELECT date, close
        FROM historical_prices
        WHERE symbol = 'QQQ' ${dateFilter}
        ORDER BY date
    `;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const cycles = detectCyclesFromScratch(rows, threshold, 'QQQ');
        
        res.json({
            threshold: threshold,
            dateRange: { startDate, endDate },
            totalCycles: cycles.length,
            cycles: cycles,
            analysis: {
                message: `Found ${cycles.length} cycles with >${threshold}% drawdown`,
                timestamp: new Date().toISOString()
            }
        });
    });
});

// Get market data for QQQ and TQQQ
app.get('/api/market-data', (req, res) => {
    const { limit = 100, startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
        dateFilter = 'WHERE date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    
    // Get QQQ data
    const qqqQuery = `
        SELECT date, close, volume 
        FROM historical_prices 
        WHERE symbol = 'QQQ' ${dateFilter}
        ORDER BY date DESC 
        LIMIT ${parseInt(limit)}
    `;
    
    // Get TQQQ data
    const tqqqQuery = `
        SELECT date, close, volume 
        FROM historical_prices 
        WHERE symbol = 'TQQQ' ${dateFilter}
        ORDER BY date DESC 
        LIMIT ${parseInt(limit)}
    `;
    
    db.all(qqqQuery, params, (err, qqqRows) => {
        if (err) {
            console.error('QQQ database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.all(tqqqQuery, params, (err, tqqqRows) => {
            if (err) {
                console.error('TQQQ database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                qqq_data: qqqRows,
                tqqq_data: tqqqRows,
                metadata: {
                    qqq_count: qqqRows.length,
                    tqqq_count: tqqqRows.length,
                    limit: parseInt(limit),
                    dateRange: { startDate, endDate }
                }
            });
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// These will be moved to the end after all API routes

// Portfolio simulation endpoint
app.post('/api/simulate', (req, res) => {
    const { amount, startDate, endDate, threshold, monthlyInvestment = 0, baseETF = 'QQQ', leveragedETF = 'TQQQ' } = req.body;
    
    if (!amount || !startDate || !endDate || !threshold) {
        return res.status(400).json({ 
            error: 'Missing required parameters: amount, startDate, endDate, threshold' 
        });
    }

    if (monthlyInvestment < 0) {
        return res.status(400).json({ 
            error: 'Monthly investment must be non-negative' 
        });
    }

    if (!isValidThreshold(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be between 0.1% and 50%'
        });
    }

    // Validate symbols exist in database
    const { baseTable, leveragedTable } = getETFTableNames(baseETF, leveragedETF);
    
    validateSymbol(baseETF, (err, baseExists) => {
        if (err || !baseExists) {
            return res.status(400).json({ error: `Symbol data not available for ${baseETF}` });
        }
        
        validateSymbol(leveragedETF, (err, leveragedExists) => {
            if (err || !leveragedExists) {
                return res.status(400).json({ error: `Symbol data not available for ${leveragedETF}` });
            }
            
            // Proceed with simulation
            executeSimulation(amount, startDate, endDate, threshold, monthlyInvestment, baseETF, leveragedETF, baseTable, leveragedTable, res);
        });
    });
});

// Helper function to execute simulation with dynamic ETF parameters
function executeSimulation(amount, startDate, endDate, threshold, monthlyInvestment, baseETF, leveragedETF, baseTable, leveragedTable, res) {

    // Get base ETF data for the period
    const baseQuery = `
        SELECT date, close 
        FROM ${baseTable}
        WHERE symbol = ? AND date >= ? AND date <= ? 
        ORDER BY date
    `;

    // Get leveraged ETF data for the period  
    const leveragedQuery = `
        SELECT date, close 
        FROM ${leveragedTable}
        WHERE symbol = ? AND date >= ? AND date <= ? 
        ORDER BY date
    `;

    db.all(baseQuery, [baseETF, startDate, endDate], (err, baseData) => {
        if (err) {
            console.error(`${baseETF} database error:`, err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (baseData.length === 0) {
            return res.status(400).json({ error: `No ${baseETF} data found for the specified date range` });
        }

        db.all(leveragedQuery, [leveragedETF, startDate, endDate], (err, leveragedData) => {
            if (err) {
                console.error(`${leveragedETF} database error:`, err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (leveragedData.length === 0) {
                return res.status(400).json({ error: `No ${leveragedETF} data found for the specified date range` });
            }

            try {
                const simulation = calculatePortfolioSimulation(amount, baseData, leveragedData, threshold, startDate, endDate, monthlyInvestment, baseETF, leveragedETF);
                res.json(simulation);
            } catch (error) {
                console.error('Simulation error:', error);
                res.status(500).json({ error: 'Simulation calculation failed' });
            }
        });
    });
}

function calculatePortfolioSimulation(initialAmount, baseData, leveragedData, threshold, startDate, endDate, monthlyInvestment = 0, baseETF = 'QQQ', leveragedETF = 'TQQQ') {
    if (baseData.length === 0 || leveragedData.length === 0) {
        throw new Error('Insufficient data for simulation');
    }

    // Calculate time period
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const durationDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
    const durationYears = durationDays / 365.25;

    // Create aligned data arrays
    const alignedData = [];
    for (let i = 0; i < baseData.length; i++) {
        const baseEntry = baseData[i];
        const leveragedEntry = leveragedData.find(t => t.date === baseEntry.date);
        if (leveragedEntry) {
            alignedData.push({
                date: baseEntry.date,
                [`${baseETF.toLowerCase()}_price`]: baseEntry.close,
                [`${leveragedETF.toLowerCase()}_price`]: leveragedEntry.close,
                // Legacy field names for backward compatibility
                qqq_price: baseEntry.close,
                tqqq_price: leveragedEntry.close
            });
        }
    }

    if (alignedData.length === 0) {
        throw new Error('No aligned data found for simulation');
    }

    // Generate monthly investment dates if monthly investment is enabled
    const monthlyInvestmentDates = [];
    if (monthlyInvestment > 0) {
        let currentDate = new Date(startDateObj);
        currentDate.setDate(1); // Start on the first of the month
        currentDate.setMonth(currentDate.getMonth() + 1); // First investment is next month
        
        while (currentDate <= endDateObj) {
            monthlyInvestmentDates.push(new Date(currentDate));
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }

    // Calculate total invested amount
    const totalInvested = initialAmount + (monthlyInvestment * monthlyInvestmentDates.length);

    // Base ETF Only Strategy with Monthly Investment
    let baseETFShares = initialAmount / alignedData[0][`${baseETF.toLowerCase()}_price`];
    let baseETFTotalInvested = initialAmount;
    
    for (const investDate of monthlyInvestmentDates) {
        // Find the closest data point to the investment date
        const dataPoint = alignedData.find(d => new Date(d.date) >= investDate) || alignedData[alignedData.length - 1];
        baseETFShares += monthlyInvestment / dataPoint[`${baseETF.toLowerCase()}_price`];
        baseETFTotalInvested += monthlyInvestment;
    }
    
    const baseETFFinalValue = baseETFShares * alignedData[alignedData.length - 1][`${baseETF.toLowerCase()}_price`];
    const baseETFTotalReturn = baseETFFinalValue - baseETFTotalInvested;
    const baseETFTotalReturnPct = (baseETFTotalReturn / baseETFTotalInvested) * 100;
    const baseETFAnnualizedReturn = (Math.pow(baseETFFinalValue / baseETFTotalInvested, 1 / durationYears) - 1) * 100;

    // Leveraged ETF Only Strategy with Monthly Investment
    let leveragedETFShares = initialAmount / alignedData[0][`${leveragedETF.toLowerCase()}_price`];
    let leveragedETFTotalInvested = initialAmount;
    
    for (const investDate of monthlyInvestmentDates) {
        // Find the closest data point to the investment date
        const dataPoint = alignedData.find(d => new Date(d.date) >= investDate) || alignedData[alignedData.length - 1];
        leveragedETFShares += monthlyInvestment / dataPoint[`${leveragedETF.toLowerCase()}_price`];
        leveragedETFTotalInvested += monthlyInvestment;
    }
    
    const leveragedETFFinalValue = leveragedETFShares * alignedData[alignedData.length - 1][`${leveragedETF.toLowerCase()}_price`];
    const leveragedETFTotalReturn = leveragedETFFinalValue - leveragedETFTotalInvested;
    const leveragedETFTotalReturnPct = (leveragedETFTotalReturn / leveragedETFTotalInvested) * 100;
    const leveragedETFAnnualizedReturn = (Math.pow(leveragedETFFinalValue / leveragedETFTotalInvested, 1 / durationYears) - 1) * 100;

    // Smart Strategy (Base ETF with Leveraged ETF during drawdowns) with Monthly Investment
    let strategyValue = initialAmount;
    let strategyTotalInvested = initialAmount;
    let currentHolding = baseETF; // Start with base ETF
    let baseETFATH = alignedData[0][`${baseETF.toLowerCase()}_price`];
    let switches = 0;
    let shares = initialAmount / alignedData[0][`${baseETF.toLowerCase()}_price`]; // Start with base ETF shares
    let monthlyInvestmentIndex = 0;
    
    for (let i = 1; i < alignedData.length; i++) {
        const current = alignedData[i];
        const currentDate = new Date(current.date);
        
        // Check if we need to make a monthly investment
        if (monthlyInvestmentIndex < monthlyInvestmentDates.length && 
            currentDate >= monthlyInvestmentDates[monthlyInvestmentIndex]) {
            
            // Add monthly investment to current position
            if (currentHolding === baseETF) {
                shares += monthlyInvestment / current[`${baseETF.toLowerCase()}_price`];
            } else {
                shares += monthlyInvestment / current[`${leveragedETF.toLowerCase()}_price`];
            }
            strategyTotalInvested += monthlyInvestment;
            monthlyInvestmentIndex++;
        }
        
        // Update base ETF ATH
        if (current[`${baseETF.toLowerCase()}_price`] > baseETFATH) {
            baseETFATH = current[`${baseETF.toLowerCase()}_price`];
            
            // If we're in leveraged ETF and base ETF hits new ATH, switch back to base ETF
            if (currentHolding === leveragedETF) {
                strategyValue = shares * current[`${leveragedETF.toLowerCase()}_price`];
                shares = strategyValue / current[`${baseETF.toLowerCase()}_price`];
                currentHolding = baseETF;
                switches++;
            }
        }
        
        // Check for drawdown
        const drawdown = ((current[`${baseETF.toLowerCase()}_price`] - baseETFATH) / baseETFATH) * 100;
        
        if (drawdown <= -threshold && currentHolding === baseETF) {
            // Switch from base ETF to leveraged ETF
            strategyValue = shares * current[`${baseETF.toLowerCase()}_price`];
            shares = strategyValue / current[`${leveragedETF.toLowerCase()}_price`];
            currentHolding = leveragedETF;
            switches++;
        }
        
        // Update strategy value based on current holding
        if (currentHolding === baseETF) {
            strategyValue = shares * current[`${baseETF.toLowerCase()}_price`];
        } else {
            strategyValue = shares * current[`${leveragedETF.toLowerCase()}_price`];
        }
    }
    
    const strategyTotalReturn = strategyValue - strategyTotalInvested;
    const strategyTotalReturnPct = (strategyTotalReturn / strategyTotalInvested) * 100;
    const strategyAnnualizedReturn = (Math.pow(strategyValue / strategyTotalInvested, 1 / durationYears) - 1) * 100;

    return {
        startDate,
        endDate,
        initialInvestment: initialAmount,
        monthlyInvestment,
        totalInvested: Math.round(totalInvested),
        strategy: monthlyInvestment > 0 
            ? `${baseETF}→${leveragedETF} at ${threshold}% drawdown + $${monthlyInvestment}/month DCA`
            : `${baseETF}→${leveragedETF} at ${threshold}% drawdown`,
        
        // Base ETF only results
        baseETFFinalValue: Math.round(baseETFFinalValue),
        baseETFTotalReturn: Math.round(baseETFTotalReturn),
        baseETFTotalReturnPct: parseFloat(baseETFTotalReturnPct.toFixed(2)),
        baseETFAnnualizedReturn: parseFloat(baseETFAnnualizedReturn.toFixed(2)),
        
        // Leveraged ETF only results
        leveragedETFFinalValue: Math.round(leveragedETFFinalValue),
        leveragedETFTotalReturn: Math.round(leveragedETFTotalReturn),
        leveragedETFTotalReturnPct: parseFloat(leveragedETFTotalReturnPct.toFixed(2)),
        leveragedETFAnnualizedReturn: parseFloat(leveragedETFAnnualizedReturn.toFixed(2)),
        
        // Strategy results
        strategyFinalValue: Math.round(strategyValue),
        strategyTotalReturn: Math.round(strategyTotalReturn),
        strategyTotalReturnPct: parseFloat(strategyTotalReturnPct.toFixed(2)),
        strategyAnnualizedReturn: parseFloat(strategyAnnualizedReturn.toFixed(2)),
        strategySwitches: switches,
        
        // Duration
        durationDays,
        durationYears: parseFloat(durationYears.toFixed(2))
    };
}

// New API endpoint: Search symbols
app.get('/api/symbols', async (req, res) => {
  try {
    const { query = '', limit = 20, sector, marketCap } = req.query;
    
    let sql = `
      SELECT symbol, name, sector, market_cap, exchange, is_active
      FROM symbols 
      WHERE is_active = 1
    `;
    
    const params = [];
    
    if (query && query.length > 0) {
      sql += ` AND (
        symbol LIKE ? OR 
        name LIKE ? OR 
        sector LIKE ?
      )`;
      const searchTerm = `%${query.toUpperCase()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (sector) {
      sql += ` AND sector = ?`;
      params.push(sector);
    }
    
    if (marketCap) {
      sql += ` AND market_cap = ?`;
      params.push(marketCap);
    }
    
    sql += ` ORDER BY 
      CASE 
        WHEN symbol = ? THEN 1
        WHEN symbol LIKE ? THEN 2
        WHEN name LIKE ? THEN 3
        ELSE 4
      END, symbol
      LIMIT ?
    `;
    
    const upperQuery = query.toUpperCase();
    params.push(upperQuery, `${upperQuery}%`, `%${upperQuery}%`, parseInt(limit));
    
    // Use callback version for proper results
    db.all(sql, params, (err, symbols) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          status: 'error',
          message: 'Database error',
          error: err.message
        });
      }
      
      // Ensure symbols is always an array
      const symbolsArray = Array.isArray(symbols) ? symbols : [];
      
      res.json({
        status: 'success',
        symbols: symbolsArray,
        total: symbolsArray.length,
        query: query
      });
    });
    
  } catch (error) {
    console.error('Error searching symbols:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search symbols',
      error: error.message
    });
  }
});

// New API endpoint: Get all sectors
app.get('/api/symbols/sectors', async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT sector, COUNT(*) as count
      FROM symbols 
      WHERE is_active = 1 AND sector IS NOT NULL
      GROUP BY sector
      ORDER BY count DESC, sector
    `;
    
    const stmt = db.prepare(sql);
    const sectors = stmt.all();
    
    res.json({
      status: 'success',
      sectors: sectors
    });
    
  } catch (error) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch sectors',
      error: error.message
    });
  }
});

// New API endpoint: Get all market caps
app.get('/api/symbols/market-caps', async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT market_cap, COUNT(*) as count
      FROM symbols 
      WHERE is_active = 1 AND market_cap IS NOT NULL
      GROUP BY market_cap
      ORDER BY 
        CASE market_cap
          WHEN 'ETF' THEN 1
          WHEN 'Large Cap' THEN 2
          WHEN 'Mid Cap' THEN 3
          WHEN 'Small Cap' THEN 4
          ELSE 5
        END,
        market_cap
    `;
    
    const stmt = db.prepare(sql);
    const marketCaps = stmt.all();
    
    res.json({
      status: 'success',
      marketCaps: marketCaps
    });
    
  } catch (error) {
    console.error('Error fetching market caps:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch market caps',
      error: error.message
    });
  }
});

// New API endpoint: Get symbol details
app.get('/api/symbols/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const sql = `
      SELECT symbol, name, sector, market_cap, exchange, is_active, created_at, updated_at
      FROM symbols 
      WHERE symbol = ? AND is_active = 1
    `;
    
    const stmt = db.prepare(sql);
    const symbolData = stmt.get(symbol.toUpperCase());
    
    if (!symbolData) {
      return res.status(404).json({
        status: 'error',
        message: `Symbol '${symbol}' not found`
      });
    }
    
    res.json({
      status: 'success',
      symbol: symbolData
    });
    
  } catch (error) {
    console.error('Error fetching symbol details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch symbol details',
      error: error.message
    });
  }
});

// New API endpoint: Add new symbol
app.post('/api/symbols', async (req, res) => {
  try {
    const { symbol, name, sector, marketCap, exchange = 'NASDAQ' } = req.body;
    
    if (!symbol || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Symbol and name are required'
      });
    }
    
    const sql = `
      INSERT OR REPLACE INTO symbols (symbol, name, sector, market_cap, exchange, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const stmt = db.prepare(sql);
    const result = stmt.run(symbol.toUpperCase(), name, sector, marketCap, exchange);
    
    res.json({
      status: 'success',
      message: `Symbol '${symbol.toUpperCase()}' ${result.changes > 0 ? 'added' : 'updated'} successfully`,
      symbol: symbol.toUpperCase(),
      changes: result.changes
    });
    
  } catch (error) {
    console.error('Error adding symbol:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add symbol',
      error: error.message
    });
  }
});

// New API endpoint: Update symbol
app.put('/api/symbols/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { name, sector, marketCap, exchange, isActive } = req.body;
    
    const sql = `
      UPDATE symbols 
      SET name = COALESCE(?, name),
          sector = COALESCE(?, sector),
          market_cap = COALESCE(?, market_cap),
          exchange = COALESCE(?, exchange),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE symbol = ?
    `;
    
    const stmt = db.prepare(sql);
    const result = stmt.run(name, sector, marketCap, exchange, isActive, symbol.toUpperCase());
    
    if (result.changes === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Symbol '${symbol}' not found`
      });
    }
    
    res.json({
      status: 'success',
      message: `Symbol '${symbol.toUpperCase()}' updated successfully`,
      changes: result.changes
    });
    
  } catch (error) {
    console.error('Error updating symbol:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update symbol',
      error: error.message
    });
  }
});

// New API endpoint: Delete symbol (soft delete)
app.delete('/api/symbols/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const sql = `
      UPDATE symbols 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE symbol = ?
    `;
    
    const stmt = db.prepare(sql);
    const result = stmt.run(symbol.toUpperCase());
    
    if (result.changes === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Symbol '${symbol}' not found`
      });
    }
    
    res.json({
      status: 'success',
      message: `Symbol '${symbol.toUpperCase()}' deactivated successfully`,
      changes: result.changes
    });
    
  } catch (error) {
    console.error('Error deactivating symbol:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to deactivate symbol',
      error: error.message
    });
  }
});

// New API endpoint: Bulk fetch historical data for all symbols
app.post('/api/bulk-fetch-historical-data', async (req, res) => {
  try {
    const { symbols = [], startDate = '2020-01-01', endDate = null, forceRefresh = false } = req.body;
    
    // If no symbols provided, fetch all active symbols
    let targetSymbols = symbols;
    if (!symbols || symbols.length === 0) {
      const stmt = db.prepare('SELECT symbol FROM symbols WHERE is_active = 1');
      const allSymbols = stmt.all();
      targetSymbols = allSymbols.map(row => row.symbol);
    }
    
    console.log(`Starting bulk fetch for ${targetSymbols.length} symbols`);
    
    const results = {
      total: targetSymbols.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: []
    };
    
    // Process symbols in batches to avoid overwhelming the API
    const batchSize = 5; // Process 5 symbols at a time
    const batches = [];
    
    for (let i = 0; i < targetSymbols.length; i += batchSize) {
      batches.push(targetSymbols.slice(i, i + batchSize));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} symbols)`);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (symbol) => {
        try {
          // Check if we need to refresh data
          if (!forceRefresh) {
            const freshnessStmt = db.prepare('SELECT last_updated FROM data_freshness WHERE symbol = ?');
            const freshness = freshnessStmt.get(symbol);
            
            if (freshness && freshness.last_updated) {
              const lastUpdate = new Date(freshness.last_updated);
              const now = new Date();
              const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
              
              // Skip if updated within last 24 hours
              if (daysSinceUpdate < 1) {
                results.skipped++;
                results.details.push({
                  symbol,
                  status: 'skipped',
                  reason: 'Data is recent (updated within 24 hours)'
                });
                return;
              }
            }
          }
          
          // Fetch historical data from Stooq
          const stooqUrl = `https://stooq.com/q/d/l/?s=${symbol}.US&d1=${startDate}&d2=${endDate || new Date().toISOString().split('T')[0]}&i=d`;
          
          const response = await fetch(stooqUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const csvText = await response.text();
          if (!csvText || csvText.includes('N/A') || csvText.length < 100) {
            throw new Error('Invalid or empty data received from Stooq');
          }
          
          // Parse CSV data
          const lines = csvText.trim().split('\n');
          const headers = lines[0].split(',');
          
          if (headers.length < 5) {
            throw new Error('Invalid CSV format');
          }
          
          // Find column indices
          const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
          const openIndex = headers.findIndex(h => h.toLowerCase().includes('open'));
          const highIndex = headers.findIndex(h => h.toLowerCase().includes('high'));
          const lowIndex = headers.findIndex(h => h.toLowerCase().includes('low'));
          const closeIndex = headers.findIndex(h => h.toLowerCase().includes('close'));
          const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('vol'));
          
          if (dateIndex === -1 || closeIndex === -1) {
            throw new Error('Required columns not found');
          }
          
          // Process data rows
          const dataRows = lines.slice(1).filter(line => line.trim() && !line.includes('N/A'));
          
          if (dataRows.length === 0) {
            throw new Error('No valid data rows found');
          }
          
          // Begin transaction for this symbol
          db.serialize(() => {
            // Delete existing data for this symbol
            const deleteStmt = db.prepare('DELETE FROM historical_prices WHERE symbol = ?');
            deleteStmt.run(symbol);
            
            // Insert new data
            const insertStmt = db.prepare(`
              INSERT INTO historical_prices (symbol, date, open, high, low, close, volume)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            let insertedRows = 0;
            for (const line of dataRows) {
              const values = line.split(',');
              if (values.length >= Math.max(dateIndex, openIndex, highIndex, lowIndex, closeIndex, volumeIndex) + 1) {
                const date = values[dateIndex];
                const open = parseFloat(values[openIndex]) || null;
                const high = parseFloat(values[highIndex]) || null;
                const low = parseFloat(values[lowIndex]) || null;
                const close = parseFloat(values[closeIndex]) || null;
                const volume = parseInt(values[volumeIndex]) || null;
                
                if (date && close && !isNaN(close)) {
                  insertStmt.run(symbol, date, open, high, low, close, volume);
                  insertedRows++;
                }
              }
            }
            
            // Update data freshness
            const upsertFreshness = db.prepare(`
              INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count)
              VALUES (?, CURRENT_TIMESTAMP, 'active', 0)
            `);
            upsertFreshness.run(symbol);
            
            console.log(`✓ ${symbol}: Inserted ${insertedRows} rows`);
          });
          
          results.successful++;
          results.details.push({
            symbol,
            status: 'success',
            rowsInserted: dataRows.length
          });
          
        } catch (error) {
          console.error(`✗ ${symbol}: ${error.message}`);
          results.failed++;
          results.details.push({
            symbol,
            status: 'failed',
            error: error.message
          });
          
          // Update error tracking
          const errorStmt = db.prepare(`
            INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count, last_error)
            VALUES (?, CURRENT_TIMESTAMP, 'error', COALESCE((SELECT error_count + 1 FROM data_freshness WHERE symbol = ?), 1), ?)
          `);
          errorStmt.run(symbol, symbol, error.message);
        }
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Add delay between batches to be respectful to Stooq API
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }
    
    console.log(`Bulk fetch completed: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`);
    
    res.json({
      status: 'success',
      message: `Bulk fetch completed for ${targetSymbols.length} symbols`,
      results
    });
    
  } catch (error) {
    console.error('Error in bulk fetch:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform bulk fetch',
      error: error.message
    });
  }
});

// New API endpoint: Get data freshness status
app.get('/api/data-freshness', async (req, res) => {
  try {
    const { symbol, limit = 100 } = req.query;
    
    let sql = `
      SELECT 
        df.symbol,
        s.name,
        s.sector,
        df.last_updated,
        df.status,
        df.error_count,
        df.last_error,
        hp.latest_date,
        hp.latest_close
      FROM data_freshness df
      LEFT JOIN symbols s ON df.symbol = s.symbol
      LEFT JOIN latest_prices hp ON df.symbol = hp.symbol
    `;
    
    const params = [];
    
    if (symbol) {
      sql += ` WHERE df.symbol = ?`;
      params.push(symbol.toUpperCase());
    }
    
    sql += ` ORDER BY df.last_updated DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const stmt = db.prepare(sql);
    const results = stmt.all(...params);
    
    res.json({
      status: 'success',
      data: results,
      total: results.length
    });
    
  } catch (error) {
    console.error('Error fetching data freshness:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch data freshness',
      error: error.message
    });
  }
});

// New API endpoint: Get symbol price summary
app.get('/api/symbols/:symbol/price-summary', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    
    // Check if the symbol exists in the unified table
    db.get(`SELECT COUNT(*) as count FROM historical_prices WHERE symbol = ?`, [upperSymbol], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          status: 'error',
          message: 'Database error',
          error: err.message
        });
      }
      
      if (row.count === 0) {
        return res.status(404).json({
          status: 'error',
          message: `No price data found for symbol '${symbol}'`
        });
      }
      
      // Use callback version for proper results
      db.get(`SELECT date, close FROM historical_prices WHERE symbol = ? ORDER BY date DESC LIMIT 1`, [upperSymbol], (err, latestPrice) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            status: 'error',
            message: 'Database error',
            error: err.message
          });
        }
        
        if (!latestPrice) {
          return res.status(404).json({
            status: 'error',
            message: `No price data found for symbol '${symbol}'`
          });
        }
        
        // Get recent prices
        db.all(`SELECT date, close FROM historical_prices WHERE symbol = ? ORDER BY date DESC LIMIT 5`, [upperSymbol], (err, recentPrices) => {
          if (err) {
            console.error('Database error getting recent prices:', err);
            recentPrices = [];
          }
          
          res.json({
            status: 'success',
            symbol: upperSymbol,
            latestPrice: latestPrice.close,
            latestDate: latestPrice.date,
            recentPrices: recentPrices || [],
            dataPoints: (recentPrices || []).length
          });
        });
      });
    });
  } catch (error) {
    console.error('Error fetching price summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch price summary',
      error: error.message
    });
  }
});

// New API endpoint: Refresh specific symbol data
app.post('/api/symbols/:symbol/refresh', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { startDate = '2020-01-01', endDate = null } = req.body;
    
    console.log(`Refreshing data for ${symbol}`);
    
    // Fetch from Stooq using the same function as other endpoints
    const historicalData = await fetchStooqData(symbol);
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('No historical data received from Stooq');
    }
    
    // Use the historical data directly instead of parsing CSV
    if (!historicalData || historicalData.length === 0) {
      throw new Error('No historical data received from Stooq');
    }
    
    // Filter out any invalid data rows
    const dataRows = historicalData.filter(row => 
      row.date && row.close && !isNaN(row.close)
    );
    
    if (dataRows.length === 0) {
      throw new Error('No valid data rows found');
    }
    
    // Update database
    db.serialize(() => {
      // Delete existing data
      const deleteStmt = db.prepare('DELETE FROM historical_prices WHERE symbol = ?');
      deleteStmt.run(symbol.toUpperCase());
      
      // Insert new data
      const insertStmt = db.prepare(`
        INSERT INTO historical_prices (symbol, date, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      let insertedRows = 0;
      for (const row of dataRows) {
        const date = row.date;
        const open = row.open || null;
        const high = row.high || null;
        const low = row.low || null;
        const close = row.close || null;
        const volume = row.volume || null;
        
        if (date && close && !isNaN(close)) {
          insertStmt.run(symbol.toUpperCase(), date, open, high, low, close, volume);
          insertedRows++;
        }
      }
      
      // Update freshness
      const upsertFreshness = db.prepare(`
        INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count)
        VALUES (?, CURRENT_TIMESTAMP, 'active', 0)
      `);
      upsertFreshness.run(symbol.toUpperCase());
    });
    
    res.json({
      status: 'success',
      message: `Successfully refreshed data for ${symbol}`,
      rowsInserted: dataRows.length,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Error refreshing ${req.params.symbol}:`, error);
    res.status(500).json({
      status: 'error',
      message: `Failed to refresh data for ${req.params.symbol}`,
      error: error.message
    });
  }
});

// Manual trigger for US symbols population
app.post('/api/admin/populate-symbols', async (req, res) => {
    try {
        console.log('🔄 Manual trigger for US symbols population...');
        
        // Check if population is already running
        if (global.populationInProgress) {
            return res.status(409).json({
                status: 'error',
                message: 'Population already in progress'
            });
        }
        
        global.populationInProgress = true;
        
        // Start population in background
        populateAllUSSymbols()
            .then(() => {
                global.populationInProgress = false;
                console.log('✅ Manual population completed');
            })
            .catch(error => {
                global.populationInProgress = false;
                console.error('❌ Manual population failed:', error);
            });
        
        res.json({
            status: 'success',
            message: 'US symbols population started',
            note: 'Check server logs for progress'
        });
        
    } catch (error) {
        console.error('Error triggering population:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to trigger population',
            error: error.message
        });
    }
});

// Check population status
app.get('/api/admin/population-status', (req, res) => {
    res.json({
        status: 'success',
        populationInProgress: global.populationInProgress || false,
        message: global.populationInProgress ? 'Population in progress' : 'No population running'
    });
});

// Test bulk download availability
app.get('/api/admin/test-bulk-download', async (req, res) => {
    try {
        console.log('🧪 Testing bulk download availability...');
        const result = await attemptBulkDownload();
        
        res.json({
            status: 'success',
            bulk_download_test: result,
            message: 'Bulk download test completed'
        });
        
    } catch (error) {
        console.error('Error testing bulk download:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to test bulk download',
            error: error.message
        });
    }
});

// Get comprehensive database health report
app.get('/api/admin/database-health', (req, res) => {
    db.serialize(() => {
        // Get overall statistics
        const overallQuery = `
            SELECT 
                COUNT(DISTINCT symbol) as total_symbols,
                COUNT(*) as total_price_records,
                AVG(records_per_symbol) as avg_records_per_symbol
            FROM (
                SELECT symbol, COUNT(*) as records_per_symbol
                FROM historical_prices
                GROUP BY symbol
            ) symbol_counts
        `;
        
        db.get(overallQuery, [], (err, overallResult) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to get overall statistics',
                    error: err.message
                });
            }
            
            // Get data freshness analysis
            const freshnessQuery = `
                SELECT 
                    status,
                    COUNT(*) as symbol_count,
                    AVG(CAST((julianday('now') - julianday(last_updated)) * 24 AS INTEGER)) as avg_hours_since_update
                FROM data_freshness
                GROUP BY status
            `;
            
            db.all(freshnessQuery, [], (err, freshnessResults) => {
                if (err) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to get freshness analysis',
                        error: err.message
                    });
                }
                
                // Get symbols that need updates
                const needsUpdateQuery = `
                    SELECT 
                        hp.symbol,
                        hp.record_count,
                        hp.latest_date,
                        df.last_updated,
                        df.status,
                        df.error_count,
                        CASE 
                            WHEN hp.latest_date IS NULL THEN 'No data'
                            WHEN df.last_updated IS NULL THEN 'Never updated'
                            WHEN julianday('now') - julianday(df.last_updated) > 1 THEN 'Stale data'
                            WHEN julianday('now') - julianday(hp.latest_date) > 5 THEN 'Outdated data'
                            ELSE 'Up to date'
                        END as update_status
                    FROM (
                        SELECT symbol, COUNT(*) as record_count, MAX(date) as latest_date
                        FROM historical_prices
                        GROUP BY symbol
                    ) hp
                    LEFT JOIN data_freshness df ON hp.symbol = df.symbol
                    ORDER BY 
                        CASE update_status
                            WHEN 'No data' THEN 1
                            WHEN 'Never updated' THEN 2
                            WHEN 'Stale data' THEN 3
                            WHEN 'Outdated data' THEN 4
                            ELSE 5
                        END,
                        df.error_count DESC
                    LIMIT 20
                `;
                
                db.all(needsUpdateQuery, [], (err, updateResults) => {
                    if (err) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to get update analysis',
                            error: err.message
                        });
                    }
                    
                    res.json({
                        status: 'success',
                        health_report: {
                            overall: {
                                total_symbols: overallResult.total_symbols || 0,
                                total_price_records: overallResult.total_price_records || 0,
                                avg_records_per_symbol: Math.round(overallResult.avg_records_per_symbol || 0)
                            },
                            freshness: freshnessResults,
                            symbols_needing_updates: updateResults,
                            recommendations: generateHealthRecommendations(overallResult, freshnessResults, updateResults)
                        }
                    });
                });
            });
        });
    });
});

// Helper function to generate health recommendations
function generateHealthRecommendations(overall, freshness, updates) {
    const recommendations = [];
    
    // Check data coverage
    if (overall.total_symbols < 100) {
        recommendations.push('⚠️ Low symbol coverage - consider adding more symbols');
    }
    
    // Check data freshness
    const staleSymbols = updates.filter(s => s.update_status !== 'Up to date').length;
    if (staleSymbols > 0) {
        recommendations.push(`🔄 ${staleSymbols} symbols need updates - run population process`);
    }
    
    // Check error rates
    const errorSymbols = updates.filter(s => s.error_count > 0).length;
    if (errorSymbols > 0) {
        recommendations.push(`❌ ${errorSymbols} symbols have errors - investigate data quality`);
    }
    
    // Check data completeness
    if (overall.avg_records_per_symbol < 100) {
        recommendations.push('📊 Low data completeness - some symbols may have insufficient historical data');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('✅ Database is healthy and up-to-date');
    }
    
    return recommendations;
}

// Get database summary (simplified version)
app.get('/api/admin/database-summary', (req, res) => {
    db.serialize(() => {
        // Get symbol counts by exchange
        const exchangeQuery = `
            SELECT 
                exchange,
                COUNT(*) as symbol_count,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
            FROM symbols 
            GROUP BY exchange
        `;
        
        db.all(exchangeQuery, [], (err, exchangeResults) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to get exchange summary',
                    error: err.message
                });
            }
            
            // Get total historical price records
            db.get('SELECT COUNT(*) as total_records FROM historical_prices', (err, priceResult) => {
                if (err) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to get price records count',
                        error: err.message
                    });
                }
                
                // Get recent activity
                db.get(`
                    SELECT 
                        COUNT(*) as recent_symbols,
                        MAX(last_updated) as last_update
                    FROM data_freshness 
                    WHERE last_updated > datetime('now', '-1 day')
                `, (err, recentResult) => {
                    if (err) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to get recent activity',
                            error: err.message
                        });
                    }
                    
                    res.json({
                        status: 'success',
                        summary: {
                            exchanges: exchangeResults,
                            total_price_records: priceResult.total_records,
                            recent_activity: {
                                symbols_updated_today: recentResult.recent_symbols || 0,
                                last_update: recentResult.last_update
                            }
                        }
                    });
                });
            });
        });
    });
});

// Get symbols that need updates
app.get('/api/admin/symbols-needing-updates', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    
    db.serialize(() => {
        const needsUpdateQuery = `
            SELECT 
                hp.symbol,
                hp.record_count,
                hp.latest_date,
                df.last_updated,
                df.status,
                df.error_count,
                CASE 
                    WHEN hp.latest_date IS NULL THEN 'No data'
                    WHEN df.last_updated IS NULL THEN 'Never updated'
                    WHEN julianday('now') - julianday(df.last_updated) > 1 THEN 'Stale data'
                    WHEN julianday('now') - julianday(hp.latest_date) > 5 THEN 'Outdated data'
                    ELSE 'Up to date'
                END as update_status,
                CASE 
                    WHEN hp.latest_date IS NULL THEN 1
                    WHEN df.last_updated IS NULL THEN 2
                    WHEN julianday('now') - julianday(df.last_updated) > 1 THEN 3
                    WHEN julianday('now') - julianday(hp.latest_date) > 5 THEN 4
                    ELSE 5
                END as priority
            FROM (
                SELECT symbol, COUNT(*) as record_count, MAX(date) as latest_date
                FROM historical_prices
                GROUP BY symbol
            ) hp
            LEFT JOIN data_freshness df ON hp.symbol = df.symbol
            WHERE update_status != 'Up to date'
            ORDER BY priority ASC, df.error_count DESC
            LIMIT ?
        `;
        
        db.all(needsUpdateQuery, [limit], (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to get symbols needing updates',
                    error: err.message
                });
            }
            
            res.json({
                status: 'success',
                symbols_needing_updates: results,
                count: results.length,
                limit: limit
            });
        });
    });
});

// Serve static files (must be last to not interfere with API routes)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all route for SPA routing (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Function to fetch all US symbols from Stooq and populate database
async function populateAllUSSymbols() {
    console.log('🔄 Starting comprehensive US symbols population...');
    console.log('📊 Target: Real US symbols from SEC + Major ETFs');
    
    // First, attempt bulk download to see if it's available
    console.log('🚀 Attempting bulk download first...');
    const bulkResult = await attemptBulkDownload();
    
    if (bulkResult.accessible && bulkResult.hasDownloads) {
        console.log('🎯 Bulk download available! This would be much faster than individual requests.');
        console.log('💡 Consider implementing bulk download processing for production use.');
    } else if (bulkResult.accessible) {
        console.log('⚠️ Bulk URLs accessible but no obvious downloads found.');
        console.log('💡 May need to implement custom scraping logic for bulk data.');
    } else {
        console.log('❌ Bulk download not accessible, proceeding with individual symbol requests.');
    }
    
    // Define the symbol categories
    const symbolCategories = [
        { name: 'US Stocks (SEC)', prefix: 'us_stocks', type: 'stock', source: 'sec' },
        { name: 'Major ETFs', prefix: 'major_etfs', type: 'etf', source: 'curated' }
    ];
    
    // Add ETF symbols to the stock list for comprehensive coverage
    console.log('🔄 Adding ETF symbols to the main symbol list for comprehensive coverage...');
    
    let totalSymbolsProcessed = 0;
    let totalSymbolsSuccess = 0;
    let totalSymbolsFailed = 0;
    const startTime = Date.now();
    
    // Real-time rate tracking
    let recentSymbolsProcessed = 0;
    let recentStartTime = Date.now();
    const RATE_UPDATE_INTERVAL = 25; // Update rate every 25 symbols
    
    for (const category of symbolCategories) {
        console.log(`\n📊 Processing ${category.name}...`);
        
        try {
            let symbols = [];
            
            // Fetch symbols based on category
            if (category.source === 'sec') {
                const stockSymbols = await fetchSECCompanyTickers();
                const etfSymbols = await fetchETFSymbols();
                // Combine stocks and ETFs for comprehensive coverage
                symbols = [...stockSymbols, ...etfSymbols];
                console.log(`📊 Combined: ${stockSymbols.length} stocks + ${etfSymbols.length} ETFs = ${symbols.length} total symbols`);
            } else if (category.source === 'curated') {
                symbols = await fetchETFSymbols();
            }
            
            console.log(`✅ Found ${symbols.length} symbols for ${category.name}`);
            
            // Process each symbol with better progress tracking
            for (let i = 0; i < symbols.length; i++) {
                const symbol = symbols[i];
                totalSymbolsProcessed++;
                
                try {
                    // Add symbol to database if not exists
                    await addSymbolToDatabase(symbol, category.type, category.name);
                    
                    // Fetch historical data (with rate limiting)
                    const rowsInserted = await fetchAndStoreHistoricalData(symbol);
                    totalSymbolsSuccess++;
                    
                    // Progress update every 25 symbols with real-time rate tracking
                    if (totalSymbolsProcessed % RATE_UPDATE_INTERVAL === 0) {
                        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                        const overallRate = (totalSymbolsProcessed / elapsed).toFixed(1);
                        
                        // Calculate recent rate (last 25 symbols)
                        const recentElapsed = ((Date.now() - recentStartTime) / 1000).toFixed(1);
                        const recentRate = recentElapsed > 0 ? (RATE_UPDATE_INTERVAL / recentElapsed).toFixed(1) : 'N/A';
                        
                        const successRate = ((totalSymbolsSuccess / totalSymbolsProcessed) * 100).toFixed(1);
                        console.log(`📈 Progress: ${totalSymbolsProcessed} symbols processed (Overall: ${overallRate}/sec, Recent: ${recentRate}/sec, ${successRate}% success) - ${symbol} added with ${rowsInserted} data points`);
                        
                        // Reset recent tracking
                        recentSymbolsProcessed = 0;
                        recentStartTime = Date.now();
                    }
                    
                    // Track recent processing for rate calculation
                    recentSymbolsProcessed++;
                    
                    // Rate limiting: wait 25ms between requests (40 req/sec - more aggressive but still respectful)
                    await new Promise(resolve => setTimeout(resolve, 25));
                    
                } catch (error) {
                    console.log(`⚠️ Failed to process ${symbol}: ${error.message}`);
                    totalSymbolsFailed++;
                    
                    // If we have too many failures, slow down
                    if (totalSymbolsFailed > 50) {
                        console.log(`🔄 Too many failures, increasing delay to 200ms`);
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }
            
            console.log(`✅ Completed ${category.name}: ${symbols.length} symbols processed`);
            
        } catch (error) {
            console.error(`❌ Error processing ${category.name}:`, error);
        }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎯 US Symbols Population Complete!`);
    console.log(`⏱️ Total Time: ${totalTime} seconds`);
    console.log(`📊 Total Processed: ${totalSymbolsProcessed}`);
    console.log(`✅ Successful: ${totalSymbolsSuccess}`);
    console.log(`❌ Failed: ${totalSymbolsFailed}`);
    console.log(`📈 Success Rate: ${((totalSymbolsSuccess / totalSymbolsProcessed) * 100).toFixed(1)}%`);
    
    // Log database statistics
    logDatabaseStats();
}

// Function to fetch symbols from SEC company tickers
async function fetchSECCompanyTickers() {
    try {
        console.log('🔍 Fetching SEC company tickers...');
        
        // Try multiple approaches to get SEC data
        const secUrls = [
            'https://www.sec.gov/files/company_tickers.json',
            'https://www.sec.gov/files/company_tickers_exchange.json',
            'https://www.sec.gov/files/company_tickers_mf.json'
        ];
        
        let secData = null;
        
        for (const url of secUrls) {
            try {
                console.log(`📡 Trying SEC URL: ${url}`);
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; StockAnalysis/1.0)',
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Successfully fetched SEC data from ${url}`);
                    secData = data;
                    break;
                } else {
                    console.log(`⚠️ SEC URL ${url} returned status: ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ Failed to fetch from ${url}: ${error.message}`);
            }
        }
        
        if (!secData) {
            console.log('⚠️ Could not fetch SEC data, falling back to comprehensive symbol list');
            return fetchComprehensiveSymbolList();
        }
        
        // Parse SEC data and extract symbols
        const symbols = [];
        
        if (secData && typeof secData === 'object') {
            // Handle different SEC data formats
            if (Array.isArray(secData)) {
                // Array format
                secData.forEach(company => {
                    if (company.ticker && typeof company.ticker === 'string') {
                        symbols.push(company.ticker.toUpperCase());
                    }
                });
            } else {
                // Object format (most common)
                Object.values(secData).forEach(company => {
                    if (company && company.ticker && typeof company.ticker === 'string') {
                        symbols.push(company.ticker.toUpperCase());
                    }
                });
            }
        }
        
        console.log(`📊 Extracted ${symbols.length} symbols from SEC data`);
        
        // Remove duplicates and filter valid symbols
        const uniqueSymbols = [...new Set(symbols)].filter(symbol => 
            symbol && symbol.length <= 5 && /^[A-Z]+$/.test(symbol)
        );
        
        console.log(`✅ Final unique symbols: ${uniqueSymbols.length}`);
        
        return uniqueSymbols;
        
    } catch (error) {
        console.error('❌ Error fetching SEC company tickers:', error);
        console.log('🔄 Falling back to comprehensive symbol list');
        return fetchComprehensiveSymbolList();
    }
}

// Fallback function for comprehensive symbol list
function fetchComprehensiveSymbolList() {
    console.log('📋 Using comprehensive fallback symbol list...');
    
    const comprehensiveSymbols = [
        // Major US Stocks (Top 500+ by market cap)
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
        'PYPL', 'INTC', 'AMD', 'QCOM', 'TXN', 'AVGO', 'CSCO', 'PEP', 'COST', 'ABNB',
        'SBUX', 'TMUS', 'CMCSA', 'ADP', 'MDLZ', 'GILD', 'REGN', 'VRTX', 'KLAC', 'LRCX',
        'MU', 'ADI', 'ASML', 'SNPS', 'CDNS', 'MELI', 'CHTR', 'MAR', 'BKNG', 'ORLY',
        'PAYX', 'ROST', 'IDXX', 'DXCM', 'CPRT', 'FAST', 'CTAS', 'ODFL', 'CTSH', 'WDAY',
        'ZM', 'PTON', 'CRWD', 'OKTA', 'TEAM', 'PLTR', 'SNOW', 'DDOG', 'NET', 'SQ',
        'SHOP', 'ROKU', 'SPOT', 'PINS', 'SNAP', 'UBER', 'LYFT', 'DASH', 'GRAB',
        'RBLX', 'HOOD', 'COIN', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'BIDU', 'JD',
        'PDD', 'BABA', 'TCEHY', 'NTES', 'BILI', 'IQ', 'HUYA', 'DOYU', 'TME', 'VIPS',
        'BIIB', 'ALGN', 'ISRG', 'ILMN', 'WAT', 'TMO', 'DHR', 'ABT', 'JNJ', 'PFE',
        'MRK', 'LLY', 'UNH', 'ANTM', 'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C',
        'USB', 'PNC', 'TFC', 'COF', 'AXP', 'V', 'MA', 'DFS', 'SYF', 'ALLY',
        'KEY', 'HBAN', 'FITB', 'ZION', 'HD', 'LOW', 'TGT', 'WMT', 'TJX', 'BURL',
        'ULTA', 'LULU', 'NKE', 'UA', 'SKX', 'FL', 'FOSL', 'GPS', 'ANF', 'URBN',
        'GES', 'JWN', 'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'BKR', 'NOV',
        'FTI', 'WMB', 'KMI', 'OKE', 'MPC', 'VLO', 'PSX', 'HES', 'DVN', 'PXD',
        'APA', 'OXY', 'DUK', 'SO', 'D', 'EXC', 'AEP', 'DTE', 'EIX', 'PEG',
        'WEC', 'XEL', 'DIS', 'MCD', 'KO', 'PG', 'ABBV', 'ACN', 'LLY', 'TXN',
        'VZ', 'UNH', 'CI', 'HUM', 'AET', 'CNC', 'WCG', 'DVA', 'HCA', 'UHS',
        'THC', 'CYH', 'LPNT', 'KND', 'ADUS', 'AMED', 'CHE', 'SEM', 'ENSG', 'ACHC',
        'RF', 'HBHC', 'STI', 'BBT', 'RBLX', 'HOOD', 'COIN', 'RIVN', 'LCID', 'NIO',
        'XPEV', 'LI', 'BIDU', 'JD', 'PDD', 'BABA', 'TCEHY', 'NTES', 'BILI', 'IQ',
        'HUYA', 'DOYU', 'TME', 'VIPS', 'BIIB', 'ALGN', 'ISRG', 'ILMN', 'WAT',
        'TMO', 'DHR', 'ABT', 'JNJ', 'PFE', 'MRK', 'LLY', 'UNH', 'ANTM', 'JPM',
        'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'COF', 'AXP',
        'V', 'MA', 'DFS', 'SYF', 'ALLY', 'KEY', 'HBAN', 'FITB', 'ZION', 'HD',
        'LOW', 'TGT', 'WMT', 'TJX', 'BURL', 'ULTA', 'LULU', 'NKE', 'UA', 'SKX',
        'FL', 'FOSL', 'GPS', 'ANF', 'URBN', 'GES', 'JWN', 'XOM', 'CVX', 'COP',
        'EOG', 'SLB', 'HAL', 'BKR', 'NOV', 'FTI', 'WMB', 'KMI', 'OKE', 'MPC',
        'VLO', 'PSX', 'HES', 'DVN', 'PXD', 'APA', 'OXY', 'DUK', 'SO', 'D',
        'EXC', 'AEP', 'DTE', 'EIX', 'PEG', 'WEC', 'XEL', 'DIS', 'MCD', 'KO',
        'PG', 'ABBV', 'ACN', 'LLY', 'TXN', 'VZ', 'UNH', 'CI', 'HUM', 'AET',
        'CNC', 'WCG', 'DVA', 'HCA', 'UHS', 'THC', 'CYH', 'LPNT', 'KND', 'ADUS',
        'AMED', 'CHE', 'SEM', 'ENSG', 'ACHC', 'RF', 'HBHC', 'STI', 'BBT'
    ];
    
    return comprehensiveSymbols;
}

// Function to fetch symbols for a specific exchange (now uses SEC data)
async function fetchExchangeSymbols(exchangePrefix, expectedCount) {
    console.log(`🔍 Fetching symbols for ${exchangePrefix}...`);
    
    // Try to get SEC company tickers first
    const secSymbols = await fetchSECCompanyTickers();
    
    if (secSymbols && secSymbols.length > 0) {
        console.log(`✅ Using ${secSymbols.length} symbols from SEC data`);
        return secSymbols;
    }
    
    // Fallback to comprehensive list if SEC fails
    console.log('⚠️ Falling back to comprehensive symbol list');
    return fetchComprehensiveSymbolList();
}

// Function to fetch ETF symbols from reliable sources
async function fetchETFSymbols() {
    console.log('🔍 Fetching ETF symbols...');
    
    // Major ETF symbols that are definitely active
    const etfSymbols = [
        // Major Market ETFs
        'SPY', 'VOO', 'IVV', 'VTI', 'VEA', 'VWO', 'BND', 'AGG', 'TLT', 'GLD',
        'SLV', 'USO', 'XLE', 'XLF', 'XLV', 'XLI', 'XLP', 'XLY', 'XLU', 'XLB',
        'IWM', 'EFA', 'EEM', 'IEMG', 'ACWI', 'ACWX', 'VXUS', 'VT', 'BNDX', 'VWOB',
        // Tech & Growth ETFs
        'QQQ', 'TQQQ', 'SQQQ', 'XLK', 'VGT', 'SOXL', 'SOXS', 'LABU', 'LABD', 'FAS',
        'FAZ', 'ERX', 'ERY', 'DPST', 'DRN', 'DRV', 'TMF', 'TMV', 'UPRO', 'SPXL',
        'SPXS', 'SPXU', 'UDOW', 'SDOW', 'TZA', 'TNA', 'UVXY', 'SVXY', 'VIXY',
        // Sector ETFs
        'XLRE', 'XLC', 'ARKK', 'ARKW', 'ARKF', 'ARKG', 'ARKQ', 'ARKX', 'TAN', 'ICLN',
        'PBW', 'DRIV', 'ROBO', 'BOTZ', 'AIQ', 'BLOK', 'FINX', 'HACK', 'IBB', 'XBI',
        'IHI', 'IHF', 'VNQ', 'IYR', 'SCHH', 'RWR', 'ICF', 'XLRE'
    ];
    
    console.log(`✅ Found ${etfSymbols.length} ETF symbols`);
    return etfSymbols;
}

// Note: Removed generateAdditionalSymbols function - now using real SEC data

// Function to log database statistics
function logDatabaseStats() {
    return new Promise((resolve) => {
        db.serialize(() => {
            // Count symbols
            db.get('SELECT COUNT(*) as count FROM symbols', (err, result) => {
                if (err) {
                    console.log('❌ Error counting symbols:', err.message);
                    resolve();
                    return;
                }
                const symbolCount = result.count;
                
                // Count historical price records
                db.get('SELECT COUNT(*) as count FROM historical_prices', (err, result) => {
                    if (err) {
                        console.log('❌ Error counting historical prices:', err.message);
                        resolve();
                        return;
                    }
                    const priceCount = result.count;
                    
                    // Count active symbols
                    db.get('SELECT COUNT(*) as count FROM symbols WHERE is_active = 1', (err, result) => {
                        if (err) {
                            console.log('❌ Error counting active symbols:', err.message);
                            resolve();
                            return;
                        }
                        const activeCount = result.count;
                        
                        console.log('\n📊 Database Statistics:');
                        console.log(`   Total Symbols: ${symbolCount}`);
                        console.log(`   Active Symbols: ${activeCount}`);
                        console.log(`   Historical Price Records: ${priceCount.toLocaleString()}`);
                        console.log(`   Average Records per Symbol: ${Math.round(priceCount / symbolCount)}`);
                        
                        resolve();
                    });
                });
            });
        });
    });
}

// Check if population should be skipped (for development/testing)
const SKIP_POPULATION = process.env.SKIP_POPULATION === 'true' || process.argv.includes('--skip-population');

// Function to add symbol to database
async function addSymbolToDatabase(symbol, type, exchange) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO symbols (symbol, name, sector, market_cap, exchange, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(symbol, `${symbol} ${type}`, type.toUpperCase(), 'Unknown', exchange.toUpperCase(), 1, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Function to check local database for existing data
async function checkLocalDatabaseData(symbol) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Check if we have data for this symbol
            const checkQuery = `
                SELECT 
                    COUNT(*) as record_count,
                    MIN(date) as earliest_date,
                    MAX(date) as latest_date,
                    MAX(last_updated) as last_updated
                FROM historical_prices hp
                LEFT JOIN data_freshness df ON hp.symbol = df.symbol
                WHERE hp.symbol = ?
            `;
            
            db.get(checkQuery, [symbol.toUpperCase()], (err, result) => {
                if (err) {
                    reject(new Error(`Database check failed: ${err.message}`));
                    return;
                }
                
                const dataStatus = {
                    hasData: result.record_count > 0,
                    recordCount: result.record_count || 0,
                    earliestDate: result.earliest_date,
                    latestDate: result.latest_date,
                    lastUpdated: result.last_updated,
                    needsUpdate: false,
                    updateReason: null
                };
                
                // Determine if update is needed
                if (!dataStatus.hasData) {
                    dataStatus.needsUpdate = true;
                    dataStatus.updateReason = 'No data exists';
                } else {
                    // Check if data is recent enough (within last 24 hours)
                    const lastUpdate = new Date(dataStatus.lastUpdated);
                    const now = new Date();
                    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
                    
                    if (hoursSinceUpdate > 24) {
                        dataStatus.needsUpdate = true;
                        dataStatus.updateReason = `Data is ${hoursSinceUpdate.toFixed(1)} hours old`;
                    }
                    
                    // Check if we have recent data (within last 5 trading days)
                    if (dataStatus.latestDate) {
                        const latestDate = new Date(dataStatus.latestDate);
                        const tradingDaysDiff = Math.floor((now - latestDate) / (1000 * 60 * 60 * 24));
                        
                        if (tradingDaysDiff > 5) {
                            dataStatus.needsUpdate = true;
                            dataStatus.updateReason = `Latest data is ${tradingDaysDiff} days old`;
                        }
                    }
                }
                
                resolve(dataStatus);
            });
        });
    });
}

// Function to fetch and store historical data with smart delta updates
async function fetchAndStoreHistoricalData(symbol) {
    try {
        // First, check what we already have in the local database
        console.log(`🔍 Checking local database for ${symbol}...`);
        const localDataStatus = await checkLocalDatabaseData(symbol);
        
        if (!localDataStatus.needsUpdate) {
            console.log(`✅ ${symbol}: Local data is up-to-date (${localDataStatus.recordCount} records, last updated: ${localDataStatus.lastUpdated})`);
            return localDataStatus.recordCount;
        }
        
        console.log(`📥 ${symbol}: ${localDataStatus.updateReason} - fetching new data...`);
        
        // Fetch new data from Stooq
        const historicalData = await fetchStooqData(symbol);
        
        if (!historicalData || historicalData.length === 0) {
            throw new Error('No historical data received');
        }
        
        // Store in database with smart merging
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                let insertedRows = 0;
                let updatedRows = 0;
                
                // Prepare statements
                const insertStmt = db.prepare(`
                    INSERT OR REPLACE INTO historical_prices (symbol, date, open, high, low, close, volume)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                
                // Process each data row
                for (const row of historicalData) {
                    if (row.date && row.close && !isNaN(row.close)) {
                        // Check if this date already exists
                        const existingQuery = `
                            SELECT COUNT(*) as record_count FROM historical_prices 
                            WHERE symbol = ? AND date = ?
                        `;
                        
                        db.get(existingQuery, [symbol.toUpperCase(), row.date], (err, existing) => {
                            if (err) {
                                console.log(`⚠️ Error checking existing data for ${symbol} ${row.date}: ${err.message}`);
                                return;
                            }
                            
                            if (existing.record_count === 0) {
                                // New data - insert
                                insertStmt.run(
                                    symbol.toUpperCase(), 
                                    row.date, 
                                    row.open || null, 
                                    row.high || null, 
                                    row.low || null, 
                                    row.close || null, 
                                    row.volume || null
                                );
                                insertedRows++;
                            } else {
                                // Existing data - update (INSERT OR REPLACE will handle this)
                                updatedRows++;
                            }
                        });
                    }
                }
                
                // Update freshness
                const upsertFreshness = db.prepare(`
                    INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count)
                    VALUES (?, CURRENT_TIMESTAMP, 'active', 0)
                `);
                upsertFreshness.run(symbol.toUpperCase());
                
                const totalProcessed = insertedRows + updatedRows;
                console.log(`✅ ${symbol}: Processed ${totalProcessed} records (${insertedRows} new, ${updatedRows} updated)`);
                
                resolve(totalProcessed);
            });
        });
        
    } catch (error) {
        // Update error count in freshness table
        try {
            const updateErrorStmt = db.prepare(`
                INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count)
                VALUES (?, CURRENT_TIMESTAMP, 'error', COALESCE((SELECT error_count FROM data_freshness WHERE symbol = ?), 0) + 1)
            `);
            updateErrorStmt.run(symbol.toUpperCase(), symbol.toUpperCase());
        } catch (dbError) {
            console.log(`⚠️ Failed to update error count for ${symbol}: ${dbError.message}`);
        }
        
        throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
    }
}

// Function to attempt bulk download from Stooq
async function attemptBulkDownload() {
    console.log('🚀 Attempting bulk download from Stooq...');
    
    try {
        // Try to access Stooq bulk data directory
        const bulkUrls = [
            'https://stooq.com/db/h/',
            'https://stooq.com/db/h/daily/us/',
            'https://stooq.com/db/h/daily/us/nasdaq_stocks/',
            'https://stooq.com/db/h/daily/us/nyse_stocks/'
        ];
        
        for (const url of bulkUrls) {
            try {
                console.log(`📡 Trying bulk URL: ${url}`);
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; StockAnalysis/1.0)',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    timeout: 10000
                });
                
                if (response.ok) {
                    const content = await response.text();
                    console.log(`✅ Bulk URL accessible: ${url}`);
                    console.log(`📊 Content length: ${content.length} characters`);
                    
                    // Check if it contains downloadable data
                    if (content.includes('.zip') || content.includes('.csv') || content.includes('download')) {
                        console.log('🎯 Found downloadable content in bulk URL!');
                        return { url, accessible: true, hasDownloads: true };
                    } else {
                        console.log('⚠️ URL accessible but no obvious downloads found');
                        return { url, accessible: true, hasDownloads: false };
                    }
                }
            } catch (error) {
                console.log(`❌ Bulk URL ${url} failed: ${error.message}`);
            }
        }
        
        console.log('❌ No bulk URLs accessible');
        return { accessible: false, hasDownloads: false };
        
    } catch (error) {
        console.error('❌ Error attempting bulk download:', error);
        return { accessible: false, hasDownloads: false };
    }
}

// Function to download bulk data for a specific exchange
async function downloadBulkExchangeData(exchange, symbols) {
    console.log(`📦 Attempting bulk download for ${exchange} (${symbols.length} symbols)...`);
    
    try {
        // Try to download a compressed file if available
        const bulkUrl = `https://stooq.com/db/h/daily/us/${exchange.toLowerCase()}_stocks.zip`;
        
        console.log(`📡 Trying bulk download: ${bulkUrl}`);
        
        const response = await fetch(bulkUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; StockAnalysis/1.0)',
                'Accept': 'application/zip,application/octet-stream'
            },
            timeout: 30000
        });
        
        if (response.ok) {
            console.log(`✅ Bulk download successful for ${exchange}!`);
            // Here you would process the ZIP file
            return { success: true, method: 'bulk_zip' };
        } else {
            console.log(`⚠️ Bulk download failed for ${exchange}, status: ${response.status}`);
            return { success: false, method: 'bulk_zip' };
        }
        
    } catch (error) {
        console.log(`❌ Bulk download error for ${exchange}: ${error.message}`);
        return { success: false, method: 'bulk_zip', error: error.message };
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stock Analysis Backend running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    
    // Start populating US symbols after a short delay (unless skipped)
    if (!SKIP_POPULATION) {
        console.log('🚀 Starting US symbols population in 2 seconds...');
        console.log('💡 To skip population, use: SKIP_POPULATION=true npm start or --skip-population flag');
        
        setTimeout(() => {
            populateAllUSSymbols().catch(error => {
                console.error('❌ Error during US symbols population:', error);
            });
        }, 2000);
    } else {
        console.log('⏭️ Skipping US symbols population (SKIP_POPULATION=true or --skip-population flag)');
    }
});

module.exports = app;
