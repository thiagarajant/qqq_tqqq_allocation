const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PORT || 3000;

// CSV Processing Function - Simplified version to avoid database locks
// Helper function to clean symbol name
function cleanSymbolName(symbol) {
    // Remove .US suffix if present
    return symbol.replace(/\.US$/i, '');
}

async function processCSVFile(filePath, convertToUppercase = true, preventDuplicates = true, originalFilename = null) {
    return new Promise((resolve, reject) => {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            // Extract symbol from original filename if provided, otherwise from filePath
            let symbol = originalFilename ? 
                path.basename(originalFilename, path.extname(originalFilename)) :
                path.basename(filePath, path.extname(filePath));
            
            // Clean symbol name (remove .US suffix)
            symbol = cleanSymbolName(symbol);
            
            // Convert to uppercase if requested
            if (convertToUppercase) {
                symbol = symbol.toUpperCase();
            }
            
            // Insert symbol into symbols table first (if not duplicate)
            db.run(`
                INSERT OR IGNORE INTO symbols (symbol, name, sector, market_cap, exchange, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [symbol, symbol, 'Unknown', 'Unknown', 'NASDAQ', 1], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Check if symbol was actually inserted (for duplicate detection)
                db.get('SELECT symbol FROM symbols WHERE symbol = ?', [symbol], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (row && preventDuplicates) {
                        // Check if this is a new insertion by checking if we have historical data
                        db.get('SELECT COUNT(*) as count FROM historical_prices WHERE symbol = ?', [symbol], (err, result) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            if (result.count > 0) {
                                console.log(`Skipping duplicate symbol: ${symbol} (already has data)`);
                                resolve({ symbolsAdded: 0, recordsAdded: 0 });
                                return;
                            }
                            
                            // Symbol exists but no data, so process it
                            processFileContentSimple(fileContent, symbol, resolve, reject);
                        });
                    } else {
                        // Continue processing
                        processFileContentSimple(fileContent, symbol, resolve, reject);
                    }
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

function processFileContentSimple(fileContent, symbol, resolve, reject) {
    try {
        // Parse CSV content
        const lines = fileContent.trim().split('\n');
        const headers = lines[0].split(',');
        
        // Find column indices
        const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
        const openIndex = headers.findIndex(h => h.toLowerCase().includes('open'));
        const highIndex = headers.findIndex(h => h.toLowerCase().includes('high'));
        const lowIndex = headers.findIndex(h => h.toLowerCase().includes('low'));
        const closeIndex = headers.findIndex(h => h.toLowerCase().includes('close'));
        const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('vol'));
        
        if (dateIndex === -1 || closeIndex === -1) {
            reject(new Error('Missing required columns (date, close)'));
            return;
        }
        
        // Process data rows
        const dataRows = lines.slice(1).filter(line => line.trim() && !line.includes('N/A'));
        
        if (dataRows.length === 0) {
            reject(new Error('No valid data rows found'));
            return;
        }
        
        // Prepare all valid data rows for batch insert
        const validRows = [];
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
                    validRows.push([symbol, date, open, high, low, close, volume]);
                }
            }
        }
        
        if (validRows.length === 0) {
            // No valid data, just update freshness and resolve
            db.run(`
                INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count)
                VALUES (?, CURRENT_TIMESTAMP, 'active', 0)
            `, [symbol], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ symbolsAdded: 1, recordsAdded: 0 });
                }
            });
            return;
        }
        
        // Use prepared statement for better performance
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO historical_prices (symbol, date, open, high, low, close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        let recordsInserted = 0;
        
        // Insert all rows in batch
        for (const row of validRows) {
            insertStmt.run(row, (err) => {
                if (err) {
                    insertStmt.finalize();
                    reject(err);
                    return;
                }
                recordsInserted++;
            });
        }
        
        // Finalize statement and update freshness
        insertStmt.finalize((err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Update data freshness
            db.run(`
                INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count)
                VALUES (?, CURRENT_TIMESTAMP, 'active', 0)
            `, [symbol], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ symbolsAdded: 1, recordsAdded: recordsInserted });
                }
            });
        });
        
    } catch (error) {
        reject(error);
    }
}

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Preserve original filename and path structure
    const relativePath = file.originalname;
    cb(null, relativePath);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept CSV, TXT, and ZIP files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/zip' ||
        file.originalname.toLowerCase().endsWith('.csv') ||
        file.originalname.toLowerCase().endsWith('.txt') ||
        file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, TXT, and ZIP files are allowed'), false);
    }
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Database connection
const dbPath = path.join(__dirname, '../database/market_data.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Optimize database for concurrent writes
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL'); // Write-Ahead Logging for better concurrency
      db.run('PRAGMA synchronous = NORMAL'); // Faster writes with reasonable safety
      db.run('PRAGMA cache_size = 10000'); // Larger cache for better performance
      db.run('PRAGMA temp_store = MEMORY'); // Use memory for temp tables
      db.run('PRAGMA mmap_size = 268435456'); // 256MB memory mapping
      db.run('PRAGMA auto_vacuum = INCREMENTAL'); // Incremental vacuum for better performance
      db.run('PRAGMA incremental_vacuum = 1000'); // Vacuum 1000 pages at a time
      console.log('Database optimized for concurrent operations');
    });
    
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
          
          // Database is ready for data upload - no initial dummy data
          console.log('Symbols table ready - waiting for data upload');
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
          data_source TEXT DEFAULT 'uploaded',
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

// Fetch single ETF data from local database
app.post('/api/fetch-single-etf', async (req, res) => {
    const { symbol } = req.body;
    
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
    }
    
    const upperSymbol = symbol.toUpperCase();
    console.log(`Fetching single ETF data for ${upperSymbol} from local database...`);
    
    try {
        // Fetch data from local database
        const historicalData = await fetchLocalData(upperSymbol);
        
        if (!historicalData || historicalData.length === 0) {
            return res.status(404).json({ 
                error: `No data found for symbol ${upperSymbol} in local database. Please upload data first using the Admin page.` 
            });
        }
        
        res.json({
            message: `Successfully retrieved data for ${upperSymbol} from local database`,
            symbol: upperSymbol,
            dataPoints: historicalData.length,
            dateRange: {
                start: historicalData[0]?.date,
                end: historicalData[historicalData.length - 1]?.date
            },
            status: 'success',
            source: 'local_database'
        });
    } catch (error) {
        console.error(`Error fetching data for ${upperSymbol}:`, error);
        res.status(500).json({ 
            error: `Failed to fetch data for ${upperSymbol}: ${error.message}` 
        });
    }
});

// Fetch historical data from local database only
app.post('/api/fetch-historical-data', async (req, res) => {
    const { symbol, startDate, endDate } = req.body;
    
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
    }
    
    const upperSymbol = symbol.toUpperCase();
    console.log(`Fetching historical data for ${upperSymbol} from local database...`);
    
    try {
        // Fetch data from local database
        const historicalData = await fetchLocalData(upperSymbol);
        
        if (!historicalData || historicalData.length === 0) {
            return res.status(404).json({ 
                error: `No data found for symbol ${upperSymbol} in local database. Please upload data first using the Admin page.` 
            });
        }
        
        res.json({
            message: `Successfully retrieved historical data for ${upperSymbol} from local database`,
            symbol: upperSymbol,
            dataPoints: historicalData.length,
            dateRange: {
                start: historicalData[0]?.date,
                end: historicalData[historicalData.length - 1]?.date
            },
            status: 'success',
            source: 'local_database'
        });
    } catch (error) {
        console.error(`Error fetching historical data for ${upperSymbol}:`, error);
        res.status(500).json({ 
            error: `Failed to fetch historical data for ${upperSymbol}: ${error.message}` 
        });
    }
});

// Helper function to fetch data from local database only
async function fetchLocalData(symbol) {
    console.log(`🔍 Fetching ${symbol} data from local database...`);
    
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT date, open, high, low, close, volume 
            FROM historical_prices 
            WHERE symbol = ? 
            ORDER BY date ASC
        `, [symbol.toUpperCase()], (err, rows) => {
            if (err) {
                console.error(`❌ Database error for ${symbol}:`, err);
                reject(new Error(`Database error: ${err.message}`));
                return;
            }
            
            if (rows.length === 0) {
                console.log(`⚠️ No data found in database for ${symbol}`);
                reject(new Error(`No data available for ${symbol} in local database`));
                return;
            }
            
            console.log(`✅ Found ${rows.length} data points for ${symbol} in local database`);
            
            // Convert to the expected format
            const data = rows.map(row => ({
                date: row.date,
                open: parseFloat(row.open),
                high: parseFloat(row.high),
                low: parseFloat(row.low),
                close: parseFloat(row.close),
                volume: parseInt(row.volume)
            }));
            
            resolve(data);
        });
    });
}

