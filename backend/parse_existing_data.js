const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database path
const dbPath = path.join(__dirname, '../database/market_data.db');
const db = new sqlite3.Database(dbPath);

// Data directory path
const DATA_DIR = '/Users/thiags/Downloads/data 2/daily/us';

// Exchange mappings
const EXCHANGES = {
    'nasdaq stocks': 'NASDAQ',
    'nyse stocks': 'NYSE', 
    'nysemkt stocks': 'NYSEMKT',
    'nasdaq etfs': 'NASDAQ',
    'nyse etfs': 'NYSE',
    'nysemkt etfs': 'NYSEMKT'
};

// Parse CSV line
function parseCSVLine(line) {
    const parts = line.split(',');
    if (parts.length < 9) return null;
    
    const [ticker, period, date, time, open, high, low, close, volume] = parts;
    
    // Skip header or invalid lines
    if (ticker === '<TICKER>' || !ticker || !date) return null;
    
    // Parse date (format: YYYYMMDD)
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6, 8);
    const formattedDate = `${year}-${month}-${day}`;
    
    return {
        symbol: ticker.replace('.US', '').replace('.us', ''),
        date: formattedDate,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume)
    };
}

// Process a single data file
async function processDataFile(filePath, exchange) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.log(`❌ Error reading ${filePath}: ${err.message}`);
                resolve({ processed: 0, errors: 1 });
                return;
            }
            
            const lines = data.split('\n').filter(line => line.trim());
            let processed = 0;
            let errors = 0;
            
            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const parsed = parseCSVLine(line);
                
                if (!parsed) {
                    errors++;
                    continue;
                }
                
                // Insert into database
                const stmt = db.prepare(`
                    INSERT OR REPLACE INTO historical_prices 
                    (symbol, date, open, high, low, close, volume) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                
                try {
                    stmt.run([
                        parsed.symbol,
                        parsed.date,
                        parsed.open,
                        parsed.high,
                        parsed.low,
                        parsed.close,
                        parsed.volume
                    ]);
                    processed++;
                } catch (dbErr) {
                    errors++;
                    console.log(`❌ DB Error for ${parsed.symbol}: ${dbErr.message}`);
                }
                
                stmt.finalize();
            }
            
            resolve({ processed, errors });
        });
    });
}

// Process all files in a directory
async function processDirectory(dirPath, exchange) {
    const items = fs.readdirSync(dirPath);
    let totalProcessed = 0;
    let totalErrors = 0;
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Recursively process subdirectories
            const result = await processDirectory(fullPath, exchange);
            totalProcessed += result.processed;
            totalErrors += result.errors;
        } else if (item.endsWith('.txt')) {
            // Process data file
            const result = await processDataFile(fullPath, exchange);
            totalProcessed += result.processed;
            totalErrors += result.errors;
            
            // Add symbol to symbols table
            const symbol = item.replace('.txt', '').replace('.US', '').replace('.us', '');
            const stmt = db.prepare(`
                INSERT OR IGNORE INTO symbols (symbol, name, exchange, type) 
                VALUES (?, ?, ?, ?)
            `);
            
            try {
                const isETF = exchange.toLowerCase().includes('etf');
                stmt.run([symbol, symbol, exchange, isETF ? 'ETF' : 'STOCK']);
            } catch (err) {
                console.log(`❌ Error adding symbol ${symbol}: ${err.message}`);
            }
            stmt.finalize();
        }
    }
    
    return { processed: totalProcessed, errors: totalErrors };
}

// Main processing function
async function importAllData() {
    console.log('🚀 Starting data import from existing files...');
    console.log(`📁 Data directory: ${DATA_DIR}`);
    
    let grandTotalProcessed = 0;
    let grandTotalErrors = 0;
    
    // Process each exchange directory
    for (const [exchangeDir, exchangeName] of Object.entries(EXCHANGES)) {
        const exchangePath = path.join(DATA_DIR, exchangeDir);
        
        if (fs.existsSync(exchangePath)) {
            console.log(`\n📊 Processing ${exchangeDir} (${exchangeName})...`);
            
            const result = await processDirectory(exchangePath, exchangeName);
            grandTotalProcessed += result.processed;
            grandTotalErrors += result.errors;
            
            console.log(`✅ ${exchangeDir}: ${result.processed.toLocaleString()} records, ${result.errors} errors`);
        }
    }
    
    console.log(`\n🎉 Import Complete!`);
    console.log(`📊 Total records processed: ${grandTotalProcessed.toLocaleString()}`);
    console.log(`❌ Total errors: ${grandTotalErrors.toLocaleString()}`);
    
    // Update data freshness
    const updateStmt = db.prepare(`
        INSERT OR REPLACE INTO data_freshness 
        (symbol, last_updated, record_count, earliest_date, latest_date, error_count) 
        VALUES (?, datetime('now'), ?, ?, ?, ?)
    `);
    
    // Get summary for each symbol
    const summaryStmt = db.prepare(`
        SELECT symbol, COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
        FROM historical_prices 
        GROUP BY symbol
    `);
    
    summaryStmt.all([], (err, rows) => {
        if (err) {
            console.log(`❌ Error getting summary: ${err.message}`);
            return;
        }
        
        rows.forEach(row => {
            updateStmt.run([
                row.symbol,
                row.count,
                row.earliest,
                row.latest,
                0 // no errors
            ]);
        });
        
        updateStmt.finalize();
        summaryStmt.finalize();
        
        console.log(`\n💾 Database updated with ${rows.length} symbols`);
        db.close();
    });
}

// Run the import
importAllData().catch(console.error);
