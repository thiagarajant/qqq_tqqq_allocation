const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Helper function to validate ETF table exists
function validateETFTable(etf, callback) {
    const tableName = `${etf.toLowerCase()}_all_history`;
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName], (err, row) => {
        if (err) {
            callback(err, false);
        } else {
            callback(null, !!row);
        }
    });
}

// Helper function to get dynamic table names
function getETFTableNames(baseETF, leveragedETF) {
    return {
        baseTable: `${baseETF.toLowerCase()}_all_history`,
        leveragedTable: `${leveragedETF.toLowerCase()}_all_history`
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
    // Query database to find available ETF data tables
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_all_history'", (err, tables) => {
        if (err) {
            console.error('Error fetching ETF tables:', err);
            return res.status(500).json({ error: 'Failed to fetch available ETFs' });
        }

        // Extract ETF symbols from table names
        const etfSymbols = tables.map(table => table.name.replace('_all_history', '').toUpperCase());
        
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
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_all_history'", (err, tables) => {
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

        tables.forEach(table => {
            const tableName = table.name;
            if (tableName.endsWith('_all_history')) {
                const symbol = tableName.replace('_all_history', '').toUpperCase();
                
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
            }
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

// Helper function to fetch data from Stooq
async function fetchStooqData(symbol) {
    const https = require('https');
    
    // Try different URL formats for Stooq
    const urls = [
        `https://stooq.com/q/d/l/?s=${symbol}&i=d`,
        `https://stooq.com/q/d/l/?s=${symbol}.us&i=d`,  // Try with .us suffix for US stocks
        `https://stooq.com/q/d/l/?s=${symbol}&i=d&f=d,o,h,l,c,v`, // Try with explicit format
    ];
    
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
    const tableName = `${etf.toLowerCase()}_all_history`;
    
    return new Promise((resolve, reject) => {
        // Simple query: just get all price data ordered by date
        const query = `
            SELECT date, close
            FROM ${tableName}
            ORDER BY date
        `;

        db.all(query, [], (err, rows) => {
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

    // Validate ETF tables exist
    const { baseTable, leveragedTable } = getETFTableNames(baseETF, leveragedETF);
    
    validateETFTable(baseETF, (err, baseExists) => {
        if (err || !baseExists) {
            return res.status(400).json({ error: `ETF data not available for ${baseETF}` });
        }
        
        validateETFTable(leveragedETF, (err, leveragedExists) => {
            if (err || !leveragedExists) {
                return res.status(400).json({ error: `ETF data not available for ${leveragedETF}` });
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

// Helper function to execute summary query with dynamic ETF parameters
async function executeSummaryQuery(etf, threshold) {
    const tableName = `${etf.toLowerCase()}_all_history`;
    
    return new Promise((resolve, reject) => {
    // Simple query: just get all price data ordered by date
    const query = `
        SELECT date, close
        FROM ${tableName}
        ORDER BY date
    `;

    db.all(query, [], (err, rows) => {
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
    const tableName = `${etf.toLowerCase()}_all_history`;
    
    return new Promise((resolve, reject) => {
        // Get price data
        const priceQuery = `
            SELECT date, close
            FROM ${tableName}
            ORDER BY date
        `;
        
        // Get cycle data - simple query
        const cycleQuery = `
            SELECT date, close
            FROM ${tableName}
            ORDER BY date
        `;

        // Execute both queries
        db.all(priceQuery, [], (err, priceRows) => {
            if (err) {
                console.error('Database error:', err);
                reject(new Error('Database error'));
                return;
            }

            db.all(cycleQuery, [], (err, cycleRows) => {
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

    // Validate ETF tables exist
    const { baseTable, leveragedTable } = getETFTableNames(baseETF, leveragedETF);
    
    validateETFTable(baseETF, (err, baseExists) => {
        if (err || !baseExists) {
            return res.status(400).json({ error: `ETF data not available for ${baseETF}` });
        }
        
        validateETFTable(leveragedETF, (err, leveragedExists) => {
            if (err || !leveragedExists) {
                return res.status(400).json({ error: `ETF data not available for ${leveragedETF}` });
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
        FROM qqq_all_history
        WHERE 1=1 ${dateFilter}
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
        FROM qqq_all_history 
        ${dateFilter}
        ORDER BY date DESC 
        LIMIT ${parseInt(limit)}
    `;
    
    // Get TQQQ data
    const tqqqQuery = `
        SELECT date, close, volume 
        FROM tqqq_all_history 
        ${dateFilter}
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

    // Validate ETF tables exist
    const { baseTable, leveragedTable } = getETFTableNames(baseETF, leveragedETF);
    
    validateETFTable(baseETF, (err, baseExists) => {
        if (err || !baseExists) {
            return res.status(400).json({ error: `ETF data not available for ${baseETF}` });
        }
        
        validateETFTable(leveragedETF, (err, leveragedExists) => {
            if (err || !leveragedExists) {
                return res.status(400).json({ error: `ETF data not available for ${leveragedETF}` });
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
        WHERE date >= ? AND date <= ? 
        ORDER BY date
    `;

    // Get leveraged ETF data for the period  
    const leveragedQuery = `
        SELECT date, close 
        FROM ${leveragedTable}
        WHERE date >= ? AND date <= ? 
        ORDER BY date
    `;

    db.all(baseQuery, [startDate, endDate], (err, baseData) => {
        if (err) {
            console.error(`${baseETF} database error:`, err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (baseData.length === 0) {
            return res.status(400).json({ error: `No ${baseETF} data found for the specified date range` });
        }

        db.all(leveragedQuery, [startDate, endDate], (err, leveragedData) => {
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
          const stooqUrl = `https://stooq.com/q/d/l/?s=${symbol}&d1=${startDate}&d2=${endDate || new Date().toISOString().split('T')[0]}&i=d`;
          
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
    const tableName = `${upperSymbol.toLowerCase()}_all_history`;
    
    // Check if the symbol table exists
    const tableExistsStmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name = ?
    `);
    const tableExists = tableExistsStmt.get(tableName);
    
    if (!tableExists) {
      return res.status(404).json({
        status: 'error',
        message: `No price data found for symbol '${symbol}'`
      });
    }
    
    // Use callback version for proper results
    db.get(`SELECT date, close FROM ${tableName} ORDER BY date DESC LIMIT 1`, (err, latestPrice) => {
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
      db.all(`SELECT date, close FROM ${tableName} ORDER BY date DESC LIMIT 5`, (err, recentPrices) => {
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
    
    // Fetch from Stooq
    const stooqUrl = `https://stooq.com/q/d/l/?s=${symbol}&d1=${startDate}&d2=${endDate || new Date().toISOString().split('T')[0]}&i=d`;
    
    const response = await fetch(stooqUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    if (!csvText || csvText.includes('N/A') || csvText.length < 100) {
      throw new Error('Invalid or empty data received from Stooq');
    }
    
    // Parse and insert data (similar logic to bulk fetch)
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
    const openIndex = headers.findIndex(h => h.toLowerCase().includes('open'));
    const highIndex = headers.findIndex(h => h.toLowerCase().includes('high'));
    const lowIndex = headers.findIndex(h => h.toLowerCase().includes('low'));
    const closeIndex = headers.findIndex(h => h.toLowerCase().includes('close'));
    const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('vol'));
    
    if (dateIndex === -1 || closeIndex === -1) {
      throw new Error('Required columns not found');
    }
    
    const dataRows = lines.slice(1).filter(line => line.trim() && !line.includes('N/A'));
    
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
            insertStmt.run(symbol.toUpperCase(), date, open, high, low, close, volume);
            insertedRows++;
          }
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

// Serve static files (must be last to not interfere with API routes)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all route for SPA routing (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stock Analysis Backend running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