// Helper function to determine if a symbol is likely an ETF (for local data only)
function isETFSymbol(symbol) {
    // Common ETF patterns - kept for reference but not used for external API calls
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

// Stooq CSV parsing function removed - all data must come from uploaded CSV/TXT files

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

// Bulk fetch endpoint removed - all data must come from uploaded CSV/TXT files

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

// Refresh endpoint removed - all data must come from uploaded CSV/TXT files

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

// Get database statistics for admin panel
app.get('/api/admin/database-stats', (req, res) => {
    db.serialize(() => {
        // Get symbol counts
        db.get('SELECT COUNT(*) as total_symbols FROM symbols WHERE is_active = 1', (err, symbolResult) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to get symbol count',
                    error: err.message
                });
            }
            
            // Get price records count
            db.get('SELECT COUNT(*) as total_price_records FROM historical_prices', (err, priceResult) => {
                if (err) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to get price records count',
                        error: err.message
                    });
                }
                
                // Get last update time
                db.get(`
                    SELECT MAX(last_updated) as last_updated
                    FROM data_freshness
                `, (err, updateResult) => {
                    if (err) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to get last update time',
                            error: err.message
                        });
                    }
                    
                    // Get database file size
                    const fs = require('fs');
                    const dbPath = path.join(__dirname, '../database/market_data.db');
                    let databaseSize = 'Unknown';
                    
                    try {
                        const stats = fs.statSync(dbPath);
                        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
                        databaseSize = `${sizeInMB} MB`;
                    } catch (error) {
                        console.error('Error getting database file size:', error);
                    }
                    
                    res.json({
                        status: 'success',
                        totalSymbols: symbolResult.total_symbols,
                        totalPriceRecords: priceResult.total_price_records,
                        lastUpdated: updateResult.last_updated,
                        databaseSize: databaseSize
                    });
                });
            });
        });
    });
});

