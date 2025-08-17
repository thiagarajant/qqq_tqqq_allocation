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

// Serve static files (must be last to not interfere with API routes)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all route for SPA routing (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stock Analysis Backend running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
