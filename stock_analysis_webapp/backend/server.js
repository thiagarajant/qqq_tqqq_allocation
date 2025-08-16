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
const db = new sqlite3.Database(dbPath);

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
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    
    let corruptedDatesCount = 0;
    let validDatesCount = 0;
    
    for (const line of dataLines) {
        const columns = line.split(',');
        
        if (columns.length >= 5) {
            const [date, open, high, low, close, volume] = columns;
            
            // Parse the date (Stooq format: YYYY-MM-DD)
            const [year, month, day] = date.split('-').map(Number);
            
            // AUTOMATIC DATA CLEANING: Filter out corrupted future dates
            if (year > currentYear || 
                (year === currentYear && month > currentMonth) ||
                (year === currentYear && month === currentMonth && day > currentDay)) {
                console.log(`🚨 AUTOMATIC CLEANING: Filtered out corrupted future date: ${date}`);
                corruptedDatesCount++;
                continue; // Skip this corrupted data point
            }
            
            // Validate that the date is reasonable (not too far in the past)
            if (year < 1900) {
                console.log(`🚨 AUTOMATIC CLEANING: Filtered out unreasonable past date: ${date}`);
                corruptedDatesCount++;
                continue;
            }
            
            // Parse numeric values with validation
            const openPrice = parseFloat(open);
            const highPrice = parseFloat(high);
            const lowPrice = parseFloat(low);
            const closePrice = parseFloat(close);
            const volumeNum = parseInt(volume);
            
            // Validate price data integrity
            if (isNaN(openPrice) || isNaN(highPrice) || isNaN(lowPrice) || isNaN(closePrice) || isNaN(volumeNum)) {
                console.log(`🚨 AUTOMATIC CLEANING: Filtered out invalid numeric data: ${line}`);
                corruptedDatesCount++;
                continue;
            }
            
            // Validate price logic (high >= low, etc.)
            if (highPrice < lowPrice || closePrice < 0 || openPrice < 0) {
                console.log(`🚨 AUTOMATIC CLEANING: Filtered out illogical price data: ${line}`);
                corruptedDatesCount++;
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
            
            validDatesCount++;
        }
    }
    
    console.log(`✅ AUTOMATIC DATA CLEANING COMPLETED:`);
    console.log(`   - Valid data points: ${validDatesCount}`);
    console.log(`   - Corrupted data filtered: ${corruptedDatesCount}`);
    console.log(`   - Total lines processed: ${dataLines.length}`);
    
    if (parsedData.length === 0) {
        throw new Error('No valid data points found after automatic cleaning');
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

// Function to automatically clean corrupted data from existing tables
async function cleanCorruptedData(symbol) {
    const tableName = `${symbol.toLowerCase()}_all_history`;
    
    try {
        // Check if table exists
        const tableExists = await new Promise((resolve, reject) => {
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tableName], (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            });
        });
        
        if (!tableExists) {
            console.log(`Table ${tableName} doesn't exist, nothing to clean`);
            return;
        }
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();
        
        // Count corrupted records
        const corruptedCount = await new Promise((resolve, reject) => {
            db.get(`
                SELECT COUNT(*) as count 
                FROM ${tableName} 
                WHERE CAST(SUBSTR(date, 1, 4) AS INTEGER) > ? 
                   OR (CAST(SUBSTR(date, 1, 4) AS INTEGER) = ? AND CAST(SUBSTR(date, 6, 2) AS INTEGER) > ?)
                   OR (CAST(SUBSTR(date, 1, 4) AS INTEGER) = ? AND CAST(SUBSTR(date, 6, 2) AS INTEGER) = ? AND CAST(SUBSTR(date, 9, 2) AS INTEGER) > ?)
            `, [currentYear, currentYear, currentMonth, currentYear, currentMonth, currentDay], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        if (corruptedCount > 0) {
            console.log(`🚨 AUTOMATIC CLEANING: Found ${corruptedCount} corrupted future dates in ${tableName}`);
            
            // Delete corrupted records
            const deletedCount = await new Promise((resolve, reject) => {
                db.run(`
                    DELETE FROM ${tableName} 
                    WHERE CAST(SUBSTR(date, 1, 4) AS INTEGER) > ? 
                       OR (CAST(SUBSTR(date, 1, 4) AS INTEGER) = ? AND CAST(SUBSTR(date, 6, 2) AS INTEGER) > ?)
                       OR (CAST(SUBSTR(date, 1, 4) AS INTEGER) = ? AND CAST(SUBSTR(date, 6, 2) AS INTEGER) = ? AND CAST(SUBSTR(date, 9, 2) AS INTEGER) > ?)
                `, [currentYear, currentYear, currentMonth, currentYear, currentMonth, currentDay], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });
            
            console.log(`✅ AUTOMATIC CLEANING: Removed ${deletedCount} corrupted records from ${tableName}`);
            
            // Get clean data range
            const dataRange = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT MIN(date) as start_date, MAX(date) as end_date, COUNT(*) as total_rows
                    FROM ${tableName}
                `, [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            console.log(`📊 CLEAN DATA RANGE: ${dataRange.start_date} to ${dataRange.end_date} (${dataRange.total_rows} rows)`);
        } else {
            console.log(`✅ ${tableName} is already clean (no corrupted dates found)`);
        }
        
    } catch (error) {
        console.error(`Error cleaning corrupted data from ${tableName}:`, error);
    }
}

// Get cycles for specific threshold and single ETF
app.get('/api/cycles/:threshold/:etf?', async (req, res) => {
    const threshold = parseFloat(req.params.threshold);
    const etf = req.params.etf || 'QQQ';
    
    if (isNaN(threshold) || threshold < 0.1 || threshold > 50) {
        return res.status(400).json({ error: 'Invalid threshold. Must be between 0.1 and 50.' });
    }
    
    try {
        // AUTOMATIC DATA CLEANING: Clean corrupted data before analysis
        console.log(`🧹 AUTOMATIC CLEANING: Checking ${etf} data for corruption...`);
        await cleanCorruptedData(etf);
        
        const cycles = await executeSingleETFCyclesQuery(etf, threshold);
        res.json(cycles);
    } catch (error) {
        console.error(`Error fetching cycles for ${etf}:`, error);
        res.status(500).json({ error: `Failed to fetch cycles for ${etf}: ${error.message}` });
    }
});

// Helper function for single ETF cycles query
async function executeSingleETFCyclesQuery(etf, threshold) {
    const tableName = `${etf.toLowerCase()}_all_history`;
    
    return new Promise((resolve, reject) => {
        const query = `
            WITH etf_data AS (
                SELECT 
                    date,
                    close,
                    MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cummax,
                    ((close - MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) / 
                     MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) * 100 as drawdown
                FROM ${tableName}
                ORDER BY date
            ),
            cycles AS (
                SELECT 
                    date,
                    close,
                    cummax,
                    drawdown,
                    CASE WHEN close = cummax THEN 1 ELSE 0 END as is_ath
                FROM etf_data
            )
            SELECT 
                date,
                close,
                cummax,
                drawdown,
                is_ath
            FROM cycles
            WHERE is_ath = 1 OR drawdown < -${threshold}
            ORDER BY date
        `;

        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(new Error('Database error'));
                return;
            }

            // Process the data to identify complete cycles
            const cycles = processCycles(rows, threshold, etf, etf); // Use same ETF for both parameters
            
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
        WITH base_data AS (
            SELECT 
                date,
                close,
                MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cummax,
                ((close - MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) / 
                 MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) * 100 as drawdown
            FROM ${baseTable}
            ORDER BY date
        ),
        cycles AS (
            SELECT 
                date,
                close,
                cummax,
                drawdown,
                CASE WHEN close = cummax THEN 1 ELSE 0 END as is_ath
            FROM base_data
        )
        SELECT 
            date,
            close,
            cummax,
            drawdown,
            is_ath
        FROM cycles
        WHERE is_ath = 1 OR drawdown < -${threshold}
        ORDER BY date
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Process the data to identify complete cycles
        const cycles = processCycles(rows, threshold, baseETF, leveragedETF);
        
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

// Process raw data into cycles - FIXED to prevent duplicates and ensure accurate cycle detection
function processCycles(rows, threshold, baseETF = 'QQQ', leveragedETF = 'TQQQ') {
    const cycles = [];
    let currentATH = null;
    let currentATHDate = null;
    let currentATHIndex = null;
    let cycleNumber = 1;
    let processedRanges = new Set(); // Track processed date ranges to prevent duplicates

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        if (row.is_ath === 1) { // New all-time high
            // Process any cycles from the previous ATH period
            if (currentATH !== null && currentATHIndex !== null) {
                const periodData = rows.slice(currentATHIndex, i);
                const minDrawdown = Math.min(...periodData.map(r => r.drawdown));
                
                if (minDrawdown < -threshold) {
                    const lowPoint = periodData.reduce((min, r) => 
                        r.close < min.close ? r : min, periodData[0]);
                    
                    // Create a unique identifier for this cycle range
                    const cycleRangeKey = `${currentATHDate}_${lowPoint.date}`;
                    
                    // Only process if we haven't already processed this range
                    if (!processedRanges.has(cycleRangeKey)) {
                        // Determine severity based on drawdown percentage
                        let severity = 'mild';
                        if (Math.abs(lowPoint.drawdown) >= 20) {
                            severity = 'severe';
                        } else if (Math.abs(lowPoint.drawdown) >= 10) {
                            severity = 'moderate';
                        }
                        
                        const basePrefix = baseETF.toLowerCase();
                        cycles.push({
                            cycle_number: cycleNumber++,
                            severity: severity,
                            [`${basePrefix}_ath_date`]: currentATHDate,
                            [`${basePrefix}_ath_price`]: currentATH,
                            [`${basePrefix}_low_date`]: lowPoint.date,
                            [`${basePrefix}_low_price`]: lowPoint.close,
                            [`${basePrefix}_drawdown_pct`]: lowPoint.drawdown,
                            [`${basePrefix}_recovery_date`]: row.date,
                            [`${basePrefix}_recovery_price`]: row.close,
                            threshold: threshold,
                            // Legacy fields for backward compatibility (QQQ format)
                            qqq_ath_date: currentATHDate,
                            qqq_ath_price: currentATH,
                            qqq_low_date: lowPoint.date,
                            qqq_low_price: lowPoint.close,
                            qqq_drawdown_pct: lowPoint.drawdown,
                            qqq_recovery_date: row.date,
                            qqq_recovery_price: row.close,
                            // Generic fields
                            ath_date: currentATHDate,
                            ath_price: currentATH,
                            low_date: lowPoint.date,
                            low_price: lowPoint.close,
                            drawdown_pct: lowPoint.drawdown,
                            recovery_date: row.date,
                            recovery_price: row.close
                        });
                        
                        // Mark this range as processed
                        processedRanges.add(cycleRangeKey);
                    }
                }
            }
            
            currentATH = row.close;
            currentATHDate = row.date;
            currentATHIndex = i;
        } else if (row.drawdown < -threshold) {
            // Find the local high point before this drawdown
            let localHighIndex = i - 1;
            while (localHighIndex >= 0 && rows[localHighIndex].close <= rows[localHighIndex + 1].close) {
                localHighIndex--;
            }
            
            if (localHighIndex >= 0) {
                const localHigh = rows[localHighIndex];
                const localHighPrice = localHigh.close;
                const localHighDate = localHigh.date;
                
                // Find the actual low point of this drawdown
                let lowIndex = i;
                while (lowIndex < rows.length && rows[lowIndex].drawdown < -threshold) {
                    lowIndex++;
                }
                lowIndex = Math.min(lowIndex, rows.length - 1);
                
                const lowPoint = rows[lowIndex];
                const drawdownPct = ((lowPoint.close - localHighPrice) / localHighPrice) * 100;
                
                // Only process if this is a significant drawdown
                if (drawdownPct < -threshold) {
                    // Create a unique identifier for this cycle range
                    const cycleRangeKey = `${localHighDate}_${lowPoint.date}`;
                    
                    // Only process if we haven't already processed this range
                    if (!processedRanges.has(cycleRangeKey)) {
                        // Determine severity based on drawdown percentage
                        let severity = 'mild';
                        if (Math.abs(drawdownPct) >= 20) {
                            severity = 'severe';
                        } else if (Math.abs(drawdownPct) >= 10) {
                            severity = 'moderate';
                        }
                        
                        // Check if recovery happened
                        let recoveryPoint = null;
                        for (let j = lowIndex + 1; j < rows.length; j++) {
                            if (rows[j].close >= localHighPrice) {
                                recoveryPoint = rows[j];
                                break;
                            }
                        }
                        
                        const basePrefix = baseETF.toLowerCase();
                        cycles.push({
                            cycle_number: cycleNumber++,
                            severity: severity,
                            [`${basePrefix}_ath_date`]: localHighDate,
                            [`${basePrefix}_ath_price`]: localHighPrice,
                            [`${basePrefix}_low_date`]: lowPoint.date,
                            [`${basePrefix}_low_price`]: lowPoint.close,
                            [`${basePrefix}_drawdown_pct`]: drawdownPct,
                            [`${basePrefix}_recovery_date`]: recoveryPoint ? recoveryPoint.date : null,
                            [`${basePrefix}_recovery_price`]: recoveryPoint ? recoveryPoint.close : null,
                            threshold: threshold,
                            // Legacy fields for backward compatibility (QQQ format)
                            qqq_ath_date: localHighDate,
                            qqq_ath_price: localHighPrice,
                            qqq_low_date: lowPoint.date,
                            qqq_low_price: lowPoint.close,
                            qqq_drawdown_pct: drawdownPct,
                            qqq_recovery_date: recoveryPoint ? recoveryPoint.date : null,
                            qqq_recovery_price: recoveryPoint ? recoveryPoint.close : null,
                            // Generic fields
                            ath_date: localHighDate,
                            ath_price: localHighPrice,
                            low_date: lowPoint.date,
                            low_price: lowPoint.close,
                            drawdown_pct: drawdownPct,
                            recovery_date: recoveryPoint ? recoveryPoint.date : null,
                            recovery_price: recoveryPoint ? recoveryPoint.close : null
                        });
                        
                        // Mark this range as processed
                        processedRanges.add(cycleRangeKey);
                    }
                }
            }
        }
    }

    // Handle the last period if it ended in a drawdown
    if (currentATH !== null && currentATHIndex !== null) {
        const periodData = rows.slice(currentATHIndex);
        const minDrawdown = Math.min(...periodData.map(r => r.drawdown));
        
        if (minDrawdown < -threshold) {
            const lowPoint = periodData.reduce((min, r) => 
                r.close < min.close ? r : min, periodData[0]);
            
            // Check if recovery happened
            const recoveryPoint = periodData.find(r => 
                r.date > lowPoint.date && r.close >= currentATH);
            
            // Determine severity based on drawdown percentage
            let severity = 'mild';
            if (Math.abs(lowPoint.drawdown) >= 20) {
                severity = 'severe';
            } else if (Math.abs(lowPoint.drawdown) >= 10) {
                severity = 'moderate';
            }
            
            const basePrefix = baseETF.toLowerCase();
            cycles.push({
                cycle_number: cycleNumber++,
                severity: severity,
                [`${basePrefix}_ath_date`]: currentATHDate,
                [`${basePrefix}_ath_price`]: currentATH,
                [`${basePrefix}_low_date`]: lowPoint.date,
                [`${basePrefix}_low_price`]: lowPoint.close,
                [`${basePrefix}_drawdown_pct`]: lowPoint.drawdown,
                [`${basePrefix}_recovery_date`]: recoveryPoint ? recoveryPoint.date : null,
                [`${basePrefix}_recovery_price`]: recoveryPoint ? recoveryPoint.close : null,
                threshold: threshold,
                // Legacy fields for backward compatibility (QQQ format)
                qqq_ath_date: currentATHDate,
                qqq_ath_price: currentATH,
                qqq_low_date: lowPoint.date,
                qqq_low_price: lowPoint.close,
                qqq_drawdown_pct: lowPoint.drawdown,
                qqq_recovery_date: recoveryPoint ? recoveryPoint.date : null,
                qqq_recovery_price: recoveryPoint ? recoveryPoint.close : null,
                // Generic fields
                ath_date: currentATHDate,
                ath_price: currentATH,
                low_date: lowPoint.date,
                low_price: lowPoint.close,
                drawdown_pct: lowPoint.drawdown,
                recovery_date: recoveryPoint ? recoveryPoint.date : null,
                recovery_price: recoveryPoint ? recoveryPoint.close : null
            });
        }
    }

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
        // AUTOMATIC DATA CLEANING: Clean corrupted data before analysis
        console.log(`🧹 AUTOMATIC CLEANING: Checking ${etf} summary data for corruption...`);
        await cleanCorruptedData(etf);
        
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
    // First get the cycles
    const query = `
            WITH base_data AS (
            SELECT 
                date,
                close,
                MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cummax,
                ((close - MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) / 
                 MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) * 100 as drawdown
                FROM ${tableName}
            ORDER BY date
        ),
        cycles AS (
            SELECT 
                date,
                close,
                cummax,
                drawdown,
                CASE WHEN close = cummax THEN 1 ELSE 0 END as is_ath
                FROM base_data
        )
        SELECT 
            date,
            close,
            cummax,
            drawdown,
            is_ath
        FROM cycles
        WHERE is_ath = 1 OR drawdown < -${threshold}
        ORDER BY date
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
                reject(new Error('Database error'));
                return;
        }

            const cycles = processCycles(rows, threshold, etf, etf);
        
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
        // AUTOMATIC DATA CLEANING: Clean corrupted data before analysis
        console.log(`🧹 AUTOMATIC CLEANING: Checking ${etf} chart data for corruption...`);
        await cleanCorruptedData(etf);
        
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
        
        // Get cycle data
        const cycleQuery = `
            WITH etf_data AS (
                SELECT 
                    date,
                    close,
                    MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cummax,
                    ((close - MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) / 
                     MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) * 100 as drawdown
                FROM ${tableName}
                ORDER BY date
            ),
            cycles AS (
                SELECT 
                    date,
                    close,
                    cummax,
                    drawdown,
                    CASE WHEN close = cummax THEN 1 ELSE 0 END as is_ath
                FROM etf_data
            )
            SELECT 
                date,
                close,
                cummax,
                drawdown,
                is_ath
            FROM cycles
            WHERE is_ath = 1 OR drawdown < -${threshold}
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
                const cycles = processCycles(cycleRows, threshold, etf, etf);
                
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

            // Get cycles for this threshold
            const cyclesQuery = `
                WITH base_data AS (
                    SELECT 
                        date,
                        close,
                        MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cummax,
                        ((close - MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) / 
                         MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) * 100 as drawdown
                    FROM ${baseTable}
                    ORDER BY date
                ),
                cycles AS (
                    SELECT 
                        date,
                        close,
                        cummax,
                        drawdown,
                        CASE WHEN close = cummax THEN 1 ELSE 0 END as is_ath
                    FROM base_data
                )
                SELECT 
                    date,
                    close,
                    cummax,
                    drawdown,
                    is_ath
                FROM cycles
                WHERE is_ath = 1 OR drawdown < -${threshold}
                ORDER BY date
            `;

            db.all(cyclesQuery, [], (err, cycleRows) => {
                if (err) {
                    console.error('Cycles database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                const cycles = processCycles(cycleRows, threshold, baseETF, leveragedETF);

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
        WITH qqq_data AS (
            SELECT 
                date,
                close,
                MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cummax,
                ((close - MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) / 
                 MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) * 100 as drawdown
            FROM qqq_all_history
            WHERE 1=1 ${dateFilter}
            ORDER BY date
        ),
        cycles AS (
            SELECT 
                date,
                close,
                cummax,
                drawdown,
                CASE WHEN close = cummax THEN 1 ELSE 0 END as is_ath
            FROM qqq_data
        )
        SELECT 
            date,
            close,
            cummax,
            drawdown,
            is_ath
        FROM cycles
        WHERE is_ath = 1 OR drawdown < -${threshold}
        ORDER BY date
    `;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const cycles = processCycles(rows, threshold);
        
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

// Serve static files in production (must be last to not interfere with API routes)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
}

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

    // QQQ Only Strategy with Monthly Investment
    let qqqShares = initialAmount / alignedData[0].qqq_price;
    let qqqTotalInvested = initialAmount;
    
    for (const investDate of monthlyInvestmentDates) {
        // Find the closest data point to the investment date
        const dataPoint = alignedData.find(d => new Date(d.date) >= investDate) || alignedData[alignedData.length - 1];
        qqqShares += monthlyInvestment / dataPoint.qqq_price;
        qqqTotalInvested += monthlyInvestment;
    }
    
    const qqqFinalValue = qqqShares * alignedData[alignedData.length - 1].qqq_price;
    const qqqTotalReturn = qqqFinalValue - qqqTotalInvested;
    const qqqTotalReturnPct = (qqqTotalReturn / qqqTotalInvested) * 100;
    const qqqAnnualizedReturn = (Math.pow(qqqFinalValue / qqqTotalInvested, 1 / durationYears) - 1) * 100;

    // TQQQ Only Strategy with Monthly Investment
    let tqqqShares = initialAmount / alignedData[0].tqqq_price;
    let tqqqTotalInvested = initialAmount;
    
    for (const investDate of monthlyInvestmentDates) {
        // Find the closest data point to the investment date
        const dataPoint = alignedData.find(d => new Date(d.date) >= investDate) || alignedData[alignedData.length - 1];
        tqqqShares += monthlyInvestment / dataPoint.tqqq_price;
        tqqqTotalInvested += monthlyInvestment;
    }
    
    const tqqqFinalValue = tqqqShares * alignedData[alignedData.length - 1].tqqq_price;
    const tqqqTotalReturn = tqqqFinalValue - tqqqTotalInvested;
    const tqqqTotalReturnPct = (tqqqTotalReturn / tqqqTotalInvested) * 100;
    const tqqqAnnualizedReturn = (Math.pow(tqqqFinalValue / tqqqTotalInvested, 1 / durationYears) - 1) * 100;

    // Smart Strategy (QQQ with TQQQ during drawdowns) with Monthly Investment
    let strategyValue = initialAmount;
    let strategyTotalInvested = initialAmount;
    let currentHolding = 'QQQ'; // Start with QQQ
    let qqqATH = alignedData[0].qqq_price;
    let switches = 0;
    let shares = initialAmount / alignedData[0].qqq_price; // Start with QQQ shares
    let monthlyInvestmentIndex = 0;
    
    for (let i = 1; i < alignedData.length; i++) {
        const current = alignedData[i];
        const currentDate = new Date(current.date);
        
        // Check if we need to make a monthly investment
        if (monthlyInvestmentIndex < monthlyInvestmentDates.length && 
            currentDate >= monthlyInvestmentDates[monthlyInvestmentIndex]) {
            
            // Add monthly investment to current position
            if (currentHolding === 'QQQ') {
                shares += monthlyInvestment / current.qqq_price;
            } else {
                shares += monthlyInvestment / current.tqqq_price;
            }
            strategyTotalInvested += monthlyInvestment;
            monthlyInvestmentIndex++;
        }
        
        // Update QQQ ATH
        if (current.qqq_price > qqqATH) {
            qqqATH = current.qqq_price;
            
            // If we're in TQQQ and QQQ hits new ATH, switch back to QQQ
            if (currentHolding === 'TQQQ') {
                strategyValue = shares * current.tqqq_price;
                shares = strategyValue / current.qqq_price;
                currentHolding = 'QQQ';
                switches++;
            }
        }
        
        // Check for drawdown
        const drawdown = ((current.qqq_price - qqqATH) / qqqATH) * 100;
        
        if (drawdown <= -threshold && currentHolding === 'QQQ') {
            // Switch from QQQ to TQQQ
            strategyValue = shares * current.qqq_price;
            shares = strategyValue / current.tqqq_price;
            currentHolding = 'TQQQ';
            switches++;
        }
        
        // Update strategy value based on current holding
        if (currentHolding === 'QQQ') {
            strategyValue = shares * current.qqq_price;
        } else {
            strategyValue = shares * current.tqqq_price;
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
            ? `QQQ→TQQQ at ${threshold}% drawdown + $${monthlyInvestment}/month DCA`
            : `QQQ→TQQQ at ${threshold}% drawdown`,
        
        // QQQ only results
        qqqFinalValue: Math.round(qqqFinalValue),
        qqqTotalReturn: Math.round(qqqTotalReturn),
        qqqTotalReturnPct: parseFloat(qqqTotalReturnPct.toFixed(2)),
        qqqAnnualizedReturn: parseFloat(qqqAnnualizedReturn.toFixed(2)),
        
        // TQQQ only results
        tqqqFinalValue: Math.round(tqqqFinalValue),
        tqqqTotalReturn: Math.round(tqqqTotalReturn),
        tqqqTotalReturnPct: parseFloat(tqqqTotalReturnPct.toFixed(2)),
        tqqqAnnualizedReturn: parseFloat(tqqqAnnualizedReturn.toFixed(2)),
        
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stock Analysis Backend running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