// Delete database endpoint
app.delete('/api/admin/delete-database', (req, res) => {
    db.serialize(() => {
        try {
            // Delete all data from tables
            db.run('DELETE FROM historical_prices', (err) => {
                if (err) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to delete historical prices',
                        error: err.message
                    });
                }
                
                db.run('DELETE FROM symbols', (err) => {
                    if (err) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to delete symbols',
                            error: err.message
                        });
                    }
                    
                    db.run('DELETE FROM data_freshness', (err) => {
                        if (err) {
                            return res.status(500).json({
                                status: 'error',
                                message: 'Failed to delete data freshness',
                                error: err.message
                            });
                        }
                        
                        // Reset auto-increment counters
                        db.run('DELETE FROM sqlite_sequence', (err) => {
                            if (err) {
                                console.warn('Warning: Could not reset auto-increment counters:', err.message);
                            }
                            
                            res.json({
                                status: 'success',
                                message: 'Database cleared successfully',
                                deletedRecords: {
                                    historical_prices: 'all',
                                    symbols: 'all',
                                    data_freshness: 'all'
                                }
                            });
                        });
                    });
                });
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to delete database',
                error: error.message
            });
        }
    });
});

// Upload folder and populate database endpoint
app.post('/api/admin/upload-and-populate', upload.fields([
    { name: 'files', maxCount: 50000 },
    { name: 'compressedFiles', maxCount: 10 }
]), async (req, res) => {
    const { convertToUppercase = true, preventDuplicates = true, folderName, batchNumber, totalBatches } = req.body;
    
    if ((!req.files || !req.files.files || req.files.files.length === 0) && 
        (!req.files || !req.files.compressedFiles || req.files.compressedFiles.length === 0)) {
        return res.status(400).json({
            status: 'error',
            message: 'No files uploaded'
        });
    }
    
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        let csvFiles = [];
        
        // Handle compressed files
        if (req.files.compressedFiles && req.files.compressedFiles.length > 0) {
            const compressedFile = req.files.compressedFiles[0];
            console.log(`Processing compressed file: ${compressedFile.originalname} (${compressedFile.size} bytes)`);
            
            try {
                const zip = new AdmZip(compressedFile.path);
                const zipEntries = zip.getEntries();
                
                console.log(`Found ${zipEntries.length} entries in compressed archive`);
                
                // Extract and filter CSV files from zip with recursive search
                for (const entry of zipEntries) {
                    const fileName = entry.entryName.toLowerCase();
                    console.log(`Checking entry: ${entry.entryName}`);
                    
                    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
                        // Create a temporary file for processing
                        const tempPath = path.join(uploadDir, `temp_${Date.now()}_${path.basename(entry.entryName)}`);
                        fs.writeFileSync(tempPath, entry.getData());
                        
                        csvFiles.push({
                            originalname: entry.entryName,
                            path: tempPath,
                            isTemp: true
                        });
                        
                        console.log(`✓ Extracted CSV file: ${entry.entryName}`);
                    }
                }
                
                console.log(`Successfully extracted ${csvFiles.length} CSV/TXT files from compressed archive`);
            } catch (error) {
                console.error('Error processing compressed file:', error);
                return res.status(400).json({
                    status: 'error',
                    message: 'Failed to process compressed file',
                    error: error.message
                });
            }
        }
        
        // Handle regular files
        if (req.files.files && req.files.files.length > 0) {
            const regularFiles = req.files.files.filter(file => {
                const fileName = file.originalname.toLowerCase();
                return fileName.endsWith('.csv') || fileName.endsWith('.txt');
            });
            
            csvFiles = csvFiles.concat(regularFiles);
        }
        
        if (csvFiles.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No CSV or TXT files found in uploaded folder or compressed archive'
            });
        }
        
        const isBatchUpload = batchNumber && totalBatches;
        const batchInfo = isBatchUpload ? ` (Batch ${batchNumber}/${totalBatches})` : '';
        
        console.log(`Processing ${csvFiles.length} CSV/TXT files from folder: ${folderName || 'Unknown'}${batchInfo}`);
        
        let totalSymbolsAdded = 0;
        let totalRecordsAdded = 0;
        let processedFiles = 0;
        const errors = [];
        const processedSymbols = [];
        
        // Process files in batches for better performance with large datasets
        const batchSize = 25; // Increased batch size for better performance
        const totalFiles = csvFiles.length;
        
        console.log(`Processing ${totalFiles} files in batches of ${batchSize}...`);
        
        for (let i = 0; i < totalFiles; i += batchSize) {
            const batch = csvFiles.slice(i, i + batchSize);
            const currentBatch = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(totalFiles / batchSize);
            
            const processingBatchInfo = isBatchUpload ? ` (Upload Batch ${batchNumber}/${totalBatches})` : '';
            console.log(`🔄 Processing batch ${currentBatch}/${totalBatches} (files ${i + 1}-${Math.min(i + batchSize, totalFiles)})${processingBatchInfo}`);
            
            // Process batch in parallel for better performance
            const batchPromises = batch.map(async (file) => {
                try {
                    const filePath = file.isTemp ? file.path : path.join(uploadDir, file.originalname);
                    const result = await processCSVFile(filePath, convertToUppercase, preventDuplicates, file.originalname);
                    
                    if (result.symbolsAdded > 0) {
                        // Extract symbol name from filename
                        let symbol = path.basename(file.originalname, path.extname(file.originalname));
                        // Clean symbol name (remove .US suffix)
                        symbol = cleanSymbolName(symbol);
                        const processedSymbol = convertToUppercase ? symbol.toUpperCase() : symbol;
                        processedSymbols.push(processedSymbol);
                    }
                    
                    return { success: true, result, file: file.originalname };
                } catch (error) {
                    const errorMsg = `Error processing ${file.originalname}: ${error.message}`;
                    errors.push(errorMsg);
                    console.error(errorMsg);
                    return { success: false, error: errorMsg, file: file.originalname };
                }
            });
            
            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);
            
            // Aggregate results
            for (const batchResult of batchResults) {
                if (batchResult.success) {
                    totalSymbolsAdded += batchResult.result.symbolsAdded;
                    totalRecordsAdded += batchResult.result.recordsAdded;
                    processedFiles++;
                }
            }
            
            // Log detailed progress
            const progressPercent = Math.round((processedFiles / totalFiles) * 100);
            const batchProgressInfo = isBatchUpload ? ` (Upload Batch ${batchNumber}/${totalBatches})` : '';
            console.log(`📊 Progress: ${progressPercent}% (${processedFiles}/${totalFiles} files) - Batch ${currentBatch}/${totalBatches} completed${batchProgressInfo}`);
            console.log(`📈 Current stats: ${totalSymbolsAdded} symbols, ${totalRecordsAdded} records added`);
        }
        
        // Clean up uploaded files
        const allFiles = [];
        if (req.files.files) allFiles.push(...req.files.files);
        if (req.files.compressedFiles) allFiles.push(...req.files.compressedFiles);
        
        for (const file of allFiles) {
            try {
                const filePath = path.join(uploadDir, file.originalname);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error) {
                console.warn(`Could not delete uploaded file ${file.originalname}:`, error.message);
            }
        }
        
        // Clean up temporary files from compressed archives
        for (const file of csvFiles) {
            if (file.isTemp && file.path) {
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (error) {
                    console.warn(`Could not delete temporary file ${file.path}:`, error.message);
                }
            }
        }
        
        const folderInfo = folderName ? `from folder "${folderName}"` : 'from uploaded files';
        
        res.json({
            status: 'success',
            message: `Database populated successfully ${folderInfo}`,
            symbolsAdded: totalSymbolsAdded,
            recordsAdded: totalRecordsAdded,
            filesProcessed: processedFiles,
            totalFilesUploaded: req.files.length,
            processedSymbols: processedSymbols,
            errors: errors,
            folderName: folderName,
            convertToUppercase: convertToUppercase,
            preventDuplicates: preventDuplicates
        });
        
        } catch (error) {
            console.error('Error in upload-and-populate endpoint:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal server error during file processing',
                error: error.message
            });
        }
});

// Remove duplicates from historical_prices table
app.post('/api/admin/remove-duplicates', async (req, res) => {
    console.log('🧹 Starting duplicate removal process...');
    
    try {
        const startTime = Date.now();
        
        // Get initial count
        const initialCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM historical_prices', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        console.log(`📊 Initial records: ${initialCount.toLocaleString()}`);
        
        // Remove duplicates using SQLite's ROWID
        await new Promise((resolve, reject) => {
            db.run(`
                DELETE FROM historical_prices 
                WHERE ROWID NOT IN (
                    SELECT MIN(ROWID) 
                    FROM historical_prices 
                    GROUP BY symbol, date
                )
            `, function(err) {
                if (err) {
                    console.error('Error removing duplicates:', err);
                    reject(err);
                } else {
                    const deletedCount = this.changes;
                    console.log(`🗑️ Removed ${deletedCount.toLocaleString()} duplicate records`);
                    resolve(deletedCount);
                }
            });
        });
        
        // Get final count
        const finalCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM historical_prices', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Duplicate removal completed in ${processingTime}ms`);
        console.log(`📊 Final records: ${finalCount.toLocaleString()}`);
        
        res.json({
            status: 'success',
            message: 'Duplicates removed successfully',
            initialCount: initialCount,
            finalCount: finalCount,
            duplicatesRemoved: initialCount - finalCount,
            processingTime: processingTime
        });
        
    } catch (error) {
        console.error('❌ Error in duplicate removal:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to remove duplicates',
            error: error.message
        });
    }
});

// Upload structured stock data as JSON endpoint
app.post('/api/admin/upload-structured-data', async (req, res) => {
    console.log(`📥 Received upload request with body size: ${JSON.stringify(req.body).length} characters`);
    
    const { stocks, convertToUppercase = true, preventDuplicates = true, folderName } = req.body;
    
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
        console.log('❌ No stock data provided in request');
        return res.status(400).json({
            status: 'error',
            message: 'No stock data provided'
        });
    }
    
    console.log(`📊 Processing ${stocks.length} stocks from structured data upload`);
    console.log(`📈 Estimated total records: ${stocks.reduce((sum, stock) => sum + (stock.records?.length || 0), 0)}`);
    
    try {
        console.log(`Processing ${stocks.length} stocks from structured data upload`);
        
        let totalSymbolsAdded = 0;
        let totalRecordsAdded = 0;
        const errors = [];
        
        // Process each stock
        for (const stockData of stocks) {
            const { symbol, records } = stockData;
            
            if (!symbol || !records || !Array.isArray(records) || records.length === 0) {
                errors.push(`Invalid stock data for symbol: ${symbol}`);
                continue;
            }
            
            try {
                // Clean symbol name (remove .US suffix)
                const cleanSymbol = cleanSymbolName(symbol);
                const finalSymbol = convertToUppercase ? cleanSymbol.toUpperCase() : cleanSymbol;
                
                // Check for duplicates if requested (optimized)
                if (preventDuplicates) {
                    const existingSymbol = await new Promise((resolve, reject) => {
                        db.get('SELECT 1 FROM symbols WHERE symbol = ? LIMIT 1', [finalSymbol], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                    
                    if (existingSymbol) {
                        console.log(`Skipping duplicate symbol: ${finalSymbol}`);
                        continue;
                    }
                }
                
                // Insert symbol into symbols table (non-blocking)
                db.run(`
                    INSERT OR IGNORE INTO symbols (symbol, name, sector, market_cap, exchange, is_active)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [finalSymbol, finalSymbol, 'Unknown', 'Unknown', 'NASDAQ', 1], (err) => {
                    if (err) {
                        console.error(`Error inserting symbol ${finalSymbol}:`, err);
                    }
                });
                
                // Insert price data using chunked bulk insert (handles SQLite parameter limit)
                const validRecords = records.filter(record => record.date && record.close && !isNaN(record.close));
                
                if (validRecords.length > 0) {
                    // SQLite has a limit of 999 parameters per query, so we need to chunk
                    const chunkSize = 140; // 140 records * 7 parameters = 980 parameters (under limit)
                    let recordsInserted = 0;
                    
                    for (let i = 0; i < validRecords.length; i += chunkSize) {
                        const chunk = validRecords.slice(i, i + chunkSize);
                        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
                        const values = chunk.flatMap(record => [
                            finalSymbol,
                            record.date,
                            record.open,
                            record.high,
                            record.low,
                            record.close,
                            record.volume
                        ]);
                        
                        await new Promise((resolve, reject) => {
                            db.run(`
                                INSERT INTO historical_prices (symbol, date, open, high, low, close, volume)
                                VALUES ${placeholders}
                            `, values, function(err) {
                                if (err) {
                                    console.error(`Error inserting records for ${finalSymbol}:`, err);
                                    reject(err);
                                } else {
                                    recordsInserted += this.changes || 0;
                                    resolve();
                                }
                            });
                        });
                    }
                    
                    totalRecordsAdded += recordsInserted;
                }
                
                // Update data freshness (non-blocking)
                db.run(`
                    INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count)
                    VALUES (?, CURRENT_TIMESTAMP, 'active', 0)
                `, [finalSymbol], (err) => {
                    if (err) {
                        console.error(`Error updating data freshness for ${finalSymbol}:`, err);
                    }
                });
                
                totalSymbolsAdded++;
                console.log(`✓ Processed ${finalSymbol}: ${validRecords.length} records`);
                
            } catch (error) {
                const errorMsg = `Error processing ${symbol}: ${error.message}`;
                errors.push(errorMsg);
                console.error(errorMsg);
            }
        }
        
        const folderInfo = folderName ? `from folder "${folderName}"` : 'from structured data';
        
        console.log(`✅ Upload completed successfully: ${totalSymbolsAdded} symbols, ${totalRecordsAdded} records`);
        
        res.json({
            status: 'success',
            message: `Database populated successfully ${folderInfo}`,
            symbolsAdded: totalSymbolsAdded,
            recordsAdded: totalRecordsAdded,
            errors: errors,
            folderName: folderName,
            convertToUppercase: convertToUppercase,
            preventDuplicates: preventDuplicates,
            note: 'Duplicates will be removed in background cleanup'
        });
        
    } catch (error) {
        console.error('❌ Error in upload-structured-data endpoint:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error during structured data processing',
            error: error.message
        });
    }
});

// Populate database from folder endpoint
app.post('/api/admin/populate-database', async (req, res) => {
    const { folderPath, convertToUppercase = true, preventDuplicates = true } = req.body;
    
    if (!folderPath) {
        return res.status(400).json({
            status: 'error',
            message: 'Folder path is required'
        });
    }
    
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Validate folder exists
        if (!fs.existsSync(folderPath)) {
            return res.status(400).json({
                status: 'error',
                message: `Folder does not exist: ${folderPath}`
            });
        }
        
        // Read files from folder
        const files = fs.readdirSync(folderPath);
        const csvFiles = files.filter(file => 
            file.toLowerCase().endsWith('.csv') || 
            file.toLowerCase().endsWith('.txt')
        );
        
        if (csvFiles.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No CSV or TXT files found in the specified folder'
            });
        }
        
        let totalSymbolsAdded = 0;
        let totalRecordsAdded = 0;
        let errors = [];
        
        // Process each file
        for (const file of csvFiles) {
            try {
                const filePath = path.join(folderPath, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                
                // Extract symbol from filename (remove extension)
                let symbol = path.basename(file, path.extname(file));
                
                // Clean symbol name (remove .US suffix)
                symbol = cleanSymbolName(symbol);
                
                // Convert to uppercase if requested
                if (convertToUppercase) {
                    symbol = symbol.toUpperCase();
                }
                
                // Check for duplicates if requested
                if (preventDuplicates) {
                    const existingSymbol = await new Promise((resolve, reject) => {
                        db.get('SELECT symbol FROM symbols WHERE symbol = ?', [symbol], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                    
                    if (existingSymbol) {
                        console.log(`Skipping duplicate symbol: ${symbol}`);
                        continue;
                    }
                }
                
                // Parse CSV content
                const lines = fileContent.trim().split('\n');
                const headers = lines[0].split(',');
                
                // Find column indices
                const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
                const openIndex = headers.findIndex(h => h.toLowerCase().includes('open'));
                const highIndex = headers.findIndex(h => h.toLowerCase().includes('high'));
                const lowIndex = headers.findIndex(h => h.toLowerCase().includes('low'));
                const closeIndex = headers.findIndex(h => h.toLowerCase().includes('close'));
                const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('vol'));
                
                if (dateIndex === -1 || closeIndex === -1) {
                    errors.push(`File ${file}: Missing required columns (date, close)`);
                    continue;
                }
                
                // Process data rows
                const dataRows = lines.slice(1).filter(line => line.trim() && !line.includes('N/A'));
                
                if (dataRows.length === 0) {
                    errors.push(`File ${file}: No valid data rows found`);
                    continue;
                }
                
                // Insert symbol into symbols table
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT OR IGNORE INTO symbols (symbol, name, sector, market_cap, exchange, is_active)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [symbol, symbol, 'Unknown', 'Unknown', 'NASDAQ', 1], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                
                // Insert price data
                let recordsInserted = 0;
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
                            await new Promise((resolve, reject) => {
                                db.run(`
                                    INSERT OR IGNORE INTO historical_prices (symbol, date, open, high, low, close, volume)
                                    VALUES (?, ?, ?, ?, ?, ?, ?)
                                `, [symbol, date, open, high, low, close, volume], (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            });
                            recordsInserted++;
                        }
                    }
                }
                
                // Update data freshness
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT OR REPLACE INTO data_freshness (symbol, last_updated, status, error_count)
                        VALUES (?, CURRENT_TIMESTAMP, 'active', 0)
                    `, [symbol], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                
                totalSymbolsAdded++;
                totalRecordsAdded += recordsInserted;
                
                console.log(`✓ Processed ${file}: ${symbol} - ${recordsInserted} records`);
                
            } catch (error) {
                errors.push(`File ${file}: ${error.message}`);
                console.error(`Error processing file ${file}:`, error);
            }
        }
        
        res.json({
            status: 'success',
            message: `Database populated successfully`,
            symbolsAdded: totalSymbolsAdded,
            recordsAdded: totalRecordsAdded,
            filesProcessed: csvFiles.length,
            errors: errors,
            folderPath: folderPath,
            convertToUppercase: convertToUppercase,
            preventDuplicates: preventDuplicates
        });
        
    } catch (error) {
        console.error('Error populating database:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to populate database',
            error: error.message
        });
    }
});

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

// Function to check local database status and provide information
async function populateAllUSSymbols() {
    console.log('🔍 Checking local database status...');
    console.log('📊 This application now uses local database only - no external API calls');
    
    // Check local database status
    const dbStatus = await checkLocalDatabaseStatus();
    
    if (dbStatus.hasData) {
        console.log(`✅ Local database contains ${dbStatus.symbolCount} active symbols`);
        console.log('💡 Use the Admin page to upload CSV files to populate the database');
        console.log('💡 All analysis will be performed using local data only');
    } else {
        console.log('⚠️ Local database is empty');
        console.log('💡 Please use the Admin page to upload CSV files to populate the database');
        console.log('💡 No external API calls will be made - all data must be uploaded locally');
    }
    
    console.log('🚀 Application ready for local data analysis');
}

// Function to get symbols from local database only
async function fetchLocalSymbols() {
    try {
        console.log('🔍 Fetching symbols from local database...');
        
        return new Promise((resolve, reject) => {
            db.all("SELECT DISTINCT symbol FROM symbols WHERE is_active = 1 ORDER BY symbol", (err, rows) => {
                if (err) {
                    console.error('❌ Database error fetching symbols:', err);
                    reject(err);
                    return;
                }
                
                const symbols = rows.map(row => row.symbol.toUpperCase());
                console.log(`✅ Found ${symbols.length} symbols in local database`);
                resolve(symbols);
            });
        });
        
    } catch (error) {
        console.error('❌ Error fetching local symbols:', error);
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

// Function to check local database status
async function checkLocalDatabaseStatus() {
    console.log('🔍 Checking local database status...');
    
    try {
        return new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM symbols WHERE is_active = 1", (err, row) => {
                if (err) {
                    console.error('❌ Database error checking status:', err);
                    reject(err);
                    return;
                }
                
                const symbolCount = row.count;
                console.log(`✅ Local database contains ${symbolCount} active symbols`);
                
                resolve({ 
                    accessible: true, 
                    hasData: symbolCount > 0, 
                    symbolCount: symbolCount 
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Error checking local database status:', error);
        return { accessible: false, hasData: false, symbolCount: 0 };
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stock Market Analysis Backend running on port ${PORT}`);
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
